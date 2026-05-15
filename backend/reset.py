# Run this once in a Python shell or add a reset.py file
from app.database import SessionLocal
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.hospital import Hospital
from app.models.appointment import Appointment
from app.models.session import ChatSession

db = SessionLocal()
db.query(Appointment).delete()
db.query(ChatSession).delete()
db.query(Doctor).delete()
db.query(Patient).delete()
db.query(Hospital).delete()
db.commit()
db.close()
print("✅ All demo data cleared.")