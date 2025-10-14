from typing import Set
from fastapi import WebSocket
import time


class ConnectionManager:
    def __init__(self) -> None:
        self.active: Set[WebSocket] = set()
        self._last_broadcast_at: float = 0.0
        self._pending: list = []
        self._debounce_window_ms: int = 200  # batch within 200ms

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket: WebSocket):
        try:
            self.active.discard(websocket)
        except Exception:
            pass

    async def broadcast_json(self, data):
        now = time.monotonic() * 1000
        # if last broadcast very recent, push to pending and send a single batched payload
        if now - self._last_broadcast_at < self._debounce_window_ms:
            self._pending.append(data)
            return
        # Send current and any pending as batch
        payload = [data] + (self._pending or [])
        self._pending = []
        self._last_broadcast_at = now
        for ws in list(self.active):
            try:
                await ws.send_json({ 'type': 'alerts.batch', 'items': payload })
            except Exception:
                self.disconnect(ws)

manager = ConnectionManager()
