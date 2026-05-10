import httpx
import base64
from datetime import datetime
from app.config import settings


def get_mpesa_token() -> str:
    """
    Gets OAuth token from Safaricom.
    Plug in MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in .env to activate.
    """
    credentials = base64.b64encode(
        f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}".encode()
    ).decode()

    base_url = (
        "https://sandbox.safaricom.co.ke"
        if settings.MPESA_ENVIRONMENT == "sandbox"
        else "https://api.safaricom.co.ke"
    )

    response = httpx.get(
        f"{base_url}/oauth/v1/generate?grant_type=client_credentials",
        headers={"Authorization": f"Basic {credentials}"},
    )
    return response.json().get("access_token", "")


async def stk_push(phone_number: str, amount: float, reference: str, description: str) -> dict:
    """
    Initiates M-Pesa STK push to patient's phone.
    Patient sees a payment prompt on their phone and enters PIN.

    phone_number: format 2547XXXXXXXX (no +)
    amount: consultation fee
    reference: consultation ID
    """
    try:
        token    = get_mpesa_token()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password  = base64.b64encode(
            f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}".encode()
        ).decode()

        base_url = (
            "https://sandbox.safaricom.co.ke"
            if settings.MPESA_ENVIRONMENT == "sandbox"
            else "https://api.safaricom.co.ke"
        )

        payload = {
            "BusinessShortCode": settings.MPESA_SHORTCODE,
            "Password":          password,
            "Timestamp":         timestamp,
            "TransactionType":   "CustomerPayBillOnline",
            "Amount":            int(amount),
            "PartyA":            phone_number,
            "PartyB":            settings.MPESA_SHORTCODE,
            "PhoneNumber":       phone_number,
            "CallBackURL":       settings.MPESA_CALLBACK_URL,
            "AccountReference":  reference,
            "TransactionDesc":   description,
        }

        response = httpx.post(
            f"{base_url}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        return response.json()

    except Exception as e:
        print(f"M-Pesa STK push error: {e}")
        return {"error": str(e)}


def parse_mpesa_callback(callback_data: dict) -> dict:
    """
    Parses the M-Pesa callback after patient pays.
    Returns payment status and transaction reference.
    """
    try:
        body        = callback_data["Body"]["stkCallback"]
        result_code = body["ResultCode"]

        if result_code == 0:
            # Payment successful
            items = {
                item["Name"]: item.get("Value")
                for item in body["CallbackMetadata"]["Item"]
            }
            return {
                "success":     True,
                "amount":      items.get("Amount"),
                "receipt":     items.get("MpesaReceiptNumber"),
                "phone":       items.get("PhoneNumber"),
                "timestamp":   items.get("TransactionDate"),
            }
        else:
            return {"success": False, "message": body.get("ResultDesc", "Payment failed")}

    except Exception as e:
        return {"success": False, "message": str(e)}
