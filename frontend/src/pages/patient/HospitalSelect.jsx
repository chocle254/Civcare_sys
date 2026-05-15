import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNearbyHospitals } from '../../api/hospitals';
import useLocation from '../../hooks/useLocation';

export default function HospitalSelect() {
  const navigate = useNavigate();
  const { coords, error: locError, loading: locLoading, getLocation } = useLocation();
  const [hospitals, setHospitals] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => { getLocation(); }, []); // eslint-disable-line

  useEffect(() => {
    if (!coords) return;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const res = await getNearbyHospitals(coords.lat, coords.lon);
        setHospitals(res.data);
      } catch { setError('Could not load hospitals. Please try again.'); }
      finally { setLoading(false); }
    };
    load();
  }, [coords]);

  const handleSelect = (hospital) => {
    localStorage.setItem('civtech_hospital', JSON.stringify(hospital));
    if (coords) localStorage.setItem('civtech_patient_coords', JSON.stringify(coords));
    navigate('/chat', { state: { mode: 'pre_hospital' } });
  };

  return (
    <div style={s.page}>
      <div style={s.orb1}/><div style={s.orb2}/>

      {/* Header */}
      <div style={s.header}>
        <button style={s.back} onClick={() => navigate('/dashboard')}>‹</button>
        <div style={s.headerText}>
          <h1 style={s.title}>Hospitals Nearby</h1>
          <p style={s.sub}>Within 50km of your location</p>
        </div>
      </div>

      <div style={s.body}>
        {/* Loading location */}
        {locLoading && (
          <div style={s.stateWrap}>
            <div style={s.spinner}/>
            <p style={s.stateText}>Finding your location...</p>
            <p style={s.stateSubText}>This takes just a moment</p>
          </div>
        )}

        {/* Location error */}
        {locError && !coords && (
          <div style={s.alertBox}>
            <p style={s.alertIcon}>📍</p>
            <p style={s.alertText}>{locError}</p>
            <button style={s.retryBtn} onClick={getLocation}>Try Again</button>
          </div>
        )}

        {/* Fetching hospitals */}
        {loading && (
          <div style={s.stateWrap}>
            <div style={s.spinner}/>
            <p style={s.stateText}>Searching for hospitals...</p>
          </div>
        )}

        {error && <div style={s.alertBox}><p style={s.alertText}>{error}</p></div>}

        {/* Hospital list */}
        {!loading && hospitals.length > 0 && (
          <>
            <p style={s.countText}>{hospitals.length} facilities found near you</p>
            {hospitals.map((h, i) => (
              <div
                key={h.id}
                style={{ ...s.card, animationDelay:`${i*0.06}s` }}
                onClick={() => handleSelect(h)}
              >
                {/* Testing badge */}
                {h.is_testing && <div style={s.testBadge}>🔬 Test Mode</div>}

                <div style={s.cardLeft}>
                  <div style={s.hospitalIcon}>🏥</div>
                  <div style={s.cardInfo}>
                    <p style={s.hosName}>{h.name}</p>
                    <p style={s.hosMeta}>{h.town}{h.county ? `, ${h.county}` : ''}</p>
                    {h.phone && <p style={s.hosPhone}>📞 {h.phone}</p>}
                  </div>
                </div>
                <div style={s.cardRight}>
                  <p style={s.distKm}>{h.distance_km} km</p>
                  <p style={s.distTime}>⏱ {h.travel_time}</p>
                  <div style={s.arrowChip}>→</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* No hospitals */}
        {!loading && coords && hospitals.length === 0 && (
          <div style={s.stateWrap}>
            <p style={{fontSize:40,marginBottom:12}}>🏥</p>
            <p style={s.stateText}>No hospitals found nearby</p>
            <p style={s.stateSubText}>Try speaking to a doctor online instead.</p>
            <button style={s.retryBtn} onClick={() => navigate('/consultation')}>Consult a Doctor Online</button>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes orb{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.1);opacity:0.8}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

const s = {
  page: { minHeight:'100vh',backgroundColor:'#080810',fontFamily:"'Outfit',sans-serif",color:'#fff',position:'relative',overflowX:'hidden' },
  orb1: { position:'absolute',top:-80,left:'25%',width:320,height:320,borderRadius:'50%',background:'radial-gradient(circle,#4f46e5,transparent 70%)',filter:'blur(60px)',opacity:0.35,pointerEvents:'none',zIndex:0,animation:'orb 7s ease-in-out infinite' },
  orb2: { position:'absolute',top:80,right:-60,width:260,height:260,borderRadius:'50%',background:'radial-gradient(circle,#06d6a0,transparent 70%)',filter:'blur(60px)',opacity:0.25,pointerEvents:'none',zIndex:0 },
  header: { position:'relative',zIndex:10,display:'flex',alignItems:'center',gap:12,padding:'52px 20px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)' },
  back: { background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,color:'#fff',fontSize:24,cursor:'pointer',lineHeight:1,padding:'4px 10px',backdropFilter:'blur(10px)' },
  headerText: { flex:1 },
  title: { fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,margin:'0 0 2px',letterSpacing:-0.5 },
  sub:   { fontSize:12,color:'rgba(255,255,255,0.35)',margin:0 },
  body:  { position:'relative',zIndex:10,padding:'20px' },
  countText: { fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:14,letterSpacing:0.5 },
  card: {
    display:'flex',alignItems:'center',justifyContent:'space-between',
    background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',
    backdropFilter:'blur(16px)',borderRadius:20,padding:'16px',marginBottom:12,
    cursor:'pointer',animation:'fadeUp 0.45s ease both',transition:'background 0.2s',
    position:'relative',overflow:'hidden',
  },
  testBadge: { position:'absolute',top:8,right:8,fontSize:10,fontWeight:700,color:'#ffd166',background:'rgba(255,209,102,0.1)',border:'1px solid rgba(255,209,102,0.25)',borderRadius:10,padding:'2px 8px' },
  cardLeft: { display:'flex',alignItems:'center',gap:12,flex:1,overflow:'hidden' },
  hospitalIcon: { width:46,height:46,borderRadius:14,background:'rgba(79,70,229,0.2)',border:'1px solid rgba(79,70,229,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 },
  cardInfo: { overflow:'hidden' },
  hosName:  { fontSize:14,fontWeight:700,color:'#fff',margin:'0 0 3px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis' },
  hosMeta:  { fontSize:12,color:'rgba(255,255,255,0.4)',margin:'0 0 2px' },
  hosPhone: { fontSize:11,color:'rgba(255,255,255,0.25)',margin:0 },
  cardRight: { textAlign:'right',flexShrink:0,marginLeft:12 },
  distKm:    { fontSize:16,fontWeight:800,color:'#818cf8',margin:'0 0 2px' },
  distTime:  { fontSize:11,color:'rgba(255,255,255,0.3)',margin:'0 0 8px' },
  arrowChip: { background:'rgba(79,70,229,0.2)',border:'1px solid rgba(79,70,229,0.3)',borderRadius:10,padding:'4px 10px',fontSize:14,color:'#818cf8',display:'inline-block' },
  stateWrap: { textAlign:'center',padding:'80px 20px 40px' },
  stateText:    { fontSize:16,fontWeight:600,color:'rgba(255,255,255,0.7)',margin:'12px 0 6px' },
  stateSubText: { fontSize:13,color:'rgba(255,255,255,0.35)',marginBottom:20 },
  spinner: { width:36,height:36,borderRadius:'50%',border:'3px solid rgba(255,255,255,0.08)',borderTop:'3px solid #4f46e5',animation:'spin 0.8s linear infinite',margin:'0 auto' },
  alertBox: { background:'rgba(255,77,109,0.08)',border:'1px solid rgba(255,77,109,0.2)',borderRadius:16,padding:'20px',textAlign:'center',marginBottom:16 },
  alertIcon: { fontSize:32,marginBottom:8 },
  alertText: { fontSize:13,color:'rgba(255,255,255,0.6)',margin:'0 0 14px' },
  retryBtn: { background:'rgba(79,70,229,0.2)',border:'1px solid rgba(79,70,229,0.4)',borderRadius:12,color:'#818cf8',fontSize:13,fontWeight:600,padding:'10px 20px',cursor:'pointer',fontFamily:"'Outfit',sans-serif" },
};
