from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict
import json

# Stores active WebSocket connections per hospital
# { hospital_id: [websocket1, websocket2, ...] }
active_connections: Dict[str, list[WebSocket]] = {}


async def connect(websocket: WebSocket, hospital_id: str):
    await websocket.accept()
    if hospital_id not in active_connections:
        active_connections[hospital_id] = []
    active_connections[hospital_id].append(websocket)
    print(f"Doctor connected to hospital queue: {hospital_id}")


def disconnect(websocket: WebSocket, hospital_id: str):
    if hospital_id in active_connections:
        active_connections[hospital_id].remove(websocket)
    print(f"Doctor disconnected from hospital queue: {hospital_id}")


async def broadcast_queue_update(hospital_id: str, queue_data: list):
    """
    Sends live queue update to all connected doctors in a hospital.
    Called whenever a patient arrives, gets called, or an appointment updates.
    Doctors see their queue update in real time — no page refresh needed.
    """
    if hospital_id not in active_connections:
        return

    message = json.dumps({
        "type":  "queue_update",
        "queue": queue_data,
    })

    dead_connections = []
    for connection in active_connections[hospital_id]:
        try:
            await connection.send_text(message)
        except Exception:
            dead_connections.append(connection)

    # Clean up dead connections
    for dead in dead_connections:
        active_connections[hospital_id].remove(dead)
