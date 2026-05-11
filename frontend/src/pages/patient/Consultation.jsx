import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

const SPEC_COLORS = {
  'General Practitioner': '#1a4fff',
  'Internal Medicine':    '#7c3aed',
  'Emergency Medicine':   '#dc2626',
  'Paediatrics':          '#059669',
  'Gynaecology':          '#db2777',
  'Dermatology':          '#d97706',
};

const SPEC_ICON = {
  'General Practitioner': '🩺',
  'Internal Medicine':    '🫀',
  'Emergency Medicine':   '🚨',
  'Paediatrics':          '👶',
  'Gynaecology':          '🌸',
  'Dermatology':          '🔬',
};

export default function Consultation() {
  const navigate  = useNavigate();
  const patient   = JSON.parse(localStorage.getItem('civtech_patient') || '{}');
  const sessionId = localStorage.getItem('civtech_session_id');

  const [doctors,  setDoctors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('All');
  const [selected, setSelected] = useState(null);

  const FILTERS = ['All', 'General Practitioner', 'Internal Medicine', 'Emergency Medicine'];

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await axios.get(`${API}/doctors/available`);
      setDoctors(res.data);
    } catch (e) {
      console.error('Failed to load doctors:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConsult = async (doctor) => {
    setSelected(doctor.id);
    try {
      await axios.post(`${API}/consultation/initiate`, {
        patient_id:     patient.id,
        doctor_id:      doctor.id,
        session_id:     sessionId,
        payment_method: 'mpesa',
        fee_amount:     doctor.consultation_fee,
      });
      navigate('/consultation/room');
    } catch (e) {
      console.error('Consultation initiation failed:', e);
      setSelected(null);
    }
  };

  const filtered = filter === 'All'
    ? doctors
    : doctors.filter((d) => d.specialisation === filter);

  const renderStars = (rating) => {
    const full = Math.floor(rating || 0);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  };

  return (
    <div style={s.page}>
      {/* ── HEADER ── */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/dashboard')}>‹</button>
        <div>
          <h1 style={s.headerTitle}>Doctors</h1>
          <p style={s.headerSub}>{doctors.length} available now</p>
        </div>
        <div style={s.onlinePill}>
          <span style={s.onlineDot} />
          Live
        </div>
      </div>

      {/* ── FILTER TABS (Binance-style horizontal scroll) ── */}
      <div style={s.filterRow}>
        {FILTERS.map((f) => (
          <button
            key={f}
            style={{
              ...s.filterBtn,
              ...(filter === f ? s.filterActive : {}),
            }}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── COLUMN HEADERS (Binance style) ── */}
      <div style={s.colHeader}>
        <span style={{ flex: 1 }}>Doctor / Hospital</span>
        <span style={{ width: 80, textAlign: 'right' }}>Rating</span>
        <span style={{ width: 90, textAlign: 'right' }}>Fee</span>
      </div>

      {/* ── DOCTOR LIST ── */}
      <div style={s.list}>
        {loading && (
          <div style={s.loadingWrap}>
            {[1,2,3].map((i) => (
              <div key={i} style={s.skeleton} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={s.empty}>
            <p style={{ fontSize: 32 }}>🩺</p>
            <p style={{ color: '#555', fontSize: 14 }}>No doctors available right now.</p>
          </div>
        )}

        {!loading && filtered.map((doc) => {
          const specColor = SPEC_COLORS[doc.specialisation] || '#1a4fff';
          const specIcon  = SPEC_ICON[doc.specialisation]   || '👨‍⚕️';
          const isSelecting = selected === doc.id;

          return (
            <div key={doc.id} style={s.row}>
              {/* Left — icon + name */}
              <div style={s.rowLeft}>
                <div style={{ ...s.docIcon, background: `${specColor}22`, border: `1px solid ${specColor}44` }}>
                  <span style={s.docIconEmoji}>{specIcon}</span>
                </div>
                <div style={s.docInfo}>
                  <p style={s.docName}>{doc.full_name}</p>
                  <p style={s.docSpec}>{doc.specialisation}</p>
                  {doc.hospital_name && (
                    <p style={s.docHospital}>🏥 {doc.hospital_name}</p>
                  )}
                </div>
              </div>

              {/* Middle — rating */}
              <div style={s.ratingWrap}>
                <p style={s.stars}>{renderStars(doc.ai_accuracy_rating)}</p>
                <p style={s.ratingNum}>
                  {doc.ai_accuracy_rating ? doc.ai_accuracy_rating.toFixed(1) : '—'}
                </p>
              </div>

              {/* Right — fee button */}
              <button
                style={{
                  ...s.feeBtn,
                  background: isSelecting ? '#333' : `linear-gradient(135deg, ${specColor}, ${specColor}cc)`,
                }}
                onClick={() => handleConsult(doc)}
                disabled={!!selected}
              >
                {isSelecting ? '...' : `KSh ${doc.consultation_fee?.toLocaleString() || '—'}`}
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');
        @keyframes shimmer {
          from { background-position: -200% 0; }
          to   { background-position:  200% 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const s = {
  page: {
    minHeight:       '100vh',
    backgroundColor: '#0a0a0a',
    fontFamily:      "'DM Sans', sans-serif",
    color:           '#fff',
    paddingBottom:   40,
  },
  header: {
    display:        'flex',
    alignItems:     'center',
    gap:            12,
    padding:        '18px 20px 14px',
    borderBottom:   '1px solid rgba(255,255,255,0.06)',
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
  headerTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize:   20,
    fontWeight: 700,
    margin:     '0 0 2px',
  },
  headerSub: {
    fontSize: 12,
    color:    'rgba(255,255,255,0.35)',
    margin:   0,
  },
  onlinePill: {
    marginLeft:  'auto',
    display:     'flex',
    alignItems:  'center',
    gap:         5,
    background:  'rgba(0,229,160,0.1)',
    border:      '1px solid rgba(0,229,160,0.25)',
    borderRadius:20,
    padding:     '4px 10px',
    fontSize:    12,
    color:       '#00e5a0',
    fontWeight:  600,
  },
  onlineDot: {
    width:        6,
    height:       6,
    borderRadius: '50%',
    background:   '#00e5a0',
    boxShadow:    '0 0 6px #00e5a0',
  },
  filterRow: {
    display:        'flex',
    gap:            6,
    padding:        '14px 20px',
    overflowX:      'auto',
    scrollbarWidth: 'none',
  },
  filterBtn: {
    background:   'rgba(255,255,255,0.05)',
    border:       '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    color:        'rgba(255,255,255,0.45)',
    fontSize:     12,
    fontWeight:   600,
    padding:      '6px 14px',
    cursor:       'pointer',
    whiteSpace:   'nowrap',
    fontFamily:   "'DM Sans', sans-serif",
    transition:   'all 0.2s',
  },
  filterActive: {
    background: 'rgba(26,79,255,0.2)',
    border:     '1px solid rgba(26,79,255,0.5)',
    color:      '#4d7fff',
  },
  colHeader: {
    display:     'flex',
    alignItems:  'center',
    padding:     '0 20px 10px',
    fontSize:    11,
    fontWeight:  600,
    letterSpacing:1,
    color:       'rgba(255,255,255,0.25)',
    borderBottom:'1px solid rgba(255,255,255,0.05)',
  },
  list: {
    padding: '0 0 0 0',
  },
  row: {
    display:      'flex',
    alignItems:   'center',
    padding:      '14px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    gap:          10,
    animation:    'fadeUp 0.4s ease both',
    transition:   'background 0.15s',
  },
  rowLeft: {
    display:    'flex',
    alignItems: 'center',
    gap:        12,
    flex:       1,
    overflow:   'hidden',
  },
  docIcon: {
    width:          42,
    height:         42,
    borderRadius:   12,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  docIconEmoji: {
    fontSize: 20,
  },
  docInfo: {
    overflow: 'hidden',
  },
  docName: {
    fontSize:    14,
    fontWeight:  700,
    color:       '#fff',
    margin:      '0 0 2px',
    whiteSpace:  'nowrap',
    overflow:    'hidden',
    textOverflow:'ellipsis',
  },
  docSpec: {
    fontSize:   12,
    color:      'rgba(255,255,255,0.4)',
    margin:     '0 0 1px',
  },
  docHospital: {
    fontSize: 11,
    color:    'rgba(255,255,255,0.25)',
    margin:   0,
  },
  ratingWrap: {
    width:     80,
    textAlign: 'right',
  },
  stars: {
    fontSize: 11,
    color:    '#f5a623',
    margin:   '0 0 2px',
    letterSpacing: -1,
  },
  ratingNum: {
    fontSize:   12,
    fontWeight: 600,
    color:      'rgba(255,255,255,0.5)',
    margin:     0,
    fontFamily: "'DM Mono', monospace",
  },
  feeBtn: {
    width:        90,
    padding:      '8px 0',
    border:       'none',
    borderRadius: 8,
    color:        '#fff',
    fontSize:     12,
    fontWeight:   700,
    cursor:       'pointer',
    fontFamily:   "'DM Mono', monospace",
    letterSpacing:0.3,
    transition:   'opacity 0.2s',
    flexShrink:   0,
  },
  loadingWrap: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  skeleton: {
    height:     60,
    borderRadius:12,
    background: 'linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
  empty: {
    textAlign: 'center',
    padding:   '60px 0',
  },
};
