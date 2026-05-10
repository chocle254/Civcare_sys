import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class AppointmentStatus(str, enum.Enum):
    PENDING         = "pending"          # Patient triaged, not yet arrived
    ARRIVED         = "arrived"          # Patient confirmed arrival
    CALLED          = "called"           # Doctor clicked Call button
    IN_PROGRESS     = "in_progress"      # Doctor opened patient profile
    COMPLETED       = "completed"        # Doctor submitted verdict
    REDIRECTED      = "redirected"       # Doctor went on break — patient moved to new doctor
    CANCELLED       = "cancelled"        # Patient did not show up


class Appointment(Base):
    """
    Created when a patient completes triage and selects a hospital.
    The doctor sees this on their live queue dashboard.
    When a doctor goes on break the appointment is silently
    reassigned to the next available doctor — patient never knows.
    """
    __tablename__ = "appointments"

    # ── PRIMARY KEY ──
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # ── CORE RELATIONSHIPS ──
    patient_id      = Column(String, ForeignKey("patients.id"),   nullable=False)
    hospital_id     = Column(String, ForeignKey("hospitals.id"),  nullable=False)
    doctor_id       = Column(String, ForeignKey("doctors.id"),    nullable=True)  # Assigned after patient selects hospital
    session_id      = Column(String, ForeignKey("chat_sessions.id"), nullable=True)  # Links to the AI conversation

    # ── STATUS ──
    status          = Column(Enum(AppointmentStatus), default=AppointmentStatus.PENDING)

    # ── TRIAGE DATA (copied from session for quick doctor access) ──
    risk_score      = Column(String, nullable=True)       # low / moderate / critical
    risk_numeric    = Column(String, nullable=True)       # 1–100
    symptoms_summary = Column(Text, nullable=True)        # One line summary for the queue

    # ── REDIRECT TRACKING ──
    # Tracks if this appointment was silently reassigned
    # Patient never sees this — they just get called by whoever is now assigned
    original_doctor_id  = Column(String, nullable=True)  # Who was first assigned
    redirect_reason     = Column(String, nullable=True)  # "break" / "shift_end" / "offline"
    redirect_count      = Column(String, default="0")    # How many times reassigned

    # ── TIMESTAMPS ──
    created_at      = Column(DateTime, default=datetime.utcnow)
    arrived_at      = Column(DateTime, nullable=True)    # When patient confirmed arrival
    called_at       = Column(DateTime, nullable=True)    # When doctor clicked Call
    completed_at    = Column(DateTime, nullable=True)

    # ── RELATIONSHIPS ──
    patient         = relationship("Patient",  back_populates="appointments")
    hospital        = relationship("Hospital", back_populates="appointments")
    doctor          = relationship("Doctor",   back_populates="appointments")
    verdict         = relationship("Verdict",  back_populates="appointment", uselist=False)

    def __repr__(self):
        return f"<Appointment {self.id} — {self.status} — Risk: {self.risk_score}>"
