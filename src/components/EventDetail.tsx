import { useState, useEffect, useRef, FormEvent } from 'react';
import Countdown from './Countdown';
import { formatVietnameseDateTime } from '../utils/date';
import {
  User,
  EventData,
  EventOption,
  EventVote,
  OptionPayload,
  CommentPayload,
  LockPayload,
} from '../types';

const getDynamicDatePresets = () => {
  const getQuickDate = (daysAhead: number, hourStr = '19:30') => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hourStr}`;
  };

  const getUpcomingDay = (dayOfWeek: number, hourStr = '19:30') => {
    const d = new Date();
    const currentDay = d.getDay(); // 0 is Sun, 5 is Fri, 6 is Sat
    let daysAhead = (dayOfWeek - currentDay + 7) % 7;
    if (daysAhead === 0) daysAhead = 7;
    d.setDate(d.getDate() + daysAhead);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hourStr}`;
  };

  return [
    { label: 'Hôm nay 🕒', value: getQuickDate(0) },
    { label: 'Ngày mai 🌅', value: getQuickDate(1) },
    { label: 'Thứ 6 này ⚡', value: getUpcomingDay(5) },
    { label: 'Thứ 7 này 🥳', value: getUpcomingDay(6, '18:00') },
  ];
};

const AVATAR_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
];

interface EventDetailProps {
  eventId: string;
  eventData: EventData | null;
  currentUser: User | null;
  onBack: () => void;
  onVoteToggle: (eventId: string, optionId: string, userId?: string, userName?: string) => void;
  onAddOption: (optionData: OptionPayload | null) => void;
  onAddComment: (commentData: CommentPayload | null) => void;
  onLockEvent: (lockData: LockPayload) => void;
  onUnlockEvent: (eventId: string) => void;
  onDeleteEvent: (eventId: string) => Promise<void>;
}

interface EventOptionWithVotes extends EventOption {
  votes: EventVote[];
  votesCount: number;
}

export default function EventDetail({
  eventId,
  eventData,
  currentUser,
  onBack,
  onVoteToggle,
  onAddOption,
  onAddComment,
  onLockEvent,
  onUnlockEvent,
  onDeleteEvent,
}: EventDetailProps) {
  const [newOptionValues, setNewOptionValues] = useState({ datetime: '', location: '', beer: '' });
  const [commentText, setCommentText] = useState('');
  const [showLockModal, setShowLockModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // State phục vụ modal chốt kèo của Admin
  const [finalDateTime, setFinalDateTime] = useState('');
  const [finalLocation, setFinalLocation] = useState('');
  const [finalBeerStyle, setFinalBeerStyle] = useState('');

  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  // Cuộn xuống cuối khi có comment mới
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [eventData?.comments]);

  if (!eventData) {
    return (
      <div className="card-pub" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Đang tải dữ liệu kèo nhậu cực chill...</p>
      </div>
    );
  }

  const { title, creatorName, status, options = [], votes = [], comments = [] } = eventData;

  // Lọc các option theo từng loại
  const getOptionsByType = (type: 'datetime' | 'location' | 'beer'): EventOptionWithVotes[] => {
    const filtered = options.filter((o) => o.type === type);
    // Tính số vote cho mỗi option
    const withVotes = filtered.map((opt) => {
      const optVotes = votes.filter((v) => v.optionId === opt.id);
      return {
        ...opt,
        votes: optVotes,
        votesCount: optVotes.length,
      };
    });
    // Sắp xếp theo số vote giảm dần, nếu bằng vote thì xếp theo thời gian tạo cũ hơn lên trước
    return withVotes.sort((a, b) => {
      if (b.votesCount === a.votesCount) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return b.votesCount - a.votesCount;
    });
  };

  const datetimeOptions = getOptionsByType('datetime');
  const locationOptions = getOptionsByType('location');
  const beerOptions = getOptionsByType('beer');

  // Sinh màu ngẫu nhiên cố định theo tên người dùng
  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
  };

  // Lấy chữ cái đầu làm avatar
  const getInitial = (name: string) => {
    if (!name) return '?';
    // Loại bỏ dấu và lấy ký tự đầu tiên
    const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    if (!cleanName) return name.substring(0, 1).toUpperCase();
    const parts = cleanName.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  };

  // Sao chép link chia sẻ
  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/?eventId=${eventId}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setToastMsg('🍻 Đã copy link chia sẻ! Hãy gửi qua Zalo/Messenger cho bạn bè.');
        setTimeout(() => setToastMsg(''), 2500);
      })
      .catch((err) => {
        console.error('Không thể copy link:', err);
      });
  };

  // Xử lý gửi bình luận
  const handleSendComment = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;

    if (!currentUser) {
      onAddComment(null); // Kích hoạt modal nhập thông tin
      return;
    }

    onAddComment({
      eventId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      content: commentText.trim(),
      userNickname: currentUser.nickname || currentUser.name,
      userRealName: currentUser.realName || '',
      userEmail: currentUser.email || '',
    });
    setCommentText('');
  };

  // Gửi bình luận nhanh
  const handleQuickChat = (text: string) => {
    if (!currentUser) {
      onAddComment(null); // Kích hoạt modal nhập thông tin
      return;
    }
    onAddComment({
      eventId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      content: text,
      userNickname: currentUser.nickname || currentUser.name,
      userRealName: currentUser.realName || '',
      userEmail: currentUser.email || '',
    });
  };

  // Xử lý thêm đề xuất mới
  const handleAddSuggest = (type: 'datetime' | 'location' | 'beer') => {
    const val = newOptionValues[type];
    if (!val || !val.trim()) return;

    // Kiểm tra trùng lặp
    const isDuplicate = options.some(
      (o) => o.type === type && o.value.toLowerCase() === val.trim().toLowerCase()
    );
    if (isDuplicate) {
      alert('Đề xuất này đã tồn tại rồi bạn ơi! Vote cho nó đi nào.');
      return;
    }

    if (!currentUser) {
      onAddOption(null); // Kích hoạt modal nhập thông tin
      return;
    }

    onAddOption({
      eventId,
      optType: type,
      value: val.trim(),
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      userNickname: currentUser.nickname || currentUser.name,
      userRealName: currentUser.realName || '',
      userEmail: currentUser.email || '',
    });

    setNewOptionValues({
      ...newOptionValues,
      [type]: '',
    });
  };

  // Mở modal chốt kèo và tự động quét các option đứng đầu
  const handleOpenLockModal = () => {
    const topDate = datetimeOptions[0]?.value || '';
    const topLoc = locationOptions[0]?.value || '';
    const topBeer = beerOptions[0]?.value || '';

    setFinalDateTime(topDate);
    setFinalLocation(topLoc);
    setFinalBeerStyle(topBeer);

    setShowLockModal(true);
  };

  // Xác nhận chốt kèo
  const handleConfirmLock = () => {
    if (!finalDateTime.trim() || !finalLocation.trim() || !finalBeerStyle.trim()) {
      alert('Vui lòng nhập đầy đủ thông tin chốt kèo nhậu!');
      return;
    }

    onLockEvent({
      eventId,
      finalDateTime: finalDateTime.trim(),
      finalLocation: finalLocation.trim(),
      finalBeerStyle: finalBeerStyle.trim(),
    });

    setShowLockModal(false);
    setToastMsg('🎉 Đã chốt kèo nhậu thành công! Đồng hồ đếm ngược đã kích hoạt.');
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleUnlock = () => {
    onUnlockEvent(eventId);
    setToastMsg('🔓 Đã mở lại kèo để tiếp tục bình chọn!');
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleDeleteConfirmed = async () => {
    setIsDeleting(true);
    await onDeleteEvent(eventId);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  const renderVotingSection = (
    titleIcon: string,
    titleText: string,
    type: 'datetime' | 'location' | 'beer',
    listOptions: EventOptionWithVotes[]
  ) => {
    return (
      <div className="card-pub">
        <h4 className="section-card-title">
          <span>{titleIcon}</span> {titleText}
        </h4>

        <div className="options-list">
          {listOptions.map((opt, idx) => {
            const hasVoted = currentUser
              ? opt.votes.some((v) => v.userId === currentUser.id)
              : false;
            const isLeader = idx === 0 && opt.votesCount > 0;

            return (
              <div key={opt.id} className={`option-item ${isLeader ? 'leader' : ''}`}>
                <div className="option-content">
                  <span className="option-value">
                    {type === 'datetime' ? formatVietnameseDateTime(opt.value) : opt.value}
                  </span>
                  <span
                    className="option-creator"
                    title={
                      `Đề xuất bởi: ${opt.creatorNickname || opt.creatorName}` +
                      (opt.creatorRealName
                        ? ` (${opt.creatorRealName} - ${opt.creatorUsername || opt.creatorEmail || 'Guest'})`
                        : '')
                    }
                  >
                    Đề xuất bởi: <strong>{opt.creatorNickname || opt.creatorName}</strong>
                  </span>
                </div>

                <div className="option-actions">
                  {/* Danh sách avatar những người vote */}
                  <div className="vote-avatars-list">
                    {opt.votes.map((v) => (
                      <div
                        key={v.id}
                        className="avatar-bubble"
                        style={{ backgroundColor: getAvatarColor(v.userNickname || v.userName) }}
                        title={
                          `${v.userNickname || v.userName}` +
                          (v.userRealName
                            ? ` (${v.userRealName} - ${v.userUsername || v.userEmail || 'Guest'})`
                            : '')
                        }
                      >
                        {getInitial(v.userNickname || v.userName)}
                      </div>
                    ))}
                  </div>

                  {/* Nút Upvote */}
                  <button
                    className={`vote-button ${hasVoted ? 'active' : ''}`}
                    onClick={() =>
                      onVoteToggle(eventId, opt.id, currentUser?.id, currentUser?.name)
                    }
                    disabled={status === 'locked'}
                    title={
                      status === 'locked'
                        ? 'Kèo đã chốt, không thể vote'
                        : hasVoted
                          ? 'Hủy bình chọn'
                          : 'Bình chọn'
                    }
                  >
                    <span className="vote-icon">{hasVoted ? '🍺' : '👍'}</span>
                    <span className="vote-count">{opt.votesCount}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {listOptions.length === 0 && (
            <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Chưa có đề xuất nào cho mục này.
            </p>
          )}
        </div>

        {/* Ô Đề xuất mới cho Guest/Admin */}
        {status === 'voting' && (
          <div style={{ marginTop: '1rem' }}>
            <div className="suggest-input-group">
              <input
                type={type === 'datetime' ? 'datetime-local' : 'text'}
                placeholder={`Đề xuất ${titleText.toLowerCase()} mới...`}
                value={newOptionValues[type]}
                onChange={(e) => setNewOptionValues({ ...newOptionValues, [type]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSuggest(type);
                }}
                maxLength={60}
              />
              <button
                type="button"
                className="btn-suggest-add"
                onClick={() => handleAddSuggest(type)}
              >
                Thêm
              </button>
            </div>

            {/* Presets điền nhanh cho phần đề xuất */}
            <div
              className="presets-container"
              style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}
            >
              {type === 'datetime' &&
                getDynamicDatePresets().map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-chat-tag"
                    style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
                    onClick={() => setNewOptionValues({ ...newOptionValues, [type]: preset.value })}
                  >
                    {preset.label}
                  </button>
                ))}
              {type === 'location' &&
                [
                  'Bia Hơi Bờ Sông 🌊',
                  'Quán Lẩu Dê 🐐',
                  'Beer Club 🎶',
                  'Nướng & Beer 💨',
                  'Ốc Đêm 🐚',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-chat-tag"
                    style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
                    onClick={() => setNewOptionValues({ ...newOptionValues, [type]: preset })}
                  >
                    {preset}
                  </button>
                ))}
              {type === 'beer' &&
                [
                  'Bia hơi Hà Nội 🍺',
                  'Bia thủ công IPA 🌾',
                  'Tiger Bạc 🐯',
                  'Bia tươi Tiệp 🇨🇿',
                  'Bia úp ngược 🍹',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-chat-tag"
                    style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
                    onClick={() => setNewOptionValues({ ...newOptionValues, [type]: preset })}
                  >
                    {preset}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="event-detail-container">
      {/* Toast thông báo sao chép */}
      {toastMsg && <div className="toast-msg">{toastMsg}</div>}

      {/* Nút quay lại */}
      <span className="back-link" onClick={onBack}>
        ⬅️ Quay lại danh sách kèo
      </span>

      {/* Banner nếu Kèo Đã Chốt */}
      {status === 'locked' && eventData.finalDateTime && (
        <div className="locked-banner animate-fade-in">
          <div className="locked-banner-title">
            <span>👑</span> Kèo Đã Chốt Chính Thức! Lên Đồ Đi Nhậu Thôi!
          </div>
          <div className="locked-summary-grid">
            <div className="locked-summary-box">
              <div className="locked-summary-label">📅 Lịch Trình Gặp Nhau</div>
              <div className="locked-summary-val">
                {formatVietnameseDateTime(eventData.finalDateTime)}
              </div>
            </div>
            <div className="locked-summary-box">
              <div className="locked-summary-label">📍 Địa Điểm Ăn Chơi</div>
              <div className="locked-summary-val">{eventData.finalLocation}</div>
            </div>
            <div className="locked-summary-box">
              <div className="locked-summary-label">🍻 Loại Bia / Vibe Quán</div>
              <div className="locked-summary-val">{eventData.finalBeerStyle}</div>
            </div>
          </div>
        </div>
      )}

      {/* Layout chi tiết 2 cột */}
      <div className="detail-layout">
        {/* Cột chính: Các mục bình chọn */}
        <div className="detail-main">
          {/* Thông tin tiêu đề kèo */}
          <div className="card-pub" style={{ paddingBottom: '1.25rem' }}>
            <div className="detail-header-info">
              <h2 className="detail-title">{title}</h2>
              <div className="detail-meta-row">
                <span>
                  Chủ kèo: <strong>{creatorName}</strong>
                </span>
                <span className="dot-separator"></span>
                <span>
                  Trạng thái:
                  <strong
                    style={{
                      color: status === 'voting' ? 'var(--accent-amber)' : 'var(--accent-green)',
                      marginLeft: '0.25rem',
                    }}
                  >
                    {status === 'voting' ? '🔥 Đang bình chọn' : '🍻 Đã chốt lịch'}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Bình chọn Lịch trình */}
          {renderVotingSection('📅', 'Lịch Trình', 'datetime', datetimeOptions)}

          {/* Bình chọn Địa điểm */}
          {renderVotingSection('📍', 'Địa Điểm', 'location', locationOptions)}

          {/* Bình chọn Bia */}
          {renderVotingSection('🍻', 'Loại Bia & Vibe Quán', 'beer', beerOptions)}
        </div>

        {/* Cột phụ: Sidebar (Countdown, Chốt kèo, Chat chit) */}
        <div className="detail-sidebar">
          {/* 1. Đếm Ngược / Lời kêu gọi */}
          {status === 'locked' && eventData.finalDateTime ? (
            <Countdown key={eventData.finalDateTime} targetDate={eventData.finalDateTime} />
          ) : (
            <div className="card-pub" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔥</div>
              <h4
                style={{
                  fontWeight: 700,
                  color: 'var(--accent-gold)',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  fontSize: '0.9rem',
                }}
              >
                Đang Mở Sòng Vote
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Chia sẻ link cho bạn bè để cùng vào vote địa điểm ngon, giờ đẹp và loại bia chill
                nhé anh em ơi!
              </p>
            </div>
          )}

          {/* 2. Quyền năng Admin (Chốt kèo / Chia sẻ link) */}
          <div className="card-pub">
            <h4
              className="section-card-title"
              style={{ fontSize: '1rem', marginBottom: '0.85rem' }}
            >
              ⚙️ Bảng Điều Khiển Sòng Nhậu
            </h4>

            <div className="admin-action-box">
              {currentUser && currentUser.id === eventData.creatorId ? (
                <>
                  {status === 'voting' && (
                    <button className="btn-lock" onClick={handleOpenLockModal}>
                      🔒 Chốt Kèo Tới Bến
                    </button>
                  )}
                  {status === 'locked' && (
                    <button
                      className="btn-secondary"
                      onClick={handleUnlock}
                      style={{ width: '100%', marginBottom: '0.5rem' }}
                    >
                      🔓 Mở Lại Bình Chọn
                    </button>
                  )}
                  <button
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{
                      width: '100%',
                      background: 'rgba(239,68,68,0.15)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: 'var(--accent-red)',
                    }}
                  >
                    🗑️ Xóa Kèo Này
                  </button>
                </>
              ) : status === 'voting' ? (
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-glass)',
                    textAlign: 'center',
                  }}
                >
                  🔒 Chỉ{' '}
                  <strong>Chủ Kèo ({eventData.creatorNickname || eventData.creatorName})</strong>{' '}
                  mới có quyền chốt kèo này.
                </div>
              ) : (
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--accent-green)',
                    fontWeight: 600,
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(16,185,129,0.2)',
                    textAlign: 'center',
                  }}
                >
                  ✅ Kèo nhậu này đã đóng băng bình chọn.
                </div>
              )}

              {/* Hộp chia sẻ link */}
              <div className="share-link-box">
                <span className="share-link-title">🔗 Link gửi Zalo / Messenger:</span>
                <div className="share-link-row">
                  <div className="share-link-input">
                    {window.location.origin}/?eventId={eventId}
                  </div>
                  <button className="btn-copy" onClick={handleCopyLink}>
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Khung Chat Thảo Luận / Bàn Lùi */}
          <div className="card-pub" style={{ display: 'flex', flexDirection: 'column' }}>
            <h4 className="chat-title">
              <span>💬</span> Chat Chit Bàn Lùi ({comments.length})
            </h4>

            {/* Danh sách bình luận */}
            <div className="comments-list">
              {comments.map((cmt) => (
                <div key={cmt.id} className="comment-item">
                  <div
                    className="comment-avatar"
                    style={{ backgroundColor: getAvatarColor(cmt.userNickname || cmt.userName) }}
                    title={
                      (cmt.userNickname || cmt.userName) +
                      (cmt.userRealName
                        ? ` (${cmt.userRealName} - ${cmt.userUsername || cmt.userEmail || 'Guest'})`
                        : '')
                    }
                  >
                    {getInitial(cmt.userNickname || cmt.userName)}
                  </div>
                  <div className="comment-main">
                    <div className="comment-header">
                      <div
                        className="comment-author-info"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '0.1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="comment-author-name">
                            {cmt.userNickname || cmt.userName}
                          </span>
                          <span
                            className={`role-badge ${cmt.userId === eventData.creatorId ? 'admin' : 'guest'}`}
                            style={{ fontSize: '0.6rem', padding: '0.05rem 0.25rem' }}
                          >
                            {cmt.userId === eventData.creatorId ? 'Chủ Kèo' : 'Chiến Hữu'}
                          </span>
                        </div>
                        {(cmt.userRealName || cmt.userUsername || cmt.userEmail) && (
                          <span
                            className="comment-author-sub"
                            style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                          >
                            {cmt.userRealName ? `${cmt.userRealName} — ` : ''}
                            {cmt.userUsername || cmt.userEmail || 'Guest'}
                          </span>
                        )}
                      </div>
                      <span className="comment-time">
                        {new Date(cmt.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="comment-content" style={{ marginTop: '0.35rem' }}>
                      {cmt.content}
                    </p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2rem 1rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    fontStyle: 'italic',
                  }}
                >
                  Chưa có lời gạ gẫm nào. Hãy phát súng lệnh chat đầu tiên đi nào! 🍺
                </div>
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Chat nhanh / Bàn lùi tags */}
            <div className="quick-chats-container">
              <div className="quick-chats-title">⚡ Gõ nhanh lời gạ gẫm:</div>
              <div className="quick-chats-grid">
                <button
                  className="quick-chat-tag"
                  onClick={() => handleQuickChat('🍺 Kèo này tới bến luôn nha anh em!')}
                >
                  🍺 Tới bến luôn!
                </button>
                <button
                  className="quick-chat-tag"
                  onClick={() => handleQuickChat('💸 Kèo này tao bao... ly đầu tiên! 😂')}
                >
                  💸 Bao ly đầu!
                </button>
                <button
                  className="quick-chat-tag"
                  onClick={() => handleQuickChat('🐶 Đứa nào bàn lùi hoặc bùng làm cún nhé!')}
                >
                  🐶 Bùng làm cún!
                </button>
                <button
                  className="quick-chat-tag"
                  onClick={() => handleQuickChat('⏰ Đi đúng giờ nha, trễ phạt 1 ly!')}
                >
                  ⏰ Phạt trễ giờ!
                </button>
                <button
                  className="quick-chat-tag"
                  onClick={() => handleQuickChat('🤤 Thèm lẩu quá, triển quán dê thôi!')}
                >
                  🤤 Thèm lẩu dê!
                </button>
                <button
                  className="quick-chat-tag"
                  onClick={() => handleQuickChat('🚗 Uống không lái, bắt Grab nha! 🚕')}
                >
                  🚗 Uống không lái!
                </button>
                <button
                  className="quick-chat-tag"
                  onClick={() => handleQuickChat('💸 Campuchia chia tiền đều nhé anh em! 🤝')}
                >
                  💸 Chia tiền đều!
                </button>
                <button
                  className="quick-chat-tag"
                  onClick={() => handleQuickChat('🦐 Cho xin một slot phá mồi thôi nha! 🍗')}
                >
                  🦐 Chỉ phá mồi!
                </button>
                <button
                  className="quick-chat-tag"
                  onClick={() =>
                    handleQuickChat('🎤 Làm tí tăng hai Karaoke hát hò tưng bừng đê! 🎶')
                  }
                >
                  🎤 Tăng hai Karaoke!
                </button>
              </div>
            </div>

            {/* Form gửi bình luận */}
            <form onSubmit={handleSendComment} className="comment-form">
              <input
                type="text"
                placeholder="Gạ gẫm, bàn lùi gì không..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={200}
                required
              />
              <button type="submit" className="btn-send">
                Gửi
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ================= MODAL XÁC NHẬN XÓA KÈO ================= */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-pub" style={{ maxWidth: '420px' }}>
            <h3 className="modal-title" style={{ color: 'var(--accent-red)' }}>
              🗑️ Xác Nhận Xóa Kèo
            </h3>
            <p className="modal-desc">
              Bạn có chắc muốn xóa kèo <strong>"{title}"</strong> không? Toàn bộ vote, đề xuất và
              chat chit sẽ bị xóa vĩnh viễn!
            </p>
            <div className="form-actions-modal">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                }}
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
              >
                {isDeleting ? 'Đang xóa...' : '🗑️ Xóa Luôn!'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CHỐT KÈO DÀNH CHO ADMIN ================= */}
      {showLockModal && (
        <div className="modal-overlay">
          <div className="modal-pub" style={{ maxWidth: '500px' }}>
            <h3 className="modal-title" style={{ color: 'var(--accent-amber)' }}>
              🔒 Xác Nhận Chốt Kèo Nhậu
            </h3>
            <p className="modal-desc">
              Hệ thống đã tự động lấy các phương án có lượt VOTE cao nhất hiện tại. Bạn có thể điều
              chỉnh lại thông tin trước khi chốt chính thức!
            </p>

            <div className="form-group">
              <label htmlFor="final-date">📅 Chốt Lịch Trình (Ngày & Giờ)</label>
              <input
                type="datetime-local"
                id="final-date"
                value={finalDateTime}
                onChange={(e) => setFinalDateTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="final-location">📍 Chốt Địa Điểm Nhậu</label>
              <input
                type="text"
                id="final-location"
                value={finalLocation}
                onChange={(e) => setFinalLocation(e.target.value)}
                placeholder="Ví dụ: Lẩu Dê Đồng Quê"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="final-beer">🍻 Chốt Loại Bia / Vibe Quán</label>
              <input
                type="text"
                id="final-beer"
                value={finalBeerStyle}
                onChange={(e) => setFinalBeerStyle(e.target.value)}
                placeholder="Ví dụ: Bia thủ công IPA thơm nồng"
                required
              />
            </div>

            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '0.75rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginBottom: '1rem',
                lineHeight: '1.4',
              }}
            >
              ⚠️ <strong>Lưu ý:</strong> Khi bạn bấm <strong>Xác Nhận Chốt</strong>, tính năng vote
              và đề xuất sẽ bị đóng băng vĩnh viễn đối với mọi thành viên. Đồng hồ đếm ngược sẽ kích
              hoạt ngay lập tức!
            </div>

            <div className="form-actions-modal">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowLockModal(false)}
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)',
                }}
                onClick={handleConfirmLock}
              >
                🍻 Xác Nhận Chốt Luôn!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
