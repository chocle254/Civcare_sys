from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.models.verdict import Verdict
from app.models.appointment import Appointment, AppointmentStatus
from app.models.prescription import Prescription
from app.models.doctor import Doctor, DoctorStatus
from app.services.rlhf import submit_ai_rating

router = APIRouter()


class PrescriptionItem(BaseModel):
    medication_name: str
    notes:           str | None = None


class VerdictSubmit(BaseModel):
    doctor_id:        str
    patient_id:       str
    appointment_id:   str
    diagnosis:        str
    severity:         str
    notes:            str | None = None
    prescriptions:    list[PrescriptionItem]
    ai_accuracy_rating: int       # 1 to 5
    ai_rating_comment:  str | None = None


# ── DOCTOR SUBMITS VERDICT ──
@router.post("/submit")
async def submit_verdict(data: VerdictSubmit, db: Session = Depends(get_db)):
    """
    Doctor submits their diagnosis and prescriptions.
    - Prescriptions saved to patient profile (feeds MedScan)
    - AI rating sent to retraining pipeline (RLHF)
    - Doctor status switches back to Available automatically
    - Appointment marked as complete
    """

    # Save verdict
    verdict = Verdict(
        doctor_id=data.doctor_id,
        patient_id=data.patient_id,
        appointment_id=data.appointment_id,
        diagnosis=data.diagnosis,
        severity_confirmed=data.severity,
        notes=data.notes,
        ai_accuracy_rating=data.ai_accuracy_rating,
        ai_rating_comment=data.ai_rating_comment,
        rating_submitted="true",
        submitted_at=datetime.utcnow(),
    )
    db.add(verdict)
    db.flush()

    # Save prescriptions (doctor writes medication name only)
    # Patient will input dosage from pharmacy guidance later
    for rx in data.prescriptions:
        prescription = Prescription(
            patient_id=data.patient_id,
            doctor_id=data.doctor_id,
            verdict_id=verdict.id,
            medication_name=rx.medication_name,
            notes=rx.notes,
            is_active=True,
        )
        db.add(prescription)

    # Mark appointment complete
    appointment = db.query(Appointment).filter(
        Appointment.id == data.appointment_id
    ).first()
    if appointment:
        appointment.status       = AppointmentStatus.COMPLETED
        appointment.completed_at = datetime.utcnow()

    # Doctor status back to available
    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    if doctor:
        doctor.status = DoctorStatus.AVAILABLE

    db.commit()

    # Send AI rating to retraining pipeline
    await submit_ai_rating(
        rating=data.ai_accuracy_rating,
        comment=data.ai_rating_comment or "",
        diagnosis=data.diagnosis,
        appointment_id=data.appointment_id,
    )

    return {
        "message":    "Verdict submitted successfully.",
        "verdict_id": verdict.id,
    }
