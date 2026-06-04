/**
 * Chuyển đổi chuỗi ISO datetime hoặc datetime-local (e.g. 2026-05-20T19:30)
 * thành định dạng ngày giờ theo ngôn ngữ được chọn.
 * Ví dụ: "19:30 - Thứ Tư, 20/05/2026" (vi) hoặc "19:30 - Wednesday, 20/05/2026" (en)
 */
export function formatVietnameseDateTime(
  dateTimeStr: string | null | undefined,
  lang: string = 'vi'
): string {
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

    const daysOfWeekVi = [
      'Chủ Nhật',
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
    ];
    const daysOfWeekEn = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    const dayName = lang === 'en' ? daysOfWeekEn[date.getDay()] : daysOfWeekVi[date.getDay()];

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${timeStr} - ${dayName}, ${day}/${month}/${year}`;
  } catch {
    return dateTimeStr;
  }
}
