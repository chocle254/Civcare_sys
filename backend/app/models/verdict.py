import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.database import Base


class Verdict(Base):
    """
    Submitted by the doctor after seeing the patient.
    Contains the actual diagnosis, prescribed medications,
    and the doctor's rating of the AI triage accuracy.
    The rating feeds back into the AI self-training loop (RLHF).
    """
    __tablename__ = "verdicts"

    # ── PRIMARY KEY ──
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # ── RELATIONSHIPS ──
    doctor_id       = Column(String, ForeignKey("doctors.id"),       nullable=False)
    patient_id      = Column(String, ForeignKey("patients.id"),      nullable=False)
    appointment_id  = Column(String, ForeignKey("appointments.id"),  nullable=True)

    # ── DIAGNOSIS ──
    diagnosis           = Column(Text, nullable=False)          # Doctor's actual diagnosis
    severity_confirmed  = Column(String, nullable=True)         # Doctor confirms or overrides AI risk score
    notes               = Column(Text, nullable=True)           # Additional doctor notes

    # ── AI ACCURACY RATING ──
    # Doctor rates how accurate the AI triage was from 1 to 5 stars
    # This is sent back to the triage model for self-improvement (RLHF)
    ai_accuracy_rating  = Column(Integer, nullable=True)        # 1 to 5
    ai_rating_comment   = Column(Text, nullable=True)           # Optional: what the AI got wrong
    rating_submitted    = Column(String, default="false")

    # ── TIMESTAMPS ──
    submitted_at    = Column(DateTime, default=datetime.utcnow)

    # ── RELATIONSHIPS ──
    doctor          = relationship("Doctor",      back_populates="verdicts")
    appointment     = relationship("Appointment", back_populates="verdict")

    def __repr__(self):
        return f"<Verdict {self.id} — Dr:{self.doctor_id} — AI Rating:{self.ai_accuracy_rating}>"
