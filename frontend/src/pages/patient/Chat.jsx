import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendMessage } from '../../api/triage';
import { getNearbyHospitals } from '../../api/hospitals';

export default function Chat() {
  const navigate  = useNavigate();
  const patient   = JSON.parse(localStorage.getItem('civtech_patient') || '{}');
  const bottomRef = useRef(null);

  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [sessionId,  setSessionId]  = useState(null);
  const [isTyping,   setIsTyping]   = useState(false);  // 3-dot waiting state
  const [hospitals,  setHospitals]  = useState([]);
  const [action,     setAction]     = useState('continue');
  const [disabled,   setDisabled]   = useState(false);

  // Opening message from AI on load
  useEffect(() => {
    setMessages([{
      role:    'ai',
      content: `Hello ${patient.name || 'there'}. I am CivTech, your health assistant. How are you feeling today? Please describe what is bothering you.`,
    }]);
  }, [patient.name]);

  // Auto scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping || disabled) return;

    const userMessage = input.trim();
    setInput('');

    // Add patient message immediately
    setMessages((prev) => [...prev, { role: 'patient', content: userMessage }]);

    // Show 3-dot typing indicator
    setIsTyping(true);

    try {
      const res = await sendMessage({
        patient_id: patient.id,
        session_id: sessionId,
        message:    userMessage,
      });

      const data = res.data;
      setSessionId(data.session_id);
      setAction(data.action);

      // Small artificial delay so typing indicator feels natural
      await new Promise((r) => setTimeout(r, 600));

      // Remove typing indicator and add AI response
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: 'ai', content: data.response }]);

      // Handle routing actions
      if (data.action === 'route_hospital') {
        setDisabled(true);
        // Get nearby hospitals
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            const hospRes = await getNearbyHospitals(latitude, longitude);
            setHospitals(hospRes.data);
          });
        }
      }

      if (data.action === 'route_consultation') {
        setDisabled(true);
        // Show medication check or go to consultation
        setTimeout(() => {
          setMessages((prev) => [...prev, {
            role:    'action',
            content: 'consultation',
          }]);
        }, 800);
      }

      // Show MedScan result if triggered
      if (data.medscan_result) {
        const med = data.medscan_result;
        setTimeout(() => {
          setMessages((prev) => [...prev, {
            role:    'medscan',
            content: med,
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

  const handleHospitalSelect = (hospital) => {
    localStorage.setItem('civtech_hospital',    JSON.stringify(hospital));
    localStorage.setItem('civtech_session_id',  sessionId);
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

            // ── Hospital cards rendered inside chat ──
            if (msg.role === 'ai' && hospitals.length > 0 && i === messages.length - 1) {
              return null; // Hospitals shown below
            }

            // ── MedScan result card inside chat ──
            if (msg.role === 'medscan') {
              const med = msg.content;
              return (
                <div key={i} style={{
                  background: med.clash_detected ? '#fde8e8' : '#d4edda',
                  border:     `1px solid ${med.clash_detected ? '#f5c6c6' : '#c3e6cb'}`,
                  borderRadius: 'var(--radius)',
                  padding: 14,
                  alignSelf: 'flex-start',
                  maxWidth: '85%',
                }}>
                  <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                    {med.clash_detected ? '⚠️ Medication Warning' : '✅ Medication Check'}
                  </p>
                  <p style={{ fontSize: 13 }}>{med.recommendation}</p>
                </div>
              );
            }

            // ── Consultation action card ──
            if (msg.role === 'action' && msg.content === 'consultation') {
              return (
                <div key={i} style={{
                  background: 'var(--blue-light)',
                  border: '1px solid var(--blue)',
                  borderRadius: 'var(--radius)',
                  padding: 14,
                  alignSelf: 'flex-start',
                  maxWidth: '85%',
                }}>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: 'var(--blue-dark)' }}>
                    Would you like to speak to a doctor right now?
                  </p>
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => {
                      localStorage.setItem('civtech_session_id', sessionId);
                      navigate('/consultation');
                    }}
                  >
                    See Available Doctors
                  </button>
                </div>
              );
            }

            return null;
          })}

          {/* ── 3-dot Typing Indicator (WhatsApp / IG style) ── */}
          {isTyping && (
            <div className="typing">
              <div className="typing__dot" />
              <div className="typing__dot" />
              <div className="typing__dot" />
            </div>
          )}

          {/* ── Hospital cards after routing ── */}
          {action === 'route_hospital' && hospitals.length > 0 && (
            <div style={{ alignSelf: 'flex-start', width: '90%' }}>
              <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 8 }}>
                Select a hospital near you:
              </p>
              {hospitals.map((h) => (
                <div
                  key={h.id}
                  className="hospital-card"
                  onClick={() => handleHospitalSelect(h)}
                >
                  <div className="hospital-card__name">{h.name}</div>
                  <div className="hospital-card__meta">{h.town}, {h.county}</div>
                  <div className="hospital-card__dist">
                    📍 {h.distance_km} km away · {h.travel_time}
                  </div>
                </div>
              ))}
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
