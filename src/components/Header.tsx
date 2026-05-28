import { User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  onGoHome: () => void;
  onSignOut?: () => void;
}

export default function Header({ currentUser, onGoHome, onSignOut }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-logo" onClick={onGoHome}>
        <span className="logo-icon">🍻</span>
        <span>BeerVote</span>
      </div>

      <div className="header-actions">
        {currentUser && (
          <div className="user-badge">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.nickname}
                className="user-avatar-img"
              />
            ) : (
              <span style={{ fontSize: '1.1rem' }}>🍺</span>
            )}
            <span>
              <strong>{currentUser.nickname || currentUser.name}</strong>
              {currentUser.realName && (
                <span
                  className="user-realname-header"
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    marginLeft: '0.4rem',
                    fontWeight: 400,
                  }}
                >
                  ({currentUser.realName})
                </span>
              )}
            </span>
            <span
              className={`role-badge ${currentUser.authMethod === 'google' ? 'google' : 'guest'}`}
            >
              {currentUser.authMethod === 'google' ? 'Google' : 'Chiến Hữu'}
            </span>
            {onSignOut && (
              <button className="btn-signout" onClick={onSignOut} title="Đăng xuất">
                ↩
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
