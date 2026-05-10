import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Prescription(Base):
    """
    Created when a doctor submits their verdict after seeing a patient.
    The patient then inputs the dosage schedule from pharmacy guidance.
    This feeds directly into MedScan clash detection for future checks.
    """
    __tablename__ = "prescriptions"

    # ── PRIMARY KEY ──
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # ── RELATIONSHIPS ──
    patient_id      = Column(String, ForeignKey("patients.id"),  nullable=False)
    doctor_id       = Column(String, ForeignKey("doctors.id"),   nullable=True)
    verdict_id      = Column(String, ForeignKey("verdicts.id"),  nullable=True)

    # ── MEDICATION ──
    medication_name = Column(String, nullable=False)
    dosage_notation = Column(String, nullable=True)   # e.g "1x3", "2x2" — patient enters from pharmacy
    duration_days   = Column(Integer, nullable=True)  # Patient enters from pharmacy
    notes           = Column(Text, nullable=True)     # Any extra doctor notes on this medication

    # ── REMINDER SCHEDULE ──
    # Patient sets this themselves after visiting pharmacy
    # Calculated from dosage_notation + first_dose_time
    first_dose_time     = Column(String, nullable=True)   # e.g "14:00"
    reminder_interval_hours = Column(Integer, nullable=True)  # Calculated: 24 / times_per_day
    reminders_active    = Column(Boolean, default=False)
    reminders_start_at  = Column(DateTime, nullable=True)
    reminders_end_at    = Column(DateTime, nullable=True)

    # ── STATUS ──
    is_active       = Column(Boolean, default=True)   # False when course is complete
    is_completed    = Column(Boolean, default=False)

    # ── TIMESTAMPS ──
    prescribed_at   = Column(DateTime, default=datetime.utcnow)
    completed_at    = Column(DateTime, nullable=True)

    # ── RELATIONSHIPS ──
    patient         = relationship("Patient",  back_populates="prescriptions")
    doctor          = relationship("Doctor",   back_populates=None)
    reminders       = relationship("Reminder", back_populates="prescription")

    def __repr__(self):
        return f"<Prescription {self.medication_name} — {self.dosage_notation} — Active: {self.is_active}>"


class Reminder(Base):
    """
    Individual reminder instance for each scheduled dose.
    Created in bulk when patient sets up their reminder schedule.
    """
    __tablename__ = "reminders"

    # ── PRIMARY KEY ──
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # ── RELATIONSHIPS ──
    prescription_id = Column(String, ForeignKey("prescriptions.id"), nullable=False)

    # ── TIMING ──
    scheduled_at    = Column(DateTime, nullable=False)   # When this reminder should fire
    sent_at         = Column(DateTime, nullable=True)    # When it was actually sent

    # ── PATIENT RESPONSE ──
    # Patient replies TAKEN or SKIP via SMS or app
    response        = Column(String, nullable=True)       # "taken" / "skip"
    skip_reason     = Column(String, nullable=True)       # "forgot" / "better" / "no_meds" / "side_effects"
    responded_at    = Column(DateTime, nullable=True)

    # ── STATUS ──
    is_sent         = Column(Boolean, default=False)
    is_responded    = Column(Boolean, default=False)

    # ── RELATIONSHIPS ──
    prescription    = relationship("Prescription", back_populates="reminders")

    def __repr__(self):
        return f"<Reminder {self.scheduled_at} — Sent: {self.is_sent} — Response: {self.response}>"
