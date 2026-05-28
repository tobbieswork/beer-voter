# 🍻 BeerVote - Kèo Nhậu Tới Bến 🚀

**BeerVote** là một ứng dụng Web Fullstack tuyệt đẹp và chuyên nghiệp được thiết kế theo phong cách **Glassmorphism Pub** ấm cúng, giúp bạn và nhóm bạn bè dễ dàng lên lịch trình, bình chọn địa điểm, loại bia và thống nhất các buổi đi nhậu cùng nhau theo thời gian thực (Real-time WebSockets).

---

## ✨ Các Tính Năng Nổi Bật

1. **Giao Diện Chill Pub & Craft Beer**: Tone màu Amber/Gold sủi bọt, dark mode sâu thẳm, các hiệu ứng bong bóng bia bay lên mượt mà sinh động.
2. **Tham Gia Nhanh Không Cần Đăng Ký**: Bạn bè khi nhận link chia sẻ chỉ cần nhập biệt danh hài hước (ví dụ: _Chiến Thần Diệt Mồi, Beer Thủ Vô Song_) là tham gia sòng nhậu ngay lập tức.
3. **Đồng Bộ Thời Gian Thực (Live WebSockets)**: Mọi thao tác Vote, đề xuất quán ngon mới hay nhắn tin chat chit sẽ tự động cập nhật ngay trên màn hình của tất cả mọi người trong vài mili-giây mà không cần F5.
4. **Quyền Năng "Chốt Kèo" Cho Admin**: Chủ sòng nhậu (Admin) bấm chốt kèo sẽ tự động đóng băng dữ liệu, khóa vote và kích hoạt đồng hồ **Countdown** đếm ngược vui nhộn nhắc nhở anh em không đến trễ.
5. **Unified Production Server**: Dễ dàng phục vụ cả API, Static Files và WebSockets trên duy nhất một cổng `3001` giúp chia sẻ từ xa qua mạng LAN hoặc Internet cực kỳ dễ dàng.

---

## 💻 Cách Khởi Chạy Ứng Dụng

### Bước 1: Khởi động hệ thống phát triển (Development)

Để chạy thử nghiệm nhanh trên máy tính cá nhân của bạn, hãy mở terminal tại thư mục dự án và chạy:

```bash
npm run dev
```

Lệnh này sử dụng `concurrently` để chạy song song:

- **Frontend (React)** tại: `http://localhost:5173`
- **Backend & WebSockets (Express)** tại: `http://localhost:3001`

_(Trình duyệt của bạn sẽ tự động kết nối API & WebSockets chéo cổng nhờ cấu hình proxy trong `vite.config.js`)_

---

## 📱 Cách Chia Sẻ Cho Bạn Bè Bình Chọn Trên Điện Thoại Riêng (Thực Tế)

Để bạn bè của bạn có thể sử dụng điện thoại hoặc máy tính cá nhân của họ truy cập từ xa và bình chọn thực sự, chúng ta sẽ sử dụng kiến trúc **Unified Server**. Hãy làm theo 2 cách dưới đây:

### Cách 1: Chia sẻ trong cùng mạng Wifi nội bộ (Mạng LAN)

Phù hợp khi nhóm bạn đang tụ tập chung một nhà hoặc văn phòng làm việc:

1. **Build dự án**:
   ```bash
   npm run build
   ```
2. **Khởi động Unified Server**:
   ```bash
   npm run server
   ```
3. **Lấy địa chỉ IP máy tính của bạn**:
   - Trên macOS: Mở _System Settings -> Wi-Fi -> Details_ hoặc gõ `ipconfig getifaddr en0` trong Terminal. Ví dụ IP của bạn là `192.168.1.15`.
4. **Gửi link cho bạn bè**:
   - Gửi link: `http://192.168.1.15:3001` qua Zalo/Messenger.
   - Bạn bè dùng điện thoại click vào là có thể tham gia vote và chat real-time lập tức!

---

### Cách 2: Chia sẻ qua Internet từ xa (Mọi lúc, mọi nơi)

Phù hợp khi bạn bè đang ở nhà riêng, ở xa và cần lên kế hoạch nhậu cho cuối tuần:

1. **Build dự án**:
   ```bash
   npm run build
   ```
2. **Khởi động Unified Server**:
   ```bash
   npm run server
   ```
3. **Mở một tab terminal mới và tạo đường hầm Internet miễn phí**:
   Chúng ta sử dụng `localtunnel` (công cụexpose cổng local ra Internet công cộng không cần cài đặt):
   ```bash
   npx localtunnel --port 3001
   ```
4. **Lấy link công cộng**:
   Terminal sẽ sinh ra một đường link công cộng an toàn dạng:
   `https://beervote-sieu-cap.localtunnel.me`
5. **Gửi link chia sẻ**:
   - Gửi link công cộng này cho bạn bè.
   - Bạn bè ở bất kỳ đâu trên thế giới chỉ cần click vào link là có thể truy cập sòng nhậu BeerVote trên điện thoại di động cá nhân và đồng bộ real-time 100%!

---

## 📂 Cơ Cấu Dữ Liệu (`server/db.json`)

Dữ liệu sòng nhậu được lưu trữ tập trung trên đĩa dưới định dạng file JSON dễ quản lý:

- `events`: Thông tin kèo nhậu (Tên kèo, người tạo, trạng thái, lịch chốt).
- `options`: Các đề xuất Ngày/Giờ, Địa điểm, Loại bia.
- `votes`: Bình chọn của từng thành viên cho các lựa chọn.
- `comments`: Phòng chat thảo luận náo nhiệt của anh em.

---

## 🍻 Chúc Bạn Có Những Buổi Nhậu Vui Vẻ, Tới Bến Cùng Chiến Hữu! 🍻

_BeerVote - Kết nối chiến hữu, cạn ly rực rỡ!_
