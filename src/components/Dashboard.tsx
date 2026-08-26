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
              <svg
                className="w-5 h-5 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {i18n.language === 'en' ? 'Create First Party' : 'Tạo Kèo Nhậu Đầu Tiên'}
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
                      <svg
                        className="w-4 h-4 text-amber-500 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                        />
                      </svg>
                      <span className="font-semibold text-[0.85rem] text-white">
                        {event.finalLocation}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-text-primary">
                      <svg
                        className="w-4 h-4 text-amber-500 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 2v12m0 0a5 5 0 01-5-5h10a5 5 0 01-5 5zm-4 8h8"
                        />
                      </svg>
                      <span className="text-[0.85rem] text-text-secondary">
                        {event.finalBeerStyle}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-3 text-text-muted text-[0.85rem] stats-row">
                  <span className="stat-item flex items-center gap-1">
                    <svg
                      className="w-4 h-4 text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.633 10.25c.896 0 1.7-.393 2.287-1.014L10 7.75l-.25-2.75a1.5 1.5 0 0 1 3 0l-.25 2.75h3.633a2.25 2.25 0 0 1 2.25 2.25c0 .647-.272 1.23-.711 1.638.44.408.711.99.711 1.637 0 .647-.272 1.23-.711 1.638.44.408.711.99.711 1.637 0 .61-.243 1.167-.638 1.576a2.25 2.25 0 0 1-2.13 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-6.75a2.25 2.25 0 0 1 2.25-2.25Z"
                      />
                    </svg>
                    {event.votesCount || 0} {i18n.language === 'en' ? 'votes' : 'vote'}
                  </span>
                  <span>•</span>
                  <span className="stat-item flex items-center gap-1">
                    <svg
                      className="w-4 h-4 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.75.75 0 0 1-1.074-.765 7.99 7.99 0 0 0 1.257-2.43C4.185 16.347 3 14.305 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                      />
                    </svg>
                    {event.commentsCount || 0} {i18n.language === 'en' ? 'chats' : 'chat'}
                  </span>
                </div>

                <button
                  className={
                    event.status === 'voting' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'
                  }
                  onClick={() => onSelectEvent(event.id)}
                >
                  {event.status === 'voting' ? (
                    <>
                      <svg
                        className="w-4 h-4 mr-1.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                        />
                      </svg>
                      {i18n.language === 'en' ? 'Vote Now' : 'Vào Vote Ngay'}
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 mr-1.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                        />
                      </svg>
                      {i18n.language === 'en' ? 'View Schedule' : 'Xem Lịch'}
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
