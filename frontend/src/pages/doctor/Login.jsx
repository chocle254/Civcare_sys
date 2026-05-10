import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorLogin } from '../../api/auth';

export default function DoctorLogin() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async () => {
    setError('');
    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await doctorLogin(form);
      localStorage.setItem('civtech_token',  res.data.access_token);
      localStorage.setItem('civtech_doctor', JSON.stringify(res.data.doctor));
      navigate('/doctor/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleLogin(); };

  return (
    <div className="page">
      <div className="header">
        <div>
          <div className="header__logo">CivTech Care</div>
          <div className="header__sub">Doctor Portal</div>
        </div>
      </div>

      <div className="container">
        <div className="card" style={{ marginTop: 40 }}>
          <p className="card__title">Doctor Login</p>

          {error && <div className="alert alert--error">{error}</div>}

          <div className="form-group">
            <label className="label">Email Address</label>
            <input
              className="input"
              name="email"
              type="email"
              placeholder="doctor@hospital.co.ke"
              value={form.email}
              onChange={handleChange}
              onKeyDown={handleKey}
            />
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <input
              className="input"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
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
        </div>

        <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', marginTop: 12 }}>
          Doctor accounts are registered by your hospital administrator only.
        </p>
      </div>
    </div>
  );
}
