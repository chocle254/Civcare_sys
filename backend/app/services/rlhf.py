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

    For the prototype: logs the rating.
    For production: send to a fine-tuning dataset stored in Supabase,
    then periodically retrain or adjust the Gemini system prompt
    based on patterns in doctor corrections.
    """
    print(f"""
    ── AI Rating Received ──
    Appointment:  {appointment_id}
    Rating:       {rating}/5
    Diagnosis:    {diagnosis}
    Comment:      {comment}
    """)

    # TODO Production: Save to a `ai_training_feedback` table in Supabase
    # Structure: appointment_id, rating, ai_assessment, actual_diagnosis, comment, created_at
    # This dataset is reviewed periodically to improve the triage prompt
