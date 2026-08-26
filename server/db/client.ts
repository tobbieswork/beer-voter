/* global process */
import { createClient } from '@supabase/supabase-js';
import { WebSocket } from 'ws';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Chỉ khởi tạo Supabase Client nếu cấu hình đầy đủ biến môi trường
export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false, // Chạy phía server không cần lưu session
        },
        realtime: {
          transport: WebSocket as never,
        },
      })
    : null;

if (supabase) {
  console.log('📡 Đã kết nối thành công với Supabase Client SDK.');
} else {
  console.log('🔌 Không tìm thấy biến môi trường Supabase. Chạy ở chế độ local offline.');
}
