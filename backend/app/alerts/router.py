from fastapi import APIRouter, Depends, HTTPException, status, WebSocket
from ..mongo import get_db
from datetime import datetime
from typing import List, Dict, Any
from .ws_manager import manager
from jose import jwt, JWTError
from ..config import settings

router = APIRouter()


@router.get('/')
async def list_alerts(db = Depends(get_db)) -> List[Dict[str, Any]]:
    col = db.get_collection('alerts')
    cursor = col.find({}).sort('created_at', -1).limit(200)
    out: List[Dict[str, Any]] = []
    async for a in cursor:
        out.append({
            'id': str(a.get('_id')),
            'type': a.get('type', 'info'),
            'title': a.get('title'),
            'location': a.get('location'),
            'area': a.get('area'),
            'description': a.get('description'),
            'created_at': a.get('created_at').isoformat() if a.get('created_at') else None,
            'acknowledged': a.get('acknowledged', False),
        })
    return out


@router.post('/geofence/check')
async def geofence_check(payload: Dict[str, Any], db = Depends(get_db)):
    """
    Check detections outside a lease boundary; create alert if count exceeds threshold.
    Body: { lease: GeoJSON, threshold: int=1, report_id?: str }
    """
    from ..mining.router import _parse_geom_types
    lease = payload.get('lease')
    threshold = int(payload.get('threshold') or 1)
    report_id = payload.get('report_id')
    if not isinstance(lease, dict):
        raise HTTPException(status_code=400, detail='lease is required (GeoJSON)')
    # Reuse compliance logic via internal call
    try:
        from ..mining.router import compliance_check  # type: ignore
        result = await compliance_check(lease, db, report_id, None)  # type: ignore
    except Exception:
        # fallback minimal check: just return empty
        result = { 'outside_count': 0, 'outside': [] }
    cnt = int(result.get('outside_count') or 0)
    alert = None
    if cnt >= max(1, threshold):
        alert_doc = {
            'type': 'violation',
            'title': 'Geo-fence breach detected',
            'location': None,
            'area': None,
            'description': f"Detections outside lease: {cnt}",
            'created_at': datetime.utcnow(),
            'acknowledged': False,
        }
        r = await db.get_collection('alerts').insert_one(alert_doc)
        alert = { 'id': str(r.inserted_id), **{k: v for k,v in alert_doc.items() if k != '_id'} }
        try:
            await manager.broadcast_json({ 'type': 'alert.created', 'payload': alert })
        except Exception:
            pass
        try:
            from ..utils.n8n_client import emit_event
            await emit_event('alerts.geofence.breach', { 'count': cnt, 'report_id': report_id })
        except Exception:
            pass
    return { 'outside_count': cnt, 'alert': alert }


@router.post('/')
async def create_alert(payload: Dict[str, Any], db = Depends(get_db)):
    col = db.get_collection('alerts')
    doc = {
        'type': payload.get('type', 'info'),
        'title': payload.get('title') or 'Alert',
        'location': payload.get('location'),
        'area': payload.get('area'),
        'description': payload.get('description'),
        'created_at': datetime.utcnow(),
        'acknowledged': False,
    }
    r = await col.insert_one(doc)
    out = { 'id': str(r.inserted_id), **{k: v for k, v in doc.items() if k != '_id'} }
    # Broadcast to WS listeners
    try:
        await manager.broadcast_json({ 'type': 'alert.created', 'payload': out })
    except Exception:
        pass
    return out


@router.post('/{alert_id}/ack')
async def acknowledge_alert(alert_id: str, db = Depends(get_db)):
    col = db.get_collection('alerts')
    res = await col.update_one({ '_id': alert_id }, { '$set': { 'acknowledged': True } })
    if res.matched_count == 0:
        # try ObjectId fallback if ObjectId used by mongo
        from bson import ObjectId
        try:
            oid = ObjectId(alert_id)
            res = await col.update_one({ '_id': oid }, { '$set': { 'acknowledged': True } })
            if res.matched_count == 0:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Alert not found')
        except Exception:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Alert not found')
    return { 'status': 'ok' }


@router.websocket('/ws')
async def alerts_ws(ws: WebSocket):
    # Require JWT token via query string (?token=...)
    token = ws.query_params.get('token')
    if not token:
        await ws.close(code=4401)
        return
    try:
        user = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        ws.scope['user'] = user
    except JWTError:
        await ws.close(code=4401)
        return
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except Exception:
        pass
    finally:
        manager.disconnect(ws)
