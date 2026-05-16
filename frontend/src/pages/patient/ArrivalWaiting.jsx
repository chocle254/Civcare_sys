import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ArrivalWaiting() {
    const navigate = useNavigate();
    const patient = JSON.parse(localStorage.getItem('civtech_patient') || '{}');
    const appointmentId = localStorage.getItem('civtech_appointment_id');
    const [callStatus, setCallStatus] = useState(null); // null | { doctor_name, room }

    useEffect(() => {
        if (!appointmentId) return;

        const poll = async () => {
            try {
                const res = await fetch(`${process.env.REACT_APP_API_URL}/triage/appointment-status/${appointmentId}`);
                const data = await res.json();
                if (data.status === 'called' || data.status === 'in_progress') {
                    setCallStatus({ doctor_name: data.doctor_name, room: data.room });
                }
            } catch { }
        };

        poll();
        const interval = setInterval(poll, 2000);
        return () => clearInterval(interval);
    }, [appointmentId]);

    // ── DOCTOR IS READY ──
    if (callStatus) {
        return (
            <div style={s.page}>
                <style>{`
          @keyframes pulseRing {
            0%   { transform: scale(1);   opacity: 0.8; }
            100% { transform: scale(2);   opacity: 0; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

                <div style={{ position: 'relative', marginBottom: 36 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%,-50%)',
                            width: 100, height: 100, borderRadius: '50%',
                            background: 'rgba(0,212,170,0.2)',
                            animation: `pulseRing 2s ease-out ${i * 0.5}s infinite`,
                        }} />
                    ))}
                    <div style={{
                        width: 100, height: 100, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#00d4aa,#4d8fff)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 44, position: 'relative', zIndex: 10,
                        boxShadow: '0 0 40px rgba(0,212,170,0.5)',
                    }}>
                        🩺
                    </div>
                </div>

                <p style={{ fontSize: 12, letterSpacing: 3, color: '#00d4aa', fontWeight: 700, marginBottom: 10, animation: 'fadeUp 0.5s ease both' }}>
                    THE DOCTOR IS READY
                </p>

                <h1 style={{ ...s.title, animation: 'fadeUp 0.5s ease 0.1s both' }}>
                    {callStatus.doctor_name || 'Your Doctor'}
                </h1>

                <div style={{
                    background: 'rgba(0,212,170,0.08)',
                    border: '1px solid rgba(0,212,170,0.25)',
                    borderRadius: 18, padding: '20px 32px',
                    marginBottom: 32, animation: 'fadeUp 0.5s ease 0.2s both',
                }}>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 6 }}>PROCEED TO</p>
                    <p style={{ fontSize: 36, fontWeight: 800, color: '#00d4aa', fontFamily: "'Syne',sans-serif", margin: 0 }}>
                        {callStatus.room}
                    </p>
                </div>

                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 40, animation: 'fadeUp 0.5s ease 0.3s both' }}>
                    Please make your way to {callStatus.room} now.
                </p>

                <button onClick={() => navigate('/medications')} style={s.btn}>
                    View My Medications
                </button>
            </div>
        );
    }

    // ── WAITING ──
    return (
        <div style={s.page}>
            <style>{`
        @keyframes breathe {
          0%,100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(0,212,170,0.4); }
          50%     { transform: scale(1.07); box-shadow: 0 0 0 18px rgba(0,212,170,0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

            <div style={{ position: 'relative', marginBottom: 32 }}>
                <div style={{
                    position: 'absolute', top: -12, left: -12,
                    width: 104, height: 104, borderRadius: '50%',
                    border: '2px dashed rgba(0,212,170,0.25)',
                    animation: 'spin 8s linear infinite',
                }} />
                <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'rgba(0,212,170,0.12)',
                    border: '2px solid rgba(0,212,170,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 34, animation: 'breathe 2.5s ease-in-out infinite',
                }}>
                    🏥
                </div>
            </div>

            <h1 style={s.title}>You're Checked In</h1>

            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 8, lineHeight: 1.7 }}>
                Welcome, <strong style={{ color: '#fff' }}>{patient.name?.split(' ')[0]}</strong>.
                Please take a seat.
            </p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 32, lineHeight: 1.7 }}>
                The doctor will call you when they're ready.<br />
                This screen will update automatically.
            </p>

            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 20, marginBottom: 40,
                background: 'rgba(0,212,170,0.08)',
                border: '1px solid rgba(0,212,170,0.2)',
            }}>
                <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#00d4aa', boxShadow: '0 0 8px #00d4aa',
                    animation: 'breathe 1.5s ease-in-out infinite',
                }} />
                <span style={{ fontSize: 12, color: '#00d4aa', fontWeight: 600 }}>
                    Waiting for doctor...
                </span>
            </div>

            <button onClick={() => navigate('/medications')} style={{ ...s.btn, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                View My Medications
            </button>
        </div>
    );
}

const s = {
    page: {
        minHeight: '100vh', background: '#000',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24, textAlign: 'center',
    },
    title: {
        fontFamily: "'Syne', sans-serif",
        fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 16,
    },
    btn: {
        width: '100%', maxWidth: 320, padding: '16px 0',
        background: 'linear-gradient(135deg,#1a4fff,#0070f3)',
        border: 'none', borderRadius: 14, color: '#fff',
        fontSize: 15, fontWeight: 600, cursor: 'pointer',
    },
};