const RISK_CONFIG = {
  critical: { label: '🔴 Critical', cls: 'badge--critical' },
  moderate: { label: '🟡 Moderate', cls: 'badge--moderate' },
  low:      { label: '🟢 Low',      cls: 'badge--low'      },
};

export default function RiskBadge({ risk }) {
  const config = RISK_CONFIG[risk?.toLowerCase()] || RISK_CONFIG.moderate;

  return (
    <span className={`badge ${config.cls}`}>
      {config.label}
    </span>
  );
}
