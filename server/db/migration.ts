import { supabase } from './client.js';
import {
  readDB,
  writeDB,
  toDbEvent,
  toDbOption,
  toDbVote,
  toDbComment,
  toDbUser,
  RowEvent,
  RowOption,
  RowVote,
  RowComment,
  RowUser,
} from './store.js';
import { DatabaseSchema, DBUser, DBEvent, DBOption, DBVote, DBComment } from './types.js';

interface LegacyDBGuest {
  id: string;
  nickname: string;
  realName?: string;
  username?: string;
  avatar?: string;
  createdAt: string;
  passwordHash?: string;
}

interface LegacySchema {
  guests?: LegacyDBGuest[];
  events?: DBEvent[];
  options?: DBOption[];
  votes?: DBVote[];
  comments?: DBComment[];
}

export async function runMigration(): Promise<void> {
  if (!supabase) return;

  try {
    const db = readDB();
    if (!db.users) db.users = [];

    const legacyDb = db as unknown as LegacySchema;

    if (legacyDb.guests && legacyDb.guests.length > 0) {
      console.log(`Migrating ${legacyDb.guests.length} legacy guests...`);

      const usersSet = new Set(db.users.map((u) => u.id));
      legacyDb.guests.forEach((g: LegacyDBGuest) => {
        if (!usersSet.has(g.id)) {
          db.users!.push({
            id: g.id,
            nickname: g.nickname,
            realName: g.realName || '',
            username: g.username || '',
            avatar: g.avatar,
            createdAt: g.createdAt,
            authMethod: 'guest',
          });
          usersSet.add(g.id);
        }
      });

      delete legacyDb.guests;
      writeDB(db);
      console.log('✅ Local guests migrated successfully.');
    }

    // 1. Kiểm tra xem bảng cũ beer_voter_data và bản ghi JSON cũ có tồn tại không
    const { data: oldDataRow, error: oldDataError } = await supabase
      .from('beer_voter_data')
      .select('value')
      .eq('key', 'main_db')
      .maybeSingle();

    if (oldDataError || !oldDataRow || !oldDataRow.value) {
      return;
    }

    // 2. Kiểm tra xem bảng mới đã có dữ liệu chưa để tránh ghi đè / trùng lặp
    const { count: newEventsCount, error: newEventsError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });

    if (newEventsError) {
      console.warn(
        '⚠️ Không thể kiểm tra bảng mới, có thể các bảng mới chưa được tạo trên Supabase.'
      );
      return;
    }

    if (newEventsCount && newEventsCount > 0) {
      return;
    }

    console.log(
      '🔄 Phát hiện dữ liệu cũ (JSON Blob). Bắt đầu quá trình di cư tự động sang cơ sở dữ liệu quan hệ...'
    );
    const oldSchema = oldDataRow.value as unknown as LegacySchema;

    // 3. Tiến hành chèn dữ liệu theo thứ tự quan hệ (events -> options -> votes / comments)

    // 3.1 Migrate Guests to Users
    if (oldSchema.guests && oldSchema.guests.length > 0) {
      console.log(`👤 Đang di cư ${oldSchema.guests.length} tài khoản khách sang users...`);
      const usersToInsert = oldSchema.guests.map((g: LegacyDBGuest) =>
        toDbUser({
          id: g.id,
          authMethod: 'guest',
          username: g.username || '',
          nickname: g.nickname,
          realName: g.realName || '',
          passwordHash: g.passwordHash,
          createdAt: g.createdAt,
        })
      );
      const { error: guestErr } = await supabase.from('users').insert(usersToInsert);
      if (guestErr) throw new Error(`Lỗi di cư users: ${guestErr.message}`);
    }

    // 3.2 Migrate Events
    if (oldSchema.events && oldSchema.events.length > 0) {
      console.log(`📅 Đang di cư ${oldSchema.events.length} kèo nhậu...`);
      const { error: eventErr } = await supabase
        .from('events')
        .insert(oldSchema.events.map((e: DBEvent) => toDbEvent(e)));
      if (eventErr) throw new Error(`Lỗi di cư events: ${eventErr.message}`);
    }

    // 3.3 Migrate Options
    if (oldSchema.options && oldSchema.options.length > 0) {
      console.log(`📍 Đang di cư ${oldSchema.options.length} lựa chọn...`);
      const { error: optionErr } = await supabase
        .from('options')
        .insert(oldSchema.options.map((o: DBOption) => toDbOption(o)));
      if (optionErr) throw new Error(`Lỗi di cư options: ${optionErr.message}`);
    }

    // 3.4 Migrate Votes
    if (oldSchema.votes && oldSchema.votes.length > 0) {
      console.log(`🗳️ Đang di cư ${oldSchema.votes.length} lượt bình chọn...`);
      const { error: voteErr } = await supabase
        .from('votes')
        .insert(oldSchema.votes.map((v: DBVote) => toDbVote(v)));
      if (voteErr) throw new Error(`Lỗi di cư votes: ${voteErr.message}`);
    }

    // 3.5 Migrate Comments
    if (oldSchema.comments && oldSchema.comments.length > 0) {
      console.log(`💬 Đang di cư ${oldSchema.comments.length} bình luận...`);
      const { error: commentErr } = await supabase
        .from('comments')
        .insert(oldSchema.comments.map((c: DBComment) => toDbComment(c)));
      if (commentErr) throw new Error(`Lỗi di cư comments: ${commentErr.message}`);
    }

    // 4. Di cư hoàn tất! Đổi tên key của bản ghi cũ để không chạy lại lần sau
    const { error: updateOldKeyErr } = await supabase
      .from('beer_voter_data')
      .update({ key: 'main_db_migrated' })
      .eq('key', 'main_db');

    if (updateOldKeyErr) {
      console.warn('⚠️ Di cư thành công nhưng không thể đổi tên key cũ:', updateOldKeyErr.message);
    } else {
      console.log('✅ Di cư dữ liệu cũ thành công rực rỡ và đã dọn dẹp khóa chính cũ!');
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('❌ Lỗi di cư dữ liệu:', error.message);
    } else {
      console.error('❌ Lỗi di cư dữ liệu không xác định:', error);
    }
  }
}
