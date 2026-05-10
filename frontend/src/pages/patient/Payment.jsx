import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { triggerMpesa, triggerAirtel } from '../../api/payment';

export default function Payment() {
  const navigate = useNavigate();
  const doctor   = JSON.parse(localStorage.getItem('civtech_consult_doctor') || '{}');
  const patient  = JSON.parse(localStorage.getItem('civtech_patient')         || '{}');
  const [method,  setMethod]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [paid,    setPaid]    = useState(false);

  const handlePay = async () => {
    if (!method) {
      setError('Please select a payment method.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        phone_number: patient.phone,
        amount:       doctor.consultation_fee,
        reference:    `CONSULT-${Date.now()}`,
        doctor_id:    doctor.id,
        patient_id:   patient.id,
      };

      if (method === 'mpesa')  await triggerMpesa(payload);
      if (method === 'airtel') await triggerAirtel(payload);

      setPaid(true);
    } catch {
      setError('Payment could not be initiated. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (paid) {
    return (
      <div className="page">
        <div className="header">
          <div className="header__logo">CivTech Care</div>
        </div>
        <div className="container">
          <div className="card" style={{ marginTop: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📞</div>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Payment Confirmed
            </p>
            <p style={{ color: 'var(--gray-600)', marginBottom: 24, fontSize: 15 }}>
              Dr. {doctor.name} will call you shortly on your registered
              phone number. Please keep your phone nearby.
            </p>
            <div style={{
              background: 'var(--blue-light)',
              borderRadius: 'var(--radius)',
              padding: 14,
              fontSize: 13,
              color: 'var(--gray-600)',
              marginBottom: 24,
            }}>
              The doctor has your full health summary and symptoms.
              You do not need to repeat everything from the beginning.
            </div>
            <button
              className="btn btn--outline"
              onClick={() => navigate('/rate')}
            >
              After Your Call — Rate Experience
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="header">
        <div>
          <div className="header__logo">CivTech Care</div>
          <div className="header__sub">Payment</div>
        </div>
      </div>

      <div className="container">
        {/* Fee summary */}
        <div className="card" style={{ marginTop: 20 }}>
          <p className="card__title">Consultation Summary</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--gray-600)' }}>Doctor</span>
            <strong>Dr. {doctor.name}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--gray-600)' }}>Specialisation</span>
            <span>{doctor.specialisation || 'General Practitioner'}</span>
          </div>
          <hr className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue-dark)' }}>
              KES {doctor.consultation_fee}
            </span>
          </div>
        </div>

        {/* Payment method */}
        <div className="card">
          <p className="card__title">Select Payment Method</p>

          {error && <div className="alert alert--error">{error}</div>}

          {/* M-Pesa */}
          <div
            onClick={() => setMethod('mpesa')}
            style={{
              border: `2px solid ${method === 'mpesa' ? 'var(--green)' : 'var(--gray-200)'}`,
              borderRadius: 'var(--radius)',
              padding: 16,
              cursor: 'pointer',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: method === 'mpesa' ? '#d4edda' : 'var(--white)',
            }}
          >
            <div style={{
              width: 44, height: 44,
              background: '#4caf50',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>M</div>
            <div>
              <p style={{ fontWeight: 700 }}>M-Pesa</p>
              <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                Pay via Safaricom M-Pesa STK push
              </p>
            </div>
            {method === 'mpesa' && (
              <span style={{ marginLeft: 'auto', color: 'var(--green)', fontWeight: 700 }}>✓</span>
            )}
          </div>

          {/* Airtel Money */}
          <div
            onClick={() => setMethod('airtel')}
            style={{
              border: `2px solid ${method === 'airtel' ? 'var(--red)' : 'var(--gray-200)'}`,
              borderRadius: 'var(--radius)',
              padding: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: method === 'airtel' ? '#fde8e8' : 'var(--white)',
            }}
          >
            <div style={{
              width: 44, height: 44,
              background: '#e53935',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>A</div>
            <div>
              <p style={{ fontWeight: 700 }}>Airtel Money</p>
              <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                Pay via Airtel Money
              </p>
            </div>
            {method === 'airtel' && (
              <span style={{ marginLeft: 'auto', color: 'var(--red)', fontWeight: 700 }}>✓</span>
            )}
          </div>
        </div>

        <button
          className="btn btn--primary"
          onClick={handlePay}
          disabled={loading || !method}
        >
          {loading ? 'Processing...' : `Pay KES ${doctor.consultation_fee}`}
        </button>

        <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', marginTop: 12 }}>
          Payment is held securely until your consultation is complete.
        </p>
      </div>
    </div>
  );
}
