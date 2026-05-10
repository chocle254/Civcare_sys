import json
from datetime import datetime
from app.services.ai_client import ask_gemini_with_history
from app.agents.triage_agent  import run_triage_agent
from app.agents.medscan_agent import run_medscan_agent

# ── SYSTEM CONTEXT ──
# The AI's identity and strict rules
SYSTEM_CONTEXT = """
You are CivTech, an AI clinical assistant for a Kenyan healthcare platform.

YOUR STRICT RULES:
1. NEVER tell a patient their symptoms are not serious. You are not a doctor.
2. Ask ONE follow-up question at a time. Never list multiple questions.
3. NEVER recommend a patient takes a specific medication. Only flag dangers.
4. NEVER give a final diagnosis. Only gather information and route to a doctor.
5. Always be calm, clear, and empathetic. Use simple English.
6. When in doubt, always route to a doctor.
7. If a patient mentions a medication, silently check it — do not make a big deal of it.
8. Keep responses short — 2 to 3 sentences maximum.

MINIMUM DATA YOU MUST COLLECT BEFORE ROUTING:
- Symptom description
- Duration (when it started)
- Severity (1 to 10 scale)
- Any other symptoms
- Recent food or activity (if relevant)
- Ability to travel to a hospital

NEVER say things like:
- "That sounds mild"
- "You probably just need rest"
- "It is likely nothing serious"
- "You should be fine"

ALWAYS end every response with either:
- A follow-up question (if still collecting info)
- A routing action (hospital or consultation)
"""


def detect_medication_mention(text: str) -> str | None:
    """
    Checks if the patient mentioned a medication in their message.
    Returns the medication name if found, None otherwise.
    Simple keyword detection — the MedScan agent does the deep check.
    """
    common_meds = [
        "paracetamol", "panadol", "amoxicillin", "ibuprofen", "aspirin",
        "metformin", "omeprazole", "flagyl", "metronidazole", "azithromycin",
        "ciprofloxacin", "doxycycline", "cotrimoxazole", "coartem", "artemether",
        "prednisolone", "hydrocortisone", "insulin", "diclofenac", "tramadol",
    ]
    text_lower = text.lower()
    for med in common_meds:
        if med in text_lower:
            return med
    return None


def count_collected_fields(conversation_summary: dict) -> int:
    """
    Counts how many of the minimum required fields have been collected.
    Orchestrator uses this to decide when to route.
    """
    fields = [
        conversation_summary.get("symptom"),
        conversation_summary.get("duration"),
        conversation_summary.get("severity"),
        conversation_summary.get("can_travel"),
    ]
    return sum(1 for f in fields if f is not None)


async def process_message(
    patient_message: str,
    conversation_history: list,
    patient_data: dict,
    conversation_summary: dict,
    current_time: str,
) -> dict:
    """
    Main orchestrator function.
    Receives patient message + full conversation history.
    Decides which agent to activate and returns AI response.

    Returns:
    {
        "response": str,           # AI reply to show patient
        "action": str,             # "continue" / "route_hospital" / "route_consultation" / "medscan"
        "medscan_result": dict,    # If MedScan was triggered
        "updated_summary": dict,   # Updated conversation summary
        "triage_score": str,       # Set when enough data is collected
    }
    """

    result = {
        "response":        "",
        "action":          "continue",
        "medscan_result":  None,
        "updated_summary": conversation_summary.copy(),
        "triage_score":    None,
    }

    # ── STEP 1: Check if patient mentioned a medication ──
    medication = detect_medication_mention(patient_message)
    if medication:
        medscan_result = await run_medscan_agent(
            medication_name=medication,
            patient_message=patient_message,
            current_medications=patient_data.get("current_medications", []),
        )
        result["medscan_result"] = medscan_result
        result["action"] = "medscan"

        # If dangerous clash — route to consultation immediately
        if medscan_result.get("clash_detected"):
            result["action"] = "route_consultation"
            result["response"] = (
                f"Based on your current medications, I would not recommend taking "
                f"{medication} without speaking to a doctor first. "
                f"There are doctors available right now. Would you like a quick consultation?"
            )
            return result

    # ── STEP 2: Build conversation history for Groq ──
    # Groq uses OpenAI-compatible format: "user" / "assistant"
    groq_history = []
    for msg in conversation_history:
        role = "user" if msg["role"] == "patient" else "assistant"
        groq_history.append({
            "role":    role,
            "content": msg["content"],
        })

    # Add current patient message
    groq_history.append({
        "role":    "user",
        "content": patient_message,
    })

    # ── STEP 3: Get AI response ──
    ai_response = await ask_gemini_with_history(
        messages=groq_history,
        system_context=SYSTEM_CONTEXT,
    )
    result["response"] = ai_response

    # ── STEP 4: Update conversation summary ──
    text_lower = patient_message.lower()

    if not conversation_summary.get("symptom"):
        result["updated_summary"]["symptom"] = patient_message

    if any(w in text_lower for w in ["day", "week", "hour", "yesterday", "morning", "started"]):
        result["updated_summary"]["duration"] = patient_message

    for num in ["1","2","3","4","5","6","7","8","9","10"]:
        if num in patient_message:
            result["updated_summary"]["severity"] = num
            break

    if any(w in text_lower for w in ["yes", "can", "will go", "i'll go", "okay"]):
        result["updated_summary"]["can_travel"] = True

    if any(w in text_lower for w in ["no", "cannot", "can't", "late", "night", "stuck"]):
        result["updated_summary"]["can_travel"] = False

    # ── STEP 5: Decide if enough data to route ──
    fields_collected = count_collected_fields(result["updated_summary"])

    if fields_collected >= 4:
        # Run triage agent to generate risk score
        triage_result = await run_triage_agent(
            conversation_summary=result["updated_summary"],
            patient_data=patient_data,
        )
        result["triage_score"] = triage_result.get("risk_score", "moderate")

        # Time-aware routing
        can_travel = result["updated_summary"].get("can_travel")

        if can_travel is True:
            result["action"] = "route_hospital"
            result["response"] = (
                f"Thank you for sharing that. It is currently {current_time}. "
                f"Based on what you have told me, I recommend you visit a hospital today. "
                f"Here are the nearest facilities to you:"
            )

        elif can_travel is False:
            result["action"] = "route_consultation"
            result["response"] = (
                f"I understand you are unable to travel right now. "
                f"Do you have any medication available at home?"
            )

    return result
