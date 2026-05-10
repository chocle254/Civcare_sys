import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_medscan_check_missing_patient():
    """MedScan with invalid patient ID should return 200 with empty medication list."""
    response = client.post("/medscan/check", json={
        "patient_id":      "nonexistent",
        "medication_name": "paracetamol",
        "patient_message": "can I take paracetamol?",
    })
    # Should still run — just with empty current medications list
    assert response.status_code == 200


def test_medscan_returns_expected_fields():
    """MedScan response must include all required fields."""
    response = client.post("/medscan/check", json={
        "patient_id":      "test",
        "medication_name": "ibuprofen",
        "patient_message": "I want to take ibuprofen for my headache",
    })
    data = response.json()
    assert "clash_detected"    in data
    assert "recommendation"    in data
    assert "medication_name"   in data
    assert "safe_to_continue"  in data


def test_medscan_known_dangerous_combination():
    """
    Aspirin + Warfarin is a known dangerous combination.
    MedScan should detect the clash.
    Requires patient with Warfarin in their prescription history.
    """
    pass  # TODO: seed patient with Warfarin prescription then test aspirin


def test_medscan_safe_medication():
    """
    Paracetamol for a patient with no current medications should be flagged as safe.
    """
    pass  # TODO: seed patient with no prescriptions and assert clash_detected == False
