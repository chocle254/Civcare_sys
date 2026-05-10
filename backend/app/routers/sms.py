from fastapi import APIRouter, Form
from app.services.africastalking import send_sms

router = APIRouter()


@router.post("/callback")
async def sms_callback(
    from_:   str = Form(alias="from"),
    text:    str = Form(...),
    to:      str = Form(...),
    date:    str = Form(default=""),
    id:      str = Form(default=""),
):
    """
    Africa's Talking calls this when a patient replies to an SMS.
    Handles TAKEN / SKIP responses to medication reminders.

    Set your SMS callback URL in Africa's Talking dashboard to:
    https://your-railway-url.up.railway.app/sms/callback
    """
    reply = text.strip().upper()
    phone = from_

    if reply == "TAKEN":
        # TODO: Find the most recent pending reminder for this phone number
        # Mark it as taken
        await send_sms(phone, "✅ Dose marked as taken. Well done! Keep going.")

    elif reply == "SKIP":
        await send_sms(
            phone,
            "We noticed you skipped a dose. Reply with:\n"
            "1 - I forgot\n"
            "2 - I feel better\n"
            "3 - No medication left\n"
            "4 - Side effects"
        )

    elif reply in ["1", "2", "3", "4"]:
        messages = {
            "1": "Please take the dose now if it has been less than 2 hours since the scheduled time.",
            "2": "It is important to complete the full course even when feeling better. Especially antibiotics.",
            "3": "Please visit a pharmacy to refill your prescription. You still have days remaining.",
            "4": "Please open the CivTech app and describe your side effects in the chat so we can help.",
        }
        await send_sms(phone, messages[reply])

    return {"status": "received"}
