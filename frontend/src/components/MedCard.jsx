export default function MedCard({ med, onSetReminder }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>
            {med.medication_name}
          </p>
          {med.doctor_name && (
            <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>
              Prescribed by Dr. {med.doctor_name}
            </p>
          )}
        </div>

        {med.reminders_active ? (
          <span
            style={{
              background:   '#d4edda',
              color:        'var(--green)',
              fontSize:     12,
              fontWeight:   600,
              padding:      '3px 10px',
              borderRadius: 20,
              whiteSpace:   'nowrap',
            }}
          >
            ✓ Reminders On
          </span>
        ) : (
          <span
            style={{
              background:   '#fff3cd',
              color:        '#856404',
              fontSize:     12,
              fontWeight:   600,
              padding:      '3px 10px',
              borderRadius: 20,
              whiteSpace:   'nowrap',
            }}
          >
            Setup needed
          </span>
        )}
      </div>

      {med.reminders_active && (
        <div
          style={{
            background:   'var(--gray-100)',
            borderRadius: 6,
            padding:      '8px 12px',
            fontSize:     13,
            color:        'var(--gray-600)',
          }}
        >
          <p>Every {med.reminder_interval_hours} hours · First dose: {med.first_dose_time}</p>
          <p style={{ marginTop: 2 }}>Schedule: {med.dosage_notation}</p>
        </div>
      )}

      {!med.reminders_active && onSetReminder && (
        <button
          className="btn btn--outline btn--sm"
          style={{ marginTop: 8 }}
          onClick={() => onSetReminder(med)}
        >
          🔔 Set Reminders
        </button>
      )}

      {med.notes && (
        <p style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 8, fontStyle: 'italic' }}>
          Note: {med.notes}
        </p>
      )}
    </div>
  );
}
