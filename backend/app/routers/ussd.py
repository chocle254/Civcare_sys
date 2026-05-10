from fastapi import APIRouter, Form
from app.services.africastalking import handle_ussd_request

router = APIRouter()


@router.post("/callback")
async def ussd_callback(
    sessionId:   str  = Form(...),
    serviceCode: str  = Form(...),
    phoneNumber: str  = Form(...),
    text:        str  = Form(default=""),
):
    """
    Africa's Talking calls this endpoint when a patient dials the USSD code.
    Set your callback URL in Africa's Talking dashboard to:
    https://your-railway-url.up.railway.app/ussd/callback

    Returns CON (continue session) or END (close session).
    Works on any basic phone — zero internet required for the patient.
    """
    response = handle_ussd_request(
        session_id=sessionId,
        phone_number=phoneNumber,
        text=text,
    )
    return response
