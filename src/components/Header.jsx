

export default function Header({ currentUser, onGoHome }) {
  return (
    <header className="app-header">
      <div className="header-logo" onClick={onGoHome}>
        <span className="logo-icon">🍻</span>
        <span>BeerVote</span>
      </div>

      <div className="header-actions">
        {currentUser && (
          <div className="user-badge">
            <span style={{ fontSize: '1.1rem' }}>🍺</span>
            <span>
              <strong>{currentUser.nickname || currentUser.name}</strong>
              {currentUser.realName && (
                <span className="user-realname-header" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.4rem', fontWeight: 400 }}>
                  ({currentUser.realName})
                </span>
              )}
            </span>
            <span className="role-badge guest">
              Chiến Hữu
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
