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
import { verifyGoogleToken, verifyGithubToken } from '../utils/auth.js';

const RATE_LIMIT_MS = 500;

async function isUserAuthorizedForEvent(
  action: WSAction,
  event: DBEvent | undefined,
  clientInfo: ClientInfo
): Promise<boolean> {
  if (!event) return false;
  if (!event.partyPinHash) return true;

  let isCreator = !!(action.creatorToken && action.creatorToken === event.creatorToken);
  if (!isCreator && action.userId && action.userId === event.creatorId) {
    if (action.googleToken && action.userId.startsWith('google_')) {
      const googleSub = await verifyGoogleToken(action.googleToken);
      if (googleSub && `google_${googleSub}` === event.creatorId) {
        isCreator = true;
      }
    } else if (action.githubToken && action.userId.startsWith('github_')) {
      const githubSub = await verifyGithubToken(action.githubToken);
      if (githubSub && `github_${githubSub}` === event.creatorId) {
        isCreator = true;
      }
    }
  }

  if (isCreator) return true;

  const effectiveToken = action.pinToken || clientInfo.verifiedPinTokens.get(event.id);
  return isPinAuthorized(event, effectiveToken);
}

export interface WSAction {
  type: string;
  eventId?: string;
  pinToken?: string;
  creatorToken?: string;
  googleToken?: string;
  githubToken?: string;
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
        if (
          !isCreator &&
          action.githubToken &&
          action.userId &&
          action.userId === event_join.creatorId
        ) {
          if (action.userId.startsWith('github_')) {
            const githubSub = await verifyGithubToken(action.githubToken);
            if (githubSub && `github_${githubSub}` === event_join.creatorId) {
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
      const { eventId, optionId, userId, userName, userNickname, userRealName, userEmail } = action;
      if (!eventId || !optionId || !userId || !userName) break;
      const voteEvent = readDB().events.find((e) => e.id === eventId);
      if (!(await isUserAuthorizedForEvent(action, voteEvent, clientInfo))) break;

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

      publishEventUpdate(eventId);
      publishDashboardUpdate();
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
      if (!(await isUserAuthorizedForEvent(action, addOptEvent, clientInfo))) break;

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

      publishEventUpdate(eventId);
      publishDashboardUpdate();
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
      if (!(await isUserAuthorizedForEvent(action, commentEvent, clientInfo))) break;

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

      publishEventUpdate(eventId);
      publishDashboardUpdate();
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
        googleToken,
        githubToken,
      } = action;
      if (!eventId || !finalDateTime || !finalLocation || !finalBeerStyle) break;
      const lockEvent = readDB().events.find((e) => e.id === eventId);
      if (!(await isUserAuthorizedForEvent(action, lockEvent, clientInfo))) break;

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

      if (!authorized && githubToken && userId && userId === event.creatorId) {
        if (userId.startsWith('github_')) {
          const githubSub = await verifyGithubToken(githubToken);
          if (githubSub && `github_${githubSub}` === event.creatorId) {
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

      publishEventUpdate(eventId);
      publishDashboardUpdate();
      console.log(`Kèo ${eventId} đã được CHỐT thành công bởi Chủ Kèo!`);
      break;
    }

    case 'UNLOCK_EVENT': {
      const { eventId, userId, creatorToken, googleToken, githubToken } = action;
      if (!eventId) break;
      const unlockEvent = readDB().events.find((e) => e.id === eventId);
      if (!(await isUserAuthorizedForEvent(action, unlockEvent, clientInfo))) break;

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

      if (!authorized && githubToken && userId && userId === event.creatorId) {
        if (userId.startsWith('github_')) {
          const githubSub = await verifyGithubToken(githubToken);
          if (githubSub && `github_${githubSub}` === event.creatorId) {
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

      publishEventUpdate(eventId);
      publishDashboardUpdate();
      console.log(`Kèo ${eventId} đã được MỞ KHÓA bởi Chủ Kèo.`);
      break;
    }

    default:
      console.warn('Hành động WebSocket không hợp lệ:', action.type);
  }
}
