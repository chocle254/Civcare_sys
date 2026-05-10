import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerDoctor, loginDoctor } from '../../api/auth';

export default function DoctorLogin() {
  const navigate  = useNavigate();
  const [mode,    setMode]    = useState('login');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const [loginForm, setLoginForm] = useState({
    kmpdb_license: '',
    national_id:   '',
  });

  const [regForm, setRegForm] = useState({
    full_name:        '',
    phone_number:     '',
    national_id:      '',
    kmpdb_license:    '',
    specialisation:   '',
    hospital_name:    '',
    consultation_fee: '',
    shift_start:      '08:00',
    shift_end:        '17:00',
  });

  const handleLoginChange = (e) =>
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });

  const handleRegChange = (e) =>
    setRegForm({ ...regForm, [e.target.name]: e.target.value });

  const saveAndNavigate = (data) => {
    localStorage.setItem('civtech_token',  data.access_token);
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
    try {
      const res = await loginDoctor(loginForm);
      saveAndNavigate(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    const required = ['full_name', 'phone_number', 'national_id', 'kmpdb_license', 'hospital_name'];
    for (const field of required) {
      if (!regForm[field]) {
        setError('Please fill in all required fields.');
        return;
      }
    }
    setLoading(true);
    try {
      const payload = {
        ...regForm,
        consultation_fee: parseFloat(regForm.consultation_fee) || 0,
      };
      const res = await registerDoctor(payload);
      saveAndNavigate(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') mode === 'login' ? handleLogin() : handleRegister();
  };

  return (
    <div className="page">
      <div className="header">
        <div>
          <div className="header__logo">CivTech Care</div>
          <div className="header__sub">Doctor Portal</div>
        </div>
        <button
          className="btn btn--ghost btn--sm"
          style={{ width: 'auto' }}
          onClick={() => navigate('/')}
        >
          Patient side
        </button>
      </div>

      <div className="container">
        <div style={{ marginTop: 28 }}>

          {/* ── Mode Toggle ── */}
          <div style={{
            display:      'flex',
            background:   'var(--gray-200)',
            borderRadius: 'var(--radius)',
            padding:      4,
            marginBottom: 24,
          }}>
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex:         1,
                  padding:      '10px 0',
                  border:       'none',
                  borderRadius: 6,
                  fontWeight:   600,
                  fontSize:     14,
                  cursor:       'pointer',
                  background:   mode === m ? 'var(--white)' : 'transparent',
                  color:        mode === m ? 'var(--blue)'  : 'var(--gray-600)',
                  boxShadow:    mode === m ? 'var(--shadow)': 'none',
                  transition:   'all 0.15s',
                }}
              >
                {m === 'login' ? 'Login' : 'Register'}
              </button>
            ))}
          </div>

          {error && <div className="alert alert--error">{error}</div>}

          {/* ── LOGIN FORM ── */}
          {mode === 'login' && (
            <div className="card">
              <p className="card__title">Doctor Login</p>

              <div className="form-group">
                <label className="label">KMPDB License Number *</label>
                <input
                  className="input"
                  name="kmpdb_license"
                  placeholder="e.g. MED/001/2020"
                  value={loginForm.kmpdb_license}
                  onChange={handleLoginChange}
                  onKeyDown={handleKey}
                />
              </div>

              <div className="form-group">
                <label className="label">National ID Number *</label>
                <input
                  className="input"
                  name="national_id"
                  placeholder="Your personal National ID"
                  value={loginForm.national_id}
                  onChange={handleLoginChange}
                  onKeyDown={handleKey}
                />
              </div>

              <button
                className="btn btn--primary"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--gray-600)', marginTop: 16 }}>
                First time here?{' '}
                <span
                  style={{ color: 'var(--blue)', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { setMode('register'); setError(''); }}
                >
                  Register your account
                </span>
              </p>
            </div>
          )}

          {/* ── REGISTER FORM ── */}
          {mode === 'register' && (
            <div className="card">
              <p className="card__title">Doctor Registration</p>

              <div
                style={{
                  background:   'var(--blue-light)',
                  borderRadius: 'var(--radius)',
                  padding:      '10px 14px',
                  fontSize:     13,
                  color:        'var(--gray-600)',
                  marginBottom: 16,
                }}
              >
                Your KMPDB license number + National ID will be used
                to log in. Keep them safe.
              </div>

              <div className="form-group">
                <label className="label">Full Name *</label>
                <input
                  className="input"
                  name="full_name"
                  placeholder="Dr. Jane Wanjiru"
                  value={regForm.full_name}
                  onChange={handleRegChange}
                />
              </div>

              <div className="form-group">
                <label className="label">Phone Number *</label>
                <input
                  className="input"
                  name="phone_number"
                  placeholder="+254712345678"
                  value={regForm.phone_number}
                  onChange={handleRegChange}
                />
              </div>

              <div className="form-group">
                <label className="label">National ID Number *</label>
                <input
                  className="input"
                  name="national_id"
                  placeholder="Your personal National ID"
                  value={regForm.national_id}
                  onChange={handleRegChange}
                />
              </div>

              <div className="form-group">
                <label className="label">KMPDB License Number *</label>
                <input
                  className="input"
                  name="kmpdb_license"
                  placeholder="e.g. MED/001/2020"
                  value={regForm.kmpdb_license}
                  onChange={handleRegChange}
                />
              </div>

              <div className="form-group">
                <label className="label">Specialisation</label>
                <input
                  className="input"
                  name="specialisation"
                  placeholder="e.g. General Practitioner, Surgeon"
                  value={regForm.specialisation}
                  onChange={handleRegChange}
                />
              </div>

              <div className="form-group">
                <label className="label">Hospital Name *</label>
                <input
                  className="input"
                  name="hospital_name"
                  placeholder="e.g. Kenyatta National Hospital"
                  value={regForm.hospital_name}
                  onChange={handleRegChange}
                />
              </div>

              <div className="form-group">
                <label className="label">Consultation Fee (KES)</label>
                <input
                  className="input"
                  name="consultation_fee"
                  type="number"
                  placeholder="e.g. 500"
                  value={regForm.consultation_fee}
                  onChange={handleRegChange}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="label">Shift Start</label>
                  <input
                    className="input"
                    name="shift_start"
                    type="time"
                    value={regForm.shift_start}
                    onChange={handleRegChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Shift End</label>
                  <input
                    className="input"
                    name="shift_end"
                    type="time"
                    value={regForm.shift_end}
                    onChange={handleRegChange}
                  />
                </div>
              </div>

              <button
                className="btn btn--primary"
                onClick={handleRegister}
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Register & Go to Dashboard'}
              </button>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--gray-600)', marginTop: 16 }}>
                Already registered?{' '}
                <span
                  style={{ color: 'var(--blue)', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { setMode('login'); setError(''); }}
                >
                  Login here
                </span>
              </p>
            </div>
          )}

          <p style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'center', marginTop: 12 }}>
            Doctor accounts are verified against KMPDB records.
          </p>
        </div>
      </div>
    </div>
  );
}
