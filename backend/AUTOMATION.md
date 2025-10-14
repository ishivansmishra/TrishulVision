TrishulVision Automation with n8n

Overview
- We integrate n8n as a low-code orchestrator for scheduled jobs, alerts, and third-party APIs.
- This repo wires automation emitters in the backend and exposes callbacks for n8n.

Run n8n locally (docker-compose)
- docker-compose includes a service at http://localhost:5678.
- First run: sign up in n8n, create an API key if using REST, or create Webhook nodes.

Backend settings (.env)
- N8N_ENABLED=true
- N8N_EVENT_WEBHOOK_URL=http://localhost:5678/webhook/trishul-events (create this in n8n)
- N8N_SIGNATURE_SECRET=change-me (optional HMAC for outbound events)
- N8N_INBOUND_SECRET=change-me (shared secret header X-N8N-Secret for callbacks)
- Optional: N8N_BASE_URL, N8N_API_KEY for REST execution.

Endpoints
- POST /automation/emit { event, data } -> push an event into n8n.
- POST /automation/callback (protected by X-N8N-Secret) -> receive actions from n8n (e.g., escalate alert).

Events Emitted
- detection.completed: when a detection job finishes; fields: job_id, area_illegal, volume_cubic_m, depth_stats.
- report.pinned: when a PDF is pinned to IPFS; fields: report_id, cid, url, tx_hash, verified.
- report.authenticity_checked: after authenticity verification; fields: report_id, tx_hash, valid.

Suggested n8n Workflows (mapping to product features)
- Satellite data sync (Google Earth Engine / Sentinel Hub): schedule daily, fetch scenes for AOIs, call backend /ai/models/detect-from-url.
- Temporal Change Viewer: schedule two fetches (older_date vs current) then call /ai/models/detect-from-bbox with older_date.
- Compliance Checker: on detection.completed, fetch legal KML from storage, compare polygons (use Code node or call backend spatial endpoint), then POST alerts via /alerts.
- Smart Environmental Score: on schedule, query OpenWeather/Copernicus, compute NDVI/CO2 score, POST to /metrics or store in Mongo.
- Notification: on report.pinned, send email via SendGrid; on critical detection, send SMS via Twilio.
- IoT ingestion: subscribe to MQTT externally, forward to backend /iot endpoints or WebSocket.
- Document AI: HTTP Request to Google Document AI/Azure, upload results to backend /reports.
- Blockchain: on report.pinned, also mint NFT via Polygon using a custom Node or Web3-HTTP Request.

Security
- Use X-Signature HMAC for outbound to n8n and X-N8N-Secret for inbound callbacks.

Frontend hooks
- Call POST /automation/emit to trigger "Sync Satellite Data" or "Run Compliance Check" from the UI.
