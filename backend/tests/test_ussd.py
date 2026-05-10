import pytest
from fastapi.testclient import TestClient
from main import app
from app.services.africastalking import handle_ussd_request

client = TestClient(app)


def test_ussd_main_menu():
    """Empty text input should return the main menu."""
    response = handle_ussd_request(
        session_id="test-session",
        phone_number="+254712000001",
        text="",
    )
    assert response.startswith("CON")
    assert "1." in response
    assert "2." in response


def test_ussd_check_symptoms():
    """Selecting option 1 should prompt for symptoms."""
    response = handle_ussd_request(
        session_id="test-session",
        phone_number="+254712000001",
        text="1",
    )
    assert response.startswith("CON")
    assert "symptom" in response.lower()


def test_ussd_check_medication():
    """Selecting option 2 should prompt for medication name."""
    response = handle_ussd_request(
        session_id="test-session",
        phone_number="+254712000001",
        text="2",
    )
    assert response.startswith("CON")
    assert "medication" in response.lower()


def test_ussd_symptom_submission():
    """Entering symptoms at level 2 should return END with confirmation."""
    response = handle_ussd_request(
        session_id="test-session",
        phone_number="+254712000001",
        text="1*I have a headache and fever",
    )
    assert response.startswith("END")


def test_ussd_medication_submission():
    """Entering medication at level 2 should return END with confirmation."""
    response = handle_ussd_request(
        session_id="test-session",
        phone_number="+254712000001",
        text="2*paracetamol",
    )
    assert response.startswith("END")


def test_ussd_invalid_option():
    """Invalid menu option should return END with error."""
    response = handle_ussd_request(
        session_id="test-session",
        phone_number="+254712000001",
        text="9",
    )
    assert response.startswith("END")
    assert "Invalid" in response


def test_ussd_callback_endpoint():
    """USSD callback endpoint should accept Africa's Talking POST format."""
    response = client.post("/ussd/callback", data={
        "sessionId":   "test-session-123",
        "serviceCode": "*384*001#",
        "phoneNumber": "+254712000001",
        "text":        "",
    })
    assert response.status_code == 200
    body = response.text
    assert body.startswith("CON") or body.startswith("END")
