import pytest
from fastapi.testclient import TestClient
from app.services.otp import generate_otp, verify_otp
from datetime import datetime, timedelta
from main import app

client = TestClient(app)


# ── OTP Unit Tests ──

def test_otp_generation():
    """OTP should be a 6-digit numeric string."""
    otp, expires = generate_otp()
    assert otp.isdigit()
    assert len(otp) == 6


def test_otp_expiry_future():
    """OTP expiry should be in the future."""
    _, expires = generate_otp()
    assert expires > datetime.utcnow()


def test_otp_verify_correct():
    """Correct OTP within expiry should verify successfully."""
    otp, expires = generate_otp()
    assert verify_otp(otp, otp, expires) is True


def test_otp_verify_wrong_code():
    """Wrong OTP should not verify."""
    otp, expires = generate_otp()
    assert verify_otp("000000", otp, expires) is False


def test_otp_verify_expired():
    """Expired OTP should not verify even if code is correct."""
    otp, _ = generate_otp()
    past_expiry = datetime.utcnow() - timedelta(minutes=1)
    assert verify_otp(otp, otp, past_expiry) is False


# ── SMS Callback Tests ──

def test_sms_callback_taken_response():
    """TAKEN reply should return 200 with confirmation message."""
    response = client.post("/sms/callback", data={
        "from":  "+254712000001",
        "text":  "TAKEN",
        "to":    "CivTech",
        "date":  "2024-01-01",
        "id":    "test-sms-001",
    })
    assert response.status_code == 200
    assert response.json()["status"] == "received"


def test_sms_callback_skip_response():
    """SKIP reply should return 200 and prompt for skip reason."""
    response = client.post("/sms/callback", data={
        "from":  "+254712000001",
        "text":  "SKIP",
        "to":    "CivTech",
        "date":  "2024-01-01",
        "id":    "test-sms-002",
    })
    assert response.status_code == 200


def test_sms_callback_skip_reason():
    """Skip reason reply (1-4) should return 200."""
    for reason in ["1", "2", "3", "4"]:
        response = client.post("/sms/callback", data={
            "from":  "+254712000001",
            "text":  reason,
            "to":    "CivTech",
            "date":  "2024-01-01",
            "id":    f"test-sms-{reason}",
        })
        assert response.status_code == 200
