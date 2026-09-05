/* global process */
import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { readDB, insertUser, updateUser, hashPin } from '../db/store.js';
import { DBUser } from '../db/types.js';
import { verifyGoogleToken } from '../utils/auth.js';
import { signAuthToken } from '../utils/jwt.js';

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

// Lấy thông tin session Google/GitHub OAuth và xoá cookie
router.get('/session', async (req: Request, res: Response) => {
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

  const googleSessionCookie = cookies['beervote_google_session'];
  const githubSessionCookie = cookies['beervote_github_session'];

  if (!googleSessionCookie && !githubSessionCookie) {
    return res.status(401).json({ message: 'Session không hợp lệ hoặc đã hết hạn.' });
  }

  try {
    if (googleSessionCookie) {
      const sessionData = JSON.parse(decodeURIComponent(googleSessionCookie));
      res.clearCookie('beervote_google_session');

      const dbUser: DBUser = {
        id: `usr_google_${sessionData.sub}`,
        authMethod: 'google',
        username: sessionData.email,
        nickname: sessionData.given_name || sessionData.name || '',
        realName: sessionData.name || '',
        googleId: sessionData.sub,
        email: sessionData.email || '',
        avatar: sessionData.picture || '',
        createdAt: new Date().toISOString(),
      };
      await updateUser(dbUser.id, dbUser);
      const token = signAuthToken(dbUser);

      return res.json({ ...sessionData, authMethod: 'google', token });
    } else {
      const sessionData = JSON.parse(decodeURIComponent(githubSessionCookie));
      res.clearCookie('beervote_github_session');

      const dbUser: DBUser = {
        id: `usr_github_${sessionData.sub}`,
        authMethod: 'github',
        username: sessionData.login || sessionData.email || '',
        nickname: sessionData.name || sessionData.login || '',
        realName: sessionData.name || '',
        githubId: sessionData.sub,
        email: sessionData.email || '',
        avatar: sessionData.picture || '',
        createdAt: new Date().toISOString(),
      };
      await updateUser(dbUser.id, dbUser);
      const token = signAuthToken(dbUser);

      return res.json({ ...sessionData, authMethod: 'github', token });
    }
  } catch (err) {
    console.error('Lỗi phân tích session cookie:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi giải mã session.' });
  }
});

// GitHub OAuth Redirect Initiation
router.get('/github/login', (req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send('GitHub OAuth is not configured on this server.');
  }
  const eventId = (req.query.eventId as string) || '';
  const state = eventId ? encodeURIComponent(eventId) : '';
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/github/callback`;
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=read:user,user:email&state=${state}`;
  res.redirect(githubUrl);
});

// GitHub OAuth Callback Handler
router.get('/github/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  if (!code) {
    return res.status(400).send('Không nhận được code từ GitHub.');
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send('GitHub Client ID hoặc Client Secret chưa được cấu hình.');
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenRes.ok) throw new Error(`Failed to exchange code: ${tokenRes.status}`);

    const tokenData = (await tokenRes.json()) as {
      error?: string;
      error_description?: string;
      access_token?: string;
    };
    if (tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'No access token');
    }

    const accessToken = tokenData.access_token;
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'BeerVoter-Server',
        Accept: 'application/json',
      },
    });

    if (!userRes.ok) throw new Error(`Failed to fetch user profile: ${userRes.status}`);

    const profile = (await userRes.json()) as {
      id: number;
      email?: string;
      login: string;
      name?: string;
      avatar_url?: string;
    };
    let email = profile.email || '';
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'BeerVoter-Server',
          Accept: 'application/json',
        },
      });
      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as { primary: boolean; email: string }[];
        const primaryEmail = emails.find((e) => e.primary) || emails[0];
        if (primaryEmail) email = primaryEmail.email;
      }
    }

    const sessionData = {
      sub: String(profile.id),
      email,
      name: profile.name || '',
      login: profile.login,
      picture: profile.avatar_url || '',
      credential: accessToken,
    };

    res.cookie('beervote_github_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    });

    const eventId = state ? decodeURIComponent(state as string) : '';
    const redirectPath = eventId ? `/?eventId=${eventId}&githubLogin=true` : `/?githubLogin=true`;
    res.redirect(redirectPath);
  } catch (err) {
    console.error('GitHub authentication callback error:', err);
    res.status(500).send('Lỗi máy chủ khi xác thực GitHub.');
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
    const dbUser: DBUser = {
      id: `usr_google_${payload.sub}`,
      authMethod: 'google',
      username: payload.email || '',
      nickname: payload.given_name || payload.name || '',
      realName: payload.name || '',
      googleId: payload.sub,
      email: payload.email || '',
      avatar: payload.picture || '',
      createdAt: new Date().toISOString(),
    };

    await updateUser(dbUser.id, dbUser);
    const token = signAuthToken(dbUser);

    res.json({
      sub: payload.sub,
      email: payload.email || '',
      name: payload.name || '',
      given_name: payload.given_name || '',
      family_name: payload.family_name || '',
      picture: payload.picture || '',
      token,
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
  const users = db.users || [];

  const lowerUsername = username.trim().toLowerCase();
  const exists = users.some(
    (u) => u.authMethod === 'guest' && u.username.toLowerCase() === lowerUsername
  );
  if (exists) {
    return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại! Vui lòng chọn tên khác.' });
  }

  const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
  const passwordHash = hashPin(password);

  const newUser: DBUser = {
    id,
    authMethod: 'guest',
    nickname: nickname.trim(),
    realName: realName.trim(),
    username: username.trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  await insertUser(newUser);
  const token = signAuthToken(newUser);

  res.status(201).json({
    id: newUser.id,
    nickname: newUser.nickname,
    realName: newUser.realName,
    username: newUser.username,
    token,
  });
});

// Đăng nhập tài khoản Khách
router.post('/guest', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ tài khoản và mật khẩu!' });
  }

  const db = readDB();
  const users = db.users || [];

  const lowerUsername = username.trim().toLowerCase();
  const user = users.find(
    (u) => u.authMethod === 'guest' && u.username.toLowerCase() === lowerUsername
  );

  if (!user) {
    return res.status(404).json({ message: 'Không tìm thấy tài khoản Khách này!' });
  }

  const passwordHash = hashPin(password);
  if (user.passwordHash !== passwordHash) {
    return res.status(401).json({ message: 'Mật khẩu không chính xác!' });
  }

  const token = signAuthToken(user);

  res.json({
    id: user.id,
    nickname: user.nickname,
    realName: user.realName,
    username: user.username,
    token,
  });
});

export default router;
