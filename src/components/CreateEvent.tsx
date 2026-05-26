import { useState, FormEvent } from 'react';
import { User } from '../App';

const TITLE_PRESETS = [
  'Họp mặt cuối tuần 🍻',
  'Mừng lương về 🎉',
  'Giải nhiệt mùa hè 🌞',
  'Thứ Sáu bùng nổ 🚀',
  'Bàn mưu tính kế 🧠'
];

const LOCATION_PRESETS = [
  'Bia Hơi Vỉa Hè Bờ Sông 🌊',
  'Quán Lẩu Dê Đồng Quê 🐐',
  'Beer Club Sôi Động 🎶',
  'Nướng & Beer Gió Lộng 💨',
  'Quán Ốc Đêm Ấm Cúng 🐚'
];

const BEER_PRESETS = [
  'Bia hơi Hà Nội mát lạnh cổ điển 🍺',
  'Bia thủ công IPA thơm nồng, chill chill 🌾',
  'Bia tháp Tiger Bạc kéo pháo 🐯',
  'Bia tươi Tiệp thơm đậm vị 🇨🇿',
  'Bia úp ngược đa sắc màu 🍹'
];

interface CreateEventProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess: (newEventId: string) => void;
  currentUser: User | null;
}

export default function CreateEvent({ isOpen, onClose, onCreateSuccess, currentUser }: CreateEventProps) {
  const [title, setTitle] = useState('');
  const [dateOpts, setDateOpts] = useState<string[]>(['']);
  const [locOpts, setLocOpts] = useState<string[]>(['']);
  const [beerOpts, setBeerOpts] = useState<string[]>(['']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Tính toán các gợi ý ngày giờ động dựa trên thời gian thực
  const getDynamicDatePresets = () => {
    const getQuickDate = (daysAhead: number, hourStr = "19:30") => {
      const d = new Date();
      d.setDate(d.getDate() + daysAhead);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}T${hourStr}`;
    };

    const getUpcomingDay = (dayOfWeek: number, hourStr = "19:30") => {
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

    return [
      { label: 'Hôm nay (19:30) 🕒', value: getQuickDate(0) },
      { label: 'Ngày mai (19:30) 🌅', value: getQuickDate(1) },
      { label: 'Thứ Sáu này (19:30) ⚡', value: getUpcomingDay(5) },
      { label: 'Thứ Bảy này (18:00) 🥳', value: getUpcomingDay(6, "18:00") }
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
    const emptyIndex = opts.findIndex(o => o.trim() === '');
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
      setError('Vui lòng nhập tên kèo nhậu nhé!');
      return;
    }

    const filteredDates = dateOpts.filter(o => o.trim() !== '');
    const filteredLocs = locOpts.filter(o => o.trim() !== '');
    const filteredBeers = beerOpts.filter(o => o.trim() !== '');

    if (filteredDates.length === 0 || filteredLocs.length === 0 || filteredBeers.length === 0) {
      setError('Vui lòng nhập/chọn ít nhất 1 đề xuất ban đầu cho mỗi mục (Ngày/Giờ, Địa điểm, Loại bia)!');
      return;
    }

    if (!currentUser) {
      setError('Bạn cần nhập thông tin trước khi tạo kèo!');
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
          beerOptions: filteredBeers
        })
      });

      if (!response.ok) {
        throw new Error('Lỗi khi gửi dữ liệu tạo kèo!');
      }

      const newEvent = await response.json();
      if (newEvent.creatorToken) {
        localStorage.setItem(`beervote_creator_token_${newEvent.id}`, newEvent.creatorToken);
      }
      onCreateSuccess(newEvent.id);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Không thể tạo kèo nhậu. Vui lòng kiểm tra kết nối tới Server!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-pub" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 className="modal-title" style={{ fontSize: '1.6rem' }}>🍻 Tạo Kèo Nhậu Mới 🍻</h3>
        <p className="modal-desc" style={{ marginBottom: '1rem' }}>
          Thiết lập các đề xuất ban đầu. Bạn bè sẽ vào vote hoặc thêm đề xuất mới sau! Bạn tạo kèo này sẽ mặc định làm <strong>Chủ Kèo</strong>.
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-red)', padding: '0.75rem', borderRadius: '10px', color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Tên Kèo */}
          <div className="form-group">
            <label htmlFor="event-title">Tên Kèo Nhậu</label>
            <input
              type="text"
              id="event-title"
              placeholder="Ví dụ: Họp mặt cuối tuần, Mừng lương về, Giải nhiệt mùa hè..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              required
            />
            {/* Presets cho Tên Kèo */}
            <div className="presets-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
              {TITLE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="quick-chat-tag"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                  onClick={() => handleSelectPreset(preset, 'title')}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Đề xuất Ngày/Giờ */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Lịch Trình Đề Xuất (Ngày & Giờ)</label>
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
                    <button type="button" className="btn-remove-opt" onClick={() => removeOptField(index, 'date')}>
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Presets cho Lịch Trình */}
            <div className="presets-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              {datePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="quick-chat-tag"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                  onClick={() => handleSelectPreset(preset.value, 'date')}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <span className="btn-add-opt-row" onClick={() => addOptField('date')}>
              ➕ Thêm Lịch Khác
            </span>
          </div>

          {/* Đề xuất Địa điểm */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Địa Điểm Đề Xuất</label>
            <div className="options-input-list">
              {locOpts.map((opt, index) => (
                <div key={index} className="option-input-row">
                  <input
                    type="text"
                    placeholder="Ví dụ: Bia Hơi Vỉa Hè Bờ Sông"
                    value={opt}
                    onChange={(e) => handleOptChange(index, e.target.value, 'location')}
                    required={index === 0}
                  />
                  {locOpts.length > 1 && (
                    <button type="button" className="btn-remove-opt" onClick={() => removeOptField(index, 'location')}>
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Presets cho Địa Điểm */}
            <div className="presets-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              {LOCATION_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="quick-chat-tag"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                  onClick={() => handleSelectPreset(preset, 'location')}
                >
                  {preset}
                </button>
              ))}
            </div>
            <span className="btn-add-opt-row" onClick={() => addOptField('location')}>
              ➕ Thêm Địa Điểm Khác
            </span>
          </div>

          {/* Đề xuất Loại Bia */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Loại Bia / Phong Cách Quán</label>
            <div className="options-input-list">
              {beerOpts.map((opt, index) => (
                <div key={index} className="option-input-row">
                  <input
                    type="text"
                    placeholder="Ví dụ: Bia hơi Hà Nội mát lạnh, Bia thủ công..."
                    value={opt}
                    onChange={(e) => handleOptChange(index, e.target.value, 'beer')}
                    required={index === 0}
                  />
                  {beerOpts.length > 1 && (
                    <button type="button" className="btn-remove-opt" onClick={() => removeOptField(index, 'beer')}>
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Presets cho Loại Bia */}
            <div className="presets-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              {BEER_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="quick-chat-tag"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                  onClick={() => handleSelectPreset(preset, 'beer')}
                >
                  {preset}
                </button>
              ))}
            </div>
            <span className="btn-add-opt-row" onClick={() => addOptField('beer')}>
              ➕ Thêm Loại Bia Khác
            </span>
          </div>

          <div className="form-actions-modal">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Hủy Bỏ
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang Tạo Kèo...' : '🍻 Phát Lệnh Tạo Kèo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
