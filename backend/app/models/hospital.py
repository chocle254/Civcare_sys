import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
from app.database import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    # ── PRIMARY KEY ──
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # ── IDENTITY ──
    name             = Column(String, nullable=False)
    facility_code    = Column(String, unique=True, nullable=False)  # Kenya MoH facility code

    # ── LOCATION ──
    county           = Column(String, nullable=False)
    town             = Column(String, nullable=False)
    address          = Column(String, nullable=True)
    latitude         = Column(Float, nullable=True)   # For patient distance calculation
    longitude        = Column(Float, nullable=True)

    # ── CONTACT ──
    phone_number     = Column(String, nullable=True)
    email            = Column(String, nullable=True)

    # ── STATUS ──
    is_active        = Column(Boolean, default=True)  # CivTech admin can deactivate

    # ── TIMESTAMPS ──
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ── RELATIONSHIPS ──
    doctors          = relationship("Doctor",       back_populates="hospital")
    appointments     = relationship("Appointment",  back_populates="hospital")

    def __repr__(self):
        return f"<Hospital {self.name} — {self.county}>"
