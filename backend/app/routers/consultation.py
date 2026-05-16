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
    payment_ref:    str | None = "DEMO-REF" 
    payment_method:str = "mpesa"
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
    try:
        await send_consultation_request(
            doctor_phone=doctor.phone_number,
            patient_name=patient.full_name,
            patient_phone=patient.phone_number,
        )
    except Exception:
        pass

    return {
        "consultation_id": consult.id,
        "message":         "Consultation initiated. Doctor will call you shortly.",
        "auto_release_at": auto_release_at,
    }

@router.get("/pending")
async def get_pending_consultations(doctor_id: str, db: Session = Depends(get_db)):
    """Doctor dashboard polls this for the Consultations tab."""
    consultations = db.query(Consultation).filter(
        Consultation.doctor_id == doctor_id,
        Consultation.status.in_([
            ConsultationStatus.PENDING,
            ConsultationStatus.IN_PROGRESS,
        ])
    ).order_by(Consultation.created_at.desc()).all()

    result = []
    for c in consultations:
        patient = db.query(Patient).filter(Patient.id == c.patient_id).first()

        # Pull symptoms from triage session if available
        symptoms = "Direct consultation request"
        if c.session_id:
            from app.models.session import ChatSession
            session = db.query(ChatSession).filter(ChatSession.id == c.session_id).first()
            if session and session.ai_assessment:
                symptoms = session.ai_assessment[:150]

        result.append({
            "id":               c.id,
            "patient_name":     patient.full_name    if patient else "Unknown",
            "patient_phone":    patient.phone_number if patient else "—",
            "patient_id":       c.patient_id,
            "status":           c.status,
            "fee_amount":       c.fee_amount,
            "payment_status":   c.payment_status,
            "symptoms_summary": symptoms,
            "started":          c.created_at.isoformat(),
        })

    return result

@router.get("/status/{consultation_id}")
async def get_consultation_status(consultation_id: str, db: Session = Depends(get_db)):
    consult = db.query(Consultation).filter(
        Consultation.id == consultation_id
    ).first()
    if not consult:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return {"status": consult.status}


class MarkCalled(BaseModel):
    consultation_id: str

@router.post("/mark-called")
async def mark_consultation_called(data: MarkCalled, db: Session = Depends(get_db)):
    consult = db.query(Consultation).filter(
        Consultation.id == data.consultation_id
    ).first()
    if not consult:
        raise HTTPException(status_code=404, detail="Not found")
    consult.status = "called"
    db.commit()
    return {"message": "Marked as called"}



@router.get("/{consultation_id}")
async def get_consultation(consultation_id: str, db: Session = Depends(get_db)):
    """Doctor views consultation details during active call."""
    consult = db.query(Consultation).filter(
        Consultation.id == consultation_id
    ).first()
    if not consult:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    patient = db.query(Patient).filter(Patient.id == consult.patient_id).first()


    # Pull symptoms and AI assessment from triage session if available
    symptoms = "Direct consultation request"
    if consult.session_id:
        from app.models.session import ChatSession
        session = db.query(ChatSession).filter(ChatSession.id == consult.session_id).first()
        if session:
            symptoms = f"RISK: {str(session.risk_score).upper()}\n\n"
            if session.ai_assessment:
                symptoms += session.ai_assessment
            elif session.symptoms_summary:
                symptoms += session.symptoms_summary
            else:
                symptoms += "No AI assessment recorded."

    from app.models.verdict import Verdict
    from app.models.prescription import Prescription
    
    past_verdicts = db.query(Verdict).filter(Verdict.patient_id == patient.id).all()
    diagnoses = list(set([v.diagnosis for v in past_verdicts if v.diagnosis]))
    conditions_str = ", ".join(diagnoses) if diagnoses else "None on record"
    
    active_prescriptions = db.query(Prescription).filter(
        Prescription.patient_id == patient.id,
        Prescription.is_active == True
    ).all()
    medications = [p.medication_name for p in active_prescriptions]

    return {
        "id":               consult.id,
        "patient_name":     patient.full_name if patient else "Unknown",
        "patient_phone":    patient.phone_number if patient else "—",
        "fee_amount":       consult.fee_amount,
        "payment_status":   consult.payment_status,
        "status":           consult.status,
        "clash_detected":   False,
        "clash_details":    "",
        "current_medications": medications,
        "allergies":        "None on record",
        "conditions":       conditions_str,
        "symptoms_summary": symptoms,
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
