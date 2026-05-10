import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableDoctors } from '../../api/doctors';

export default function Consultation() {
  const navigate  = useNavigate();
  const [doctors,  setDoctors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAvailableDoctors();
        setDoctors(res.data);
      } catch {
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSelect = (doctor) => {
    setSelected(doctor);
  };

  const handleProceed = () => {
    if (!selected) return;
    localStorage.setItem('civtech_consult_doctor', JSON.stringify(selected));
    navigate('/payment');
  };

  return (
    <div className="page">
      <div className="header">
        <div>
          <div className="header__logo">CivTech Care</div>
          <div className="header__sub">Available Doctors</div>
        </div>
      </div>

      <div className="container">
        <div
          style={{
            background: 'var(--blue-light)',
            borderRadius: 'var(--radius)',
            padding: 14,
            marginTop: 20,
            marginBottom: 20,
            fontSize: 14,
            color: 'var(--gray-600)',
          }}
        >
          We recommend visiting a hospital for proper care.
          If you are unable to travel, you may speak to a doctor below.
        </div>

        {loading && (
          <div className="loader">
            <div className="spinner" />
          </div>
        )}

        {!loading && doctors.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>😔</p>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>
              No doctors available right now
            </p>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 20 }}>
              All doctors are currently busy. We will notify you as
              soon as one becomes available.
            </p>
            <button className="btn btn--outline" onClick={() => navigate('/chat')}>
              Go Back
            </button>
          </div>
        )}

        {!loading && doctors.map((doc) => (
          <div
            key={doc.id}
            className="card"
            onClick={() => handleSelect(doc)}
            style={{
              cursor: 'pointer',
              border: selected?.id === doc.id
                ? '2px solid var(--blue)'
                : '1px solid var(--gray-200)',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>
                  Dr. {doc.name}
                </p>
                <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 8 }}>
                  {doc.specialisation || 'General Practitioner'}
                </p>
                <div className="status status--available">
                  <div className="status__dot" />
                  Available
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--blue-dark)',
                }}>
                  KES {doc.consultation_fee}
                </p>
                <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>per consultation</p>
              </div>
            </div>

            {selected?.id === doc.id && (
              <div style={{
                marginTop: 12,
                padding: '8px 12px',
                background: 'var(--blue-light)',
                borderRadius: 6,
                fontSize: 13,
                color: 'var(--blue)',
                fontWeight: 600,
              }}>
                ✓ Selected
              </div>
            )}
          </div>
        ))}

        {selected && (
          <div style={{ position: 'sticky', bottom: 16, marginTop: 8 }}>
            <div
              style={{
                background: 'var(--white)',
                border: '1px solid var(--gray-200)',
                borderRadius: 'var(--radius)',
                padding: '14px 16px',
                marginBottom: 10,
                fontSize: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--gray-600)' }}>Consultation fee</span>
                <strong>KES {selected.consultation_fee}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--gray-600)' }}>Doctor</span>
                <strong>Dr. {selected.name}</strong>
              </div>
            </div>
            <button className="btn btn--primary" onClick={handleProceed}>
              Proceed to Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
