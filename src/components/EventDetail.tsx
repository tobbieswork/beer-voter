import { useState, useEffect, useRef, FormEvent } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
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

const getInitialDatePresets = (lang: string) => {
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

  if (lang === 'en') {
    return [
      { label: 'Today 🕒', value: getQuickDate(0) },
      { label: 'Tomorrow 🌅', value: getQuickDate(1) },
      { label: 'This Friday ⚡', value: getUpcomingDay(5) },
      { label: 'This Saturday 🥳', value: getUpcomingDay(6, '18:00') },
    ];
  }

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
  const { t, i18n } = useTranslation();
  const [newOptionValues, setNewOptionValues] = useState({ datetime: '', location: '', beer: '' });
  const [commentText, setCommentText] = useState('');
  const [showLockModal, setShowLockModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showPartyPin, setShowPartyPin] = useState(false);
  const [showSyncSection, setShowSyncSection] = useState(false);
  const [copiedSync, setCopiedSync] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    const creatorToken = localStorage.getItem(`beervote_creator_token_${eventId}`);
    if (showSyncSection && creatorToken) {
      const syncUrl = `${window.location.origin}${window.location.pathname}?eventId=${eventId}&creatorToken=${creatorToken}`;
      QRCode.toDataURL(syncUrl, { width: 180, margin: 1 })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error creating QR:', err));
    }
  }, [showSyncSection, eventId]);

  // State phục vụ modal chốt kèo của Admin
  const [finalDateTime, setFinalDateTime] = useState('');
  const [finalLocation, setFinalLocation] = useState('');
  const [finalBeerStyle, setFinalBeerStyle] = useState('');

  const commentsEndRef = useRef<HTMLDivElement | null>(null);
  const commentsLength = eventData?.comments?.length || 0;
  const prevCommentsLengthRef = useRef(commentsLength);

  // Cuộn xuống cuối khi có comment mới thực sự được thêm vào
  useEffect(() => {
    if (commentsLength > prevCommentsLengthRef.current) {
      if (commentsEndRef.current) {
        commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevCommentsLengthRef.current = commentsLength;
  }, [commentsLength]);

  if (!eventData) {
    return (
      <div className="card-pub text-center" style={{ padding: '3rem' }}>
        <p>
          {i18n.language === 'en'
            ? 'Loading chill gathering details...'
            : 'Đang tải dữ liệu kèo nhậu cực chill...'}
        </p>
      </div>
    );
  }

  const { title, creatorName, status, options = [], votes = [], comments = [] } = eventData;

  const getQuickChats = () => {
    if (i18n.language === 'en') {
      return [
        { text: '🍺 Bottoms up, partners!', label: '🍺 Bottoms up!' },
        { text: '💸 First round is on me! 😂', label: '💸 First round!' },
        { text: '🐔 Whoever backs out is a chicken!', label: '🐔 Back out is chicken!' },
        { text: '⏰ Be on time, late penalty is 1 drink!', label: '⏰ Penalty for late!' },
        { text: "🤤 Craving goat hotpot, let's go!", label: '🤤 Craving goat!' },
        { text: "🚗 Don't drink and drive, book a Grab! 🚕", label: '🚗 Grab back home!' },
        { text: "💸 Let's split the bill equally! 🤝", label: '💸 Split bill!' },
        { text: '🦐 Just eating snacks, no alcohol! 🍗', label: '🦐 Just snacks!' },
        { text: '🎤 Second round at Karaoke! 🎶', label: '🎤 Karaoke!' },
      ];
    }
    return [
      { text: '🍺 Kèo này tới bến luôn nha anh em!', label: '🍺 Tới bến luôn!' },
      { text: '💸 Kèo này mình mời... ly đầu tiên nhé! 😉', label: '💸 Mời ly đầu!' },
      { text: '🐶 Đứa nào bàn lùi hoặc bùng làm cún nhé!', label: '🐶 Bùng làm cún!' },
      { text: '⏰ Đi đúng giờ nha, trễ phạt 1 ly!', label: '⏰ Phạt trễ giờ!' },
      { text: '🤤 Thèm lẩu quá, triển quán dê thôi!', label: '🤤 Thèm lẩu dê!' },
      { text: '🚗 Uống không lái, bắt Grab nha! 🚕', label: '🚗 Uống không lái!' },
      { text: '💸 Campuchia chia tiền đều nhé anh em! 🤝', label: '💸 Campuchia chia tiền!' },
      { text: '🦐 Cho xin một slot phá mồi thôi nha! 🍗', label: '🦐 Chỉ phá mồi!' },
      { text: '🎤 Làm tí tăng hai Karaoke hát hò tưng bừng đê! 🎶', label: '🎤 Tăng hai Karaoke!' },
    ];
  };

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
        setToastMsg(
          i18n.language === 'en'
            ? '🍻 Shared link copied! Send it via Zalo/Messenger/WhatsApp to friends.'
            : '🍻 Đã copy link chia sẻ! Hãy gửi qua Zalo/Messenger cho bạn bè.'
        );
        setTimeout(() => setToastMsg(''), 2500);
      })
      .catch((err) => {
        console.error('Cannot copy link:', err);
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
      alert(
        i18n.language === 'en'
          ? 'This proposal already exists! Vote for it instead.'
          : 'Đề xuất này đã tồn tại rồi bạn ơi! Vote cho nó đi nào.'
      );
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
      alert(
        i18n.language === 'en'
          ? 'Please enter all fields to finalize the gathering!'
          : 'Vui lòng nhập đầy đủ thông tin chốt kèo nhậu!'
      );
      return;
    }

    onLockEvent({
      eventId,
      finalDateTime: finalDateTime.trim(),
      finalLocation: finalLocation.trim(),
      finalBeerStyle: finalBeerStyle.trim(),
    });

    setShowLockModal(false);
    setToastMsg(
      i18n.language === 'en'
        ? '🎉 Gathering finalized successfully! Countdown clock activated.'
        : '🎉 Đã chốt kèo nhậu thành công! Đồng hồ đếm ngược đã kích hoạt.'
    );
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleUnlock = () => {
    onUnlockEvent(eventId);
    setToastMsg(
      i18n.language === 'en'
        ? '🔓 Voting reopened successfully!'
        : '🔓 Đã mở lại kèo để tiếp tục bình chọn!'
    );
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
                    {type === 'datetime'
                      ? formatVietnameseDateTime(opt.value, i18n.language)
                      : opt.value}
                  </span>
                  <span
                    className="option-creator"
                    title={
                      (i18n.language === 'en' ? 'Proposed by: ' : 'Đề xuất bởi: ') +
                      `${opt.creatorNickname || opt.creatorName}` +
                      (opt.creatorRealName
                        ? ` (${opt.creatorRealName} - ${opt.creatorUsername || opt.creatorEmail || 'Guest'})`
                        : '')
                    }
                  >
                    {i18n.language === 'en' ? 'Proposed by: ' : 'Đề xuất bởi: '}{' '}
                    <strong>{opt.creatorNickname || opt.creatorName}</strong>
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
                        ? i18n.language === 'en'
                          ? 'Gathering finalized, voting disabled'
                          : 'Kèo đã chốt, không thể vote'
                        : hasVoted
                          ? i18n.language === 'en'
                            ? 'Cancel vote'
                            : 'Hủy bình chọn'
                          : i18n.language === 'en'
                            ? 'Vote'
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
            <p className="empty-state-text">
              {i18n.language === 'en'
                ? 'No proposals yet for this category.'
                : 'Chưa có đề xuất nào cho mục này.'}
            </p>
          )}
        </div>

        {/* Ô Đề xuất mới */}
        {status === 'voting' && (
          <div className="pt-4">
            <div className="suggest-input-group">
              <input
                type={type === 'datetime' ? 'datetime-local' : 'text'}
                placeholder={
                  i18n.language === 'en'
                    ? `Propose new ${titleText.toLowerCase()}...`
                    : `Đề xuất ${titleText.toLowerCase()} mới...`
                }
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
                {i18n.language === 'en' ? 'Add' : 'Thêm'}
              </button>
            </div>

            {/* Presets điền nhanh cho phần đề xuất */}
            <div className="presets-container mt-2">
              {type === 'datetime' &&
                getInitialDatePresets(i18n.language).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-chat-tag"
                    onClick={() => setNewOptionValues({ ...newOptionValues, [type]: preset.value })}
                  >
                    {preset.label}
                  </button>
                ))}
              {type === 'location' &&
                (i18n.language === 'en'
                  ? [
                      'Riverside Draft Beer 🌊',
                      'Goat Hotpot 🐐',
                      'Beer Club 🎶',
                      'Windy BBQ 💨',
                      'Late-night Snails 🐚',
                    ]
                  : [
                      'Bia Hơi Bờ Sông 🌊',
                      'Quán Lẩu Dê 🐐',
                      'Beer Club 🎶',
                      'Nướng & Beer 💨',
                      'Ốc Đêm 🐚',
                    ]
                ).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-chat-tag"
                    onClick={() => setNewOptionValues({ ...newOptionValues, [type]: preset })}
                  >
                    {preset}
                  </button>
                ))}
              {type === 'beer' &&
                (i18n.language === 'en'
                  ? [
                      'Hanoi Draft Beer 🍺',
                      'IPA Craft Beer 🌾',
                      'Tiger Silver 🐯',
                      'Czech Fresh Beer 🇨🇿',
                      'Upside-down Beer 🍹',
                    ]
                  : [
                      'Bia hơi Hà Nội 🍺',
                      'Bia thủ công IPA 🌾',
                      'Tiger Bạc 🐯',
                      'Bia tươi Tiệp 🇨🇿',
                      'Bia úp ngược 🍹',
                    ]
                ).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-chat-tag"
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
      <button className="back-link" type="button" onClick={onBack}>
        {t('event_detail.back')}
      </button>

      {/* Banner nếu Kèo Đã Chốt */}
      {status === 'locked' && eventData.finalDateTime && (
        <div className="locked-banner animate-fade-in">
          <div className="locked-banner-title">
            <span>👑</span>{' '}
            {i18n.language === 'en'
              ? "Gathering Finalized! Let's Dress Up And Go!"
              : 'Kèo Đã Chốt Chính Thức! Lên Đồ Đi Nhậu Thôi!'}
          </div>
          <div className="locked-summary-grid">
            <div className="locked-summary-box">
              <div className="locked-summary-label">📅 {t('create_event.target_time_label')}</div>
              <div className="locked-summary-val">
                {formatVietnameseDateTime(eventData.finalDateTime, i18n.language)}
              </div>
            </div>
            <div className="locked-summary-box">
              <div className="locked-summary-label">
                📍 {t('event_detail.option_types.location')}
              </div>
              <div className="locked-summary-val">{eventData.finalLocation}</div>
            </div>
            <div className="locked-summary-box">
              <div className="locked-summary-label">🍻 {t('event_detail.option_types.beer')}</div>
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
          <div className="card-pub pb-5">
            <div className="detail-header-info">
              <h2 className="detail-title">{title}</h2>
              <div className="detail-meta-row">
                <span>
                  {t('event_detail.created_by')} <strong>{creatorName}</strong>
                </span>
                <span className="dot-separator"></span>
                <span>
                  {i18n.language === 'en' ? 'Status: ' : 'Trạng thái: '}{' '}
                  <strong className={status === 'voting' ? 'status-voting' : 'status-locked'}>
                    {status === 'voting'
                      ? `🔥 ${t('dashboard.status_active')}`
                      : `🍻 ${t('dashboard.status_locked')}`}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Bình chọn Lịch trình */}
          {renderVotingSection(
            '📅',
            t('event_detail.option_types.datetime'),
            'datetime',
            datetimeOptions
          )}

          {/* Bình chọn Địa điểm */}
          {renderVotingSection(
            '📍',
            t('event_detail.option_types.location'),
            'location',
            locationOptions
          )}

          {/* Bình chọn Bia */}
          {renderVotingSection('🍻', t('event_detail.option_types.beer'), 'beer', beerOptions)}
        </div>

        {/* Cột phụ: Sidebar (Countdown, Chốt kèo, Chat chit) */}
        <div className="detail-sidebar">
          {/* 1. Đếm Ngược / Lời kêu gọi */}
          {status === 'locked' && eventData.finalDateTime ? (
            <Countdown key={eventData.finalDateTime} targetDate={eventData.finalDateTime} />
          ) : (
            <div className="card-pub text-center !p-6">
              <div className="mb-2 text-4xl">🔥</div>
              <h4 className="mb-2 text-[0.9rem] font-bold uppercase text-gold">
                {t('event_detail.verify_creator')}
              </h4>
              <p className="text-secondary text-[0.85rem]">
                {i18n.language === 'en'
                  ? 'Share the link with friends to vote on the best date, delicious spots, and chill beer styles!'
                  : 'Chia sẻ link cho bạn bè để cùng vào vote địa điểm ngon, giờ đẹp và loại bia chill nhé anh em ơi!'}
              </p>
            </div>
          )}

          {/* 2. Quyền năng Admin (Chốt kèo / Chia sẻ link) */}
          <div className="card-pub">
            <h4 className="section-card-title text-[1rem] mb-3.5">
              ⚙️ {i18n.language === 'en' ? 'Gathering Control Panel' : 'Bảng Điều Khiển Sòng Nhậu'}
            </h4>

            <div className="admin-action-box">
              {(() => {
                const isCreatorTokenMatched = !!localStorage.getItem(
                  `beervote_creator_token_${eventId}`
                );
                const isGoogleCreatorMatched =
                  currentUser &&
                  currentUser.authMethod === 'google' &&
                  currentUser.googleId &&
                  `google_${currentUser.googleId}` === eventData.creatorId;
                const isCreator = isCreatorTokenMatched || isGoogleCreatorMatched;

                if (isCreator) {
                  return (
                    <>
                      {eventData.partyPin && (
                        <div
                          className="mb-4 flex items-center justify-between"
                          style={{
                            backgroundColor: 'rgba(255, 176, 0, 0.1)',
                            border: '1px solid var(--accent-gold)',
                            borderRadius: '12px',
                            padding: '0.75rem 1rem',
                          }}
                        >
                          <span className="text-[0.85rem] text-gold">
                            🔐 {t('event_detail.pin_required')}:
                          </span>
                          <div className="flex items-center gap-2">
                            <strong className="text-xl tracking-widest text-gold font-mono">
                              {showPartyPin ? eventData.partyPin : '••••••'}
                            </strong>
                            <button
                              type="button"
                              onClick={() => setShowPartyPin(!showPartyPin)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent-gold)',
                                cursor: 'pointer',
                                padding: '4px',
                                fontSize: '1.1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title={showPartyPin ? 'Hide PIN' : 'View PIN'}
                            >
                              {showPartyPin ? '👁️' : '👁️‍🗨️'}
                            </button>
                          </div>
                        </div>
                      )}
                      {status === 'voting' && (
                        <button className="btn-lock" onClick={handleOpenLockModal}>
                          {t('event_detail.lock_button')}
                        </button>
                      )}
                      {status === 'locked' && (
                        <button className="btn-secondary w-full mb-2" onClick={handleUnlock}>
                          {t('event_detail.unlock_button')}
                        </button>
                      )}
                      {isCreatorTokenMatched && (
                        <div className="mt-3.5 mb-2.5">
                          <button
                            type="button"
                            className="btn-secondary w-full"
                            style={{
                              backgroundColor: 'rgba(255, 176, 0, 0.05)',
                              border: '1px solid rgba(255, 176, 0, 0.3)',
                              color: 'var(--accent-gold)',
                            }}
                            onClick={() => setShowSyncSection(!showSyncSection)}
                          >
                            🔗{' '}
                            {showSyncSection
                              ? i18n.language === 'en'
                                ? 'Hide Device Sync QR'
                                : 'Ẩn Mã Đồng Bộ Thiết Bị'
                              : i18n.language === 'en'
                                ? 'Sync Device Access (QR)'
                                : 'Đồng Bộ Thiết Bị Khác (QR)'}
                          </button>

                          {showSyncSection &&
                            (() => {
                              const creatorToken = localStorage.getItem(
                                `beervote_creator_token_${eventId}`
                              );
                              const syncUrl = `${window.location.origin}${window.location.pathname}?eventId=${eventId}&creatorToken=${creatorToken}`;

                              const handleCopySync = () => {
                                navigator.clipboard.writeText(syncUrl);
                                setCopiedSync(true);
                                setTimeout(() => setCopiedSync(false), 2000);
                              };

                              return (
                                <div
                                  className="mt-3 p-4 text-center rounded-[12px]"
                                  style={{
                                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                    border: '1px dashed rgba(255, 176, 0, 0.2)',
                                  }}
                                >
                                  <p className="text-[0.8rem] text-text-muted mb-3 leading-relaxed">
                                    {i18n.language === 'en'
                                      ? 'Scan this QR code or copy this link on another device to restore Host permission without sign-in:'
                                      : 'Quét mã QR bằng điện thoại hoặc sao chép liên kết này mở ở thiết bị khác để cấp quyền Chủ Kèo mà không cần đăng nhập:'}
                                  </p>
                                  <div
                                    className="flex justify-center mb-3 p-2 bg-white rounded-lg mx-auto"
                                    style={{ maxWidth: '196px' }}
                                  >
                                    {qrDataUrl ? (
                                      <img
                                        src={qrDataUrl}
                                        alt="Sync QR"
                                        width={180}
                                        height={180}
                                        style={{ display: 'block' }}
                                      />
                                    ) : (
                                      <div className="text-secondary text-xs p-4">
                                        {i18n.language === 'en'
                                          ? 'Generating QR...'
                                          : 'Đang tạo mã QR...'}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      readOnly
                                      value={syncUrl}
                                      className="form-control text-xs font-mono py-1.5 opacity-80"
                                      style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        color: 'var(--text-main)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                      }}
                                      onClick={(e) => (e.target as HTMLInputElement).select()}
                                    />
                                    <button
                                      type="button"
                                      onClick={handleCopySync}
                                      className="btn-success text-xs py-1.5 px-3 whitespace-nowrap"
                                    >
                                      {copiedSync
                                        ? i18n.language === 'en'
                                          ? 'Copied! ✓'
                                          : 'Đã chép! ✓'
                                        : i18n.language === 'en'
                                          ? 'Copy'
                                          : 'Sao chép'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                        </div>
                      )}
                      <button
                        className="btn-outline-danger w-full"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        🗑️ {i18n.language === 'en' ? 'Delete This Gathering' : 'Xóa Kèo Này'}
                      </button>
                    </>
                  );
                }

                return status === 'voting' ? (
                  <div className="info-box-muted">
                    🔒 {i18n.language === 'en' ? 'Only ' : 'Chỉ '}
                    <strong>
                      {eventData.creatorNickname || eventData.creatorName} (
                      {i18n.language === 'en' ? 'Host' : 'Chủ Kèo'})
                    </strong>{' '}
                    {i18n.language === 'en'
                      ? 'can finalize this party.'
                      : 'mới có quyền chốt kèo này.'}
                  </div>
                ) : (
                  <div className="info-box-green">
                    ✅{' '}
                    {i18n.language === 'en'
                      ? 'Gathering finalized — voting locked.'
                      : 'Kèo nhậu này đã đóng băng bình chọn.'}
                  </div>
                );
              })()}

              {/* Hộp chia sẻ link */}
              <div className="share-link-box">
                <span className="share-link-title">
                  🔗{' '}
                  {i18n.language === 'en'
                    ? 'Share link with friends:'
                    : 'Link gửi Zalo / Messenger:'}
                </span>
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
          <div className="card-pub flex flex-col">
            <h4 className="chat-title">
              <span>💬</span> {t('event_detail.comments_title', { count: comments.length })}
            </h4>

            {/* Danh sách bình luận */}
            <div className="flex flex-col gap-[0.85rem] max-h-[380px] overflow-y-auto pr-1 mb-4 max-[480px]:max-h-[280px] max-[480px]:gap-[0.65rem]">
              {comments.map((cmt) => (
                <div
                  key={cmt.id}
                  className="flex gap-3 p-[0.85rem_1rem] rounded-[16px] border border-glass bg-white/[0.02] max-[480px]:gap-2 max-[480px]:p-[0.7rem_0.85rem] max-[480px]:rounded-[12px]"
                >
                  <div
                    className="w-8 h-8 rounded-full bg-[linear-gradient(135deg,#1f222a,#3a3f4d)] flex items-center justify-center text-[0.85rem] font-bold text-white flex-shrink-0 max-[480px]:hidden"
                    style={{ backgroundColor: getAvatarColor(cmt.userNickname || cmt.userName) }}
                  >
                    {getInitial(cmt.userNickname || cmt.userName)}
                  </div>
                  <div className="flex flex-col gap-[0.2rem] flex-1">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col items-start gap-[0.1rem]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[0.9rem] text-white max-[480px]:text-[0.8rem]">
                            {cmt.userNickname || cmt.userName}
                          </span>
                          <span
                            className={`max-[480px]:hidden role-badge ${cmt.userId === eventData.creatorId ? 'admin' : 'guest'}`}
                          >
                            {cmt.userId === eventData.creatorId
                              ? i18n.language === 'en'
                                ? 'Host'
                                : 'Chủ Kèo'
                              : t('header.guest')}
                          </span>
                        </div>
                        {cmt.userRealName && (
                          <span className="inline-block mt-[0.05rem] text-[0.72rem] text-text-muted normal-font-weight">
                            {cmt.userRealName}
                          </span>
                        )}
                        {(cmt.userUsername || cmt.userEmail) && (
                          <span className="inline-block mt-[0.05rem] text-[0.72rem] text-text-muted normal-font-weight max-[480px]:hidden">
                            {cmt.userRealName ? '—' : ''}
                            {cmt.userUsername || cmt.userEmail || 'Guest'}
                          </span>
                        )}
                      </div>
                      <span className="text-[0.7rem] text-text-muted">
                        {new Date(cmt.createdAt).toLocaleTimeString(
                          i18n.language === 'en' ? 'en-US' : 'vi-VN',
                          { hour: '2-digit', minute: '2-digit' }
                        )}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[0.92rem] text-text-primary leading-[1.4] break-words max-[480px]:text-[0.82rem]">
                      {cmt.content}
                    </p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="empty-state-text py-8 px-4 text-center">
                  {t('event_detail.no_comments')}
                </div>
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Chat nhanh / Bàn lùi tags */}
            <div className="quick-chats-container">
              <div className="quick-chats-title">
                {i18n.language === 'en'
                  ? '⚡ Quick message suggestion:'
                  : '⚡ Gõ nhanh lời gạ gẫm:'}
              </div>
              <div className="quick-chats-grid">
                {getQuickChats().map((qc, idx) => (
                  <button
                    key={idx}
                    className="quick-chat-tag"
                    onClick={() => handleQuickChat(qc.text)}
                  >
                    {qc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form gửi bình luận */}
            <form onSubmit={handleSendComment} className="comment-form">
              <input
                type="text"
                placeholder={t('event_detail.comment_placeholder')}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={200}
                required
              />
              <button type="submit" className="btn-send">
                {t('event_detail.comment_submit')}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ================= MODAL XÁC NHẬN XÓA KÈO ================= */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteConfirm(false);
          }}
        >
          <div className="modal-pub max-w-[420px]">
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowDeleteConfirm(false)}
              aria-label={t('create_event.cancel')}
            >
              &times;
            </button>
            <div className="modal-pub-body">
              <h3 className="modal-title text-red">
                {i18n.language === 'en' ? '🗑️ Confirm Delete Party' : '🗑️ Xác Nhận Xóa Kèo'}
              </h3>
              <p className="modal-desc">
                {i18n.language === 'en'
                  ? `Are you sure you want to delete "${title}"? All votes, proposals, and chats will be permanently deleted!`
                  : `Bạn có chắc muốn xóa kèo "${title}" không? Toàn bộ vote, đề xuất và chat chit sẽ bị xóa vĩnh viễn!`}
              </p>
              <div className="form-actions-modal">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  {t('create_event.cancel')}
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleDeleteConfirmed}
                  disabled={isDeleting}
                >
                  {isDeleting
                    ? i18n.language === 'en'
                      ? 'Deleting...'
                      : 'Đang xóa...'
                    : i18n.language === 'en'
                      ? '🗑️ Delete Permanently'
                      : '🗑️ Xóa Luôn!'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CHỐT KÈO DÀNH CHO ADMIN ================= */}
      {showLockModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLockModal(false);
          }}
        >
          <div className="modal-pub max-w-[500px]">
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowLockModal(false)}
              aria-label={t('create_event.cancel')}
            >
              &times;
            </button>
            <div className="modal-pub-body">
              <h3 className="modal-title text-amber">
                {i18n.language === 'en'
                  ? '🔒 Confirm Finalize Gathering'
                  : '🔒 Xác Nhận Chốt Kèo Nhậu'}
              </h3>
              <p className="modal-desc">
                {i18n.language === 'en'
                  ? 'The system has automatically prefilled options with highest votes. Adjust them if needed before finalizing!'
                  : 'Hệ thống đã tự động lấy các phương án có lượt VOTE cao nhất hiện tại. Bạn có thể điều chỉnh lại thông tin trước khi chốt chính thức!'}
              </p>

              <div className="form-group">
                <label htmlFor="final-date">📅 {t('create_event.target_time_label')}</label>
                <input
                  type="datetime-local"
                  id="final-date"
                  value={finalDateTime}
                  onChange={(e) => setFinalDateTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="final-location">
                  📍 {i18n.language === 'en' ? 'Final Location' : 'Chốt Địa Điểm Nhậu'}
                </label>
                <input
                  type="text"
                  id="final-location"
                  value={finalLocation}
                  onChange={(e) => setFinalLocation(e.target.value)}
                  placeholder={
                    i18n.language === 'en'
                      ? 'e.g. Riverside Draft Beer Bar'
                      : 'Ví dụ: Lẩu Dê Đồng Quê'
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="final-beer">
                  🍻{' '}
                  {i18n.language === 'en' ? 'Final Beer / Vibe Style' : 'Chốt Loại Bia / Vibe Quán'}
                </label>
                <input
                  type="text"
                  id="final-beer"
                  value={finalBeerStyle}
                  onChange={(e) => setFinalBeerStyle(e.target.value)}
                  placeholder={
                    i18n.language === 'en'
                      ? 'e.g. Rich IPA Craft Beer'
                      : 'Ví dụ: Bia thủ công IPA thơm nồng'
                  }
                  required
                />
              </div>

              <div className="warning-box mb-4">
                ⚠️{' '}
                {i18n.language === 'en' ? (
                  <>
                    <strong>Note:</strong> Once finalized, voting and proposals will be permanently
                    locked for everyone. The countdown timer will start immediately!
                  </>
                ) : (
                  <>
                    <strong>Lưu ý:</strong> Khi bạn bấm <strong>Xác Nhận Chốt</strong>, tính năng
                    vote và đề xuất sẽ bị đóng băng vĩnh viễn đối với mọi thành viên. Đồng hồ đếm
                    ngược sẽ kích hoạt ngay lập tức!
                  </>
                )}
              </div>

              <div className="form-actions-modal">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowLockModal(false)}
                >
                  {t('create_event.cancel')}
                </button>
                <button type="button" className="btn-success" onClick={handleConfirmLock}>
                  🍻 {i18n.language === 'en' ? 'Confirm Finalize' : 'Xác Nhận Chốt Luôn!'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
