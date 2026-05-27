/* global process */
import express, { Request, Response } from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID, createHash } from 'crypto';
import { OAuth2Client } from 'google-auth-library';

const googleOAuthClient = new OAuth2Client();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null;

app.use(cors({
  origin: (origin, callback) => {
    if (!allowedOrigins || !origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json());

app.get('/api/ping', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export interface DBEvent {
  id: string;
  title: string;
  creatorId: string;
  creatorName: string;
  creatorNickname?: string;
  creatorRealName?: string;
  creatorUsername?: string;
  creatorToken?: string;
  partyPinHash?: string;
  status: 'voting' | 'locked';
  createdAt: string;
  lockedAt: string | null;
  finalDateTime: string | null;
  finalLocation: string | null;
  finalBeerStyle: string | null;
}

export interface DBOption {
  id: string;
  eventId: string;
  type: 'datetime' | 'location' | 'beer';
  value: string;
  creatorId: string;
  creatorName: string;
  creatorNickname?: string;
  creatorRealName?: string;
  creatorUsername?: string;
  createdAt: string;
}

export interface DBVote {
  id: string;
  eventId: string;
  optionId: string;
  userId: string;
  userName: string;
  userNickname?: string;
  userRealName?: string;
  userEmail?: string;
  createdAt: string;
}

export interface DBComment {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userRole?: string;
  content: string;
  userNickname?: string;
  userRealName?: string;
  userEmail?: string;
  createdAt: string;
}

export interface DatabaseSchema {
  events: DBEvent[];
  options: DBOption[];
  votes: DBVote[];
  comments: DBComment[];
}

let cacheDB: DatabaseSchema = { events: [], options: [], votes: [], comments: [] };
let isLoaded = false;
let isWriting = false;
let pendingWrite = false;

// Pin token store - single-process, survives server restart (same as cacheDB)
const pinTokens = new Map<string, { eventId: string; expiresAt: number }>();
const PIN_TOKEN_TTL = 24*60*60*1000;

function sanitizeEvent(event: DBEvent): Omit<DBEvent, 'creatorToken' | 'partyPinHash'> & { hasPin: boolean } {
  const { creatorToken: _t, partyPinHash: _p, ...rest } = event;
  return { ...rest, hasPin: !!event.partyPinHash };
}

function withoutPinHash(event: DBEvent): Omit<DBEvent, 'partyPinHash'> {
  const { partyPinHash: _p, ...rest } = event;
  return rest;
}

function hashPin(pin: string): string {
  return createHash('sha256').update(String(pin)).digest('hex');
}

// Generate a verification PIN token
function generatePinToken(eventId: string): string {
  const token = randomUUID();
  pinTokens.set(token, { eventId, expiresAt: Date.now() + PIN_TOKEN_TTL });
  return token;
}

// Check and retrieve event associated with pinToken
function checkPinToken(pinToken: string | undefined): { eventId: string; isValid: boolean } | null {
  if (!pinToken || pinToken.length < 1) return null;
  const entry = pinTokens.get(pinToken);
  if (!entry || Date.now() > entry.expiresAt) {
    pinTokens.delete(pinToken);
    return null;
  }
  return { eventId: entry.eventId, isValid: true };
}

// Validate pinToken against event - returns true if authorized, false if not
function isPinAuthorized(event: DBEvent | undefined, pinToken: string | undefined): boolean {
  if (!event || !event.partyPinHash) return true; // No PIN on event, always allowed
  if (!pinToken) return false;
  const check = checkPinToken(pinToken);
  return check !== null && check.eventId === event.id;
}

async function initDB() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (supabaseUrl && supabaseKey) {
    console.log('🌐 Đang tải dữ liệu ban đầu từ Supabase Cloud DB...');
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/beer_voter_data?key=eq.main_db`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (response.ok) {
        const data = await response.json() as any[];
        if (data && data.length > 0) {
          cacheDB = data[0].value as DatabaseSchema;
          console.log(`✅ Đã tải thành công DB từ Supabase. Số lượng kèo: ${cacheDB.events.length}`);
          isLoaded = true;
          return;
        } else {
          console.log('ℹ️ Chưa có dữ liệu trên Supabase. Tiến hành khởi tạo bản ghi trống...');
          const res = await fetch(`${supabaseUrl}/rest/v1/beer_voter_data`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({ key: 'main_db', value: cacheDB })
          });
          if (res.ok) console.log('✅ Khởi tạo bản ghi trống trên Supabase thành công!');
          isLoaded = true;
          return;
        }
      } else {
        console.error('❌ Lỗi gọi Supabase API khi init, status:', response.status);
      }
    } catch (e) {
      console.error('❌ Lỗi kết nối Supabase Cloud khi init:', e);
    }
  }

  console.log('📁 Đang tải dữ liệu ban đầu từ file local db.json...');
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(cacheDB, null, 2), 'utf8');
    } else {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      cacheDB = JSON.parse(data) as DatabaseSchema;
    }
    console.log(`✅ Đã tải thành công DB từ file local. Số lượng kèo: ${cacheDB.events.length}`);
  } catch (error) {
    console.error('❌ Lỗi đọc database file JSON:', error);
  }
  isLoaded = true;
}

async function syncDB() {
  if (isWriting) {
    pendingWrite = true;
    return;
  }
  isWriting = true;
  pendingWrite = false;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  try {
    if (supabaseUrl && supabaseKey) {
      const res = await fetch(`${supabaseUrl}/rest/v1/beer_voter_data`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ key: 'main_db', value: cacheDB })
      });
      if (!res.ok) console.error(`❌ Lỗi đồng bộ Supabase Cloud DB: ${res.status} ${res.statusText}`);
    } else {
      fs.writeFileSync(DB_PATH, JSON.stringify(cacheDB, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('❌ Lỗi đồng bộ DB xuống bộ nhớ:', err);
  } finally {
    isWriting = false;
    if (pendingWrite) syncDB();
  }
}

function readDB(): DatabaseSchema {
  return cacheDB;
}

function writeDB(data: DatabaseSchema): void {
  cacheDB = data;
  syncDB();
}

function getEventDetail(db: DatabaseSchema, eventId: string) {
  const event = db.events.find(e => e.id === eventId);
  if (!event) return null;
  return {
    ...sanitizeEvent(event),
    options: db.options.filter(o => o.eventId === eventId),
    votes: db.votes.filter(v => v.eventId === eventId),
    comments: db.comments.filter(c => c.eventId === eventId)
  };
}

// ================= HTTP REST APIs =================

app.get('/api/events', (_req: Request, res: Response) => {
  const db = readDB();
  const summaryEvents = db.events.map(event => {
    const votesCount = db.votes.filter(v => v.eventId === event.id).length;
    const commentsCount = db.comments.filter(c => c.eventId === event.id).length;
    const optionsCount = db.options.filter(o => o.eventId === event.id).length;
    return { ...sanitizeEvent(event), votesCount, commentsCount, optionsCount };
  });
  summaryEvents.sort((a, b) => {
    if (a.status === b.status) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return a.status === 'voting' ? -1 : 1;
  });
  res.json(summaryEvents);
});

app.get('/api/events/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const pinToken = req.headers['x-pin-token'] as string | undefined;
  const db = readDB();
  const event = db.events.find(e => e.id === id);
  if (!event) return res.status(404).json({ message: 'Không tìm thấy kèo nhậu này!' });
  if (!isPinAuthorized(event, pinToken)) {
    return res.status(403).json({ message: 'Yêu cầu xác thực PIN!' });
  }
  const eventDetail = getEventDetail(db, id);
  res.json(eventDetail);
});

app.post('/api/events', (req: Request, res: Response) => {
  const { title, creatorId, creatorName, creatorNickname, creatorRealName, creatorUsername, dateOptions, locationOptions, beerOptions, partyPin } = req.body;

  if (!title || !creatorId || !creatorName) {
    return res.status(400).json({ message: 'Tên kèo, ID người tạo và tên người tạo là bắt buộc!' });
  }
  if (typeof title !== 'string' || title.trim().length > 100) {
    return res.status(400).json({ message: 'Tên kèo không được vượt quá 100 ký tự!' });
  }

  const db = readDB();
  const eventId = randomUUID();
  const creatorToken = randomUUID();

  const pinHash = partyPin && /^\d{6}$/.test(String(partyPin)) ? hashPin(String(partyPin)) : undefined;

  const newEvent: DBEvent = {
    id: eventId,
    title: title.trim(),
    creatorId,
    creatorName,
    creatorNickname: creatorNickname || creatorName,
    creatorRealName: creatorRealName || '',
    creatorUsername: creatorUsername || '',
    creatorToken,
    partyPinHash: pinHash,
    status: 'voting',
    createdAt: new Date().toISOString(),
    lockedAt: null,
    finalDateTime: null,
    finalLocation: null,
    finalBeerStyle: null
  };

  db.events.push(newEvent);

  const addOption = (value: string, type: 'datetime' | 'location' | 'beer') => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length > 200) return;
    db.options.push({
      id: randomUUID(),
      eventId,
      type,
      value: trimmed,
      creatorId,
      creatorName,
      creatorNickname: creatorNickname || creatorName,
      creatorRealName: creatorRealName || '',
      creatorUsername: creatorUsername || '',
      createdAt: new Date().toISOString()
    });
  };

  if (Array.isArray(dateOptions)) dateOptions.forEach(opt => addOption(opt, 'datetime'));
  if (Array.isArray(locationOptions)) locationOptions.forEach(opt => addOption(opt, 'location'));
  if (Array.isArray(beerOptions)) beerOptions.forEach(opt => addOption(opt, 'beer'));

  writeDB(db);
  res.status(201).json({ ...withoutPinHash(newEvent), creatorToken });
});

app.post('/api/events/:id/verify-pin', (req: Request, res: Response) => {
  const { id } = req.params;
  const { pin } = req.body;
  if (!pin || !/^\d{6}$/.test(String(pin))) {
    return res.status(400).json({ valid: false, message: 'PIN phải là 6 chữ số!' });
  }
  const db = readDB();
  const event = db.events.find(e => e.id === id);
  if (!event) return res.status(404).json({ valid: false, message: 'Không tìm thấy kèo nhậu này!' });
  if (!event.partyPinHash) {
    return res.json({ valid: true, pinToken: generatePinToken(id) });
  }
  if (hashPin(String(pin)) === event.partyPinHash) {
    return res.json({ valid: true, pinToken: generatePinToken(id) });
  }
  res.json({ valid: false });
});

app.post('/api/auth/google', async (req: Request, res: Response) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Missing credential' });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).json({ message: 'Google auth is not configured on this server' });
  try {
    const ticket = await googleOAuthClient.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload) throw new Error('Empty payload');
    res.json({
      sub: payload.sub,
      email: payload.email || '',
      name: payload.name || '',
      given_name: payload.given_name || '',
      family_name: payload.family_name || '',
      picture: payload.picture || ''
    });
  } catch (e) {
    console.error('Google token verification failed:', e);
    res.status(401).json({ message: 'Invalid Google token' });
  }
});

app.delete('/api/events/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { creatorToken, userId } = req.body;

  const db = readDB();
  const eventIndex = db.events.findIndex(e => e.id === id);
  if (eventIndex === -1) return res.status(404).json({ message: 'Không tìm thấy kèo nhậu này!' });

  const event = db.events[eventIndex];
  const authorized = event.creatorToken
    ? event.creatorToken === creatorToken
    : event.creatorId === userId;

  if (!authorized) return res.status(403).json({ message: 'Bạn không có quyền xóa kèo nhậu này!' });

  db.events.splice(eventIndex, 1);
  db.options = db.options.filter(o => o.eventId !== id);
  db.votes = db.votes.filter(v => v.eventId !== id);
  db.comments = db.comments.filter(c => c.eventId !== id);

  writeDB(db);
  broadcastEventDeleted(id);
  res.json({ message: 'Kèo nhậu đã được xóa!' });
});

// ================= WEBSOCKETS SERVER =================

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

interface ClientInfo {
  currentEventId: string | null;
  isLocal: boolean;
  lastActionAt: number;
  verifiedPinTokens: Map<string, string>; // eventId -> valid pinToken (cached on JOIN_EVENT)
}

const clients = new Map<WebSocket, ClientInfo>();
const RATE_LIMIT_MS = 500;

function broadcastEventUpdate(eventId: string): void {
  const db = readDB();
  const eventDetail = getEventDetail(db, eventId);
  if (!eventDetail) return;

  const message = JSON.stringify({ type: 'EVENT_UPDATED', eventId, eventData: eventDetail });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      const info = clients.get(client);
      if (info && (info.currentEventId === eventId || info.currentEventId === 'dashboard')) {
        client.send(message);
      }
    }
  });
}

function broadcastDashboardUpdate(): void {
  const db = readDB();
  const summaryEvents = db.events.map(event => {
    const votesCount = db.votes.filter(v => v.eventId === event.id).length;
    const commentsCount = db.comments.filter(c => c.eventId === event.id).length;
    const optionsCount = db.options.filter(o => o.eventId === event.id).length;
    return { ...sanitizeEvent(event), votesCount, commentsCount, optionsCount };
  });
  summaryEvents.sort((a, b) => {
    if (a.status === b.status) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return a.status === 'voting' ? -1 : 1;
  });

  const message = JSON.stringify({ type: 'DASHBOARD_UPDATED', events: summaryEvents });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      const info = clients.get(client);
      if (info && info.currentEventId === 'dashboard') client.send(message);
    }
  });
}

function broadcastEventDeleted(eventId: string): void {
  const message = JSON.stringify({ type: 'EVENT_DELETED', eventId });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      const info = clients.get(client);
      if (info && (info.currentEventId === eventId || info.currentEventId === 'dashboard')) {
        client.send(message);
      }
    }
  });
}

wss.on('connection', (ws: WebSocket, req) => {
  const clientIp = req.socket.remoteAddress || '';
  const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
  console.log(`Một thiết bị đã kết nối qua WebSockets! IP: ${clientIp} (Local: ${isLocal})`);
  clients.set(ws, { currentEventId: null, isLocal, lastActionAt: 0, verifiedPinTokens: new Map() });

  ws.on('message', (messageStr: string) => {
    try {
      const action = JSON.parse(messageStr);
      const clientInfo = clients.get(ws);
      if (!clientInfo) return;

      switch (action.type) {
        case 'JOIN_EVENT': {
          const event_join = readDB().events.find(e => e.id === action.eventId);
          if (event_join && event_join.partyPinHash) {
            if (!isPinAuthorized(event_join, action.pinToken)) {
              console.warn(`PIN denied JOIN_EVENT for ${action.eventId}`);
              break;
            }
            clientInfo.verifiedPinTokens.set(action.eventId, action.pinToken);
          }
          clientInfo.currentEventId = action.eventId;
          break;
        }

        case 'JOIN_DASHBOARD': {
          clientInfo.currentEventId = 'dashboard';
          break;
        }

        case 'VOTE_TOGGLE': {
          const { eventId, optionId, userId, userName, userNickname, userRealName, userEmail, pinToken } = action;
          if (!eventId || !optionId || !userId) break;
          const voteEvent = readDB().events.find(e => e.id === eventId);
          const effectiveToken = pinToken || clientInfo.verifiedPinTokens.get(eventId);
          if (!isPinAuthorized(voteEvent, effectiveToken)) break;

          const now = Date.now();
          if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
          clientInfo.lastActionAt = now;

          const db = readDB();
          const event = db.events.find(e => e.id === eventId);
          if (event?.status === 'locked') break;

          const existingVoteIndex = db.votes.findIndex(
            v => v.eventId === eventId && v.optionId === optionId && v.userId === userId
          );

          if (existingVoteIndex > -1) {
            db.votes.splice(existingVoteIndex, 1);
          } else {
            db.votes.push({
              id: randomUUID(),
              eventId,
              optionId,
              userId,
              userName,
              userNickname: userNickname || userName,
              userRealName: userRealName || '',
              userEmail: userEmail || '',
              createdAt: new Date().toISOString()
            });
          }

          writeDB(db);
          broadcastEventUpdate(eventId);
          broadcastDashboardUpdate();
          break;
        }

        case 'ADD_OPTION': {
          const { eventId, optType, value, creatorId, creatorName, userNickname, userRealName, userUsername, userEmail, pinToken } = action;
          if (!eventId || !value || typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 200) break;
          const addOptEvent = readDB().events.find(e => e.id === eventId);
          const effectiveToken = pinToken || clientInfo.verifiedPinTokens.get(eventId);
          if (!isPinAuthorized(addOptEvent, effectiveToken)) break;

          const now = Date.now();
          if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
          clientInfo.lastActionAt = now;

          const db = readDB();
          const event = db.events.find(e => e.id === eventId);
          if (event?.status === 'locked') break;

          const optId = randomUUID();
          const newOption: DBOption = {
            id: optId,
            eventId,
            type: optType,
            value: value.trim(),
            creatorId,
            creatorName,
            creatorNickname: userNickname || creatorName,
            creatorRealName: userRealName || '',
            creatorUsername: userUsername || userEmail || '',
            createdAt: new Date().toISOString()
          };

          db.options.push(newOption);
          db.votes.push({
            id: randomUUID(),
            eventId,
            optionId: optId,
            userId: creatorId,
            userName: creatorName,
            userNickname: userNickname || creatorName,
            userRealName: userRealName || '',
            userEmail: userEmail || '',
            createdAt: new Date().toISOString()
          });

          writeDB(db);
          broadcastEventUpdate(eventId);
          broadcastDashboardUpdate();
          break;
        }

        case 'ADD_COMMENT': {
          const { eventId, userId, userName, userRole, content, userNickname, userRealName, userEmail, pinToken } = action;
          const commentEvent = readDB().events.find(e => e.id === eventId);
          const effectiveToken = pinToken || clientInfo.verifiedPinTokens.get(eventId);
          if (!isPinAuthorized(commentEvent, effectiveToken)) break;
          if (!eventId || !content || typeof content !== 'string' || content.trim().length === 0 || content.trim().length > 500) break;

          const now = Date.now();
          if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
          clientInfo.lastActionAt = now;

          const db = readDB();
          db.comments.push({
            id: randomUUID(),
            eventId,
            userId,
            userName,
            userRole,
            content: content.trim(),
            userNickname: userNickname || userName,
            userRealName: userRealName || '',
            userEmail: userEmail || '',
            createdAt: new Date().toISOString()
          });

          writeDB(db);
          broadcastEventUpdate(eventId);
          broadcastDashboardUpdate();
          break;
        }

        case 'LOCK_EVENT': {
          const { eventId, userId, creatorToken, finalDateTime, finalLocation, finalBeerStyle, pinToken } = action;
          const lockEvent = readDB().events.find(e => e.id === eventId);
          const effectiveToken = pinToken || clientInfo.verifiedPinTokens.get(eventId);
          if (!isPinAuthorized(lockEvent, effectiveToken)) break;

          const now = Date.now();
          if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
          clientInfo.lastActionAt = now;

          const db = readDB();
          const eventIndex = db.events.findIndex(e => e.id === eventId);
          if (eventIndex === -1) break;

          const event = db.events[eventIndex];
          const authorized = event.creatorToken
            ? event.creatorToken === creatorToken
            : event.creatorId === userId;

          if (!authorized) {
            console.warn(`Security: unauthorized LOCK_EVENT attempt for ${eventId}`);
            break;
          }

          db.events[eventIndex].status = 'locked';
          db.events[eventIndex].lockedAt = new Date().toISOString();
          db.events[eventIndex].finalDateTime = finalDateTime;
          db.events[eventIndex].finalLocation = finalLocation;
          db.events[eventIndex].finalBeerStyle = finalBeerStyle;

          writeDB(db);
          broadcastEventUpdate(eventId);
          broadcastDashboardUpdate();
          console.log(`Kèo ${eventId} đã được CHỐT thành công bởi Chủ Kèo!`);
          break;
        }

        case 'UNLOCK_EVENT': {
          const { eventId, userId, creatorToken, pinToken } = action;
          const unlockEvent = readDB().events.find(e => e.id === eventId);
          const effectiveToken = pinToken || clientInfo.verifiedPinTokens.get(eventId);
          if (!isPinAuthorized(unlockEvent, effectiveToken)) break;

          const now = Date.now();
          if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
          clientInfo.lastActionAt = now;

          const db = readDB();
          const eventIndex = db.events.findIndex(e => e.id === eventId);
          if (eventIndex === -1) break;

          const event = db.events[eventIndex];
          const authorized = event.creatorToken
            ? event.creatorToken === creatorToken
            : event.creatorId === userId;

          if (!authorized) {
            console.warn(`Security: unauthorized UNLOCK_EVENT attempt for ${eventId}`);
            break;
          }

          db.events[eventIndex].status = 'voting';
          db.events[eventIndex].lockedAt = null;
          db.events[eventIndex].finalDateTime = null;
          db.events[eventIndex].finalLocation = null;
          db.events[eventIndex].finalBeerStyle = null;

          writeDB(db);
          broadcastEventUpdate(eventId);
          broadcastDashboardUpdate();
          console.log(`Kèo ${eventId} đã được MỞ KHÓA bởi Chủ Kèo.`);
          break;
        }

        default:
          console.warn('Hành động WebSocket không hợp lệ:', action.type);
      }
    } catch (e) {
      console.error('Lỗi xử lý tin nhắn WebSocket:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log(`📌 [Unified Server] Đang phục vụ thư mục tĩnh React build tại: ${distPath}`);
}

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🍺 BeerVote Backend Server đang chạy rực rỡ tại:`);
    console.log(`👉 APIs HTTP & Web: http://localhost:${PORT}`);
    console.log(`👉 WebSockets: ws://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Không thể khởi động server do lỗi DB:', err);
  server.listen(PORT, () => {
    console.log(`⚠️ BeerVote Server khởi động ở chế độ fallback không có DB Cloud: http://localhost:${PORT}`);
  });
});
