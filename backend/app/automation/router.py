from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel

from ..dependencies import get_current_user
from ..utils.n8n_client import emit_event, verify_inbound_secret, N8N_HEADER_INBOUND_SECRET


router = APIRouter()


class EmitEventIn(BaseModel):
    event: str
    data: dict


@router.post("/emit")
async def emit(inp: EmitEventIn, user = Depends(get_current_user)):
    # Only authenticated users; authorities may emit cross-cutting events
    ok = await emit_event(inp.event, {**inp.data, "user": (user or {}).get("sub")})
    return {"sent": bool(ok)}


class ThresholdIn(BaseModel):
    report_id: str
    illegal_area_threshold_ha: float = 0.0
    notify: list[str] | None = None  # ['sms','email'] handled by n8n


@router.post('/alerts/threshold')
async def alerts_threshold(inp: ThresholdIn):
    """Emit an automation event for alerts when illegal area exceeds a threshold."""
    payload = {
        'report_id': inp.report_id,
        'illegal_area_threshold_ha': float(inp.illegal_area_threshold_ha),
        'notify': inp.notify or ['email'],
    }
    ok = await emit_event('alerts.threshold.trigger', payload)
    return { 'sent': bool(ok) }


class VoiceNotifyIn(BaseModel):
    to_numbers: list[str]
    message: str


@router.post('/voice/notify')
async def voice_notify(inp: VoiceNotifyIn):
    """Trigger a voice TTS call via automation (n8n Twilio/Plivo/etc.)."""
    payload = { 'to': inp.to_numbers, 'message': inp.message }
    ok = await emit_event('voice.notify', payload)
    return { 'sent': bool(ok) }


@router.post("/callback")
async def callback(
    request: Request,
    x_n8n_secret: str | None = Header(default=None, alias=N8N_HEADER_INBOUND_SECRET),
):
    # Shared secret check
    if not verify_inbound_secret(x_n8n_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid n8n secret")

    try:
        body = await request.json()
    except Exception:
        body = {}

    # TODO: route callback types to internal handlers (update job, send alert, etc.)
    # For now, just acknowledge
    return {"ok": True, "received": body}
