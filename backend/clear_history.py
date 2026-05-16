from app.database import SessionLocal
from app.models.appointment import Appointment
from app.models.session import ChatSession
from app.models.verdict import Verdict
from app.models.prescription import Prescription, Reminder
from app.models.rlhf import AIFeedback
from app.models.consultation import Consultation, RecordAccess

db = SessionLocal()
try:
    print("Clearing all transactional history...")
    
    # Delete child records first to satisfy foreign key constraints
    deleted_reminders = db.query(Reminder).delete()
    deleted_prescriptions = db.query(Prescription).delete()
    deleted_feedback = db.query(AIFeedback).delete()
    deleted_verdicts = db.query(Verdict).delete()
    deleted_consultations = db.query(Consultation).delete()
    deleted_access = db.query(RecordAccess).delete()
    deleted_appointments = db.query(Appointment).delete()
    deleted_sessions = db.query(ChatSession).delete()
    
    db.commit()
    
    print("History cleared successfully:")
    print(f"   - {deleted_sessions} Chat Sessions")
    print(f"   - {deleted_appointments} Appointments")
    print(f"   - {deleted_consultations} Consultations")
    print(f"   - {deleted_verdicts} Verdicts")
    print(f"   - {deleted_feedback} AI Feedback entries")
    print(f"   - {deleted_prescriptions} Prescriptions")
    print(f"   - {deleted_reminders} Reminders")
    print(f"   - {deleted_access} Record Access Logs")
    
except Exception as e:
    db.rollback()
    print(f"Error clearing history: {e}")
finally:
    db.close()
