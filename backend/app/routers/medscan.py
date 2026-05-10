from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.prescription import Prescription
from app.agents.medscan_agent import run_medscan_agent

router = APIRouter()


class MedScanRequest(BaseModel):
    patient_id:      str
    medication_name: str
    patient_message: str = ""


@router.post("/check")
async def check_medication(data: MedScanRequest, db: Session = Depends(get_db)):
    """
    Standalone MedScan endpoint.
    Also called by the orchestrator mid-conversation.
    Pulls patient's active prescriptions to check for clashes.
    """
    # Get patient's active medications from prescriptions table
    active_prescriptions = db.query(Prescription).filter(
        Prescription.patient_id == data.patient_id,
        Prescription.is_active  == True,
    ).all()

    current_medications = [p.medication_name for p in active_prescriptions]

    result = await run_medscan_agent(
        medication_name=data.medication_name,
        patient_message=data.patient_message,
        current_medications=current_medications,
    )

    return result
