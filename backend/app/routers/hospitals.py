from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.location import get_nearby_hospitals
from app.models.hospital import Hospital
from app.models.doctor import Doctor, DoctorStatus

router = APIRouter()


@router.get("/nearby")
async def nearby_hospitals(
    lat: float = Query(...),
    lon: float = Query(...),
    db: Session = Depends(get_db),
):
    """
    Returns nearest hospitals to the patient's GPS location.
    Called by the Chat page after the AI decides to route to hospital.
    """
    hospitals = get_nearby_hospitals(db, lat, lon, limit=5)
    return hospitals


@router.get("/all")
async def all_hospitals(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).filter(Hospital.is_active == True).all()
    return [
        {
            "id":       h.id,
            "name":     h.name,
            "county":   h.county,
            "town":     h.town,
            "phone":    h.phone_number,
            "latitude": h.latitude,
            "longitude":h.longitude,
        }
        for h in hospitals
    ]


@router.get("/{hospital_id}/doctors")
async def hospital_doctors(hospital_id: str, db: Session = Depends(get_db)):
    """
    Returns all available doctors at a specific hospital.
    Used when patient selects a hospital to show who is on duty.
    """
    doctors = db.query(Doctor).filter(
        Doctor.hospital_id == hospital_id,
        Doctor.status      == DoctorStatus.AVAILABLE,
        Doctor.is_active   == True,
    ).all()

    return [
        {
            "id":               d.id,
            "name":             d.full_name,
            "specialisation":   d.specialisation,
            "consultation_fee": d.consultation_fee,
            "status":           d.status,
        }
        for d in doctors
    ]
