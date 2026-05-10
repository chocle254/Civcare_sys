import math
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate straight-line distance between two GPS coordinates in km."""
    R = 6371  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def estimate_travel_time(distance_km: float) -> str:
    """Rough driving time estimate for Kenyan roads."""
    minutes = (distance_km / 30) * 60  # Assume avg 30 km/h in urban/peri-urban Kenya
    if minutes < 5:
        return "< 5 min"
    elif minutes < 60:
        return f"{int(minutes)} min"
    else:
        hours = minutes / 60
        return f"{hours:.1f} hr"


@router.get("/nearby")
async def get_nearby_hospitals(lat: float, lon: float, radius_km: int = 10):
    """
    Queries OpenStreetMap Overpass API for hospitals near the patient.
    Returns a sorted list by distance with name, distance, and travel time.
    No API key needed — completely free.
    """
    radius_m = radius_km * 1000

    # Overpass query — finds hospital nodes and ways within radius
    query = f"""
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:{radius_m},{lat},{lon});
      node["amenity"="clinic"](around:{radius_m},{lat},{lon});
      node["healthcare"="hospital"](around:{radius_m},{lat},{lon});
      way["amenity"="hospital"](around:{radius_m},{lat},{lon});
    );
    out center;
    """

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(OVERPASS_URL, data={"data": query})
            res.raise_for_status()
            data = res.json()
    except Exception as e:
        print(f"Overpass API error: {e}")
        raise HTTPException(status_code=503, detail="Could not reach map service. Please try again.")

    hospitals = []
    seen_names = set()

    for element in data.get("elements", []):
        tags = element.get("tags", {})
        name = tags.get("name") or tags.get("name:en")

        # Skip unnamed or duplicate hospitals
        if not name or name in seen_names:
            continue
        seen_names.add(name)

        # Get coordinates — nodes have lat/lon directly, ways use center
        if element["type"] == "node":
            h_lat = element["lat"]
            h_lon = element["lon"]
        else:
            center = element.get("center", {})
            h_lat = center.get("lat")
            h_lon = center.get("lon")
            if not h_lat or not h_lon:
                continue

        distance_km = haversine_km(lat, lon, h_lat, h_lon)

        hospitals.append({
            "id":           str(element["id"]),
            "name":         name,
            "town":         tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:suburb") or "Nearby",
            "county":       tags.get("addr:county") or tags.get("addr:state") or "",
            "phone":        tags.get("phone") or tags.get("contact:phone") or "",
            "address":      tags.get("addr:street") or "",
            "distance_km":  round(distance_km, 1),
            "travel_time":  estimate_travel_time(distance_km),
            "lat":          h_lat,
            "lon":          h_lon,
            "source":       "openstreetmap",
        })

    # Sort by nearest first
    hospitals.sort(key=lambda h: h["distance_km"])

    # Return top 8 closest
    return hospitals[:8]
