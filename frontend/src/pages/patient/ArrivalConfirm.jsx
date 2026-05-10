import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { confirmArrival } from '../../api/triage';

export default function ArrivalConfirm() {
  const navigate  = useNavigate();
  const hospital  = JSON.parse(localStorage.getItem('civtech_hospital') || '{}');
  const patient   = JSON.parse(localStorage.getItem('civtech_patient')  || '{}');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const apptId = localStorage.getItem('civtech_appointment_id');
      await confirmArrival({
        appointment_id: apptId,
        patient_id:     patient.id,
      });
      setConfirmed(true);
    } catch (err) {
      setError('Could not confirm arrival. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div className="page">
        <div className="header">
          <div>
            <div className="header__logo">CivTech Care</div>
            <div className="header__sub">You are checked in</div>
          </div>
        </div>
        <div className="container">
          <div className="card" style={{ marginTop: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Arrival Confirmed
            </p>
            <p style={{ color: 'var(--gray-600)', marginBottom: 24 }}>
              You have been added to the queue at{' '}
              <strong>{hospital.name}</strong>. A doctor will call you
              shortly. Please remain in the waiting area.
            </p>
            <div
              style={{
                background: 'var(--blue-light)',
                borderRadius: 'var(--radius)',
                padding: 16,
                marginBottom: 24,
              }}
            >
              <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                Your AI health summary has been sent to the doctor.
                They can see your symptoms and medical history before
                you even sit down.
              </p>
            </div>
            <button
              className="btn btn--outline"
              onClick={() => navigate('/medications')}
            >
              View My Medications
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="header">
        <div>
          <div className="header__logo">CivTech Care</div>
          <div className="header__sub">Confirm Arrival</div>
        </div>
      </div>

      <div className="container">
        <div className="card" style={{ marginTop: 32 }}>
          <p className="card__title">You selected</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue-dark)', marginBottom: 4 }}>
            {hospital.name}
          </p>
          <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 24 }}>
            {hospital.town}, {hospital.county} · {hospital.distance_km} km away
          </p>

          {error && <div className="alert alert--error">{error}</div>}

          <div
            style={{
              background: 'var(--blue-light)',
              borderRadius: 'var(--radius)',
              padding: 14,
              marginBottom: 20,
              fontSize: 14,
              color: 'var(--gray-600)',
            }}
          >
            Once you arrive at the hospital, tap the button below
            so the doctor knows you are here.
          </div>

          <button
            className="btn btn--success"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Confirming...' : '✅ I Have Arrived'}
          </button>

          <button
            className="btn btn--ghost"
            style={{ marginTop: 10 }}
            onClick={() => navigate('/chat')}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
