import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { confirmArrival, getSession } from '../../api/triage';

export default function ArrivalConfirm() {
  const navigate  = useNavigate();
  const hospital  = JSON.parse(localStorage.getItem('civtech_hospital') || '{}');
  const patient   = JSON.parse(localStorage.getItem('civtech_patient')  || '{}');
  const patientCoords = JSON.parse(localStorage.getItem('civtech_patient_coords') || 'null');
  
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  
  const [sessionData, setSessionData] = useState(null);
  const [isReady, setIsReady] = useState(false); // Controls if map is shown
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Load session data
  useEffect(() => {
    const sessionId = localStorage.getItem('civtech_session_id');
    if (!sessionId) return;
    
    const loadSession = async () => {
      try {
        const res = await getSession(sessionId);
        setSessionData(res.data);
      } catch (err) {
        console.error('Failed to load session data');
      }
    };
    loadSession();
  }, []);

  // Load Leaflet and Routing Machine dynamically
  useEffect(() => {
    if (!isReady) return; // Only load when user clicks to show map

    const link1 = document.createElement('link');
    link1.rel = 'stylesheet';
    link1.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.rel = 'stylesheet';
    link2.href = 'https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css';
    document.head.appendChild(link2);

    const script1 = document.createElement('script');
    script1.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script1.async = true;

    const script2 = document.createElement('script');
    script2.src = 'https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js';
    script2.async = true;

    script1.onload = () => {
      document.head.appendChild(script2);
    };

    script2.onload = () => setMapReady(true);
    document.head.appendChild(script1);

    return () => {
      document.head.removeChild(link1);
      document.head.removeChild(link2);
      document.head.removeChild(script1);
      if (document.head.contains(script2)) document.head.removeChild(script2);
    };
  }, [isReady]);

  // Initialize Map and Routing
  useEffect(() => {
    if (!mapReady || !mapRef.current || !patientCoords || !hospital.lat || !hospital.lon) return;
    if (mapInstance.current) return;

    mapInstance.current = window.L.map(mapRef.current).setView([patientCoords.lat, patientCoords.lon], 13);
    
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance.current);

    window.L.Routing.control({
      waypoints: [
        window.L.latLng(patientCoords.lat, patientCoords.lon),
        window.L.latLng(hospital.lat, hospital.lon)
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      lineOptions: {
        styles: [{ color: '#00d4aa', opacity: 0.8, weight: 5 }]
      },
      createMarker: function(i, wp, nWps) {
        if (i === 0) return window.L.marker(wp.latLng).bindPopup("You are here");
        else if (i === nWps - 1) return window.L.marker(wp.latLng).bindPopup(hospital.name);
      }
    }).addTo(mapInstance.current);

  }, [mapReady, patientCoords, hospital]);

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const sessionId = localStorage.getItem('civtech_session_id');
      const res = await confirmArrival({
        session_id:  sessionId,
        hospital_id: hospital.id,
        patient_id:  patient.id,
      });
      localStorage.setItem('civtech_appointment_id', res.data.appointment_id);
      setConfirmed(true);
    } catch (err) {
      setError('Could not confirm arrival. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div style={s.page}>
        <div style={s.orb1}/><div style={s.orb2}/>
        
        <div style={s.header}>
          <div style={s.headerText}>
            <h1 style={s.title}>You are checked in</h1>
          </div>
        </div>

        <div style={s.body}>
          <div style={{...s.card, textAlign: 'center', padding: '40px 20px'}}>
            <div style={s.successIcon}>✅</div>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 12 }}>
              Arrival Confirmed
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
              You have been added to the queue at <strong>{hospital.name}</strong>. A doctor will call you shortly. Please remain in the waiting area.
            </p>
            <div style={s.infoBox}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                Your AI health summary has been securely sent to the doctor.
              </p>
            </div>
            <button style={s.btnOutline} onClick={() => navigate('/medications')}>
              View My Medications
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.orb1}/><div style={s.orb2}/>

      <div style={s.header}>
        <button style={s.back} onClick={() => navigate('/hospitals')}>‹</button>
        <div style={s.headerText}>
          <h1 style={s.title}>Travel & Arrival</h1>
          <p style={s.sub}>Proceed to destination</p>
        </div>
      </div>

      <div style={s.body}>
        {/* Destination Card */}
        <div style={s.card}>
          <p style={s.cardLabel}>DESTINATION</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            {hospital.name}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            {hospital.town}, {hospital.county} • <span style={{color: '#00d4aa'}}>{hospital.distance_km} km away</span>
          </p>
        </div>

        {/* Symptoms Preview */}
        {sessionData?.assessment && (
          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
               <p style={{ ...s.cardLabel, margin: 0 }}>YOUR AI TRIAGE SUMMARY</p>
               {sessionData.risk_score === 'critical' && <span style={s.criticalBadge}>Critical</span>}
            </div>
            
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
              This summary will be submitted directly to the doctor to save time.
            </p>
            
            <div style={s.summaryGrid}>
              {sessionData.assessment.symptom && (
                <div style={s.summaryRow}>
                  <span style={s.summaryKey}>Primary Symptom:</span>
                  <span style={s.summaryVal}>{sessionData.assessment.symptom}</span>
                </div>
              )}
              {sessionData.assessment.duration && (
                <div style={s.summaryRow}>
                  <span style={s.summaryKey}>Duration:</span>
                  <span style={s.summaryVal}>{sessionData.assessment.duration}</span>
                </div>
              )}
              {sessionData.assessment.severity && (
                <div style={s.summaryRow}>
                  <span style={s.summaryKey}>Severity:</span>
                  <span style={s.summaryVal}>{sessionData.assessment.severity}/10</span>
                </div>
              )}
              {sessionData.assessment.associated && (
                <div style={s.summaryRow}>
                  <span style={s.summaryKey}>Other Symptoms:</span>
                  <span style={s.summaryVal}>{sessionData.assessment.associated}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Map Container */}
        {isReady && (
          <div style={{...s.card, padding: 0, overflow: 'hidden', height: 350, position: 'relative'}}>
             {!mapReady && (
               <div style={s.mapLoader}>
                 <div className="spinner" style={{borderColor:'rgba(255,255,255,0.1)', borderTopColor:'#00d4aa'}} />
                 <p style={{marginTop:12, fontSize:13, color:'rgba(255,255,255,0.5)'}}>Loading map data...</p>
               </div>
             )}
             <div ref={mapRef} style={{ width: '100%', height: '100%', filter: 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' }} />
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div style={s.actionBar}>
         {error && <div style={s.errorBox}>{error}</div>}
         
         <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
           {!isReady && (
             <button style={s.btnSecondary} onClick={() => setIsReady(true)}>
               🗺️ Load Map (Uses Data)
             </button>
           )}
           <button style={{...s.btnPrimary, ...(loading ? {opacity:0.6} : {})}} onClick={handleConfirm} disabled={loading}>
             {loading ? 'Checking in...' : '📍 Confirm Arrival Now'}
           </button>
         </div>
      </div>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes orb{0%,100%{transform:scale(1);opacity:0.4}50%{transform:scale(1.1);opacity:0.7}}
      `}</style>
    </div>
  );
}

const s = {
  page: { minHeight:'100vh',backgroundColor:'#080810',fontFamily:"'Outfit',sans-serif",color:'#fff',position:'relative',overflowX:'hidden',display:'flex',flexDirection:'column' },
  orb1: { position:'absolute',top:-100,left:'10%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,212,170,0.15),transparent 70%)',filter:'blur(60px)',pointerEvents:'none',zIndex:0,animation:'orb 8s ease-in-out infinite' },
  orb2: { position:'absolute',bottom:'20%',right:-100,width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(77,143,255,0.1),transparent 70%)',filter:'blur(60px)',pointerEvents:'none',zIndex:0 },
  
  header: { position:'relative',zIndex:10,display:'flex',alignItems:'center',gap:12,padding:'52px 20px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(8,8,16,0.6)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)' },
  back: { background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,color:'#fff',fontSize:24,cursor:'pointer',lineHeight:1,padding:'4px 10px',backdropFilter:'blur(10px)' },
  headerText: { flex:1 },
  title: { fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,margin:'0 0 2px',letterSpacing:-0.5 },
  sub:   { fontSize:12,color:'rgba(255,255,255,0.35)',margin:0 },
  
  body: { position:'relative',zIndex:10,padding:'20px 20px 140px',flex:1,overflowY:'auto' },
  
  card: { background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',borderRadius:24,padding:'20px',marginBottom:16,boxShadow:'0 10px 40px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)' },
  cardLabel: { fontSize:10,fontWeight:700,letterSpacing:1.5,color:'rgba(255,255,255,0.3)',marginBottom:8,textTransform:'uppercase' },
  
  criticalBadge: { background:'rgba(255,77,109,0.15)',border:'1px solid rgba(255,77,109,0.3)',color:'#ff4d6d',padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:700,letterSpacing:0.5 },
  summaryGrid: { display:'grid',gap:12 },
  summaryRow: { display:'flex',alignItems:'flex-start',gap:8,fontSize:13,background:'rgba(255,255,255,0.02)',padding:'10px 12px',borderRadius:12,border:'1px solid rgba(255,255,255,0.03)' },
  summaryKey: { color:'rgba(255,255,255,0.4)',fontWeight:600,flexShrink:0 },
  summaryVal: { color:'#fff',fontWeight:500 },
  
  mapLoader: { position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(10px)',zIndex:10 },
  
  actionBar: { position:'absolute',bottom:0,left:0,right:0,padding:'24px 20px 32px',background:'linear-gradient(to top, #080810 60%, transparent)',zIndex:100 },
  btnPrimary: { width:'100%',padding:'16px 0',background:'linear-gradient(135deg,#00d4aa,#4d8fff)',border:'none',borderRadius:16,color:'#fff',fontSize:16,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:'pointer',boxShadow:'0 8px 32px rgba(0,212,170,0.3)' },
  btnSecondary: { width:'100%',padding:'16px 0',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,color:'#fff',fontSize:15,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:'pointer',backdropFilter:'blur(10px)' },
  btnOutline: { width:'100%',padding:'14px 0',background:'transparent',border:'1px solid rgba(255,255,255,0.15)',borderRadius:14,color:'#fff',fontSize:15,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:'pointer',marginTop:12 },
  
  successIcon: { fontSize:64,marginBottom:20,filter:'drop-shadow(0 0 20px rgba(0,212,170,0.4))' },
  infoBox: { background:'rgba(77,143,255,0.1)',border:'1px solid rgba(77,143,255,0.2)',borderRadius:16,padding:'16px',marginBottom:24 },
  errorBox: { background:'rgba(255,77,109,0.1)',border:'1px solid rgba(255,77,109,0.3)',color:'#ff4d6d',padding:'12px 16px',borderRadius:12,fontSize:13,marginBottom:16,textAlign:'center',fontWeight:500 },
};
