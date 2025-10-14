from fastapi import APIRouter
import logging
from .config import settings
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from pydantic import BaseModel
import smtplib
from email.message import EmailMessage
from typing import Optional

router = APIRouter()


@router.get("/db")
def db_status():
    """Quick diagnostic endpoint to check MongoDB connectivity.

    Returns JSON indicating whether Mongo is reachable and any error message.
    This is safe for debugging but should not expose secrets in production logs.
    """
    url = settings.MONGO_URL
    if not url:
        return {"ok": False, "reason": "MONGO_URL not set", "demo_mode": True}
    try:
        client = MongoClient(url, serverSelectionTimeoutMS=5000)
        # ping to force a server selection
        client.admin.command('ping')
        # optional: list databases (may require privileges)
        try:
            dbs = client.list_database_names()
        except Exception:
            dbs = None
        return {"ok": True, "mongo_ok": True, "databases": dbs}
    except PyMongoError as e:
        logging.warning("Mongo connection failed: %s", e)
        return {"ok": False, "reason": str(e), "demo_mode": True}
    except Exception as e:
        logging.warning("Unexpected error checking Mongo: %s", e)
        return {"ok": False, "reason": str(e), "demo_mode": True}



class SmtpTestIn(BaseModel):
    to_email: str
    subject: Optional[str] = "TrishulVision SMTP test"
    body: Optional[str] = "This is a test message from TrishulVision backend."


@router.post('/smtp_test')
def smtp_test(payload: SmtpTestIn):
    """Attempt to send a test email using current SMTP settings.

    Returns ok: true/false and a non-sensitive message. Does not return SMTP credentials.
    """
    if not settings.SMTP_HOST:
        return {"ok": False, "reason": "SMTP_HOST not configured"}
    msg = EmailMessage()
    frm = settings.SMTP_FROM or settings.SMTP_USER or "no-reply@localhost"
    msg['From'] = frm
    msg['To'] = payload.to_email
    msg['Subject'] = payload.subject or "TrishulVision SMTP test"
    msg.set_content(payload.body or "Test")
    try:
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as s:
                if settings.SMTP_USER:
                    s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                s.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as s:
                if settings.SMTP_TLS:
                    s.starttls()
                if settings.SMTP_USER:
                    s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                s.send_message(msg)
        return {"ok": True, "note": "Email accepted by SMTP client (check recipient inbox)."}
    except Exception as e:
        logging.warning("SMTP test failed: %s", e)
        return {"ok": False, "reason": str(e)}


@router.get('/runtime')
def runtime_info():
    """Return safe runtime diagnostic info: non-secret settings and resolved CORS origins.

    This endpoint intentionally avoids returning secrets (passwords, keys).
    """
    # Resolve CORS origins similar to main.py
    cors_origins = []
    # default: no explicit frontend in runtime; include empty list unless configured
    if settings.FRONTEND_ORIGIN:
        extra = [o.strip().rstrip('/') for o in str(settings.FRONTEND_ORIGIN).split(',') if o.strip()]
        cors_origins.extend(extra)
    # dedupe while preserving order
    seen = set(); deduped = []
    for o in cors_origins:
        if o not in seen:
            seen.add(o); deduped.append(o)
    cors_origins = deduped

    allow_origin_regex = r"^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d{2,5}$|^https?:\/\/([A-Za-z0-9-]+\.)?(vercel\.app|onrender\.com)(:\d{1,5})?$"

    return {
        "ok": True,
        "frontend_base": settings.FRONTEND_BASE,
        "frontend_origin_env": settings.FRONTEND_ORIGIN,
        "google_redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "resolved_cors_allow_origins": cors_origins,
        "resolved_cors_allow_origin_regex": allow_origin_regex,
    }
