import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatVietnameseDateTime } from '../utils/date';
import { EventData, User } from '../types';

interface DashboardProps {
  events: EventData[];
  onSelectEvent: (eventId: string | null) => void;
  onCreateEventClick: () => void;
  currentUser?: User | null;
}

export default function Dashboard({ events, onSelectEvent, onCreateEventClick }: DashboardProps) {
  const { t, i18n } = useTranslation();
  const [filterStatus, setFilterStatus] = useState<'all' | 'voting' | 'locked'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN', {
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

  // Calculate Stats
  const totalEvents = events.length;
  const votingEvents = events.filter((e) => e.status === 'voting').length;
  const lockedEvents = events.filter((e) => e.status === 'locked').length;
  const totalVotes = events.reduce((sum, e) => sum + (e.votesCount || 0), 0);

  // Filter and Search Events
  const filteredEvents = events.filter((event) => {
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.creatorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="dashboard-container">
      {/* 1. Hero Section */}
      <div className="dashboard-hero-section card-pub mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="dashboard-title">
            <span className="hero-badge mb-3 inline-block">{t('dashboard.hero_tag')}</span>
            <h2 className="mb-2 text-white text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span>🍻</span> {t('dashboard.hero_title')}
            </h2>
            <p className="text-text-secondary text-[1rem] leading-relaxed">
              {t('dashboard.hero_subtitle')}
            </p>
          </div>
          <button className="btn-primary shrink-0 scale-hover" onClick={onCreateEventClick}>
            {t('dashboard.create_button')}
          </button>
        </div>

        {/* 2. Stats Dashboard Grid */}
        <div className="stats-dashboard-grid mt-8">
          <div className="stat-card">
            <span className="stat-icon">🍺</span>
            <div className="stat-info">
              <span className="stat-value">{totalEvents}</span>
              <span className="stat-label">{t('dashboard.stat_total_parties')}</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon text-amber-500">🔥</span>
            <div className="stat-info">
              <span className="stat-value">{votingEvents}</span>
              <span className="stat-label">{t('dashboard.stat_active_parties')}</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon text-green-500">✅</span>
            <div className="stat-info">
              <span className="stat-value">{lockedEvents}</span>
              <span className="stat-label">{t('dashboard.stat_locked_parties')}</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon text-red-500">👍</span>
            <div className="stat-info">
              <span className="stat-value">{totalVotes}</span>
              <span className="stat-label">
                {i18n.language === 'en' ? 'Total Votes' : 'Lượt Bình Chọn'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter and Search Controls */}
      <div className="filter-controls-bar mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tab Filter buttons */}
          <div className="filter-tabs">
            <button
              className={`filter-tab-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              {t('dashboard.filter_all')} ({totalEvents})
            </button>
            <button
              className={`filter-tab-btn ${filterStatus === 'voting' ? 'active' : ''}`}
              onClick={() => setFilterStatus('voting')}
            >
              {t('dashboard.filter_active')} 🔥 ({votingEvents})
            </button>
            <button
              className={`filter-tab-btn ${filterStatus === 'locked' ? 'active' : ''}`}
              onClick={() => setFilterStatus('locked')}
            >
              {t('dashboard.filter_locked')} 🍻 ({lockedEvents})
            </button>
          </div>

          {/* Search bar input */}
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder={t('dashboard.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* 4. Events Grid list */}
      {filteredEvents.length === 0 ? (
        <div
          className="card-pub empty-state-card"
          style={{ textAlign: 'center', padding: '4rem 2rem' }}
        >
          <div className="empty-icon text-5xl mb-4 animate-bounce">🍻</div>
          <h3 className="text-xl font-bold mb-2 text-white">
            {searchQuery
              ? i18n.language === 'en'
                ? 'No matching gatherings found!'
                : 'Không tìm thấy kèo nhậu phù hợp!'
              : t('dashboard.no_events')}
          </h3>
          <p className="text-text-secondary text-[0.95rem] mb-6 max-w-md mx-auto">
            {searchQuery
              ? i18n.language === 'en'
                ? 'Try changing keywords or status filter to find other active sessions.'
                : 'Thử thay đổi từ khóa hoặc bộ lọc để tìm được các kèo nhậu hấp dẫn khác.'
              : i18n.language === 'en'
                ? 'Be the pioneer and fire the first shot by launching a new gathering!'
                : 'Hãy là người tiên phong phát súng lệnh bằng cách tạo một kèo nhậu mới rực rỡ!'}
          </p>
          {!searchQuery && (
            <button className="btn-primary mx-auto" onClick={onCreateEventClick}>
              ➕ {i18n.language === 'en' ? 'Create First Party' : 'Tạo Kèo Nhậu Đầu Tiên'}
            </button>
          )}
        </div>
      ) : (
        <div className="event-grid">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className={`event-card ${event.status === 'locked' ? 'locked-card' : 'voting-card'}`}
            >
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={
                      event.status === 'voting'
                        ? 'event-status-badge voting'
                        : 'event-status-badge locked'
                    }
                  >
                    {event.status === 'voting'
                      ? `🔥 ${t('dashboard.status_active')}`
                      : `🍻 ${t('dashboard.status_locked')}`}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-white leading-snug">{event.title}</h3>
                <div className="flex flex-col gap-1 text-text-secondary text-[0.85rem]">
                  <span>
                    {i18n.language === 'en' ? 'Host: ' : 'Chủ sòng: '}
                    <strong className="text-white">{event.creatorName}</strong>
                  </span>
                  <span>
                    {i18n.language === 'en' ? 'Date Created: ' : 'Ngày lên kèo: '}
                    {formatDate(event.createdAt)}
                  </span>
                </div>
              </div>

              <div className="my-4 py-3 border-t border-b border-dashed border-white/5 card-middle-preview">
                {event.status === 'voting' ? (
                  <div className="flex items-center gap-2 italic text-text-secondary text-[0.85rem] current-status-hint">
                    <span className="beer-glow">✨</span>{' '}
                    {i18n.language === 'en'
                      ? 'Partners are actively voting and proposing options...'
                      : 'Anh em đang tích cực vote và đề xuất ý tưởng...'}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 text-[0.85rem] locked-summary-box">
                    <div className="flex items-center gap-2 text-text-primary">
                      <span>📅</span>
                      <strong className="glow-text text-gold text-[0.85rem]">
                        {formatVietnameseDateTime(event.finalDateTime, i18n.language)}
                      </strong>
                    </div>
                    <div className="flex items-center gap-2 text-text-primary">
                      <span>📍</span>
                      <span className="font-semibold text-[0.85rem] text-white">
                        {event.finalLocation}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-text-primary">
                      <span>🍺</span>
                      <span className="text-[0.85rem] text-text-secondary">
                        {event.finalBeerStyle}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-3 text-text-muted text-[0.85rem] stats-row">
                  <span className="stat-item">
                    👍 {event.votesCount || 0} {i18n.language === 'en' ? 'votes' : 'vote'}
                  </span>
                  <span>•</span>
                  <span className="stat-item">
                    💬 {event.commentsCount || 0} {i18n.language === 'en' ? 'chats' : 'chat'}
                  </span>
                </div>

                <button
                  className={
                    event.status === 'voting' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'
                  }
                  onClick={() => onSelectEvent(event.id)}
                >
                  {event.status === 'voting'
                    ? i18n.language === 'en'
                      ? '👉 Vote Now'
                      : '👉 Vào Vote Ngay'
                    : i18n.language === 'en'
                      ? '📅 View Schedule'
                      : '📅 Xem Lịch'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
