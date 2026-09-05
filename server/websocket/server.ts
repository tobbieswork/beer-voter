import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { EventDetailPayload, DashboardEventPayload } from '../db/adapters/StorageAdapter.js';
import { handleWebSocketMessage } from './handlers.js';

export interface ClientInfo {
  currentEventId: string | null;
  isLocal: boolean;
  lastActionAt: number;
}

export const clients = new Map<WebSocket, ClientInfo>();
let wss: WebSocketServer;

export function initWebSocketServer(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, maxPayload: 16384 });

  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress || '';
    const isLocal =
      clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
    console.log(`Một thiết bị đã kết nối qua WebSockets! IP: ${clientIp} (Local: ${isLocal})`);

    clients.set(ws, {
      currentEventId: null,
      isLocal,
      lastActionAt: 0,
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

export function broadcastToLocalClients(eventId: string, eventData: EventDetailPayload): void {
  const message = JSON.stringify({ type: 'EVENT_UPDATED', eventId, eventData });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const info = clients.get(client);
      if (info && (info.currentEventId === eventId || info.currentEventId === 'dashboard')) {
        client.send(message);
      }
    }
  });
}

export function broadcastDashboardToLocalClients(events: DashboardEventPayload[]): void {
  const message = JSON.stringify({ type: 'DASHBOARD_UPDATED', events });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const info = clients.get(client);
      if (info && info.currentEventId === 'dashboard') client.send(message);
    }
  });
}

export function broadcastDeletedToLocalClients(eventId: string): void {
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
