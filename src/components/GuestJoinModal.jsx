import { useState } from 'react';

const FUNNY_NAMES = [
  'Beer Thủ Vô Song 🍺',
  'Chiến Thần Diệt Mồi 🍗',
  'Sát Thủ Vỉa Hè 🛵',
  'Thánh Bàn Lùi 🛑',
  'Cao Thủ Trốn Vợ 🤫',
  'Thần Men Mét Nhậu 🍻',
  'Dũng Sĩ Cạn Ly 🥂',
  'Kiện Tướng Phá Mồi 🍤',
  'Bá Chủ Bàn Beer 👑',
  'Thần Sấm 1 Lít ⚡',
  'Hiệp Sĩ Nâng Ly 🛡️',
  'Thánh Trôi Mồi 🌭',
  'Bóng Ma Góc Quán 👻',
  'Lão Đại Hớp Cạn 👴',
  'Đệ Nhất Uống Nước Ngọt 🥤'
];

export default function GuestJoinModal({ isOpen, onSubmit, usedNicknames = [] }) {
  const [nickname, setNickname] = useState('');
  const [realName, setRealName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('Vui lòng nhập biệt danh để anh em dễ gọi nhé!');
      return;
    }
    if (!realName.trim()) {
      setError('Vui lòng cung cấp tên thật để phân biệt biệt danh!');
      return;
    }
    if (!username.trim()) {
      setError('Vui lòng nhập Tên đăng nhập hoặc Email để phân biệt với người trùng tên!');
      return;
    }

    onSubmit({ 
      nickname: nickname.trim(), 
      realName: realName.trim(), 
      username: username.trim()
    });
  };

  const handleSelectFunnyName = (funnyName) => {
    setNickname(funnyName);
    setError('');
  };

  // Sắp xếp biệt danh chưa sử dụng lên trên
  const sortedNames = [...FUNNY_NAMES].sort((a, b) => {
    const aUsed = usedNicknames.some(un => un.trim().toLowerCase() === a.trim().toLowerCase());
    const bUsed = usedNicknames.some(un => un.trim().toLowerCase() === b.trim().toLowerCase());
    if (aUsed && !bUsed) return 1;
    if (!aUsed && bUsed) return -1;
    return 0;
  });

  return (
    <div className="modal-overlay">
      <div className="modal-pub">
        <div style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '0.5rem' }}>🍻</div>
        <h3 className="modal-title">Vào Sòng Nhậu BeerVote!</h3>
        <p className="modal-desc">
          Cung cấp thông tin của bạn để bắt đầu tham gia bình chọn lịch trình, đề xuất quán nhậu và chém gió cùng anh em.
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="modal-error-box animate-fade-in">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="guest-nickname">Biệt Danh Của Bạn</label>
            <input
              type="text"
              id="guest-nickname"
              placeholder="Ví dụ: Chiến Thần Diệt Mồi, Hùng Beer Thủ..."
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (error) setError('');
              }}
              maxLength={25}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="guest-realname">Tên Thật Của Bạn</label>
            <input
              type="text"
              id="guest-realname"
              placeholder="Ví dụ: Nguyễn Văn Hùng..."
              value={realName}
              onChange={(e) => {
                setRealName(e.target.value);
                if (error) setError('');
              }}
              maxLength={30}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="guest-username">Tên đăng nhập / Email</label>
            <input
              type="text"
              id="guest-username"
              placeholder="Ví dụ: hung99 hoặc hung.nguyen@gmail.com..."
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError('');
              }}
              maxLength={50}
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.6rem' }}>
              💡 Gợi ý biệt danh chưa sử dụng (✨ là còn trống):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto', paddingRight: '0.2rem' }}>
              {sortedNames.map((fn, idx) => {
                const isUsed = usedNicknames.some(un => un.trim().toLowerCase() === fn.trim().toLowerCase());
                return (
                  <button
                    key={idx}
                    type="button"
                    className={isUsed ? "badge-funny-used" : "badge-funny-unused"}
                    onClick={() => !isUsed && handleSelectFunnyName(fn)}
                    disabled={isUsed}
                    title={isUsed ? "Biệt danh này đã có người chọn trong kèo nhậu này!" : "Bấm để chọn biệt danh này"}
                  >
                    {isUsed ? `${fn} 🛑 (Đã dùng)` : `✨ ${fn}`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-actions-modal">
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              🍻 XÁC NHẬN THÔNG TIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

