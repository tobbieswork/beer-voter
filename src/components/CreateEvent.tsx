import { useState, FormEvent, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../types';

const VI_TITLE_PRESETS = [
  'Họp mặt cuối tuần 🍻',
  'Mừng lương về 🎉',
  'Giải nhiệt mùa hè 🌞',
  'Thứ Sáu bùng nổ 🚀',
  'Bàn mưu tính kế 🧠',
];

const EN_TITLE_PRESETS = [
  'Weekend Gathering 🍻',
  'Salary Celebration 🎉',
  'Summer Cooldown 🌞',
  'TGIF Blast 🚀',
  'Plotting & Planning 🧠',
];

const VI_LOCATION_PRESETS = [
  'Bia Hơi Vỉa Hè Bờ Sông 🌊',
  'Quán Lẩu Dê Đồng Quê 🐐',
  'Beer Club Sôi Động 🎶',
  'Nướng & Beer Gió Lộng 💨',
  'Quán Ốc Đêm Ấm Cúng 🐚',
];

const EN_LOCATION_PRESETS = [
  'Riverside Draft Beer 🌊',
  'Countryside Goat Hotpot 🐐',
  'Vibrant Beer Club 🎶',
  'Windy BBQ & Beer 💨',
  'Cozy Late-night Snail Bar 🐚',
];

const VI_BEER_PRESETS = [
  'Bia hơi Hà Nội mát lạnh cổ điển 🍺',
  'Bia thủ công IPA thơm nồng, chill chill 🌾',
  'Bia tháp Tiger Bạc kéo pháo 🐯',
  'Bia tươi Tiệp thơm đậm vị 🇨🇿',
  'Bia úp ngược đa sắc màu 🍹',
];

const EN_BEER_PRESETS = [
  'Classic Cold Hanoi Draft Beer 🍺',
  'Aromatic IPA Craft Beer 🌾',
  'Silver Tiger Beer Tower 🐯',
  'Rich Czech Fresh Beer 🇨🇿',
  'Colorful Upside-down Beer 🍹',
];

interface CreateEventProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess: (newEventId: string) => void;
  currentUser: User | null;
}

export default function CreateEvent({
  isOpen,
  onClose,
  onCreateSuccess,
  currentUser,
}: CreateEventProps) {
  const { t, i18n } = useTranslation();
  const [title, setTitle] = useState('');
  const [dateOpts, setDateOpts] = useState<string[]>(['']);
  const [locOpts, setLocOpts] = useState<string[]>(['']);
  const [beerOpts, setBeerOpts] = useState<string[]>(['']);
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    const next = [...pinDigits];
    next[index] = clean;
    setPinDigits(next);
    setError('');
    if (clean && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setPinDigits(pasted.split(''));
      pinInputRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  if (!isOpen) return null;

  const getTitlePresets = () => (i18n.language === 'en' ? EN_TITLE_PRESETS : VI_TITLE_PRESETS);
  const getLocPresets = () => (i18n.language === 'en' ? EN_LOCATION_PRESETS : VI_LOCATION_PRESETS);
  const getBeerPresets = () => (i18n.language === 'en' ? EN_BEER_PRESETS : VI_BEER_PRESETS);

  // Tính toán các gợi ý ngày giờ động dựa trên thời gian thực
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
      const currentDay = d.getDay(); // 0 là Chủ Nhật, 5 là Thứ Sáu, 6 là Thứ Bảy
      let daysAhead = (dayOfWeek - currentDay + 7) % 7;
      if (daysAhead === 0) daysAhead = 7; // Nếu trùng hôm nay, nhảy sang tuần sau
      d.setDate(d.getDate() + daysAhead);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}T${hourStr}`;
    };

    if (i18n.language === 'en') {
      return [
        { label: 'Today (19:30) 🕒', value: getQuickDate(0) },
        { label: 'Tomorrow (19:30) 🌅', value: getQuickDate(1) },
        { label: 'This Friday (19:30) ⚡', value: getUpcomingDay(5) },
        { label: 'This Saturday (18:00) 🥳', value: getUpcomingDay(6, '18:00') },
      ];
    }

    return [
      { label: 'Hôm nay (19:30) 🕒', value: getQuickDate(0) },
      { label: 'Ngày mai (19:30) 🌅', value: getQuickDate(1) },
      { label: 'Thứ Sáu này (19:30) ⚡', value: getUpcomingDay(5) },
      { label: 'Thứ Bảy này (18:00) 🥳', value: getUpcomingDay(6, '18:00') },
    ];
  };

  const datePresets = getDynamicDatePresets();

  // Xử lý điền nhanh ý tưởng từ preset
  const handleSelectPreset = (value: string, type: 'title' | 'date' | 'location' | 'beer') => {
    if (type === 'title') {
      setTitle(value);
      return;
    }

    let opts: string[], setOpts: (o: string[]) => void;
    if (type === 'date') {
      opts = dateOpts;
      setOpts = setDateOpts;
    } else if (type === 'location') {
      opts = locOpts;
      setOpts = setLocOpts;
    } else {
      opts = beerOpts;
      setOpts = setBeerOpts;
    }

    // Điền vào ô trống đầu tiên hoặc tạo mới
    const emptyIndex = opts.findIndex((o) => o.trim() === '');
    if (emptyIndex > -1) {
      const updateOpts = [...opts];
      updateOpts[emptyIndex] = value;
      setOpts(updateOpts);
    } else {
      setOpts([...opts, value]);
    }
  };

  // Xử lý thay đổi mảng option
  const handleOptChange = (index: number, value: string, type: 'date' | 'location' | 'beer') => {
    let updateOpts: string[];
    if (type === 'date') {
      updateOpts = [...dateOpts];
      updateOpts[index] = value;
      setDateOpts(updateOpts);
    } else if (type === 'location') {
      updateOpts = [...locOpts];
      updateOpts[index] = value;
      setLocOpts(updateOpts);
    } else {
      updateOpts = [...beerOpts];
      updateOpts[index] = value;
      setBeerOpts(updateOpts);
    }
  };

  // Thêm ô nhập option mới
  const addOptField = (type: 'date' | 'location' | 'beer') => {
    if (type === 'date') setDateOpts([...dateOpts, '']);
    else if (type === 'location') setLocOpts([...locOpts, '']);
    else setBeerOpts([...beerOpts, '']);
  };

  // Xóa bớt ô nhập option
  const removeOptField = (index: number, type: 'date' | 'location' | 'beer') => {
    let updateOpts: string[];
    if (type === 'date') {
      if (dateOpts.length === 1) return;
      updateOpts = dateOpts.filter((_, i) => i !== index);
      setDateOpts(updateOpts);
    } else if (type === 'location') {
      if (locOpts.length === 1) return;
      updateOpts = locOpts.filter((_, i) => i !== index);
      setLocOpts(updateOpts);
    } else {
      if (beerOpts.length === 1) return;
      updateOpts = beerOpts.filter((_, i) => i !== index);
      setBeerOpts(updateOpts);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError(
        i18n.language === 'en'
          ? 'Please enter a gathering name!'
          : 'Vui lòng nhập tên kèo nhậu nhé!'
      );
      return;
    }

    const partyPinVal = pinDigits.join('');
    if (partyPinVal && !/^\d{6}$/.test(partyPinVal)) {
      setError(
        i18n.language === 'en'
          ? 'Party PIN must be exactly 6 digits (or left blank)!'
          : 'Mật khẩu bảo vệ phải đúng 6 chữ số (hoặc để trống)!'
      );
      return;
    }

    const filteredDates = dateOpts.filter((o) => o.trim() !== '');
    const filteredLocs = locOpts.filter((o) => o.trim() !== '');
    const filteredBeers = beerOpts.filter((o) => o.trim() !== '');

    if (filteredDates.length === 0 || filteredLocs.length === 0 || filteredBeers.length === 0) {
      setError(
        i18n.language === 'en'
          ? 'Please enter/select at least 1 option for each category (Date, Location, Beer)!'
          : 'Vui lòng nhập/chọn ít nhất 1 đề xuất ban đầu cho mỗi mục (Ngày/Giờ, Địa điểm, Loại bia)!'
      );
      return;
    }

    if (!currentUser) {
      setError(
        i18n.language === 'en'
          ? 'You need to set up a profile before creating an event!'
          : 'Bạn cần nhập thông tin trước khi tạo kèo!'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          creatorId: currentUser.id,
          creatorName: currentUser.name,
          creatorNickname: currentUser.nickname,
          creatorRealName: currentUser.realName,
          creatorUsername: currentUser.username,
          dateOptions: filteredDates,
          locationOptions: filteredLocs,
          beerOptions: filteredBeers,
          ...(partyPinVal.length === 6 ? { partyPin: partyPinVal } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error('Lỗi khi gửi dữ liệu tạo kèo!');
      }

      const newEvent = await response.json();
      onCreateSuccess(newEvent.id);
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        i18n.language === 'en'
          ? 'Failed to create gathering. Check server connection!'
          : 'Không thể tạo kèo nhậu. Vui lòng kiểm tra kết nối tới Server!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal-pub"
        style={{ maxWidth: '600px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-modal-title"
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label={t('header.qr_close')}
        >
          &times;
        </button>
        <div className="modal-pub-body">
          <h3 className="modal-title text-[1.6rem]" id="create-modal-title">
            {t('create_event.title')}
          </h3>
          <p className="modal-desc mb-4">
            {i18n.language === 'en'
              ? 'Set up initial suggestions. Friends can vote or add new ideas later! You will be designated as Host.'
              : 'Thiết lập các đề xuất ban đầu. Bạn bè sẽ vào vote hoặc thêm đề xuất mới sau! Bạn tạo kèo này sẽ mặc định làm Chủ Kèo.'}
          </p>

          {error && <div className="modal-error-box mb-4">⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Tên Kèo */}
            <div className="form-group">
              <label htmlFor="event-title">{t('create_event.name_label')}</label>
              <input
                type="text"
                id="event-title"
                placeholder={t('create_event.name_placeholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                required
              />
              {/* Presets cho Tên Kèo */}
              <div className="presets-container">
                {getTitlePresets().map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-chat-tag"
                    onClick={() => handleSelectPreset(preset, 'title')}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Đề xuất Ngày/Giờ */}
            <div className="form-group mb-6">
              <label>{t('create_event.target_time_label')}</label>
              <div className="options-input-list">
                {dateOpts.map((opt, index) => (
                  <div key={index} className="option-input-row">
                    <input
                      type="datetime-local"
                      value={opt}
                      onChange={(e) => handleOptChange(index, e.target.value, 'date')}
                      required={index === 0}
                    />
                    {dateOpts.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove-opt"
                        onClick={() => removeOptField(index, 'date')}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {/* Presets cho Lịch Trình */}
              <div className="presets-container my-2">
                {datePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-chat-tag"
                    onClick={() => handleSelectPreset(preset.value, 'date')}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <button type="button" className="btn-add-opt-row" onClick={() => addOptField('date')}>
                <svg
                  className="w-4 h-4 mr-1.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {i18n.language === 'en' ? 'Add Another Date/Time' : 'Thêm Lịch Khác'}
              </button>
            </div>

            {/* Đề xuất Địa điểm */}
            <div className="form-group mb-6">
              <label>{t('event_detail.option_types.location')}</label>
              <div className="options-input-list">
                {locOpts.map((opt, index) => (
                  <div key={index} className="option-input-row">
                    <input
                      type="text"
                      placeholder={
                        i18n.language === 'en'
                          ? 'e.g. Riverside Draft Beer Bar'
                          : 'Ví dụ: Bia Hơi Vỉa Hè Bờ Sông'
                      }
                      value={opt}
                      onChange={(e) => handleOptChange(index, e.target.value, 'location')}
                      required={index === 0}
                    />
                    {locOpts.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove-opt"
                        onClick={() => removeOptField(index, 'location')}
                      >
                        <svg
                          className="w-4 h-4 text-red-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {/* Presets cho Địa Điểm */}
              <div className="presets-container my-2">
                {getLocPresets().map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-chat-tag"
                    onClick={() => handleSelectPreset(preset, 'location')}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn-add-opt-row"
                onClick={() => addOptField('location')}
              >
                <svg
                  className="w-4 h-4 mr-1.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {i18n.language === 'en' ? 'Add Another Location' : 'Thêm Địa Điểm Khác'}
              </button>
            </div>

            {/* Đề xuất Loại Bia */}
            <div className="form-group mb-6">
              <label>{t('event_detail.option_types.beer')}</label>
              <div className="options-input-list">
                {beerOpts.map((opt, index) => (
                  <div key={index} className="option-input-row">
                    <input
                      type="text"
                      placeholder={
                        i18n.language === 'en'
                          ? 'e.g. Hanoi Draft Beer, IPA Craft...'
                          : 'Ví dụ: Bia hơi Hà Nội mát lạnh, Bia thủ công...'
                      }
                      value={opt}
                      onChange={(e) => handleOptChange(index, e.target.value, 'beer')}
                      required={index === 0}
                    />
                    {beerOpts.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove-opt"
                        onClick={() => removeOptField(index, 'beer')}
                      >
                        <svg
                          className="w-4 h-4 text-red-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {/* Presets cho Loại Bia */}
              <div className="presets-container my-2">
                {getBeerPresets().map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-chat-tag"
                    onClick={() => handleSelectPreset(preset, 'beer')}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <button type="button" className="btn-add-opt-row" onClick={() => addOptField('beer')}>
                <svg
                  className="w-4 h-4 mr-1.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {i18n.language === 'en' ? 'Add Another Beer Option' : 'Thêm Loại Bia Khác'}
              </button>
            </div>

            {/* Mật Khẩu Bảo Vệ (tùy chọn) */}
            <div className="form-group mb-6">
              <label className="flex items-center gap-1">
                <svg
                  className="w-4 h-4 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                </svg>
                {t('create_event.pin_label')}{' '}
                <span className="font-normal text-muted">
                  (
                  {i18n.language === 'en'
                    ? 'optional - exactly 6 digits'
                    : 'tùy chọn - đúng 6 chữ số'}
                  )
                </span>
              </label>
              <div className="flex justify-start gap-2 mt-2">
                {pinDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      pinInputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handlePinDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(i, e)}
                    onPaste={handlePinPaste}
                    className="h-12 w-10 rounded-xl border border-glass bg-white/5 text-2xl font-bold text-text-primary text-center outline-none transition-all duration-200 focus:border-gold focus:bg-gold/5 focus:shadow-[0_0_0_3px_rgba(255,176,0,0.15)] disabled:opacity-50"
                    aria-label={`Digit ${i + 1} of 6-digit access PIN`}
                  />
                ))}
              </div>
              {pinDigits.some((d) => d !== '') && (
                <span
                  className={`block text-[0.75rem] pt-2 ${pinDigits.every((d) => d !== '') ? 'text-green' : 'text-muted'}`}
                >
                  {pinDigits.every((d) => d !== '')
                    ? i18n.language === 'en'
                      ? '✅ PIN code set — only authorized partners can join!'
                      : '✅ Đã đặt mật khẩu — chỉ người biết mã mới vào được!'
                    : i18n.language === 'en'
                      ? `Missing ${6 - pinDigits.filter((d) => d !== '').length} digits`
                      : `Còn thiếu ${6 - pinDigits.filter((d) => d !== '').length} chữ số`}
                </span>
              )}
            </div>

            <div className="form-actions-modal">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t('create_event.cancel')}
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting
                  ? i18n.language === 'en'
                    ? 'Creating...'
                    : 'Đang Tạo Kèo...'
                  : `🍻 ${i18n.language === 'en' ? 'Launch Gathering' : 'Phát Lệnh Tạo Kèo'}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
