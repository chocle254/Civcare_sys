import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Float, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ConsultationStatus(str, enum.Enum):
    PENDING         = "pending"          # Patient paid, waiting for doctor to call
    IN_PROGRESS     = "in_progress"      # Doctor has called, call is active
    COMPLETED       = "completed"        # Both sides marked complete
    REFUNDED        = "refunded"         # Doctor went offline — patient auto refunded
    EXPIRED         = "expired"          # No doctor called within time window


class PaymentStatus(str, enum.Enum):
    PENDING     = "pending"     # Patient has not paid yet
    PAID        = "paid"        # Payment confirmed, held in escrow
    RELEASED    = "released"    # Released to doctor after completion
    REFUNDED    = "refunded"    # Returned to patient


class PaymentMethod(str, enum.Enum):
    MPESA   = "mpesa"
    AIRTEL  = "airtel"


class Consultation(Base):
    """
    Remote consultation between patient and doctor via phone call.
    Doctor sets their own fee. Patient pays upfront into escrow.
    Doctor calls patient's registered phone number directly.
    Payment releases when either side marks complete or after 30 minutes auto-release.
    Patient sees "Rate Your Experience" — they don't know this releases the payment 😂
    """
    __tablename__ = "consultations"

    # ── PRIMARY KEY ──
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # ── RELATIONSHIPS ──
    patient_id      = Column(String, ForeignKey("patients.id"),  nullable=False)
    doctor_id       = Column(String, ForeignKey("doctors.id"),   nullable=False)
    session_id      = Column(String, ForeignKey("chat_sessions.id"), nullable=True)

    # ── STATUS ──
    status          = Column(Enum(ConsultationStatus), default=ConsultationStatus.PENDING)

    # ── PAYMENT ──
    fee_amount      = Column(Float, nullable=False)                         # Doctor's fee at time of booking
    platform_commission = Column(Float, nullable=True)                      # CivTech cut (10-15%)
    doctor_payout   = Column(Float, nullable=True)                          # fee - commission
    payment_status  = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method  = Column(Enum(PaymentMethod), nullable=True)
    payment_ref     = Column(String, nullable=True)                         # M-Pesa or Airtel transaction ID
    paid_at         = Column(DateTime, nullable=True)
    released_at     = Column(DateTime, nullable=True)

    # ── CALL TRACKING ──
    # Doctor calls patient on their registered phone number directly
    call_initiated_at   = Column(DateTime, nullable=True)
    call_ended_at       = Column(DateTime, nullable=True)

    # ── COMPLETION ──
    # Payment releases when either marks complete OR after 30min auto-release
    doctor_marked_complete  = Column(Boolean, default=False)
    patient_marked_complete = Column(Boolean, default=False)  # Hidden as "Rate Experience"
    auto_released           = Column(Boolean, default=False)  # 30min auto release fired
    auto_release_at         = Column(DateTime, nullable=True) # Scheduled auto-release time

    # ── PATIENT RATING ──
    # Patient rates experience 1-5 stars — this triggers payment release
    # Patient does not know this is what releases the payment 😂
    patient_rating      = Column(String, nullable=True)      # 1 to 5
    patient_feedback    = Column(Text, nullable=True)

    # ── TIMESTAMPS ──
    created_at      = Column(DateTime, default=datetime.utcnow)
    completed_at    = Column(DateTime, nullable=True)

    # ── RELATIONSHIPS ──
    patient         = relationship("Patient", back_populates="consultations")
    doctor          = relationship("Doctor",  back_populates="consultations")

    def __repr__(self):
        return f"<Consultation {self.id} — {self.status} — Payment: {self.payment_status}>"


class RecordAccess(Base):
    """
    Tracks every time a doctor is granted access to a patient's records.
    Key 2 is generated here — expires after 24 hours automatically.
    Audit log required by Kenya Data Protection Act 2019.
    """
    __tablename__ = "record_accesses"

    # ── PRIMARY KEY ──
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # ── RELATIONSHIPS ──
    patient_id      = Column(String, ForeignKey("patients.id"), nullable=False)
    doctor_id       = Column(String, ForeignKey("doctors.id"),  nullable=False)
    appointment_id  = Column(String, nullable=True)

    # ── KEY 2 ──
    # Temporary key generated per session — stored as hash never plain text
    key_two_hash    = Column(String, nullable=False)
    expires_at      = Column(DateTime, nullable=False)   # 24 hours from grant
    is_expired      = Column(Boolean, default=False)     # Set to True after expiry

    # ── TIMESTAMPS ──
    granted_at      = Column(DateTime, default=datetime.utcnow)
    revoked_at      = Column(DateTime, nullable=True)    # If patient manually revokes early

    # ── RELATIONSHIPS ──
    patient         = relationship("Patient", back_populates="record_accesses")
    doctor          = relationship("Doctor",  back_populates="record_accesses")

    def __repr__(self):
        return f"<RecordAccess Patient:{self.patient_id} Doctor:{self.doctor_id} Expires:{self.expires_at}>"
