from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any, Dict, Optional

import httpx

from ..config import settings


N8N_HEADER_SIGNATURE = "X-Signature"
N8N_HEADER_INBOUND_SECRET = "X-N8N-Secret"


def _hmac_sha256(payload: bytes, secret: str) -> str:
    mac = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256)
    return mac.hexdigest()


async def emit_event(event: str, data: Dict[str, Any]) -> bool:
    """
    Send an event to n8n. Prefers a configured webhook URL, otherwise uses REST API if base URL + key are set.
    Returns True on best-effort success, False on non-fatal failure.
    """
    if not settings.N8N_ENABLED:
        return False

    payload = {"event": event, "data": data}
    body = json.dumps(payload, default=str).encode("utf-8")

    # Try Webhook URL first
    if settings.N8N_EVENT_WEBHOOK_URL:
        headers: Dict[str, str] = {"Content-Type": "application/json"}
        if settings.N8N_SIGNATURE_SECRET:
            headers[N8N_HEADER_SIGNATURE] = _hmac_sha256(body, settings.N8N_SIGNATURE_SECRET)
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(settings.N8N_EVENT_WEBHOOK_URL, content=body, headers=headers)
                r.raise_for_status()
                return True
        except Exception:
            return False

    # Fallback: use n8n REST API Execute Workflow endpoint if provided
    if settings.N8N_BASE_URL and settings.N8N_API_KEY:
        url = settings.N8N_BASE_URL.rstrip("/") + "/rest/workflows/run"
        # This endpoint may vary by n8n version; alternatively call a specific workflow ID
        headers = {
            "Content-Type": "application/json",
            "X-N8N-API-KEY": settings.N8N_API_KEY,
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(url, json=payload, headers=headers)
                r.raise_for_status()
                return True
        except Exception:
            return False

    return False


def verify_inbound_secret(header_value: Optional[str]) -> bool:
    """Verify that inbound callbacks from n8n include the configured shared secret header."""
    if not settings.N8N_INBOUND_SECRET:
        return False
    return (header_value or "") == settings.N8N_INBOUND_SECRET


def verify_hmac_signature(body: bytes, signature_hex: Optional[str]) -> bool:
    """If signature secret is set, verify the HMAC hex digest in header."""
    if not settings.N8N_SIGNATURE_SECRET:
        return False
    if not signature_hex:
        return False
    expected = _hmac_sha256(body, settings.N8N_SIGNATURE_SECRET)
    try:
        return hmac.compare_digest(expected, signature_hex)
    except Exception:
        return False
