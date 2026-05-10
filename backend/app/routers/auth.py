from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
from pydantic import BaseModel
from app.database import get_db
from app.models.patient import Patient, IdentityType
from app.models.doctor import Doctor
from app.services.encryption import generate_key_one, hash_password, verify_password
from app.services.otp import generate_otp, verify_otp
from app.services.africastalking import send_otp_sms
from app.config import settings

router = APIRouter()


# ── SCHEMAS ──
class PatientRegister(BaseModel):
    full_name:       str
    phone_number:    str
    identity_number: str
    identity_type:   str   # national_id / birth_cert / chf_number
    date_of_birth:   str | None = None
    location:        str | None = None


class OTPVerify(BaseModel):
    phone_number: str
    otp_code:     str


class DoctorLogin(BaseModel):
    email:    str
    password: str


# ── HELPERS ──
def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ── PATIENT REGISTRATION ──
@router.post("/patient/register")
async def register_patient(data: PatientRegister, db: Session = Depends(get_db)):
    # Check if already registered
    existing = db.query(Patient).filter(
        Patient.phone_number == data.phone_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered.")

    # Generate Key 1 — permanent patient key
    key_one_hash = generate_key_one(data.identity_number, data.phone_number)

    # Generate OTP
    otp, expires_at = generate_otp()

    patient = Patient(
        full_name=data.full_name,
        phone_number=data.phone_number,
        identity_number=data.identity_number,
        identity_type=IdentityType(data.identity_type),
        date_of_birth=data.date_of_birth,
        location=data.location,
        key_one_hash=key_one_hash,
        otp_code=otp,
        otp_expires_at=expires_at,
    )
    db.add(patient)
    db.commit()

    # Send OTP via SMS
    await send_otp_sms(data.phone_number, otp)

    return {"message": "OTP sent to your phone number.", "phone": data.phone_number}


# ── PATIENT OTP VERIFY ──
@router.post("/patient/verify")
async def verify_patient(data: OTPVerify, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(
        Patient.phone_number == data.phone_number
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    if not verify_otp(data.otp_code, patient.otp_code, patient.otp_expires_at):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    patient.is_verified = True
    patient.otp_code = None
    db.commit()

    token = create_token({"sub": patient.id, "role": "patient"})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "patient": {
            "id":       patient.id,
            "name":     patient.full_name,
            "phone":    patient.phone_number,
        }
    }


# ── DOCTOR LOGIN ──
@router.post("/doctor/login")
async def doctor_login(data: DoctorLogin, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.email == data.email).first()

    if not doctor or not verify_password(data.password, doctor.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not doctor.is_active:
        raise HTTPException(status_code=403, detail="Account not active. Contact your hospital admin.")

    token = create_token({"sub": doctor.id, "role": "doctor", "hospital_id": doctor.hospital_id})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "doctor": {
            "id":               doctor.id,
            "name":             doctor.full_name,
            "specialisation":   doctor.specialisation,
            "hospital_id":      doctor.hospital_id,
            "consultation_fee": doctor.consultation_fee,
            "status":           doctor.status,
        }
    }
