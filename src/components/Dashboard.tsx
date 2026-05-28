import { formatVietnameseDateTime } from '../utils/date';
import { EventData, User } from '../types';

interface DashboardProps {
  events: EventData[];
  onSelectEvent: (eventId: string | null) => void;
  onCreateEventClick: () => void;
  currentUser?: User | null;
}

export default function Dashboard({ events, onSelectEvent, onCreateEventClick }: DashboardProps) {
  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="dashboard-title">
          <h2 className="mb-1 text-white text-2xl font-bold">🍻 Tổng Hợp Kèo Ăn Nhậu</h2>
          <p className="text-text-secondary text-[0.95rem]">
            Lên kế hoạch, bình chọn địa điểm và thống nhất giờ giấc cùng nhóm bạn
          </p>
        </div>

        <button className="btn-primary" onClick={onCreateEventClick}>
          <span>➕</span> Tạo Kèo Mới
        </button>
      </div>

      {events.length === 0 ? (
        <div className="card-pub" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍻</div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Chưa Có Sòng Nhậu Nào Được Lên Lịch!
          </h3>
          <p className="text-text-secondary text-[0.95rem] mb-6">
            Hãy là người tiên phong phát súng lệnh bằng cách tạo một kèo nhậu mới rực rỡ!
          </p>
          <button className="btn-primary mx-auto" onClick={onCreateEventClick}>
            ➕ Tạo Kèo Nhậu Đầu Tiên
          </button>
        </div>
      ) : (
        <div className="event-grid">
          {events.map((event) => (
            <div key={event.id} className="event-card">
              <div className="mb-4">
                <span
                  className={
                    event.status === 'voting'
                      ? 'event-status-badge voting'
                      : 'event-status-badge locked'
                  }
                >
                  {event.status === 'voting' ? '🔥 Đang bình chọn' : '🍻 Đã chốt kèo'}
                </span>
                <h3 className="mb-2 text-xl font-bold text-white">{event.title}</h3>
                <div className="flex flex-col gap-1 text-text-secondary text-[0.85rem]">
                  <span>
                    Chủ sòng: <strong className="text-white">{event.creatorName}</strong>
                  </span>
                  <span>Ngày lên kèo: {formatDate(event.createdAt)}</span>
                </div>
              </div>

              <div className="my-4 py-3 border-t border-b border-dashed border-white/5">
                {event.status === 'voting' ? (
                  <div className="flex items-center gap-2 italic text-text-secondary text-[0.85rem]">
                    <span>🍻</span> Anh em đang tích cực vote và đề xuất ý tưởng mới...
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 text-[0.85rem]">
                    <div className="flex items-center gap-2 text-text-primary">
                      <span>📅</span>
                      <strong className="glow-text text-gold text-[0.85rem]">
                        {formatVietnameseDateTime(event.finalDateTime)}
                      </strong>
                    </div>
                    <div className="flex items-center gap-2 text-text-primary">
                      <span>📍</span>
                      <span className="font-semibold text-[0.8rem]">{event.finalLocation}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-primary">
                      <span>🍺</span>
                      <span className="text-[0.8rem] text-text-secondary">
                        {event.finalBeerStyle}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-3 text-text-muted text-[0.85rem]">
                  <span>👍 {event.votesCount || 0} vote</span>
                  <span>•</span>
                  <span>💬 {event.commentsCount || 0} chat</span>
                </div>

                <button className="btn-secondary" onClick={() => onSelectEvent(event.id)}>
                  {event.status === 'voting' ? '👉 Vào Vote Ngay' : '📅 Xem Lịch Chốt'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
