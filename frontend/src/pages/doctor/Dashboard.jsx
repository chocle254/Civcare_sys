import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateDoctorStatus, redirectPatients, pingDoctor } from '../../api/doctors';
import { callPatient } from '../../api/triage';
import useWebSocket from '../../hooks/useWebSocket';
import client from '../../api/client';

const RISK_CLASS = {
  critical: 'critical',
  moderate: 'moderate',
  low:      'low',
};

const RISK_LABEL = {
  critical: { label: '🔴 Critical', cls: 'badge--critical' },
  moderate: { label: '🟡 Moderate', cls: 'badge--moderate' },
  low:      { label: '🟢 Low',      cls: 'badge--low'      },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const doctor   = JSON.parse(localStorage.getItem('civtech_doctor') || '{}');

  const [queue,   setQueue]   = useState([]);
  const [status,  setStatus]  = useState(doctor.status || 'available');
  const [calling, setCalling] = useState(null); // appointment id being called
  const [loading, setLoading] = useState(true);

  // ── Load initial queue ──
  const loadQueue = useCallback(async () => {
    try {
      const res = await client.get(
        `/triage/queue?hospital_id=${doctor.hospital_id}&doctor_id=${doctor.id}`
      );
      setQueue(res.data);
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, [doctor.hospital_id, doctor.id]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // ── Live queue via WebSocket ──
  useWebSocket(doctor.hospital_id, (data) => {
    if (data.type === 'queue_update') setQueue(data.queue);
  });

  // ── Ping every 5 min so system knows doctor is active ──
  useEffect(() => {
    const interval = setInterval(() => {
      pingDoctor(doctor.id).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [doctor.id]);

  // ── Status update ──
  const handleStatusChange = async (newStatus) => {
    try {
      await updateDoctorStatus({ doctor_id: doctor.id, status: newStatus });
      setStatus(newStatus);
      // Update local storage so it persists on refresh
      localStorage.setItem(
        'civtech_doctor',
        JSON.stringify({ ...doctor, status: newStatus })
      );

      // If going on break or offline — redirect pending patients silently
      if (newStatus === 'on_break' || newStatus === 'offline') {
        await redirectPatients({
          doctor_id:   doctor.id,
          hospital_id: doctor.hospital_id,
          reason:      newStatus === 'on_break' ? 'break' : 'shift_end',
        });
        // Reload queue — it will now be empty for this doctor
        await loadQueue();
      }
    } catch {
      alert('Could not update status. Please try again.');
    }
  };

  // ── Call patient ──
  const handleCall = async (appt) => {
    setCalling(appt.id);
    try {
      await callPatient({ appointment_id: appt.id, doctor_id: doctor.id });
      // Update local queue status
      setQueue((prev) =>
        prev.map((a) =>
          a.id === appt.id ? { ...a, status: 'called' } : a
        )
      );
    } catch {
      alert('Could not notify patient. Please try again.');
    } finally {
      setCalling(null);
    }
  };

  // Sort: critical first, then moderate, then low
  const sortedQueue = [...queue].sort((a, b) => {
    const order = { critical: 0, moderate: 1, low: 2 };
    return (order[a.risk_score] ?? 3) - (order[b.risk_score] ?? 3);
  });

  return (
    <div className="page">
      <div className="header">
        <div>
          <div className="header__logo">CivTech Care</div>
          <div className="header__sub">Dr. {doctor.name} — Patient Queue</div>
        </div>
        <button
          className="btn btn--outline btn--sm"
          style={{ width: 'auto' }}
          onClick={() => {
            localStorage.clear();
            navigate('/doctor');
          }}
        >
          Logout
        </button>
      </div>

      {/* ── Status Bar ── */}
      <div className="status-bar">
        <span style={{ fontSize: 13, color: 'var(--gray-600)', marginRight: 8 }}>
          My Status:
        </span>
        {['available', 'on_break', 'offline'].map((s) => (
          <button
            key={s}
            className={`status-btn status-btn--${s} ${status === s ? 'active' : ''}`}
            onClick={() => handleStatusChange(s)}
          >
            {s === 'available' ? '🟢 Available'
              : s === 'on_break' ? '🟠 On Break'
              : '🔴 Offline'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--gray-400)' }}>
          {queue.length} patient{queue.length !== 1 ? 's' : ''} in queue
        </span>
      </div>

      <div className="container--wide" style={{ paddingTop: 20 }}>
        {loading && <div className="loader"><div className="spinner" /></div>}

        {!loading && queue.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>✅</p>
            <p style={{ fontWeight: 600 }}>Queue is clear</p>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 6 }}>
              No patients waiting right now.
            </p>
          </div>
        )}

        {!loading && sortedQueue.length > 0 && (
          <table className="queue-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Patient</th>
                <th>Risk</th>
                <th>Symptoms</th>
                <th>Arrived</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedQueue.map((appt, idx) => {
                const risk   = appt.risk_score || 'moderate';
                const badge  = RISK_LABEL[risk] || RISK_LABEL.moderate;
                const isCalling = calling === appt.id;

                return (
                  <tr
                    key={appt.id}
                    className={RISK_CLASS[risk]}
                    onClick={() => navigate(`/doctor/patient/${appt.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 700, color: 'var(--gray-400)' }}>
                      {idx + 1}
                    </td>
                    <td>
                      <p style={{ fontWeight: 600 }}>{appt.patient_name}</p>
                      <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                        {appt.patient_phone}
                      </p>
                    </td>
                    <td>
                      <span className={`badge ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200, fontSize: 13, color: 'var(--gray-600)' }}>
                      {appt.symptoms_summary || '—'}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                      {appt.arrived_at
                        ? new Date(appt.arrived_at).toLocaleTimeString('en-KE', {
                            hour: '2-digit', minute: '2-digit',
                          })
                        : 'Pending'}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn--primary btn--sm"
                          disabled={isCalling || appt.status === 'called'}
                          onClick={() => handleCall(appt)}
                        >
                          {isCalling
                            ? '...'
                            : appt.status === 'called'
                            ? 'Called ✓'
                            : 'Call'}
                        </button>
                        <button
                          className="btn btn--outline btn--sm"
                          onClick={() => navigate(`/doctor/patient/${appt.id}`)}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
