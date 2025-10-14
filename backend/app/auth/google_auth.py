"""Minimal Google OAuth login/register flow (dev-friendly).

- /auth/google/redirect builds a Google OAuth2 authorization URL using values
    from settings and includes a lightweight state payload encoding `role` and
    a client redirect path (default: "/login"). The frontend can open this URL.
- /auth/google/callback exchanges the code for tokens, extracts the user's
    email from the ID token, creates/looks up a user in MongoDB, issues a JWT,
    and redirects back to the frontend with `auth_token` in the query string.

NOTE: This implementation is suitable for local development/testing. For
production you should verify Google ID token signatures and restrict/validate
redirects more strictly.
"""
from urllib.parse import urlencode
import base64
import json
from typing import Optional

import httpx
from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from jose import jwt

from ..config import settings
from ..mongo import get_db
from . import utils as auth_utils

router = APIRouter()


@router.get('/google/redirect')
async def google_redirect(role: str = "user", redirect: str = "/login"):
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        return {"status": "error", "note": "google client id not configured"}

    # Lightweight state payload (base64url-encoded JSON). In production,
    # consider signing this (e.g., with JWT) to prevent tampering.
    state_payload = {"role": role if role in ("authority", "user") else "user", "redirect": redirect}
    state = base64.urlsafe_b64encode(json.dumps(state_payload).encode()).decode().rstrip("=")

    params = {
        'client_id': client_id,
        'response_type': 'code',
        'scope': 'openid email profile',
        'redirect_uri': 'http://localhost:8000/auth/google/callback',
        'access_type': 'offline',
        'prompt': 'consent',
        'state': state,
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"status": "ok", "url": url}


@router.get('/google/callback')
async def google_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None, db = Depends(get_db)):
    if not code:
        return JSONResponse({"status": "error", "detail": "no code provided"}, status_code=400)

    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET
    if not client_id or not client_secret:
        return JSONResponse({"status": "error", "detail": "google oauth not configured"}, status_code=400)

    # Exchange authorization code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    redirect_uri = "http://localhost:8000/auth/google/callback"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(token_url, data={
            'code': code,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code',
        })
    if resp.status_code != 200:
        return JSONResponse({"status": "error", "detail": "token exchange failed", "info": resp.text}, status_code=400)

    token_data = resp.json()
    id_token = token_data.get('id_token')
    if not id_token:
        return JSONResponse({"status": "error", "detail": "no id_token"}, status_code=400)

    # Decode the ID token. For local/dev, skip signature verification.
    try:
        payload = jwt.get_unverified_claims(id_token)
    except Exception:
        try:
            payload = jwt.decode(id_token, options={"verify_signature": False, "verify_aud": False})
        except Exception:
            return JSONResponse({"status": "error", "detail": "invalid id_token"}, status_code=400)

    email = (payload or {}).get('email')
    if not email:
        return JSONResponse({"status": "error", "detail": "email not present in id_token"}, status_code=400)

    # Recover state
    role = 'user'
    redirect_path = '/login'
    if state:
        try:
            padded = state + "=" * (-len(state) % 4)
            decoded = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
            role = decoded.get('role') if decoded.get('role') in ("authority", "user") else 'user'
            redirect_path = decoded.get('redirect') or '/login'
        except Exception:
            pass

    # Upsert user and issue JWT
    users = db.get_collection("users")
    existing = await users.find_one({"email": email.lower()})
    role_mismatch = False
    final_role = role
    if not existing:
        await users.insert_one({
            "email": email.lower(),
            # Mark as Google account: store an empty hash; password login will fail.
            "hashed_password": "",
            "role": role,
            "name": payload.get('name') or '',
        })
    else:
        # Preserve existing role unless none set; inform frontend if different from requested
        existing_role = existing.get('role') or role
        if existing_role != role:
            role_mismatch = True
        final_role = existing_role

    access_token = auth_utils.create_access_token({"sub": email.lower(), "role": final_role})

    # Redirect back to frontend with token
    frontend_base = "http://localhost:8080"
    # ensure redirect path starts with '/'
    if not redirect_path.startswith('/'):
        redirect_path = '/' + redirect_path
    q = {
        "auth_token": access_token,
    }
    if role_mismatch:
        q["role_mismatch"] = "1"
        q["role"] = final_role
        q["wanted_role"] = role
    query = urlencode(q)
    dest = f"{frontend_base}{redirect_path}?{query}"
    return RedirectResponse(dest, status_code=302)
