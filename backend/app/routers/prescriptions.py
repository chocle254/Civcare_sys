from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.prescription import Prescription
from app.models.patient import Patient

router = APIRouter()

@router.get("/active/{patient_id}")
async def get_active_prescriptions(patient_id: str, db: Session = Depends(get_db)):
    """Fetch active prescriptions for a patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    active_prescriptions = db.query(Prescription).filter(
        Prescription.patient_id == patient_id,
        Prescription.is_active == True
    ).all()

    result = []
    for p in active_prescriptions:
        result.append({
            "id": p.id,
            "medication_name": p.medication_name,
            "dosage_notation": p.dosage_notation,
            "duration_days": p.duration_days,
            "reminders_start_at": p.reminders_start_at.isoformat() if p.reminders_start_at else None,
        })
    return result
