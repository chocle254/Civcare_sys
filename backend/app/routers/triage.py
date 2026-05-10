from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.models.session import ChatSession, SessionStatus, SessionType
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import Doctor, DoctorStatus
from app.models.patient import Patient
from app.agents.orchestrator import process_message
from app.services.africastalking import send_doctor_call_notification
import json
import pytz

router = APIRouter()

NAIROBI_TZ = pytz.timezone("Africa/Nairobi")


class MessageInput(BaseModel):
    patient_id:       str
    session_id:       str | None = None
    message:          str
    patient_lat:      float | None = None
    patient_lon:      float | None = None


class ArrivalConfirm(BaseModel):
    appointment_id: str
    patient_id:     str


class CallPatient(BaseModel):
    appointment_id: str
    doctor_id:      str


# ── START OR CONTINUE CONVERSATION ──
@router.post("/message")
async def send_message(data: MessageInput, db: Session = Depends(get_db)):
    """
    Main endpoint for the AI conversation.
    Creates a session if new, continues if existing.
    Returns AI response + any routing actions.
    Frontend shows 3-dot loading state while this is processing.
    """
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # ── Get or create session ──
    session = None
    if data.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == data.session_id).first()

    if not session:
        session = ChatSession(
            patient_id=data.patient_id,
            session_type=SessionType.TRIAGE,
            status=SessionStatus.ACTIVE,
            messages=json.dumps([]),
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # ── Load conversation history ──
    messages = json.loads(session.messages or "[]")

    # ── Build patient data for agents ──
    patient_data = {
        "age":                 patient.age or "Unknown",
        "conditions":          "None on record",  # Will come from encrypted records in full build
        "current_medications": [],
        "allergies":           "None on record",
    }

    # ── Get current Nairobi time ──
    nairobi_time = datetime.now(NAIROBI_TZ).strftime("%I:%M %p")

    # ── Conversation summary from session ──
    conversation_summary = json.loads(session.messages or "[]")
    summary_dict = {}
    for msg in conversation_summary:
        if msg.get("summary"):
            summary_dict = msg["summary"]
            break

    # ── Run orchestrator ──
    result = await process_message(
        patient_message=data.message,
        conversation_history=messages,
        patient_data=patient_data,
        conversation_summary=summary_dict,
        current_time=nairobi_time,
    )

    # ── Save messages ──
    messages.append({"role": "patient",  "content": data.message})
    messages.append({"role": "ai",       "content": result["response"]})
    session.messages = json.dumps(messages)

    # ── Save triage score if generated ──
    if result.get("triage_score"):
        session.risk_score = result["triage_score"]

    # ── Save MedScan result if triggered ──
    if result.get("medscan_result"):
        med_result = result["medscan_result"]
        session.medication_checked = med_result.get("medication_name")
        session.clash_detected     = med_result.get("clash_detected", False)
        session.clash_details      = med_result.get("clash_details", "")

    db.commit()

    return {
        "session_id":     session.id,
        "response":       result["response"],
        "action":         result["action"],
        "medscan_result": result.get("medscan_result"),
        "triage_score":   result.get("triage_score"),
    }


# ── PATIENT CONFIRMS HOSPITAL ARRIVAL ──
@router.post("/confirm-arrival")
async def confirm_arrival(data: ArrivalConfirm, db: Session = Depends(get_db)):
    """
    Patient clicks 'I have arrived' in the app.
    This triggers the live queue update on the doctor's dashboard.
    """
    appointment = db.query(Appointment).filter(
        Appointment.id == data.appointment_id,
        Appointment.patient_id == data.patient_id,
    ).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    appointment.status     = AppointmentStatus.ARRIVED
    appointment.arrived_at = datetime.utcnow()
    db.commit()

    return {"message": "Arrival confirmed. The doctor will call you shortly."}


# ── DOCTOR CALLS PATIENT ──
@router.post("/call-patient")
async def call_patient(data: CallPatient, db: Session = Depends(get_db)):
    """
    Doctor clicks the Call button on their dashboard.
    Sends SMS notification to patient and marks doctor as busy.
    Patient just gets called to the office — no complexity shown.
    """
    appointment = db.query(Appointment).filter(
        Appointment.id == data.appointment_id
    ).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    patient = db.query(Patient).filter(Patient.id == appointment.patient_id).first()

    # Update appointment status
    appointment.status   = AppointmentStatus.CALLED
    appointment.called_at = datetime.utcnow()

    # Doctor is now busy
    doctor.status = DoctorStatus.WITH_PATIENT
    db.commit()

    # Notify patient via SMS
    await send_doctor_call_notification(patient.phone_number, doctor.full_name)

    return {"message": f"Patient {patient.full_name} has been notified."}
