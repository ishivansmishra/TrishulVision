# TrishulVision Backend

FastAPI backend for TrishulVision. Provides endpoints for authentication, mining uploads, AI prediction, report generation, and blockchain logging.

## Requirements

- Python 3.11+ (works with 3.13 in this repo)
- Windows PowerShell

## Setup (first time)

1) Create venv and install dependencies

```powershell
cd $PSScriptRoot
python -m venv .venv
./.venv/Scripts/Activate.ps1
pip install -r requirements.txt
```

2) Configure environment (.env)

Create `backend/.env` with:

```
MONGO_URL=mongodb://localhost:27017
MONGO_DB_NAME=your_database_name
REDIS_URL=redis://localhost:6379/0
```

3) Initialize database tables

```powershell
python -m app.create_tables
```

You should see tables in `dev.db` (users, otp_tokens, mining_reports, detections).

## Run the API

Option A — VS Code Task
- Command Palette → "Tasks: Run Task" → "Run backend (uvicorn)"

Option B — PowerShell helper script
```powershell
./start.ps1 -Port 8000
```

Option C — Direct command
```powershell
./.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Health check: open http://localhost:8000/health → `{ "status": "ok" }`.

## OTP Email (SMTP)

Configure these in `backend/.env` to send OTP emails:

```
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASSWORD=your_password
SMTP_FROM=noreply@yourdomain.com
SMTP_TLS=true
```

Notes:
- Port 465 uses SMTPS; 587 uses STARTTLS.
- If SMTP_USER is empty, OTP is printed to the server logs and (in dev) returned by `/auth/otp/send` as `{ otp }`.

## OpenAI Chat / Summaries

The chat endpoints (`POST /ai/chat`, `POST /ai/chat/rag`, `POST /ai/policy/ask`) and report summarization will use OpenAI if a key is configured. Without a key, deterministic fallbacks are returned (echo style or basic volume summary).

1) Get an API key from https://platform.openai.com/
2) Add to `backend/.env`:

```
OPENAI_API_KEY=sk-...yourkey...
# Optional: override model (default gpt-4o-mini)
# OPENAI_MODEL=gpt-4o-mini
```

3) Restart backend (stop the running Uvicorn task then run it again) so settings reload.

Test with PowerShell (replace question as needed):

```powershell
curl -Method POST -Uri http://localhost:8000/ai/chat -Headers @{ 'Content-Type'='application/json' } -Body '{"question":"Explain mining detection"}'
```

If the key is working you should see an informative reply. If missing or invalid you'll see a fallback message.

## Dev Admin Seeding

To quickly log in as authority in development, set:

```
DEV_ADMIN_EMAIL=admin@example.com
DEV_ADMIN_PASSWORD=admin123
```

The user will be created on startup if it does not exist.

## Optional: Celery worker

```powershell
celery -A app.tasks.celery_worker.celery_app worker --loglevel=info
```

## Notes

- Secrets in `app/config.py` are loaded from `.env` via pydantic-settings.
- CORS allows http://localhost:8080 for Vite dev.
- PostGIS is no longer required; spatial/GIS endpoints are disabled by default.
- If you still see Docker/alembic files locally, you can remove them with PowerShell:
	```powershell
	Remove-Item -Force -Recurse .\Dockerfile, .\docker-compose.yml, .\alembic.ini, .\alembic, .\dev.db
	```

## Automation (n8n)

See `AUTOMATION.md` for integrating n8n workflows. The backend includes:

- `POST /automation/emit` to send events to n8n (requires auth)
- `POST /automation/callback` to receive actions from n8n (protected by header `X-N8N-Secret`)

Environment variables:

```
N8N_ENABLED=true
N8N_EVENT_WEBHOOK_URL=http://localhost:5678/webhook/trishul-events
N8N_SIGNATURE_SECRET=change-me
N8N_INBOUND_SECRET=change-me
```

## Imagery and Layers APIs

### POST /spatial/imagery/available-dates

Request JSON:

```
{
	"provider": "sentinelhub" | "gee",
	"aoi": { /* GeoJSON geometry or Feature/Collection */ },
	"bbox": [minLon, minLat, maxLon, maxLat],
	"start": "YYYY-MM-DD",
	"end": "YYYY-MM-DD",
	"collection": "S2L2A" | "COPERNICUS/S2_SR",
	"step_days": 5,
	"max_cloud_percent": 30,
	"intersects": true
}
```

Response JSON:

```
{ "provider": "sentinelhub", "start": "2024-01-01", "end": "2024-02-01", "count": 6, "dates": ["2024-01-01", "2024-01-06", ...] }
```

Notes:
- If `SENTINELHUB_CLIENT_ID` and `SENTINELHUB_CLIENT_SECRET` are set, real dates are fetched from Sentinel Hub Catalog; otherwise a synthetic cadence is returned for development.
- If `GEE_ENABLED=true`, GEE ImageCollection is queried with optional cloud cover filter; otherwise falls back to coarse monthly dates.

### GET /spatial/nasa/gibs/layers

Returns a WMTS template with curated layers and a friendly name mapping:

```
{ "template": ".../{layer}/default/{time}/{set}/{z}/{y}/{x}.{fmt}",
	"layers": [{ "id": "VIIRS_SNPP_CorrectedReflectance_TrueColor", "format": "jpg", "tileMatrixSet": "GoogleMapsCompatible_Level9" }, ...],
	"time": "current",
	"friendly": { "VIIRS_SNPP_CorrectedReflectance_TrueColor": "VIIRS True Color (SNPP)", ... }
}
```

## Google OAuth (Production)

This project includes a minimal Google OAuth flow under `/auth/google`. For production use follow these steps:

- Create OAuth 2.0 credentials in Google Cloud Console. Set the Authorized redirect URI to `https://your-domain.com/auth/google/callback` (or the `GOOGLE_REDIRECT_URI` you will set).
- Populate `backend/.env` with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Optionally set `GOOGLE_REDIRECT_URI` if you want an explicit callback URL instead of automatic derivation.
- Set `FRONTEND_BASE` to your frontend's base URL (e.g. `https://app.example.com`) so the backend redirects back after login.

Security notes:

- Ensure `google-auth` is installed (it's included in `requirements.txt` added recently) to verify ID tokens server-side.
- In production, do not rely on unverified ID token decoding — ensure tokens are verified and audience matches `GOOGLE_CLIENT_ID`.

