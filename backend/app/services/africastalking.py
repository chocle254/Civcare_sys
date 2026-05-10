import africastalking
from app.config import settings

# Initialize Africa's Talking
# Plug in your AT_USERNAME and AT_API_KEY in .env to activate
africastalking.initialize(
    username=settings.AT_USERNAME,
    api_key=settings.AT_API_KEY,
)

sms_service  = africastalking.SMS
ussd_service = africastalking.USSD


async def send_sms(phone_number: str, message: str) -> bool:
    """
    Sends an SMS to a patient or doctor.
    Used for OTP delivery, medication reminders, and notifications.
    Phone number must be in format: +2547XXXXXXXX
    """
    try:
        response = sms_service.send(
            message=message,
            recipients=[phone_number],
            sender_id=settings.AT_SENDER_ID,
        )
        print(f"SMS sent to {phone_number}: {response}")
        return True
    except Exception as e:
        print(f"SMS error: {e}")
        return False


async def send_otp_sms(phone_number: str, otp: str) -> bool:
    message = (
        f"CivTech Care System\n"
        f"Your verification code is: {otp}\n"
        f"This code expires in 10 minutes.\n"
        f"Do not share this code with anyone."
    )
    return await send_sms(phone_number, message)


async def send_medication_reminder(phone_number: str, medication: str, dosage: str) -> bool:
    message = (
        f"CivTech Reminder\n"
        f"Time to take: {medication} — {dosage}\n"
        f"Reply TAKEN if you have taken this dose.\n"
        f"Reply SKIP if you cannot take it right now."
    )
    return await send_sms(phone_number, message)


async def send_doctor_call_notification(phone_number: str, doctor_name: str) -> bool:
    message = (
        f"CivTech Care System\n"
        f"Dr. {doctor_name} is ready to see you now.\n"
        f"Please proceed to the consultation room."
    )
    return await send_sms(phone_number, message)


async def send_consultation_request(doctor_phone: str, patient_name: str, patient_phone: str) -> bool:
    message = (
        f"CivTech — New Consultation\n"
        f"Patient: {patient_name}\n"
        f"Payment confirmed.\n"
        f"Please call: {patient_phone}"
    )
    return await send_sms(doctor_phone, message)


def handle_ussd_request(session_id: str, phone_number: str, text: str) -> str:
    """
    Handles USSD requests from basic phones.
    Text is the chain of inputs so far e.g "" / "1" / "1*2" etc.
    Returns a string starting with CON (continue) or END (end session).

    Plug in your AT_USSD_CODE in .env to activate:
    Africa's Talking dashboard → USSD → create shortcode → set callback URL to:
    https://your-railway-url.up.railway.app/ussd/callback
    """
    inputs = text.split("*") if text else [""]
    level  = len(inputs)

    # ── LEVEL 0 — Main Menu ──
    if text == "":
        return (
            "CON Welcome to CivTech Care System\n"
            "1. Check my symptoms\n"
            "2. Check a medication\n"
            "3. My medication reminders\n"
            "4. Nearest hospitals"
        )

    # ── LEVEL 1 ──
    if level == 1:
        choice = inputs[0]

        if choice == "1":
            return "CON Describe your main symptom in a few words:"

        elif choice == "2":
            return "CON Enter the name of the medication:"

        elif choice == "3":
            return (
                "CON Medication Reminders\n"
                "1. View my reminders\n"
                "2. Mark last dose as TAKEN\n"
                "3. SKIP last dose"
            )

        elif choice == "4":
            return "CON Enter your town or area to find nearby hospitals:"

        else:
            return "END Invalid option. Please try again."

    # ── LEVEL 2 ──
    if level == 2:
        main_choice = inputs[0]
        sub_input   = inputs[1]

        if main_choice == "1":
            # Symptom entered — route to AI (respond via SMS for full conversation)
            return (
                f"END Thank you. We have received your symptoms.\n"
                f"Our AI will send you a full assessment via SMS shortly.\n"
                f"CivTech Care System"
            )

        elif main_choice == "2":
            # Medication check — respond via SMS
            return (
                f"END Thank you. We are checking {sub_input} for you.\n"
                f"You will receive the results via SMS shortly.\n"
                f"CivTech Care System"
            )

        elif main_choice == "3":
            if sub_input == "1":
                return "END Your reminders will be sent to your phone via SMS."
            elif sub_input == "2":
                return "END Your last dose has been marked as TAKEN. Well done!"
            elif sub_input == "3":
                return "END Your last dose has been marked as SKIPPED. Please take it as soon as possible."

        elif main_choice == "4":
            return (
                f"END Finding hospitals near {sub_input}.\n"
                f"Results will be sent to you via SMS shortly.\n"
                f"CivTech Care System"
            )

    return "END Thank you for using CivTech Care System."
