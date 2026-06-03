/* global process */
import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { readDB, insertGuest, hashPin } from '../db/store.js';
import { DBGuest } from '../db/types.js';
import { verifyGoogleToken } from '../utils/auth.js';

const router = Router();
const googleOAuthClient = new OAuth2Client();

// Google OAuth Redirect Callback
router.post('/google/callback', async (req: Request, res: Response) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).send('Không nhận được thông tin xác thực Google.');
  }

  const googleSub = await verifyGoogleToken(credential);
  if (!googleSub) {
    return res.status(401).send('Xác thực token Google thất bại.');
  }

  try {
    const parts = credential.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

    const sessionData = {
      sub: payload.sub,
      email: payload.email || '',
      name: payload.name || '',
      given_name: payload.given_name || '',
      picture: payload.picture || '',
      credential,
    };

    res.cookie('beervote_google_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000, // 5 minutes
    });

    res.redirect('/?googleLogin=true');
  } catch (err) {
    console.error('Lỗi phân tích JWT trong Google redirect callback:', err);
    res.status(500).send('Lỗi máy chủ khi xử lý đăng nhập Google.');
  }
});

// Lấy thông tin session Google OAuth và xoá cookie
router.get('/session', (req: Request, res: Response) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return res.status(401).json({ message: 'Không tìm thấy session.' });
  }

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const parts = c.split('=');
      return [parts[0].trim(), parts.slice(1).join('=').trim()];
    })
  );

  const sessionCookie = cookies['beervote_google_session'];
  if (!sessionCookie) {
    return res.status(401).json({ message: 'Session không hợp lệ hoặc đã hết hạn.' });
  }

  try {
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    res.clearCookie('beervote_google_session');
    res.json(sessionData);
  } catch (err) {
    console.error('Lỗi phân tích session cookie:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi giải mã session.' });
  }
});

// Google OAuth Login
router.post('/google', async (req: Request, res: Response) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Missing credential' });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId)
    return res.status(500).json({ message: 'Google auth is not configured on this server' });
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new Error('Empty payload');
    res.json({
      sub: payload.sub,
      email: payload.email || '',
      name: payload.name || '',
      given_name: payload.given_name || '',
      family_name: payload.family_name || '',
      picture: payload.picture || '',
    });
  } catch (e) {
    console.error('Google token verification failed:', e);
    res.status(401).json({ message: 'Invalid Google token' });
  }
});

// Đăng ký tài khoản Khách (Guest)
router.post('/register-guest', async (req: Request, res: Response) => {
  const { nickname, realName, username, password } = req.body;
  if (!nickname || !realName || !username || !password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ tất cả thông tin!' });
  }

  const db = readDB();
  const guests = db.guests || [];

  const lowerUsername = username.trim().toLowerCase();
  const exists = guests.some((g) => g.username.toLowerCase() === lowerUsername);
  if (exists) {
    return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại! Vui lòng chọn tên khác.' });
  }

  const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
  const passwordHash = hashPin(password);

  const newGuest: DBGuest = {
    id,
    nickname: nickname.trim(),
    realName: realName.trim(),
    username: username.trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  await insertGuest(newGuest);

  res.status(201).json({
    id: newGuest.id,
    nickname: newGuest.nickname,
    realName: newGuest.realName,
    username: newGuest.username,
  });
});

// Đăng nhập tài khoản Khách
router.post('/guest', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ tài khoản và mật khẩu!' });
  }

  const db = readDB();
  const guests = db.guests || [];

  const lowerUsername = username.trim().toLowerCase();
  const guest = guests.find((g) => g.username.toLowerCase() === lowerUsername);

  if (!guest) {
    return res.status(404).json({ message: 'Không tìm thấy tài khoản Khách này!' });
  }

  const passwordHash = hashPin(password);
  if (guest.passwordHash !== passwordHash) {
    return res.status(401).json({ message: 'Mật khẩu không chính xác!' });
  }

  res.json({
    id: guest.id,
    nickname: guest.nickname,
    realName: guest.realName,
    username: guest.username,
  });
});

export default router;
