export default function Modal({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
  return (
    <div
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(0,0,0,0.5)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        zIndex:         999,
        padding:        16,
      }}
    >
      <div
        style={{
          background:   'var(--white)',
          borderRadius: 'var(--radius)',
          padding:      24,
          maxWidth:     380,
          width:        '100%',
          boxShadow:    '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        {title && (
          <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
            {title}
          </p>
        )}
        {message && (
          <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 20, lineHeight: 1.6 }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          {onCancel && (
            <button className="btn btn--ghost" onClick={onCancel}>
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
