import { useState, FormEvent } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';

const VI_FUNNY_NAMES = [
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

const EN_FUNNY_NAMES = [
  'Beer Master 🍺',
  'Snack Destroyer 🍗',
  'Sidewalk Assassin 🛵',
  'Party Pooper 🛑',
  'Wife Evader 🤫',
  'Yeast Overlord 🍻',
  'Bottoms Up Knight 🥂',
  'Plate Cleanser 🍤',
  'Beer Table Emperor 👑',
  'One-Liter Thor ⚡',
  'Cheers Champion 🛡️',
  'Gluttony Hero 🌭',
  'Pub Phantom 👻',
  'Gulp Godfather 👴',
  'Soft Drink Professional 🥤',
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
  const { t, i18n } = useTranslation();
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

  const getFunnyNames = () => (i18n.language === 'en' ? EN_FUNNY_NAMES : VI_FUNNY_NAMES);

  const handleGoogleCredential = async (response: CredentialResponse) => {
    if (!response.credential) {
      setGoogleError(
        i18n.language === 'en'
          ? 'No profile details received from Google. Try again!'
          : 'Không nhận được thông tin từ Google. Thử lại nhé!'
      );
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
          i18n.language === 'en'
            ? 'Google sign in failed. Please try again or join as guest!'
            : 'Đăng nhập Google thất bại. Vui lòng thử lại hoặc tham gia với tư cách khách!'
        );
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError(
        i18n.language === 'en'
          ? 'Please enter a nickname so friends can recognize you!'
          : 'Vui lòng nhập biệt danh để anh em dễ gọi nhé!'
      );
      return;
    }
    if (!realName.trim()) {
      setError(
        i18n.language === 'en'
          ? 'Please provide your real name to distinguish from others!'
          : 'Vui lòng cung cấp tên thật để phân biệt biệt danh!'
      );
      return;
    }
    if (!username.trim()) {
      setError(
        i18n.language === 'en'
          ? 'Please enter a username or email!'
          : 'Vui lòng nhập Tên đăng nhập hoặc Email để phân biệt với người trùng tên!'
      );
      return;
    }
    if (!password || password.length < 4) {
      setError(
        i18n.language === 'en'
          ? 'Please enter a password with at least 4 characters!'
          : 'Vui lòng nhập mật khẩu tối thiểu 4 ký tự để bảo vệ tài khoản!'
      );
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
        throw new Error(
          data.message ||
            (i18n.language === 'en'
              ? 'Guest account registration failed!'
              : 'Đăng ký tài khoản Khách thất bại!')
        );
      }

      onSubmit({
        id: data.id,
        nickname: data.nickname,
        realName: data.realName,
        username: data.username,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : i18n.language === 'en'
            ? 'Failed to register guest account. Try again!'
            : 'Không thể đăng ký Khách mới. Thử lại nhé!';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError(
        i18n.language === 'en'
          ? 'Please enter your username or email!'
          : 'Vui lòng nhập Tên đăng nhập hoặc Email của bạn!'
      );
      return;
    }
    if (!password) {
      setError(i18n.language === 'en' ? 'Please enter your password!' : 'Vui lòng nhập mật khẩu!');
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
        throw new Error(
          data.message ||
            (i18n.language === 'en' ? 'Guest login failed!' : 'Đăng nhập Khách cũ thất bại!')
        );
      }

      onSubmit({
        id: data.id,
        nickname: data.nickname,
        realName: data.realName,
        username: data.username,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : i18n.language === 'en'
            ? 'Incorrect username or password!'
            : 'Sai tên đăng nhập hoặc mật khẩu!';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectFunnyName = (funnyName: string) => {
    setNickname(funnyName);
    setError('');
  };

  const currentFunnyNames = getFunnyNames();
  const sortedNames = [...currentFunnyNames].sort((a, b) => {
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
            {i18n.language === 'en' ? 'Welcome to BeerVote!' : 'Vào Sòng Nhậu BeerVote!'}
          </h3>

          {mode === 'choose' && (
            <>
              <p className="modal-desc">
                {i18n.language === 'en'
                  ? 'Select how to join to start voting and chatting with friends.'
                  : 'Chọn cách tham gia để bắt đầu bình chọn và chém gió cùng anh em.'}
              </p>

              <div className="join-mode-divider">
                <span>{i18n.language === 'en' ? 'Quick Sign In' : 'Đăng nhập nhanh'}</span>
              </div>

              <div className="flex flex-col items-center gap-3 mb-4">
                {isVerifying ? (
                  <div className="text-secondary text-[0.9rem] p-4">
                    {i18n.language === 'en' ? 'Verifying...' : 'Đang xác thực...'}
                  </div>
                ) : (
                  <>
                    <GoogleLogin
                      onSuccess={handleGoogleCredential}
                      onError={() =>
                        setGoogleError(
                          i18n.language === 'en'
                            ? 'Google sign in failed. Try again or join as guest!'
                            : 'Đăng nhập Google thất bại. Vui lòng thử lại hoặc tham gia với tư cách khách!'
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

                    {import.meta.env.VITE_GITHUB_CLIENT_ID && (
                      <a
                        href={`/api/auth/github/login?eventId=${new URLSearchParams(window.location.search).get('eventId') || ''}`}
                        className="btn-github"
                      >
                        <svg
                          height="20"
                          aria-hidden="true"
                          viewBox="0 0 16 16"
                          version="1.1"
                          width="20"
                          fill="currentColor"
                        >
                          <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 3.1 1.07.01.66.01 1.29.01 1.47 0 .21-.15.46-.55.38A8.013 8.013 0 0 1 0 8c0-4.42 3.58-8 8-8z"></path>
                        </svg>
                        <span>Continue with GitHub</span>
                      </a>
                    )}
                  </>
                )}
              </div>

              {googleError && (
                <div className="modal-error-box animate-fade-in mb-4">⚠️ {googleError}</div>
              )}

              <div className="join-mode-divider">
                <span>
                  {i18n.language === 'en' ? 'Or Guest Partner' : 'Hoặc dành cho Khách (Chiến Hữu)'}
                </span>
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
                  👤{' '}
                  {i18n.language === 'en' ? 'Create New Guest Account' : 'Tạo Tài Khoản Khách Mới'}
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
                  🔑{' '}
                  {i18n.language === 'en'
                    ? 'Login Old Guest Account'
                    : 'Đăng Nhập Khách Cũ (Đa thiết bị)'}
                </button>
              </div>
            </>
          )}

          {mode === 'guest' && (
            <>
              <p className="modal-desc">
                {i18n.language === 'en'
                  ? 'Provide details and set a password to restore account on any device.'
                  : 'Cung cấp thông tin của bạn và tạo mật khẩu để có thể khôi phục tài khoản trên mọi thiết bị khác.'}
              </p>
              <form onSubmit={handleSubmit}>
                {error && <div className="modal-error-box animate-fade-in">⚠️ {error}</div>}

                <div className="form-group">
                  <label htmlFor="guest-username">
                    {i18n.language === 'en' ? 'Username / Email' : 'Tên đăng nhập / Email'}
                  </label>
                  <input
                    type="text"
                    id="guest-username"
                    placeholder={
                      i18n.language === 'en'
                        ? 'e.g. tom99 or tom.smith@gmail.com...'
                        : 'Ví dụ: hung99 hoặc hung.nguyen@gmail.com...'
                    }
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
                  <label htmlFor="guest-password">
                    {i18n.language === 'en' ? 'Security Password' : 'Mật khẩu bảo mật'}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="guest-password"
                      placeholder={
                        i18n.language === 'en'
                          ? 'Minimum 4 characters...'
                          : 'Mật khẩu tối thiểu 4 ký tự...'
                      }
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
                  <label htmlFor="guest-realname">{t('guest_modal.realname_label')}</label>
                  <input
                    type="text"
                    id="guest-realname"
                    placeholder={
                      i18n.language === 'en' ? 'e.g. Tom Smith...' : 'Ví dụ: Nguyễn Văn Hùng...'
                    }
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
                  <label htmlFor="guest-nickname">{t('guest_modal.nickname_label')}</label>
                  <input
                    type="text"
                    id="guest-nickname"
                    placeholder={
                      i18n.language === 'en'
                        ? 'e.g. Snack Destroyer, Beer Master...'
                        : 'Ví dụ: Chiến Thần Diệt Mồi, Hùng Beer Thủ...'
                    }
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
                    {i18n.language === 'en'
                      ? '💡 Suggested unused nicknames (✨ is available):'
                      : '💡 Gợi ý biệt danh chưa sử dụng (✨ là còn trống):'}
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
                              ? i18n.language === 'en'
                                ? 'This nickname is already taken in this party!'
                                : 'Biệt danh này đã có người chọn trong kèo nhậu này!'
                              : i18n.language === 'en'
                                ? 'Click to select this nickname'
                                : 'Bấm để chọn biệt danh này'
                          }
                        >
                          {isUsed
                            ? i18n.language === 'en'
                              ? `${fn} 🛑 (Used)`
                              : `${fn} 🛑 (Đã dùng)`
                            : `✨ ${fn}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-actions-vertical gap-2">
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting
                      ? i18n.language === 'en'
                        ? 'REGISTERING...'
                        : 'ĐANG ĐĂNG KÝ...'
                      : `🍻 ${i18n.language === 'en' ? 'CONFIRM REGISTER' : 'XÁC NHẬN ĐĂNG KÝ'}`}
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
                    🔑{' '}
                    {i18n.language === 'en'
                      ? 'Already have guest account? Sign In'
                      : 'Bạn đã có tài khoản cũ? Đăng Nhập'}
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
                    {t('create_event.cancel')}
                  </button>
                </div>
              </form>
            </>
          )}

          {mode === 'guest-login' && (
            <>
              <p className="modal-desc">
                {i18n.language === 'en'
                  ? 'Enter your old Guest username and password to restore all vote/chat history.'
                  : 'Nhập tên đăng nhập và mật khẩu Khách cũ của bạn để đồng bộ toàn bộ lịch sử vote/chat.'}
              </p>
              <form onSubmit={handleLoginSubmit}>
                {error && <div className="modal-error-box animate-fade-in">⚠️ {error}</div>}

                <div className="form-group">
                  <label htmlFor="login-username">
                    {i18n.language === 'en' ? 'Username / Old Email' : 'Tên đăng nhập / Email cũ'}
                  </label>
                  <input
                    type="text"
                    id="login-username"
                    placeholder={
                      i18n.language === 'en'
                        ? 'e.g. tom99 or tom.smith@gmail.com...'
                        : 'Ví dụ: hung99 hoặc hung.nguyen@gmail.com...'
                    }
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
                  <label htmlFor="login-password">
                    {i18n.language === 'en' ? 'Password' : 'Mật khẩu tài khoản'}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="login-password"
                      placeholder={
                        i18n.language === 'en' ? 'Enter password...' : 'Nhập mật khẩu...'
                      }
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
                    {isSubmitting
                      ? i18n.language === 'en'
                        ? 'LOGGING IN...'
                        : 'ĐANG ĐĂNG NHẬP...'
                      : `🔓 ${i18n.language === 'en' ? 'GUEST SIGN IN' : 'ĐĂNG NHẬP KHÁCH CŨ'}`}
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
                    👤{' '}
                    {i18n.language === 'en'
                      ? 'Create New Guest Account'
                      : 'Tạo Tài Khoản Khách Mới'}
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
                    {t('create_event.cancel')}
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
