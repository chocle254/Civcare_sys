import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

const RISK_CONFIG = {
  critical: { color: '#ff4d6d', glow: 'rgba(255,77,109,0.4)', label: 'CRITICAL' },
  moderate: { color: '#ffd166', glow: 'rgba(255,209,102,0.4)', label: 'MODERATE' },
  low: { color: '#06d6a0', glow: 'rgba(6,214,160,0.4)', label: 'LOW RISK' },
};

// ── Live Medication Countdown Widget ─────────────────────────────────────────
function MedCountdown({ prescriptions }) {
  const [timers, setTimers] = useState([]);
  const [alertIdx, setAlertIdx] = useState(null);

  useEffect(() => {
    if (!prescriptions?.length) return;

    const calcTimers = () => {
      return prescriptions.map((p) => {
        const timesPerDay = parseInt((p.dosage_notation || '1x1').split('x')[1]) || 1;
        const intervalMs = (24 / timesPerDay) * 60 * 60 * 1000;
        const startMs = p.reminders_start_at ? new Date(p.reminders_start_at).getTime() : Date.now();
        const elapsed = (Date.now() - startMs) % intervalMs;
        const remaining = intervalMs - elapsed;
        return { ...p, remaining, intervalMs };
      });
    };

    setTimers(calcTimers());
    const iv = setInterval(() => {
      setTimers((prev) =>
        prev.map((t, i) => {
          const next = t.remaining - 1000;
          if (next <= 0) {
            setAlertIdx(i);
            setTimeout(() => setAlertIdx(null), 5000);
            return { ...t, remaining: t.intervalMs };
          }
          return { ...t, remaining: next };
        })
      );
    }, 1000);

    return () => clearInterval(iv);
  }, [prescriptions]);

  if (!timers.length) return null;

  const fmt = (ms) => {
    const tot = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(tot / 3600)).padStart(2, '0');
    const m = String(Math.floor((tot % 3600) / 60)).padStart(2, '0');
    const s = String(tot % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div style={sw.wrap}>
      <p style={sw.label}>💊 MEDICATION REMINDERS</p>
      {timers.map((t, i) => {
        const isAlert = alertIdx === i;
        return (
          <div key={t.id} style={{ ...sw.row, ...(isAlert ? sw.rowAlert : {}) }}>
            <div>
              <p style={sw.medName}>{t.medication_name}</p>
              <p style={sw.dose}>{t.dosage_notation || '—'} · {t.duration_days ? `${t.duration_days} days` : ''}</p>
            </div>
            <div style={{ ...sw.timer, color: isAlert ? '#ff4d6d' : '#06d6a0' }}>
              {isAlert ? '🔔 TAKE NOW!' : fmt(t.remaining)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const sw = {
  wrap: {
    margin: '0 20px 4px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 18,
    padding: '14px 16px',
    backdropFilter: 'blur(20px)',
  },
  label: {
    fontSize: 10, fontWeight: 700, letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.35)', margin: '0 0 10px',
  },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, padding: '8px 10px', borderRadius: 12,
    background: 'rgba(255,255,255,0.03)', transition: 'all 0.3s',
  },
  rowAlert: {
    background: 'rgba(255,77,109,0.15)', border: '1px solid rgba(255,77,109,0.4)',
    animation: 'alertPulse 0.5s ease infinite alternate',
  },
  medName: { fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 },
  dose: { fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' },
  timer: { fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: 2 },
};

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function SessionDashboard() {
  const navigate = useNavigate();
  const patient = (() => { try { return JSON.parse(localStorage.getItem('civtech_patient') || '{}'); } catch { return {}; } })();
  const [sessions, setSessions] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resumeSheet, setResumeSheet] = useState(null);
  const [activeTab, setActiveTab] = useState('home');

  const firstName = (patient.name || 'there').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const fetchData = useCallback(async () => {
    if (!patient.id) return;
    try {
      const [sessRes, presRes] = await Promise.allSettled([
        axios.get(`${API}/triage/sessions/${patient.id}`),
        axios.get(`${API}/prescriptions/active/${patient.id}`),
      ]);
      if (sessRes.status === 'fulfilled') setSessions(sessRes.value.data || []);
      if (presRes.status === 'fulfilled') setPrescriptions(presRes.value.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [patient.id]);

  useEffect(() => {
    if (!patient.id) { navigate('/'); return; }
    fetchData();
  }, [fetchData, navigate, patient.id]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleCardTap = (session) => {
    if (session.status === 'active') setResumeSheet(session);
    else { localStorage.setItem('civtech_session_id', session.id); navigate('/chat'); }
  };

  const handleResume = () => {
    localStorage.setItem('civtech_session_id', resumeSheet.id);
    setResumeSheet(null);
    navigate('/chat');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr), now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={s.page}>
      {/* ── Animated BG Orbs ── */}
      <div style={s.orb1} /><div style={s.orb2} /><div style={s.orb3} />

      {/* ── HEADER ── */}
      <div style={s.header}>
        <div style={s.brandMark}>C</div>
        <div style={s.headerMid}>
          <p style={s.greetingText}>{greeting},</p>
          <p style={s.greetingName}>{firstName} 👋</p>
        </div>
        <button style={s.avatarBtn} onClick={handleLogout}>
          {(patient.name || 'U')[0].toUpperCase()}
        </button>
      </div>

      {/* ── MEDICATION WIDGET ── */}
      <MedCountdown prescriptions={prescriptions} />

      {/* ── QUICK ACTION CHIPS ── */}
      <div style={s.chipsRow}>
        <button style={s.chipPrimary} onClick={() => { localStorage.removeItem('civtech_session_id'); navigate('/chat'); }}>
          <span style={s.chipIcon}>🧠</span>
          <span>AI Triage</span>
        </button>
        <button style={s.chipSecondary} onClick={() => { localStorage.removeItem('civtech_session_id'); navigate('/hospitals'); }}>
          <span style={s.chipIcon}>🏥</span>
          <span>Hospital</span>
        </button>
        <button style={s.chipSecondary} onClick={() => { localStorage.removeItem('civtech_session_id'); navigate('/consultation'); }}>
          <span style={s.chipIcon}>👨‍⚕️</span>
          <span>Doctor</span>
        </button>
      </div>

      {/* ── SESSION HISTORY ── */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <p style={s.sectionTitle}>HEALTH HISTORY</p>
          <span style={s.sessionCount}>{sessions.length} sessions</span>
        </div>

        {loading && (
          <div style={s.loadingRow}>
            {[1, 2, 3].map(i => <div key={i} style={s.skeleton} />)}
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div style={s.empty}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>🩺</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No consultations yet.</p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Start your first one above.</p>
          </div>
        )}

        {!loading && [...sessions]
          .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
          .map((session, i) => {
            const risk = RISK_CONFIG[session.risk_score] || RISK_CONFIG.low;
            const isActive = session.status === 'active';
            return (
              <div key={session.id} style={{ ...s.card, animationDelay: `${i * 0.06}s` }}
                onClick={() => handleCardTap(session)}>
                {/* Risk glow dot */}
                <div style={{ ...s.riskDot, background: risk.color, boxShadow: `0 0 12px ${risk.glow}` }} />
                <div style={s.cardBody}>
                  <div style={s.cardTop}>
                    <p style={s.cardTitle}>
                      {session.symptoms_summary || session.ai_assessment?.slice(0, 50) || 'Health Consultation'}
                      {(session.ai_assessment || '').length > 50 ? '…' : ''}
                    </p>
                    {isActive && <span style={s.activePill}>ACTIVE</span>}
                  </div>
                  <div style={s.cardMeta}>
                    <span style={{ ...s.riskBadge, color: risk.color }}>{risk.label}</span>
                    <span style={s.cardDate}>{formatDate(session.started_at)}</span>
                  </div>
                </div>
                <div style={s.cardChevron}>›</div>
              </div>
            );
          })}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={s.navBar}>
        {[
          { id: 'home', icon: '⊞', label: 'Home', action: () => setActiveTab('home') },
          { id: 'doctors', icon: '👨‍⚕️', label: 'Doctors', action: () => navigate('/consultation') },
          { id: 'hospitals', icon: '🏥', label: 'Nearby', action: () => navigate('/hospitals') },
          { id: 'profile', icon: '◎', label: 'Profile', action: () => { } },
        ].map(tab => (
          <button key={tab.id} style={s.navBtn} onClick={tab.action}>
            <span style={{ ...s.navIcon, ...(activeTab === tab.id ? s.navIconActive : {}) }}>
              {tab.icon}
            </span>
            <span style={{ ...s.navLabel, ...(activeTab === tab.id ? s.navLabelActive : {}) }}>
              {tab.label}
            </span>
            {activeTab === tab.id && <div style={s.navActiveDot} />}
          </button>
        ))}
      </div>

      {/* ── RESUME SHEET ── */}
      {resumeSheet && (
        <>
          <div style={s.overlay} onClick={() => setResumeSheet(null)} />
          <div style={s.sheet}>
            <div style={s.sheetPill} />
            <p style={s.sheetEye}>CONTINUING SESSION</p>
            <h2 style={s.sheetTitle}>
              {resumeSheet.ai_assessment?.slice(0, 55) || 'Active Consultation'}
              {(resumeSheet.ai_assessment || '').length > 55 ? '…' : ''}
            </h2>
            <p style={s.sheetSub}>The AI has full context and will continue from where you left off.</p>
            {resumeSheet.last_message && (
              <div style={s.sheetPreview}>
                <p style={s.sheetPreviewLabel}>LAST MESSAGE</p>
                <p style={s.sheetPreviewText}>"{resumeSheet.last_message}"</p>
              </div>
            )}
            <button style={s.sheetBtn} onClick={handleResume}>Resume Conversation →</button>
            <button style={s.sheetCancel} onClick={() => setResumeSheet(null)}>Not now</button>
          </div>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@500&display=swap');
        @keyframes orb { 0%,100%{transform:scale(1) translate(-50%,-50%);opacity:0.6} 50%{transform:scale(1.12) translate(-50%,-50%);opacity:0.9} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { from{background-position:-400px 0} to{background-position:400px 0} }
        @keyframes alertPulse { from{box-shadow:0 0 0 rgba(255,77,109,0)} to{box-shadow:0 0 18px rgba(255,77,109,0.5)} }
        @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh', backgroundColor: '#080810',
    fontFamily: "'Outfit', sans-serif", color: '#fff',
    position: 'relative', overflowX: 'hidden', paddingBottom: 90,
  },
  orb1: {
    position: 'absolute', top: -100, left: '20%', width: 350, height: 350,
    borderRadius: '50%', background: 'radial-gradient(circle,#4f46e5 0%,transparent 70%)',
    filter: 'blur(60px)', opacity: 0.5, animation: 'orb 7s ease-in-out infinite',
    pointerEvents: 'none', zIndex: 0, transform: 'translate(-50%,-50%)',
  },
  orb2: {
    position: 'absolute', top: 50, right: -50, width: 280, height: 280,
    borderRadius: '50%', background: 'radial-gradient(circle,#06d6a0 0%,transparent 70%)',
    filter: 'blur(60px)', opacity: 0.3, animation: 'orb 9s ease-in-out 2s infinite',
    pointerEvents: 'none', zIndex: 0, transform: 'translate(-50%,-50%)',
  },
  orb3: {
    position: 'absolute', top: 200, left: '60%', width: 220, height: 220,
    borderRadius: '50%', background: 'radial-gradient(circle,#f72585 0%,transparent 70%)',
    filter: 'blur(50px)', opacity: 0.2, animation: 'orb 11s ease-in-out 4s infinite',
    pointerEvents: 'none', zIndex: 0,
  },
  header: {
    position: 'relative', zIndex: 10,
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '52px 20px 16px',
  },
  brandMark: {
    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 18, color: '#fff',
    boxShadow: '0 4px 20px rgba(79,70,229,0.5)',
  },
  headerMid: { flex: 1 },
  greetingText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, letterSpacing: 0.5 },
  greetingName: { fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 },
  avatarBtn: {
    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg,#4f46e5,#06d6a0)',
    border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(79,70,229,0.4)',
  },
  chipsRow: {
    position: 'relative', zIndex: 10,
    display: 'flex', gap: 10, padding: '4px 20px 16px',
  },
  chipPrimary: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: '12px 8px', border: 'none', borderRadius: 16, cursor: 'pointer',
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: "'Outfit',sans-serif",
    boxShadow: '0 6px 24px rgba(79,70,229,0.45)',
    animation: 'fadeUp 0.5s ease 0.1s both',
  },
  chipSecondary: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: '12px 8px', cursor: 'pointer', fontFamily: "'Outfit',sans-serif",
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16, color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600,
    backdropFilter: 'blur(12px)', animation: 'fadeUp 0.5s ease 0.15s both',
  },
  chipIcon: { fontSize: 16 },
  section: {
    position: 'relative', zIndex: 10,
    padding: '8px 20px 0', animation: 'fadeUp 0.5s ease 0.2s both',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10, fontWeight: 700, letterSpacing: 3,
    color: 'rgba(255,255,255,0.3)', margin: 0,
  },
  sessionCount: {
    fontSize: 11, color: 'rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '2px 10px',
  },
  card: {
    display: 'flex', alignItems: 'center', gap: 14,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
    backdropFilter: 'blur(16px)', borderRadius: 18, padding: '14px 14px',
    marginBottom: 10, cursor: 'pointer', animation: 'fadeUp 0.5s ease both',
    transition: 'background 0.2s, transform 0.15s',
  },
  riskDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  cardBody: { flex: 1, overflow: 'hidden' },
  cardTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 },
  cardTitle: {
    fontSize: 14, fontWeight: 600, color: '#fff', margin: 0,
    flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
  },
  activePill: {
    fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
    color: '#06d6a0', background: 'rgba(6,214,160,0.15)',
    border: '1px solid rgba(6,214,160,0.3)', borderRadius: 20, padding: '2px 7px', flexShrink: 0,
  },
  cardMeta: { display: 'flex', alignItems: 'center', gap: 8 },
  riskBadge: { fontSize: 10, fontWeight: 700, letterSpacing: 1 },
  cardDate: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  cardChevron: { fontSize: 22, color: 'rgba(255,255,255,0.2)', flexShrink: 0 },
  empty: { textAlign: 'center', padding: '60px 0' },
  loadingRow: { display: 'flex', flexDirection: 'column', gap: 10 },
  skeleton: {
    height: 66, borderRadius: 18,
    background: 'linear-gradient(90deg,#111118 25%,#1a1a28 50%,#111118 75%)',
    backgroundSize: '400px 100%', animation: 'shimmer 1.6s infinite',
  },
  navBar: {
    position: 'fixed', bottom: 16, left: 16, right: 16,
    height: 62, background: 'rgba(10,10,20,0.85)',
    backdropFilter: 'blur(30px)', borderRadius: 22,
    border: '1px solid rgba(255,255,255,0.09)',
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  navBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 16px',
    position: 'relative',
  },
  navIcon: { fontSize: 20, transition: 'transform 0.2s' },
  navIconActive: { transform: 'scale(1.2)' },
  navLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: "'Outfit',sans-serif" },
  navLabelActive: { color: '#4f46e5', fontWeight: 600 },
  navActiveDot: {
    position: 'absolute', top: -6, width: 4, height: 4,
    borderRadius: '50%', background: '#4f46e5',
  },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, backdropFilter: 'blur(6px)' },
  sheet: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: 'rgba(12,12,22,0.97)', backdropFilter: 'blur(30px)',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '28px 28px 0 0', padding: '20px 24px 44px',
    zIndex: 201, animation: 'sheetUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
  },
  sheetPill: { width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 20px' },
  sheetEye: { fontSize: 10, fontWeight: 700, letterSpacing: 2.5, color: '#4f46e5', margin: '0 0 10px' },
  sheetTitle: { fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 10px', lineHeight: 1.3 },
  sheetSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 20px', lineHeight: 1.6 },
  sheetPreview: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px', marginBottom: 20 },
  sheetPreviewLabel: { fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.3)', margin: '0 0 6px' },
  sheetPreviewText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0, fontStyle: 'italic', lineHeight: 1.5 },
  sheetBtn: {
    width: '100%', padding: '16px 0',
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    border: 'none', borderRadius: 16, color: '#fff', fontSize: 15, fontWeight: 600,
    fontFamily: "'Outfit',sans-serif", cursor: 'pointer', marginBottom: 10,
    boxShadow: '0 8px 24px rgba(79,70,229,0.4)',
  },
  sheetCancel: { width: '100%', padding: '14px 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 14, fontFamily: "'Outfit',sans-serif", cursor: 'pointer' },
};
