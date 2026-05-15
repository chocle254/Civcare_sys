from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.models.session import ChatSession, SessionStatus, SessionType
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import Doctor, DoctorStatus
from app.models.patient import Patient
from app.models.prescription import Prescription
from app.models.verdict import Verdict
from app.agents.orchestrator import process_message
from app.services.africastalking import send_doctor_call_notification
from app.routers.hospitals import get_nearby_hospitals
import json
import pytz

router = APIRouter()

NAIROBI_TZ = pytz.timezone("Africa/Nairobi")


class MessageInput(BaseModel):
    patient_id:  str
    session_id:  str | None = None
    message:     str
    patient_lat: float | None = None
    patient_lon: float | None = None
    mode:        str | None = None


class ArrivalConfirm(BaseModel):
    session_id:  str
    hospital_id: str
    patient_id:  str


class CallPatient(BaseModel):
    appointment_id: str
    doctor_id:      str


class SelectHospital(BaseModel):
    session_id:    str
    patient_id:    str
    hospital_id:   str
    hospital_name: str
    hospital_lat:  float | None = None
    hospital_lon:  float | None = None
    distance_km:   float | None = None





# ── START OR CONTINUE CONVERSATION ──
@router.post("/message")
async def send_message(data: MessageInput, db: Session = Depends(get_db)):
    """
    Main endpoint for the AI conversation.
    Creates a session if new, continues if existing.
    Returns AI response + any routing actions.
    When action is route_hospital, fetches nearby hospitals from OpenStreetMap.
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

    # ── Fetch active prescriptions ──
    active_prescriptions = db.query(Prescription).filter(
        Prescription.patient_id == patient.id,
        Prescription.is_active == True
    ).all()
    medications = [p.medication_name for p in active_prescriptions]

    # ── Fetch previous conditions ──
    past_verdicts = db.query(Verdict).filter(
        Verdict.patient_id == patient.id
    ).all()
    diagnoses = list(set([v.diagnosis for v in past_verdicts if v.diagnosis]))
    conditions_str = ", ".join(diagnoses) if diagnoses else "None on record"

    # ── Build patient data for agents ──
    patient_data = {
        "age":                 patient.age or "Unknown",
        "location":            patient.location or "Unknown",
        "conditions":          conditions_str,
        "current_medications": medications,
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
        mode=data.mode,
    )

    # ── Save messages ──
    messages.append({"role": "patient", "content": data.message})
    messages.append({"role": "ai",      "content": result["response"]})
    
    # Save the action card to history if it's a routing action
    if result["action"] == "route_hospital":
        messages.append({"role": "action", "content": "route_hospital_card"})
    elif result["action"] == "route_consultation":
        messages.append({"role": "action", "content": "consultation"})
        
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

    # ── Fetch nearby hospitals from OpenStreetMap if routing to hospital ──
    nearby_hospitals = []
    if result["action"] == "route_hospital" and data.patient_lat and data.patient_lon:
        try:
            nearby_hospitals = await get_nearby_hospitals(
                lat=data.patient_lat,
                lon=data.patient_lon,
            )
        except Exception as e:
            print(f"Hospital fetch error: {e}")
            nearby_hospitals = []

    return {
        "session_id":     session.id,
        "response":       result["response"],
        "action":         result["action"],
        "medscan_result": result.get("medscan_result"),
        "triage_score":   result.get("triage_score"),
        "hospitals":      nearby_hospitals,  # Empty list if no routing or no coords
    }


# ── PATIENT SELECTS A HOSPITAL ──
@router.post("/select-hospital")
async def select_hospital(data: SelectHospital, db: Session = Depends(get_db)):
    """
    Called when patient taps a hospital card in the chat.
    Records the chosen hospital against the session for the doctor's dashboard.
    """
    session = db.query(ChatSession).filter(ChatSession.id == data.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    # Save hospital choice to session as JSON
    session.chosen_hospital = json.dumps({
        "id":           data.hospital_id,
        "name":         data.hospital_name,
        "lat":          data.hospital_lat,
        "lon":          data.hospital_lon,
        "distance_km":  data.distance_km,
    })
    db.commit()

    return {"message": "Hospital recorded.", "hospital_name": data.hospital_name}





# ── PATIENT CONFIRMS HOSPITAL ARRIVAL ──
@router.post("/confirm-arrival")
async def confirm_arrival(data: ArrivalConfirm, db: Session = Depends(get_db)):
    """
    Patient clicks 'I have arrived' in the app.
    This creates the appointment, finds an available doctor, and sets status to ARRIVED.
    This triggers the live queue update on the doctor's dashboard.
    """
    # Pull triage data from the session to attach to the appointment
    session = db.query(ChatSession).filter(ChatSession.id == data.session_id).first()

    risk_score   = None
    risk_numeric = None
    symptoms_summary = None

    if session:
        risk_score       = getattr(session, "risk_score", None)
        symptoms_summary = session.ai_assessment if hasattr(session, "ai_assessment") else None

    # Find an available doctor at this hospital
    # ── KNH TESTING OVERRIDE: always route to Dr. Waweru Jackson ──
    doctor = None
    if data.hospital_id == "knh-nairobi-testing" or "knh" in data.hospital_id.lower():
        doctor = db.query(Doctor).filter(
            Doctor.full_name.ilike("%waweru%")
        ).first()

    # Fallback: find any available doctor at the hospital
    if not doctor:
        doctor = db.query(Doctor).filter(
            Doctor.hospital_id == data.hospital_id,
            Doctor.status      == DoctorStatus.AVAILABLE,
            Doctor.is_active   == True,
        ).first()

    # Use the doctor's DB hospital_id if available to avoid foreign key errors with OSM IDs
    actual_hospital_id = doctor.hospital_id if doctor else data.hospital_id

    appointment = Appointment(
        patient_id       = data.patient_id,
        hospital_id      = actual_hospital_id,
        session_id       = data.session_id,
        doctor_id        = doctor.id if doctor else None,
        status           = AppointmentStatus.ARRIVED,
        risk_score       = risk_score,
        risk_numeric     = risk_numeric,
        symptoms_summary = symptoms_summary,
        arrived_at       = datetime.utcnow()
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return {
        "message": "Arrival confirmed. The doctor will call you shortly.",
        "appointment_id": appointment.id,
        "doctor_assigned": doctor.full_name if doctor else None
    }


# ── DOCTOR CALLS PATIENT ──
@router.post("/call-patient")
async def call_patient(data: CallPatient, db: Session = Depends(get_db)):
    """
    Doctor clicks the Call button on their dashboard.
    Sends SMS notification to patient and marks doctor as busy.
    """
    appointment = db.query(Appointment).filter(
        Appointment.id == data.appointment_id
    ).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    doctor  = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    patient = db.query(Patient).filter(Patient.id == appointment.patient_id).first()

    appointment.status    = AppointmentStatus.CALLED
    appointment.called_at = datetime.utcnow()
    doctor.status         = DoctorStatus.WITH_PATIENT
    db.commit()

    await send_doctor_call_notification(patient.phone_number, doctor.full_name)

    return {"message": f"Patient {patient.full_name} has been notified."}


@router.get("/sessions/{patient_id}")
async def get_patient_sessions(patient_id: str, db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).filter(
        ChatSession.patient_id == patient_id
    ).order_by(ChatSession.started_at.desc()).all()
    
    result = []
    for s in sessions:
        # Extract first symptom from conversation history
        title = "Health Consultation"
        try:
            messages = json.loads(s.messages or "[]")
            for msg in messages:
                if msg.get("role") == "patient":
                    title = msg.get("content", "")[:50]
                    if len(msg.get("content", "")) > 50:
                        title += "..."
                    break
        except:
            pass
            
        result.append({
            "id": s.id,
            "status": s.status.value if hasattr(s.status, "value") else s.status,
            "risk_score": s.risk_score,
            "ai_assessment": s.ai_assessment,
            "symptoms_summary": title,
            "started_at": s.started_at.isoformat() if s.started_at else None
        })
    return result

@router.get("/session/{session_id}")
async def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    assessment = None
    if session.ai_assessment:
        try:
            assessment = json.loads(session.ai_assessment)
        except:
            assessment = session.ai_assessment
            
    return {
        "id": session.id,
        "risk_score": session.risk_score,
        "assessment": assessment
    }
