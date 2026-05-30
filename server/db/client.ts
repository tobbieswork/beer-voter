/* global process */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Chỉ khởi tạo Supabase Client nếu cấu hình đầy đủ biến môi trường
export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false, // Chạy phía server không cần lưu session
        },
      })
    : null;

if (supabase) {
  console.log('📡 Đã kết nối thành công với Supabase Client SDK.');
} else {
  console.log('🔌 Không tìm thấy biến môi trường Supabase. Chạy ở chế độ local offline.');
}
