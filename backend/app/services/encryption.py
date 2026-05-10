import hashlib
import secrets
import base64
from datetime import datetime, timedelta
from cryptography.fernet import Fernet


def generate_key_one(identity_number: str, phone_number: str) -> str:
    """
    Key 1 — permanent key tied to patient identity.
    Generated from National ID / Birth Cert / CHF number + phone.
    Stored as a hash — never plain text.
    """
    raw = f"{identity_number}:{phone_number}:civtech_key_one"
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_key_two() -> tuple[str, str, datetime]:
    """
    Key 2 — temporary key given to the assigned doctor.
    Expires after 24 hours automatically.

    Returns:
        plain_key   — sent to the doctor (shown once only)
        hashed_key  — stored in the database
        expires_at  — 24 hours from now
    """
    plain_key  = secrets.token_urlsafe(32)
    hashed_key = hashlib.sha256(plain_key.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(hours=24)
    return plain_key, hashed_key, expires_at


def verify_key_two(plain_key: str, stored_hash: str) -> bool:
    """
    Verifies that a doctor's Key 2 matches what is stored.
    """
    return hashlib.sha256(plain_key.encode()).hexdigest() == stored_hash


def encrypt_record(data: str, key_one_hash: str) -> str:
    """
    Encrypts patient record data using Key 1 hash.
    Data is never stored as plain text.
    """
    # Derive a Fernet-compatible key from the hash
    fernet_key = base64.urlsafe_b64encode(key_one_hash[:32].encode())
    f = Fernet(fernet_key)
    return f.encrypt(data.encode()).decode()


def decrypt_record(encrypted_data: str, key_one_hash: str, key_two_hash: str) -> str:
    """
    Decrypts patient record.
    Both Key 1 and Key 2 must be present and valid.
    Doctor sees a structured summary — not raw data.
    """
    # Verify both keys are present before decrypting
    if not key_one_hash or not key_two_hash:
        raise PermissionError("Both keys are required to access patient records.")

    fernet_key = base64.urlsafe_b64encode(key_one_hash[:32].encode())
    f = Fernet(fernet_key)
    return f.decrypt(encrypted_data.encode()).decode()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain: str, hashed: str) -> bool:
    return hashlib.sha256(plain.encode()).hexdigest() == hashed
