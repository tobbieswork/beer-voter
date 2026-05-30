import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import {
  readDB,
  insertEvent,
  insertOptions,
  sanitizeEvent,
  isPinAuthorized,
  getEventDetail,
  withoutPinHash,
  hashPin,
  generatePinToken,
} from '../db/store.js';
import { DBEvent, DBOption } from '../db/types.js';
import { supabase } from '../db/client.js';
import { broadcastEventDeleted, broadcastDashboardUpdate } from '../websocket/server.js';

const router = Router();

// Lấy danh sách các kèo nhậu (Dashboard summary)
router.get('/', (_req: Request, res: Response) => {
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
  res.json(summaryEvents);
});

// Lấy chi tiết kèo nhậu (Event detail)
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const pinToken = req.headers['x-pin-token'] as string | undefined;
  const creatorToken = req.headers['x-creator-token'] as string | undefined;
  const db = readDB();
  const event = db.events.find((e) => e.id === id);
  if (!event) return res.status(404).json({ message: 'Không tìm thấy kèo nhậu này!' });

  const isCreator = creatorToken && creatorToken === event.creatorToken;
  if (!isCreator && !isPinAuthorized(event, pinToken)) {
    return res.status(403).json({ message: 'Yêu cầu xác thực PIN!' });
  }

  const eventDetail = getEventDetail(db, id);
  if (eventDetail && isCreator) {
    eventDetail.partyPin = event.partyPin;
  }
  res.json(eventDetail);
});

// Tạo kèo nhậu mới
router.post('/', async (req: Request, res: Response) => {
  const {
    title,
    creatorId,
    creatorName,
    creatorNickname,
    creatorRealName,
    creatorUsername,
    dateOptions,
    locationOptions,
    beerOptions,
    partyPin,
  } = req.body;

  if (!title || !creatorId || !creatorName) {
    return res.status(400).json({ message: 'Tên kèo, ID người tạo và tên người tạo là bắt buộc!' });
  }
  if (typeof title !== 'string' || title.trim().length > 100) {
    return res.status(400).json({ message: 'Tên kèo không được vượt quá 100 ký tự!' });
  }

  const eventId = randomUUID();
  const creatorToken = randomUUID();

  const pinHash =
    partyPin && /^\d{6}$/.test(String(partyPin)) ? hashPin(String(partyPin)) : undefined;

  const newEvent: DBEvent = {
    id: eventId,
    title: title.trim(),
    creatorId,
    creatorName,
    creatorNickname: creatorNickname || creatorName,
    creatorRealName: creatorRealName || '',
    creatorUsername: creatorUsername || '',
    creatorToken,
    partyPin: partyPin && /^\d{6}$/.test(String(partyPin)) ? String(partyPin) : undefined,
    partyPinHash: pinHash,
    status: 'voting',
    createdAt: new Date().toISOString(),
    lockedAt: null,
    finalDateTime: null,
    finalLocation: null,
    finalBeerStyle: null,
  };

  // 1. Chèn event mới vào DB/cache
  await insertEvent(newEvent);

  // 2. Gom các options để chèn
  const optionsToInsert: DBOption[] = [];
  const buildOption = (value: string, type: 'datetime' | 'location' | 'beer') => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length > 200) return;
    optionsToInsert.push({
      id: randomUUID(),
      eventId,
      type,
      value: trimmed,
      creatorId,
      creatorName,
      creatorNickname: creatorNickname || creatorName,
      creatorRealName: creatorRealName || '',
      creatorUsername: creatorUsername || '',
      createdAt: new Date().toISOString(),
    });
  };

  if (Array.isArray(dateOptions)) dateOptions.forEach((opt) => buildOption(opt, 'datetime'));
  if (Array.isArray(locationOptions))
    locationOptions.forEach((opt) => buildOption(opt, 'location'));
  if (Array.isArray(beerOptions)) beerOptions.forEach((opt) => buildOption(opt, 'beer'));

  if (optionsToInsert.length > 0) {
    await insertOptions(optionsToInsert);
  }

  broadcastDashboardUpdate();
  res.status(201).json({ ...withoutPinHash(newEvent), creatorToken });
});

// Xác thực PIN sự kiện
router.post('/:id/verify-pin', (req: Request, res: Response) => {
  const { id } = req.params;
  const { pin } = req.body;
  if (!pin || !/^\d{6}$/.test(String(pin))) {
    return res.status(400).json({ valid: false, message: 'PIN phải là 6 chữ số!' });
  }
  const db = readDB();
  const event = db.events.find((e) => e.id === id);
  if (!event)
    return res.status(404).json({ valid: false, message: 'Không tìm thấy kèo nhậu này!' });
  if (!event.partyPinHash) {
    return res.json({ valid: true, pinToken: generatePinToken(id) });
  }
  if (hashPin(String(pin)) === event.partyPinHash) {
    return res.json({ valid: true, pinToken: generatePinToken(id) });
  }
  res.json({ valid: false });
});

// Xóa kèo nhậu
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { creatorToken, userId } = req.body;

  const db = readDB();
  const eventIndex = db.events.findIndex((e) => e.id === id);
  if (eventIndex === -1) return res.status(404).json({ message: 'Không tìm thấy kèo nhậu này!' });

  const event = db.events[eventIndex];
  const authorized = event.creatorToken
    ? event.creatorToken === creatorToken
    : event.creatorId === userId;

  if (!authorized) return res.status(403).json({ message: 'Bạn không có quyền xóa kèo nhậu này!' });

  // 1. Cập nhật cache cục bộ
  db.events.splice(eventIndex, 1);
  db.options = db.options.filter((o) => o.eventId !== id);
  db.votes = db.votes.filter((v) => v.eventId !== id);
  db.comments = db.comments.filter((c) => c.eventId !== id);

  // 2. Xóa dữ liệu vĩnh viễn
  if (supabase) {
    // Nhờ ON DELETE CASCADE ở Foreign Keys, chỉ cần xóa event id là Supabase tự động cascade xóa các options, votes, comments liên quan!
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) console.error('❌ Lỗi xóa event trên Supabase:', error.message);
  } else {
    // Chế độ local file: ghi đè lại cache mới
    writeDB(db); // Gọi hàm tương thích ngược của local file
  }

  broadcastEventDeleted(id);
  broadcastDashboardUpdate();
  res.json({ message: 'Kèo nhậu đã được xóa!' });
});

// Cần export writeDB từ store để phục vụ việc lưu của chế độ local file
import { writeDB } from '../db/store.js';

export default router;
