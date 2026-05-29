import { User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  onGoHome: () => void;
  onSignOut?: () => void;
}

export default function Header({ currentUser, onGoHome, onSignOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-glass bg-bg-primary/75 backdrop-blur-md px-4 py-3 sm:px-8 sm:py-4 max-[360px]:px-2 max-[360px]:py-2">
      <button
        type="button"
        onClick={onGoHome}
        className="-ml-2 flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-gold"
        aria-label="Trở về trang chủ"
      >
        <span className="text-2xl sm:text-3xl animate-rock max-[360px]:text-xl">🍻</span>
        <span className="bg-gradient-to-r from-white to-gold bg-clip-text text-xl font-extrabold text-transparent sm:text-2xl max-[360px]:hidden">
          BeerVote
        </span>
      </button>

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
            className={`role-badge max-[360px]:hidden ${currentUser.authMethod === 'google' ? 'role-badge.google' : 'role-badge.guest'}`}
          >
            <span className="hidden text-current sm:inline">
              {currentUser.authMethod === 'google' ? 'Google' : 'Chiến Hữu'}
            </span>
            <span className="sm:hidden">✓</span>
          </span>

          {onSignOut && (
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(248,113,113,0.08)] text-text-muted transition-colors hover:bg-[rgba(248,113,113,0.2)] hover:text-red-light focus-visible:ring-2 focus-visible:ring-gold max-[360px]:h-5 max-[360px]:w-5"
              onClick={onSignOut}
              title="Đăng xuất"
              aria-label="Đăng xuất"
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
    </header>
  );
}
