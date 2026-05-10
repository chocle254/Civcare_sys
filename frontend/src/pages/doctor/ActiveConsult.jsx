import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { completeConsultation } from '../../api/consultation';
import client from '../../api/client';

export default function ActiveConsult() {
  const { id }   = useParams();   // consultation id
  const navigate = useNavigate();
  const doctor   = JSON.parse(localStorage.getItem('civtech_doctor') || '{}');

  const [consult,  setConsult]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [marking,  setMarking]  = useState(false);
  const [done,     setDone]     = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await client.get(`/consultation/${id}`);
        setConsult(res.data);
      } catch {
        setConsult(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleComplete = async () => {
    setMarking(true);
    try {
      await completeConsultation({ consultation_id: id, doctor_id: doctor.id });
      setDone(true);
    } catch {
      alert('Could not mark as complete. Please try again.');
    } finally {
      setMarking(false);
    }
  };

  if (loading) return (
    <div className="page">
      <div className="header"><div className="header__logo">CivTech Care</div></div>
      <div className="loader"><div className="spinner" /></div>
    </div>
  );

  if (done) return (
    <div className="page">
      <div className="header"><div className="header__logo">CivTech Care</div></div>
      <div className="container">
        <div className="card" style={{ marginTop: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Consultation Complete
          </p>
          <p style={{ color: 'var(--gray-600)', marginBottom: 24 }}>
            The case has been closed. Payment has been processed.
          </p>
          <button className="btn btn--primary" onClick={() => navigate('/doctor/dashboard')}>
            Back to Queue
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="header">
        <div>
          <div className="header__logo">CivTech Care</div>
          <div className="header__sub">Active Consultation</div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 20 }}>
        {/* ── Patient info ── */}
        <div className="card">
          <p className="card__title">Patient</p>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
            {consult?.patient_name}
          </p>
          <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 12 }}>
            📞 {consult?.patient_phone}
          </p>
          <div
            style={{
              background: 'var(--blue-light)',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 13,
              color: 'var(--gray-600)',
            }}
          >
            Call the patient directly on their number above.
            Their full health summary is available below.
          </div>
        </div>

        {/* ── MedScan clash warning if applicable ── */}
        {consult?.clash_detected && (
          <div className="alert alert--error">
            <strong>⚠️ Medication Clash Detected</strong>
            <p style={{ marginTop: 4, fontSize: 13 }}>{consult.clash_details}</p>
          </div>
        )}

        {/* ── Patient symptoms + history ── */}
        <div className="card">
          <p className="card__title">Reason for Consultation</p>
          <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 12 }}>
            {consult?.symptoms_summary || '—'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'var(--gray-100)', borderRadius: 6, padding: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 4 }}>ALLERGIES</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: consult?.allergies ? 'var(--red)' : 'inherit' }}>
                {consult?.allergies || 'None on record'}
              </p>
            </div>
            <div style={{ background: 'var(--gray-100)', borderRadius: 6, padding: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 4 }}>CURRENT MEDS</p>
              <p style={{ fontSize: 13 }}>
                {consult?.current_medications?.join(', ') || 'None'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Payment status ── */}
        <div className="card">
          <p className="card__title">Payment</p>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--gray-600)', fontSize: 14 }}>Consultation Fee</span>
            <strong style={{ fontSize: 16 }}>KES {consult?.fee_amount}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ color: 'var(--gray-600)', fontSize: 14 }}>Status</span>
            <span style={{
              color: 'var(--green)',
              fontWeight: 700,
              fontSize: 14,
            }}>
              ✓ {consult?.payment_status === 'paid' ? 'Paid — In Escrow' : consult?.payment_status}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 10 }}>
            Payment is released to you when you mark the consultation complete.
          </p>
        </div>

        {/* ── Mark complete ── */}
        <button
          className="btn btn--success"
          onClick={handleComplete}
          disabled={marking}
          style={{ marginBottom: 12 }}
        >
          {marking ? 'Processing...' : '✅ Mark Consultation Complete'}
        </button>

        <button
          className="btn btn--ghost"
          onClick={() => navigate('/doctor/dashboard')}
        >
          Back to Queue
        </button>
      </div>
    </div>
  );
}
