import { User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  onGoHome: () => void;
  onSignOut?: () => void;
}

export default function Header({ currentUser, onGoHome, onSignOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-glass bg-[rgba(10,11,13,0.75)] backdrop-blur-md px-8 py-4">
      <div
        className="flex cursor-pointer items-center gap-3 bg-gradient-to-r from-white to-gold bg-clip-text text-2xl font-extrabold text-transparent"
        onClick={onGoHome}
      >
        <span className="text-3xl animate-rock">🍻</span>
        <span>BeerVote</span>
      </div>

      <div className="flex items-center gap-4">
        {currentUser && (
          <div className="flex items-center gap-2 rounded-full border border-glass bg-white/5 px-4 py-2 text-sm">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.nickname}
                className="h-6 w-6 rounded-full border border-white/20 object-cover"
              />
            ) : (
              <span className="text-xl">🍺</span>
            )}
            <span>
              <strong>{currentUser.nickname || currentUser.name}</strong>
              {currentUser.realName && (
                <span className="hidden text-sm text-text-secondary md:inline-block">
                  {' '}
                  ({currentUser.realName})
                </span>
              )}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase ${
                currentUser.authMethod === 'google'
                  ? 'bg-[rgba(66,133,244,0.15)] border border-[rgba(66,133,244,0.3)] text-blue-300'
                  : 'bg-white/10 border border-white/15 text-white'
              }`}
            >
              {currentUser.authMethod === 'google' ? 'Google' : 'Chiến Hữu'}
            </span>
            {onSignOut && (
              <button
                className="cursor-pointer border-none bg-none text-text-muted hover:text-red transition-colors"
                onClick={onSignOut}
                title="Đăng xuất"
              >
                ↩
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
