# TrishulVision

A full‑stack mining monitoring and compliance platform. It combines satellite / DEM (digital elevation model) data ingestion, AI detection workflows, reporting & PDF generation, visualization layers, WebSocket alerts/IoT streams, and an OpenAI‑powered chat assistant (restricted or unrestricted modes) exposed through a FastAPI backend and a Vite/React frontend.

---
## 1. Key Features
- **AI Chat Assistant**
  - Domain‑restricted (mining/GIS/compliance) or unrestricted general mode.
  - Streaming endpoint (`/ai/chat/stream`) using Server‑Sent Events.
  - Retry + exponential backoff and failure auditing (Mongo collection `ai_llm_failures`).
- **Detection Jobs**
  - Upload imagery / shapefile / DEM or supply remote URL / bounding box.
  - Asynchronous job creation with placeholder Celery task hook.
- **Reports & PDF** (see `backend/app/reports`): structured mining reports with estimations (volume, area, depth) and optional blockchain/IPFS pinning.
- **Spatial / GIS Modules**: GIS routing, DEM utilities, mining integrity, visualization layers (illegal polygons, depth polygons, boundaries, heatmap).
- **WebSockets**: Alerts + IoT streaming managers.
- **Lightweight RAG Stub** (`/ai/chat/rag`): Grabs recent Mongo documents & static KB fragments.
- **Policy / XAI / Caption Stubs**: Specialized prompt wrappers for future expansion.
- **Rate Limiting**: Simple in‑memory per‑IP window limiter for selected AI endpoints.
- **Deployment Ready**: `render.yaml` (backend) and `Frontend/vercel.json` (frontend) included.

---
## 2. Repository Structure (Condensed)
```
TrishulVision/
  README.md (this file)
  FLOWCHART.md
  backend/
    app/
      ai/               # Chat, streaming, RAG, policy, caption, XAI endpoints
      auth/             # Auth, Google OAuth (improvable), OTP/email, SQLite fallback
      reports/          # PDF & blockchain pinning
      visualization/    # Map layers & visualization endpoints
      tasks/            # Celery worker stub (detection job processing)
      utils/            # File/S3/IPFS/n8n helpers
      providers/        # Earthdata / GEE / SentinelHub stubs
      config.py         # Pydantic settings + env loading
      main.py           # FastAPI app, CORS config
    requirements.txt
    render.yaml         # Render deployment specification
    Dockerfile          # Backend container
  Frontend/
    src/                # React + Vite code
    vercel.json         # Vercel deployment config
    package.json
```

---
## 3. Technology Stack
| Layer | Tech |
|-------|------|
| Backend | FastAPI, Uvicorn, Pydantic Settings |
| Data | MongoDB (primary), optional SQLite fallback for auth, future Postgres/Redis integration |
| AI | OpenAI Chat Completions API via `httpx` (sync + async) |
| Tasks | Celery (stub), potential broker (Redis) |
| Frontend | Vite + React + TypeScript + Tailwind |
| Storage | Local filesystem, optional S3 & IPFS/Pinata |
| Deployment | Render (backend), Vercel (frontend), Docker, Docker Compose |

---
## 4. Environment Variables (Backend `config.py`)
Essential for production:
- `SECRET_KEY` – JWT signing secret.
- `OPENAI_API_KEY` – OpenAI access token.
- `OPENAI_MODEL` – e.g. `gpt-4o-mini` (override as needed).
- `MONGO_URL` / `MONGO_DB_NAME` – Mongo connection & database name.
- `FRONTEND_ORIGIN` – Exact origin (protocol + host) of deployed frontend for CORS.

AI Behavior Flags:
- `LLM_REQUIRE` (bool) – If true, fail with 503 instead of heuristic fallback.
- `LLM_HEURISTIC_FALLBACK` (bool) – Enables offline heuristic replies when OpenAI unreachable (turn off for strict mode).
- `LLM_UNRESTRICTED` (bool) – If true, skip mining domain filtering and allow general answers.

Security / Auth:
- `DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD` – Temporary bootstrap admin (remove in prod).
- `DEMO_FALLBACK_PASSWORD`, `DEMO_FALLBACK_ROLE` – (Dev only) Permissive login when Mongo down.

Integrations (optional):
- SMTP_* (OTP / email), WEB3_*, PINATA_*, S3_*, EARTHDATA_*, SENTINELHUB_*, GEE_*, N8N_*.

Frontend (`vercel.json` / Vercel Project Settings):
- `VITE_API_BASE` – Base URL of backend (e.g. `https://trishulvision-backend.onrender.com`).

---
## 5. Quick Start (Local Dev)
### 5.1 Backend
```powershell
cd backend
python -m venv .venv
./.venv/Scripts/Activate.ps1
pip install -r requirements.txt
# Copy and edit environment
copy .env.example .env  # if example exists; else create manually
# (Set OPENAI_API_KEY, MONGO_URL, etc.)
uvicorn app.main:app --reload --port 8000
```
Health check: http://localhost:8000/ai/health
LLM debug: http://localhost:8000/ai/llm/debug

### 5.2 Frontend
```powershell
cd Frontend
npm install
npm run dev
```
Frontend dev: http://localhost:5173  (Ensure `VITE_API_BASE` points to backend.)

---
## 6. Core API Endpoints (Selected)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/ai/health` | GET | Basic readiness probe |
| `/ai/llm/debug` | GET | LLM diagnostics (non‑secret) |
| `/ai/chat` | POST | Domain (mining) chat by default unless unrestricted flag |
| `/ai/chat/unrestricted` | POST | General assistant mode regardless of domain filtering |
| `/ai/chat/stream` | POST | SSE streaming tokens (OpenAI) |
| `/ai/chat/rag` | POST | Lightweight retrieval using recent Mongo docs + KB |
| `/ai/models/detect` | POST | Start detection job from uploaded files |
| `/ai/models/detect-from-url` | POST | Start detection job by remote URL |
| `/ai/models/detect-from-bbox` | POST | Start detection using bounding box |
| `/reports/{id}` | GET | Report retrieval (if implemented fully) |
| `/policy/ask` | POST | Policy / legal prompt stub |
| `/xai/explain` | POST | Explain detection decision (heuristic) |

---
## 7. Using the Chat API
Basic request body (unrestricted example):
```json
{
  "messages": [
    { "role": "user", "content": "Summarize the main features in 2 lines." }
  ],
  "language": "en"
}
```
Streaming (`/ai/chat/stream`) returns SSE events:
```
(data:{"token":"Hello"})
...
(event:done)
```

Error modes:
- With `LLM_REQUIRE=true` and model failure → 503 error JSON.
- Without strict mode & fallback enabled → Short heuristic string.

---
## 8. Deployment
### 8.1 Render (Backend)
1. Connect repo; root directory `backend`.
2. Build: `pip install -r requirements.txt`.
3. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. Set env vars (see section 4). Add `FRONTEND_ORIGIN` after frontend deployed.
5. Deploy & verify `/ai/health` and `/ai/llm/debug`.

### 8.2 Vercel (Frontend)
1. Import project, root = `Frontend`.
2. Ensure `vercel.json` present.
3. Set `VITE_API_BASE` env to Render backend URL.
4. Deploy; test API calls from browser console.
5. Update backend `FRONTEND_ORIGIN` to the final Vercel URL and restart backend.

### 8.3 Docker (Backend Only)
```powershell
docker build -t trishulvision-backend backend
docker run -p 8000:8000 --env-file backend/.env trishulvision-backend
```

### 8.4 Docker Compose (Example)
```yaml
version: '3.9'
services:
  backend:
    build: ./backend
    environment:
      SECRET_KEY: ${SECRET_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      MONGO_URL: mongodb://mongo:27017
      MONGO_DB_NAME: trishul
      FRONTEND_ORIGIN: http://localhost:5173
    ports: ["8000:8000"]
    depends_on: [mongo]
  mongo:
    image: mongo:6
    volumes: ["mongo_data:/data/db"]
    ports: ["27017:27017"]
  frontend:
    build:
      context: ./Frontend
      dockerfile: Dockerfile # create: multi-stage build (Node -> nginx)
    environment:
      VITE_API_BASE: http://localhost:8000
    ports: ["5173:80"]
volumes:
  mongo_data:
```

---
## 9. LLM Configuration Patterns
| Scenario | Flags |
|----------|-------|
| Strict prod (no heuristics) | `LLM_REQUIRE=true`, `LLM_HEURISTIC_FALLBACK=false`, `LLM_UNRESTRICTED=false` |
| General assistant product | `LLM_REQUIRE=true`, `LLM_UNRESTRICTED=true` |
| Dev sandbox | `LLM_REQUIRE=false`, `LLM_HEURISTIC_FALLBACK=true` |

If you see fallback text, confirm `/ai/llm/debug` shows `key_present: true` and model name valid.

---
## 10. Security / Hardening
- Rotate `SECRET_KEY` if compromised (invalidates JWTs).
- Remove demo & dev env vars (`DEV_ADMIN_*`, `DEMO_FALLBACK_*`) in production.
- Restrict CORS: only set `FRONTEND_ORIGIN` (no wildcard).
- Rate limit: Current in‑memory limiter is per‑instance; use Redis or API gateway for distributed scaling.
- Logging: Add structured log output and centralize (Render logs, or ship to ELK/Datadog).
- Secrets: Never commit real keys; use platform secret managers.

---
## 11. Health & Diagnostics
| Endpoint | Use |
|----------|-----|
| `/ai/health` | Basic server readiness |
| `/ai/llm/debug` | Verifies OpenAI config presence |

Future enhancement suggestion: add `/health/full` to validate DB + LLM round trip.

---
## 12. Background Tasks
`process_detection_job_task` currently a placeholder; for production:
- Provision Redis (broker + result backend) or RabbitMQ.
- Run worker service: `celery -A app.tasks.celery_worker worker -l info`.
- Consider a scheduler (beat) for periodic cleanups.

---
## 13. Roadmap (Suggested)
- Dynamic Google OAuth redirect + environment base.
- True RAG (vector store) for richer context answers.
- Token usage logging & cost dashboards.
- Structured JSON logging + OpenTelemetry traces.
- Real detection ML models & inference pipeline.
- Multi-tenant org / role model.
- Advanced spatial analytics & time series change detection.
- Usage quotas & billing integration.

---
## 14. Testing
Currently minimal; recommended next steps:
1. Add pytest + httpx AsyncClient tests for critical endpoints.
2. Mock OpenAI responses for deterministic chat tests.
3. Add schema validation for detection job creation.
4. Introduce smoke test script calling `/ai/health`, `/ai/llm/debug`, `/ai/chat`.

---
## 15. Contributing
1. Fork & branch (`feat/<name>`).
2. Add/Update tests.
3. Ensure lint passes (add Ruff / flake8 / mypy if desired).
4. Submit PR with clear description & screenshots for UI changes.

---
## 16. License
Specify your license (e.g., MIT, Apache 2.0) here. (Currently unspecified.)

---
## 17. Contact / Support
Add preferred contact method, or create GitHub Issues for bugs / feature requests.

---
Happy building! Feel free to extend this README with architecture diagrams, sequence flows, or model cards as capabilities grow.
