export default function DoctorCard({ doctor, selected, onClick }) {
  const statusColors = {
    available:    'var(--green)',
    with_patient: 'var(--gold)',
    on_break:     'var(--orange)',
    offline:      'var(--gray-400)',
  };

  const statusLabels = {
    available:    'Available',
    with_patient: 'With a patient',
    on_break:     'On break',
    offline:      'Offline',
  };

  return (
    <div
      className="card"
      onClick={() => onClick(doctor)}
      style={{
        cursor:  'pointer',
        border:  selected
          ? '2px solid var(--blue)'
          : '1px solid var(--gray-200)',
        marginBottom: 12,
        transition:   'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>
            Dr. {doctor.name}
          </p>
          <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 8 }}>
            {doctor.specialisation || 'General Practitioner'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width:        8,
                height:       8,
                borderRadius: '50%',
                background:   statusColors[doctor.status] || 'var(--gray-400)',
                display:      'inline-block',
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>
              {statusLabels[doctor.status] || doctor.status}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue-dark)' }}>
            KES {doctor.consultation_fee}
          </p>
          <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>per consultation</p>
        </div>
      </div>

      {selected && (
        <div
          style={{
            marginTop:    12,
            padding:      '8px 12px',
            background:   'var(--blue-light)',
            borderRadius: 6,
            fontSize:     13,
            color:        'var(--blue)',
            fontWeight:   600,
          }}
        >
          ✓ Selected — proceed to payment
        </div>
      )}
    </div>
  );
}
