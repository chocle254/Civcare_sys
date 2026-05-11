import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyPatientOTP } from '../../api/auth';

export default function OTPVerify() {
  const navigate = useNavigate();
  const phone    = localStorage.getItem('civtech_phone') || '';
  const [otp,     setOtp]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleVerify = async () => {
    setError('');
    if (otp.length < 4) {
      setError('Please enter the OTP sent to your phone.');
      return;
    }
    setLoading(true);
    try {
      const res = await verifyPatientOTP({ phone_number: phone, otp_code: otp });
      localStorage.setItem('civtech_token',   res.data.access_token);
      localStorage.setItem('civtech_patient', JSON.stringify(res.data.patient));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="header">
        <div>
          <div className="header__logo">CivTech Care</div>
          <div className="header__sub">Verify Your Number</div>
        </div>
      </div>

      <div className="container">
        <div className="card" style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: 'var(--gray-600)', marginBottom: 8 }}>
            We sent a verification code to
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>
            {phone}
          </p>

          {error && <div className="alert alert--error">{error}</div>}

          <div className="form-group">
            <input
              className="input input--otp"
              type="number"
              placeholder="------"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>

          <button
            className="btn btn--primary"
            onClick={handleVerify}
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>

          <p style={{ marginTop: 20, fontSize: 13, color: 'var(--gray-400)' }}>
            Did not receive the code?{' '}
            <span
              style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => navigate('/')}
            >
              Go back and retry
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
