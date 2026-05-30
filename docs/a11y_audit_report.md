# Báo Cáo Kiểm Tra Khả Năng Tiếp Cận (Accessibility Audit Report) - BeerVote 🍻

Chúng tôi đã thực hiện một đợt rà soát và đánh giá khả năng tiếp cận (Accessibility - a11y) toàn diện trên ứng dụng **BeerVote** dựa theo tiêu chuẩn **WCAG 2.1 AA** và các thực hành lập trình giao diện hiện đại. Dưới đây là kết quả chi tiết, các điểm nghẽn nghiêm trọng và phương án khắc phục nhằm nâng cao trải nghiệm cho mọi người dùng (kể cả những người sử dụng trình đọc màn hình - screen reader).

---

## 1. Tóm tắt kết quả (Audit Summary)

- **Tình trạng chung**: Khá tốt về mặt giao diện trực quan và trải nghiệm người dùng phổ thông. Độ tương phản màu sắc của chủ đề Amber/Gold Glassmorphism đạt yêu cầu thẩm mỹ cao.
- **Điểm cần khắc phục**: Phát hiện một số lỗi nghiêm trọng về ngữ nghĩa học (HTML Semantics), quản lý Focus trên Modal, và nhãn điều hướng bị thiếu (Missing Labels).
- **Mức độ tác động**:
  - 🔴 **Nghiêm trọng (High)**: 2 vấn đề ảnh hưởng trực tiếp đến người dùng dùng bàn phím hoặc Screen Reader.
  - 🟡 **Trung bình (Medium)**: 2 vấn đề ảnh hưởng đến độ tin cậy của mã nguồn và tính chính xác khi hiển thị.

---

## 2. Chi tiết các vấn đề phát hiện & Giải pháp khắc phục

### 🔴 Vấn đề 1: Lỗi ngữ nghĩa phần tử tương tác (Interactive Semantics Violation)

- **Mô tả**:
  - Trong `CreateEvent.tsx`, các nút thêm trường đề xuất mới (`➕ Thêm Lịch Khác`, `➕ Thêm Địa Điểm Khác`, `➕ Thêm Loại Bia Khác`) được triển khai bằng thẻ `<span>` với sự kiện `onClick`.
  - Trong `EventDetail.tsx` (dòng 470), nút `⬅️ Quay lại danh sách kèo` cũng được triển khai bằng thẻ `<span>`.
- **Hậu quả**:
  - Người dùng sử dụng bàn phím để di chuyển bằng nút `Tab` sẽ **hoàn toàn bỏ qua** các phần tử này do thẻ `<span>` mặc định không thể nhận focus (`tabindex`).
  - Trình đọc màn hình không thể nhận dạng đây là các nút bấm có thể kích hoạt được do thiếu thuộc tính ngữ nghĩa (`role="button"`).
- **Giải pháp**:
  - Chuyển đổi các thẻ `<span>` này thành thẻ `<button type="button">`.
  - Hoặc bổ sung `role="button"`, `tabIndex={0}` cùng với bộ xử lý sự kiện khi ấn phím `Enter` hay `Space`. Tuy nhiên, dùng thẻ `<button>` bản địa luôn là thực hành tối ưu nhất.

---

### 🔴 Vấn đề 2: Thiếu nhãn cho các ô nhập mã PIN (Missing Labels on Multi-input Form)

- **Mô tả**:
  - Trong `PartyPinModal.tsx`, sáu ô nhập chữ số mật mã (PIN) được hiển thị dạng một dãy ô số độc lập. Các thẻ `<input>` này hoàn toàn không có thuộc tính `aria-label`, `<label>` liên kết hay `aria-labelledby`.
- **Hậu quả**:
  - Khi người dùng khiếm thị điều hướng qua dãy ô số này, trình đọc màn hình sẽ chỉ thông báo chung chung là "Text edit" mà không cung cấp ngữ cảnh rằng đây là ô số thứ mấy trong chuỗi mã PIN 6 chữ số.
- **Giải pháp**:
  - Thêm thuộc tính `aria-label={`Số thứ ${i + 1} của mã PIN`}` vào từng thẻ `<input>` tương ứng trong hàm `.map()` để người dùng biết chính xác họ đang nhập vào vị trí nào.

---

### 🟡 Vấn đề 3: Thiếu các thuộc tính hộp thoại chuẩn trên các Modal (Missing Modal ARIA Roles)

- **Mô tả**:
  - Cả `GuestJoinModal.tsx` và `PartyPinModal.tsx` đều là các hộp thoại dạng Overlay (Modal) nhưng các thẻ bao ngoài (`modal-overlay` và `modal-pub`) thiếu thuộc tính chỉ định hộp thoại.
- **Hậu quả**:
  - Người dùng thiết bị hỗ trợ không biết rằng một cửa sổ tương tác phụ (Modal/Dialog) vừa được mở và cấu trúc cây tiếp cận (Accessibility Tree) vẫn hiển thị toàn bộ nội dung nền phía sau, gây rối loạn tiêu điểm (Focus Trap) khi bấm Tab.
- **Giải pháp**:
  - Thêm `role="dialog"` và `aria-modal="true"` vào thẻ `.modal-pub`.
  - Bổ sung thuộc tính `aria-labelledby="modal-title-id"` trỏ đến thẻ tiêu đề `<h3>` của Modal để trình đọc tự động đọc to tên Modal khi vừa mở ra.

---

### 🟡 Vấn đề 4: Lỗi cú pháp class khiến giao diện bị mất định dạng (Class Naming / Styling Bug)

- **Mô tả**:
  - Trong `Header.tsx` (dòng 50), thẻ hiển thị phân quyền người dùng có cấu trúc:
    ```tsx
    className={`role-badge max-[360px]:hidden ${currentUser.authMethod === 'google' ? 'role-badge.google' : 'role-badge.guest'}`}
    ```
  - Việc xuất ra chuỗi class chứa dấu chấm (`role-badge.google`) là sai ngữ pháp HTML. Trình duyệt sẽ tìm kiếm class mang tên `"role-badge.google"` thay vì tổ hợp class `role-badge` và `google`. Trong `App.css`, định nghĩa là `.role-badge.google`.
- **Hậu quả**:
  - Giao diện hiển thị huy hiệu người dùng dùng tài khoản Google hoặc tài khoản Khách không được áp dụng các thuộc tính màu sắc và bo viền thiết kế riêng biệt trong CSS.
- **Giải pháp**:
  - Sửa lại cú pháp render class thành:
    ```tsx
    className={`role-badge max-[360px]:hidden ${currentUser.authMethod === 'google' ? 'google' : 'guest'}`}
    ```

---

## 3. Kế hoạch triển khai khắc phục (Implementation Plan)

Chúng tôi đề xuất thực hiện các chỉnh sửa trực tiếp vào mã nguồn để giải quyết triệt để 4 vấn đề nêu trên mà không làm ảnh hưởng đến cấu trúc logic hiện tại của ứng dụng.

Chúng tôi sẽ tiến hành sửa đổi lần lượt các tệp tin này ngay khi bạn đồng ý!
