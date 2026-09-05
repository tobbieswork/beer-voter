import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import {
  readDB,
  isPinAuthorized,
  insertVote,
  deleteVote,
  insertOption,
  insertComment,
  updateEventStatus,
} from '../db/store.js';
import { DBEvent, DBOption } from '../db/types.js';
import { ClientInfo, clients } from './server.js';
import { publishEventUpdate, publishDashboardUpdate } from '../redis.js';
import { verifyAuthToken, AuthTokenPayload } from '../utils/jwt.js';

const RATE_LIMIT_MS = 500;

export interface WSAction {
  type: string;
  eventId?: string;
  pinToken?: string;
  authToken?: string;
  optionId?: string;
  optType?: 'datetime' | 'location' | 'beer';
  value?: string;
  content?: string;
  finalDateTime?: string;
  finalLocation?: string;
  finalBeerStyle?: string;
}

interface AuthResult {
  authorized: boolean;
  userPayload: AuthTokenPayload | null;
  isCreator: boolean;
}

function verifyUserAndEvent(action: WSAction, event: DBEvent | undefined): AuthResult {
  let userPayload: AuthTokenPayload | null = null;
  let isCreator = false;

  if (action.authToken) {
    userPayload = verifyAuthToken(action.authToken);
    if (userPayload && event && userPayload.userId === event.creatorId) {
      isCreator = true;
    }
  }

  if (!event) return { authorized: false, userPayload, isCreator };

  if (isCreator) return { authorized: true, userPayload, isCreator };

  if (event.partyPinHash) {
    if (!isPinAuthorized(event, action.pinToken)) {
      return { authorized: false, userPayload, isCreator };
    }
  }

  return { authorized: true, userPayload, isCreator };
}

export async function handleWebSocketMessage(ws: WebSocket, action: WSAction): Promise<void> {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;

  switch (action.type) {
    case 'JOIN_EVENT': {
      if (!action.eventId) break;
      const event_join = readDB().events.find((e) => e.id === action.eventId);

      const auth = verifyUserAndEvent(action, event_join);
      if (event_join && event_join.partyPinHash && !auth.authorized) {
        console.warn(`PIN denied JOIN_EVENT for ${action.eventId}`);
        break;
      }

      clientInfo.currentEventId = action.eventId;
      break;
    }

    case 'JOIN_DASHBOARD': {
      clientInfo.currentEventId = 'dashboard';
      break;
    }

    case 'VOTE_TOGGLE': {
      const { eventId, optionId } = action;
      if (!eventId || !optionId) break;
      const event = readDB().events.find((e) => e.id === eventId);

      const auth = verifyUserAndEvent(action, event);
      if (!auth.authorized) break;

      const user = auth.userPayload;
      if (!user) break; // Requires authenticated identity

      const now = Date.now();
      if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
      clientInfo.lastActionAt = now;

      if (event?.status === 'locked') break;

      const db = readDB();
      const existingVote = db.votes.find(
        (v) => v.eventId === eventId && v.optionId === optionId && v.userId === user.userId
      );

      if (existingVote) {
        await deleteVote(existingVote.id);
      } else {
        await insertVote({
          id: randomUUID(),
          eventId,
          optionId,
          userId: user.userId,
          userName: user.username || user.nickname,
          userNickname: user.nickname,
          userRealName: user.realName,
          userEmail: user.email,
          createdAt: new Date().toISOString(),
        });
      }

      publishEventUpdate(eventId);
      publishDashboardUpdate();
      break;
    }

    case 'ADD_OPTION': {
      const { eventId, optType, value } = action;
      if (
        !eventId ||
        !optType ||
        !value ||
        typeof value !== 'string' ||
        value.trim().length === 0 ||
        value.trim().length > 200
      )
        break;

      const event = readDB().events.find((e) => e.id === eventId);
      const auth = verifyUserAndEvent(action, event);
      if (!auth.authorized) break;

      const user = auth.userPayload;
      if (!user) break;

      const now = Date.now();
      if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
      clientInfo.lastActionAt = now;

      if (event?.status === 'locked') break;

      const optId = randomUUID();
      const newOption: DBOption = {
        id: optId,
        eventId,
        type: optType,
        value: value.trim(),
        creatorId: user.userId,
        creatorName: user.username || user.nickname,
        creatorNickname: user.nickname,
        creatorRealName: user.realName,
        creatorUsername: user.username,
        createdAt: new Date().toISOString(),
      };

      await insertOption(newOption);
      await insertVote({
        id: randomUUID(),
        eventId,
        optionId: optId,
        userId: user.userId,
        userName: user.username || user.nickname,
        userNickname: user.nickname,
        userRealName: user.realName,
        userEmail: user.email,
        createdAt: new Date().toISOString(),
      });

      publishEventUpdate(eventId);
      publishDashboardUpdate();
      break;
    }

    case 'ADD_COMMENT': {
      const { eventId, content } = action;
      if (
        !eventId ||
        !content ||
        typeof content !== 'string' ||
        content.trim().length === 0 ||
        content.trim().length > 500
      )
        break;

      const event = readDB().events.find((e) => e.id === eventId);
      const auth = verifyUserAndEvent(action, event);
      if (!auth.authorized) break;

      const user = auth.userPayload;
      if (!user) break;

      const now = Date.now();
      if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
      clientInfo.lastActionAt = now;

      await insertComment({
        id: randomUUID(),
        eventId,
        userId: user.userId,
        userName: user.username || user.nickname,
        userRole: user.role,
        content: content.trim(),
        userNickname: user.nickname,
        userRealName: user.realName,
        userEmail: user.email,
        createdAt: new Date().toISOString(),
      });

      publishEventUpdate(eventId);
      publishDashboardUpdate();
      break;
    }

    case 'LOCK_EVENT': {
      const { eventId, finalDateTime, finalLocation, finalBeerStyle } = action;
      if (!eventId || !finalDateTime || !finalLocation || !finalBeerStyle) break;

      const event = readDB().events.find((e) => e.id === eventId);
      const auth = verifyUserAndEvent(action, event);

      if (!auth.isCreator) {
        console.warn(`Security: unauthorized LOCK_EVENT attempt for ${eventId}`);
        break;
      }

      const now = Date.now();
      if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
      clientInfo.lastActionAt = now;

      await updateEventStatus(eventId, {
        status: 'locked',
        lockedAt: new Date().toISOString(),
        finalDateTime,
        finalLocation,
        finalBeerStyle,
      });

      publishEventUpdate(eventId);
      publishDashboardUpdate();
      console.log(`Kèo ${eventId} đã được CHỐT thành công bởi Chủ Kèo!`);
      break;
    }

    case 'UNLOCK_EVENT': {
      const { eventId } = action;
      if (!eventId) break;

      const event = readDB().events.find((e) => e.id === eventId);
      const auth = verifyUserAndEvent(action, event);

      if (!auth.isCreator) {
        console.warn(`Security: unauthorized UNLOCK_EVENT attempt for ${eventId}`);
        break;
      }

      const now = Date.now();
      if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
      clientInfo.lastActionAt = now;

      await updateEventStatus(eventId, {
        status: 'voting',
        lockedAt: null,
        finalDateTime: null,
        finalLocation: null,
        finalBeerStyle: null,
      });

      publishEventUpdate(eventId);
      publishDashboardUpdate();
      console.log(`Kèo ${eventId} đã được MỞ KHÓA bởi Chủ Kèo.`);
      break;
    }

    default:
      console.warn('Hành động WebSocket không hợp lệ:', action.type);
  }
}
