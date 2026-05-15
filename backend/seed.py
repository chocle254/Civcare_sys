"""
CivTech Care System — Demo Seed Script
=======================================
Run this ONCE to populate your database with demo hospitals, doctors,
patients, sessions, and appointments for hackathon demonstration.

Usage:
  python seed.py

Safe to re-run — checks for existing records before inserting.
"""

import json
import uuid
from datetime import datetime, timedelta

from app.database import SessionLocal, create_tables
from app.models.patient     import Patient, IdentityType
from app.models.doctor      import Doctor, DoctorStatus
from app.models.appointment import Appointment, AppointmentStatus
from app.models.session     import ChatSession, SessionStatus, SessionType
from app.services.encryption import generate_key_one, hash_password

# Try to import Hospital model — adjust path if different in your project
try:
    from app.models.hospital import Hospital
    HAS_HOSPITAL_MODEL = True
except ImportError:
    HAS_HOSPITAL_MODEL = False
    print("⚠️  Hospital model not found — skipping hospital seeding. Add hospitals manually.")


# ─────────────────────────────────────────────
# DEMO DATA DEFINITIONS
# ─────────────────────────────────────────────

HOSPITALS = [
    {
        "id":            "hosp-001",
        "name":          "Kenyatta National Hospital",
        "facility_code": "KNH-001",          # ← add this
        "town":          "Nairobi",
        "county":        "Nairobi",
        "phone_number":  "+254202726300",     # ← was "phone"
        "address":       "Hospital Road, Upper Hill",
        "latitude":      -1.3013,
        "longitude":     36.8071,
    },
    {
        "id":            "hosp-002",
        "name":          "Aga Khan University Hospital",
        "facility_code": "AKH-001",          # ← add this
        "town":          "Nairobi",
        "county":        "Nairobi",
        "phone_number":  "+254203662000",     # ← was "phone"
        "address":       "3rd Parklands Avenue",
        "latitude":      -1.2624,
        "longitude":     36.8193,
    },
    {
        "id":            "hosp-003",
        "name":          "Kisumu County Referral Hospital",
        "facility_code": "KCR-001",          # ← add this
        "town":          "Kisumu",
        "county":        "Kisumu",
        "phone_number":  "+254572020226",     # ← was "phone"
        "address":       "Kisumu-Nairobi Highway",
        "latitude":      -0.0917,
        "longitude":     34.7679,
    },
]

DOCTORS = [
    {
        "id":               "doc-001",
        "full_name":        "Dr. James Mwangi",
        "email":            "KMPDB-DEMO-001@civtech.local",
        "phone_number":     "+254700000101",
        "kmpdb_license":    "KMPDB-DEMO-001",
        "specialisation":   "General Practitioner",
        "hospital_id":      "hosp-001",
        "consultation_fee": 500.0,
        "national_id":      "DEMO-NID-001",          # ← add this
        "password_hash":    hash_password("DEMO-NID-001"),  # ← replaces "password"
        "status":           DoctorStatus.AVAILABLE,
        "shift_start":      "08:00",
        "shift_end":        "17:00",
        "is_verified":      True,
        "is_active":        True,
    },
    {
        "id":               "doc-002",
        "full_name":        "Dr. Fatuma Hassan",
        "email":            "KMPDB-DEMO-002@civtech.local",
        "phone_number":     "+254700000102",
        "kmpdb_license":    "KMPDB-DEMO-002",
        "specialisation":   "Internal Medicine",
        "hospital_id":      "hosp-002",
        "consultation_fee": 800.0,
        "national_id":      "DEMO-NID-002",
        "password_hash":    hash_password("DEMO-NID-002"),
        "status":           DoctorStatus.AVAILABLE,
        "shift_start":      "09:00",
        "shift_end":        "18:00",
        "is_verified":      True,
        "is_active":        True,
    },
    {
        "id":               "doc-003",
        "full_name":        "Dr. Peter Odhiambo",
        "email":            "KMPDB-DEMO-003@civtech.local",
        "phone_number":     "+254700000103",
        "kmpdb_license":    "KMPDB-DEMO-003",
        "specialisation":   "Emergency Medicine",
        "hospital_id":      "hosp-001",
        "consultation_fee": 1000.0,
        "national_id":      "DEMO-NID-003",
        "password_hash":    hash_password("DEMO-NID-003"),
        "status":           DoctorStatus.WITH_PATIENT,
        "shift_start":      "07:00",
        "shift_end":        "19:00",
        "is_verified":      True,
        "is_active":        True,
    },
]

PATIENTS = [
    {
        "id":              "pat-001",
        "full_name":       "Alice Wanjiru",
        "phone_number":    "+254711000001",
        "identity_number": "DEMO-ID-001",
        "identity_type":   IdentityType.NATIONAL_ID,
        "age":             "28",
        "location":        "Nairobi",
        "key_one_hash":    generate_key_one("DEMO-ID-001", "+254711000001"),
        "is_verified":     True,
        "sessions": [
            {
                "id":           "sess-alice-001",
                "type":         SessionType.TRIAGE,
                "status":       SessionStatus.COMPLETED,
                "risk_score":   "moderate",
                "risk_score_numeric": "52",
                "ai_assessment": "Patient presenting with classic malaria symptoms — fever, chills, body aches. Onset 3 days ago. No known allergies. Recommended hospital visit for blood test and treatment.",
                "ai_confidence": "84%",
                "started_at":  datetime.utcnow() - timedelta(days=21),
                "completed_at": datetime.utcnow() - timedelta(days=21, hours=-2),
                "routed_to_hospital_id": "hosp-001",
                "messages": [
                    {"role": "patient", "content": "I have been feeling very cold and shivering since yesterday night"},
                    {"role": "ai",      "content": "I am sorry to hear that. How long have you been experiencing the chills and shivering?"},
                    {"role": "patient", "content": "Since yesterday evening, maybe 15 hours now"},
                    {"role": "ai",      "content": "Do you also have a fever along with the chills? Can you rate how bad you feel from 1 to 10?"},
                    {"role": "patient", "content": "Yes I feel very hot then cold. I would say 7 out of 10"},
                    {"role": "ai",      "content": "Are you experiencing any headache, body aches, or have you vomited?"},
                    {"role": "patient", "content": "Yes headache and body pains and I vomited once this morning"},
                    {"role": "ai",      "content": "Thank you Alice. Based on what you have described, these symptoms are consistent with a possible malaria infection. Are you able to travel to a hospital today?"},
                    {"role": "patient", "content": "Yes I can go"},
                    {"role": "ai",      "content": "Good. I am finding the nearest hospital to you now. Please go as soon as possible — malaria symptoms can worsen quickly if not treated early."},
                ],
                "appointment": {
                    "id":               "appt-alice-001",
                    "hospital_id":      "hosp-001",
                    "doctor_id":        "doc-001",
                    "status":           AppointmentStatus.COMPLETED,
                    "risk_score":       "moderate",
                    "risk_numeric":     "52",
                    "symptoms_summary": "Fever, chills, body aches, vomiting. Onset 15 hours. Possible malaria.",
                    "arrived_at":       datetime.utcnow() - timedelta(days=21, hours=-3),
                    "completed_at":     datetime.utcnow() - timedelta(days=21, hours=-5),
                },
            },
            {
                "id":           "sess-alice-002",
                "type":         SessionType.TRIAGE,
                "status":       SessionStatus.ACTIVE,
                "risk_score":   "low",
                "risk_score_numeric": "28",
                "ai_assessment": "Patient returning after malaria treatment 3 weeks ago. Now experiencing mild headache. Could be post-malaria fatigue or tension headache. Still gathering data.",
                "ai_confidence": "61%",
                "started_at":  datetime.utcnow() - timedelta(hours=2),
                "completed_at": None,
                "routed_to_hospital_id": None,
                "messages": [
                    {"role": "patient", "content": "I had malaria 3 weeks ago and I was treated but now I have a headache"},
                    {"role": "ai",      "content": "Welcome back Alice. I can see you were treated for malaria recently. Is this headache similar to the one you had during the malaria episode?"},
                    {"role": "patient", "content": "Not really this one is more at the front of my head"},
                    {"role": "ai",      "content": "Do you have any fever or chills with this headache, or is it just the head pain?"},
                    {"role": "patient", "content": "No fever just the headache and I feel a bit tired"},
                ],
            },
        ],
    },
    {
        "id":              "pat-002",
        "full_name":       "Brian Otieno",
        "phone_number":    "+254711000002",
        "identity_number": "DEMO-ID-002",
        "identity_type":   IdentityType.NATIONAL_ID,
        "age":             "45",
        "location":        "Kisumu",
        "key_one_hash":    generate_key_one("DEMO-ID-002", "+254711000002"),
        "is_verified":     True,
        "sessions": [
            {
                "id":           "sess-brian-001",
                "type":         SessionType.TRIAGE,
                "status":       SessionStatus.COMPLETED,
                "risk_score":   "moderate",
                "risk_score_numeric": "61",
                "ai_assessment": "Patient with known hypertension. Reports medication (Amlodipine 5mg) not controlling blood pressure well. Dizziness and persistent headaches. Routed to online consultation with internal medicine specialist.",
                "ai_confidence": "79%",
                "started_at":  datetime.utcnow() - timedelta(days=7),
                "completed_at": datetime.utcnow() - timedelta(days=7, hours=-1),
                "routed_to_hospital_id": None,
                "messages": [
                    {"role": "patient", "content": "I have hypertension and my medication does not seem to be working anymore"},
                    {"role": "ai",      "content": "I am sorry to hear that Brian. What medication are you currently taking for your blood pressure?"},
                    {"role": "patient", "content": "Amlodipine 5mg once a day"},
                    {"role": "ai",      "content": "How long have you been on Amlodipine, and when did you start noticing it was not working well?"},
                    {"role": "patient", "content": "2 years now. But the last 3 weeks I have been having bad headaches and dizziness"},
                    {"role": "ai",      "content": "Are you taking the medication at the same time every day, and have you missed any doses recently?"},
                    {"role": "patient", "content": "Yes I take it every morning. I have not missed any"},
                    {"role": "ai",      "content": "On a scale of 1 to 10, how severe is the headache and dizziness right now?"},
                    {"role": "patient", "content": "Headache is about 6 and dizziness is 5"},
                    {"role": "ai",      "content": "Thank you Brian. Given that your current medication does not appear to be controlling your symptoms, I recommend speaking to a doctor today. Are you able to travel to a hospital or would you prefer an online consultation?"},
                    {"role": "patient", "content": "I prefer online I am at work"},
                    {"role": "ai",      "content": "Understood. I am connecting you with an available doctor now for an online consultation."},
                ],
                "appointment": None,
            },
            {
                "id":           "sess-brian-002",
                "type":         SessionType.TRIAGE,
                "status":       SessionStatus.ACTIVE,
                "risk_score":   "moderate",
                "risk_score_numeric": "58",
                "ai_assessment": "Follow-up from hypertension consultation 7 days ago. Patient now on Amlodipine 10mg but still dizzy. Possible medication adjustment needed.",
                "ai_confidence": "72%",
                "started_at":  datetime.utcnow() - timedelta(minutes=30),
                "completed_at": None,
                "routed_to_hospital_id": None,
                "messages": [
                    {"role": "patient", "content": "The doctor increased my dose to 10mg but I am still feeling dizzy"},
                    {"role": "ai",      "content": "I can see from your last session that you were experiencing uncontrolled hypertension and were put on a higher dose. How long have you been on the 10mg dose?"},
                    {"role": "patient", "content": "5 days now"},
                    {"role": "ai",      "content": "It can sometimes take 1 to 2 weeks for a new dose to take full effect. Has the dizziness improved at all compared to last week, even slightly?"},
                    {"role": "patient", "content": "Maybe a little but still bad in the morning"},
                ],
            },
        ],
    },
    {
        "id":              "pat-003",
        "full_name":       "Grace Akinyi",
        "phone_number":    "+254711000003",
        "identity_number": "DEMO-ID-003",
        "identity_type":   IdentityType.NATIONAL_ID,
        "age":             "34",
        "location":        "Nairobi",
        "key_one_hash":    generate_key_one("DEMO-ID-003", "+254711000003"),
        "is_verified":     True,
        "sessions": [
            {
                "id":           "sess-grace-001",
                "type":         SessionType.TRIAGE,
                "status":       SessionStatus.COMPLETED,
                "risk_score":   "critical",
                "risk_score_numeric": "88",
                "ai_assessment": "Patient presenting with acute chest pain radiating to left arm, shortness of breath, and sweating. Onset sudden, 20 minutes ago. High risk of cardiac event. Immediate hospital attendance required.",
                "ai_confidence": "91%",
                "started_at":  datetime.utcnow() - timedelta(days=3),
                "completed_at": datetime.utcnow() - timedelta(days=3, minutes=-15),
                "routed_to_hospital_id": "hosp-002",
                "messages": [
                    {"role": "patient", "content": "I have a very bad pain in my chest and it is spreading to my left arm"},
                    {"role": "ai",      "content": "This sounds serious Grace. When did this pain start and how severe is it from 1 to 10?"},
                    {"role": "patient", "content": "It started about 20 minutes ago and it is 9 out of 10"},
                    {"role": "ai",      "content": "Are you also experiencing shortness of breath, sweating, or nausea?"},
                    {"role": "patient", "content": "Yes all of those I am sweating a lot and struggling to breathe"},
                    {"role": "ai",      "content": "Grace, these symptoms require immediate medical attention. Please go to the nearest emergency room right now or call 999. Are you able to get there immediately?"},
                    {"role": "patient", "content": "Yes my husband can take me"},
                    {"role": "ai",      "content": "Go immediately. I am finding the nearest hospital with emergency services for you right now. Do not wait."},
                ],
                "appointment": {
                    "id":               "appt-grace-001",
                    "hospital_id":      "hosp-002",
                    "doctor_id":        "doc-003",
                    "status":           AppointmentStatus.COMPLETED,
                    "risk_score":       "critical",
                    "risk_numeric":     "88",
                    "symptoms_summary": "Acute chest pain radiating to left arm. Shortness of breath, sweating. Sudden onset 20 min ago. Possible cardiac event.",
                    "arrived_at":       datetime.utcnow() - timedelta(days=3, minutes=-25),
                    "completed_at":     datetime.utcnow() - timedelta(days=3, hours=-3),
                },
            },
        ],
    },
]


# ─────────────────────────────────────────────
# SEED FUNCTIONS
# ─────────────────────────────────────────────

def seed_hospitals(db):
    if not HAS_HOSPITAL_MODEL:
        return
    print("\n🏥 Seeding hospitals...")
    for h in HOSPITALS:
        existing = db.query(Hospital).filter(Hospital.id == h["id"]).first()
        if existing:
            print(f"   ↳ {h['name']} already exists — skipping")
            continue
        hospital = Hospital(**{k: v for k, v in h.items()})
        db.add(hospital)
        print(f"   ✅ Created {h['name']}")
    db.commit()


def seed_doctors(db):
    print("\n👨‍⚕️ Seeding doctors...")
    for d in DOCTORS:
        existing = db.query(Doctor).filter(Doctor.email == d["email"]).first()
        if existing:
            print(f"   ↳ {d['full_name']} already exists — skipping")
            continue

        doctor_data = {k: v for k, v in d.items() if k != "national_id"}  # ← strip national_id

        doctor = Doctor(
            **doctor_data,
            last_active_at=datetime.utcnow(),
        )
        db.add(doctor)
        print(f"   ✅ Created {d['full_name']} at hospital {d['hospital_id']}")
    db.commit()


def seed_patients(db):
    print("\n🧑‍⚕️ Seeding patients, sessions, and appointments...")
    for p in PATIENTS:
        sessions_data = p.pop("sessions", [])

        existing = db.query(Patient).filter(Patient.phone_number == p["phone_number"]).first()
        if existing:
            print(f"   ↳ {p['full_name']} already exists — skipping")
            continue

        patient = Patient(**p)
        db.add(patient)
        db.flush()
        print(f"   ✅ Created patient {p['full_name']}")

        for s in sessions_data:
            appt_data      = s.pop("appointment", None)
            messages       = s.pop("messages", [])
            started_at     = s.pop("started_at",  datetime.utcnow())
            completed_at   = s.pop("completed_at", None)
            session_type   = s.pop("type")
            risk_score_num = s.pop("risk_score_numeric", None)

            session = ChatSession(
                id                     = s["id"],
                patient_id             = p["id"],
                session_type           = session_type,
                status                 = s["status"],
                risk_score             = s.get("risk_score"),
                risk_score_numeric     = risk_score_num,
                ai_assessment          = s.get("ai_assessment"),
                ai_confidence          = s.get("ai_confidence"),
                messages               = json.dumps(messages),
                started_at             = started_at,
                completed_at           = completed_at,
                routed_to_hospital_id  = s.get("routed_to_hospital_id"),
                routed_to_consultation = s.get("routed_to_consultation", False),
            )
            db.add(session)
            db.flush()  # ← THIS is the fix — session must exist before appointment references it
            print(f"      💬 Session {s['id']} ({session_type}) — {s['status']}")

            if appt_data:
                completed_at_appt = appt_data.pop("completed_at", None)
                appt = Appointment(
                    id               = appt_data["id"],
                    patient_id       = p["id"],
                    hospital_id      = appt_data["hospital_id"],
                    doctor_id        = appt_data["doctor_id"],
                    session_id       = s["id"],
                    status           = appt_data["status"],
                    risk_score       = appt_data.get("risk_score"),
                    risk_numeric     = appt_data.get("risk_numeric"),
                    symptoms_summary = appt_data.get("symptoms_summary"),
                    arrived_at       = appt_data.get("arrived_at"),
                    called_at        = appt_data.get("arrived_at"),
                    completed_at     = completed_at_appt,
                    created_at       = started_at,
                )
                db.add(appt)
                print(f"      📋 Appointment {appt_data['id']} — {appt_data['status']}")

    db.commit()


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 50)
    print("  CivTech Care — Demo Seed Script")
    print("=" * 50)

    create_tables()
    db = SessionLocal()

    try:
        seed_hospitals(db)
        seed_doctors(db)
        seed_patients(db)

        print("\n" + "=" * 50)
        print("  ✅ Seeding complete!")
        print("=" * 50)
        print("\n📋 Demo Login Credentials:")
        print("\n  DOCTORS (email / password):")
        for d in DOCTORS:
            print(f"    • {d['full_name']}: {d['email']} / DemoDoc2024!")
        print("\n  PATIENTS (phone number):")
        for p in PATIENTS:
            print(f"    • {p['full_name']}: {p['phone_number']}")
        print("\n  Hospitals seeded: KNH, Aga Khan, Kisumu County Referral")
        print()

    except Exception as e:
        db.rollback()
        print(f"\n❌ Seeding failed: {e}")
        raise
    finally:
        db.close()