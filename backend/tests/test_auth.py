import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_patient_register():
    """Patient registration creates account and triggers OTP."""
    response = client.post("/auth/patient/register", json={
        "full_name":       "Jane Wanjiru",
        "phone_number":    "+254712000001",
        "identity_number": "12345678",
        "identity_type":   "national_id",
        "location":        "Nairobi",
    })
    assert response.status_code == 200
    assert "OTP sent" in response.json()["message"]


def test_patient_register_duplicate_phone():
    """Duplicate phone number registration should fail."""
    payload = {
        "full_name":       "John Doe",
        "phone_number":    "+254712000002",
        "identity_number": "87654321",
        "identity_type":   "national_id",
    }
    client.post("/auth/patient/register", json=payload)
    response = client.post("/auth/patient/register", json=payload)
    assert response.status_code == 400


def test_patient_verify_invalid_otp():
    """Invalid OTP should return 400."""
    response = client.post("/auth/patient/verify", json={
        "phone_number": "+254712000001",
        "otp_code":     "000000",
    })
    assert response.status_code in [400, 404]


def test_doctor_login_invalid():
    """Wrong credentials should return 401."""
    response = client.post("/auth/doctor/login", json={
        "email":    "notadoctor@fake.com",
        "password": "wrongpassword",
    })
    assert response.status_code == 401
