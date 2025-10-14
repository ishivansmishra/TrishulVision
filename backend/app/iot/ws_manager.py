from typing import Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket: WebSocket):
        try:
            self.active.discard(websocket)
        except Exception:
            pass

    async def broadcast_json(self, data):
        for ws in list(self.active):
            try:
                sensor_filter = ws.scope.get('sensor') if hasattr(ws, 'scope') else None
                if sensor_filter:
                    payload_sensor = None
                    try:
                        payload_sensor = (data.get('data') or {}).get('sensor')
                    except Exception:
                        payload_sensor = None
                    if payload_sensor != sensor_filter:
                        continue
                await ws.send_json(data)
            except Exception:
                self.disconnect(ws)


manager = ConnectionManager()