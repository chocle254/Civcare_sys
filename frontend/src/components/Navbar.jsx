import { useNavigate } from 'react-router-dom';

export default function Navbar({ title, subtitle, showBack = false, backPath = -1, rightContent = null }) {
  const navigate = useNavigate();

  return (
    <div className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {showBack && (
          <button
            onClick={() => navigate(backPath)}
            style={{
              background:   'none',
              border:       'none',
              color:        'var(--gray-400)',
              fontSize:     20,
              cursor:       'pointer',
              padding:      '0 4px',
              lineHeight:   1,
            }}
          >
            ←
          </button>
        )}
        <div>
          <div className="header__logo">{title || 'CivTech Care'}</div>
          {subtitle && <div className="header__sub">{subtitle}</div>}
        </div>
      </div>
      {rightContent && (
        <div>{rightContent}</div>
      )}
    </div>
  );
}
