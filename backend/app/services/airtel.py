import httpx
from app.config import settings


def get_airtel_token() -> str:
    """
    Gets OAuth token from Airtel Africa.
    Plug in AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET in .env to activate.
    """
    base_url = (
        "https://openapiuat.airtel.africa"
        if settings.AIRTEL_ENVIRONMENT == "sandbox"
        else "https://openapi.airtel.africa"
    )

    response = httpx.post(
        f"{base_url}/auth/oauth2/token",
        json={
            "client_id":     settings.AIRTEL_CLIENT_ID,
            "client_secret": settings.AIRTEL_CLIENT_SECRET,
            "grant_type":    "client_credentials",
        },
        headers={"Content-Type": "application/json"},
    )
    return response.json().get("access_token", "")


async def airtel_payment(phone_number: str, amount: float, reference: str) -> dict:
    """
    Initiates Airtel Money payment request.
    Plug in credentials in .env to activate.

    phone_number: format 2547XXXXXXXX (no +)
    amount: consultation fee
    reference: consultation ID
    """
    try:
        token    = get_airtel_token()
        base_url = (
            "https://openapiuat.airtel.africa"
            if settings.AIRTEL_ENVIRONMENT == "sandbox"
            else "https://openapi.airtel.africa"
        )

        payload = {
            "reference": reference,
            "subscriber": {
                "country": "KE",
                "currency": "KES",
                "msisdn": phone_number,
            },
            "transaction": {
                "amount":   amount,
                "country":  "KE",
                "currency": "KES",
                "id":       reference,
            }
        }

        response = httpx.post(
            f"{base_url}/merchant/v1/payments/",
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type":  "application/json",
                "X-Country":     "KE",
                "X-Currency":    "KES",
            },
        )
        return response.json()

    except Exception as e:
        print(f"Airtel payment error: {e}")
        return {"error": str(e)}
