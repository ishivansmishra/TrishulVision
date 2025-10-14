import asyncio
import json
from datetime import datetime
from typing import Any, Dict

from ..config import settings
from ..mongo import get_db
from .ws_manager import manager


def _mqtt_available():
    try:
        import paho.mqtt.client as mqtt  # type: ignore
        return True
    except Exception:
        return False


async def start_mqtt_worker():
    if not _mqtt_available() or not settings.MQTT_BROKER_HOST:
        return  # not configured

    import paho.mqtt.client as mqtt  # type: ignore

    loop = asyncio.get_event_loop()
    db = await get_db()
    col = db.get_collection('iot_data')

    client = mqtt.Client()

    def on_connect(client, userdata, flags, rc):
        try:
            client.subscribe(settings.MQTT_TOPIC or 'trishul/iot/#')
        except Exception:
            pass

    def on_message(client, userdata, msg):
        try:
            payload = msg.payload.decode('utf-8')
            data: Dict[str, Any] = json.loads(payload)
        except Exception:
            data = { 'raw': payload if 'payload' in locals() else None }
        data['topic'] = msg.topic
        if 'timestamp' not in data:
            data['timestamp'] = datetime.utcnow()

        async def _save_and_broadcast():
            try:
                r = await col.insert_one(data)
                await manager.broadcast_json({ 'type': 'iot', 'data': { 'id': str(r.inserted_id), **data } })
            except Exception:
                pass

        # schedule coroutine on event loop
        loop.create_task(_save_and_broadcast())

    client.on_connect = on_connect
    client.on_message = on_message
    try:
        client.connect(settings.MQTT_BROKER_HOST, int(settings.MQTT_BROKER_PORT or 1883), 60)
        client.loop_start()
    except Exception:
        # Unable to connect; silently skip
        return
