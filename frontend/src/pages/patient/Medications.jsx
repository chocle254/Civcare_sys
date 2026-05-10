import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';

export default function Medications() {
  const navigate  = useNavigate();
  const patient   = JSON.parse(localStorage.getItem('civtech_patient') || '{}');
  const [meds,    setMeds]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await client.get(`/reminders/my-meds?patient_id=${patient.id}`);
        setMeds(res.data.map((m) => ({ ...m, dosageInput: '', firstDose: '', editing: !m.reminders_active })));
      } catch {
        setMeds([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patient.id]);

  const handleChange = (id, field, value) => {
    setMeds((prev) => prev.map((m) => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSetReminder = async (med) => {
    if (!med.dosageInput || !med.firstDose) return;
    setSaving(true);
    try {
      await client.post('/reminders/set', {
        prescription_id: med.id,
        dosage_notation: med.dosageInput,
        first_dose_time: med.firstDose,
        patient_id:      patient.id,
      });
      setMeds((prev) => prev.map((m) => m.id === med.id
        ? { ...m, reminders_active: true, editing: false }
        : m
      ));
    } catch {
      alert('Could not set reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="header">
        <div>
          <div className="header__logo">CivTech Care</div>
          <div className="header__sub">My Medications</div>
        </div>
      </div>

      <div className="container">
        <div
          style={{
            background: 'var(--blue-light)',
            borderRadius: 'var(--radius)',
            padding: 14,
            marginTop: 20,
            marginBottom: 20,
            fontSize: 14,
            color: 'var(--gray-600)',
          }}
        >
          After visiting the pharmacy, enter how the pharmacist told
          you to take each medication to set up your reminders.
        </div>

        {loading && <div className="loader"><div className="spinner" /></div>}

        {!loading && meds.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>💊</p>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>
              No medications prescribed yet
            </p>
            <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>
              Your prescribed medications will appear here after your
              doctor submits their verdict.
            </p>
          </div>
        )}

        {meds.map((med) => (
          <div key={med.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16 }}>{med.medication_name}</p>
                <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                  Prescribed by Dr. {med.doctor_name || '—'}
                </p>
              </div>
              {med.reminders_active && (
                <span style={{
                  background: '#d4edda',
                  color: 'var(--green)',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 20,
                }}>
                  ✓ Reminders On
                </span>
              )}
            </div>

            {med.editing && (
              <>
                <div className="form-group">
                  <label className="label">
                    How did the pharmacy say to take it?
                  </label>
                  <select
                    className="input"
                    value={med.dosageInput}
                    onChange={(e) => handleChange(med.id, 'dosageInput', e.target.value)}
                  >
                    <option value="">Select dosage</option>
                    <option value="1x1">1 tablet once a day</option>
                    <option value="1x2">1 tablet twice a day</option>
                    <option value="1x3">1 tablet three times a day</option>
                    <option value="2x2">2 tablets twice a day</option>
                    <option value="2x3">2 tablets three times a day</option>
                    <option value="1x4">1 tablet four times a day</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Time you took your first dose</label>
                  <input
                    className="input"
                    type="time"
                    value={med.firstDose}
                    onChange={(e) => handleChange(med.id, 'firstDose', e.target.value)}
                  />
                </div>

                <button
                  className="btn btn--success"
                  onClick={() => handleSetReminder(med)}
                  disabled={saving || !med.dosageInput || !med.firstDose}
                >
                  {saving ? 'Setting...' : '🔔 Set Reminders'}
                </button>
              </>
            )}

            {!med.editing && med.reminders_active && (
              <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                <p>Schedule: {med.dosage_notation} — every {med.reminder_interval_hours} hours</p>
                <p>First dose: {med.first_dose_time}</p>
                <button
                  className="btn btn--ghost btn--sm"
                  style={{ marginTop: 10 }}
                  onClick={() => handleChange(med.id, 'editing', true)}
                >
                  Edit Schedule
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          className="btn btn--outline"
          style={{ marginTop: 8 }}
          onClick={() => navigate('/chat')}
        >
          Back to Chat
        </button>
      </div>
    </div>
  );
}
