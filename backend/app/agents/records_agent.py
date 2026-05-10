from app.services.ai_client import ask_gemini


async def generate_patient_summary(raw_record: dict) -> str:
    """
    Takes raw patient record data and generates a clean
    one-paragraph clinical summary for the doctor.
    Doctor sees this at the top of the patient profile.
    Raw data is never shown directly.
    """

    prompt = f"""
You are a clinical documentation AI. Generate a concise one-paragraph patient summary 
for a doctor who is about to see this patient. Use professional clinical language.
Keep it under 100 words.

PATIENT DATA:
- Name: {raw_record.get('name', 'Unknown')}
- Age: {raw_record.get('age', 'Unknown')}
- Past diagnoses: {raw_record.get('conditions', 'None on record')}
- Current medications: {raw_record.get('medications', 'None on record')}
- Known allergies: {raw_record.get('allergies', 'None on record')}
- Last visit: {raw_record.get('last_visit', 'No previous visits')}
- Current complaint: {raw_record.get('current_complaint', 'See triage report')}

Write only the summary paragraph. No headings, no bullet points.
"""
    return await ask_gemini(prompt)


async def generate_structured_record(doctor_notes: str, patient_id: str) -> dict:
    """
    Takes doctor's free-text notes and structures them into
    clinical fields automatically.
    Used when doctor submits their verdict.
    """

    prompt = f"""
You are a clinical documentation AI. Extract structured data from these doctor notes.

DOCTOR NOTES: "{doctor_notes}"

Respond ONLY in this exact JSON format:
{{
    "diagnosis": "<primary diagnosis>",
    "severity": "mild" | "moderate" | "severe",
    "prescribed_medications": ["<med1>", "<med2>"],
    "follow_up_required": true | false,
    "follow_up_days": <number or null>,
    "referral_needed": true | false,
    "referral_to": "<specialist type or null>",
    "notes": "<any other important clinical notes>"
}}
"""
    response = await ask_gemini(prompt)

    try:
        import json
        clean = response.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
    except Exception:
        return {
            "diagnosis":              doctor_notes,
            "severity":               "moderate",
            "prescribed_medications": [],
            "follow_up_required":     False,
            "follow_up_days":         None,
            "referral_needed":        False,
            "referral_to":            None,
            "notes":                  "",
        }
