import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class AIFeedback(Base):
    """
    Stores Reinforcement Learning from Human Feedback (RLHF) ratings.
    Doctors rate the AI's triage accuracy when submitting a verdict.
    This dataset can be used to fine-tune future LLM prompt adjustments
    or custom model training.
    """
    __tablename__ = "ai_training_feedback"

    # ── PRIMARY KEY ──
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # ── RELATIONSHIPS ──
    appointment_id  = Column(String, ForeignKey("appointments.id"), nullable=True)

    # ── RATING & DIAGNOSIS ──
    rating          = Column(Integer, nullable=False)           # 1 to 5 stars
    ai_assessment   = Column(Text, nullable=True)               # The AI's original preliminary assessment
    actual_diagnosis = Column(Text, nullable=True)              # The doctor's actual diagnosis
    comment         = Column(Text, nullable=True)               # Doctor's explanation of what the AI got wrong/right

    # ── TIMESTAMPS ──
    created_at      = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<AIFeedback Appointment:{self.appointment_id} Rating:{self.rating}/5>"
