# TrishulVision System Flow (One Page)

## User Portal
- User login (email/OTP or Google OAuth) → JWT issued
- Upload evidence (imagery/shapefile/DEM) → create detection job
- View personal reports: download PDF, AI summary, authenticity check (IPFS + blockchain)
- Real-time alerts (read-only): listen via WebSocket

## Authority Portal
- Authority login → JWT
- Live Alerts: list + acknowledge, real-time via WebSocket
- Analytics: metrics overview, recent AI detection jobs
- Visualization: 3D Cesium viewer showing illegal polygons, legal boundaries, depth overlays
- GIS Layers: manage shapefiles; spatial queries; DEM volume estimator

## Backend (FastAPI)
- Auth: register/login/OTP/Google; roles (user/authority)
- AI Models: detect, detect-from-url/bbox; list/get jobs; visualization data
- Mining: upload, list reports, detections, boundary queries
- Reports: PDF stream; LLM summary; IPFS pin; blockchain log; authenticity verification
- Alerts: CRUD + acknowledge; WebSocket stream with batched broadcast
- IoT: ingest + WebSocket stream (extensible to UI)
- GIS/Spatial: shapefiles CRUD; satellite providers; DEM volume
- Visualization: heatmap points; job visualization layers and metrics
- Metrics: aggregated counts across collections

## Data Flow
1) User/Authority → Frontend (React) → API (JWT via Authorization header)
2) Evidence upload → /ai/models/detect → Job queued → Results persist to Mongo
3) Visualization → /visualization/{job_id} → layers: illegal_polygons, legal_boundary, depth_polygons; aoi_bbox
4) Alerts → inserted in DB → broadcast on /alerts/ws → Navbar/pages update live
5) Reports → PDF + summary → IPFS pin → tx_hash stored; verify via /blockchain/verify/{tx}
6) GIS → /gis/shapefiles; Spatial ops: /spatial/*; DEM volume estimates

## Realtime
- WebSocket endpoints: /alerts/ws, /iot/ws
- Frontend hooks: useAlerts connects with token and merges batches

## Storage
- MongoDB collections: users, alerts, detections, detection_jobs, mining_reports, shapefiles, blockchain_logs, iot_data

## Security
- CORS allowed to frontend origin
- JWT required for protected routes; WS may include token as query

Note: This file summarizes the end-to-end flow in a single page for quick reference.