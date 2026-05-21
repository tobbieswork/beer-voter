/* global process */
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

const app = express();
app.use(cors());
app.use(express.json());

// Helper đọc/ghi Database
function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialData = { events: [], options: [], votes: [], comments: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf8');
      return initialData;
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Lỗi đọc database file JSON:', error);
    return { events: [], options: [], votes: [], comments: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Lỗi ghi database file JSON:', error);
  }
}

// Helper lấy chi tiết đầy đủ của một kèo nhậu
function getEventDetail(db, eventId) {
  const event = db.events.find(e => e.id === eventId);
  if (!event) return null;
  
  const options = db.options.filter(o => o.eventId === eventId);
  const votes = db.votes.filter(v => v.eventId === eventId);
  const comments = db.comments.filter(c => c.eventId === eventId);
  
  return {
    ...event,
    options,
    votes,
    comments
  };
}

// ================= HTTP REST APIs =================

// 1. Lấy danh sách các kèo nhậu
app.get('/api/events', (req, res) => {
  const db = readDB();
  // Trả về danh sách kèo kèm theo một vài thông tin tóm tắt
  const summaryEvents = db.events.map(event => {
    const votesCount = db.votes.filter(v => v.eventId === event.id).length;
    const commentsCount = db.comments.filter(c => c.eventId === event.id).length;
    const optionsCount = db.options.filter(o => o.eventId === event.id).length;
    return {
      ...event,
      votesCount,
      commentsCount,
      optionsCount
    };
  });
  // Sắp xếp kèo đang vote lên trước, kèo đã chốt xuống sau. Trong mỗi nhóm sắp xếp theo ngày tạo mới nhất.
  summaryEvents.sort((a, b) => {
    if (a.status === b.status) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return a.status === 'voting' ? -1 : 1;
  });
  res.json(summaryEvents);
});

// 2. Lấy chi tiết một kèo nhậu
app.get('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const eventDetail = getEventDetail(db, id);
  if (!eventDetail) {
    return res.status(404).json({ message: 'Không tìm thấy kèo nhậu này!' });
  }
  res.json(eventDetail);
});

// 3. Tạo kèo nhậu mới (Ai cũng có thể tạo kèo và làm chủ kèo)
app.post('/api/events', (req, res) => {
  const { 
    title, 
    creatorId, 
    creatorName, 
    creatorNickname, 
    creatorRealName, 
    creatorUsername, 
    dateOptions, 
    locationOptions, 
    beerOptions 
  } = req.body;
  
  if (!title || !creatorId || !creatorName) {
    return res.status(400).json({ message: 'Tên kèo, ID người tạo và tên người tạo là bắt buộc!' });
  }

  const db = readDB();
  const eventId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  
  const newEvent = {
    id: eventId,
    title,
    creatorId,
    creatorName,
    creatorNickname: creatorNickname || creatorName,
    creatorRealName: creatorRealName || '',
    creatorUsername: creatorUsername || '',
    status: 'voting',
    createdAt: new Date().toISOString(),
    lockedAt: null,
    finalDateTime: null,
    finalLocation: null,
    finalBeerStyle: null
  };

  db.events.push(newEvent);

  // Thêm các option đề xuất ban đầu
  const addOption = (value, type) => {
    if (!value || value.trim() === '') return;
    const optId = 'opt_' + type + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    db.options.push({
      id: optId,
      eventId,
      type,
      value: value.trim(),
      creatorId,
      creatorName,
      creatorNickname: creatorNickname || creatorName,
      creatorRealName: creatorRealName || '',
      creatorUsername: creatorUsername || '',
      createdAt: new Date().toISOString()
    });
  };

  if (dateOptions && Array.isArray(dateOptions)) {
    dateOptions.forEach(opt => addOption(opt, 'datetime'));
  }
  if (locationOptions && Array.isArray(locationOptions)) {
    locationOptions.forEach(opt => addOption(opt, 'location'));
  }
  if (beerOptions && Array.isArray(beerOptions)) {
    beerOptions.forEach(opt => addOption(opt, 'beer'));
  }

  writeDB(db);
  res.status(201).json(newEvent);
});

// Create HTTP server
const server = http.createServer(app);

// ================= WEBSOCKETS SERVER =================

const wss = new WebSocketServer({ server });

// Danh sách các kết nối WebSocket đang hoạt động
const clients = new Map(); // ws -> { currentEventId }

// Hàm phát sóng (broadcast) thông tin cập nhật cho mọi client đang xem event đó
function broadcastEventUpdate(eventId) {
  const db = readDB();
  const eventDetail = getEventDetail(db, eventId);
  if (!eventDetail) return;

  const message = JSON.stringify({
    type: 'EVENT_UPDATED',
    eventId,
    eventData: eventDetail
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      const clientInfo = clients.get(client);
      // Chỉ broadcast cho các client đang xem event này hoặc ở trang dashboard cần nhận cập nhật
      if (clientInfo && (clientInfo.currentEventId === eventId || clientInfo.currentEventId === 'dashboard')) {
        client.send(message);
      }
    }
  });
}

// Hàm phát sóng cập nhật danh sách kèo cho trang dashboard
function broadcastDashboardUpdate() {
  const db = readDB();
  const summaryEvents = db.events.map(event => {
    const votesCount = db.votes.filter(v => v.eventId === event.id).length;
    const commentsCount = db.comments.filter(c => c.eventId === event.id).length;
    const optionsCount = db.options.filter(o => o.eventId === event.id).length;
    return {
      ...event,
      votesCount,
      commentsCount,
      optionsCount
    };
  });
  
  summaryEvents.sort((a, b) => {
    if (a.status === b.status) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return a.status === 'voting' ? -1 : 1;
  });

  const message = JSON.stringify({
    type: 'DASHBOARD_UPDATED',
    events: summaryEvents
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      const clientInfo = clients.get(client);
      if (clientInfo && clientInfo.currentEventId === 'dashboard') {
        client.send(message);
      }
    }
  });
}

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress || '';
  const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
  console.log(`Một thiết bị đã kết nối qua WebSockets! IP: ${clientIp} (Local: ${isLocal})`);
  clients.set(ws, { currentEventId: null, isLocal });

  ws.on('message', (messageStr) => {
    try {
      const action = JSON.parse(messageStr);
      const clientInfo = clients.get(ws);

      switch (action.type) {
        // Client thông báo đang xem event nào để nhận broadcast chính xác
        case 'JOIN_EVENT': {
          clientInfo.currentEventId = action.eventId;
          console.log(`Thiết bị đăng ký xem kèo: ${action.eventId}`);
          break;
        }

        // Client đăng ký nhận cập nhật tại trang chủ
        case 'JOIN_DASHBOARD': {
          clientInfo.currentEventId = 'dashboard';
          console.log('Thiết bị đăng ký xem Dashboard');
          break;
        }

        // Thao tác BÌNH CHỌN / HỦY BÌNH CHỌN
        case 'VOTE_TOGGLE': {
          const { eventId, optionId, userId, userName, userNickname, userRealName, userEmail } = action;
          const db = readDB();

          // Kiểm tra xem event có bị khóa (locked) chưa
          const event = db.events.find(e => e.id === eventId);
          if (event && event.status === 'locked') {
            console.log('Kèo đã chốt, không thể vote!');
            break;
          }

          // Kiểm tra xem đã vote cho option này chưa
          const existingVoteIndex = db.votes.findIndex(
            v => v.eventId === eventId && v.optionId === optionId && v.userId === userId
          );

          if (existingVoteIndex > -1) {
            // Đã vote rồi -> Hủy vote
            db.votes.splice(existingVoteIndex, 1);
          } else {
            // Chưa vote -> Thêm vote mới
            db.votes.push({
              id: 'vote_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
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

        // Thao tác ĐỀ XUẤT OPTION MỚI
        case 'ADD_OPTION': {
          const { eventId, optType, value, creatorId, creatorName, userNickname, userRealName, userUsername, userEmail } = action;
          const db = readDB();

          const event = db.events.find(e => e.id === eventId);
          if (event && event.status === 'locked') {
            console.log('Kèo đã chốt, không thể đề xuất thêm!');
            break;
          }

          const optId = 'opt_' + optType + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          const newOption = {
            id: optId,
            eventId,
            type: optType,
            value: value.trim(),
            creatorId,
            creatorName,
            creatorNickname: userNickname || creatorName,
            creatorRealName: userRealName || '',
            creatorUsername: userUsername || userEmail || '',
            creatorEmail: userEmail || '',
            createdAt: new Date().toISOString()
          };

          db.options.push(newOption);

          // Tự động vote +1 cho chính người đề xuất
          db.votes.push({
            id: 'vote_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
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

        // Thao tác GỬI BÌNH LUẬN
        case 'ADD_COMMENT': {
          const { eventId, userId, userName, userRole, content, userNickname, userRealName, userEmail } = action;
          const db = readDB();

          const commentId = 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          db.comments.push({
            id: commentId,
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

        // Thao tác CHỐT KÈO & LÊN LỊCH (Chủ Kèo)
        case 'LOCK_EVENT': {
          const { eventId, userId, finalDateTime, finalLocation, finalBeerStyle } = action;
          const db = readDB();

          const eventIndex = db.events.findIndex(e => e.id === eventId);
          if (eventIndex > -1) {
            const event = db.events[eventIndex];
            if (event.creatorId !== userId) {
              console.warn(`Cảnh báo bảo mật: Người dùng ${userId} không phải chủ kèo ${event.creatorId} cố gắng chốt kèo!`);
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
          }
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
    console.log('Một thiết bị đã ngắt kết nối WebSocket.');
    clients.delete(ws);
  });
});

// Phục vụ các file tĩnh từ React build sau khi chạy `npm run build`
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Hỗ trợ SPA Routing cho React
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log(`📌 [Unified Server] Đang phục vụ thư mục tĩnh React build tại: ${distPath}`);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🍺 BeerVote Backend Server đang chạy rực rỡ tại:`);
  console.log(`👉 APIs HTTP & Web: http://localhost:${PORT}`);
  console.log(`👉 WebSockets: ws://localhost:${PORT}`);
});
