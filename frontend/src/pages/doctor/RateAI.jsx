import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../../api/client';

export default function RateAI() {
  const { id }   = useParams();   // appointment id
  const navigate = useNavigate();
  const doctor   = JSON.parse(localStorage.getItem('civtech_doctor') || '{}');

  const [rating,   setRating]   = useState(0);
  const [hover,    setHover]    = useState(0);
  const [comment,  setComment]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');

  const labels = {
    1: 'Very inaccurate — AI was completely off',
    2: 'Mostly inaccurate — several things wrong',
    3: 'Partially accurate — some things right',
    4: 'Mostly accurate — minor differences',
    5: 'Very accurate — matched my assessment',
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating before submitting.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await client.post('/verdict/rate-ai', {
        doctor_id:          doctor.id,
        appointment_id:     id,
        ai_accuracy_rating: rating,
        ai_rating_comment:  comment,
      });
      setDone(true);
    } catch {
      setError('Could not submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="page">
        <div className="header">
          <div className="header__logo">CivTech Care</div>
        </div>
        <div className="container">
          <div className="card" style={{ marginTop: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Rating Submitted
            </p>
            <p style={{ color: 'var(--gray-600)', marginBottom: 24 }}>
              Thank you. Your feedback is used to improve the AI triage
              accuracy for future patients.
            </p>
            <button
              className="btn btn--primary"
              onClick={() => navigate('/doctor/dashboard')}
            >
              Back to Queue
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
          <div className="header__sub">Rate AI Triage Accuracy</div>
        </div>
        <button
          className="btn btn--ghost btn--sm"
          style={{ width: 'auto' }}
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>

      <div className="container" style={{ paddingTop: 24 }}>
        <div className="card">
          <p className="card__title">AI Triage Rating</p>
          <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 20 }}>
            How accurate was the AI's preliminary assessment compared
            to your clinical findings? Your rating trains the model to
            be more accurate for future patients.
          </p>

          {error && <div className="alert alert--error">{error}</div>}

          {/* ── Stars ── */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${star <= (hover || rating) ? 'filled' : ''}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          {/* ── Rating label ── */}
          {(hover || rating) > 0 && (
            <p style={{
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--blue)',
              fontWeight: 600,
              marginBottom: 20,
            }}>
              {labels[hover || rating]}
            </p>
          )}

          {/* ── Comment ── */}
          <div className="form-group">
            <label className="label">
              What did the AI get wrong? (optional)
            </label>
            <textarea
              className="input"
              placeholder="Describe any inaccuracies in the AI's triage assessment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <button
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={loading || rating === 0}
          >
            {loading ? 'Submitting...' : 'Submit AI Rating'}
          </button>

          <button
            className="btn btn--ghost"
            style={{ marginTop: 10 }}
            onClick={() => navigate('/doctor/dashboard')}
          >
            Skip for now
          </button>
        </div>

        <div
          style={{
            background: 'var(--blue-light)',
            borderRadius: 'var(--radius)',
            padding: 14,
            fontSize: 13,
            color: 'var(--gray-600)',
          }}
        >
          <strong style={{ color: 'var(--blue)' }}>How this helps:</strong>{' '}
          Every rating you submit is fed back into the AI training pipeline.
          Over time the AI learns from doctor corrections and becomes more
          accurate at predicting risk scores and assessments.
        </div>
      </div>
    </div>
  );
}
