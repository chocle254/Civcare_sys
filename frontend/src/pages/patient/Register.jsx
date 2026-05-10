import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerPatient, loginPatient } from '../../api/auth';

export default function Register() {
  const navigate  = useNavigate();
  const [mode,    setMode]    = useState('login');   // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const [loginForm, setLoginForm] = useState({
    phone_number:    '',
    identity_number: '',
  });

  const [regForm, setRegForm] = useState({
    full_name:       '',
    phone_number:    '',
    identity_number: '',
    identity_type:   'national_id',
    date_of_birth:   '',
    location:        '',
  });

  const handleLoginChange = (e) =>
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });

  const handleRegChange = (e) =>
    setRegForm({ ...regForm, [e.target.name]: e.target.value });

  const saveAndNavigate = (data) => {
    localStorage.setItem('civtech_token',   data.access_token);
    localStorage.setItem('civtech_patient', JSON.stringify(data.patient));
    navigate('/chat');
  };

  const handleLogin = async () => {
    setError('');
    if (!loginForm.phone_number || !loginForm.identity_number) {
      setError('Please enter your phone number and ID number.');
      return;
    }
    setLoading(true);
    try {
      const res = await loginPatient(loginForm);
      saveAndNavigate(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!regForm.full_name || !regForm.phone_number || !regForm.identity_number) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await registerPatient(regForm);
      saveAndNavigate(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="header">
        <div>
          <div className="header__logo">CivTech Care</div>
          <div className="header__sub">AI-Powered Healthcare</div>
        </div>
      </div>

      <div className="container">
        <div style={{ marginTop: 28, marginBottom: 20 }}>
          {/* ── Mode Toggle ── */}
          <div style={{
            display:       'flex',
            background:    'var(--gray-200)',
            borderRadius:  'var(--radius)',
            padding:       4,
            marginBottom:  24,
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
              <p className="card__title">Welcome Back</p>

              <div className="form-group">
                <label className="label">Phone Number</label>
                <input
                  className="input"
                  name="phone_number"
                  placeholder="+254712345678"
                  value={loginForm.phone_number}
                  onChange={handleLoginChange}
                />
              </div>

              <div className="form-group">
                <label className="label">ID Number</label>
                <input
                  className="input"
                  name="identity_number"
                  placeholder="Your National ID / Birth Cert / CHF number"
                  value={loginForm.identity_number}
                  onChange={handleLoginChange}
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
                New patient?{' '}
                <span
                  style={{ color: 'var(--blue)', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { setMode('register'); setError(''); }}
                >
                  Create an account
                </span>
              </p>
            </div>
          )}

          {/* ── REGISTER FORM ── */}
          {mode === 'register' && (
            <div className="card">
              <p className="card__title">Create Your Health Account</p>

              <div className="form-group">
                <label className="label">Full Name *</label>
                <input
                  className="input"
                  name="full_name"
                  placeholder="e.g. Jane Wanjiru"
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
                <label className="label">ID Type *</label>
                <select
                  className="input"
                  name="identity_type"
                  value={regForm.identity_type}
                  onChange={handleRegChange}
                >
                  <option value="national_id">National ID</option>
                  <option value="birth_cert">Birth Certificate Number</option>
                  <option value="chf_number">CHF Register Number</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">ID Number *</label>
                <input
                  className="input"
                  name="identity_number"
                  placeholder="Enter your ID number"
                  value={regForm.identity_number}
                  onChange={handleRegChange}
                />
              </div>

              <div className="form-group">
                <label className="label">Date of Birth</label>
                <input
                  className="input"
                  name="date_of_birth"
                  type="date"
                  value={regForm.date_of_birth}
                  onChange={handleRegChange}
                />
              </div>

              <div className="form-group">
                <label className="label">Your Area / Town</label>
                <input
                  className="input"
                  name="location"
                  placeholder="e.g. Kisumu, Turkana"
                  value={regForm.location}
                  onChange={handleRegChange}
                />
              </div>

              <button
                className="btn btn--primary"
                onClick={handleRegister}
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create Account & Continue'}
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

          <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', marginTop: 12 }}>
            Are you a doctor?{' '}
            <span
              style={{ color: 'var(--blue)', cursor: 'pointer' }}
              onClick={() => navigate('/doctor')}
            >
              Doctor login
            </span>
          </p>

          <p style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'center', marginTop: 8 }}>
            Your data is encrypted and stored securely in compliance
            with the Kenya Data Protection Act 2019.
          </p>
        </div>
      </div>
    </div>
  );
}
