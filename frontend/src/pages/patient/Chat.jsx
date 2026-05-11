import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendMessage, selectHospital, createAppointment } from '../../api/triage';

export default function Chat() {
  const navigate  = useNavigate();
  const patient   = JSON.parse(localStorage.getItem('civtech_patient') || '{}');
  const bottomRef = useRef(null);

  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [sessionId,  setSessionId]  = useState(
    localStorage.getItem('civtech_session_id') || null
  );
  const [isTyping,   setIsTyping]   = useState(false);
  const [disabled,   setDisabled]   = useState(false);
  const [coords,     setCoords]     = useState(null);
  const [verdict,    setVerdict]    = useState('CivTech AI'); // Title above chat

  // ── Get GPS silently ──
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ── Opening message ──
  useEffect(() => {
    const existing = localStorage.getItem('civtech_session_id');
    if (existing) {
      // Resuming — load history would go here
      setMessages([{
        role: 'ai',
        content: `Welcome back ${patient.name?.split(' ')[0] || ''}. I have full context of our previous conversation. What would you like to discuss today?`,
      }]);
    } else {
      setMessages([{
        role: 'ai',
        content: `Hello ${patient.name?.split(' ')[0] || 'there'}. I am CivTech, your health assistant. How are you feeling today?`,
      }]);
    }
  }, [patient.name]);

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
      const res  = await sendMessage({
        patient_id:  patient.id,
        session_id:  sessionId,
        message:     userMessage,
        patient_lat: coords?.lat || null,
        patient_lon: coords?.lon || null,
      });
      const data = res.data;
      setSessionId(data.session_id);

      // Update verdict title when triage score arrives
      if (data.triage_score) {
        const label = {
          critical: '🔴 Critical Risk',
          moderate: '🟡 Moderate Risk',
          low:      '🟢 Low Risk',
        }[data.triage_score] || 'CivTech AI';
        setVerdict(label);
      }

      await new Promise((r) => setTimeout(r, 700));
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: 'ai', content: data.response }]);

      if (data.action === 'route_hospital') {
        setDisabled(true);
        setTimeout(() => {
          setMessages((prev) => [...prev, {
            role:      'action',
            content:   data.hospitals?.length > 0 ? 'hospital' : 'hospital_fallback',
            hospitals: data.hospitals || [],
            sessionId: data.session_id,
          }]);
        }, 800);
      }

      if (data.action === 'route_consultation') {
        setDisabled(true);
        setTimeout(() => {
          setMessages((prev) => [...prev, { role: 'action', content: 'consultation' }]);
        }, 800);
      }

      if (data.medscan_result) {
        setTimeout(() => {
          setMessages((prev) => [...prev, { role: 'medscan', content: data.medscan_result }]);
        }, 500);
      }
    } catch {
      setIsTyping(false);
      setMessages((prev) => [...prev, {
        role: 'ai', content: 'I am having trouble connecting. Please try again.',
      }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleHospitalSelect = async (hospital, sid) => {
    const currentSid = sid || sessionId;
    try {
      await selectHospital({ session_id: currentSid, patient_id: patient.id, hospital_id: hospital.id, hospital_name: hospital.name, hospital_lat: hospital.lat, hospital_lon: hospital.lon, distance_km: hospital.distance_km });
    } catch {}
    try {
      const res = await createAppointment({ patient_id: patient.id, session_id: currentSid, hospital_id: hospital.id });
      localStorage.setItem('civtech_appointment_id', res.data.appointment_id);
    } catch {}
    localStorage.setItem('civtech_hospital', JSON.stringify(hospital));
    localStorage.setItem('civtech_session_id', currentSid);
    navigate('/arrival');
  };

  return (
    <div style={s.page}>
      {/* ── IG-STYLE HEADER ── */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/dashboard')}>‹</button>
        <div style={s.headerCenter}>
          {/* Instead of profile pic — verdict badge */}
          <div style={s.verdictBadge}>
            <span style={s.verdictDot} />
            <span style={s.verdictText}>{verdict}</span>
          </div>
          <p style={s.headerName}>CivTech Care Assistant</p>
        </div>
        <div style={s.headerInfo}>ℹ</div>
      </div>

      {/* ── MESSAGES ── */}
      <div style={s.messageList}>
        {messages.map((msg, i) => {

          if (msg.role === 'patient') return (
            <div key={i} style={s.rowRight}>
              <div style={s.bubblePatient}>{msg.content}</div>
            </div>
          );

          if (msg.role === 'ai') return (
            <div key={i} style={s.rowLeft}>
              <div style={s.aiBadge}>AI</div>
              <div style={s.bubbleAi}>{msg.content}</div>
            </div>
          );

          if (msg.role === 'medscan') {
            const med = msg.content;
            return (
              <div key={i} style={s.rowLeft}>
                <div style={s.aiBadge}>⚕</div>
                <div style={{ ...s.bubbleAi, background: med.clash_detected ? 'rgba(255,77,77,0.15)' : 'rgba(0,229,160,0.1)', border: `1px solid ${med.clash_detected ? 'rgba(255,77,77,0.3)' : 'rgba(0,229,160,0.3)'}` }}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    {med.clash_detected ? '⚠️ Medication Warning' : '✅ Medication OK'}
                  </p>
                  <p style={{ fontSize: 13 }}>{med.recommendation}</p>
                </div>
              </div>
            );
          }

          if (msg.role === 'action' && msg.content === 'hospital') {
            return (
              <div key={i} style={{ ...s.rowLeft, flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={s.aiBadge}>🏥</div>
                <p style={s.actionLabel}>Hospitals near you — tap to select:</p>
                {msg.hospitals.map((h) => (
                  <div key={h.id} style={s.hospitalRow} onClick={() => handleHospitalSelect(h, msg.sessionId)}>
                    <div style={s.hospitalIcon}>+</div>
                    <div style={s.hospitalInfo}>
                      <p style={s.hospitalName}>{h.name}</p>
                      <p style={s.hospitalMeta}>{h.town}{h.county ? `, ${h.county}` : ''}</p>
                    </div>
                    <div style={s.hospitalDist}>
                      <p style={s.distKm}>{h.distance_km}km</p>
                      <p style={s.distTime}>{h.travel_time}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          if (msg.role === 'action' && msg.content === 'hospital_fallback') {
            return (
              <div key={i} style={s.rowLeft}>
                <div style={s.aiBadge}>🏥</div>
                <div style={s.bubbleAi}>
                  <p style={{ fontSize: 13, marginBottom: 10 }}>We need your location to show nearby hospitals.</p>
                  <button style={s.actionBtn} onClick={() => { localStorage.setItem('civtech_session_id', sessionId); navigate('/hospitals'); }}>
                    Find Hospitals →
                  </button>
                </div>
              </div>
            );
          }

          if (msg.role === 'action' && msg.content === 'consultation') {
            return (
              <div key={i} style={s.rowLeft}>
                <div style={s.aiBadge}>👨‍⚕️</div>
                <div style={s.bubbleAi}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Speak to a Doctor Online</p>
                  <p style={{ fontSize: 13, marginBottom: 10, opacity: 0.7 }}>A doctor is available right now from wherever you are.</p>
                  <button style={s.actionBtn} onClick={() => { localStorage.setItem('civtech_session_id', sessionId); navigate('/consultation'); }}>
                    See Available Doctors →
                  </button>
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* ── Typing indicator ── */}
        {isTyping && (
          <div style={s.rowLeft}>
            <div style={s.aiBadge}>AI</div>
            <div style={s.typingBubble}>
              <span style={s.typingDot} />
              <span style={{ ...s.typingDot, animationDelay: '0.15s' }} />
              <span style={{ ...s.typingDot, animationDelay: '0.3s' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── INPUT ── */}
      <div style={s.inputRow}>
        <input
          style={s.input}
          placeholder={disabled ? 'Select an option above' : 'Message...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isTyping}
        />
        <button
          style={{ ...s.sendBtn, opacity: input.trim() && !isTyping && !disabled ? 1 : 0.3 }}
          onClick={handleSend}
          disabled={!input.trim() || isTyping || disabled}
        >
          ↑
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes typing {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%           { transform: scale(1); opacity: 1; }
        }
        @keyframes bubbleIn {
          from { opacity: 0; transform: scale(0.95) translateY(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

const s = {
  page: {
    height:          '100vh',
    display:         'flex',
    flexDirection:   'column',
    backgroundColor: '#000',
    fontFamily:      "'DM Sans', sans-serif",
    color:           '#fff',
  },
  header: {
    display:        'flex',
    alignItems:     'center',
    padding:        '14px 16px',
    borderBottom:   '1px solid rgba(255,255,255,0.08)',
    gap:            12,
    flexShrink:     0,
  },
  backBtn: {
    background: 'none',
    border:     'none',
    color:      '#fff',
    fontSize:   28,
    cursor:     'pointer',
    lineHeight: 1,
    padding:    0,
  },
  headerCenter: {
    flex:       1,
    display:    'flex',
    flexDirection:'column',
    gap:        3,
  },
  verdictBadge: {
    display:     'inline-flex',
    alignItems:  'center',
    gap:         5,
    background:  'rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding:     '3px 10px',
    alignSelf:   'flex-start',
  },
  verdictDot: {
    width:        6,
    height:       6,
    borderRadius: '50%',
    background:   '#00e5a0',
    display:      'inline-block',
    boxShadow:    '0 0 6px #00e5a0',
  },
  verdictText: {
    fontSize:   11,
    fontWeight: 600,
    color:      'rgba(255,255,255,0.8)',
  },
  headerName: {
    fontSize: 12,
    color:    'rgba(255,255,255,0.35)',
    margin:   0,
  },
  headerInfo: {
    width:          32,
    height:         32,
    borderRadius:   '50%',
    background:     'rgba(255,255,255,0.06)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       14,
    color:          'rgba(255,255,255,0.4)',
    cursor:         'pointer',
  },
  messageList: {
    flex:         1,
    overflowY:    'auto',
    padding:      '16px 12px',
    display:      'flex',
    flexDirection:'column',
    gap:          8,
  },
  rowRight: {
    display:        'flex',
    justifyContent: 'flex-end',
    animation:      'bubbleIn 0.25s ease both',
  },
  rowLeft: {
    display:     'flex',
    alignItems:  'flex-end',
    gap:         8,
    animation:   'bubbleIn 0.25s ease both',
    flexWrap:    'wrap',
  },
  bubblePatient: {
    maxWidth:     '72%',
    background:   'linear-gradient(135deg, #1a4fff, #0070f3)',
    borderRadius: '18px 18px 4px 18px',
    padding:      '11px 15px',
    fontSize:     14,
    lineHeight:   1.5,
    color:        '#fff',
    boxShadow:    '0 2px 12px rgba(26,79,255,0.3)',
  },
  aiBadge: {
    width:          28,
    height:         28,
    borderRadius:   '50%',
    background:     'rgba(255,255,255,0.08)',
    border:         '1px solid rgba(255,255,255,0.12)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       11,
    fontWeight:     700,
    color:          'rgba(255,255,255,0.6)',
    flexShrink:     0,
  },
  bubbleAi: {
    maxWidth:     '72%',
    background:   'rgba(255,255,255,0.06)',
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: '18px 18px 18px 4px',
    padding:      '11px 15px',
    fontSize:     14,
    lineHeight:   1.5,
    color:        'rgba(255,255,255,0.85)',
  },
  typingBubble: {
    background:   'rgba(255,255,255,0.06)',
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: '18px 18px 18px 4px',
    padding:      '12px 16px',
    display:      'flex',
    gap:          5,
    alignItems:   'center',
  },
  typingDot: {
    width:        7,
    height:       7,
    borderRadius: '50%',
    background:   'rgba(255,255,255,0.5)',
    display:      'inline-block',
    animation:    'typing 1.2s ease-in-out infinite',
  },
  actionLabel: {
    fontSize:   12,
    color:      'rgba(255,255,255,0.4)',
    margin:     '4px 0 8px 36px',
  },
  hospitalRow: {
    display:      'flex',
    alignItems:   'center',
    gap:          12,
    background:   'rgba(255,255,255,0.05)',
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding:      '12px 14px',
    marginBottom: 8,
    marginLeft:   36,
    cursor:       'pointer',
    width:        '80%',
    transition:   'background 0.15s',
  },
  hospitalIcon: {
    width:          34,
    height:         34,
    borderRadius:   10,
    background:     'rgba(26,79,255,0.2)',
    border:         '1px solid rgba(26,79,255,0.3)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       18,
    color:          '#1a4fff',
    flexShrink:     0,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize:   13,
    fontWeight: 600,
    color:      '#fff',
    margin:     '0 0 2px',
  },
  hospitalMeta: {
    fontSize: 11,
    color:    'rgba(255,255,255,0.35)',
    margin:   0,
  },
  hospitalDist: {
    textAlign: 'right',
    flexShrink:0,
  },
  distKm: {
    fontSize:   13,
    fontWeight: 700,
    color:      '#1a4fff',
    margin:     '0 0 2px',
  },
  distTime: {
    fontSize: 11,
    color:    'rgba(255,255,255,0.3)',
    margin:   0,
  },
  actionBtn: {
    background:   'linear-gradient(135deg, #1a4fff, #0070f3)',
    border:       'none',
    borderRadius: 10,
    color:        '#fff',
    fontSize:     13,
    fontWeight:   600,
    padding:      '9px 16px',
    cursor:       'pointer',
    fontFamily:   "'DM Sans', sans-serif",
  },
  inputRow: {
    display:     'flex',
    alignItems:  'center',
    gap:         8,
    padding:     '10px 12px 20px',
    borderTop:   '1px solid rgba(255,255,255,0.06)',
    flexShrink:  0,
  },
  input: {
    flex:        1,
    background:  'rgba(255,255,255,0.07)',
    border:      '1px solid rgba(255,255,255,0.12)',
    borderRadius:24,
    padding:     '11px 18px',
    fontSize:    14,
    color:       '#fff',
    outline:     'none',
    fontFamily:  "'DM Sans', sans-serif",
  },
  sendBtn: {
    width:          40,
    height:         40,
    borderRadius:   '50%',
    background:     'linear-gradient(135deg, #1a4fff, #0070f3)',
    border:         'none',
    color:          '#fff',
    fontSize:       18,
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    transition:     'opacity 0.2s',
  },
};
