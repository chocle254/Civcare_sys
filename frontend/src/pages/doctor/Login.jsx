import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerDoctor, loginDoctor } from '../../api/auth';

function EyeIcon({ show }) {
  return show ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function DoctorLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNatId, setShowNatId] = useState(false);

  const [loginForm, setLoginForm] = useState({ kmpdb_license: '', national_id: '' });
  const [regForm, setRegForm] = useState({
    full_name: '', phone_number: '', national_id: '', kmpdb_license: '',
    specialisation: '', hospital_name: '', consultation_fee: '',
    shift_start: '08:00', shift_end: '17:00',
  });
  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/hospitals/registered`)
      .then(r => r.json())
      .then(data => setHospitals(data || []))
      .catch(() => { });
  }, []);

  const SPECIALISATIONS = [
    'General Practitioner', 'Internal Medicine', 'Paediatrics',
    'Obstetrics & Gynaecology', 'Surgery', 'Orthopaedics',
    'Cardiology', 'Neurology', 'Psychiatry', 'Dermatology',
    'Ophthalmology', 'ENT (Ear, Nose & Throat)', 'Radiology',
    'Anaesthesiology', 'Emergency Medicine', 'Oncology',
    'Urology', 'Nephrology', 'Gastroenterology', 'Pulmonology',
  ];

  const handleLoginChange = (e) => setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  const handleRegChange = (e) => setRegForm({ ...regForm, [e.target.name]: e.target.value });

  const saveAndNavigate = (data) => {
    localStorage.setItem('civtech_token', data.access_token);
    localStorage.setItem('civtech_doctor', JSON.stringify(data.doctor));
    navigate('/doctor/dashboard');
  };

  const handleLogin = async () => {
    setError('');
    if (!loginForm.kmpdb_license || !loginForm.national_id) {
      setError('Please enter your KMPDB license number and National ID.');
      return;
    }
    setLoading(true);
    try { const res = await loginDoctor(loginForm); saveAndNavigate(res.data); }
    catch (err) { setError(err.response?.data?.detail || 'Login failed. Please check your details.'); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setError('');
    const required = ['full_name', 'phone_number', 'national_id', 'kmpdb_license', 'hospital_name'];
    for (const f of required) { if (!regForm[f]) { setError('Please fill in all required fields.'); return; } }
    setLoading(true);
    try {
      const res = await registerDoctor({ ...regForm, consultation_fee: parseFloat(regForm.consultation_fee) || 0 });
      saveAndNavigate(res.data);
    } catch (err) { setError(err.response?.data?.detail || 'Registration failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleKey = (e) => { if (e.key === 'Enter') mode === 'login' ? handleLogin() : handleRegister(); };

  return (
    <div style={s.page}>
      <div style={s.orb1} /><div style={s.orb2} />

      <div style={s.center}>
        {/* Brand */}
        <div style={s.brand}>
          <div style={s.brandMark}>C</div>
          <div>
            <p style={s.brandName}>CivTech Care</p>
            <p style={s.brandSub}>Doctor Portal</p>
          </div>
        </div>

        {/* Card */}
        <div style={s.card}>
          {/* Mode toggle */}
          <div style={s.toggle}>
            {['login', 'register'].map(m => (
              <button key={m} style={{ ...s.toggleBtn, ...(mode === m ? s.toggleActive : {}) }}
                onClick={() => { setMode(m); setError(''); }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {error && <div style={s.errorBox}>{error}</div>}

          {/* LOGIN */}
          {mode === 'login' && (
            <>
              <Field label="KMPDB License Number">
                <input style={s.input} name="kmpdb_license" placeholder="e.g. MED/001/2020"
                  value={loginForm.kmpdb_license} onChange={handleLoginChange} onKeyDown={handleKey} />
              </Field>
              <Field label="National ID Number">
                <div style={s.passwordWrap}>
                  <input style={{ ...s.input, paddingRight: 44 }} name="national_id"
                    type={showNatId ? 'text' : 'password'}
                    placeholder="Your personal National ID"
                    value={loginForm.national_id} onChange={handleLoginChange} onKeyDown={handleKey} />
                  <button style={s.eyeBtn} onClick={() => setShowNatId(v => !v)}>
                    <EyeIcon show={showNatId} />
                  </button>
                </div>
              </Field>
              <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }} onClick={handleLogin} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
              <p style={s.switchText}>First time here?{' '}
                <span style={s.switchLink} onClick={() => { setMode('register'); setError(''); }}>Register your account</span>
              </p>
            </>
          )}

          {/* REGISTER */}
          {mode === 'register' && (
            <>
              <div style={s.infoBox}>
                Your KMPDB license + National ID will be used to log in. Keep them safe.
              </div>
              {[
                { label: 'Full Name *', name: 'full_name', placeholder: 'Dr. Jane Wanjiru' },
                { label: 'Phone Number *', name: 'phone_number', placeholder: '+254712345678' },
                { label: 'KMPDB License *', name: 'kmpdb_license', placeholder: 'e.g. MED/001/2020' },
                { label: 'Consultation Fee (KES)', name: 'consultation_fee', placeholder: 'e.g. 500', type: 'number' },
              ].map(f => (
                <Field key={f.name} label={f.label}>
                  <input style={s.input} name={f.name} placeholder={f.placeholder} type={f.type || 'text'}
                    value={regForm[f.name]} onChange={handleRegChange} />
                </Field>
              ))}
              <Field label="Specialisation *">
                <select style={s.select} name="specialisation"
                  value={regForm.specialisation} onChange={handleRegChange}>
                  <option value="">Select specialisation</option>
                  {SPECIALISATIONS.map(sp => (
                    <option key={sp} value={sp}>{sp}</option>
                  ))}
                </select>
              </Field>

              <Field label="Hospital *">
                <select style={s.select} name="hospital_name"
                  value={regForm.hospital_name} onChange={handleRegChange}>
                  <option value="">Select your hospital</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.name}>{h.name}</option>
                  ))}
                </select>
              </Field>

              {/* National ID with eye toggle */}
              <Field label="National ID Number *">
                <div style={s.passwordWrap}>
                  <input style={{ ...s.input, paddingRight: 44 }} name="national_id"
                    type={showNatId ? 'text' : 'password'}
                    placeholder="Your personal National ID"
                    value={regForm.national_id} onChange={handleRegChange} />
                  <button style={s.eyeBtn} onClick={() => setShowNatId(v => !v)}>
                    <EyeIcon show={showNatId} />
                  </button>
                </div>
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <Field label="Shift Start">
                  <input style={s.input} name="shift_start" type="time" value={regForm.shift_start} onChange={handleRegChange} />
                </Field>
                <Field label="Shift End">
                  <input style={s.input} name="shift_end" type="time" value={regForm.shift_end} onChange={handleRegChange} />
                </Field>
              </div>
              <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }} onClick={handleRegister} disabled={loading}>
                {loading ? 'Registering…' : 'Register & Enter Dashboard →'}
              </button>
              <p style={s.switchText}>Already registered?{' '}
                <span style={s.switchLink} onClick={() => { setMode('login'); setError(''); }}>Sign in here</span>
              </p>
            </>
          )}
        </div>

        <p style={s.footer}>Doctor accounts are verified against KMPDB records.</p>
        <button style={s.patientLink} onClick={() => navigate('/')}>← Patient side</button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes orb{0%,100%{transform:scale(1) translate(-50%,-50%);opacity:0.6}50%{transform:scale(1.1) translate(-50%,-50%);opacity:1}}
        input[type="time"]::-webkit-calendar-picker-indicator{filter:invert(1)opacity(0.3);}
        select option { background: #0d0d1a; color: #f0f0ff; }
        select option:checked { background: rgba(0,212,170,0.2); }
        select:focus { border-color: #00d4aa; box-shadow: 0 0 0 3px rgba(0,212,170,0.15); }
        input:focus { border-color: #00d4aa; box-shadow: 0 0 0 3px rgba(0,212,170,0.15); }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={s.label}>{label}</p>
      {children}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit',sans-serif", position: 'relative', overflowX: 'hidden' },
  orb1: { position: 'fixed', top: '10%', left: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,212,170,0.12),transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0, animation: 'orb 8s ease-in-out infinite', transform: 'translate(-50%,-50%)' },
  orb2: { position: 'fixed', bottom: '10%', right: '10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle,rgba(77,143,255,0.1),transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 },
  center: { width: '100%', maxWidth: 440, padding: '24px 16px', position: 'relative', zIndex: 10 },
  brand: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, justifyContent: 'center' },
  brandMark: { width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#00d4aa,#4d8fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#fff', boxShadow: '0 4px 20px rgba(0,212,170,0.4)' },
  brandName: { fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: -0.3 },
  brandSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 },
  card: { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '28px 24px', boxShadow: '0 20px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' },
  toggle: { display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 4, marginBottom: 24 },
  toggleBtn: { flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontFamily: "'Outfit',sans-serif", transition: 'all 0.2s' },
  toggleActive: { background: 'rgba(0,212,170,0.15)', color: '#00d4aa', boxShadow: '0 2px 12px rgba(0,212,170,0.2)', border: '1px solid rgba(0,212,170,0.25)' },
  errorBox: { background: 'rgba(255,61,90,0.1)', border: '1px solid rgba(255,61,90,0.25)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#ff4d6d', marginBottom: 18, lineHeight: 1.55 },
  infoBox: { background: 'rgba(77,143,255,0.08)', border: '1px solid rgba(77,143,255,0.2)', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 18, lineHeight: 1.6 },
  label: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', margin: '0 0 7px', letterSpacing: 0.5 },
  input: { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 14, color: '#fff', fontFamily: "'Outfit',sans-serif", outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' },
  select: { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 14, color: '#fff', fontFamily: "'Outfit',sans-serif", outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238888aa' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 },
  passwordWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: 4, transition: 'color 0.2s' },
  btn: { width: '100%', padding: '14px 0', background: 'linear-gradient(135deg,#00d4aa,#4d8fff)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: "'Outfit',sans-serif", cursor: 'pointer', marginTop: 4, letterSpacing: 0.3, boxShadow: '0 6px 24px rgba(0,212,170,0.35)', transition: 'opacity 0.2s, transform 0.15s' },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  switchText: { textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 18 },
  switchLink: { color: '#00d4aa', fontWeight: 600, cursor: 'pointer' },
  footer: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 16 },
  patientLink: { display: 'block', margin: '10px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
};
