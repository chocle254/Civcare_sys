from app.database import SessionLocal
from app.models.rlhf import AIFeedback
from app.models.appointment import Appointment

async def submit_ai_rating(
    rating: int,
    comment: str,
    diagnosis: str,
    appointment_id: str,
):
    """
    Submits doctor's AI accuracy rating to the retraining pipeline.
    This is Reinforcement Learning from Human Feedback (RLHF) —
    the same technique used to train ChatGPT.
    """
    print(f"""
    ── AI Rating Received ──
    Appointment:  {appointment_id}
    Rating:       {rating}/5
    Diagnosis:    {diagnosis}
    Comment:      {comment}
    """)

    db = SessionLocal()
    try:
        # Fetch original AI assessment if possible
        ai_assessment = "Unknown"
        if appointment_id:
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            if appointment and appointment.symptoms_summary:
                ai_assessment = appointment.symptoms_summary
        
        feedback = AIFeedback(
            appointment_id=appointment_id,
            rating=rating,
            ai_assessment=ai_assessment,
            actual_diagnosis=diagnosis,
            comment=comment,
        )
        db.add(feedback)
        db.commit()
    except Exception as e:
        print(f"Error saving AI feedback: {e}")
    finally:
        db.close()
