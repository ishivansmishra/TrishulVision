from fastapi import FastAPI
import logging
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from fastapi import Request

from .auth.router import router as auth_router
from .auth.google_auth import router as google_oauth_router
from .auth.admin_router import router as admin_router
from .mining.router import router as mining_router
from .blockchain.router import router as blockchain_router
from .reports.router import router as reports_router
from .ai.__init__ import router as ai_router
from .ai.detection_router import router as ai_detect_router
from .auth import utils as auth_utils
from .mongo import get_db
from .alerts.router import router as alerts_router
from .iot.router import router as iot_router
from .iot.mqtt_worker import start_mqtt_worker
from .gis.router import router as gis_router
from .spatial.router import router as spatial_router
from .visualization.router import router as visualization_router
from .metrics.router import router as metrics_router
from .automation.router import router as automation_router
from .search.router import router as search_router
from .collab import router as collab_router
from .integrity.router import router as integrity_router
from .drone.router import router as drone_router
from .debug_router import router as debug_router

app = FastAPI(title="TrishulVision Backend")

# CORS: allow common local dev servers (localhost/127.0.0.1/[::1]) on usual ports
cors_origins = [
    "https://trishul-vision27.vercel.app",
]

# Support comma-separated FRONTEND_ORIGIN in env (e.g. set multiple allowed origins)
if settings.FRONTEND_ORIGIN:
    extra = [o.strip().rstrip('/') for o in str(settings.FRONTEND_ORIGIN).split(',') if o.strip()]
    cors_origins.extend(extra)

# Deduplicate while preserving order
seen = set()
deduped = []
for o in cors_origins:
    if o not in seen:
        seen.add(o)
        deduped.append(o)
cors_origins = deduped

# allow localhost dev servers, any vercel.app subdomain, and any onrender.com subdomain
allow_origin_regex = r"^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d{2,5}$|^https?:\/\/([A-Za-z0-9-]+\.)?(vercel\.app|onrender\.com)(:\d{1,5})?$"

# Log the resolved CORS configuration so deploy logs show which origins are allowed
logging.info("Resolved CORS allow_origins: %s", cors_origins)
logging.info("Resolved CORS allow_origin_regex: %s", allow_origin_regex)

# If configured to allow everything (debug), bypass strict allowlist
if settings.ALLOW_ALL_ORIGINS:
    logging.warning("ALLOW_ALL_ORIGINS is enabled — CORS will be permissive. Disable in production.")

# Optional middleware to log incoming Origin headers for debugging CORS issues
if settings.DEBUG_CORS_LOGGING:
    @app.middleware("http")
    async def log_origins(request: Request, call_next):
        try:
            origin = request.headers.get('origin')
            logging.info("Incoming request origin: %s %s %s", request.method, request.url.path, origin)
        except Exception:
            pass
        return await call_next(request)

app.add_middleware(
    CORSMiddleware,
    allow_origins=([] if settings.ALLOW_ALL_ORIGINS else cors_origins),
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(google_oauth_router, prefix="/auth", tags=["auth"])  # Google OAuth endpoints
app.include_router(admin_router, prefix="/auth", tags=["admin"])  # Admin endpoints
app.include_router(mining_router, prefix="/mining", tags=["mining"])
app.include_router(ai_router, prefix="/ai", tags=["ai"])
app.include_router(ai_detect_router)
app.include_router(reports_router, prefix="/reports", tags=["reports"])
app.include_router(blockchain_router, prefix="/blockchain", tags=["blockchain"])
app.include_router(alerts_router, prefix="/alerts", tags=["alerts"])
app.include_router(iot_router, prefix="/iot", tags=["iot"])
app.include_router(gis_router, prefix="/gis", tags=["gis"])
app.include_router(spatial_router, prefix="/spatial", tags=["spatial"])
app.include_router(visualization_router, prefix="/visualization", tags=["visualization"])
app.include_router(metrics_router, prefix="/metrics", tags=["metrics"])
app.include_router(automation_router, prefix="/automation", tags=["automation"])
app.include_router(search_router, prefix="/search", tags=["search"])
app.include_router(collab_router, prefix="/collab", tags=["collab"])  # annotations
app.include_router(integrity_router, prefix="/integrity", tags=["integrity"])  # data integrity ledger
app.include_router(drone_router, prefix="/drone", tags=["drone"])  # drone uploads
app.include_router(debug_router, prefix="/debug", tags=["debug"])  # debug endpoints

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.on_event("startup")
async def ensure_dev_admin():
    # Create a default admin if configured via env in development (MongoDB)
    from .config import settings
    if not settings.DEV_ADMIN_EMAIL or not settings.DEV_ADMIN_PASSWORD:
        return
    try:
        db = await get_db()
        users = db.get_collection("users")
        existing = await users.find_one({"email": settings.DEV_ADMIN_EMAIL.lower()})
        if not existing:
            await users.insert_one({
                "email": settings.DEV_ADMIN_EMAIL.lower(),
                "hashed_password": auth_utils.get_password_hash(settings.DEV_ADMIN_PASSWORD),
                "role": "authority",
            })
    except Exception as e:
        logging.warning("Skipping DEV admin creation (Mongo unavailable?): %s", e)


@app.on_event("startup")
async def ensure_indexes():
    # Ensure 2dsphere index for detections geometry exists
    try:
        db = await get_db()
        det = db.get_collection("detections")
        try:
            await det.create_index([("geometry", "2dsphere")])
        except Exception:
            # Non-fatal if index already exists
            pass
    except Exception:
        # Non-fatal if Mongo is down at startup
        pass


@app.on_event("startup")
async def start_mqtt():
    # Fire-and-forget MQTT worker if configured
    try:
        await start_mqtt_worker()
    except Exception:
        # Non-fatal
        pass
