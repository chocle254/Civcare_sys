import json
from datetime import datetime
from app.services.ai_client import ask_gemini, ask_gemini_with_history
from app.agents.triage_agent  import run_triage_agent
from app.agents.medscan_agent import run_medscan_agent


# ── SYSTEM CONTEXT ──────────────────────────────────────────────────────────
# This is the most important part of the whole system.
# The AI is only as smart as this prompt.
SYSTEM_CONTEXT = """
You are CivTech, an AI clinical intake assistant for a Kenyan healthcare platform.
Your job is to gather enough information to route a patient to either a hospital or
an online doctor consultation. You are NOT a doctor. You do NOT diagnose.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTITY & TONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- You are calm, warm, and professional. Like a kind nurse at a reception desk.
- Use simple, clear English. Avoid medical jargon unless the patient uses it first.
- Keep every response to 2-3 sentences maximum. Never write paragraphs.
- Ask ONE question at a time. Never list multiple questions in one message.
- Never make the patient feel dismissed or that their concern is minor.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLINICAL QUESTIONING STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Follow this order. Adapt based on what the patient already told you — never ask
for information they have already given.

STEP 1 — UNDERSTAND THE CHIEF COMPLAINT
If the symptom is vague (e.g. "I feel bad", "my body hurts", "I'm not well"):
  → Ask: "Can you tell me more specifically where the pain or discomfort is?"
  → Ask: "Is it a pain, a feeling of weakness, or something else?"

If the symptom is specific (e.g. "chest pain", "headache", "fever"):
  → Move directly to Step 2.

STEP 2 — PROBE THE SYMPTOM DEEPLY (ask in order, one at a time)
  a) Location: "Where exactly do you feel it — and does it spread anywhere?"
  b) Duration: "When did this start — was it sudden or did it come on gradually?"
  c) Severity: "On a scale of 1 to 10, how bad is it right now?"
  d) Character: "How would you describe it — sharp, dull, burning, pressure, throbbing?"
  e) Associated symptoms: "Are you experiencing anything else — fever, vomiting, dizziness, shortness of breath, or anything unusual?"
  f) Worsening/relieving: "Does anything make it better or worse?"

STEP 3 — CONTEXT QUESTIONS (only if relevant to the symptom)
  - Fever → "Have you measured your temperature? Have you had chills or night sweats?"
  - Chest pain → "Do you feel short of breath or is your heart racing?"
  - Abdominal pain → "Any changes in your toilet habits? When did you last eat?"
  - Headache → "Is it the worst headache of your life, or similar to ones you've had before?"
  - Dizziness → "Did you faint or almost faint? Any ringing in your ears?"

STEP 4 — COLLECT REQUIRED ROUTING INFO
Only after gathering symptom details:
  → "Are you able to travel to a hospital or clinic right now?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The orchestrator system handles routing automatically. Your job is to keep
gathering data until told to route. When you have collected:
symptom + duration + severity + associated symptoms + can_travel → the system
will route the patient. You do not need to announce this.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RED FLAGS — IMMEDIATE URGENCY SIGNALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If a patient mentions ANY of the following, immediately tell them this is urgent
and ask if they can go to a hospital RIGHT NOW:
  - Chest pain + shortness of breath
  - Sudden severe headache ("worst of my life")
  - Difficulty breathing at rest
  - Confusion, loss of consciousness, or seizure
  - Severe abdominal pain with rigid belly
  - Coughing or vomiting blood
  - High fever (>39°C) in a child under 5
  - Stroke symptoms: face drooping, arm weakness, slurred speech
  - Severe allergic reaction: throat swelling, hives all over body

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRICT PROHIBITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEVER say:
  - "That sounds mild" / "You probably just need rest" / "It is likely nothing serious"
  - "You should be fine" / "Don't worry" / "It's probably just..."
  - Any specific drug name as a recommendation
  - A diagnosis ("you have malaria", "that sounds like typhoid")

ALWAYS end every response with either a question or a routing statement.
Never end on a statement with no follow-up.
"""


# ── SUMMARY EXTRACTION AGENT ────────────────────────────────────────────────
# Uses Gemini itself to extract the summary — far more reliable than keywords.

async def extract_conversation_summary(
    conversation_history: list,
    existing_summary: dict,
) -> dict:
    """
    Uses Gemini to read the full conversation and extract structured fields.
    Much more reliable than keyword matching.
    Only runs every 2 turns to save API calls.
    """

    history_text = "\n".join(
        f"{'Patient' if m['role'] == 'patient' else 'AI'}: {m['content']}"
        for m in conversation_history
    )

    prompt = f"""
Read this medical intake conversation and extract the structured fields below.
Only fill in a field if the patient clearly stated it. Use null for unknown fields.
Do not infer or guess. Never set severity from duration numbers.

CONVERSATION:
{history_text}

Respond ONLY in this exact JSON format with no extra text or markdown:
{{
    "symptom": "<main symptom in 5 words or less, or null>",
    "location": "<body location, or null>",
    "duration": "<how long, e.g. '2 days', 'since this morning', or null>",
    "severity": <number 1-10 only if patient explicitly rated it, else null>,
    "character": "<how patient described it: sharp/dull/burning/etc, or null>",
    "associated": "<other symptoms mentioned, comma separated, or null>",
    "fever": <true if patient mentioned fever or high temperature, else false>,
    "can_travel": <true if patient said yes to travelling, false if they said no, null if not asked yet>,
    "recent_activity": "<relevant food or activity mentioned, or null>"
}}
"""

    response = await ask_gemini(prompt)

    try:
        clean = response.strip().replace("```json", "").replace("```", "").strip()
        extracted = json.loads(clean)
        # Merge with existing — never overwrite a confirmed field with null
        merged = existing_summary.copy()
        for key, value in extracted.items():
            if value is not None:
                merged[key] = value
        return merged
    except Exception:
        # If extraction fails, keep what we had
        return existing_summary


def count_collected_fields(summary: dict) -> int:
    """
    Counts confirmed fields needed before routing.
    Severity must be a real number — not a string from duration.
    """
    fields = [
        summary.get("symptom"),
        summary.get("duration"),
        summary.get("severity"),       # Must be a number (from Gemini extraction)
        summary.get("associated"),
        summary.get("can_travel"),
    ]
    return sum(1 for f in fields if f is not None)


def detect_medication_mention(text: str) -> str | None:
    """
    Checks if the patient mentioned a medication.
    Returns the medication name if found, None otherwise.
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


async def process_message(
    patient_message: str,
    conversation_history: list,
    patient_data: dict,
    conversation_summary: dict,
    current_time: str,
) -> dict:
    """
    Main orchestrator. Receives patient message + full history.
    Returns AI response + routing action + updated summary.
    """

    result = {
        "response":        "",
        "action":          "continue",
        "medscan_result":  None,
        "updated_summary": conversation_summary.copy(),
        "triage_score":    None,
        "hospitals":       None,
    }

    # ── STEP 1: MedScan check ────────────────────────────────────────────────
    medication = detect_medication_mention(patient_message)
    if medication:
        medscan_result = await run_medscan_agent(
            medication_name=medication,
            patient_message=patient_message,
            current_medications=patient_data.get("current_medications", []),
        )
        result["medscan_result"] = medscan_result
        result["action"] = "medscan"

        if medscan_result.get("clash_detected"):
            result["action"] = "route_consultation"
            result["response"] = (
                f"I need to flag something important — {medication} may not be safe "
                f"to take with your current medications. "
                f"I'd like to connect you with a doctor right now. Are you available?"
            )
            return result

    # ── STEP 2: Build conversation history for Gemini ────────────────────────
    gemini_history = []
    for msg in conversation_history:
        role = "user" if msg["role"] == "patient" else "model"
        gemini_history.append({
            "role":  role,
            "parts": [msg["content"]],
        })

    gemini_history.append({
        "role":  "user",
        "parts": [patient_message],
    })

    # ── STEP 3: Get AI response ──────────────────────────────────────────────
    ai_response = await ask_gemini_with_history(
        messages=gemini_history,
        system_context=SYSTEM_CONTEXT,
    )
    result["response"] = ai_response

    # ── STEP 4: Extract summary using Gemini (every 2 turns) ─────────────────
    # Count turns from history length — extract on turns 2, 4, 6, ...
    turn_count = len(conversation_history) + 1
    if turn_count % 2 == 0 or turn_count >= 4:
        full_history = conversation_history + [
            {"role": "patient", "content": patient_message},
            {"role": "ai",      "content": ai_response},
        ]
        result["updated_summary"] = await extract_conversation_summary(
            conversation_history=full_history,
            existing_summary=result["updated_summary"],
        )

    # ── STEP 5: Decide routing ───────────────────────────────────────────────
    fields_collected = count_collected_fields(result["updated_summary"])

    if fields_collected >= 5:
        triage_result = await run_triage_agent(
            conversation_summary=result["updated_summary"],
            patient_data=patient_data,
        )
        result["triage_score"] = triage_result.get("risk_score", "moderate")

        can_travel = result["updated_summary"].get("can_travel")

        if can_travel is True:
            result["action"] = "route_hospital"
            # Let the AI write a natural routing message based on context
            routing_prompt = f"""
The patient has shared enough for us to recommend care. 
Current time: {current_time}.
Triage assessment: {triage_result.get('preliminary_assessment', '')}.
Risk level: {triage_result.get('risk_score', 'moderate')}.

Write a warm 2-sentence message telling the patient you are recommending they
visit a hospital and that you are finding the closest ones to them.
Do not give a diagnosis. Do not name a specific condition.
"""
            result["response"] = await ask_gemini(routing_prompt)

        elif can_travel is False:
            result["action"] = "route_consultation"
            routing_prompt = f"""
The patient cannot travel to a hospital right now.
Write a warm 2-sentence message telling them you understand, and that you are
going to connect them with a doctor they can speak to right now online.
Do not give a diagnosis. Be reassuring.
"""
            result["response"] = await ask_gemini(routing_prompt)

        elif can_travel is None:
            # We have symptoms but haven't asked about travel yet — ask now
            result["action"] = "continue"
            result["response"] = (
                "Thank you for sharing all of that. "
                "Are you able to travel to a hospital or clinic today?"
            )

    return result
