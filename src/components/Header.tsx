import { User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  onGoHome: () => void;
  onSignOut?: () => void;
}

export default function Header({ currentUser, onGoHome, onSignOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-glass bg-[rgba(10,11,13,0.75)] backdrop-blur-md px-4 py-3 sm:px-8 sm:py-4">
      <button
        onClick={onGoHome}
        className="-ml-2 flex items-center gap-2 rounded-lg p-1.0 transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-gold"
        aria-label="Trở về trang chủ"
      >
        <span className="text-2xl sm:text-3xl" style={{ animation: 'rock 3s ease-in-out infinite' }}>
          🍻
        </span>
        <span className="bg-gradient-to-r from-white to-gold bg-clip-text text-xl font-extrabold text-transparent sm:text-2xl">
          BeerVote
        </span>
      </button>

      {currentUser && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-glass bg-white/5 px-2 py-1 sm:px-4 sm:py-2">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt=""
                className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border border-white/20 object-cover"
              />
            ) : (
              <span className="text-lg sm:text-xl">🍺</span>
            )}

            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm">
                <strong className="block max-w-[80px] truncate sm:max-w-none sm:inline">
                  {currentUser.nickname || currentUser.name}
                </strong>
                {currentUser.realName && (
                  <span className="ml-1 hidden text-text-secondary md:inline">
                    ({currentUser.realName})
                  </span>
                )}
              </span>
            </div>

            <span
              className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-bold uppercase ${
                currentUser.authMethod === 'google'
                  ? 'border-[rgba(66,133,244,0.3)] bg-[rgba(66,133,244,0.15)] text-[#7ab4f5]'
                  : 'border-white/15 bg-white/10 text-white'
              }`}
            >
              <span className="hidden sm:inline">
                {currentUser.authMethod === 'google' ? 'Google' : 'Chiến Hữu'}
              </span>
              <span className="sm:hidden">✓</span>
            </span>

            {onSignOut && (
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-white/10 hover:text-red focus-visible:ring-2 focus-visible:ring-gold"
                onClick={onSignOut}
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 19l-7-7 7-7m8 14H8"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
