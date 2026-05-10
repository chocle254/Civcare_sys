from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.services.mpesa import stk_push, parse_mpesa_callback
from app.services.airtel import airtel_payment

router = APIRouter()


class PaymentRequest(BaseModel):
    phone_number:   str
    amount:         float
    reference:      str
    doctor_id:      str
    patient_id:     str
    description:    str = "CivTech Consultation Fee"


@router.post("/mpesa")
async def pay_mpesa(data: PaymentRequest, db: Session = Depends(get_db)):
    """
    Initiates M-Pesa STK push to patient's phone.
    Patient enters their M-Pesa PIN on their phone.
    Plug in MPESA credentials in .env to activate.
    """
    result = await stk_push(
        phone_number=data.phone_number.replace("+", ""),
        amount=data.amount,
        reference=data.reference,
        description=data.description,
    )
    return result


@router.post("/mpesa/callback")
async def mpesa_callback(request: Request, db: Session = Depends(get_db)):
    """
    Safaricom calls this URL after patient pays or cancels.
    Set MPESA_CALLBACK_URL in .env to:
    https://your-railway-url.up.railway.app/payment/mpesa/callback
    """
    body   = await request.json()
    result = parse_mpesa_callback(body)

    if result.get("success"):
        # TODO: find consultation by reference and mark payment as confirmed
        print(f"M-Pesa payment confirmed: {result}")

    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@router.post("/airtel")
async def pay_airtel(data: PaymentRequest, db: Session = Depends(get_db)):
    """
    Initiates Airtel Money payment.
    Plug in AIRTEL credentials in .env to activate.
    """
    result = await airtel_payment(
        phone_number=data.phone_number.replace("+", ""),
        amount=data.amount,
        reference=data.reference,
    )
    return result
