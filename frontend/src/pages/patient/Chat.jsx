import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendMessage, selectHospital, createAppointment } from '../../api/triage';

export default function Chat() {
  const navigate  = useNavigate();
  const patient   = JSON.parse(localStorage.getItem('civtech_patient') || '{}');
  const bottomRef = useRef(null);

  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isTyping,  setIsTyping]  = useState(false);
  const [disabled,  setDisabled]  = useState(false);
  const [coords,    setCoords]    = useState(null); // Patient GPS coords

  // ── Get patient location on mount (silent — no UI shown) ──
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        },
        () => {
          // Permission denied — hospital routing will show manual option
          console.log('Location permission denied');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // ── Opening message ──
  useEffect(() => {
    setMessages([{
      role:    'ai',
      content: `Hello ${patient.name || 'there'}. I am CivTech, your health assistant. How are you feeling today? Please describe what is bothering you.`,
    }]);
  }, [patient.name]);

  // ── Auto scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping || disabled) return;

    const userMessage = input.trim();
    setInput('');

    setMessages((prev) => [...prev, { role: 'patient', content: userMessage }]);
    setIsTyping(true);

    try {
      const res = await sendMessage({
        patient_id:  patient.id,
        session_id:  sessionId,
        message:     userMessage,
        patient_lat: coords?.lat || null,
        patient_lon: coords?.lon || null,
      });

      const data = res.data;
      setSessionId(data.session_id);

      await new Promise((r) => setTimeout(r, 600));
      setIsTyping(false);

      // Add AI response bubble
      setMessages((prev) => [...prev, { role: 'ai', content: data.response }]);

      // ── Route to hospital — show hospital cards in chat ──
      if (data.action === 'route_hospital') {
        setDisabled(true);
        setTimeout(() => {
          if (data.hospitals && data.hospitals.length > 0) {
            // Show hospital cards directly in chat
            setMessages((prev) => [...prev, {
              role:      'action',
              content:   'hospital',
              hospitals: data.hospitals,
              sessionId: data.session_id,
            }]);
          } else {
            // No coords or no hospitals found — show button to hospital page
            setMessages((prev) => [...prev, {
              role:    'action',
              content: 'hospital_fallback',
            }]);
          }
        }, 800);
      }

      // ── Route to consultation ──
      if (data.action === 'route_consultation') {
        setDisabled(true);
        setTimeout(() => {
          setMessages((prev) => [...prev, {
            role:    'action',
            content: 'consultation',
          }]);
        }, 800);
      }

      // ── MedScan result ──
      if (data.medscan_result) {
        setTimeout(() => {
          setMessages((prev) => [...prev, {
            role:    'medscan',
            content: data.medscan_result,
          }]);
        }, 500);
      }

    } catch (err) {
      setIsTyping(false);
      setMessages((prev) => [...prev, {
        role:    'ai',
        content: 'I am having trouble connecting right now. Please try again.',
      }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Patient taps a hospital card ──
  const handleHospitalSelect = async (hospital, sid) => {
    const currentSessionId = sid || sessionId;

    // 1 — Record hospital choice against the session
    try {
      await selectHospital({
        session_id:    currentSessionId,
        patient_id:    patient.id,
        hospital_id:   hospital.id,
        hospital_name: hospital.name,
        hospital_lat:  hospital.lat,
        hospital_lon:  hospital.lon,
        distance_km:   hospital.distance_km,
      });
    } catch (e) {
      console.error('Failed to record hospital:', e);
    }

    // 2 — Create the appointment so it appears on the doctor's dashboard
    try {
      const res = await createAppointment({
        patient_id:  patient.id,
        session_id:  currentSessionId,
        hospital_id: hospital.id,
      });
      localStorage.setItem('civtech_appointment_id', res.data.appointment_id);
    } catch (e) {
      console.error('Failed to create appointment:', e);
    }

    // 3 — Save hospital and navigate to arrival confirmation
    localStorage.setItem('civtech_hospital',   JSON.stringify(hospital));
    localStorage.setItem('civtech_session_id', currentSessionId);
    navigate('/arrival');
  };

  return (
    <div className="page">
      <div className="header">
        <div>
          <div className="header__logo">CivTech Care</div>
          <div className="header__sub">AI Health Assistant</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>
          {patient.name || ''}
        </div>
      </div>

      <div className="chat-window">
        <div className="chat-messages">
          {messages.map((msg, i) => {

            // ── Patient bubble ──
            if (msg.role === 'patient') {
              return (
                <div key={i} className="bubble bubble--patient">
                  {msg.content}
                </div>
              );
            }

            // ── AI bubble ──
            if (msg.role === 'ai') {
              return (
                <div key={i} className="bubble bubble--ai">
                  {msg.content}
                </div>
              );
            }

            // ── MedScan result card ──
            if (msg.role === 'medscan') {
              const med = msg.content;
              return (
                <div key={i} style={{
                  background:   med.clash_detected ? '#fde8e8' : '#d4edda',
                  border:       `1px solid ${med.clash_detected ? '#f5c6c6' : '#c3e6cb'}`,
                  borderRadius: 'var(--radius)',
                  padding:      14,
                  alignSelf:    'flex-start',
                  maxWidth:     '92%',
                }}>
                  <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                    {med.clash_detected ? '⚠️ Medication Warning' : '✅ Medication Check'}
                  </p>
                  <p style={{ fontSize: 13 }}>{med.recommendation}</p>
                </div>
              );
            }

            // ── Hospital cards rendered in chat ──
            if (msg.role === 'action' && msg.content === 'hospital') {
              return (
                <div key={i} style={{ alignSelf: 'flex-start', width: '95%' }}>
                  <p style={{
                    fontSize:     13,
                    fontWeight:   600,
                    color:        'var(--gray-600)',
                    marginBottom: 10,
                  }}>
                    🏥 Hospitals near you — tap one to select:
                  </p>

                  {msg.hospitals.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => handleHospitalSelect(h, msg.sessionId)}
                      style={{
                        background:    'var(--white)',
                        border:        '1px solid var(--blue)',
                        borderRadius:  'var(--radius)',
                        padding:       '12px 14px',
                        marginBottom:  8,
                        cursor:        'pointer',
                        display:       'flex',
                        justifyContent:'space-between',
                        alignItems:    'center',
                      }}
                    >
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                          {h.name}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                          {h.town}{h.county ? `, ${h.county}` : ''}
                        </p>
                        {h.phone && (
                          <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                            📞 {h.phone}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                        <p style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 14 }}>
                          {h.distance_km} km
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                          ⏱ {h.travel_time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            // ── Hospital fallback (no location / no results) ──
            if (msg.role === 'action' && msg.content === 'hospital_fallback') {
              return (
                <div key={i} style={{
                  background:   'var(--blue-light)',
                  border:       '1px solid var(--blue)',
                  borderRadius: 'var(--radius)',
                  padding:      14,
                  alignSelf:    'flex-start',
                  maxWidth:     '85%',
                }}>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'var(--blue-dark)' }}>
                    🏥 Find a Hospital Near You
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 10 }}>
                    We need your location to show nearby hospitals.
                  </p>
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => {
                      localStorage.setItem('civtech_session_id', sessionId);
                      navigate('/hospitals');
                    }}
                  >
                    Find Hospitals →
                  </button>
                </div>
              );
            }

            // ── Consultation action card ──
            if (msg.role === 'action' && msg.content === 'consultation') {
              return (
                <div key={i} style={{
                  background:   'var(--blue-light)',
                  border:       '1px solid var(--blue)',
                  borderRadius: 'var(--radius)',
                  padding:      14,
                  alignSelf:    'flex-start',
                  maxWidth:     '85%',
                }}>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'var(--blue-dark)' }}>
                    👨‍⚕️ Speak to a Doctor Online
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 10 }}>
                    A doctor is available to consult with you right now from wherever you are.
                  </p>
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => {
                      localStorage.setItem('civtech_session_id', sessionId);
                      navigate('/consultation');
                    }}
                  >
                    See Available Doctors →
                  </button>
                </div>
              );
            }

            return null;
          })}

          {/* ── 3-dot Typing Indicator ── */}
          {isTyping && (
            <div className="typing">
              <div className="typing__dot" />
              <div className="typing__dot" />
              <div className="typing__dot" />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Chat Input ── */}
        <div className="chat-input">
          <input
            className="input"
            placeholder={disabled ? 'Please select an option above' : 'Type your message...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isTyping}
          />
          <button
            className="chat-send"
            onClick={handleSend}
            disabled={!input.trim() || isTyping || disabled}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
