export default function HospitalCard({ hospital, selected, onClick }) {
  return (
    <div
      className="hospital-card"
      onClick={() => onClick(hospital)}
      style={{
        border:     `${selected ? 2 : 1}px solid var(--blue)`,
        marginBottom: 10,
        position:   'relative',
        transition: 'all 0.15s',
      }}
    >
      <div className="hospital-card__name">{hospital.name}</div>
      <div className="hospital-card__meta">
        {hospital.town}, {hospital.county}
        {hospital.phone && ` · ${hospital.phone}`}
      </div>
      <div className="hospital-card__dist">
        📍 {hospital.distance_km} km away · ⏱ {hospital.travel_time}
      </div>

      {selected && (
        <span
          style={{
            position:   'absolute',
            top:        12,
            right:      12,
            color:      'var(--blue)',
            fontWeight: 700,
            fontSize:   18,
          }}
        >
          ✓
        </span>
      )}
    </div>
  );
}
