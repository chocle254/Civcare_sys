import random
import string
from datetime import datetime, timedelta


def generate_otp(length: int = 6) -> tuple[str, datetime]:
    """
    Generates a numeric OTP and its expiry time (10 minutes).
    Returns: (otp_code, expires_at)
    """
    otp = "".join(random.choices(string.digits, k=length))
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    return otp, expires_at


def verify_otp(input_otp: str, stored_otp: str, expires_at: datetime) -> bool:
    """
    Verifies OTP is correct and not expired.
    """
    if datetime.utcnow() > expires_at:
        return False
    return input_otp.strip() == stored_otp.strip()
