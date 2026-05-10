import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../../api/client';

export default function Verdict() {
  const { id }   = useParams();   // appointment id
  const navigate = useNavigate();
  const doctor   = JSON.parse(localStorage.getItem('civtech_doctor') || '{}');

  const [diagnosis,  setDiagnosis]  = useState('');
  const [severity,   setSeverity]   = useState('moderate');
  const [notes,      setNotes]      = useState('');
  const [meds,       setMeds]       = useState([{ name: '', notes: '' }]);
  const [aiRating,   setAiRating]   = useState(0);
  const [aiHover,    setAiHover]    = useState(0);
  const [aiComment,  setAiComment]  = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const addMed = () => setMeds([...meds, { name: '', notes: '' }]);

  const updateMed = (i, field, value) =>
    setMeds(meds.map((m, idx) => idx === i ? { ...m, [field]: value } : m));

  const removeMed = (i) => setMeds(meds.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!diagnosis.trim()) {
      setError('Please enter a diagnosis.');
      return;
    }
    if (aiRating === 0) {
      setError('Please rate the AI triage accuracy before submitting.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await client.post('/verdict/submit', {
        doctor_id:          doctor.id,
        patient_id:         localStorage.getItem('civtech_viewing_patient'),
        appointment_id:     id,
        diagnosis,
        severity,
        notes,
        prescriptions:      meds.filter((m) => m.name.trim()),
        ai_accuracy_rating: aiRating,
        ai_rating_comment:  aiComment,
      });
      navigate('/doctor/dashboard');
    } catch {
      setError('Could not submit verdict. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="header">
        <div>
          <div className="header__logo">CivTech Care</div>
          <div className="header__sub">Submit Verdict</div>
        </div>
        <button
          className="btn btn--ghost btn--sm"
          style={{ width: 'auto' }}
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>

      <div className="container" style={{ paddingTop: 20 }}>
        {error && <div className="alert alert--error">{error}</div>}

        {/* ── Diagnosis ── */}
        <div className="card">
          <p className="card__title">Diagnosis</p>

          <div className="form-group">
            <label className="label">Diagnosis *</label>
            <textarea
              className="input"
              placeholder="Enter your clinical diagnosis..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="label">Severity</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['mild', 'moderate', 'severe'].map((s) => (
                <button
                  key={s}
                  className={`btn btn--sm ${severity === s ? 'btn--primary' : 'btn--outline'}`}
                  style={{ flex: 1 }}
                  onClick={() => setSeverity(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Additional Notes</label>
            <textarea
              className="input"
              placeholder="Any additional clinical notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* ── Prescriptions ── */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p className="card__title" style={{ marginBottom: 0 }}>Prescriptions</p>
            <button className="btn btn--outline btn--sm" onClick={addMed}>
              + Add
            </button>
          </div>

          <div
            style={{
              background: 'var(--blue-light)',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 13,
              color: 'var(--gray-600)',
              marginBottom: 14,
            }}
          >
            Write the medication name only. The patient will input the
            dosage schedule from pharmacy guidance.
          </div>

          {meds.map((med, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 8,
                marginBottom: 10,
                alignItems: 'start',
              }}
            >
              <div>
                <input
                  className="input"
                  placeholder={`Medication ${i + 1} name`}
                  value={med.name}
                  onChange={(e) => updateMed(i, 'name', e.target.value)}
                  style={{ marginBottom: 6 }}
                />
                <input
                  className="input"
                  placeholder="Notes (optional)"
                  value={med.notes}
                  onChange={(e) => updateMed(i, 'notes', e.target.value)}
                />
              </div>
              {meds.length > 1 && (
                <button
                  className="btn btn--danger btn--sm"
                  style={{ marginTop: 4 }}
                  onClick={() => removeMed(i)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* ── AI Accuracy Rating ── */}
        <div className="card">
          <p className="card__title">Rate AI Triage Accuracy *</p>
          <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 14 }}>
            How accurate was the AI's preliminary assessment compared
            to your clinical findings? Your rating helps train and improve the AI.
          </p>

          <div className="stars" style={{ marginBottom: 14 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star ${star <= (aiHover || aiRating) ? 'filled' : ''}`}
                onClick={() => setAiRating(star)}
                onMouseEnter={() => setAiHover(star)}
                onMouseLeave={() => setAiHover(0)}
              >
                ★
              </span>
            ))}
          </div>

          {aiRating > 0 && (
            <div style={{ marginBottom: 0 }}>
              <label className="label">What did the AI get wrong? (optional)</label>
              <textarea
                className="input"
                placeholder="Describe any inaccuracies in the AI assessment..."
                value={aiComment}
                onChange={(e) => setAiComment(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        <button
          className="btn btn--success"
          onClick={handleSubmit}
          disabled={loading}
          style={{ marginBottom: 24 }}
        >
          {loading ? 'Submitting...' : 'Submit Verdict & Complete Case'}
        </button>
      </div>
    </div>
  );
}
