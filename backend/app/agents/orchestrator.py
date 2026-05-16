import json
from datetime import datetime
from app.services.ai_client import ask_gemini, ask_gemini_with_history
from app.agents.triage_agent  import run_triage_agent
from app.agents.medscan_agent import run_medscan_agent


# ── SYSTEM CONTEXT ──────────────────────────────────────────────────────────
SYSTEM_CONTEXT = """
You are CivTech, a senior clinical triage nurse with 15+ years of experience working in Kenyan hospitals, including KNH, Aga Khan, and Moi Teaching Hospital.
Your job is to safely assess a patient's condition through empathetic, structured questioning — exactly as a real nurse would do at the reception desk.
You NEVER jump to conclusions. You gather information step by step before anything else.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTITY & TONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- You are warm, professional, and deeply empathetic — like the best nurse a patient has ever met.
- Use simple, clear English. Use Kenyan-appropriate phrasing where helpful.
- Use empathetic openers: "I'm sorry to hear that...", "That must be uncomfortable...", "Thank you for telling me..."
- Keep every response to 1-2 SHORT sentences maximum. Never write paragraphs.
- Ask ONLY ONE question at a time. NEVER list multiple questions.
- Never use bullet points or lists in your responses. Sound human, not robotic.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIRST AID INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ONLY if the patient describes an acute physical injury or specific emergency where immediate physical intervention is required (e.g., active bleeding, a recent burn, choking, or chemical exposure), provide brief, practical First Aid advice tailored EXACTLY to their specific complaint. 
- If no direct physical first aid applies to their specific symptom (e.g., for chest pain, numbness in a limb, stomach ache, or fever), DO NOT provide first aid advice. Simply reassure them and continue your assessment.
- Your first aid advice must be medically sound and concise (1-2 sentences).
- NEVER give irrelevant advice (e.g., do not mention bleeding if they are not bleeding).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLINICAL QUESTIONING STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Follow this sequence. Adapt dynamically — skip questions already answered.

STEP 1 — CHIEF COMPLAINT (Turn 1-2)
Acknowledge what they said and ask ONE clarifying question:
  - If vague → "Can you describe exactly where the discomfort is and what it feels like?"
  - If specific → Move to Step 2.

STEP 2 — CONDITION-SPECIFIC DEEP-DIVE (Turn 2-4)
Apply specific protocols based on the presenting complaint:
  - FEVER / MALARIA RISK → Ask about chills, joint pain, travel to malaria zones, mosquito exposure.
  - CHEST PAIN → Ask about radiation to arm/jaw, shortness of breath, sweating, palpitations.
  - ABDOMINAL / GI → Ask about toilet habits, blood in stool/vomit, nausea, what they ate recently.
  - RESPIRATORY → Ask about cough duration, sputum color/blood, difficulty breathing at rest, TB contact.
  - HEADACHE → Ask about location, sudden onset vs gradual, vision changes, neck stiffness, worst ever.
  - PEDIATRIC (<5 years) → Ask about lethargy, fluid intake, breathing speed, temperature, rash.
  - OBSTETRIC / PREGNANCY → Ask about gestational age, bleeding, severe cramping, reduced fetal movement.
  - TRAUMA / INJURY → Ask about mechanism of injury, loss of consciousness, numbness, bleeding.

STEP 3 — STANDARD PROBING (Turn 3-5, if not already answered)
  a) Duration and onset — "How long have you had this?"
  b) Severity — "On a scale of 1 to 10, how bad is it right now?"
  c) What makes it better or worse?
  d) Have they taken any medication for it?

STEP 4 — ROUTING QUESTION (Only after 4+ turns with solid symptom data)
Ask ONCE: "Are you able to travel to a hospital or clinic today, or would you prefer to speak to a doctor online?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The backend system handles ALL routing automatically. Your job is ONLY to gather clinical data.
NEVER say you are routing them anywhere. NEVER say "I will connect you" or "I'm sending you."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RED FLAGS — FOR SEVERE ESCALATION ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ONLY if the patient describes any of the following in combination, express urgency and ask if they can go NOW:
  - Chest pain + shortness of breath + sweating (possible cardiac event)
  - Sudden worst-ever headache + neck stiffness (possible meningitis/bleed)
  - Difficulty breathing at rest, lips turning blue
  - Confusion, seizure, or loss of consciousness
  - Coughing or vomiting blood (significant amount)
  - Severe belly pain with rigid, board-like abdomen
  - High fever (>39°C) + seizures in a child under 5
  - Stroke signs: sudden face drooping, arm weakness, slurred speech
  - Pregnancy + heavy vaginal bleeding or severe cramps

A headache ALONE is NOT a red flag. A mild fever ALONE is NOT a red flag. Use clinical judgment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRICT PROHIBITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEVER say:
  - "I am going to route you" / "I will connect you to a doctor" / "I'm sending you somewhere"
  - "That sounds mild" / "You probably just need rest" / "It is likely nothing serious"
  - "You should be fine" / "Don't worry" / "It's probably just..."
  - Any specific drug name as a recommendation
  - A definitive diagnosis ("you have malaria", "you have a migraine")

ALWAYS end with ONE question OR a brief reassuring statement + one question.
"""


# ── SUMMARY EXTRACTION AGENT ─────────────────────────────────────────────────

async def extract_conversation_summary(
    conversation_history: list,
    existing_summary: dict,
) -> dict:
    """
    Uses Gemini to read the full conversation and extract structured clinical fields.
    Only runs every 2 turns to save API calls.
    """
    history_text = "\n".join(
        f"{'Patient' if m['role'] == 'patient' else 'Nurse'}: {m['content']}"
        for m in conversation_history
    )

    prompt = f"""
Read this medical intake conversation and extract the structured fields below.
Only fill in a field if the patient clearly stated it. Use null for unknown fields.
STRICT RULE: Copy patient words exactly. Never infer, assume, or add anything not stated. If unsure, use null.

CONVERSATION:
{history_text}

Respond ONLY in this exact JSON format with no extra text or markdown:
{{
    "symptom": "<main symptom in 5 words or less, or null>",
    "location": "<body location, or null>",
    "duration": "<how long, e.g. '2 days', 'since this morning', or null>",
    "severity": <number 1-10 only if patient explicitly rated it, else null>,
    "character": "<how patient described it: sharp/dull/burning/throbbing/etc, or null>",
    "associated": "<ONLY symptoms the patient explicitly said, comma separated, or null>",
    "fever": <true if patient mentioned fever or high temperature, else false>,
    "can_travel": <true if patient said yes to travelling, false if they said no, null if not asked yet>,
    "recent_activity": "<relevant food or activity mentioned, or null>",
    "pregnancy_status": "<pregnant, not pregnant, or null>",
    "vital_signs": "<any explicitly mentioned temp, bp, hr, spo2, or null>",
    "onset_context": "<what they were doing when it started, or null>",
    "previous_episodes": "<has this happened before, or null>",
    "self_treatment": "<what they have already tried/taken, or null>",
    "medical_history": "<any past conditions they mentioned in chat, or null>",
    "family_history": "<relevant family conditions mentioned, or null>",
    "smoking_alcohol": "<any substance use mentioned, or null>"
}}
"""

    response = await ask_gemini(prompt)

    try:
        clean = response.strip().replace("```json", "").replace("```", "").strip()
        extracted = json.loads(clean)
        merged = existing_summary.copy()
        for key, value in extracted.items():
            if value is not None:
                merged[key] = value
        return merged
    except Exception:
        return existing_summary


def count_collected_fields(summary: dict) -> int:
    """
    Counts confirmed fields needed before routing.
    Severity must be a real number — not a string from duration.
    """
    fields = [
        summary.get("symptom"),
        summary.get("duration"),
        summary.get("severity"),
        summary.get("character"),
        summary.get("associated"),
        summary.get("can_travel"),
    ]
    return sum(1 for f in fields if f is not None)


def is_ready_for_routing(summary: dict, turn_count: int) -> bool:
    """
    Strictly checks if enough information is gathered to route.
    Minimum 4 turns AND 4 confirmed fields.
    Pain symptoms must have location and character confirmed.
    The AI response text is NOT used to trigger routing — only clinical data matters.
    """
    # Hard minimum: must have at least 4 turns of conversation
    if turn_count < 4:
        return False

    symptom = summary.get("symptom", "") or ""
    symptom_lower = symptom.lower()

    # Pain complaints require location AND character before routing
    is_pain = any(w in symptom_lower for w in ["pain", "ache", "sore", "hurt", "cramp"])
    if is_pain:
        has_location  = summary.get("location") is not None
        has_character = summary.get("character") is not None
        if not has_location or not has_character:
            return False

    fields_collected = count_collected_fields(summary)
    return fields_collected >= 4


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
    mode: str | None = None,
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
    past_history     = patient_data.get("past_history", [])
    past_history_str = ""
    if past_history:
        lines = []
        for h in past_history:
            line = f"  - {h['date']}: Diagnosed with {h['diagnosis']} (severity: {h['severity']})"
            if h["notes"]:
                line += f" — Doctor noted: {h['notes']}"
            lines.append(line)
        past_history_str = "\n".join(lines)
    else:
        past_history_str = "  None on record"
    # ── STEP 3: Get AI response ──────────────────────────────────────────────
    dynamic_context = SYSTEM_CONTEXT + (
        f"\n\n━ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"PATIENT PROFILE\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"Age: {patient_data.get('age')}\n"
        f"Location: {patient_data.get('location')}\n"
        f"Past Conditions: {patient_data.get('conditions')}\n"
        f"Current Medications: {', '.join(patient_data.get('current_medications', [])) or 'None'}\n"
        f"Allergies: {patient_data.get('allergies')}\n"
        f"IMPORTANT INSTRUCTIONS FOR PATIENT CONTEXT:\n"
        f"- If Past Conditions or Current Medications are present, you ALREADY know this patient.\n"
        f"- On the FIRST message of a new session, briefly acknowledge their history naturally.\n"
        f"  Example: 'Good to have you back — I can see you've previously consulted us about {patient_data.get('conditions', 'a few things')}. What brings you in today?'\n"
        f"- If they describe a new symptom that could relate to a past condition, gently factor it in.\n"
        f"  Example: If they had malaria before and now have fever, probe more specifically.\n"
        f"- NEVER recite their full medical record. Reference it naturally, like a nurse who remembers a returning patient.\n"
        f"- If Past Conditions is 'None on record' and Current Medications is empty, treat them as a new patient."
    )

    ai_response = await ask_gemini_with_history(
        messages=gemini_history,
        system_context=dynamic_context,
    )
    result["response"] = ai_response

    # ── STEP 4: Extract summary using Gemini (every 2 turns) ─────────────────
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
    # STRICT: only use clinical data counts — no text heuristics
    fields_collected = count_collected_fields(result["updated_summary"])
    ready_to_route   = is_ready_for_routing(result["updated_summary"], turn_count)

    print(f"[DEBUG] Turn: {turn_count}")
    print(f"[DEBUG] Summary: {result['updated_summary']}")
    print(f"[DEBUG] Fields: {fields_collected}, Ready: {ready_to_route}")

    if ready_to_route:
        triage_result = await run_triage_agent(
            conversation_summary=result["updated_summary"],
            patient_data=patient_data,
        )
        result["triage_score"] = triage_result.get("risk_score", "moderate")

        # Fast-track routing for pre-selected destination modes
        if mode == "pre_hospital":
            result["action"] = "route_hospital"
            result["response"] = "Thank you, I have gathered enough information. Preparing your file now..."
            return result
        elif mode == "pre_consultation":
            result["action"] = "route_consultation"
            result["response"] = "Thank you. Your file is ready. Connecting you to the doctor now..."
            return result

        can_travel = result["updated_summary"].get("can_travel")

        if can_travel is True:
            result["action"] = "route_hospital"
            routing_prompt = f"""
The patient has shared enough clinical information for safe routing.
Current time: {current_time}.
Triage assessment: {triage_result.get('preliminary_assessment', '')}.
Risk level: {triage_result.get('risk_score', 'moderate')}.

Write a warm, professional 2-sentence message from a senior nurse telling the patient you have gathered what you need
and you are recommending they visit a hospital. Do NOT name a specific hospital. Do NOT give a diagnosis.
"""
            result["response"] = await ask_gemini(routing_prompt)

        elif can_travel is False:
            result["action"] = "route_consultation"
            routing_prompt = f"""
The patient cannot travel to a hospital right now.
Write a warm, professional 2-sentence message from a senior nurse telling them you understand completely,
and that you are going to connect them with a qualified doctor they can speak to right now online.
Do NOT give a diagnosis. Be reassuring and caring.
"""
            result["response"] = await ask_gemini(routing_prompt)

        elif can_travel is None:
            # Symptoms gathered but travel preference not asked yet
            result["action"] = "continue"
            result["response"] = (
                "Thank you for sharing all of that with me. "
                "Are you able to travel to a nearby hospital or clinic today, "
                "or would you prefer to speak to a doctor online?"
            )

    return result
