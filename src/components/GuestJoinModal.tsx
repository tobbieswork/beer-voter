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
  onSubmit: (data: { id?: string; nickname: string; realName: string; username: string }) => void;
  onGoogleSuccess: (data: {
    sub: string;
    email: string;
    name: string;
    given_name: string;
    picture: string;
    credential: string;
  }) => void;
  usedNicknames?: string[];
}

export default function GuestJoinModal({
  isOpen,
  onSubmit,
  onGoogleSuccess,
  usedNicknames = [],
}: GuestJoinModalProps) {
  const [mode, setMode] = useState<'choose' | 'guest' | 'guest-login'>('choose');
  const [nickname, setNickname] = useState('');
  const [realName, setRealName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        credential: response.credential,
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
          credential: response.credential,
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

  const handleSubmit = async (e: FormEvent) => {
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
    if (!password || password.length < 4) {
      setError('Vui lòng nhập mật khẩu tối thiểu 4 ký tự để bảo vệ tài khoản!');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          realName: realName.trim(),
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Đăng ký tài khoản Khách thất bại!');
      }

      onSubmit({
        id: data.id,
        nickname: data.nickname,
        realName: data.realName,
        username: data.username,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể đăng ký Khách mới. Thử lại nhé!';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Vui lòng nhập Tên đăng nhập hoặc Email của bạn!');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu!');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Đăng nhập Khách cũ thất bại!');
      }

      onSubmit({
        id: data.id,
        nickname: data.nickname,
        realName: data.realName,
        username: data.username,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sai tên đăng nhập hoặc mật khẩu!';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="modal-pub" role="dialog" aria-modal="true" aria-labelledby="join-modal-title">
        <div className="modal-pub-body">
          <div className="modal-icon-large">🍻</div>
          <h3 className="modal-title" id="join-modal-title">
            Vào Sòng Nhậu BeerVote!
          </h3>

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
                    ux_mode="redirect"
                    login_uri={`${window.location.origin}/api/auth/google/callback`}
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
                <span>Hoặc dành cho Khách (Chiến Hữu)</span>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  className="btn-primary w-full justify-center min-h-[44px]"
                  onClick={() => {
                    setError('');
                    setPassword('');
                    setShowPassword(false);
                    setMode('guest');
                  }}
                >
                  👤 Tạo Tài Khoản Khách Mới
                </button>
                <button
                  className="btn-secondary w-full justify-center min-h-[44px]"
                  onClick={() => {
                    setError('');
                    setPassword('');
                    setShowPassword(false);
                    setMode('guest-login');
                  }}
                >
                  🔑 Đăng Nhập Khách Cũ (Đa thiết bị)
                </button>
              </div>
            </>
          )}

          {mode === 'guest' && (
            <>
              <p className="modal-desc">
                Cung cấp thông tin của bạn và tạo mật khẩu để có thể khôi phục tài khoản trên mọi
                thiết bị khác.
              </p>
              <form onSubmit={handleSubmit}>
                {error && <div className="modal-error-box animate-fade-in">⚠️ {error}</div>}

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
                    autoFocus
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="guest-password">Mật khẩu bảo mật</label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="guest-password"
                      placeholder="Mật khẩu tối thiểu 4 ký tự..."
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      minLength={4}
                      className="w-full pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 bg-transparent border-none text-base cursor-pointer outline-none select-none p-0 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                    >
                      {showPassword ? '👁️' : '🙈'}
                    </button>
                  </div>
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
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'ĐANG ĐĂNG KÝ...' : '🍻 XÁC NHẬN ĐĂNG KÝ'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setError('');
                      setPassword('');
                      setShowPassword(false);
                      setMode('guest-login');
                    }}
                  >
                    🔑 Bạn đã có tài khoản cũ? Đăng Nhập
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setError('');
                      setPassword('');
                      setShowPassword(false);
                      setMode('choose');
                    }}
                  >
                    ← Quay Lại
                  </button>
                </div>
              </form>
            </>
          )}

          {mode === 'guest-login' && (
            <>
              <p className="modal-desc">
                Nhập tên đăng nhập và mật khẩu Khách cũ của bạn để đồng bộ toàn bộ lịch sử
                vote/chat.
              </p>
              <form onSubmit={handleLoginSubmit}>
                {error && <div className="modal-error-box animate-fade-in">⚠️ {error}</div>}

                <div className="form-group">
                  <label htmlFor="login-username">Tên đăng nhập / Email cũ</label>
                  <input
                    type="text"
                    id="login-username"
                    placeholder="Ví dụ: hung99 hoặc hung.nguyen@gmail.com..."
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError('');
                    }}
                    maxLength={50}
                    autoFocus
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="login-password">Mật khẩu tài khoản</label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="login-password"
                      placeholder="Nhập mật khẩu..."
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      className="w-full pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 bg-transparent border-none text-base cursor-pointer outline-none select-none p-0 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                    >
                      {showPassword ? '👁️' : '🙈'}
                    </button>
                  </div>
                </div>

                <div className="form-actions-vertical gap-2 mt-4">
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'ĐANG ĐĂNG NHẬP...' : '🔓 ĐĂNG NHẬP KHÁCH CŨ'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setError('');
                      setPassword('');
                      setShowPassword(false);
                      setMode('guest');
                    }}
                  >
                    👤 Tạo Tài Khoản Khách Mới
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setError('');
                      setPassword('');
                      setShowPassword(false);
                      setMode('choose');
                    }}
                  >
                    ← Quay Lại
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
