import pytest
from fastapi.testclient import TestClient
from main import app
from app.services.encryption import (
    generate_key_one,
    generate_key_two,
    verify_key_two,
    encrypt_record,
    decrypt_record,
)

client = TestClient(app)


# ── Encryption Unit Tests ──

def test_key_one_generation():
    """Key 1 is deterministic — same inputs always produce same key."""
    key1 = generate_key_one("12345678", "+254712000001")
    key2 = generate_key_one("12345678", "+254712000001")
    assert key1 == key2


def test_key_one_uniqueness():
    """Different patients produce different Key 1 values."""
    key1 = generate_key_one("12345678", "+254712000001")
    key2 = generate_key_one("87654321", "+254712000002")
    assert key1 != key2


def test_key_two_generation():
    """Key 2 generates a plain key, hash, and expiry."""
    plain, hashed, expires = generate_key_two()
    assert plain != hashed
    assert len(plain) > 10
    assert expires is not None


def test_key_two_verification():
    """Correct plain key verifies against its hash."""
    plain, hashed, _ = generate_key_two()
    assert verify_key_two(plain, hashed) is True


def test_key_two_wrong_key():
    """Wrong plain key does not verify against stored hash."""
    _, hashed, _ = generate_key_two()
    assert verify_key_two("wrongkey", hashed) is False


def test_record_encryption_decryption():
    """Data encrypted and decrypted with same Key 1 hash matches original."""
    key_one_hash = generate_key_one("12345678", "+254712000001")
    _, key_two_hash, _ = generate_key_two()
    original = '{"name": "Jane", "allergies": "Penicillin"}'

    encrypted = encrypt_record(original, key_one_hash)
    assert encrypted != original

    decrypted = decrypt_record(encrypted, key_one_hash, key_two_hash)
    assert decrypted == original


def test_record_decryption_requires_both_keys():
    """Decryption with missing keys raises PermissionError."""
    key_one_hash = generate_key_one("12345678", "+254712000001")
    original     = '{"name": "Jane"}'
    encrypted    = encrypt_record(original, key_one_hash)

    with pytest.raises(PermissionError):
        decrypt_record(encrypted, key_one_hash, "")


# ── API Tests ──

def test_request_access_invalid_patient():
    """Record access request with invalid patient ID should fail."""
    response = client.post("/records/request-access", json={
        "patient_id": "nonexistent",
        "doctor_id":  "nonexistent",
    })
    assert response.status_code == 404
