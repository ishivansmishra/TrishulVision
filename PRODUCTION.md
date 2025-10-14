TrishulVision — Production Deployment Checklist

This document lists the recommended steps and required environment variables to deploy the backend to Render (or similar) and the frontend to Vercel for a production-ready site.

1) Backend (Render) — Required environment variables

- DATABASE_URL — (production PostgreSQL) e.g. postgresql+asyncpg://user:pass@host:5432/db
- REDIS_URL — (if using Celery/Redis)
- MONGO_URL — MongoDB connection string (Atlas preferred)
- MONGO_DB_NAME — database name (e.g., trishul)

- SECRET_KEY — random secret used for JWT generation
- ALGORITHM — HS256 (default)
- ACCESS_TOKEN_EXPIRE_MINUTES — token lifetime

- FRONTEND_ORIGIN — comma-separated list of allowed frontend origins (e.g., https://trishul-vision-27.vercel.app)
- FRONTEND_BASE — base URL for frontend redirects (e.g., https://trishul-vision-27.vercel.app)
- GOOGLE_REDIRECT_URI — e.g., https://YOUR_BACKEND_DOMAIN/auth/google/callback

- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET — from Google Cloud Console

- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_TLS — SMTP credentials
  - For Gmail, use an App Password (recommended) or switch to SendGrid/Postmark for production.

- OPENAI_API_KEY — if using LLM features

- VITE_CESIUM_ION_TOKEN — (frontend) set this in Vercel to enable Cesium World Terrain

Security notes:
- Do not check these secrets into source control.
- Use Render's secret environment variable UI to set them.

2) Google Cloud Console

- Configure OAuth consent screen and create OAuth credentials.
- Add the backend callback URL(s) to "Authorized redirect URIs":
  - https://YOUR_BACKEND_DOMAIN/auth/google/callback

3) Render deployment steps

- Connect repo to Render and point Service to backend folder or Dockerfile.
- Ensure the Render service has the environment variables set as above.
- Deploy and watch the logs. On startup the backend will log resolved CORS origins.

4) Verify CORS and runtime

- After deploy, visit:
  - GET https://YOUR_BACKEND_DOMAIN/debug/runtime
  - POST https://YOUR_BACKEND_DOMAIN/debug/smtp_test with JSON {"to_email":"you@domain.com"}
- From the frontend origin (Vercel), test login and API calls. If a CORS preflight fails, copy the browser console error and backend logs.

5) Frontend (Vercel)

- In Vercel project settings add Environment Variable:
  - VITE_API_URL=https://YOUR_BACKEND_DOMAIN
  - VITE_CESIUM_ION_TOKEN=your_ion_token (optional)
- Deploy the frontend.

6) SMTP recommendations

- Gmail: create an App Password and use smtp.gmail.com:587 with TLS
- SendGrid/Postmark/Mailgun: prefer API-based sending for reliability. If using SMTP, set the provided credentials.

7) Post-deploy checks

- Try user registration/login/OTP and Google OAuth flows.
- Check Render logs for any CORS warnings and for errors from /auth endpoints.

8) Optional: tighten CORS after verification

- Once verified, remove ALLOW_ALL_ORIGINS and DEBUG_CORS_LOGGING in Render env (set to False).
- Keep FRONTEND_ORIGIN set exactly to your deployed Vercel origin(s).

If you'd like, I can:
- Prepare an automated script to run the key verification steps (CORS preflight, smtp test) against your live backend.
- Walk through configuring Google Cloud Console step-by-step.
- Add more production security checks (rate-limiting, stricter JWT settings, HTTPS enforcement).
