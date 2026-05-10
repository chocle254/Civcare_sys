import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNearbyHospitals } from '../../api/hospitals';
import useLocation from '../../hooks/useLocation';

export default function HospitalSelect() {
  const navigate = useNavigate();
  
  // This is where getLocation is first created!
  const { coords, error: locError, 
          loading: locLoading, 
          getLocation } = useLocation();

  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  // 1. Trigger the location hook
  useEffect(() => {
    getLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Fetch hospitals once we have coords
  useEffect(() => {
    if (!coords) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getNearbyHospitals(coords.lat, coords.lon);
        setHospitals(res.data);
      } catch {
        setError('Could not load hospitals. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [coords]);
  

  const handleSelect = (hospital) => setSelected(hospital);

  const handleConfirm = () => {
    if (!selected) return;
    localStorage.setItem('civtech_hospital', JSON.stringify(selected));
    navigate('/arrival');
  };

  return (
    <div className="page">
      <div className="header">
        <div>
          <div className="header__logo">CivTech Care</div>
          <div className="header__sub">Select a Hospital</div>
        </div>
        <button
          className="btn btn--ghost btn--sm"
          style={{ width: 'auto' }}
          onClick={() => navigate('/chat')}
        >
          ← Back
        </button>
      </div>

      <div className="container" style={{ paddingTop: 20 }}>

        {/* Location error */}
        {locError && (
          <div className="alert alert--error">
            {locError}
            <button
              className="btn btn--outline btn--sm"
              style={{ marginTop: 8 }}
              onClick={getLocation}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading location */}
        {locLoading && (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div className="loader" style={{ padding: 0, marginBottom: 12 }}>
              <div className="spinner" />
            </div>
            <p style={{ fontSize: 14, color: 'var(--gray-600)' }}>
              Getting your location...
            </p>
          </div>
        )}

        {/* Loading hospitals */}
        {loading && (
          <div className="loader"><div className="spinner" /></div>
        )}

        {/* Error */}
        {error && <div className="alert alert--error">{error}</div>}

        {/* Hospital list */}
        {!loading && hospitals.length > 0 && (
          <>
            <p style={{
              fontSize: 13,
              color: 'var(--gray-600)',
              marginBottom: 14,
            }}>
              {hospitals.length} hospitals found near you. Select one to continue.
            </p>

            {hospitals.map((h) => (
              <div
                key={h.id}
                className="hospital-card"
                onClick={() => handleSelect(h)}
                style={{
                  border: selected?.id === h.id
                    ? '2px solid var(--blue)'
                    : '1px solid var(--blue)',
                  marginBottom: 10,
                  position: 'relative',
                }}
              >
                <div className="hospital-card__name">{h.name}</div>
                <div className="hospital-card__meta">
                  {h.town}, {h.county}
                  {h.phone && ` · ${h.phone}`}
                </div>
                <div className="hospital-card__dist">
                  📍 {h.distance_km} km away · ⏱ {h.travel_time}
                </div>

                {selected?.id === h.id && (
                  <span style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    color: 'var(--blue)',
                    fontWeight: 700,
                    fontSize: 18,
                  }}>
                    ✓
                  </span>
                )}
              </div>
            ))}
          </>
        )}

        {/* No hospitals found */}
        {!loading && !locLoading && coords && hospitals.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>🏥</p>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>
              No hospitals found nearby
            </p>
            <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>
              No CivTech-registered hospitals were found in your area yet.
              Please speak to a doctor via consultation instead.
            </p>
            <button
              className="btn btn--primary"
              style={{ marginTop: 16 }}
              onClick={() => navigate('/consultation')}
            >
              Speak to a Doctor Online
            </button>
          </div>
        )}

        {/* Confirm button */}
        {selected && (
          <div style={{
            position: 'sticky',
            bottom: 16,
            marginTop: 12,
          }}>
            <div style={{
              background: 'var(--white)',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius)',
              padding: '12px 16px',
              marginBottom: 10,
              fontSize: 14,
            }}>
              <p style={{ fontWeight: 700, marginBottom: 2 }}>{selected.name}</p>
              <p style={{ color: 'var(--gray-600)', fontSize: 13 }}>
                {selected.distance_km} km · {selected.travel_time}
              </p>
            </div>
            <button className="btn btn--primary" onClick={handleConfirm}>
              Confirm This Hospital
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
