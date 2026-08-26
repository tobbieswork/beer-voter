/* global process */
import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as Sentry from '@sentry/node';

// Import các modules nội bộ đã tách
import { initDB } from './db/store.js';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import { initWebSocketServer } from './websocket/server.js';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Tin tưởng headers từ reverse proxy (Render, Cloudflare, v.v.) để giải quyết đúng giao thức https
app.set('trust proxy', 1);

// Cấu hình CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : null;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!allowedOrigins || !origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API kiểm tra tình trạng server (ping)
app.get('/api/ping', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Kết nối các Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);

if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Phục vụ thư mục tĩnh React build (Production)
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log(`📌 [Unified Server] Đang phục vụ thư mục tĩnh React build tại: ${distPath}`);
}

// Khởi tạo HTTP Server & WebSocket Server
const server = http.createServer(app);
initWebSocketServer(server);

const PORT = process.env.PORT || 3001;

// Khởi chạy hệ thống sau khi đồng bộ database
initDB()
  .then(() => {
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🍺 BeerVote Backend Server đang chạy rực rỡ tại:`);
      console.log(`👉 APIs HTTP & Web: http://localhost:${PORT}`);
      console.log(`👉 WebSockets: ws://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Không thể khởi động server do lỗi DB:', err);
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(
        `⚠️ BeerVote Server khởi động ở chế độ fallback không có DB Cloud: http://localhost:${PORT}`
      );
    });
  });
