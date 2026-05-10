from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel
from app.database import get_db
from app.models.consultation import Consultation, ConsultationStatus, PaymentStatus
from app.models.doctor import Doctor, DoctorStatus
from app.models.patient import Patient
from app.services.africastalking import send_consultation_request

router = APIRouter()


class ConsultInit(BaseModel):
    patient_id:    str
    doctor_id:     str
    session_id:    str | None = None
    payment_ref:   str
    payment_method:str
    fee_amount:    float


class ConsultComplete(BaseModel):
    consultation_id: str
    doctor_id:       str


class ConsultRate(BaseModel):
    consultation_id:  str
    patient_rating:   int
    patient_feedback: str = ""


@router.post("/initiate")
async def initiate_consultation(data: ConsultInit, db: Session = Depends(get_db)):
    """
    Called after payment is confirmed.
    Creates consultation record and notifies doctor to call patient.
    """
    doctor  = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()

    if not doctor or not patient:
        raise HTTPException(status_code=404, detail="Doctor or patient not found.")

    # Calculate platform commission (15%)
    commission    = round(data.fee_amount * 0.15, 2)
    doctor_payout = round(data.fee_amount - commission, 2)

    # Schedule auto-release 30 minutes from now
    auto_release_at = datetime.utcnow() + timedelta(minutes=30)

    consult = Consultation(
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        session_id=data.session_id,
        status=ConsultationStatus.PENDING,
        fee_amount=data.fee_amount,
        platform_commission=commission,
        doctor_payout=doctor_payout,
        payment_status=PaymentStatus.PAID,
        payment_method=data.payment_method,
        payment_ref=data.payment_ref,
        paid_at=datetime.utcnow(),
        auto_release_at=auto_release_at,
    )
    db.add(consult)

    # Doctor goes busy
    doctor.status = DoctorStatus.WITH_PATIENT
    db.commit()
    db.refresh(consult)

    # Notify doctor via SMS to call patient
    await send_consultation_request(
        doctor_phone=doctor.phone_number,
        patient_name=patient.full_name,
        patient_phone=patient.phone_number,
    )

    return {
        "consultation_id": consult.id,
        "message":         "Consultation initiated. Doctor will call you shortly.",
        "auto_release_at": auto_release_at,
    }


@router.get("/{consultation_id}")
async def get_consultation(consultation_id: str, db: Session = Depends(get_db)):
    """Doctor views consultation details during active call."""
    consult = db.query(Consultation).filter(
        Consultation.id == consultation_id
    ).first()
    if not consult:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    patient = db.query(Patient).filter(Patient.id == consult.patient_id).first()

    return {
        "id":               consult.id,
        "patient_name":     patient.full_name if patient else "Unknown",
        "patient_phone":    patient.phone_number if patient else "—",
        "fee_amount":       consult.fee_amount,
        "payment_status":   consult.payment_status,
        "status":           consult.status,
        "clash_detected":   False,
        "clash_details":    "",
        "current_medications": [],
        "allergies":        "None on record",
        "symptoms_summary": "See session record",
    }


@router.post("/complete")
async def complete_consultation(data: ConsultComplete, db: Session = Depends(get_db)):
    """
    Doctor marks consultation as complete.
    Triggers payment release from escrow to doctor.
    Doctor status switches back to available.
    """
    consult = db.query(Consultation).filter(
        Consultation.id       == data.consultation_id,
        Consultation.doctor_id == data.doctor_id,
    ).first()
    if not consult:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    consult.doctor_marked_complete = True
    consult.status                 = ConsultationStatus.COMPLETED
    consult.payment_status         = PaymentStatus.RELEASED
    consult.released_at            = datetime.utcnow()
    consult.completed_at           = datetime.utcnow()

    # Doctor back to available
    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    if doctor:
        doctor.status = DoctorStatus.AVAILABLE

    db.commit()
    return {"message": "Consultation complete. Payment released.", "payout": consult.doctor_payout}


@router.post("/rate")
async def rate_consultation(data: ConsultRate, db: Session = Depends(get_db)):
    """
    Patient rates their experience (1-5 stars).
    This ALSO releases the payment — patient does not know this 😂
    If already released by doctor, just saves the rating.
    """
    consult = db.query(Consultation).filter(
        Consultation.id == data.consultation_id
    ).first()
    if not consult:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    consult.patient_rating          = str(data.patient_rating)
    consult.patient_feedback        = data.patient_feedback
    consult.patient_marked_complete = True

    # Release payment if not already released
    if consult.payment_status != PaymentStatus.RELEASED:
        consult.payment_status = PaymentStatus.RELEASED
        consult.released_at    = datetime.utcnow()
        consult.status         = ConsultationStatus.COMPLETED
        consult.completed_at   = datetime.utcnow()

    db.commit()
    return {"message": "Thank you for your rating."}
