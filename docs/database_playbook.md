# 📘 Cẩm Nang Vận Hành & Phát Triển Database (Supabase & Render)

Tài liệu này ghi lại kiến trúc database của dự án **Beer Voter**, hướng dẫn cài đặt/debug, và các quy tắc đặc biệt quan trọng cần tuân thủ khi thay đổi cấu trúc dữ liệu để tránh làm hỏng hoặc mất dữ liệu cũ của người dùng.

---

## 1. ⚙️ Tổng Quan Kiến Trúc Database

Ứng dụng sử dụng kiến trúc **Dual-Mode Database (Cơ sở dữ liệu chế độ kép)** được thiết kế rất tối giản nhưng linh hoạt:

- **Chế độ Cloud (Chính thức):** Sử dụng **Supabase PostgREST API** để đọc và ghi một bản ghi duy nhất có `key = 'main_db'` trên bảng `beer_voter_data`. Toàn bộ dữ liệu của ứng dụng (kèo, bình chọn, bình luận, tài khoản khách) được đóng gói dưới dạng **một đối tượng JSON duy nhất** (`DatabaseSchema`).
- **Chế độ Local (Dự phòng):** Nếu không cấu hình biến môi trường kết nối Supabase, ứng dụng sẽ lưu trữ dữ liệu vào file local `server/db.json` trên ổ đĩa của server.
- **Cơ chế Cache:** Server duy trì một bản cache trong bộ nhớ (`cacheDB`) để phục vụ các yêu cầu tức thời của WebSocket và REST API với độ trễ thấp nhất. Các thao tác ghi sẽ cập nhật cache trước, sau đó đồng bộ bất đồng bộ (`syncDB()`) xuống Supabase hoặc file local.

---

## 2. 🚀 Hướng Dẫn Cấu Hình Hệ Thống

Để đảm bảo hệ thống vận hành ổn định trên môi trường production (Render.com Free Tier) mà không bị mất dữ liệu:

### 2.1 Cấu hình phía Supabase

Tạo bảng bằng cách chạy lệnh SQL sau trong **SQL Editor** trên Supabase Dashboard:

```sql
CREATE TABLE IF NOT EXISTS public.beer_voter_data (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 2.2 Cấu hình phía Render.com

Thêm 2 biến môi trường vào mục **Environment** trên Render:

1. `SUPABASE_URL`: Đường dẫn URL dự án Supabase (`https://your-project.supabase.co`).
2. `SUPABASE_KEY`: Khóa bí mật **`service_role`** (bắt đầu bằng `eyJ...`, có quyền bypass RLS).

### 2.3 Cơ chế giữ server hoạt động (UptimeRobot)

Để tránh Render.com đưa container vào trạng thái ngủ đông (sleep) sau 15 phút không hoạt động, cấu hình một HTTP monitor trên **Uptimerobot.com** gọi vào endpoint `/api/ping` của service mỗi **5 - 10 phút**.

---

## 3. 🔍 Hướng Dẫn Kiểm Tra & Debug Nhanh

Khi gặp sự cố không thấy dữ liệu cũ, thực hiện các bước kiểm tra sau theo thứ tự:

1. **Kiểm tra Logs trên Render.com:**
   - Mở tab logs của service, tìm log khởi động của server.
   - **Lỗi:** Nếu thấy dòng `📁 Đang tải dữ liệu ban đầu từ file local db.json...` hoặc `❌ Lỗi kết nối Supabase Cloud...`, nghĩa là kết nối Supabase đang thất bại và hệ thống đang dùng tạm bộ nhớ local (dữ liệu sẽ mất khi deploy lại).
   - **Thành công:** Phải thấy dòng `✅ Đã tải thành công DB từ Supabase. Số lượng kèo: X`.

2. **Kiểm tra dữ liệu trực tiếp trên Supabase Dashboard:**
   - Vào **Table Editor** -> bảng `beer_voter_data`.
   - Đảm bảo tồn tại hàng có `key = main_db` và cột `value` chứa dữ liệu JSON đầy đủ.

3. **Lệnh test nhanh từ máy cá nhân (Terminal):**
   ```bash
   curl -i -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
        "https://YOUR_PROJECT_ID.supabase.co/rest/v1/beer_voter_data?key=eq.main_db"
   ```

---

## ⚠️ 4. HƯỚNG DẪN THAY ĐỔI CẤU TRÚC DATA (SCHEMA EVOLUTION)

> [!CAUTION]
> **RỦI RO CỰC KỲ CAO:** Vì toàn bộ cơ sở dữ liệu được lưu dưới dạng một khối JSON duy nhất, bất kỳ thay đổi nào đối với kiểu dữ liệu trong code (TypeScript Interfaces) mà không xử lý tương thích ngược đều có thể làm sập hệ thống hoặc làm mất các trường dữ liệu cũ trên giao diện của người dùng.

Để đảm bảo tính nhất quán của dữ liệu khi nâng cấp ứng dụng trong tương lai, hãy luôn tuân thủ các nguyên tắc sau:

### 4.1 Lập trình phòng thủ (Defensive Coding) khi đọc dữ liệu

Khi bạn thêm một trường mới vào các thực thể (ví dụ: thêm trường `avatar` cho `User` hoặc `category` cho `Event`), code ở Frontend và Backend khi đọc dữ liệu cũ (chưa có trường này) phải luôn sử dụng **giá trị mặc định** hoặc toán tử optional.

- **Không nên:**
  ```typescript
  const category = event.category.toLowerCase(); // Sẽ crash nếu event cũ không có trường category (undefined)
  ```
- **Nên dùng:**
  ```typescript
  const category = (event.category || 'default').toLowerCase();
  // hoặc dùng optional chaining:
  const category = event.category?.toLowerCase() || 'default';
  ```

### 4.2 Viết mã di cư dữ liệu tự động (Auto-Migration on Startup)

Khi thực hiện các thay đổi cấu trúc dữ liệu lớn (như thay đổi kiểu dữ liệu của một trường từ `string` sang `array`, hoặc cấu trúc lại quan hệ), hãy viết các hàm tự động kiểm tra và nâng cấp dữ liệu ngay trong quá trình khởi tạo database ở hàm `initDB()` (`server/index.ts`).

**Mẫu code thực hiện Migration trong `initDB`:**

```typescript
// Ví dụ: Di cư dữ liệu khi thay đổi cấu trúc Event
function migrateDatabaseSchema(data: DatabaseSchema): DatabaseSchema {
  let hasChanges = false;

  // 1. Duyệt qua tất cả các event và cập nhật nếu thiếu trường mới
  data.events = data.events.map((event) => {
    if (event.status === undefined) {
      event.status = 'voting'; // Điền giá trị mặc định cho dữ liệu cũ
      hasChanges = true;
    }
    return event;
  });

  // 2. Nếu có thay đổi, ghi nhận và log lại
  if (hasChanges) {
    console.log(
      '🔄 [Migration] Đã tự động nâng cấp cấu trúc dữ liệu cũ lên phiên bản mới thành công!'
    );
  }

  return data;
}

// Trong initDB(), sau khi fetch dữ liệu từ Supabase thành công:
cacheDB = migrateDatabaseSchema(data[0].value as DatabaseSchema);
if (hasChanges) {
  await syncDB(); // Lưu ngay bản đã nâng cấp ngược lại Supabase
}
```

### 4.3 Quy trình triển khai an toàn (Safe Deployment Flow)

Khi chuẩn bị deploy một phiên bản mới có thay đổi cấu trúc database:

1. **Backup dữ liệu hiện tại:**
   - Truy cập Supabase Dashboard -> Bảng `beer_voter_data` -> Chọn dòng `main_db` -> Sao chép nội dung cột `value` ra một file text an toàn trên máy của bạn (`backup.json`).
2. **Chạy thử nghiệm môi trường Local:**
   - Cấu hình biến môi trường cục bộ để kết nối tới một dự án Supabase Test hoặc sử dụng file local `db.json` chứa dữ liệu mẫu thực tế của người dùng để chạy thử phiên bản mới.
3. **Kiểm tra tính tương thích:**
   - Đảm bảo phiên bản mới có thể đọc trơn tru dữ liệu cũ mà không gây lỗi runtime trên console hoặc crash server.
4. **Deploy production:**
   - Sau khi kiểm tra kỹ lưỡng, tiến hành deploy lên Render.com. Giám sát log khởi động để đảm bảo các bước Migration (nếu có) diễn ra thành công.
