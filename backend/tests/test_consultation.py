import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_consultation_initiate_invalid():
    """Consultation with invalid doctor/patient should fail."""
    response = client.post("/consultation/initiate", json={
        "patient_id":     "nonexistent",
        "doctor_id":      "nonexistent",
        "payment_ref":    "TEST-REF",
        "payment_method": "mpesa",
        "fee_amount":     500.0,
    })
    assert response.status_code == 404


def test_consultation_get_invalid():
    """Getting nonexistent consultation should return 404."""
    response = client.get("/consultation/nonexistent-id")
    assert response.status_code == 404


def test_consultation_complete_invalid():
    """Completing nonexistent consultation should fail."""
    response = client.post("/consultation/complete", json={
        "consultation_id": "nonexistent",
        "doctor_id":       "nonexistent",
    })
    assert response.status_code == 404


def test_consultation_rate_invalid():
    """Rating nonexistent consultation should fail."""
    response = client.post("/consultation/rate", json={
        "consultation_id":  "nonexistent",
        "patient_rating":   5,
        "patient_feedback": "Great service",
    })
    assert response.status_code == 404


def test_auto_release_logic():
    """
    After 30 minutes without completion, payment should auto-release.
    Tested via scheduler — requires full integration test with seeded data.
    """
    pass  # TODO: seed a paid consultation with auto_release_at in the past
          # run the scheduler function directly and assert payment_status == released
