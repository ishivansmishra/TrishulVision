from fastapi import APIRouter, Depends, WebSocket
from ..mongo import get_db
from datetime import datetime
from typing import Dict, Any, List
from .ws_manager import manager as iot_ws_manager
from jose import jwt, JWTError
from ..config import settings

router = APIRouter()
ws_manager = iot_ws_manager


@router.post('/ingest')
async def ingest(data: Dict[str, Any], db = Depends(get_db)):
    col = db.get_collection('iot_data')
    data['timestamp'] = data.get('timestamp') or datetime.utcnow()
    r = await col.insert_one(data)
    # Broadcast to any websocket clients
    try:
        await ws_manager.broadcast_json({ 'type': 'iot', 'data': { 'id': str(r.inserted_id), **data } })
    except Exception:
        pass
    return { 'id': str(r.inserted_id) }


@router.get('/')
async def list_iot(sensor: str | None = None, limit: int = 200, db = Depends(get_db)) -> List[Dict[str, Any]]:
    col = db.get_collection('iot_data')
    q = { 'sensor': sensor } if sensor else {}
    cursor = col.find(q).sort('timestamp', -1).limit(max(1, min(limit, 1000)))
    out: List[Dict[str, Any]] = []
    async for d in cursor:
        out.append({ 'id': str(d.get('_id')), **{ k: v for k, v in d.items() if k != '_id' } })
    return out


@router.post('/anomaly-score')
async def anomaly_score(values: List[float]) -> Dict[str, Any]:
    """Return anomaly score in [0,1] and boolean flag."""
    try:
        from ..ai.pytorch_inference import get_iot_anomaly_scorer
        scorer = get_iot_anomaly_scorer()
        score = scorer.score_series(list(values or []))
        return { 'score': float(score), 'anomaly': bool(score >= 0.6) }
    except Exception as e:
        # Non-fatal
        return { 'score': 0.0, 'anomaly': False, 'note': f'error: {e}' }


@router.websocket('/ws')
async def iot_ws(websocket: WebSocket):
    # Require token in query string (?token=...)
    token = websocket.query_params.get('token')
    if not token:
        await websocket.close(code=4401)
        return
    try:
        user = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        websocket.scope['user'] = user
    except JWTError:
        await websocket.close(code=4401)
        return
    # Optional sensor filter (?sensor=...)
    sensor = websocket.query_params.get('sensor')
    if sensor:
        websocket.scope['sensor'] = sensor
    await ws_manager.connect(websocket)
    try:
        while True:
            # keep alive; ignore incoming
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        ws_manager.disconnect(websocket)
