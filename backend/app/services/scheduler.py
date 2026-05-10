from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.prescription import Reminder, Prescription
from app.models.consultation import Consultation, PaymentStatus, ConsultationStatus
from app.models.doctor import Doctor, DoctorStatus
from app.models.consultation import RecordAccess
from app.services.africastalking import send_medication_reminder, send_sms

scheduler = AsyncIOScheduler()


async def send_due_reminders():
    """
    Runs every minute.
    Checks for medication reminders that are due and sends them via SMS.
    """
    db: Session = SessionLocal()
    try:
        now  = datetime.utcnow()
        window_start = now - timedelta(minutes=1)

        due_reminders = db.query(Reminder).filter(
            Reminder.scheduled_at >= window_start,
            Reminder.scheduled_at <= now,
            Reminder.is_sent      == False,
        ).all()

        for reminder in due_reminders:
            prescription = db.query(Prescription).filter(
                Prescription.id == reminder.prescription_id
            ).first()

            if not prescription or not prescription.is_active:
                continue

            from app.models.patient import Patient
            patient = db.query(Patient).filter(
                Patient.id == prescription.patient_id
            ).first()

            if not patient:
                continue

            # Send SMS reminder
            sent = await send_medication_reminder(
                phone_number=patient.phone_number,
                medication=prescription.medication_name,
                dosage=prescription.dosage_notation or "",
            )

            if sent:
                reminder.is_sent = True
                reminder.sent_at = now
                db.commit()
                print(f"Reminder sent to {patient.phone_number} for {prescription.medication_name}")

    except Exception as e:
        print(f"Reminder scheduler error: {e}")
    finally:
        db.close()


async def auto_release_payments():
    """
    Runs every 5 minutes.
    Releases consultation payments that have been in escrow
    for more than 30 minutes and neither party marked complete.
    Protects the doctor if the patient forgets to rate.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()

        overdue = db.query(Consultation).filter(
            Consultation.payment_status  == PaymentStatus.PAID,
            Consultation.auto_release_at <= now,
            Consultation.auto_released   == False,
        ).all()

        for consult in overdue:
            consult.payment_status  = PaymentStatus.RELEASED
            consult.auto_released   = True
            consult.released_at     = now
            consult.status          = ConsultationStatus.COMPLETED
            consult.completed_at    = now

            # Doctor back to available
            doctor = db.query(Doctor).filter(Doctor.id == consult.doctor_id).first()
            if doctor and doctor.status == DoctorStatus.WITH_PATIENT:
                doctor.status = DoctorStatus.AVAILABLE

            db.commit()
            print(f"Auto-released payment for consultation {consult.id}")

    except Exception as e:
        print(f"Payment auto-release error: {e}")
    finally:
        db.close()


async def expire_record_keys():
    """
    Runs every 10 minutes.
    Marks expired doctor record access keys as expired.
    Keys expire 24 hours after being issued.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()

        expired = db.query(RecordAccess).filter(
            RecordAccess.expires_at  <= now,
            RecordAccess.is_expired  == False,
        ).all()

        for access in expired:
            access.is_expired = True

        if expired:
            db.commit()
            print(f"Expired {len(expired)} record access key(s)")

    except Exception as e:
        print(f"Record key expiry error: {e}")
    finally:
        db.close()


async def check_doctor_inactivity():
    """
    Runs every 5 minutes.
    If a doctor has not pinged in more than 15 minutes,
    marks them as offline and redirects their patients.
    """
    db: Session = SessionLocal()
    try:
        now      = datetime.utcnow()
        cutoff   = now - timedelta(minutes=15)

        inactive = db.query(Doctor).filter(
            Doctor.status.in_([DoctorStatus.AVAILABLE, DoctorStatus.WITH_PATIENT]),
            Doctor.last_active_at <= cutoff,
            Doctor.is_active      == True,
        ).all()

        for doctor in inactive:
            print(f"Doctor {doctor.full_name} marked offline due to inactivity")
            doctor.status = DoctorStatus.OFFLINE

            # Notify doctor via SMS
            await send_sms(
                doctor.phone_number,
                "CivTech: You have been marked offline due to inactivity. "
                "Please log back in to receive patients."
            )

        if inactive:
            db.commit()

    except Exception as e:
        print(f"Inactivity check error: {e}")
    finally:
        db.close()


def start_scheduler():
    """
    Starts all background jobs.
    Called once on app startup in main.py
    """
    scheduler.add_job(
        send_due_reminders,
        trigger=IntervalTrigger(minutes=1),
        id="medication_reminders",
        replace_existing=True,
    )
    scheduler.add_job(
        auto_release_payments,
        trigger=IntervalTrigger(minutes=5),
        id="payment_auto_release",
        replace_existing=True,
    )
    scheduler.add_job(
        expire_record_keys,
        trigger=IntervalTrigger(minutes=10),
        id="record_key_expiry",
        replace_existing=True,
    )
    scheduler.add_job(
        check_doctor_inactivity,
        trigger=IntervalTrigger(minutes=5),
        id="doctor_inactivity",
        replace_existing=True,
    )

    scheduler.start()
    print("✅ Background scheduler started")
    print("   → Medication reminders: every 1 min")
    print("   → Payment auto-release: every 5 min")
    print("   → Record key expiry:    every 10 min")
    print("   → Doctor inactivity:    every 5 min")
