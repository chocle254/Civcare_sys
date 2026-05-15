from app.services.ai_client import ask_gemini


async def run_triage_agent(
    conversation_summary: dict,
    patient_data: dict,
) -> dict:
    """
    Generates a triage risk score from the conversation summary and patient history.
    This runs silently — the patient never sees the output.
    The doctor always sees it on their dashboard.
    """

    prompt = f"""
You are an expert clinical triage AI assistant. Your role is to assess patient risk utilizing validated clinical scoring logic (such as NEWS2, HEART score, Wells score concepts) where applicable, heavily weighting the interplay between reported symptoms and patient medical history.

PATIENT INFORMATION:
- Age: {patient_data.get('age', 'Unknown')}
- Known conditions: {patient_data.get('conditions', 'None recorded')}
- Current medications: {patient_data.get('current_medications', 'None recorded')}
- Known allergies: {patient_data.get('allergies', 'None recorded')}

REPORTED SYMPTOMS:
- Main symptom: {conversation_summary.get('symptom', 'Not specified')}
- Duration: {conversation_summary.get('duration', 'Not specified')}
- Severity (1-10): {conversation_summary.get('severity', 'Not specified')}
- Character: {conversation_summary.get('character', 'Not specified')}
- Associated symptoms: {conversation_summary.get('associated', 'None reported')}
- Fever/Temperature mentioned: {conversation_summary.get('fever', False)}
- Vital signs mentioned: {conversation_summary.get('vital_signs', 'None')}
- Recent food/activity: {conversation_summary.get('recent_activity', 'Not specified')}
- Pregnancy Status: {conversation_summary.get('pregnancy_status', 'Not specified')}

INSTRUCTIONS:
1. Conduct a "Pre-triage Red Flag Scan" (e.g. chest pain + shortness of breath, sudden severe headache, confusion).
2. Consider age/gender/pregnancy modifiers (e.g. chest pain in a diabetic is high risk, any pain with bleeding in pregnancy is critical).
3. Assign a numeric risk score on a strict 1-100 rubric:
   - 1-30: Low risk (routine, non-urgent consultation)
   - 31-70: Moderate risk (requires medical attention within 12-24 hrs)
   - 71-100: Critical/High risk (immediate hospital evaluation required)

Respond ONLY in this exact JSON format with no extra text:
{{
    "risk_score": "low" | "moderate" | "critical",
    "risk_numeric": <number 1-100>,
    "preliminary_assessment": "<2 sentence clinical summary explaining the reasoning>",
    "confidence_percent": <number 0-100>,
    "red_flags": ["<flag1>", "<flag2>"],
    "recommended_action": "<what the doctor should prioritise>"
}}
"""

    response = await ask_gemini(prompt)

    try:
        import json
        # Clean response in case Gemini adds markdown
        clean = response.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
    except Exception:
        # Fallback if JSON parsing fails
        return {
            "risk_score":            "moderate",
            "risk_numeric":          50,
            "preliminary_assessment": response,
            "confidence_percent":    60,
            "red_flags":             [],
            "recommended_action":    "Doctor to assess in person",
        }
