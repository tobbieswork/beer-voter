import { supabase } from './client.js';
import { toDbEvent, toDbOption, toDbVote, toDbComment, toDbGuest } from './store.js';
import { DatabaseSchema } from './types.js';

export async function runMigration(): Promise<void> {
  if (!supabase) return;

  try {
    // 1. Kiểm tra xem bảng cũ beer_voter_data và bản ghi JSON cũ có tồn tại không
    const { data: oldDataRow, error: oldDataError } = await supabase
      .from('beer_voter_data')
      .select('value')
      .eq('key', 'main_db')
      .maybeSingle();

    if (oldDataError) {
      // Nếu bảng cũ không tồn tại hoặc lỗi, bỏ qua không chạy migration
      return;
    }

    if (!oldDataRow || !oldDataRow.value) {
      // Không tìm thấy dữ liệu cũ chính thức nào, bỏ qua
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
      // Bảng mới đã có dữ liệu rồi, bỏ qua không migrate nữa
      return;
    }

    console.log(
      '🔄 Phát hiện dữ liệu cũ (JSON Blob). Bắt đầu quá trình di cư tự động sang cơ sở dữ liệu quan hệ...'
    );

    const oldSchema = oldDataRow.value as DatabaseSchema;

    // 3. Tiến hành chèn dữ liệu theo thứ tự quan hệ (events -> options -> votes / comments)

    // 3.1 Migrate Guests
    if (oldSchema.guests && oldSchema.guests.length > 0) {
      console.log(`👤 Đang di cư ${oldSchema.guests.length} tài khoản khách...`);
      const { error: guestErr } = await supabase
        .from('guests')
        .insert(oldSchema.guests.map(toDbGuest));
      if (guestErr) throw new Error(`Lỗi di cư guests: ${guestErr.message}`);
    }

    // 3.2 Migrate Events
    if (oldSchema.events && oldSchema.events.length > 0) {
      console.log(`📅 Đang di cư ${oldSchema.events.length} kèo nhậu...`);
      const { error: eventErr } = await supabase
        .from('events')
        .insert(oldSchema.events.map(toDbEvent));
      if (eventErr) throw new Error(`Lỗi di cư events: ${eventErr.message}`);
    }

    // 3.3 Migrate Options
    if (oldSchema.options && oldSchema.options.length > 0) {
      console.log(`📍 Đang di cư ${oldSchema.options.length} lựa chọn...`);
      const { error: optionErr } = await supabase
        .from('options')
        .insert(oldSchema.options.map(toDbOption));
      if (optionErr) throw new Error(`Lỗi di cư options: ${optionErr.message}`);
    }

    // 3.4 Migrate Votes
    if (oldSchema.votes && oldSchema.votes.length > 0) {
      console.log(`🗳️ Đang di cư ${oldSchema.votes.length} lượt bình chọn...`);
      const { error: voteErr } = await supabase.from('votes').insert(oldSchema.votes.map(toDbVote));
      if (voteErr) throw new Error(`Lỗi di cư votes: ${voteErr.message}`);
    }

    // 3.5 Migrate Comments
    if (oldSchema.comments && oldSchema.comments.length > 0) {
      console.log(`💬 Đang di cư ${oldSchema.comments.length} bình luận...`);
      const { error: commentErr } = await supabase
        .from('comments')
        .insert(oldSchema.comments.map(toDbComment));
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Lỗi nghiêm trọng trong quá trình di cư dữ liệu:', errMsg);
  }
}
