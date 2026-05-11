import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

const RISK_CONFIG = {
  critical: { color: '#ff4d4d', bg: 'rgba(255,77,77,0.12)', label: 'CRITICAL' },
  moderate: { color: '#f5a623', bg: 'rgba(245,166,35,0.12)', label: 'MODERATE' },
  low:      { color: '#00e5a0', bg: 'rgba(0,229,160,0.12)', label: 'LOW RISK' },
};

export default function SessionDashboard() {
  const navigate  = useNavigate();
  const patient   = JSON.parse(localStorage.getItem('civtech_patient') || '{}');
  const [sessions,    setSessions]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [resumeSheet, setResumeSheet] = useState(null); // session to resume
  const [loggingOut,  setLoggingOut]  = useState(false);

  const firstName = (patient.name || 'there').split(' ')[0].toUpperCase();

  const fetchSessions = useCallback(async () => {
  try {
    const res = await axios.get(`${API}/triage/sessions/${patient.id}`);
    setSessions(res.data);
  } catch (e) {
    console.error('Failed to load sessions:', e);
  } finally {
    setLoading(false);
  }
}, [patient.id]);
  useEffect(() => {
    if (!patient.id) { navigate('/'); return; }
    fetchSessions();
  }, [fetchSessions, navigate, patient.id]);

  const handleLogout = () => {
    setLoggingOut(true);
    setTimeout(() => {
      localStorage.clear();
      navigate('/login');
    }, 600);
  };

  const handleNewSession = () => navigate('/chat');

  const handleCardTap = (session) => {
    if (session.status === 'active') {
      setResumeSheet(session);
    } else {
      // Completed — open in read-only view
      localStorage.setItem('civtech_session_id', session.id);
      navigate('/chat');
    }
  };

  const handleResume = () => {
    localStorage.setItem('civtech_session_id', resumeSheet.id);
    setResumeSheet(null);
    navigate('/chat');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7)  return `${diffDays} days ago`;
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={s.page}>
      {/* ── BACKGROUND ORB (Airtm vibe) ── */}
      <div style={s.orb} />
      <div style={s.orbInner} />

      {/* ── HEADER ── */}
      <div style={s.header}>
        <div style={s.brand}>C</div>
        <button style={s.logoutBtn} onClick={handleLogout}>
          {loggingOut ? '...' : '↪ Logout'}
        </button>
      </div>

      {/* ── WELCOME BLOCK ── */}
      <div style={s.welcome}>
        <p style={s.welcomeSub}>WELCOME BACK,</p>
        <h1 style={s.welcomeName}>{firstName}</h1>
        <p style={s.welcomeHint}>How are you feeling today?</p>
      </div>

      {/* ── NEW SESSION BUTTON ── */}
      <div style={s.newBtnWrap}>
        <button style={s.newBtn} onClick={handleNewSession}>
          <span style={s.newBtnPlus}>+</span>
          Start New Consultation
        </button>
      </div>

      {/* ── SESSION HISTORY ── */}
      <div style={s.historySection}>
        <p style={s.historyTitle}>YOUR HEALTH HISTORY</p>

        {loading && (
          <div style={s.loadingWrap}>
            <div style={s.loadingDot} />
            <div style={{ ...s.loadingDot, animationDelay: '0.2s' }} />
            <div style={{ ...s.loadingDot, animationDelay: '0.4s' }} />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div style={s.emptyState}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🩺</p>
            <p style={{ color: '#666', fontSize: 14 }}>No consultations yet.</p>
            <p style={{ color: '#444', fontSize: 13 }}>Start your first one above.</p>
          </div>
        )}

        {!loading && sessions.map((session, i) => {
          const risk   = RISK_CONFIG[session.risk_score] || RISK_CONFIG.low;
          const isActive = session.status === 'active';

          return (
            <div
              key={session.id}
              style={{ ...s.card, animationDelay: `${i * 0.07}s` }}
              onClick={() => handleCardTap(session)}
            >
              {/* Left — risk dot */}
              <div style={{ ...s.riskDot, background: risk.color }} />

              {/* Center — info */}
              <div style={s.cardBody}>
                <div style={s.cardTop}>
                  <p style={s.cardTitle}>
                    {session.symptoms_summary || session.ai_assessment?.slice(0, 45) || 'Health Consultation'}
                    {(session.ai_assessment || '').length > 45 ? '…' : ''}
                  </p>
                  {isActive && <span style={s.activePill}>ACTIVE</span>}
                </div>
                <div style={s.cardMeta}>
                  <span style={{ ...s.riskBadge, color: risk.color, background: risk.bg }}>
                    {risk.label}
                  </span>
                  <span style={s.cardDate}>{formatDate(session.started_at)}</span>
                  {session.routed_to_hospital && (
                    <span style={s.cardHospital}>🏥 {session.routed_to_hospital}</span>
                  )}
                </div>
              </div>

              {/* Right — arrow */}
              <div style={s.cardArrow}>›</div>
            </div>
          );
        })}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={s.bottomNav}>
        <button style={{ ...s.navBtn, ...s.navBtnActive }}>
          <span style={s.navIcon}>🏠</span>
          <span style={s.navLabel}>Home</span>
        </button>
        <button style={s.navBtn} onClick={() => navigate('/consultation')}>
          <span style={s.navIcon}>👨‍⚕️</span>
          <span style={s.navLabel}>Doctors</span>
        </button>
        <button style={s.navBtn} onClick={() => navigate('/records')}>
          <span style={s.navIcon}>📋</span>
          <span style={s.navLabel}>Records</span>
        </button>
        <button style={s.navBtn} onClick={handleLogout}>
          <span style={s.navIcon}>↪</span>
          <span style={s.navLabel}>Logout</span>
        </button>
      </div>

      {/* ── RESUME SHEET (surprise!) ── */}
      {resumeSheet && (
        <>
          <div style={s.sheetOverlay} onClick={() => setResumeSheet(null)} />
          <div style={s.sheet}>
            <div style={s.sheetPill} />
            <p style={s.sheetEyebrow}>CONTINUING WHERE YOU LEFT OFF</p>
            <h2 style={s.sheetTitle}>
              {resumeSheet.ai_assessment?.slice(0, 60) || 'Active Consultation'}
              {(resumeSheet.ai_assessment || '').length > 60 ? '…' : ''}
            </h2>
            <p style={s.sheetSub}>
              The AI has full context of your previous messages and will continue from where you stopped.
            </p>

            {/* Last message preview */}
            {resumeSheet.last_message && (
              <div style={s.sheetPreview}>
                <p style={s.sheetPreviewLabel}>LAST MESSAGE</p>
                <p style={s.sheetPreviewText}>"{resumeSheet.last_message}"</p>
              </div>
            )}

            <button style={s.sheetBtn} onClick={handleResume}>
              Resume Conversation →
            </button>
            <button style={s.sheetCancel} onClick={() => setResumeSheet(null)}>
              Not now
            </button>
          </div>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes orbPulse {
          0%, 100% { transform: scale(1) translate(-50%, -50%); opacity: 0.7; }
          50%       { transform: scale(1.08) translate(-50%, -50%); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1); opacity: 1; }
        }
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const s = {
  page: {
    minHeight:       '100vh',
    backgroundColor: '#000',
    fontFamily:      "'DM Sans', sans-serif",
    position:        'relative',
    overflowX:       'hidden',
    paddingBottom:   80,
  },
  orb: {
    position:     'absolute',
    top:          -60,
    left:         '50%',
    transform:    'translate(-50%, 0)',
    width:        420,
    height:       420,
    borderRadius: '50%',
    background:   'radial-gradient(circle at 40% 40%, #1a4fff 0%, #0a1aff 30%, #0d0d6b 60%, transparent 80%)',
    filter:       'blur(40px)',
    opacity:      0.75,
    animation:    'orbPulse 6s ease-in-out infinite',
    pointerEvents:'none',
    zIndex:       0,
  },
  orbInner: {
    position:     'absolute',
    top:          20,
    left:         '55%',
    transform:    'translate(-50%, 0)',
    width:        200,
    height:       200,
    borderRadius: '50%',
    background:   'radial-gradient(circle, #00cfff 0%, transparent 70%)',
    filter:       'blur(30px)',
    opacity:      0.4,
    pointerEvents:'none',
    zIndex:       0,
  },
  header: {
    position:       'relative',
    zIndex:         10,
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        '18px 24px 0',
  },
  brand: {
    width:          36,
    height:         36,
    borderRadius:   10,
    background:     'linear-gradient(135deg, #1a4fff, #00cfff)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontFamily:     "'Syne', sans-serif",
    fontWeight:     800,
    fontSize:       18,
    color:          '#fff',
  },
  logoutBtn: {
    background:   'rgba(255,255,255,0.08)',
    border:       '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20,
    color:        '#aaa',
    fontSize:     12,
    padding:      '6px 14px',
    cursor:       'pointer',
    fontFamily:   "'DM Sans', sans-serif",
  },
  welcome: {
    position:  'relative',
    zIndex:    10,
    padding:   '80px 24px 0',
    animation: 'fadeUp 0.6s ease both',
  },
  welcomeSub: {
    fontSize:      11,
    fontWeight:    600,
    letterSpacing: 3,
    color:         'rgba(255,255,255,0.45)',
    margin:        '0 0 4px',
  },
  welcomeName: {
    fontFamily:    "'Syne', sans-serif",
    fontSize:      42,
    fontWeight:    800,
    color:         '#fff',
    margin:        '0 0 6px',
    lineHeight:    1,
    letterSpacing: -1,
  },
  welcomeHint: {
    fontSize: 15,
    color:    'rgba(255,255,255,0.45)',
    margin:   0,
  },
  newBtnWrap: {
    position:  'relative',
    zIndex:    10,
    padding:   '28px 24px 0',
    animation: 'fadeUp 0.6s ease 0.1s both',
  },
  newBtn: {
    width:          '100%',
    padding:        '16px 0',
    background:     'linear-gradient(135deg, #1a4fff 0%, #0070f3 100%)',
    border:         'none',
    borderRadius:   16,
    color:          '#fff',
    fontSize:       16,
    fontWeight:     600,
    fontFamily:     "'DM Sans', sans-serif",
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            10,
    boxShadow:      '0 8px 32px rgba(26,79,255,0.35)',
    letterSpacing:  0.3,
  },
  newBtnPlus: {
    fontSize:    22,
    fontWeight:  300,
    lineHeight:  1,
    marginTop:   -2,
  },
  historySection: {
    position:  'relative',
    zIndex:    10,
    padding:   '32px 24px 0',
    animation: 'fadeUp 0.6s ease 0.2s both',
  },
  historyTitle: {
    fontSize:      10,
    fontWeight:    700,
    letterSpacing: 3,
    color:         'rgba(255,255,255,0.3)',
    margin:        '0 0 16px',
  },
  card: {
    display:        'flex',
    alignItems:     'center',
    gap:            14,
    background:     'rgba(255,255,255,0.04)',
    border:         '1px solid rgba(255,255,255,0.08)',
    borderRadius:   16,
    padding:        '16px 14px',
    marginBottom:   10,
    cursor:         'pointer',
    animation:      'fadeUp 0.5s ease both',
    transition:     'background 0.2s',
  },
  riskDot: {
    width:        10,
    height:       10,
    borderRadius: '50%',
    flexShrink:   0,
    boxShadow:    '0 0 8px currentColor',
  },
  cardBody: {
    flex: 1,
    overflow: 'hidden',
  },
  cardTop: {
    display:     'flex',
    alignItems:  'center',
    gap:         8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize:   14,
    fontWeight: 600,
    color:      '#fff',
    margin:     0,
    flex:       1,
    overflow:   'hidden',
    whiteSpace: 'nowrap',
    textOverflow:'ellipsis',
  },
  activePill: {
    fontSize:     9,
    fontWeight:   700,
    letterSpacing:1.5,
    color:        '#00e5a0',
    background:   'rgba(0,229,160,0.15)',
    border:       '1px solid rgba(0,229,160,0.3)',
    borderRadius: 20,
    padding:      '2px 7px',
    flexShrink:   0,
  },
  cardMeta: {
    display:    'flex',
    alignItems: 'center',
    gap:        8,
    flexWrap:   'wrap',
  },
  riskBadge: {
    fontSize:     10,
    fontWeight:   700,
    letterSpacing:1,
    padding:      '2px 8px',
    borderRadius: 20,
  },
  cardDate: {
    fontSize: 12,
    color:    'rgba(255,255,255,0.3)',
  },
  cardHospital: {
    fontSize: 11,
    color:    'rgba(255,255,255,0.25)',
  },
  cardArrow: {
    fontSize:  22,
    color:     'rgba(255,255,255,0.2)',
    flexShrink:0,
  },
  emptyState: {
    textAlign: 'center',
    padding:   '48px 0',
    color:     '#555',
  },
  loadingWrap: {
    display:        'flex',
    gap:            8,
    justifyContent: 'center',
    padding:        '48px 0',
  },
  loadingDot: {
    width:        8,
    height:       8,
    borderRadius: '50%',
    background:   '#1a4fff',
    animation:    'dot 1.2s ease-in-out infinite',
  },
  bottomNav: {
    position:        'fixed',
    bottom:          0,
    left:            0,
    right:           0,
    height:          64,
    background:      'rgba(0,0,0,0.9)',
    backdropFilter:  'blur(20px)',
    borderTop:       '1px solid rgba(255,255,255,0.07)',
    display:         'flex',
    justifyContent:  'space-around',
    alignItems:      'center',
    zIndex:          100,
  },
  navBtn: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            3,
    background:     'none',
    border:         'none',
    cursor:         'pointer',
    padding:        '4px 16px',
  },
  navBtnActive: {
    // highlight
  },
  navIcon: {
    fontSize: 20,
  },
  navLabel: {
    fontSize:  10,
    color:     'rgba(255,255,255,0.4)',
    fontFamily:"'DM Sans', sans-serif",
  },
  // ── RESUME SHEET ──
  sheetOverlay: {
    position:   'fixed',
    inset:      0,
    background: 'rgba(0,0,0,0.7)',
    zIndex:     200,
    backdropFilter: 'blur(4px)',
  },
  sheet: {
    position:        'fixed',
    bottom:          0,
    left:            0,
    right:           0,
    background:      '#0d0d0d',
    borderTop:       '1px solid rgba(255,255,255,0.1)',
    borderRadius:    '24px 24px 0 0',
    padding:         '20px 24px 40px',
    zIndex:          201,
    animation:       'sheetUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
  },
  sheetPill: {
    width:        40,
    height:       4,
    borderRadius: 2,
    background:   'rgba(255,255,255,0.15)',
    margin:       '0 auto 20px',
  },
  sheetEyebrow: {
    fontSize:      10,
    fontWeight:    700,
    letterSpacing: 2.5,
    color:         '#1a4fff',
    margin:        '0 0 10px',
  },
  sheetTitle: {
    fontFamily:  "'Syne', sans-serif",
    fontSize:    22,
    fontWeight:  800,
    color:       '#fff',
    margin:      '0 0 10px',
    lineHeight:  1.3,
  },
  sheetSub: {
    fontSize:   13,
    color:      'rgba(255,255,255,0.4)',
    margin:     '0 0 20px',
    lineHeight: 1.6,
  },
  sheetPreview: {
    background:   'rgba(255,255,255,0.04)',
    border:       '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding:      '12px 14px',
    marginBottom: 20,
  },
  sheetPreviewLabel: {
    fontSize:      9,
    fontWeight:    700,
    letterSpacing: 2,
    color:         'rgba(255,255,255,0.3)',
    margin:        '0 0 6px',
  },
  sheetPreviewText: {
    fontSize:   13,
    color:      'rgba(255,255,255,0.6)',
    margin:     0,
    fontStyle:  'italic',
    lineHeight: 1.5,
  },
  sheetBtn: {
    width:        '100%',
    padding:      '16px 0',
    background:   'linear-gradient(135deg, #1a4fff, #0070f3)',
    border:       'none',
    borderRadius: 14,
    color:        '#fff',
    fontSize:     15,
    fontWeight:   600,
    fontFamily:   "'DM Sans', sans-serif",
    cursor:       'pointer',
    marginBottom: 10,
    boxShadow:    '0 8px 24px rgba(26,79,255,0.3)',
  },
  sheetCancel: {
    width:      '100%',
    padding:    '14px 0',
    background: 'none',
    border:     'none',
    color:      'rgba(255,255,255,0.3)',
    fontSize:   14,
    fontFamily: "'DM Sans', sans-serif",
    cursor:     'pointer',
  },
};
