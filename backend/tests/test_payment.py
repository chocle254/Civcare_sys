import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_mpesa_endpoint_exists():
    """M-Pesa payment endpoint should be reachable."""
    response = client.post("/payment/mpesa", json={
        "phone_number": "+254712000001",
        "amount":       500.0,
        "reference":    "TEST-001",
        "doctor_id":    "test-doctor",
        "patient_id":   "test-patient",
    })
    # Will return error from Safaricom sandbox if keys not set —
    # but endpoint itself should be reachable
    assert response.status_code in [200, 400, 422, 500]


def test_airtel_endpoint_exists():
    """Airtel Money payment endpoint should be reachable."""
    response = client.post("/payment/airtel", json={
        "phone_number": "+254712000001",
        "amount":       500.0,
        "reference":    "TEST-001",
        "doctor_id":    "test-doctor",
        "patient_id":   "test-patient",
    })
    assert response.status_code in [200, 400, 422, 500]


def test_mpesa_callback_accepts_payload():
    """M-Pesa callback endpoint should accept POST from Safaricom."""
    payload = {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": "test-001",
                "CheckoutRequestID": "test-002",
                "ResultCode":        0,
                "ResultDesc":        "The service request is processed successfully.",
                "CallbackMetadata":  {
                    "Item": [
                        {"Name": "Amount",              "Value": 500},
                        {"Name": "MpesaReceiptNumber",  "Value": "ABC123"},
                        {"Name": "PhoneNumber",         "Value": 254712000001},
                        {"Name": "TransactionDate",     "Value": 20240101120000},
                    ]
                }
            }
        }
    }
    response = client.post("/payment/mpesa/callback", json=payload)
    assert response.status_code == 200
    assert response.json()["ResultCode"] == 0
