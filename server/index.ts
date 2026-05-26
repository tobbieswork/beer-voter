/* global process */
import express, { Request, Response } from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

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

function withoutToken(event: DBEvent): Omit<DBEvent, 'creatorToken'> {
  const { creatorToken: _token, ...rest } = event;
  return rest;
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
    ...withoutToken(event),
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
    return { ...withoutToken(event), votesCount, commentsCount, optionsCount };
  });
  summaryEvents.sort((a, b) => {
    if (a.status === b.status) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return a.status === 'voting' ? -1 : 1;
  });
  res.json(summaryEvents);
});

app.get('/api/events/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = readDB();
  const eventDetail = getEventDetail(db, id);
  if (!eventDetail) return res.status(404).json({ message: 'Không tìm thấy kèo nhậu này!' });
  res.json(eventDetail);
});

app.post('/api/events', (req: Request, res: Response) => {
  const { title, creatorId, creatorName, creatorNickname, creatorRealName, creatorUsername, dateOptions, locationOptions, beerOptions } = req.body;

  if (!title || !creatorId || !creatorName) {
    return res.status(400).json({ message: 'Tên kèo, ID người tạo và tên người tạo là bắt buộc!' });
  }
  if (typeof title !== 'string' || title.trim().length > 100) {
    return res.status(400).json({ message: 'Tên kèo không được vượt quá 100 ký tự!' });
  }

  const db = readDB();
  const eventId = randomUUID();
  const creatorToken = randomUUID();

  const newEvent: DBEvent = {
    id: eventId,
    title: title.trim(),
    creatorId,
    creatorName,
    creatorNickname: creatorNickname || creatorName,
    creatorRealName: creatorRealName || '',
    creatorUsername: creatorUsername || '',
    creatorToken,
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
  res.status(201).json({ ...withoutToken(newEvent), creatorToken });
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
    return { ...withoutToken(event), votesCount, commentsCount, optionsCount };
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
  clients.set(ws, { currentEventId: null, isLocal, lastActionAt: 0 });

  ws.on('message', (messageStr: string) => {
    try {
      const action = JSON.parse(messageStr);
      const clientInfo = clients.get(ws);
      if (!clientInfo) return;

      switch (action.type) {
        case 'JOIN_EVENT': {
          clientInfo.currentEventId = action.eventId;
          break;
        }

        case 'JOIN_DASHBOARD': {
          clientInfo.currentEventId = 'dashboard';
          break;
        }

        case 'VOTE_TOGGLE': {
          const { eventId, optionId, userId, userName, userNickname, userRealName, userEmail } = action;
          if (!eventId || !optionId || !userId) break;

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
          const { eventId, optType, value, creatorId, creatorName, userNickname, userRealName, userUsername, userEmail } = action;
          if (!eventId || !value || typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 200) break;

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
          const { eventId, userId, userName, userRole, content, userNickname, userRealName, userEmail } = action;
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
          const { eventId, userId, creatorToken, finalDateTime, finalLocation, finalBeerStyle } = action;

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
          const { eventId, userId, creatorToken } = action;

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
