import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

const SPEC = {
  'General Practitioner': { color:'#4f46e5', bg:'rgba(79,70,229,0.15)', icon:'🩺' },
  'Internal Medicine':    { color:'#7c3aed', bg:'rgba(124,58,237,0.15)', icon:'🫀' },
  'Emergency Medicine':   { color:'#ff4d6d', bg:'rgba(255,77,109,0.15)', icon:'🚨' },
  'Paediatrics':          { color:'#06d6a0', bg:'rgba(6,214,160,0.15)',  icon:'👶' },
  'Gynaecology':          { color:'#f72585', bg:'rgba(247,37,133,0.15)', icon:'🌸' },
  'Dermatology':          { color:'#ffd166', bg:'rgba(255,209,102,0.15)', icon:'🔬' },
};

const FILTERS = ['All','General Practitioner','Internal Medicine','Emergency Medicine','Paediatrics'];

export default function Consultation() {
  const navigate  = useNavigate();
  const patient   = JSON.parse(localStorage.getItem('civtech_patient') || '{}');
  const sessionId = localStorage.getItem('civtech_session_id') || null;

  const [doctors,  setDoctors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('All');
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchDoctors(); }, []);

  const fetchDoctors = async () => {
    try {
      const res = await axios.get(`${API}/doctors/available`);
      setDoctors(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleConsult = (doctor) => {
    setSelected(doctor.id);
    localStorage.setItem('civtech_selected_doctor', JSON.stringify(doctor));
    // If patient already has an active session from AI Triage, skip pre-consultation chat
    if (sessionId) {
      axios.post(`${API}/consultation/initiate`, {
        patient_id: patient.id, doctor_id: doctor.id,
        session_id: sessionId, payment_method: 'mpesa', fee_amount: doctor.consultation_fee,
      }).then(res => {
        localStorage.setItem('civtech_consultation_id', res.data.consultation_id);
        navigate('/consultation/waiting');
      }).catch(() => {
        setSelected(null);
        alert('Could not book. Please try again.');
      });
    } else {
      navigate('/chat', { state: { mode: 'pre_consultation' } });
    }
  };

  const filtered = filter === 'All' ? doctors : doctors.filter(d => d.specialisation === filter);
  const stars    = (r) => '★'.repeat(Math.floor(r||0)) + '☆'.repeat(5-Math.floor(r||0));

  return (
    <div style={s.page}>
      <div style={s.orb1}/><div style={s.orb2}/>

      {/* Header */}
      <div style={s.header}>
        <button style={s.back} onClick={() => navigate('/dashboard')}>‹</button>
        <div style={s.headerText}>
          <h1 style={s.title}>Find a Doctor</h1>
          <p style={s.sub}>{doctors.length} available now</p>
        </div>
        <div style={s.livePill}><span style={s.liveDot}/>Live</div>
      </div>

      {/* Filter chips */}
      <div style={s.filterRow}>
        {FILTERS.map(f => (
          <button key={f} style={{ ...s.filterChip, ...(filter===f ? s.filterActive : {}) }} onClick={() => setFilter(f)}>
            {f === 'All' ? '✦ All' : f.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Doctor list */}
      <div style={s.list}>
        {loading && [1,2,3].map(i => <div key={i} style={s.skeleton}/>)}

        {!loading && filtered.length === 0 && (
          <div style={s.empty}>
            <p style={{fontSize:40}}>🩺</p>
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:14}}>No doctors available right now.</p>
          </div>
        )}

        {!loading && filtered.map((doc, i) => {
          const spec = SPEC[doc.specialisation] || SPEC['General Practitioner'];
          const busy = selected === doc.id;
          return (
            <div key={doc.id} style={{ ...s.card, animationDelay:`${i*0.07}s` }}>
              {/* Spec icon */}
              <div style={{ ...s.iconWrap, background: spec.bg, border:`1px solid ${spec.color}33` }}>
                <span style={s.specIcon}>{spec.icon}</span>
              </div>
              {/* Info */}
              <div style={s.info}>
                <p style={s.docName}>{doc.full_name || doc.name}</p>
                <p style={{ ...s.docSpec, color: spec.color }}>{doc.specialisation}</p>
                {doc.hospital_name && <p style={s.docHosp}>🏥 {doc.hospital_name}</p>}
                <p style={s.stars}>{stars(doc.ai_accuracy_rating)}
                  <span style={s.rating}>{doc.ai_accuracy_rating?.toFixed(1) || '—'}</span>
                </p>
              </div>
              {/* Fee Button */}
              <button
                style={{ ...s.feeBtn, background: busy ? '#1a1a2e' : `linear-gradient(135deg,${spec.color},${spec.color}cc)` }}
                onClick={() => handleConsult(doc)}
                disabled={!!selected}
              >
                {busy ? '···' : `KSh\n${doc.consultation_fee?.toLocaleString() || '—'}`}
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes orb{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.1);opacity:0.8}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{from{background-position:-400px 0}to{background-position:400px 0}}
      `}</style>
    </div>
  );
}

const s = {
  page: { minHeight:'100vh', backgroundColor:'#080810', fontFamily:"'Outfit',sans-serif", color:'#fff', paddingBottom:40, position:'relative', overflowX:'hidden' },
  orb1: { position:'absolute',top:-80,left:'30%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,#4f46e5,transparent 70%)',filter:'blur(60px)',opacity:0.4,pointerEvents:'none',zIndex:0,animation:'orb 8s ease-in-out infinite' },
  orb2: { position:'absolute',top:100,right:-60,width:250,height:250,borderRadius:'50%',background:'radial-gradient(circle,#06d6a0,transparent 70%)',filter:'blur(60px)',opacity:0.25,pointerEvents:'none',zIndex:0 },
  header: { position:'relative',zIndex:10,display:'flex',alignItems:'center',gap:12,padding:'52px 20px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)' },
  back:   { background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,color:'#fff',fontSize:24,cursor:'pointer',lineHeight:1,padding:'4px 10px',backdropFilter:'blur(10px)' },
  headerText: { flex:1 },
  title: { fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,margin:'0 0 2px',letterSpacing:-0.5 },
  sub:   { fontSize:12,color:'rgba(255,255,255,0.35)',margin:0 },
  livePill: { display:'flex',alignItems:'center',gap:5,background:'rgba(6,214,160,0.1)',border:'1px solid rgba(6,214,160,0.25)',borderRadius:20,padding:'4px 12px',fontSize:12,color:'#06d6a0',fontWeight:600 },
  liveDot:  { width:6,height:6,borderRadius:'50%',background:'#06d6a0',boxShadow:'0 0 8px #06d6a0' },
  filterRow: { display:'flex',gap:8,padding:'14px 20px',overflowX:'auto',scrollbarWidth:'none',position:'relative',zIndex:10 },
  filterChip: { background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,color:'rgba(255,255,255,0.5)',fontSize:12,fontWeight:600,padding:'7px 16px',cursor:'pointer',whiteSpace:'nowrap',fontFamily:"'Outfit',sans-serif",transition:'all 0.2s' },
  filterActive: { background:'rgba(79,70,229,0.2)',border:'1px solid rgba(79,70,229,0.5)',color:'#818cf8' },
  list: { position:'relative',zIndex:10,padding:'8px 20px 0' },
  card: { display:'flex',alignItems:'center',gap:14,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',backdropFilter:'blur(16px)',borderRadius:20,padding:'16px',marginBottom:12,animation:'fadeUp 0.45s ease both' },
  iconWrap: { width:50,height:50,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 },
  specIcon: { fontSize:24 },
  info: { flex:1,overflow:'hidden' },
  docName: { fontSize:15,fontWeight:700,color:'#fff',margin:'0 0 2px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis' },
  docSpec: { fontSize:12,fontWeight:600,margin:'0 0 2px' },
  docHosp: { fontSize:11,color:'rgba(255,255,255,0.3)',margin:'0 0 4px' },
  stars:   { fontSize:12,color:'#ffd166',margin:0,letterSpacing:-0.5 },
  rating:  { fontSize:11,color:'rgba(255,255,255,0.4)',marginLeft:5,fontWeight:600 },
  feeBtn: { width:80,padding:'10px 0',border:'none',borderRadius:14,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Outfit',sans-serif",flexShrink:0,whiteSpace:'pre-line',lineHeight:1.4,textAlign:'center',transition:'opacity 0.2s' },
  skeleton: { height:82,borderRadius:20,marginBottom:12,background:'linear-gradient(90deg,#111118 25%,#1a1a28 50%,#111118 75%)',backgroundSize:'400px 100%',animation:'shimmer 1.6s infinite' },
  empty:   { textAlign:'center',padding:'60px 0' },
};
