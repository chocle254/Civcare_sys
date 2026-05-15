import { useNavigate } from 'react-router-dom';

export default function ConsultationWaiting() {
  const navigate  = useNavigate();
  const patient   = JSON.parse(localStorage.getItem('civtech_patient') || '{}');

  return (
    <div style={{
      minHeight: '100vh', background: '#000',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, textAlign: 'center',
    }}>

      {/* Pulse ring */}
      <div style={{ position: 'relative', marginBottom: 32 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(0,212,170,0.15)',
          border: '2px solid rgba(0,212,170,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32,
        }}>
          📞
        </div>
      </div>

      <h1 style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 12,
      }}>
        Doctor Will Call You
      </h1>

      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 8, lineHeight: 1.6 }}>
        Your consultation has been booked and payment is held in escrow.
      </p>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 32, lineHeight: 1.6 }}>
        The doctor will call <strong style={{ color: '#00d4aa' }}>{patient.phone}</strong> shortly.
        Keep your phone close.
      </p>

      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: '16px 24px', marginBottom: 32,
        fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7,
      }}>
        Payment is only released after your call is complete.<br />
        If the doctor doesn't call within 30 minutes,<br />
        you will be automatically refunded.
      </div>

      <button
        onClick={() => navigate('/dashboard')}
        style={{
          width: '100%', maxWidth: 320, padding: '16px 0',
          background: 'linear-gradient(135deg, #1a4fff, #0070f3)',
          border: 'none', borderRadius: 14, color: '#fff',
          fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}