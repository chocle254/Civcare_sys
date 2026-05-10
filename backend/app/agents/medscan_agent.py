from app.services.ai_client import ask_gemini


async def run_medscan_agent(
    medication_name: str,
    patient_message: str,
    current_medications: list,
) -> dict:
    """
    Checks a medication for:
    1. Drug-drug interactions with current medications
    2. Appropriateness for reported symptoms
    3. Known counterfeit patterns in East Africa

    Returns a structured result the orchestrator uses to decide routing.
    The patient never knows a separate agent ran — it feels like one conversation.
    """

    current_meds_str = (
        ", ".join(current_medications)
        if current_medications
        else "None on record"
    )

    prompt = f"""
You are a clinical pharmacology AI assistant for a Kenyan healthcare platform.

A patient mentioned they have {medication_name} available and may want to take it.

Patient's current medications: {current_meds_str}
Patient's message: "{patient_message}"

Check the following and respond ONLY in this exact JSON format with no extra text:
{{
    "medication_name": "{medication_name}",
    "medication_identified": true | false,
    "what_it_treats": "<plain language explanation>",
    "clash_detected": true | false,
    "clash_severity": "none" | "moderate" | "severe",
    "clash_details": "<what drugs clash and why, or empty string>",
    "appropriate_for_symptoms": true | false | "unknown",
    "counterfeit_risk": "low" | "moderate" | "high",
    "counterfeit_notes": "<any known fake versions in East Africa, or empty string>",
    "safe_to_continue": true | false,
    "recommendation": "<one clear sentence on what the patient should do>"
}}
"""

    response = await ask_gemini(prompt)

    try:
        import json
        clean = response.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
    except Exception:
        return {
            "medication_name":        medication_name,
            "medication_identified":  False,
            "what_it_treats":         "Unknown",
            "clash_detected":         False,
            "clash_severity":         "none",
            "clash_details":          "",
            "appropriate_for_symptoms": "unknown",
            "counterfeit_risk":       "low",
            "counterfeit_notes":      "",
            "safe_to_continue":       False,
            "recommendation":         "Please speak to a doctor before taking this medication.",
        }
