import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { readDB, getEventDetail, sanitizeEvent } from '../db/store.js';
import { handleWebSocketMessage } from './handlers.js';

export interface ClientInfo {
  currentEventId: string | null;
  isLocal: boolean;
  lastActionAt: number;
  verifiedPinTokens: Map<string, string>; // eventId -> valid pinToken
}

export const clients = new Map<WebSocket, ClientInfo>();
let wss: WebSocketServer;

export function initWebSocketServer(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress || '';
    const isLocal =
      clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
    console.log(`Một thiết bị đã kết nối qua WebSockets! IP: ${clientIp} (Local: ${isLocal})`);

    clients.set(ws, {
      currentEventId: null,
      isLocal,
      lastActionAt: 0,
      verifiedPinTokens: new Map(),
    });

    ws.on('message', async (messageStr: string) => {
      try {
        const action = JSON.parse(messageStr);
        await handleWebSocketMessage(ws, action);
      } catch (e) {
        console.error('Lỗi xử lý tin nhắn WebSocket:', e);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  return wss;
}

export function broadcastEventUpdate(eventId: string): void {
  const db = readDB();
  const eventDetail = getEventDetail(db, eventId);
  if (!eventDetail) return;

  const message = JSON.stringify({ type: 'EVENT_UPDATED', eventId, eventData: eventDetail });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const info = clients.get(client);
      if (info && (info.currentEventId === eventId || info.currentEventId === 'dashboard')) {
        client.send(message);
      }
    }
  });
}

export function broadcastDashboardUpdate(): void {
  const db = readDB();
  const summaryEvents = db.events.map((event) => {
    const votesCount = db.votes.filter((v) => v.eventId === event.id).length;
    const commentsCount = db.comments.filter((c) => c.eventId === event.id).length;
    const optionsCount = db.options.filter((o) => o.eventId === event.id).length;
    return { ...sanitizeEvent(event), votesCount, commentsCount, optionsCount };
  });
  summaryEvents.sort((a, b) => {
    if (a.status === b.status)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return a.status === 'voting' ? -1 : 1;
  });

  const message = JSON.stringify({ type: 'DASHBOARD_UPDATED', events: summaryEvents });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const info = clients.get(client);
      if (info && info.currentEventId === 'dashboard') client.send(message);
    }
  });
}

export function broadcastEventDeleted(eventId: string): void {
  const message = JSON.stringify({ type: 'EVENT_DELETED', eventId });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const info = clients.get(client);
      if (info && (info.currentEventId === eventId || info.currentEventId === 'dashboard')) {
        client.send(message);
      }
    }
  });
}
