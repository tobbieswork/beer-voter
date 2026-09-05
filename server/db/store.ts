import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomUUID } from 'crypto';
import { supabase } from './client.js';
import { DBEvent, DBOption, DBVote, DBComment, DBUser, DatabaseSchema } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'db.json');

// Cache dữ liệu trong bộ nhớ
export let cacheDB: DatabaseSchema = {
  events: [],
  options: [],
  votes: [],
  comments: [],
  users: [],
};
let _isLoaded = false;

// Bộ lưu trữ mã PIN dùng trong WebSocket/APIs
const pinTokens = new Map<string, { eventId: string; expiresAt: number }>();
const PIN_TOKEN_TTL = 24 * 60 * 60 * 1000;

// ================= BỘ CHUYỂN ĐỔI KIỂU DỮ LIỆU (Mappers) =================

export interface RowEvent {
  id: string;
  title: string;
  creator_id: string;
  creator_name: string;
  creator_nickname?: string | null;
  creator_real_name?: string | null;
  creator_username?: string | null;
  creator_token?: string | null;
  party_pin?: string | null;
  party_pin_hash?: string | null;
  status: string;
  created_at: string;
  locked_at?: string | null;
  final_date_time?: string | null;
  final_location?: string | null;
  final_beer_style?: string | null;
}

export interface RowOption {
  id: string;
  event_id: string;
  type: string;
  value: string;
  creator_id: string;
  creator_name: string;
  creator_nickname?: string | null;
  creator_real_name?: string | null;
  creator_username?: string | null;
  created_at: string;
}

export interface RowVote {
  id: string;
  event_id: string;
  option_id: string;
  user_id: string;
  user_name: string;
  user_nickname?: string | null;
  user_real_name?: string | null;
  user_email?: string | null;
  created_at: string;
}

export interface RowComment {
  id: string;
  event_id: string;
  user_id: string;
  user_name: string;
  user_role?: string | null;
  content: string;
  user_nickname?: string | null;
  user_real_name?: string | null;
  user_email?: string | null;
  created_at: string;
}

export interface RowUser {
  id: string;
  auth_method: string;
  username: string;
  nickname: string;
  real_name: string;
  password_hash?: string | null;
  google_id?: string | null;
  email?: string | null;
  avatar?: string | null;
  created_at: string;
}

export function toDbEvent(e: DBEvent) {
  return {
    id: e.id,
    title: e.title,
    creator_id: e.creatorId,
    creator_name: e.creatorName,
    creator_nickname: e.creatorNickname || null,
    creator_real_name: e.creatorRealName || null,
    creator_username: e.creatorUsername || null,
    creator_token: e.creatorToken || null,
    party_pin: e.partyPin || null,
    party_pin_hash: e.partyPinHash || null,
    status: e.status,
    created_at: e.createdAt,
    locked_at: e.lockedAt || null,
    final_date_time: e.finalDateTime || null,
    final_location: e.finalLocation || null,
    final_beer_style: e.finalBeerStyle || null,
  };
}

export function fromDbEvent(r: RowEvent): DBEvent {
  return {
    id: r.id,
    title: r.title,
    creatorId: r.creator_id,
    creatorName: r.creator_name,
    creatorNickname: r.creator_nickname || undefined,
    creatorRealName: r.creator_real_name || undefined,
    creatorUsername: r.creator_username || undefined,
    creatorToken: r.creator_token || undefined,
    partyPin: r.party_pin || undefined,
    partyPinHash: r.party_pin_hash || undefined,
    status: r.status as 'voting' | 'locked',
    createdAt: r.created_at,
    lockedAt: r.locked_at || null,
    finalDateTime: r.final_date_time || null,
    finalLocation: r.final_location || null,
    finalBeerStyle: r.final_beer_style || null,
  };
}

export function toDbOption(o: DBOption) {
  return {
    id: o.id,
    event_id: o.eventId,
    type: o.type,
    value: o.value,
    creator_id: o.creatorId,
    creator_name: o.creatorName,
    creator_nickname: o.creatorNickname || null,
    creator_real_name: o.creatorRealName || null,
    creator_username: o.creatorUsername || null,
    created_at: o.createdAt,
  };
}

export function fromDbOption(r: RowOption): DBOption {
  return {
    id: r.id,
    eventId: r.event_id,
    type: r.type as 'datetime' | 'location' | 'beer',
    value: r.value,
    creatorId: r.creator_id,
    creatorName: r.creator_name,
    creatorNickname: r.creator_nickname || undefined,
    creatorRealName: r.creator_real_name || undefined,
    creatorUsername: r.creator_username || undefined,
    createdAt: r.created_at,
  };
}

export function toDbVote(v: DBVote) {
  return {
    id: v.id,
    event_id: v.eventId,
    option_id: v.optionId,
    user_id: v.userId,
    user_name: v.userName,
    user_nickname: v.userNickname || null,
    user_real_name: v.userRealName || null,
    user_email: v.userEmail || null,
    created_at: v.createdAt,
  };
}

export function fromDbVote(r: RowVote): DBVote {
  return {
    id: r.id,
    eventId: r.event_id,
    optionId: r.option_id,
    userId: r.user_id,
    userName: r.user_name,
    userNickname: r.user_nickname || undefined,
    userRealName: r.user_real_name || undefined,
    userEmail: r.user_email || undefined,
    createdAt: r.created_at,
  };
}

export function toDbComment(c: DBComment) {
  return {
    id: c.id,
    event_id: c.eventId,
    user_id: c.userId,
    user_name: c.userName,
    user_role: c.userRole || null,
    content: c.content,
    user_nickname: c.userNickname || null,
    user_real_name: c.userRealName || null,
    user_email: c.userEmail || null,
    created_at: c.createdAt,
  };
}

export function fromDbComment(r: RowComment): DBComment {
  return {
    id: r.id,
    eventId: r.event_id,
    userId: r.user_id,
    userName: r.user_name,
    userRole: r.user_role || undefined,
    content: r.content,
    userNickname: r.user_nickname || undefined,
    userRealName: r.user_real_name || undefined,
    userEmail: r.user_email || undefined,
    createdAt: r.created_at,
  };
}

export function toDbUser(u: DBUser) {
  return {
    id: u.id,
    auth_method: u.authMethod,
    username: u.username,
    nickname: u.nickname,
    real_name: u.realName,
    password_hash: u.passwordHash || null,
    google_id: u.googleId || null,
    email: u.email || null,
    avatar: u.avatar || null,
    created_at: u.createdAt,
  };
}

export function fromDbUser(r: RowUser): DBUser {
  return {
    id: r.id,
    authMethod: r.auth_method as 'guest' | 'google',
    username: r.username,
    nickname: r.nickname,
    realName: r.real_name,
    passwordHash: r.password_hash || undefined,
    googleId: r.google_id || undefined,
    email: r.email || undefined,
    avatar: r.avatar || undefined,
    createdAt: r.created_at,
  };
}

// ================= ĐỒNG BỘ LOCAL FILE =================

function saveLocalDB(): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(cacheDB, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Lỗi đồng bộ dữ liệu xuống local JSON:', err);
  }
}

// ================= HÀM KHỞI TẠO VÀ DI CƯ =================

import { runMigration } from './migration.js';

export async function initDB() {
  if (supabase) {
    console.log('🌐 Đang tải dữ liệu quan hệ từ Supabase Cloud DB...');
    try {
      // 1. Chạy thử quy trình di cư dữ liệu từ bảng JSON cũ sang bảng quan hệ mới
      await runMigration();

      // 2. Lấy dữ liệu quan hệ mới
      const [eventsRes, optionsRes, votesRes, commentsRes, usersRes] = await Promise.all([
        supabase.from('events').select('*'),
        supabase.from('options').select('*'),
        supabase.from('votes').select('*'),
        supabase.from('comments').select('*'),
        supabase.from('users').select('*'),
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (optionsRes.error) throw optionsRes.error;
      if (votesRes.error) throw votesRes.error;
      if (commentsRes.error) throw commentsRes.error;
      if (usersRes.error) throw usersRes.error;

      cacheDB.events = (eventsRes.data || []).map(fromDbEvent);
      cacheDB.options = (optionsRes.data || []).map(fromDbOption);
      cacheDB.votes = (votesRes.data || []).map(fromDbVote);
      cacheDB.comments = (commentsRes.data || []).map(fromDbComment);
      cacheDB.users = (usersRes.data || []).map(fromDbUser);

      console.log(
        `✅ Đồng bộ thành công từ Supabase. Kèo: ${cacheDB.events.length}, Votes: ${cacheDB.votes.length}`
      );
      _isLoaded = true;
      return;
    } catch (e) {
      console.error(
        '❌ Lỗi tải dữ liệu Supabase, tự động chuyển về Local File Fallback. Chi tiết:',
        e
      );
    }
  }

  console.log('📁 Đang tải dữ liệu ban đầu từ file local db.json...');
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(cacheDB, null, 2), 'utf8');
    } else {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      cacheDB = JSON.parse(data) as DatabaseSchema;
      if (!cacheDB.users) cacheDB.users = [];
    }
    console.log(`✅ Đã tải thành công DB từ file local. Số lượng kèo: ${cacheDB.events.length}`);
  } catch (error) {
    console.error('❌ Lỗi đọc database file JSON:', error);
  }
  _isLoaded = true;
}

// ================= HÀM TIỆN ÍCH READ & WRITE CƠ BẢN =================

export function readDB(): DatabaseSchema {
  return cacheDB;
}

// Giữ lại hàm tương thích ngược
export function writeDB(data: DatabaseSchema): void {
  cacheDB = data;
  if (!supabase) {
    saveLocalDB();
  }
}

// ================= HÀM MUTATIONS CHUYÊN DỤNG (Relational CRUD) =================

export async function insertEvent(event: DBEvent): Promise<void> {
  cacheDB.events.push(event);
  if (supabase) {
    const { error } = await supabase.from('events').insert(toDbEvent(event));
    if (error) console.error('❌ Lỗi insert event lên Supabase:', error.message);
  } else {
    saveLocalDB();
  }
}

export async function insertOptions(options: DBOption[]): Promise<void> {
  cacheDB.options.push(...options);
  if (supabase) {
    const { error } = await supabase.from('options').insert(options.map(toDbOption));
    if (error) console.error('❌ Lỗi insert options lên Supabase:', error.message);
  } else {
    saveLocalDB();
  }
}

export async function insertOption(option: DBOption): Promise<void> {
  cacheDB.options.push(option);
  if (supabase) {
    const { error } = await supabase.from('options').insert(toDbOption(option));
    if (error) console.error('❌ Lỗi insert option lên Supabase:', error.message);
  } else {
    saveLocalDB();
  }
}

export async function insertVote(vote: DBVote): Promise<void> {
  cacheDB.votes.push(vote);
  if (supabase) {
    const { error } = await supabase.from('votes').insert(toDbVote(vote));
    if (error) console.error('❌ Lỗi insert vote lên Supabase:', error.message);
  } else {
    saveLocalDB();
  }
}

export async function deleteVote(voteId: string): Promise<void> {
  cacheDB.votes = cacheDB.votes.filter((v) => v.id !== voteId);
  if (supabase) {
    const { error } = await supabase.from('votes').delete().eq('id', voteId);
    if (error) console.error('❌ Lỗi delete vote trên Supabase:', error.message);
  } else {
    saveLocalDB();
  }
}

export async function insertComment(comment: DBComment): Promise<void> {
  cacheDB.comments.push(comment);
  if (supabase) {
    const { error } = await supabase.from('comments').insert(toDbComment(comment));
    if (error) console.error('❌ Lỗi insert comment lên Supabase:', error.message);
  } else {
    saveLocalDB();
  }
}

export async function insertUser(user: DBUser): Promise<void> {
  if (!cacheDB.users) cacheDB.users = [];
  cacheDB.users.push(user);
  if (supabase) {
    const { error } = await supabase.from('users').insert(toDbUser(user));
    if (error) console.error('❌ Lỗi insert user lên Supabase:', error.message);
  } else {
    saveLocalDB();
  }
}

export async function updateUser(userId: string, fields: Partial<DBUser>): Promise<void> {
  if (!cacheDB.users) cacheDB.users = [];
  const index = cacheDB.users.findIndex((u) => u.id === userId);
  if (index !== -1) {
    cacheDB.users[index] = { ...cacheDB.users[index], ...fields };
  } else {
    cacheDB.users.push(fields as DBUser);
  }

  if (supabase) {
    const dbUser = toDbUser(cacheDB.users.find((u) => u.id === userId) || (fields as DBUser));
    const { error } = await supabase.from('users').upsert(dbUser);
    if (error) console.error('❌ Lỗi upsert user lên Supabase:', error.message);
  } else {
    saveLocalDB();
  }
}

export async function updateEventStatus(
  eventId: string,
  fields: Partial<
    Pick<DBEvent, 'status' | 'lockedAt' | 'finalDateTime' | 'finalLocation' | 'finalBeerStyle'>
  >
): Promise<void> {
  cacheDB.events = cacheDB.events.map((e) => {
    if (e.id === eventId) {
      return { ...e, ...fields };
    }
    return e;
  });

  if (supabase) {
    const updateData: Partial<RowEvent> = {};
    if (fields.status !== undefined) updateData.status = fields.status;
    if (fields.lockedAt !== undefined) updateData.locked_at = fields.lockedAt;
    if (fields.finalDateTime !== undefined) updateData.final_date_time = fields.finalDateTime;
    if (fields.finalLocation !== undefined) updateData.final_location = fields.finalLocation;
    if (fields.finalBeerStyle !== undefined) updateData.final_beer_style = fields.finalBeerStyle;

    const { error } = await supabase.from('events').update(updateData).eq('id', eventId);
    if (error) console.error('❌ Lỗi update event status lên Supabase:', error.message);
  } else {
    saveLocalDB();
  }
}

// ================= TIỆN ÍCH DỮ LIỆU KÈO & MÃ PIN =================

export function sanitizeEvent(
  event: DBEvent
): Omit<DBEvent, 'creatorToken' | 'partyPinHash'> & { hasPin: boolean } {
  const { creatorToken: _t, partyPinHash: _p, ...rest } = event;
  return { ...rest, hasPin: !!event.partyPinHash };
}

export function withoutPinHash(event: DBEvent): Omit<DBEvent, 'partyPinHash'> {
  const { partyPinHash: _p, ...rest } = event;
  return rest;
}

export function hashPin(pin: string): string {
  return createHash('sha256').update(String(pin)).digest('hex');
}

export function generatePinToken(eventId: string): string {
  const token = randomUUID();
  pinTokens.set(token, { eventId, expiresAt: Date.now() + PIN_TOKEN_TTL });
  return token;
}

export function checkPinToken(
  pinToken: string | undefined
): { eventId: string; isValid: boolean } | null {
  if (!pinToken || pinToken.length < 1) return null;
  const entry = pinTokens.get(pinToken);
  if (!entry || Date.now() > entry.expiresAt) {
    pinTokens.delete(pinToken);
    return null;
  }
  return { eventId: entry.eventId, isValid: true };
}

export function isPinAuthorized(event: DBEvent | undefined, pinToken: string | undefined): boolean {
  if (!event || !event.partyPinHash) return true;
  if (!pinToken) return false;
  const check = checkPinToken(pinToken);
  return check !== null && check.eventId === event.id;
}

export function getEventDetail(db: DatabaseSchema, eventId: string) {
  const event = db.events.find((e) => e.id === eventId);
  if (!event) return null;
  return {
    ...sanitizeEvent(event),
    options: db.options.filter((o) => o.eventId === eventId),
    votes: db.votes.filter((v) => v.eventId === eventId),
    comments: db.comments.filter((c) => c.eventId === eventId),
  };
}
