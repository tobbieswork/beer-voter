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
import { DBOption } from '../db/types.js';
import { clients, broadcastEventUpdate, broadcastDashboardUpdate } from './server.js';
import { verifyGoogleToken } from '../utils/auth.js';

const RATE_LIMIT_MS = 500;

export interface WSAction {
  type: string;
  eventId?: string;
  pinToken?: string;
  creatorToken?: string;
  googleToken?: string;
  optionId?: string;
  userId?: string;
  userName?: string;
  creatorId?: string;
  creatorName?: string;
  userNickname?: string;
  userRealName?: string;
  userUsername?: string;
  userEmail?: string;
  optType?: 'datetime' | 'location' | 'beer';
  value?: string;
  userRole?: string;
  content?: string;
  finalDateTime?: string;
  finalLocation?: string;
  finalBeerStyle?: string;
}

export async function handleWebSocketMessage(ws: WebSocket, action: WSAction): Promise<void> {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;

  switch (action.type) {
    case 'JOIN_EVENT': {
      if (!action.eventId) break;
      const event_join = readDB().events.find((e) => e.id === action.eventId);
      if (event_join && event_join.partyPinHash) {
        let isCreator = !!(action.creatorToken && action.creatorToken === event_join.creatorToken);
        if (
          !isCreator &&
          action.googleToken &&
          action.userId &&
          action.userId === event_join.creatorId
        ) {
          if (action.userId.startsWith('google_')) {
            const googleSub = await verifyGoogleToken(action.googleToken);
            if (googleSub && `google_${googleSub}` === event_join.creatorId) {
              isCreator = true;
            }
          }
        }
        if (!isCreator && !isPinAuthorized(event_join, action.pinToken)) {
          console.warn(`PIN denied JOIN_EVENT for ${action.eventId}`);
          break;
        }
        clientInfo.verifiedPinTokens.set(action.eventId, action.pinToken || '');
      }
      clientInfo.currentEventId = action.eventId;
      break;
    }

    case 'JOIN_DASHBOARD': {
      clientInfo.currentEventId = 'dashboard';
      break;
    }

    case 'VOTE_TOGGLE': {
      const {
        eventId,
        optionId,
        userId,
        userName,
        userNickname,
        userRealName,
        userEmail,
        pinToken,
      } = action;
      if (!eventId || !optionId || !userId || !userName) break;
      const voteEvent = readDB().events.find((e) => e.id === eventId);
      const effectiveToken = pinToken || clientInfo.verifiedPinTokens.get(eventId);
      if (!isPinAuthorized(voteEvent, effectiveToken)) break;

      const now = Date.now();
      if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
      clientInfo.lastActionAt = now;

      const db = readDB();
      const event = db.events.find((e) => e.id === eventId);
      if (event?.status === 'locked') break;

      const existingVote = db.votes.find(
        (v) => v.eventId === eventId && v.optionId === optionId && v.userId === userId
      );

      if (existingVote) {
        await deleteVote(existingVote.id);
      } else {
        await insertVote({
          id: randomUUID(),
          eventId,
          optionId,
          userId,
          userName,
          userNickname: userNickname || userName,
          userRealName: userRealName || '',
          userEmail: userEmail || '',
          createdAt: new Date().toISOString(),
        });
      }

      broadcastEventUpdate(eventId);
      broadcastDashboardUpdate();
      break;
    }

    case 'ADD_OPTION': {
      const {
        eventId,
        optType,
        value,
        creatorId,
        creatorName,
        userNickname,
        userRealName,
        userUsername,
        userEmail,
        pinToken,
      } = action;
      if (
        !eventId ||
        !optType ||
        !value ||
        typeof value !== 'string' ||
        value.trim().length === 0 ||
        value.trim().length > 200 ||
        !creatorId ||
        !creatorName
      )
        break;
      const addOptEvent = readDB().events.find((e) => e.id === eventId);
      const effectiveToken = pinToken || clientInfo.verifiedPinTokens.get(eventId);
      if (!isPinAuthorized(addOptEvent, effectiveToken)) break;

      const now = Date.now();
      if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
      clientInfo.lastActionAt = now;

      const db = readDB();
      const event = db.events.find((e) => e.id === eventId);
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
        createdAt: new Date().toISOString(),
      };

      await insertOption(newOption);
      await insertVote({
        id: randomUUID(),
        eventId,
        optionId: optId,
        userId: creatorId,
        userName: creatorName,
        userNickname: userNickname || creatorName,
        userRealName: userRealName || '',
        userEmail: userEmail || '',
        createdAt: new Date().toISOString(),
      });

      broadcastEventUpdate(eventId);
      broadcastDashboardUpdate();
      break;
    }

    case 'ADD_COMMENT': {
      const {
        eventId,
        userId,
        userName,
        userRole,
        content,
        userNickname,
        userRealName,
        userEmail,
        pinToken,
      } = action;
      if (
        !eventId ||
        !userId ||
        !userName ||
        !content ||
        typeof content !== 'string' ||
        content.trim().length === 0 ||
        content.trim().length > 500
      )
        break;
      const commentEvent = readDB().events.find((e) => e.id === eventId);
      const effectiveToken = pinToken || clientInfo.verifiedPinTokens.get(eventId);
      if (!isPinAuthorized(commentEvent, effectiveToken)) break;

      const now = Date.now();
      if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
      clientInfo.lastActionAt = now;

      await insertComment({
        id: randomUUID(),
        eventId,
        userId,
        userName,
        userRole: userRole || '',
        content: content.trim(),
        userNickname: userNickname || userName,
        userRealName: userRealName || '',
        userEmail: userEmail || '',
        createdAt: new Date().toISOString(),
      });

      broadcastEventUpdate(eventId);
      broadcastDashboardUpdate();
      break;
    }

    case 'LOCK_EVENT': {
      const {
        eventId,
        userId,
        creatorToken,
        finalDateTime,
        finalLocation,
        finalBeerStyle,
        pinToken,
        googleToken,
      } = action;
      if (!eventId || !finalDateTime || !finalLocation || !finalBeerStyle) break;
      const lockEvent = readDB().events.find((e) => e.id === eventId);
      const effectiveToken = pinToken || clientInfo.verifiedPinTokens.get(eventId);
      if (!isPinAuthorized(lockEvent, effectiveToken)) break;

      const now = Date.now();
      if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
      clientInfo.lastActionAt = now;

      const db = readDB();
      const event = db.events.find((e) => e.id === eventId);
      if (!event) break;

      let authorized = !!(event.creatorToken && event.creatorToken === creatorToken);

      if (!authorized && googleToken && userId && userId === event.creatorId) {
        if (userId.startsWith('google_')) {
          const googleSub = await verifyGoogleToken(googleToken);
          if (googleSub && `google_${googleSub}` === event.creatorId) {
            authorized = true;
          }
        }
      }

      if (!authorized) {
        console.warn(`Security: unauthorized LOCK_EVENT attempt for ${eventId}`);
        break;
      }

      await updateEventStatus(eventId, {
        status: 'locked',
        lockedAt: new Date().toISOString(),
        finalDateTime,
        finalLocation,
        finalBeerStyle,
      });

      broadcastEventUpdate(eventId);
      broadcastDashboardUpdate();
      console.log(`Kèo ${eventId} đã được CHỐT thành công bởi Chủ Kèo!`);
      break;
    }

    case 'UNLOCK_EVENT': {
      const { eventId, userId, creatorToken, pinToken, googleToken } = action;
      if (!eventId) break;
      const unlockEvent = readDB().events.find((e) => e.id === eventId);
      const effectiveToken = pinToken || clientInfo.verifiedPinTokens.get(eventId);
      if (!isPinAuthorized(unlockEvent, effectiveToken)) break;

      const now = Date.now();
      if (now - clientInfo.lastActionAt < RATE_LIMIT_MS) break;
      clientInfo.lastActionAt = now;

      const db = readDB();
      const event = db.events.find((e) => e.id === eventId);
      if (!event) break;

      let authorized = !!(event.creatorToken && event.creatorToken === creatorToken);

      if (!authorized && googleToken && userId && userId === event.creatorId) {
        if (userId.startsWith('google_')) {
          const googleSub = await verifyGoogleToken(googleToken);
          if (googleSub && `google_${googleSub}` === event.creatorId) {
            authorized = true;
          }
        }
      }

      if (!authorized) {
        console.warn(`Security: unauthorized UNLOCK_EVENT attempt for ${eventId}`);
        break;
      }

      await updateEventStatus(eventId, {
        status: 'voting',
        lockedAt: null,
        finalDateTime: null,
        finalLocation: null,
        finalBeerStyle: null,
      });

      broadcastEventUpdate(eventId);
      broadcastDashboardUpdate();
      console.log(`Kèo ${eventId} đã được MỞ KHÓA bởi Chủ Kèo.`);
      break;
    }

    default:
      console.warn('Hành động WebSocket không hợp lệ:', action.type);
  }
}
