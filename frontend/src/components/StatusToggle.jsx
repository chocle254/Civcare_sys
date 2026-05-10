const STATUSES = [
  { key: 'available',    label: '🟢 Available',    cls: 'status-btn--available'    },
  { key: 'on_break',     label: '🟠 On Break',      cls: 'status-btn--on_break'     },
  { key: 'offline',      label: '🔴 Offline',       cls: 'status-btn--offline'      },
];

export default function StatusToggle({ current, onChange }) {
  return (
    <div className="status-bar">
      <span style={{ fontSize: 13, color: 'var(--gray-600)', marginRight: 8 }}>
        My Status:
      </span>
      {STATUSES.map((s) => (
        <button
          key={s.key}
          className={`status-btn ${s.cls} ${current === s.key ? 'active' : ''}`}
          onClick={() => onChange(s.key)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
