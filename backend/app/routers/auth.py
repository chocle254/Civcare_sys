from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
from pydantic import BaseModel
from app.database import get_db
from app.models.patient import Patient, IdentityType
from app.models.doctor import Doctor, DoctorStatus
from app.models.hospital import Hospital
from app.services.encryption import generate_key_one, hash_password, verify_password
from app.config import settings

router = APIRouter()


# ── TOKEN HELPER ──
def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ════════════════════════════════
# PATIENT ENDPOINTS
# ════════════════════════════════

class PatientRegister(BaseModel):
    full_name:       str
    phone_number:    str
    identity_number: str
    identity_type:   str   # national_id / birth_cert / chf_number
    date_of_birth:   str | None = None
    location:        str | None = None


class PatientLogin(BaseModel):
    phone_number:    str
    identity_number: str


# ── PATIENT REGISTER ──
@router.post("/patient/register")
async def register_patient(data: PatientRegister, db: Session = Depends(get_db)):
    """
    Registers a new patient using phone number + identity number.
    No OTP — returns token immediately.
    If patient already exists, returns an error telling them to login instead.
    """
    # Check phone already registered
    existing_phone = db.query(Patient).filter(
        Patient.phone_number == data.phone_number
    ).first()
    if existing_phone:
        raise HTTPException(
            status_code=400,
            detail="Phone number already registered. Please login instead."
        )

    # Check identity number already registered
    existing_id = db.query(Patient).filter(
        Patient.identity_number == data.identity_number
    ).first()
    if existing_id:
        raise HTTPException(
            status_code=400,
            detail="This ID number is already registered. Please login instead."
        )

    # Generate Key 1 — permanent encryption key for this patient
    key_one_hash = generate_key_one(data.identity_number, data.phone_number)

    patient = Patient(
        full_name=data.full_name,
        phone_number=data.phone_number,
        identity_number=data.identity_number,
        identity_type=IdentityType(data.identity_type),
        date_of_birth=data.date_of_birth,
        location=data.location,
        key_one_hash=key_one_hash,
        is_verified=True,   # No OTP for now — verified on registration
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    token = create_token({"sub": patient.id, "role": "patient"})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "patient": {
            "id":       patient.id,
            "name":     patient.full_name,
            "phone":    patient.phone_number,
            "location": patient.location,
        }
    }


# ── PATIENT LOGIN ──
@router.post("/patient/login")
async def login_patient(data: PatientLogin, db: Session = Depends(get_db)):
    """
    Patient logs in using phone number + identity number.
    Both must match the same account.
    """
    patient = db.query(Patient).filter(
        Patient.phone_number    == data.phone_number,
        Patient.identity_number == data.identity_number,
    ).first()

    if not patient:
        raise HTTPException(
            status_code=401,
            detail="Phone number and ID number do not match any account. Please check and try again."
        )

    token = create_token({"sub": patient.id, "role": "patient"})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "patient": {
            "id":       patient.id,
            "name":     patient.full_name,
            "phone":    patient.phone_number,
            "location": patient.location,
        }
    }


# ════════════════════════════════
# DOCTOR ENDPOINTS
# ════════════════════════════════

class DoctorRegister(BaseModel):
    full_name:         str
    phone_number:      str
    national_id:       str        # Doctor's personal National ID
    kmpdb_license:     str        # Kenya Medical Practitioners Board license number
    specialisation:    str | None = None
    hospital_name:     str        # Name of their hospital — we find or create it
    consultation_fee:  float = 0.0
    shift_start:       str | None = "08:00"
    shift_end:         str | None = "17:00"


class DoctorLogin(BaseModel):
    kmpdb_license: str
    national_id:   str


# ── DOCTOR REGISTER ──
@router.post("/doctor/register")
async def register_doctor(data: DoctorRegister, db: Session = Depends(get_db)):
    """
    Doctor registers using their KMPDB license number + National ID.
    Hospital is matched by name — created if it does not exist yet.
    No email or password needed for now.
    """
    # Check license already registered
    existing = db.query(Doctor).filter(
        Doctor.kmpdb_license == data.kmpdb_license
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This KMPDB license is already registered. Please login instead."
        )

    # Find or create hospital by name
    hospital = db.query(Hospital).filter(
        Hospital.name.ilike(f"%{data.hospital_name}%")
    ).first()

    if not hospital:
        # Create the hospital so the doctor can register
        hospital = Hospital(
            name=data.hospital_name,
            facility_code=f"AUTO-{data.kmpdb_license}",
            county="Unknown",
            town="Unknown",
            is_active=True,
        )
        db.add(hospital)
        db.flush()   # Get the ID without committing yet

    # Use national_id as password hash for simple auth
    password_hash = hash_password(data.national_id)

    doctor = Doctor(
        full_name=data.full_name,
        phone_number=data.phone_number,
        email=f"{data.kmpdb_license}@civtech.local",  # Placeholder email
        kmpdb_license=data.kmpdb_license,
        specialisation=data.specialisation,
        hospital_id=hospital.id,
        consultation_fee=data.consultation_fee,
        password_hash=password_hash,
        is_verified=True,
        is_active=True,
        status=DoctorStatus.OFFLINE,
        shift_start=data.shift_start,
        shift_end=data.shift_end,
        last_active_at=datetime.utcnow(),
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    token = create_token({
        "sub":         doctor.id,
        "role":        "doctor",
        "hospital_id": doctor.hospital_id,
    })
    return {
        "access_token": token,
        "token_type":   "bearer",
        "doctor": {
            "id":               doctor.id,
            "name":             doctor.full_name,
            "specialisation":   doctor.specialisation,
            "hospital_id":      doctor.hospital_id,
            "hospital_name":    hospital.name,
            "consultation_fee": doctor.consultation_fee,
            "status":           doctor.status,
        }
    }


# ── DOCTOR LOGIN ──
@router.post("/doctor/login")
async def login_doctor(data: DoctorLogin, db: Session = Depends(get_db)):
    """
    Doctor logs in using KMPDB license number + National ID.
    """
    doctor = db.query(Doctor).filter(
        Doctor.kmpdb_license == data.kmpdb_license
    ).first()

    if not doctor or not verify_password(data.national_id, doctor.password_hash):
        raise HTTPException(
            status_code=401,
            detail="KMPDB license and National ID do not match. Please check and try again."
        )

    if not doctor.is_active:
        raise HTTPException(
            status_code=403,
            detail="Your account is not active. Please contact your hospital administrator."
        )

    # Get hospital name
    hospital = db.query(Hospital).filter(Hospital.id == doctor.hospital_id).first()

    token = create_token({
        "sub":         doctor.id,
        "role":        "doctor",
        "hospital_id": doctor.hospital_id,
    })
    return {
        "access_token": token,
        "token_type":   "bearer",
        "doctor": {
            "id":               doctor.id,
            "name":             doctor.full_name,
            "specialisation":   doctor.specialisation,
            "hospital_id":      doctor.hospital_id,
            "hospital_name":    hospital.name if hospital else "Unknown",
            "consultation_fee": doctor.consultation_fee,
            "status":           doctor.status,
        }
    }
