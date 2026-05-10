import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerPatient } from '../../api/auth';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name:       '',
    phone_number:    '',
    identity_number: '',
    identity_type:   'national_id',
    date_of_birth:   '',
    location:        '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setError('');
    if (!form.full_name || !form.phone_number || !form.identity_number) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      await registerPatient(form);
      // Store phone for OTP screen
      localStorage.setItem('civtech_phone', form.phone_number);
      navigate('/verify');
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
          <div className="header__sub">Patient Registration</div>
        </div>
      </div>

      <div className="container">
        <div className="card" style={{ marginTop: 24 }}>
          <p className="card__title">Create Your Health Account</p>

          {error && <div className="alert alert--error">{error}</div>}

          <div className="form-group">
            <label className="label">Full Name *</label>
            <input
              className="input"
              name="full_name"
              placeholder="e.g. Jane Wanjiru"
              value={form.full_name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="label">Phone Number *</label>
            <input
              className="input"
              name="phone_number"
              placeholder="+254712345678"
              value={form.phone_number}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="label">ID Type *</label>
            <select
              className="input"
              name="identity_type"
              value={form.identity_type}
              onChange={handleChange}
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
              value={form.identity_number}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="label">Date of Birth</label>
            <input
              className="input"
              name="date_of_birth"
              type="date"
              value={form.date_of_birth}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="label">Your Area / Town</label>
            <input
              className="input"
              name="location"
              placeholder="e.g. Kisumu, Turkana"
              value={form.location}
              onChange={handleChange}
            />
          </div>

          <button
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Sending OTP...' : 'Register & Get OTP'}
          </button>

          <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--gray-600)' }}>
            Already registered?{' '}
            <span
              style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => navigate('/chat')}
            >
              Go to Chat
            </span>
          </p>
        </div>

        <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', marginTop: 8 }}>
          Your data is encrypted and stored securely in compliance with
          the Kenya Data Protection Act 2019.
        </p>
      </div>
    </div>
  );
}
