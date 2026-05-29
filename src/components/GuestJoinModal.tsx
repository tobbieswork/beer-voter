import { useState, FormEvent } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

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
  'Đệ Nhất Uống Nước Ngọt 🥤',
];

interface GuestJoinModalProps {
  isOpen: boolean;
  onSubmit: (data: { nickname: string; realName: string; username: string }) => void;
  onGoogleSuccess: (data: {
    sub: string;
    email: string;
    name: string;
    given_name: string;
    picture: string;
  }) => void;
  usedNicknames?: string[];
}

export default function GuestJoinModal({
  isOpen,
  onSubmit,
  onGoogleSuccess,
  usedNicknames = [],
}: GuestJoinModalProps) {
  const [mode, setMode] = useState<'choose' | 'guest'>('choose');
  const [nickname, setNickname] = useState('');
  const [realName, setRealName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleGoogleCredential = async (response: CredentialResponse) => {
    if (!response.credential) {
      setGoogleError('Không nhận được thông tin từ Google. Thử lại nhé!');
      return;
    }
    setIsVerifying(true);
    setGoogleError('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      if (!res.ok) throw new Error('Verification failed');
      const data = await res.json();
      onGoogleSuccess({
        sub: data.sub,
        email: data.email,
        name: data.name,
        given_name: data.given_name,
        picture: data.picture,
      });
    } catch {
      // Fallback: decode JWT client-side if server not configured
      try {
        const parts = response.credential.split('.');
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        onGoogleSuccess({
          sub: payload.sub,
          email: payload.email || '',
          name: payload.name || '',
          given_name: payload.given_name || '',
          picture: payload.picture || '',
        });
      } catch {
        setGoogleError(
          'Đăng nhập Google thất bại. Vui lòng thử lại hoặc tham gia với tư cách khách!'
        );
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
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
    onSubmit({ nickname: nickname.trim(), realName: realName.trim(), username: username.trim() });
  };

  const handleSelectFunnyName = (funnyName: string) => {
    setNickname(funnyName);
    setError('');
  };

  const sortedNames = [...FUNNY_NAMES].sort((a, b) => {
    const aUsed = usedNicknames.some((un) => un.trim().toLowerCase() === a.trim().toLowerCase());
    const bUsed = usedNicknames.some((un) => un.trim().toLowerCase() === b.trim().toLowerCase());
    if (aUsed && !bUsed) return 1;
    if (!aUsed && bUsed) return -1;
    return 0;
  });

  return (
    <div className="modal-overlay">
      <div className="modal-pub">
        <div className="modal-icon-large">🍻</div>
        <h3 className="modal-title">Vào Sòng Nhậu BeerVote!</h3>

        {mode === 'choose' && (
          <>
            <p className="modal-desc">
              Chọn cách tham gia để bắt đầu bình chọn và chém gió cùng anh em.
            </p>

            <div className="join-mode-divider">
              <span>Đăng nhập nhanh</span>
            </div>

            <div className="flex justify-center mb-4">
              {isVerifying ? (
                <div className="text-secondary text-[0.9rem] p-4">Đang xác thực Google...</div>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleCredential}
                  onError={() =>
                    setGoogleError(
                      'Đăng nhập Google thất bại. Thử lại hoặc tham gia với tư cách khách!'
                    )
                  }
                  text="continue_with"
                  shape="rectangular"
                  theme="filled_black"
                  size="large"
                  width="280"
                />
              )}
            </div>

            {googleError && (
              <div className="modal-error-box animate-fade-in mb-4">⚠️ {googleError}</div>
            )}

            <div className="join-mode-divider">
              <span>Hoặc tham gia với tư cách Khách</span>
            </div>

            <button
              className="btn-secondary w-full justify-center min-h-[44px]"
              onClick={() => setMode('guest')}
            >
              👤 Tiếp Tục Không Cần Đăng Nhập
            </button>
          </>
        )}

        {mode === 'guest' && (
          <>
            <p className="modal-desc">
              Cung cấp thông tin của bạn để bắt đầu tham gia bình chọn, đề xuất quán nhậu và chém
              gió cùng anh em.
            </p>
            <form onSubmit={handleSubmit}>
              {error && <div className="modal-error-box animate-fade-in">⚠️ {error}</div>}

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

              <div className="mb-6">
                <span className="funny-name-label">
                  💡 Gợi ý biệt danh chưa sử dụng (✨ là còn trống):
                </span>
                <div className="funny-name-scroll">
                  {sortedNames.map((fn, idx) => {
                    const isUsed = usedNicknames.some(
                      (un) => un.trim().toLowerCase() === fn.trim().toLowerCase()
                    );
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={isUsed ? 'badge-funny-used' : 'badge-funny-unused'}
                        onClick={() => !isUsed && handleSelectFunnyName(fn)}
                        disabled={isUsed}
                        title={
                          isUsed
                            ? 'Biệt danh này đã có người chọn trong kèo nhậu này!'
                            : 'Bấm để chọn biệt danh này'
                        }
                      >
                        {isUsed ? `${fn} 🛑 (Đã dùng)` : `✨ ${fn}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-actions-vertical gap-2">
                <button type="submit" className="btn-primary">
                  🍻 XÁC NHẬN THÔNG TIN
                </button>
                <button type="button" className="btn-secondary" onClick={() => setMode('choose')}>
                  ← Quay Lại
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
