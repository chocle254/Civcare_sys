from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel
from app.database import get_db
from app.models.prescription import Prescription, Reminder
from app.services.africastalking import send_medication_reminder

router = APIRouter()

DOSAGE_MAP = {
    "1x1": {"times": 1, "interval_hours": 24},
    "1x2": {"times": 2, "interval_hours": 12},
    "1x3": {"times": 3, "interval_hours": 8},
    "2x2": {"times": 2, "interval_hours": 12},
    "2x3": {"times": 3, "interval_hours": 8},
    "1x4": {"times": 4, "interval_hours": 6},
}


class ReminderSetup(BaseModel):
    prescription_id: str
    dosage_notation: str   # e.g "1x3", "2x2"
    first_dose_time: str   # e.g "14:00"
    patient_id:      str


class ReminderResponse(BaseModel):
    reminder_id: str
    response:    str   # taken / skip
    skip_reason: str | None = None


@router.get("/my-meds")
async def my_medications(patient_id: str, db: Session = Depends(get_db)):
    """Returns all active prescriptions for a patient."""
    prescriptions = db.query(Prescription).filter(
        Prescription.patient_id == patient_id,
        Prescription.is_active  == True,
    ).all()

    return [
        {
            "id":                    p.id,
            "medication_name":       p.medication_name,
            "doctor_name":           None,
            "dosage_notation":       p.dosage_notation,
            "first_dose_time":       p.first_dose_time,
            "reminder_interval_hours": p.reminder_interval_hours,
            "reminders_active":      p.reminders_active,
            "notes":                 p.notes,
        }
        for p in prescriptions
    ]


@router.post("/set")
async def set_reminders(data: ReminderSetup, db: Session = Depends(get_db)):
    """
    Patient sets up their dosage schedule from pharmacy guidance.
    System calculates full reminder schedule and creates reminder records.
    """
    prescription = db.query(Prescription).filter(
        Prescription.id         == data.prescription_id,
        Prescription.patient_id == data.patient_id,
    ).first()

    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found.")

    dosage = DOSAGE_MAP.get(data.dosage_notation)
    if not dosage:
        raise HTTPException(status_code=400, detail="Invalid dosage notation.")

    interval_hours = dosage["interval_hours"]

    # Parse first dose time
    hour, minute = map(int, data.first_dose_time.split(":"))
    now          = datetime.utcnow()
    first_dose   = now.replace(hour=hour, minute=minute, second=0, microsecond=0)

    # If first dose time has already passed today, start tomorrow
    if first_dose < now:
        first_dose += timedelta(days=1)

    # Create reminder records for next 7 days (adjust if duration known)
    reminders_created = 0
    current_time      = first_dose
    end_time          = first_dose + timedelta(days=7)

    while current_time <= end_time:
        reminder = Reminder(
            prescription_id=data.prescription_id,
            scheduled_at=current_time,
        )
        db.add(reminder)
        current_time += timedelta(hours=interval_hours)
        reminders_created += 1

    # Update prescription
    prescription.dosage_notation         = data.dosage_notation
    prescription.first_dose_time         = data.first_dose_time
    prescription.reminder_interval_hours = interval_hours
    prescription.reminders_active        = True
    prescription.reminders_start_at      = first_dose
    prescription.reminders_end_at        = end_time

    db.commit()

    return {
        "message":           f"Reminders set every {interval_hours} hours.",
        "reminders_created": reminders_created,
        "first_reminder":    first_dose,
        "interval_hours":    interval_hours,
    }


@router.post("/respond")
async def respond_to_reminder(data: ReminderResponse, db: Session = Depends(get_db)):
    """
    Patient replies TAKEN or SKIP to a reminder SMS or in-app notification.
    """
    reminder = db.query(Reminder).filter(Reminder.id == data.reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found.")

    reminder.response     = data.response
    reminder.skip_reason  = data.skip_reason
    reminder.responded_at = datetime.utcnow()
    reminder.is_responded = True

    db.commit()

    if data.response == "taken":
        return {"message": "Great! Dose marked as taken. Keep it up."}

    if data.response == "skip" and data.skip_reason == "no_meds":
        return {"message": "Please visit a pharmacy to refill your prescription."}

    if data.response == "skip" and data.skip_reason == "side_effects":
        return {"message": "Please describe your side effects in the chat so we can help."}

    return {"message": "Response recorded."}
