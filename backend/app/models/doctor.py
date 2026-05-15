import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class DoctorStatus(str, enum.Enum):
    AVAILABLE    = "available"      # Free — can receive patients and consultations
    WITH_PATIENT = "with_patient"   # Auto set when doctor opens a patient profile
    ON_BREAK     = "on_break"       # Doctor manually set this
    OFFLINE      = "offline"        # Manually set or auto after 10min inactivity


class Doctor(Base):
    __tablename__ = "doctors"

    # ── PRIMARY KEY ──
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # ── IDENTITY ──
    full_name          = Column(String, nullable=False)
    email              = Column(String, unique=True, nullable=False, index=True)
    phone_number       = Column(String, unique=True, nullable=False)
    national_id        = Column(String, unique=True, nullable=True)  # Temporarily nullable for existing data

    # ── PROFESSIONAL ──
    kmpdb_license      = Column(String, unique=True, nullable=False)  # Kenya Medical Practitioners Board license
    specialisation     = Column(String, nullable=True)                # e.g General Practitioner, Surgeon
    hospital_id        = Column(String, ForeignKey("hospitals.id"), nullable=False)

    # ── CONSULTATION FEE ──
    # Each doctor sets their own fee
    consultation_fee   = Column(Float, default=0.0)

    # ── AUTH ──
    password_hash      = Column(String, nullable=False)
    otp_code           = Column(String, nullable=True)
    otp_expires_at     = Column(DateTime, nullable=True)
    is_verified        = Column(Boolean, default=False)
    is_active          = Column(Boolean, default=True)   # Hospital HR can deactivate

    # ── AVAILABILITY ──
    status             = Column(Enum(DoctorStatus), default=DoctorStatus.OFFLINE)
    shift_start        = Column(String, nullable=True)   # e.g "08:00"
    shift_end          = Column(String, nullable=True)   # e.g "17:00"
    last_active_at     = Column(DateTime, nullable=True) # For 10-minute inactivity check

    # ── AI RATING ──
    # Running average of AI accuracy ratings this doctor has given
    ai_accuracy_rating = Column(Float, default=0.0)
    total_ratings_given = Column(String, default="0")

    # ── TIMESTAMPS ──
    created_at         = Column(DateTime, default=datetime.utcnow)
    updated_at         = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ── RELATIONSHIPS ──
    hospital           = relationship("Hospital",      back_populates="doctors")
    appointments       = relationship("Appointment",   back_populates="doctor")
    consultations      = relationship("Consultation",  back_populates="doctor")
    verdicts           = relationship("Verdict",       back_populates="doctor")
    record_accesses    = relationship("RecordAccess",  back_populates="doctor")

    def __repr__(self):
        return f"<Doctor {self.full_name} — {self.specialisation} — {self.status}>"
