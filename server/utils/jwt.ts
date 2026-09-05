import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { DBUser } from '../db/types.js';

// Use environment variable, fallback to random string for dev if not set
// In production, MUST set JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

export interface AuthTokenPayload {
  userId: string;
  authMethod: string;
  nickname: string;
  realName: string;
  username: string;
  email?: string;
  role?: string;
}

export function signAuthToken(user: DBUser): string {
  const payload: AuthTokenPayload = {
    userId: user.id,
    authMethod: user.authMethod,
    nickname: user.nickname,
    realName: user.realName,
    username: user.username,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch (err) {
    return null;
  }
}

export interface PinTokenPayload {
  eventId: string;
  purpose: 'pin';
}

export function signPinToken(eventId: string): string {
  const payload: PinTokenPayload = {
    eventId,
    purpose: 'pin',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyPinToken(token: string, eventId: string): boolean {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as PinTokenPayload;
    return payload.purpose === 'pin' && payload.eventId === eventId;
  } catch (err) {
    return false;
  }
}
