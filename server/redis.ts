import { Redis } from 'ioredis';
import {
  broadcastToLocalClients,
  broadcastDashboardToLocalClients,
  broadcastDeletedToLocalClients,
} from './websocket/server.js';
import { readDB, getEventDetail, sanitizeEvent } from './db/store.js';

let pubClient: Redis | null = null;
let subClient: Redis | null = null;

const REDIS_CHANNEL = 'beervote:ws:events';

export function initRedis(): void {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log(
      '⚠️ REDIS_URL không được cấu hình. Ứng dụng sẽ chạy ở chế độ Single-Node WebSocket.'
    );
    return;
  }

  try {
    pubClient = new Redis(redisUrl);
    subClient = new Redis(redisUrl);

    subClient.subscribe(REDIS_CHANNEL, (err, count) => {
      if (err) {
        console.error('❌ Lỗi khi subscribe Redis channel:', err);
      } else {
        console.log(
          `✅ Đã subscribe Redis channel: ${REDIS_CHANNEL} (Total subscriptions: ${count})`
        );
      }
    });

    subClient.on('message', (channel, message) => {
      if (channel === REDIS_CHANNEL) {
        try {
          const payload = JSON.parse(message);

          if (payload.type === 'EVENT_UPDATED') {
            broadcastToLocalClients(payload.eventId, payload.eventData);
          } else if (payload.type === 'DASHBOARD_UPDATED') {
            broadcastDashboardToLocalClients(payload.events);
          } else if (payload.type === 'EVENT_DELETED') {
            broadcastDeletedToLocalClients(payload.eventId);
          }
        } catch (error) {
          console.error('❌ Lỗi xử lý tin nhắn từ Redis:', error);
        }
      }
    });

    console.log('✅ Đã kết nối thành công tới Redis Pub/Sub.');
  } catch (error) {
    console.error('❌ Không thể kết nối tới Redis:', error);
    pubClient = null;
    subClient = null;
  }
}

export function publishEventUpdate(eventId: string): void {
  const db = readDB();
  const eventDetail = getEventDetail(db, eventId);
  if (!eventDetail) return;

  if (pubClient) {
    const message = JSON.stringify({ type: 'EVENT_UPDATED', eventId, eventData: eventDetail });
    pubClient.publish(REDIS_CHANNEL, message);
  } else {
    // Graceful fallback to local broadcast
    broadcastToLocalClients(eventId, eventDetail);
  }
}

export function publishDashboardUpdate(): void {
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

  if (pubClient) {
    const message = JSON.stringify({ type: 'DASHBOARD_UPDATED', events: summaryEvents });
    pubClient.publish(REDIS_CHANNEL, message);
  } else {
    // Graceful fallback
    broadcastDashboardToLocalClients(summaryEvents);
  }
}

export function publishEventDeleted(eventId: string): void {
  if (pubClient) {
    const message = JSON.stringify({ type: 'EVENT_DELETED', eventId });
    pubClient.publish(REDIS_CHANNEL, message);
  } else {
    // Graceful fallback
    broadcastDeletedToLocalClients(eventId);
  }
}
