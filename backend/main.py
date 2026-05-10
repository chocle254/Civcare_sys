from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import create_tables, SessionLocal
from app.config import settings
from app.models.appointment import Appointment, AppointmentStatus
from app.models.patient import Patient
from app.websocket.queue import connect, disconnect, broadcast_queue_update
from app.services.scheduler import start_scheduler
import json

# ── ROUTERS ──
from app.routers import (
    auth, triage, hospitals, doctors,
    records, medscan, consultation,
    payment, reminders, verdict,
    ussd, sms
)

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered healthcare platform for Africa",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── PREFLIGHT HANDLER ──
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str, request: Request):
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )

# ── STARTUP ──
@app.on_event("startup")
async def startup():
    create_tables()
    start_scheduler()
    print(f"✅ {settings.APP_NAME} started")
    print(f"📦 Database connected")
    print(f"🌐 Docs at /docs")


# ── HEALTH CHECK ──
@app.get("/")
async def root():
    return {"status": "CivTech Care System is running 🚀"}

@app.get("/health")
async def health():
    return {"status": "healthy"}


# ── LIVE QUEUE WebSocket ──
@app.websocket("/ws/queue/{hospital_id}")
async def websocket_queue(websocket: WebSocket, hospital_id: str):
    """
    Doctors connect here to receive live queue updates.
    When a patient confirms arrival, all connected doctors at that hospital
    receive the updated queue instantly — no page refresh needed.
    """
    await connect(websocket, hospital_id)
    try:
        while True:
            # Keep connection alive — actual updates pushed via broadcast_queue_update()
            await websocket.receive_text()
    except WebSocketDisconnect:
        disconnect(websocket, hospital_id)


# ── QUEUE ENDPOINT (initial load + broadcast helper) ──
@app.get("/triage/queue")
async def get_queue(hospital_id: str, doctor_id: str):
    """
    Returns current patient queue for a doctor's dashboard.
    Also used internally after each arrival to broadcast updates.
    """
    db = SessionLocal()
    try:
        appointments = db.query(Appointment).filter(
            Appointment.hospital_id == hospital_id,
            Appointment.doctor_id   == doctor_id,
            Appointment.status.in_([
                AppointmentStatus.ARRIVED,
                AppointmentStatus.CALLED,
                AppointmentStatus.IN_PROGRESS,
            ])
        ).all()

        queue_data = []
        for appt in appointments:
            patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
            queue_data.append({
                "id":              appt.id,
                "patient_name":    patient.full_name if patient else "Unknown",
                "patient_phone":   patient.phone_number if patient else "—",
                "risk_score":      appt.risk_score or "moderate",
                "risk_numeric":    appt.risk_numeric or "50",
                "symptoms_summary":appt.symptoms_summary or "—",
                "status":          appt.status,
                "arrived_at":      appt.arrived_at.isoformat() if appt.arrived_at else None,
            })

        # Also broadcast to all connected doctors at this hospital
        await broadcast_queue_update(hospital_id, queue_data)

        return queue_data
    finally:
        db.close()


# ── APPOINTMENT PROFILE ENDPOINT ──
@app.get("/triage/appointment/{appointment_id}")
async def get_appointment(appointment_id: str, doctor_id: str):
    """Full patient profile for doctor view."""
    db = SessionLocal()
    try:
        appt = db.query(Appointment).filter(
            Appointment.id        == appointment_id,
            Appointment.doctor_id == doctor_id,
        ).first()

        if not appt:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Appointment not found.")

        patient  = db.query(Patient).filter(Patient.id == appt.patient_id).first()

        # Load conversation from session
        from app.models.session import ChatSession
        session  = db.query(ChatSession).filter(
            ChatSession.id == appt.session_id
        ).first() if appt.session_id else None

        messages = json.loads(session.messages or "[]") if session else []

        return {
            "appointment_id":    appt.id,
            "patient_name":      patient.full_name if patient else "Unknown",
            "patient_phone":     patient.phone_number if patient else "—",
            "patient_age":       patient.age if patient else "—",
            "patient_location":  patient.location if patient else "—",
            "identity_type":     patient.identity_type if patient else "—",
            "identity_number":   patient.identity_number if patient else "—",
            "risk_score":        appt.risk_score or "moderate",
            "risk_numeric":      appt.risk_numeric or "50",
            "ai_assessment":     session.ai_assessment if session else "",
            "ai_confidence":     session.ai_confidence if session else "—",
            "conversation":      messages,
            "conditions":        "None on record",
            "allergies":         "None on record",
            "current_medications": [],
            "symptoms_summary":  appt.symptoms_summary or "—",
        }
    finally:
        db.close()


# ── REGISTER ROUTERS ──
app.include_router(auth.router,          prefix="/auth",         tags=["Authentication"])
app.include_router(triage.router,        prefix="/triage",       tags=["Triage"])
app.include_router(hospitals.router,     prefix="/hospitals",    tags=["Hospitals"])
app.include_router(doctors.router,       prefix="/doctors",      tags=["Doctors"])
app.include_router(records.router,       prefix="/records",      tags=["Records"])
app.include_router(medscan.router,       prefix="/medscan",      tags=["MedScan"])
app.include_router(consultation.router,  prefix="/consultation", tags=["Consultation"])
app.include_router(payment.router,       prefix="/payment",      tags=["Payment"])
app.include_router(reminders.router,     prefix="/reminders",    tags=["Reminders"])
app.include_router(verdict.router,       prefix="/verdict",      tags=["Verdict"])
app.include_router(ussd.router,          prefix="/ussd",         tags=["USSD"])
app.include_router(sms.router,           prefix="/sms",          tags=["SMS"])
