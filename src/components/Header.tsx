import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  onGoHome: () => void;
  onSignOut?: () => void;
  onSignIn?: () => void;
}

export default function Header({ currentUser, onGoHome, onSignOut, onSignIn }: HeaderProps) {
  const [showQrModal, setShowQrModal] = useState(false);
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(nextLang);
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-glass bg-bg-primary/75 backdrop-blur-md px-4 py-3 sm:px-8 sm:py-4 max-[360px]:px-2 max-[360px]:py-2">
      <button
        type="button"
        onClick={onGoHome}
        className="-ml-2 flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-gold"
        aria-label={t('header.home')}
      >
        <span className="text-2xl sm:text-3xl animate-rock max-[360px]:text-xl">🍻</span>
        <span className="bg-gradient-to-r from-white to-gold bg-clip-text text-xl font-extrabold text-transparent sm:text-2xl max-[360px]:hidden">
          BeerVote
        </span>
      </button>

      <div className="flex items-center gap-2">
        {/* Nút chuyển đổi ngôn ngữ */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex h-7 items-center justify-center rounded-full border border-glass bg-white/5 px-3 text-xs font-semibold text-text-primary transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold"
          title={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
        >
          {i18n.language === 'vi' ? '🇬🇧 EN' : '🇻🇳 VI'}
        </button>

        {!currentUser && onSignIn && (
          <button
            type="button"
            onClick={onSignIn}
            className="btn-primary px-4 py-1.5 text-xs sm:text-sm rounded-full"
            style={{
              minWidth: 'auto',
              width: 'auto',
            }}
          >
            🔑 {t('header.login')}
          </button>
        )}

        {currentUser && (
          <div className="flex items-center gap-2 rounded-full border border-glass bg-white/5 px-2 py-1 sm:px-4 sm:py-2 max-[360px]:px-1 max-[360px]:py-0.5 max-[640px]:min-w-0 max-[640px]:flex-1">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt=""
                className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border border-white/20 object-cover max-[360px]:h-4 max-[360px]:w-4"
              />
            ) : (
              <span className="text-lg sm:text-xl max-[360px]:text-base">🍺</span>
            )}

            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm">
                <strong className="block truncate text-text-primary sm:inline max-[360px]:max-w-none">
                  {currentUser.nickname}
                </strong>
                {currentUser.realName && (
                  <span className="ml-1 hidden text-text-secondary md:inline">
                    ({currentUser.realName})
                  </span>
                )}
              </span>
            </div>

            <span
              className={`role-badge max-[360px]:hidden ${currentUser.authMethod === 'google' ? 'google' : 'guest'}`}
            >
              <span className="hidden text-current sm:inline">
                {currentUser.authMethod === 'google' ? t('header.google') : t('header.guest')}
              </span>
              <span className="sm:hidden">✓</span>
            </span>

            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-text-secondary transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-gold max-[360px]:h-5 max-[360px]:w-5"
              onClick={() => setShowQrModal(true)}
              title={t('header.qr_title')}
              aria-label={t('header.qr_title')}
            >
              📱
            </button>

            {onSignOut && (
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(248,113,113,0.08)] text-text-muted transition-colors hover:bg-[rgba(248,113,113,0.2)] hover:text-red-light focus-visible:ring-2 focus-visible:ring-gold max-[360px]:h-5 max-[360px]:w-5"
                onClick={onSignOut}
                title={t('header.logout')}
                aria-label={t('header.logout')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 max-[360px]:h-3 max-[360px]:w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {showQrModal && currentUser && (
        <div
          className="modal-overlay z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowQrModal(false);
          }}
        >
          <div
            className="modal-pub max-w-[400px] text-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-modal-title"
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowQrModal(false)}
              aria-label={t('header.qr_close')}
            >
              &times;
            </button>
            <div className="modal-pub-body">
              <div className="text-3xl mb-2">📱</div>
              <h3 className="modal-title" id="qr-modal-title">
                {t('header.qr_title')}
              </h3>
              <p className="modal-desc text-[0.9rem] mb-4">{t('header.qr_description_1')}</p>

              <div className="flex justify-center bg-white p-3 rounded-2xl mb-4 w-[200px] h-[200px] mx-auto shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `${window.location.origin}${window.location.pathname}?authData=${btoa(
                      unescape(encodeURIComponent(JSON.stringify(currentUser)))
                    )}`
                  )}`}
                  alt="QR Code"
                  className="w-[180px] h-[180px] object-contain"
                />
              </div>

              <div className="text-xs text-text-secondary bg-white/5 border border-glass rounded-lg p-2.5 mb-4 text-left">
                💡 {t('header.qr_description_2')}
              </div>

              <button
                type="button"
                className="btn-primary w-full justify-center"
                onClick={() => setShowQrModal(false)}
              >
                {t('header.qr_close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
