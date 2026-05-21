import { formatVietnameseDateTime } from '../utils/date';
import { EventData, User } from '../App';

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
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>🍻 Tổng Hợp Kèo Ăn Nhậu</h2>
          <p>Lên kế hoạch, bình chọn địa điểm và thống nhất giờ giấc cùng nhóm bạn</p>
        </div>
        
        <button className="btn-primary" onClick={onCreateEventClick}>
          <span>➕</span> Tạo Kèo Mới
        </button>
      </div>

      {events.length === 0 ? (
        <div className="card-pub" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍻</div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Chưa Có Sòng Nhậu Nào Được Lên Lịch!</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Hãy là người tiên phong phát súng lệnh bằng cách tạo một kèo nhậu mới rực rỡ!
          </p>
          <button className="btn-primary" onClick={onCreateEventClick} style={{ margin: '0 auto' }}>
            ➕ Tạo Kèo Nhậu Đầu Tiên
          </button>
        </div>
      ) : (
        <div className="event-grid">
          {events.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-card-top">
                <span className={`event-status-badge ${event.status}`}>
                  {event.status === 'voting' ? '🔥 Đang bình chọn' : '🍻 Đã chốt kèo'}
                </span>
                <h3 className="event-card-title">{event.title}</h3>
                <div className="event-card-meta">
                  <span>Chủ sòng: <strong>{event.creatorName}</strong></span>
                  <span>Ngày lên kèo: {formatDate(event.createdAt)}</span>
                </div>
              </div>

              <div className="event-card-middle">
                {event.status === 'voting' ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🍻</span> Anh em đang tích cực vote và đề xuất ý tưởng mới...
                  </div>
                ) : (
                  <div className="event-card-results">
                    <div className="result-item">
                      <span>📅</span>
                      <strong className="glow-text" style={{ color: 'var(--accent-gold)', fontSize: '0.85rem' }}>
                        {formatVietnameseDateTime(event.finalDateTime)}
                      </strong>
                    </div>
                    <div className="result-item">
                      <span>📍</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{event.finalLocation}</span>
                    </div>
                    <div className="result-item">
                      <span>🍺</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{event.finalBeerStyle}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="event-card-bottom">
                <div className="event-card-stats">
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
