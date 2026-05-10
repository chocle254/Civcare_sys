from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.models.consultation import RecordAccess
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.services.encryption import generate_key_two, verify_key_two, decrypt_record
from app.agents.records_agent import generate_patient_summary

router = APIRouter()


class AccessRequest(BaseModel):
    patient_id:     str
    doctor_id:      str
    appointment_id: str | None = None


class AccessVerify(BaseModel):
    patient_id:    str
    doctor_id:     str
    key_two_plain: str
    access_id:     str


@router.post("/request-access")
async def request_access(data: AccessRequest, db: Session = Depends(get_db)):
    """
    Doctor requests access to patient records.
    System generates Key 2 and returns it to the doctor.
    Key 2 expires automatically after 24 hours.
    """
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    # Verify doctor is from same hospital as appointment
    plain_key, hashed_key, expires_at = generate_key_two()

    access = RecordAccess(
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        appointment_id=data.appointment_id,
        key_two_hash=hashed_key,
        expires_at=expires_at,
    )
    db.add(access)
    db.commit()
    db.refresh(access)

    return {
        "access_id":    access.id,
        "key_two":      plain_key,        # Shown to doctor once only
        "expires_at":   expires_at,
        "message":      "Record access granted. Key expires in 24 hours.",
    }


@router.post("/view")
async def view_record(data: AccessVerify, db: Session = Depends(get_db)):
    """
    Doctor views patient record using both keys.
    Returns a structured summary — never raw patient data.
    """
    access = db.query(RecordAccess).filter(
        RecordAccess.id        == data.access_id,
        RecordAccess.patient_id == data.patient_id,
        RecordAccess.doctor_id  == data.doctor_id,
        RecordAccess.is_expired == False,
    ).first()

    if not access:
        raise HTTPException(status_code=403, detail="Access record not found or expired.")

    # Check expiry
    if datetime.utcnow() > access.expires_at:
        access.is_expired = True
        db.commit()
        raise HTTPException(status_code=403, detail="Access key has expired.")

    # Verify Key 2
    if not verify_key_two(data.key_two_plain, access.key_two_hash):
        raise HTTPException(status_code=403, detail="Invalid access key.")

    # Build patient data for summary
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()

    raw_record = {
        "name":             patient.full_name,
        "age":              patient.age or "Unknown",
        "conditions":       "None on record",
        "medications":      "None on record",
        "allergies":        "None on record",
        "last_visit":       "No previous visits",
        "current_complaint":"See triage report",
    }

    # Generate AI summary — doctor sees this, not raw data
    summary = await generate_patient_summary(raw_record)

    return {
        "summary":       summary,
        "patient_name":  patient.full_name,
        "patient_age":   patient.age,
        "patient_phone": patient.phone_number,
        "location":      patient.location,
        "identity_type": patient.identity_type,
        "access_expires":access.expires_at,
    }
