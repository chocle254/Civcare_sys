"""
Push notification service.
Currently handles in-app notifications via WebSocket.
For mobile push notifications (future): integrate Firebase Cloud Messaging (FCM).
"""
from app.websocket.queue import broadcast_queue_update


async def notify_queue_update(hospital_id: str, queue_data: list):
    """
    Broadcasts a live queue update to all connected doctors
    at a given hospital via WebSocket.
    Called whenever:
    - A patient confirms arrival
    - A doctor calls a patient
    - An appointment status changes
    - A patient is redirected to a new doctor
    """
    await broadcast_queue_update(hospital_id, queue_data)


async def notify_doctor_new_patient(hospital_id: str, queue_data: list):
    """
    Notifies all online doctors at a hospital that a new
    patient has joined the queue.
    """
    await broadcast_queue_update(hospital_id, queue_data)


async def notify_consultation_request(doctor_id: str, patient_name: str):
    """
    Placeholder for future real-time doctor notification
    when a patient initiates a consultation.
    Currently handled via SMS in africastalking.py.
    Future: send via WebSocket or FCM push notification.
    """
    print(f"[Notification] Consultation request for Dr. {doctor_id} from {patient_name}")
