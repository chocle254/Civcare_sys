import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class SessionStatus(str, enum.Enum):
    ACTIVE      = "active"       # Conversation is ongoing
    COMPLETED   = "completed"    # Patient was seen or consultation done
    ABANDONED   = "abandoned"    # Patient left without completing


class SessionType(str, enum.Enum):
    TRIAGE       = "triage"       # Normal hospital triage flow
    MEDSCAN      = "medscan"      # Medication check mid-conversation
    CONSULTATION = "consultation" # Remote consultation with doctor


class ChatSession(Base):
    """
    Stores the full AI conversation for each patient interaction.
    Every message is saved so the doctor sees complete context
    when the patient arrives or consultation begins.
    """
    __tablename__ = "chat_sessions"

    # ── PRIMARY KEY ──
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # ── RELATIONSHIPS ──
    patient_id   = Column(String, ForeignKey("patients.id"), nullable=False)

    # ── SESSION INFO ──
    session_type = Column(Enum(SessionType), default=SessionType.TRIAGE)
    status       = Column(Enum(SessionStatus), default=SessionStatus.ACTIVE)

    # ── CONVERSATION ──
    # Full conversation stored as JSON string
    # Format: [{"role": "patient", "content": "..."}, {"role": "ai", "content": "..."}]
    messages     = Column(Text, nullable=True)

    # ── TRIAGE OUTPUT ──
    # Generated silently — patient never sees this, doctor always sees it
    risk_score          = Column(String, nullable=True)    # low / moderate / critical
    risk_score_numeric  = Column(String, nullable=True)    # 1–100
    ai_assessment       = Column(Text, nullable=True)      # AI preliminary assessment
    ai_confidence       = Column(String, nullable=True)    # AI confidence percentage

    # ── MEDSCAN OUTPUT ──
    medication_checked  = Column(String, nullable=True)    # Name of medication patient asked about
    clash_detected      = Column(Boolean, default=False)
    clash_details       = Column(Text, nullable=True)

    # ── ROUTING ──
    # Where the AI routed the patient at the end of the conversation
    routed_to_hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=True)
    routed_to_consultation = Column(Boolean, default=False)

    # ── TIMESTAMPS ──
    started_at   = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # ── RELATIONSHIPS ──
    patient      = relationship("Patient",  back_populates="sessions")

    def __repr__(self):
        return f"<ChatSession {self.id} — {self.session_type} — {self.status}>"
