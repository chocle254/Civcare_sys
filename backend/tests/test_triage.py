import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_send_message_without_patient():
    """Message without valid patient ID should fail."""
    response = client.post("/triage/message", json={
        "patient_id": "nonexistent-id",
        "message":    "I have a headache",
    })
    assert response.status_code == 404


def test_send_message_creates_session():
    """
    Valid patient message should return a session_id and AI response.
    Requires a seeded patient in the test database.
    """
    pass  # TODO: seed test patient and assert session created


def test_confirm_arrival_invalid():
    """Confirming arrival with wrong appointment ID should fail."""
    response = client.post("/triage/confirm-arrival", json={
        "appointment_id": "nonexistent",
        "patient_id":     "nonexistent",
    })
    assert response.status_code == 404


def test_call_patient_invalid():
    """Calling patient with wrong appointment ID should fail."""
    response = client.post("/triage/call-patient", json={
        "appointment_id": "nonexistent",
        "doctor_id":      "nonexistent",
    })
    assert response.status_code == 404
