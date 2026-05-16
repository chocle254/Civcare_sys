import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { updateDoctorStatus, redirectPatients, pingDoctor } from "../../api/doctors";
import { callPatient } from "../../api/triage";
import useWebSocket from "../../hooks/useWebSocket";
import client from "../../api/client";

// ─── Theme ───────────────────────────────────────────────
const T = {
  bg: "#0b0b0e",
  surface: "#111116",
  card: "#15151c",
  cardHi: "#1c1c26",
  border: "rgba(255,255,255,0.07)",
  borderHi: "rgba(255,255,255,0.13)",
  text: "#dcdcee",
  muted: "#6c6c9a",
  dim: "#383858",
  accent: "#00d4aa",
  accentBg: "rgba(0,212,170,0.1)",
  accentBd: "rgba(0,212,170,0.25)",
  red: "#ff3d5a",
  redBg: "rgba(255,61,90,0.1)",
  redBd: "rgba(255,61,90,0.25)",
  amber: "#ffaa22",
  amberBg: "rgba(255,170,34,0.1)",
  amberBd: "rgba(255,170,34,0.25)",
  green: "#00cc88",
  greenBg: "rgba(0,204,136,0.1)",
  greenBd: "rgba(0,204,136,0.25)",
  blue: "#4d8fff",
  blueBg: "rgba(77,143,255,0.1)",
  blueBd: "rgba(77,143,255,0.25)",
};

const RISK = {
  critical: { color: T.red, bg: T.redBg, bd: T.redBd, label: "Critical" },
  moderate: { color: T.amber, bg: T.amberBg, bd: T.amberBd, label: "Moderate" },
  low: { color: T.green, bg: T.greenBg, bd: T.greenBd, label: "Low" },
};

const STATUS_CFG = {
  available: { color: T.green, bg: T.greenBg, bd: T.greenBd, label: "Available" },
  on_break: { color: T.amber, bg: T.amberBg, bd: T.amberBd, label: "On Break" },
  offline: { color: T.red, bg: T.redBg, bd: T.redBd, label: "Offline" },
  with_patient: { color: T.blue, bg: T.blueBg, bd: T.blueBd, label: "With Patient" },
};

function timeSince(date) {
  const m = Math.floor((Date.now() - new Date(date)) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ${m % 60}m` : `${Math.floor(h / 24)}d`;
}

// ─── CSS (injected once) ──────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Manrope:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar        { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track  { background: transparent; }
  ::-webkit-scrollbar-thumb  { background: rgba(255,255,255,0.1); border-radius: 2px; }

  .civtech-root {
    display: flex; height: 100vh; overflow: hidden;
    background: ${T.bg}; font-family: 'Manrope', sans-serif; color: ${T.text};
    position: relative;
  }
  .civtech-root::before {
    content: '';
    position: fixed; top: -200px; left: -100px; width: 600px; height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%);
    filter: blur(60px); pointer-events: none; z-index: 0;
  }
  .civtech-root::after {
    content: '';
    position: fixed; bottom: -100px; right: -100px; width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(77,143,255,0.06) 0%, transparent 70%);
    filter: blur(60px); pointer-events: none; z-index: 0;
  }

  .ct-sidebar {
    width: 216px; flex-shrink: 0; position: relative; z-index: 10;
    background: rgba(255,255,255,0.03);
    border-right: 1px solid rgba(255,255,255,0.07);
    backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    display: flex; flex-direction: column; padding: 22px 14px 18px;
  }
  .ct-logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 17px; color: ${T.accent}; letter-spacing: -0.5px; text-shadow: 0 0 20px rgba(0,212,170,0.4); }
  .ct-logo-sub { font-family: 'DM Mono', monospace; font-size: 10px; color: ${T.muted}; margin-top: 3px; }

  .ct-section-label {
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
    color: rgba(255,255,255,0.2); padding: 0 10px; margin: 0 0 6px;
  }
  .ct-nav-btn {
    display: flex; align-items: center; gap: 9px;
    padding: 10px 12px; border-radius: 10px; width: 100%; text-align: left;
    border: none; background: none; cursor: pointer;
    color: rgba(255,255,255,0.4); font-size: 13px; font-family: 'Manrope', sans-serif; font-weight: 500;
    transition: all 0.15s;
  }
  .ct-nav-btn:hover  { background: rgba(255,255,255,0.06); color: ${T.text}; }
  .ct-nav-btn.active { background: ${T.accentBg}; color: ${T.accent}; border: 1px solid ${T.accentBd}; }
  .ct-nav-btn.danger:hover { color: ${T.red}; background: ${T.redBg}; }

  .ct-badge {
    margin-left: auto; border-radius: 10px; padding: 2px 7px;
    font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 500;
  }
  .ct-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, rgba(0,212,170,0.3), rgba(77,143,255,0.2));
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: ${T.accent}; flex-shrink: 0;
    border: 1px solid ${T.accentBd};
    box-shadow: 0 0 20px rgba(0,212,170,0.25), inset 0 1px 0 rgba(255,255,255,0.1);
  }
  .ct-status-pill {
    display: flex; align-items: center; gap: 7px;
    border-radius: 10px; padding: 8px 12px; width: 100%;
    border: 1px solid transparent; background: none; cursor: pointer;
    font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 600;
    transition: all 0.15s; margin-bottom: 6px;
  }
  .ct-status-pill .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

  .ct-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; z-index: 10; }
  .ct-header {
    padding: 14px 26px; border-bottom: 1px solid rgba(255,255,255,0.07);
    background: rgba(11,11,14,0.7); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
  }
  .ct-header-crumb { font-family: 'DM Mono', monospace; font-size: 11px; color: rgba(255,255,255,0.3); }
  .ct-header-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 20px; color: ${T.text}; margin-top: 2px; }
  .ct-content { flex: 1; overflow-y: auto; padding: 22px 26px; }

  .ct-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
  .ct-stat-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-radius: 18px; padding: 20px 20px;
    border-top-width: 2px;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
    animation: fadeUp 0.4s ease both;
    position: relative; overflow: hidden;
  }
  .ct-stat-card::before {
    content:''; position:absolute; inset:0;
    background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%);
    pointer-events:none;
  }
  .ct-stat-card:hover { border-color: rgba(255,255,255,0.14); box-shadow: 0 12px 40px rgba(0,0,0,0.3); transform: translateY(-2px); }
  .ct-stat-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.35); margin-bottom: 12px; text-transform: uppercase; }
  .ct-stat-value { font-family: 'DM Mono', monospace; font-size: 36px; font-weight: 500; line-height: 1; }
  .ct-stat-sub   { font-size: 11px; color: rgba(255,255,255,0.25); margin-top: 8px; }

  .ct-grid { display: grid; grid-template-columns: 1fr 292px; gap: 16px; }

  .ct-panel {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-radius: 18px; overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s;
    animation: fadeUp 0.45s ease both;
    position: relative;
  }
  .ct-panel::before {
    content:''; position:absolute; top:0; left:0; right:0; height:1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
    pointer-events:none;
  }
  .ct-panel:hover { border-color: rgba(255,255,255,0.12); box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
  .ct-panel-header {
    padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center; justify-content: space-between;
    font-size: 13px; font-weight: 600; color: ${T.text};
    background: rgba(255,255,255,0.02);
  }
  .ct-panel-sub { font-family: 'DM Mono', monospace; font-size: 10px; color: rgba(255,255,255,0.25); }

  .ct-table { width: 100%; border-collapse: collapse; }
  .ct-table th { padding: 10px 18px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.25); border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); text-transform: uppercase; }
  .ct-table tr.data-row { transition: background 0.12s; cursor: pointer; }
  .ct-table tr.data-row:hover { background: rgba(255,255,255,0.04); }
  .ct-table td { padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: middle; }

  .ct-risk-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 11px; border-radius: 20px;
    font-size: 11px; font-weight: 700;
    border: 1px solid transparent;
    backdrop-filter: blur(8px);
  }
  .ct-risk-dot { width: 6px; height: 6px; border-radius: 50%; }

  .ct-btn {
    border: none; border-radius: 9px; padding: 6px 15px;
    font-size: 12px; font-weight: 600; cursor: pointer;
    font-family: 'Manrope', sans-serif;
    transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
    backdrop-filter: blur(8px);
  }
  .ct-btn:hover:not(:disabled) { opacity:0.9; transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,0,0,0.3); }
  .ct-btn:active:not(:disabled){ transform:translateY(0); }
  .ct-btn:disabled { opacity:0.35; cursor:default; }

  .ct-feed-item { padding: 13px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .ct-feed-item:last-child { border-bottom: none; }
  .ct-tag { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; padding: 2px 8px; border-radius: 5px; }
  .ct-activity-row { display:flex; align-items:center; gap:10px; padding:10px 20px; border-bottom:1px solid rgba(255,255,255,0.05); }
  .ct-activity-row:last-child { border-bottom:none; }
  .ct-activity-icon { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; flex-shrink:0; }

  .ct-live { display:inline-flex; align-items:center; gap:6px; }
  .ct-live-dot {
    width:8px; height:8px; border-radius:50%;
    background:${T.accent}; animation:livePulse 2s infinite;
    box-shadow:0 0 10px ${T.accent};
  }
  @keyframes livePulse {
    0%,100% { opacity:1; box-shadow:0 0 10px ${T.accent}; }
    50%      { opacity:0.3; box-shadow:0 0 3px ${T.accent}; }
  }
  .ct-consult-card {
    background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
    backdrop-filter:blur(20px); border-radius:18px;
    padding:20px; transition:border-color 0.15s, box-shadow 0.2s, transform 0.2s;
    animation:fadeUp 0.4s ease both; position:relative; overflow:hidden;
  }
  .ct-consult-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,0.03),transparent 60%); pointer-events:none; }
  .ct-consult-card:hover { border-color:rgba(255,255,255,0.14); box-shadow:0 12px 40px rgba(0,0,0,0.25); transform:translateY(-2px); }
  .ct-status-chip {
    display:flex; align-items:center; gap:6px;
    padding:6px 14px; border-radius:20px;
    font-size:12px; font-weight:600; border:1px solid;
    backdrop-filter:blur(8px);
  }
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
`;

export default function Dashboard() {
  const navigate = useNavigate();
  const doctor = JSON.parse(localStorage.getItem("civtech_doctor") || "{}");

  const [view, setView] = useState("queue");
  const [queue, setQueue] = useState([]);
  const [status, setStatus] = useState(doctor.status || "available");
  const [calling, setCalling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [consults, setConsults] = useState([]);
  const [consultsLoading, setConsultsLoading] = useState(false);

  // ── Load queue ──
  const loadQueue = useCallback(async () => {
    try {
      const res = await client.get(
        `/triage/queue?hospital_id=${doctor.hospital_id}&doctor_id=${doctor.id}`
      );
      setQueue(res.data);
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, [doctor.hospital_id, doctor.id]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const loadConsults = useCallback(async () => {
    setConsultsLoading(true);
    try {
      const res = await client.get(`/consultation/pending?doctor_id=${doctor.id}`);
      setConsults(res.data);
    } catch {
      setConsults([]);
    } finally {
      setConsultsLoading(false);
    }
  }, [doctor.id]);

  useEffect(() => {
    if (view === "consults") loadConsults();
  }, [view, loadConsults]);


  // ── WebSocket ──
  useWebSocket(doctor.hospital_id, (data) => {
    if (data.type === "queue_update") setQueue(data.queue);
  });

  // ── Ping ──
  useEffect(() => {
    const t = setInterval(() => pingDoctor(doctor.id).catch(() => { }), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [doctor.id]);

  // ── Status change ──
  const handleStatusChange = async (newStatus) => {
    try {
      await updateDoctorStatus({ doctor_id: doctor.id, status: newStatus });
      setStatus(newStatus);
      localStorage.setItem("civtech_doctor", JSON.stringify({ ...doctor, status: newStatus }));
      if (newStatus === "on_break" || newStatus === "offline") {
        await redirectPatients({
          doctor_id: doctor.id,
          hospital_id: doctor.hospital_id,
          reason: newStatus === "on_break" ? "break" : "shift_end",
        });
        await loadQueue();
      }
    } catch {
      alert("Could not update status. Please try again.");
    }
  };

  // ── Call patient ──
  const handleCall = async (appt) => {
    setCalling(appt.id);
    try {
      await callPatient({ appointment_id: appt.id, doctor_id: doctor.id });
      await loadQueue(); // ← refreshes queue AND triggers WebSocket broadcast to all doctors
    } catch {
      alert("Could not notify patient. Please try again.");
    } finally {
      setCalling(null);
    }
  };

  const sortedQueue = [...queue].sort((a, b) => {
    const ord = { critical: 0, moderate: 1, low: 2 };
    return (ord[a.risk_score] ?? 3) - (ord[b.risk_score] ?? 3);
  });

  const critical = queue.filter((a) => a.risk_score === "critical").length;
  const moderate = queue.filter((a) => a.risk_score === "moderate").length;
  const sCfg = STATUS_CFG[status] || STATUS_CFG.available;
  const doctorName = doctor.full_name || doctor.name || "Doctor";
  const initials = doctorName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <style>{CSS}</style>
      <div className="civtech-root">

        {/* ════════════════ SIDEBAR ════════════════ */}
        <aside className="ct-sidebar">

          {/* Logo */}
          <div style={{ marginBottom: 28 }}>
            <div className="ct-logo">CivTech Care</div>
            <div className="ct-logo-sub">Doctor Portal</div>
          </div>

          {/* Nav */}
          <div style={{ flex: 1 }}>
            <p className="ct-section-label">WORKSPACE</p>
            <button className={`ct-nav-btn ${view === "queue" ? "active" : ""}`} onClick={() => setView("queue")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Patient Queue
              {queue.length > 0 && (
                <span className="ct-badge" style={{
                  background: view === "queue" ? T.accent : T.dim,
                  color: view === "queue" ? T.bg : T.muted,
                }}>
                  {queue.length}
                </span>
              )}
            </button>
            <button className={`ct-nav-btn ${view === "consults" ? "active" : ""}`} onClick={() => setView("consults")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              Consultations
            </button>
          </div>

          {/* Doctor card */}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div className="ct-avatar">{initials}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Dr. {doctorName}
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doctor.specialisation || "General Practitioner"}
                </div>
              </div>
            </div>

            {/* Status switcher */}
            <p className="ct-section-label" style={{ marginBottom: 8 }}>STATUS</p>
            {[
              { id: "available", color: T.green, bg: T.greenBg, bd: T.greenBd, label: "Available" },
              { id: "on_break", color: T.amber, bg: T.amberBg, bd: T.amberBd, label: "On Break" },
              { id: "offline", color: T.red, bg: T.redBg, bd: T.redBd, label: "Offline" },
            ].map((s) => (
              <button key={s.id} className="ct-status-pill" onClick={() => handleStatusChange(s.id)}
                style={{
                  background: status === s.id ? s.bg : "transparent",
                  color: status === s.id ? s.color : T.dim,
                  borderColor: status === s.id ? s.bd : T.border,
                }}>
                <span className="dot" style={{ background: s.color, opacity: status === s.id ? 1 : 0.35 }} />
                {s.label}
              </button>
            ))}

            <button className="ct-nav-btn danger" style={{ marginTop: 6 }}
              onClick={() => { localStorage.clear(); navigate("/doctor"); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </aside>

        {/* ════════════════ MAIN ════════════════ */}
        <main className="ct-main">

          {/* Header */}
          <header className="ct-header">
            <div>
              <div className="ct-header-crumb">
                {doctor.hospital_name || "Hospital"} / {view === "queue" ? "Patient Queue" : "Consultations"}
              </div>
              <div className="ct-header-title">
                {view === "queue" ? "Patient Queue" : "Online Consultations"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: T.muted }}>
                {new Date().toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </div>
              <div className="ct-status-chip" style={{
                background: sCfg.bg,
                color: sCfg.color,
                borderColor: sCfg.bd,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: sCfg.color }} />
                {sCfg.label}
              </div>
            </div>
          </header>

          {/* Scrollable content */}
          <div className="ct-content">

            {/* ── Stat cards ── */}
            <div className="ct-stats">
              {[
                { label: "IN QUEUE", value: queue.length, sub: "patients waiting", color: T.accent, bg: T.accentBg },
                { label: "CRITICAL", value: critical, sub: "need attention now", color: T.red, bg: T.redBg },
                { label: "MODERATE", value: moderate, sub: "monitoring needed", color: T.amber, bg: T.amberBg },
                { label: "MY STATUS", value: sCfg.label, sub: "current availability", color: sCfg.color, bg: sCfg.bg },
              ].map(({ label, value, sub, color, bg }) => (
                <div key={label} className="ct-stat-card" style={{ borderTopColor: color }}>
                  <div className="ct-stat-label">{label}</div>
                  <div className="ct-stat-value" style={{ color }}>{value}</div>
                  <div className="ct-stat-sub">{sub}</div>
                </div>
              ))}
            </div>

            {/* ── Queue view ── */}
            {view === "queue" && (
              <div className="ct-grid">

                {/* Queue table */}
                <div className="ct-panel">
                  <div className="ct-panel-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="ct-live"><span className="ct-live-dot" /></span>
                      Live Queue
                    </div>
                    <span className="ct-panel-sub">sorted by risk · {queue.length} patient{queue.length !== 1 ? "s" : ""}</span>
                  </div>

                  {loading ? (
                    <div style={{ padding: 40, textAlign: "center", color: T.muted, fontSize: 13 }}>
                      Loading queue...
                    </div>
                  ) : queue.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center" }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>—</div>
                      <div style={{ fontWeight: 600, color: T.text, marginBottom: 6 }}>Queue is clear</div>
                      <div style={{ fontSize: 12, color: T.muted }}>No patients waiting right now.</div>
                    </div>
                  ) : (
                    <table className="ct-table">
                      <thead>
                        <tr>
                          {["#", "Patient", "Risk", "Symptoms", "Arrived", "Actions"].map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedQueue.map((appt, idx) => {
                          const r = RISK[appt.risk_score] || RISK.moderate;
                          const isCalling = calling === appt.id;
                          const called = appt.status === "called";
                          return (
                            <tr key={appt.id} className="data-row"
                              style={{ borderLeft: `3px solid ${r.color}` }}
                              onClick={() => navigate(`/doctor/patient/${appt.id}`)}>
                              <td>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: T.dim }}>{idx + 1}</span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{appt.patient_name}</div>
                                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.muted, marginTop: 2 }}>{appt.patient_phone}</div>
                              </td>
                              <td>
                                <span className="ct-risk-badge" style={{ background: r.bg, color: r.color }}>
                                  <span className="ct-risk-dot" style={{ background: r.color }} />
                                  {r.label}
                                </span>
                                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.dim, marginTop: 4 }}>{appt.risk_numeric}/100</div>
                              </td>
                              <td style={{ maxWidth: 180 }}>
                                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                  {appt.symptoms_summary || "—"}
                                </div>
                              </td>
                              <td>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.dim, whiteSpace: "nowrap" }}>
                                  {appt.arrived_at ? timeSince(appt.arrived_at) : "Pending"}
                                </span>
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button className="ct-btn" disabled={isCalling || called}
                                    onClick={() => handleCall(appt)}
                                    style={{ background: called ? T.greenBg : T.accentBg, color: called ? T.green : T.accent }}>
                                    {isCalling ? "..." : called ? "Called ✓" : "Call"}
                                  </button>
                                  <button className="ct-btn"
                                    style={{ background: T.cardHi, color: T.muted }}
                                    onClick={() => navigate(`/doctor/patient/${appt.id}`)}>
                                    View
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Right panel */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                  {/* AI Triage Feed */}
                  <div className="ct-panel" style={{ flex: 1 }}>
                    <div className="ct-panel-header">
                      AI Triage Feed
                      <span className="ct-live"><span className="ct-live-dot" /></span>
                    </div>
                    <div>
                      {sortedQueue.slice(0, 4).map((appt, i) => {
                        const r = RISK[appt.risk_score] || RISK.moderate;
                        return (
                          <div key={appt.id} className="ct-feed-item">
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                              <span className="ct-tag" style={{ background: r.bg, color: r.color }}>
                                {(appt.risk_score || "").toUpperCase()}
                              </span>
                              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.dim, marginLeft: "auto" }}>
                                {appt.arrived_at ? timeSince(appt.arrived_at) : "—"}
                              </span>
                            </div>
                            <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.55, fontWeight: 500 }}>
                              <span style={{ color: T.text }}>{appt.patient_name}</span>
                              {appt.ai_assessment
                                ? ` — ${appt.ai_assessment.slice(0, 90)}${appt.ai_assessment.length > 90 ? "..." : ""}`
                                : appt.symptoms_summary
                                  ? ` — ${appt.symptoms_summary.slice(0, 90)}`
                                  : ""}
                            </p>
                          </div>
                        );
                      })}
                      {queue.length === 0 && (
                        <div style={{ padding: "20px 16px", fontSize: 12, color: T.dim, textAlign: "center" }}>
                          No triage data yet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Queue summary */}
                  <div className="ct-panel">
                    <div className="ct-panel-header">Queue Summary</div>
                    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                      {[
                        { label: "Critical", value: queue.filter(a => a.risk_score === "critical").length, color: T.red },
                        { label: "Moderate", value: queue.filter(a => a.risk_score === "moderate").length, color: T.amber },
                        { label: "Low Risk", value: queue.filter(a => a.risk_score === "low").length, color: T.green },
                        { label: "Called / Ready", value: queue.filter(a => a.status === "called").length, color: T.blue },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: T.muted }}>{label}</span>
                          </div>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, color: value > 0 ? color : T.dim }}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Consultations view ── */}
            {view === "consults" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 4 }}>
                  <span className="ct-live"><span className="ct-live-dot" /></span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Pending Consultations</span>
                  <span style={{ marginLeft: "auto", fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.dim }}>
                    {consults.length} waiting
                  </span>
                </div>

                {consultsLoading && (
                  <div style={{ padding: 40, textAlign: "center", color: T.muted, fontSize: 13 }}>
                    Loading consultations...
                  </div>
                )}

                {!consultsLoading && consults.length === 0 && (
                  <div className="ct-panel" style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 10, color: T.dim }}>—</div>
                    <div style={{ fontWeight: 600, color: T.text, marginBottom: 6 }}>No pending consultations</div>
                    <div style={{ fontSize: 12, color: T.muted }}>Patients who book online will appear here.</div>
                  </div>
                )}

                {!consultsLoading && consults.map((c) => (
                  <div key={c.id} className="ct-panel" style={{ padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 3 }}>{c.patient_name}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.accent, marginBottom: 8 }}>{c.patient_phone}</div>
                      <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {c.symptoms_summary}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 500, color: T.accent, marginBottom: 4 }}>
                        KES {c.fee_amount?.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 10, color: T.dim, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
                        {c.started ? timeSince(c.started) : "—"}
                      </div>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <a href={`tel:${c.patient_phone}`} style={{ textDecoration: "none" }}>
                          <button className="ct-btn" style={{ background: T.greenBg, color: T.green }}>Call</button>
                        </a>
                        <button className="ct-btn" style={{ background: T.accentBg, color: T.accent }}
                          onClick={() => navigate(`/doctor/consult/${c.id}`)}>
                          Open →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}