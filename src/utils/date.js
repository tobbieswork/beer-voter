/**
 * Chuyển đổi chuỗi ISO datetime hoặc datetime-local (e.g. 2026-05-20T19:30)
 * thành định dạng tiếng Việt dễ đọc và chuẩn xác.
 * Ví dụ: "19:30 - Thứ Tư, 20/05/2026"
 */
export function formatVietnameseDateTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) {
      // Nếu không phải chuỗi thời gian hợp lệ, trả về nguyên bản
      return dateTimeStr;
    }
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = daysOfWeek[date.getDay()];
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${timeStr} - ${dayName}, ${day}/${month}/${year}`;
  } catch {
    return dateTimeStr;
  }
}
