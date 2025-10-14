from pydantic_settings import BaseSettings
from pathlib import Path
from dotenv import load_dotenv

# Proactively load the backend/.env regardless of current working directory.
_ENV_DIR = Path(__file__).resolve().parents[1]
_ENV_PATH = _ENV_DIR / ".env"
_ENV_LOCAL_PATH = _ENV_DIR / ".env.local"
load_dotenv(dotenv_path=_ENV_PATH, override=False)
# Allow local overrides without committing secrets changes
load_dotenv(dotenv_path=_ENV_LOCAL_PATH, override=True)


class Settings(BaseSettings):
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/trishul"
    REDIS_URL: str = "redis://localhost:6379/0"

    SMTP_HOST: str = "smtp.example.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_TLS: bool = True

    # MongoDB
    MONGO_URL: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "trishul"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # LLM / OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"  # override in .env if you have access to a different model
    LLM_REQUIRE: bool = False  # if true, endpoints will error instead of fallback when OpenAI call fails
    LLM_HEURISTIC_FALLBACK: bool = True  # allow heuristic offline reply when LLM unreachable
    LLM_UNRESTRICTED: bool = False  # if true, skip domain restriction prompts

    # Frontend deployment origin (e.g. https://your-app.vercel.app)
    FRONTEND_ORIGIN: str | None = None
    # Frontend base URL used for redirects back to the UI (e.g. https://your-app.vercel.app)
    FRONTEND_BASE: str = "http://localhost:8080"
    # Optional explicit Google OAuth redirect URI (callback) registered in Google Cloud
    # If not set, defaults to the local development callback below.
    GOOGLE_REDIRECT_URI: str | None = None
    # When true, the app will log OTP values on SMTP failure (dev only). Defaults to True.
    LOG_OTP_ON_FAILURE: bool = True

    # If true, allow all origins (*) for CORS. Useful for temporary testing only.
    # Do NOT enable in production without understanding the security impact.
    ALLOW_ALL_ORIGINS: bool = False

    # If true, log incoming Origin headers on each request to help debug CORS.
    DEBUG_CORS_LOGGING: bool = False
    # Allow all origins (temporary debugging only). When True, CORS will allow '*'
    # Note: When allow_credentials=True and allow_origins=['*'] browsers will
    # ignore Access-Control-Allow-Credentials — use cautiously.
    ALLOW_ALL_ORIGINS: bool = False
    # Enable verbose logging of incoming Origin headers (helps debug CORS issues)
    DEBUG_CORS_LOGGING: bool = False

    # For dev convenience: when SMTP fails, optionally log the OTP to server logs
    LOG_OTP_ON_FAILURE: bool = True

    # Web3 / Blockchain
    WEB3_RPC_URL: str = ""
    WEB3_PRIVATE_KEY: str = ""
    WEB3_FROM_ADDRESS: str = ""  # 0x... checksummed
    WEB3_CHAIN_ID: int | None = None
    CONTRACT_ADDRESS: str = ""  # Optional: if set, call contract function
    CONTRACT_ABI_JSON: str = ""  # Optional: ABI JSON string for contract

    # MQTT (IoT ingestion)
    MQTT_BROKER_HOST: str = ""
    MQTT_BROKER_PORT: int = 1883
    MQTT_TOPIC: str = "trishul/iot/#"

    # IPFS / Pinata
    PINATA_JWT: str = ""
    PINATA_API_KEY: str = ""
    PINATA_API_SECRET: str = ""
    IPFS_GATEWAY_BASE: str = "https://gateway.pinata.cloud/ipfs/"

    # Development convenience: optional default admin
    DEV_ADMIN_EMAIL: str = ""
    DEV_ADMIN_PASSWORD: str = ""

    # Visualization demo fallbacks (set to true only for demo/dev)
    ALLOW_HEATMAP_DEMO: bool = False

    # Demo fallback auth (when MongoDB is unavailable)
    # If DEMO_FALLBACK_PASSWORD is set, /auth/login will accept any email with this password
    # and issue a JWT with DEMO_FALLBACK_ROLE (default 'user') when Mongo is down.
    DEMO_FALLBACK_PASSWORD: str = ""
    DEMO_FALLBACK_ROLE: str = "user"

    # S3 storage (optional)
    S3_BUCKET: str = ""
    S3_REGION: str | None = None
    S3_ENDPOINT_URL: str | None = None
    S3_ACCESS_KEY: str | None = None
    S3_SECRET_KEY: str | None = None
    S3_PUBLIC_BASE: str | None = None

    # NASA Earthdata Login (EDL)
    EARTHDATA_USERNAME: str | None = None
    EARTHDATA_PASSWORD: str | None = None
    EARTHDATA_TOKEN: str | None = None

    # Sentinel Hub (Catalog/OAuth)
    SENTINELHUB_CLIENT_ID: str | None = None
    SENTINELHUB_CLIENT_SECRET: str | None = None

    # Google Earth Engine
    GEE_ENABLED: bool = False
    GEE_SERVICE_ACCOUNT: str | None = None
    GEE_PRIVATE_KEY: str | None = None  # contents of the .json private key or path

    # n8n Automation
    N8N_ENABLED: bool = False
    # If using Webhook-based workflows, set this to your n8n webhook URL to receive outbound events
    # Example: http://localhost:5678/webhook/trishul-events (Production URL from n8n)
    N8N_EVENT_WEBHOOK_URL: str | None = None
    # Optional: Use an HMAC secret to sign payloads sent to n8n. Configure a corresponding header check in n8n.
    N8N_SIGNATURE_SECRET: str | None = None
    # For inbound callbacks from n8n -> backend, set a shared secret and pass it as header X-N8N-Secret from n8n HTTP Request node
    N8N_INBOUND_SECRET: str | None = None
    # If you prefer calling n8n REST API directly, set base URL and API key
    N8N_BASE_URL: str | None = None  # e.g., http://localhost:5678
    N8N_API_KEY: str | None = None

    model_config = {
        "env_file": ".env",
    }

settings = Settings()
