import math
from typing import List
from sqlalchemy.orm import Session
from app.models.hospital import Hospital


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates distance in kilometres between two GPS coordinates.
    Used to find nearest hospitals to the patient's location.
    """
    R = 6371  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def estimate_travel_time(distance_km: float) -> str:
    """
    Rough travel time estimate based on distance.
    Assumes average Kenyan road speed of ~30km/h for accuracy.
    """
    minutes = int((distance_km / 30) * 60)
    if minutes < 60:
        return f"{minutes} min"
    hours = minutes // 60
    mins  = minutes % 60
    return f"{hours}h {mins}min" if mins else f"{hours}h"


def get_nearby_hospitals(
    db: Session,
    patient_lat: float,
    patient_lon: float,
    limit: int = 5
) -> List[dict]:
    """
    Returns nearest hospitals sorted by distance from patient location.
    Only returns active hospitals registered in the CivTech system.
    """
    hospitals = db.query(Hospital).filter(
        Hospital.is_active == True,
        Hospital.latitude.isnot(None),
        Hospital.longitude.isnot(None),
    ).all()

    results = []
    for h in hospitals:
        distance = haversine_distance(
            patient_lat, patient_lon,
            h.latitude, h.longitude
        )
        results.append({
            "id":            h.id,
            "name":          h.name,
            "county":        h.county,
            "town":          h.town,
            "phone":         h.phone_number,
            "distance_km":   distance,
            "travel_time":   estimate_travel_time(distance),
            "latitude":      h.latitude,
            "longitude":     h.longitude,
        })

    # Sort by distance — nearest first
    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]
