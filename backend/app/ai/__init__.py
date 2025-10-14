from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status, Query, Request
from pydantic import BaseModel, root_validator
from .llm import chat as llm_chat
from ..utils.file_storage import save_upload_file
from ..mongo import get_db
from uuid import uuid4
from datetime import datetime
from ..tasks.celery_worker import process_detection_job_task
from ..dependencies import get_current_user
import httpx
from ..utils.s3_storage import s3_enabled, save_bytes_to_s3, generate_s3_key
from fastapi.responses import JSONResponse
from fastapi.responses import StreamingResponse
import io, csv
from .llm import llm_diagnostics
import asyncio, json, httpx, os

router = APIRouter()

# --- Simple in-memory rate limiter (per-IP, per-path) ---
from time import time
from functools import wraps
from collections import defaultdict, deque

_RATE_BUCKETS: dict[str, deque] = defaultdict(deque)

def rate_limit(max_requests: int, window_sec: int):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Request | None = None
            # Extract Request from FastAPI dependency-injected args
            for a in args:
                if isinstance(a, Request):
                    request = a
                    break
            if request is None:
                request = kwargs.get('request')
            # Identify client IP (X-Forwarded-For first, then client host)
            ip = (request.headers.get('x-forwarded-for', '').split(',')[0].strip() or
                  (request.client.host if request and request.client else 'unknown'))
            key = f"{ip}:{getattr(func, '__name__', 'endpoint')}"
            now = time()
            dq = _RATE_BUCKETS[key]
            # Evict old
            while dq and now - dq[0] > window_sec:
                dq.popleft()
            if len(dq) >= max_requests:
                raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
            dq.append(now)
            return await func(*args, **kwargs)
        return wrapper
    return decorator

@router.get('/health')
async def ai_health():
    return {"ai": "ready"}


@router.get('/llm/debug')
async def llm_debug():
    """Lightweight diagnostics for OpenAI integration (no secrets)."""
    return llm_diagnostics()


@router.post('/chat/stream')
@rate_limit(max_requests=30, window_sec=60)
async def chat_stream(data: 'ChatStreamIn', request: Request):
    """Server-Sent Events streaming chat. Falls back to non-stream reply if streaming fails."""
    from ..config import settings
    api_key = settings.OPENAI_API_KEY or os.getenv('OPENAI_API_KEY')
    if not api_key:
        # immediate fallback
        return { 'reply': '(dev) OpenAI key not configured.' }
    persona = (data.persona or '').lower()
    base = 'You are a helpful mining compliance assistant for authorities.' if persona == 'authority' else 'You are a helpful assistant for mining users.'
    lang = (data.language or 'en').lower()
    system = (
        base
        + ' Respond only about mining detection, compliance, GIS, satellite/DEM, or TrishulVision. '
        + 'If out-of-domain, say: I do not have enough information. '
        + f'Respond in language code: {lang}. Keep replies concise.'
    )
    messages = []
    messages.append({ 'role': 'system', 'content': system })
    messages.extend(data.messages or [])
    body = {
        'model': settings.OPENAI_MODEL or 'gpt-4o-mini',
        'messages': messages,
        'temperature': 0.2,
        'stream': True,
        'max_tokens': 500,
    }

    async def event_gen():
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream('POST', 'https://api.openai.com/v1/chat/completions',
                                          headers={'Authorization': f'Bearer {api_key}', 'Content-Type':'application/json'},
                                          json=body) as r:
                    async for line in r.aiter_lines():
                        if not line:
                            continue
                        if line.startswith('data:'):
                            payload = line[5:].strip()
                            if payload == '[DONE]':
                                yield 'event:done\ndata:{}\n\n'
                                break
                            try:
                                j = json.loads(payload)
                                delta = j.get('choices',[{}])[0].get('delta',{}).get('content')
                                if delta:
                                    yield f'data:{json.dumps({"token": delta})}\n\n'
                            except Exception:
                                continue
            await asyncio.sleep(0)
        except Exception as e:
            # Fallback single message event
            yield f'data:{json.dumps({"error": str(e)})}\n\n'
            yield 'event:done\ndata:{}\n\n'
    return StreamingResponse(event_gen(), media_type='text/event-stream')


class ChatIn(BaseModel):
    # Primary chat history
    messages: list[dict] | None = None
    # Allow simple single-turn forms
    question: str | None = None
    q: str | None = None
    text: str | None = None
    prompt: str | None = None
    message: str | None = None
    query: str | None = None
    persona: str | None = None
    language: str | None = None  # 'en' | 'hi' | 'mr' (or other)

    @root_validator(pre=True)
    def _normalize_messages(cls, values: dict):
        # If messages already provided and non-empty, leave them
        msgs = values.get('messages')
        if isinstance(msgs, list) and msgs:
            return values
        # Otherwise look for a single-question style field
        for k in ('question','q','text','prompt','message','query'):
            v = values.get(k)
            if isinstance(v, str) and v.strip():
                values['messages'] = [{ 'role': 'user', 'content': v.strip() }]
                return values
        # As a last resort set empty list to satisfy type
        values['messages'] = []
        return values


class ChatStreamIn(ChatIn):
    """Input model for streaming chat endpoint."""
    stream: bool | None = True


@router.post('/chat')
@rate_limit(max_requests=20, window_sec=60)
async def chat_endpoint(data: ChatIn, request: Request, db = Depends(get_db)):
    persona = (data.persona or '').lower()
    base = 'You are a helpful mining compliance assistant for authorities.' if persona == 'authority' else 'You are a helpful assistant for mining users.'
    lang = (data.language or 'en').lower()
    # Lightweight domain classification on last user message
    last_user = ''
    for m in reversed(data.messages or []):
        if m.get('role') == 'user':
            last_user = (m.get('content') or '').lower()
            break
    domain_keywords = [
        'mining','pit','excavation','gis','satellite','dem','elevation','trishulvision','report','detection','illegal','compliance','volume','depth','polygon','heatmap','bbox','shapefile'
    ]
    on_topic_score = sum(1 for k in domain_keywords if k in last_user)
    on_topic = on_topic_score > 0
    # Internal static KB lines for richer on-topic answers (not full RAG, just hints)
    internal_kb = [
        'TrishulVision detects and summarizes mining activity including estimated volume (m^3), depth (m), and area (hectares).',
        'Key endpoints: /ai/models/detect, /ai/chat, /ai/chat/rag, /reports/{id}, /visualization/{job_id}.',
        'Visualization layers may include illegal_polygons, depth_polygons, legal_boundary, and heatmap.',
    ]
    # Strict instruction template
    strict_clause = 'If the user question is unrelated to mining, GIS, satellite data, compliance, or TrishulVision itself, reply exactly: "I do not have enough information." '
    context_clause = ''
    if on_topic:
        context_clause = 'Use ONLY the following internal context if helpful: ' + " | ".join(internal_kb) + ' '
    from ..config import settings as _settings
    if _settings.LLM_UNRESTRICTED:
        system = base + f' General assistant mode (unrestricted). Respond in {lang}.'
    else:
        system = (
            base + ' ' + context_clause + strict_clause + f'Respond in language code: {lang}. Keep replies concise.'
        )
    try:
        reply = llm_chat(data.messages or [], system_prompt=system)
    except Exception as e:
        # If strict requirement of LLM, propagate service unavailable status
        from ..config import settings as _settings
        if _settings.LLM_REQUIRE:
            raise HTTPException(status_code=503, detail=f"LLM unavailable: {e}")
        reply = f"(fallback-error) {e}"
    # Audit trail: persist Q/A for review boards
    try:
        await db.get_collection('ai_audit').insert_one({
            'type': 'chat',
            'messages': data.messages,
            'system': system,
            'on_topic': on_topic,
            'on_topic_score': on_topic_score,
            'reply': reply,
            'created_at': datetime.utcnow(),
        })
    except Exception:
        pass
    return { 'reply': reply, 'on_topic': on_topic }


@router.post('/chat/unrestricted')
@rate_limit(max_requests=30, window_sec=60)
async def chat_unrestricted(data: ChatIn, request: Request):
    """Unrestricted chat (ignores mining-only constraint)."""
    from ..config import settings as _settings
    messages = data.messages or []
    base = 'You are a helpful general AI assistant.'
    lang = (data.language or 'en').lower()
    system = base + f' Respond in language code: {lang}. Be clear and concise.'
    reply = llm_chat(messages, system_prompt=system)
    return { 'reply': reply }


class ChatRagIn(BaseModel):
    # Primary field
    question: str | None = None
    # Common alternates that clients might send
    q: str | None = None
    text: str | None = None
    query: str | None = None
    prompt: str | None = None
    message: str | None = None
    messages: list[dict] | None = None  # [{ role, content }]
    # Other options
    persona: str | None = None
    limit: int = 5
    language: str | None = None

    @root_validator(pre=True)
    def _normalize_question(cls, values: dict):
        # If 'question' already present and non-empty, keep it
        q = values.get('question')
        if isinstance(q, str) and q.strip():
            return values
        # Try common alias fields
        for k in ('q', 'text', 'query', 'prompt', 'message'):
            v = values.get(k)
            if isinstance(v, str) and v.strip():
                values['question'] = v
                return values
        # Try to extract from chat-style messages (take last user content)
        msgs = values.get('messages')
        if isinstance(msgs, list) and msgs:
            # Find the last user message with content
            content = None
            for m in reversed(msgs):
                if isinstance(m, dict):
                    role = m.get('role')
                    c = m.get('content')
                    if isinstance(c, str) and c.strip():
                        if role == 'user':
                            values['question'] = c
                            return values
                        content = content or c
            if content:
                values['question'] = content
        return values


@router.post('/chat/rag')
@rate_limit(max_requests=20, window_sec=60)
async def chat_rag(data: ChatRagIn, request: Request, db = Depends(get_db)):
    """
    Retrieval-augmented answer grounded on your database (reports, detection jobs).
    No external vector store required; performs lightweight retrieval from Mongo.
    """
    q = (data.question or '').strip()
    if not q:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Empty question')

    # Collect recent candidates
    reports = db.get_collection('mining_reports')
    jobs = db.get_collection('detection_jobs')

    contexts: list[str] = []
    # Pull recent reports
    try:
        async for r in reports.find({}).sort('created_at', -1).limit(50):
            parts = []
            rid = r.get('_id')
            parts.append(f"Report {rid}")
            if r.get('summary'): parts.append(f"Summary: {r.get('summary')}")
            if r.get('result'):
                est = r['result'].get('estimation') or {}
                vol = est.get('volume_m3'); dep = est.get('depth_m')
                if vol is not None: parts.append(f"Volume m3: {vol}")
                if dep is not None: parts.append(f"Depth m: {dep}")
            if r.get('area_ha') is not None: parts.append(f"Area ha: {r.get('area_ha')}")
            if r.get('notes'): parts.append(f"Notes: {r.get('notes')}")
            contexts.append(" | ".join(parts))
    except Exception:
        pass

    # Pull recent jobs
    try:
        async for j in jobs.find({}).sort('created_at', -1).limit(50):
            parts = []
            jid = j.get('_id'); status_ = j.get('status')
            parts.append(f"Job {jid} status={status_}")
            if j.get('area_illegal') is not None: parts.append(f"area_illegal: {j.get('area_illegal')}")
            if j.get('volume_cubic_m') is not None: parts.append(f"volume_cubic_m: {j.get('volume_cubic_m')}")
            if j.get('notes'): parts.append(f"notes: {j.get('notes')}")
            contexts.append(" | ".join(parts))
    except Exception:
        pass

    # Add a lightweight internal KB about this application (static product knowledge)
    kb = [
        "TrishulVision is a mining monitoring web app with a FastAPI backend and React frontend.",
        "Backend modules: auth, ai (detection jobs, chat), alerts (WebSocket), iot (WebSocket), reports (PDF, blockchain pinning), blockchain (verify/list), gis (shapefiles), spatial (satellite/DEM/change detection), visualization (job visualization, heatmap), metrics (overview).",
        "Realtime: /alerts/ws and /iot/ws require JWT and stream data.",
        "Detection jobs endpoints: POST /ai/models/detect, /ai/models/detect-from-url, /ai/models/detect-from-bbox; list via GET /ai/models/jobs; details via GET /ai/models/jobs/{id}; visualization via GET /visualization/{job_id}.",
        "Reports: GET /mining, GET /mining/{id}; PDF via GET /reports/{report_id}; authenticity via /reports/{report_id}/pin and /blockchain endpoints.",
        "Visualization uses Cesium; layers include illegal_polygons, depth_polygons, legal_boundary; heatmap via /visualization/heatmap.",
    ]

    # Simple scoring: keyword overlap count over DB-derived contexts and KB
    tokens = set([t.lower() for t in q.split() if len(t) > 2])
    def score(text: str) -> int:
        words = set([t.lower().strip('.,:;()') for t in text.split()])
        return len(tokens & words)

    contexts.sort(key=score, reverse=True)
    kb.sort(key=score, reverse=True)
    # Mix top DB signals with a couple of KB lines
    top_db = contexts[: max(1, min(data.limit, 8))]
    top_kb = kb[:2]
    top = top_kb + top_db

    persona = (data.persona or '').lower()
    lang = (data.language or 'en').lower()
    system = (
        'You are an authority mining compliance assistant for the TrishulVision website. Only answer from the provided CONTEXT; if the answer is not present, say you do not have enough information. '
        f'Respond in language code: {lang}. '
        if persona == 'authority'
        else 'You are a mining user assistant for the TrishulVision website. Only answer from the provided CONTEXT; if the answer is not present, say you do not have enough information. '
             f'Respond in language code: {lang}. '
    )
    messages = [
        { 'role': 'system', 'content': system },
        { 'role': 'user', 'content': f"CONTEXT\n\n" + "\n".join(top) + f"\n\nQUESTION: {q}\nIf the answer cannot be found in the CONTEXT, say you do not have enough information." },
    ]
    reply = llm_chat(messages)
    return { 'reply': reply, 'sources_used': len(top) }


class PolicyQ(BaseModel):
    question: str
    citations: bool | None = True


@router.post('/policy/ask')
async def policy_ask(payload: PolicyQ):
    """
    Policy assistant tuned for Indian Mining Acts + NTRO guidelines (prompt-only stub).
    When external LLM API isn't configured, returns a succinct fallback string.
    """
    system = (
        "You are a legal compliance assistant for Indian mining. Cite relevant acts like MMDR Act, Mineral Concession Rules, and NTRO SOPs. If unsure, say not enough information."
    )
    reply = llm_chat([{ 'role': 'user', 'content': payload.question }], system_prompt=system)
    return { 'reply': reply }


class AnomalyIn(BaseModel):
    url: str | None = None
    notes: str | None = None


@router.post('/anomaly/classify')
async def anomaly_classify(data: AnomalyIn):
    """
    Classify area as legal excavation / erosion / deforestation (stub model).
    Returns a deterministic label based on URL hash for dev.
    """
    import hashlib
    h = hashlib.sha256((data.url or 'none').encode()).hexdigest()
    classes = ['legal_excavation','erosion','deforestation']
    idx = int(h, 16) % len(classes)
    return { 'label': classes[idx], 'confidence': 0.62 }


class CaptionIn(BaseModel):
    url: str
    detail: str | None = 'short'  # 'short' | 'detailed'


@router.post('/caption')
async def caption_image(data: CaptionIn):
    """Generate a short textual summary/caption for a satellite scene (stub)."""
    style = 'succinct' if (data.detail or 'short') == 'short' else 'detailed'
    prompt = f"Provide a {style} description of visible mining activity, boundaries, and vegetation condition."
    reply = llm_chat([{ 'role': 'user', 'content': prompt }], system_prompt='Vision-text captioning stub for TrishulVision.')
    return { 'caption': reply }


class XAIExplainIn(BaseModel):
    detection_id: str | None = None
    geometry: dict | None = None  # GeoJSON for ad-hoc regions
    model: str | None = None
    context: str | None = None  # optional human notes


@router.post('/xai/explain')
async def xai_explain(data: XAIExplainIn, db = Depends(get_db)):
    """
    Explain a detection decision with interpretable factors.
    If detection_id is provided, pulls properties from 'detections' collection.
    Otherwise uses provided geometry and stub heuristics.
    """
    props: dict = {}
    geom: dict | None = None
    if data.detection_id:
        d = await db.get_collection('detections').find_one({'_id': data.detection_id})
        if d:
            geom = d.get('geometry')
            props = d.get('properties') or {}
    if not geom:
        geom = data.geometry if isinstance(data.geometry, dict) else None
    # Heuristic explanations
    area = props.get('area_sqm') or props.get('area')
    conf = props.get('confidence')
    depth = props.get('depth')
    reasons: list[str] = []
    if isinstance(conf, (int,float)):
        if conf >= 0.8:
            reasons.append('High model confidence due to strong texture and shape cues.')
        elif conf >= 0.5:
            reasons.append('Moderate confidence; pattern similarity with past mining regions.')
        else:
            reasons.append('Low confidence; flagged for human review.')
    if isinstance(area, (int,float)):
        if area > 50_000:
            reasons.append('Large disturbed area area_sqm > 50k suggests sustained excavation.')
    if isinstance(depth, (int,float)) and depth > 5:
        reasons.append('Estimated pit depth > 5m consistent with active extraction.')
    if data.context:
        reasons.append(f"Operator notes: {data.context}")
    # Saliency map/feature attributions placeholder
    attributions = {
        'spectral': {'red_edge': 0.42, 'nir': 0.31, 'swir': 0.21},
        'shape': {'rectilinearity': 0.38, 'edge_density': 0.27},
    }
    out = {
        'detection_id': data.detection_id,
        'geometry': geom,
        'model': data.model or 'vit-mining-v1',
        'confidence': conf,
        'factors': reasons,
        'attributions': attributions,
    }
    # Log audit event
    try:
        await db.get_collection('ai_audit').insert_one({ 'type': 'xai', **out, 'created_at': datetime.utcnow() })
    except Exception:
        pass
    return out


class ModelFeedbackIn(BaseModel):
    detection_id: str | None = None
    correct_label: str  # e.g., 'illegal_mining' | 'non_mining' | 'quarry' | ...
    notes: str | None = None


@router.post('/model/feedback')
async def model_feedback(data: ModelFeedbackIn, db = Depends(get_db)):
    """Record human feedback for self-learning updates and emit automation event."""
    rec = {
        'detection_id': data.detection_id,
        'label': data.correct_label,
        'notes': data.notes,
        'created_at': datetime.utcnow(),
        'consumed': False,
    }
    await db.get_collection('model_feedback').insert_one(rec)
    # Emit to n8n or training pipeline
    try:
        from ..utils.n8n_client import emit_event
        await emit_event('model.feedback.received', rec)
    except Exception:
        pass
    return { 'status': 'queued' }


class PatternMineIn(BaseModel):
    limit: int = 200
    bbox: list[float] | None = None  # [minx,miny,maxx,maxy]


@router.post('/patterns/mine')
async def patterns_mine(inp: PatternMineIn, db = Depends(get_db)):
    """Derive simple spatial patterns of illegal mining from detections (stub clustering)."""
    q = {}
    if inp.bbox and len(inp.bbox) == 4:
        minx, miny, maxx, maxy = inp.bbox
        bbox_poly = {
            'type': 'Polygon',
            'coordinates': [[[minx,miny],[maxx,miny],[maxx,maxy],[minx,maxy],[minx,miny]]]
        }
        q = { 'geometry': { '$geoIntersects': { '$geometry': bbox_poly } } }
    cur = db.get_collection('detections').find(q).limit(max(1, min(inp.limit, 1000)))
    pts = []
    try:
        from shapely.geometry import shape as shp_shape
        has_shapely = True
    except Exception:
        has_shapely = False
    async for d in cur:
        g = d.get('geometry')
        if isinstance(g, dict):
            if g.get('type') == 'Point':
                x,y = g.get('coordinates', [None,None])
            elif has_shapely:
                try:
                    c = shp_shape(g).centroid; x = float(c.x); y = float(c.y)
                except Exception:
                    x=y=None
            else:
                x=y=None
            if isinstance(x,(int,float)) and isinstance(y,(int,float)):
                pts.append((x,y))
    # K-means-like simple grid clustering
    clusters = []
    if pts:
        import math
        xs = [p[0] for p in pts]; ys=[p[1] for p in pts]
        cx = (min(xs)+max(xs))/2.0; cy=(min(ys)+max(ys))/2.0
        # 4 quadrants as coarse clusters
        Q = [[],[],[],[]]
        for x,y in pts:
            idx = 0
            if x>=cx and y>=cy: idx=0
            elif x<cx and y>=cy: idx=1
            elif x<cx and y<cy: idx=2
            else: idx=3
            Q[idx].append((x,y))
        for i,arr in enumerate(Q):
            if not arr: continue
            mx = sum(p[0] for p in arr)/len(arr); my = sum(p[1] for p in arr)/len(arr)
            clusters.append({ 'id': i, 'centroid': {'type':'Point','coordinates':[mx,my]}, 'count': len(arr) })
    return { 'clusters': clusters, 'total_points': len(pts) }


@router.post('/models/detect')
async def detect_model(
    imagery: UploadFile | None = File(default=None),
    shapefile: UploadFile | None = File(default=None),
    dem: UploadFile | None = File(default=None),
    notes: str | None = Form(default=None),
    db = Depends(get_db),
    user = Depends(get_current_user),
):
    # Save files if provided
    paths = {}
    if imagery: paths['imagery'] = await save_upload_file(imagery, 'detect/imagery')
    if shapefile: paths['shapefile'] = await save_upload_file(shapefile, 'detect/shapefile')
    if dem: paths['dem'] = await save_upload_file(dem, 'detect/dem')

    job_id = str(uuid4())
    user_email = (user or {}).get('sub', 'anonymous')
    doc = {
        '_id': job_id,
        'status': 'pending',
        'created_at': datetime.utcnow(),
        'files': paths,
        'notes': notes,
        'user_email': user_email,
        'area_legal': None,
        'area_illegal': None,
        'volume_cubic_m': None,
        'depth_stats': None,
        'result_map_url': None,
    }
    await db.get_collection('detection_jobs').insert_one(doc)
    # enqueue background task
    task = process_detection_job_task.delay(job_id, paths)
    return { 'job_id': job_id, 'task_id': task.id, 'status': 'pending' }


class DetectFromUrlIn(BaseModel):
    url: str
    notes: str | None = None
    content_type: str | None = None
    filename: str | None = None
    provider: str | None = None  # 'earthdata' | 'http'


@router.post('/models/detect-from-url')
async def detect_from_url(data: DetectFromUrlIn, db = Depends(get_db), user = Depends(get_current_user)):
    # Download the remote file (optionally add auth headers in future for Earthdata)
    if (data.provider or '').lower() == 'earthdata':
        from ..providers.earthdata import download as ed_download
        content = await ed_download(data.url)
        ctype = data.content_type or 'application/octet-stream'
        fname = data.filename or data.url.split('/')[-1] or 'scene.tif'
    else:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.get(data.url)
            r.raise_for_status()
            content = r.content
            ctype = data.content_type or r.headers.get('Content-Type') or 'application/octet-stream'
            fname = data.filename or data.url.split('/')[-1] or 'scene.tif'

    job_id = str(uuid4())
    paths = {}
    if s3_enabled():
        key = generate_s3_key('detect/imagery', fname)
        url = save_bytes_to_s3(key, content, content_type=ctype)
        paths['imagery'] = url
    else:
        # Save to local storage via save_upload_file requires UploadFile; write bytes manually
        from ..utils.file_storage import STORAGE_ROOT
        import os
        os.makedirs(STORAGE_ROOT / 'detect' / 'imagery', exist_ok=True)
        local_path = STORAGE_ROOT / 'detect' / 'imagery' / fname
        with open(local_path, 'wb') as f:
            f.write(content)
        paths['imagery'] = str(local_path)

    doc = {
        '_id': job_id,
        'status': 'pending',
        'created_at': datetime.utcnow(),
        'files': paths,
        'notes': data.notes,
        'user_email': (user or {}).get('sub', 'anonymous'),
        'area_legal': None,
        'area_illegal': None,
        'volume_cubic_m': None,
        'depth_stats': None,
        'result_map_url': None,
    }
    await db.get_collection('detection_jobs').insert_one(doc)
    task = process_detection_job_task.delay(job_id, paths)
    return { 'job_id': job_id, 'task_id': task.id, 'status': 'pending' }


class DetectFromBboxIn(BaseModel):
    bbox: list[float]  # [minLon,minLat,maxLon,maxLat]
    notes: str | None = None
    older_date: str | None = None  # YYYY-MM-DD (for DEM historical labeling)


@router.post('/models/detect-from-bbox')
async def detect_from_bbox(data: DetectFromBboxIn, db = Depends(get_db), user = Depends(get_current_user)):
    job_id = str(uuid4())
    doc = {
        '_id': job_id,
        'status': 'pending',
        'created_at': datetime.utcnow(),
        'files': {},
        'aoi_bbox': data.bbox,
        'notes': data.notes,
        'older_date': data.older_date,
        'user_email': (user or {}).get('sub', 'anonymous'),
    }
    await db.get_collection('detection_jobs').insert_one(doc)
    task = process_detection_job_task.delay(job_id, {})
    return { 'job_id': job_id, 'task_id': task.id, 'status': 'pending' }


class RiskIn(BaseModel):
    bbox: list[float] | None = None  # [minLon,minLat,maxLon,maxLat]
    aoi: dict | None = None  # GeoJSON Polygon/MultiPolygon
    resolution: int = 24  # surface grid size (resolution x resolution)


@router.post('/predict/risk')
async def predict_risk(data: RiskIn, db = Depends(get_db)):
    """Minimal spatial risk heuristic.
    If bbox or aoi provided, counts detections intersecting the area and maps to a [0,1] risk.
    Also returns a small risk surface grid for quick visualization.
    """
    import math
    import random

    # Compute scalar risk based on detections density
    risk_score = 0.0
    try:
        query = {}
        geom_filter = None
        if data.bbox and len(data.bbox) == 4:
            minx, miny, maxx, maxy = data.bbox
            # Build bbox polygon for $geoIntersects
            bbox_poly = {
                'type': 'Polygon',
                'coordinates': [[
                    [minx, miny], [maxx, miny], [maxx, maxy], [minx, maxy], [minx, miny]
                ]]
            }
            geom_filter = { 'geometry': { '$geoIntersects': { '$geometry': bbox_poly } } }
        elif data.aoi and isinstance(data.aoi, dict):
            geom = data.aoi
            if geom.get('type') == 'Feature':
                geom = geom.get('geometry')
            if isinstance(geom, dict) and geom.get('type') in ('Polygon','MultiPolygon'):
                geom_filter = { 'geometry': { '$geoIntersects': { '$geometry': geom } } }
        if geom_filter:
            query.update(geom_filter)
        # count detections in area (fallback to global if none)
        count = await db.get_collection('detections').count_documents(query or {})
        # map count -> risk in [0,1] with soft saturation
        risk_score = 1.0 - math.exp(-float(count) / 10.0)
    except Exception:
        risk_score = 0.25

    # Build a toy surface for quick heatmap tiles
    n = max(8, min(100, int(data.resolution or 24)))
    surface: list[list[float]] = []
    # Center hotspot scaled by risk_score
    for i in range(n):
        row: list[float] = []
        for j in range(n):
            r = math.hypot(i - (n-1)/2.0, j - (n-1)/2.0) / ((n-1)/2.0)
            base = max(0.0, 1.0 - r)  # 1 at center to 0 at edges
            noise = (random.random() - 0.5) * 0.1
            row.append(max(0.0, min(1.0, risk_score * base + noise)))
        surface.append(row)

    # Extract top hotspots (grid indices mapped to [0,1]x[0,1] local coords)
    flat = [ (surface[i][j], i, j) for i in range(n) for j in range(n) ]
    flat.sort(reverse=True)
    top = [ {'i': i, 'j': j, 'score': round(float(s),3)} for (s,i,j) in flat[: min(20, n)] ]
    # Simple iso-lines (threshold bands)
    levels = [0.2, 0.4, 0.6, 0.8]
    return {
        'risk': round(float(risk_score), 3),
        'resolution': n,
        'surface': surface,
        'hotspots': top,
        'levels': levels,
    }


@router.get('/models/jobs')
async def list_detection_jobs(
    start: str | None = Query(default=None, description="ISO date/time start inclusive"),
    end: str | None = Query(default=None, description="ISO date/time end inclusive"),
    user_email: str | None = Query(default=None, alias="user", description="Filter by user email (authority only)"),
    limit: int = Query(default=100, ge=1, le=200, description="Number of items to return"),
    skip: int = Query(default=0, ge=0, description="Number of items to skip"),
    db = Depends(get_db),
    user = Depends(get_current_user),
):
    col = db.get_collection('detection_jobs')
    # Allow authorities to list all; users see only their jobs
    query: dict = {}
    from datetime import datetime
    # Date filter
    if start or end:
        rng: dict = {}
        try:
            if start:
                rng['$gte'] = datetime.fromisoformat(start)
            if end:
                rng['$lte'] = datetime.fromisoformat(end)
            if rng:
                query['created_at'] = rng
        except Exception:
            pass
    # User filter
    if (user or {}).get('role') != 'authority':
        query['user_email'] = (user or {}).get('sub')
    elif user_email:
        query['user_email'] = user_email
    out = []
    cursor = col.find(query).sort('created_at', -1).skip(skip).limit(limit)
    async for j in cursor:
        out.append({
            'id': j.get('_id'),
            'status': j.get('status'),
            'created_at': j.get('created_at'),
            'area_illegal': j.get('area_illegal'),
            'volume_cubic_m': j.get('volume_cubic_m'),
        })
    return out


@router.get('/models/jobs/{job_id}')
async def get_detection_job(job_id: str, db = Depends(get_db), user = Depends(get_current_user)):
    col = db.get_collection('detection_jobs')
    j = await col.find_one({ '_id': job_id })
    if not j:
        return { 'id': job_id, 'status': 'not-found' }
    # Access control: only owner or authority can view
    if (user or {}).get('role') != 'authority':
        if j.get('user_email') and j.get('user_email') != (user or {}).get('sub'):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')
    return {
        'id': j.get('_id'),
        'status': j.get('status'),
        'created_at': j.get('created_at'),
        'completed_at': j.get('completed_at'),
        'area_legal': j.get('area_legal'),
        'area_illegal': j.get('area_illegal'),
        'volume_cubic_m': j.get('volume_cubic_m'),
        'depth_stats': j.get('depth_stats'),
        'result_map_url': j.get('result_map_url'),
    }


@router.get('/models/jobs/{job_id}/export')
async def export_detection_job_geojson(job_id: str, db = Depends(get_db), user = Depends(get_current_user)):
    """
    Export key visualization layers as GeoJSON FeatureCollection.
    Relies on the same underlying store as /visualization/{job_id}.
    """
    # Access control: reuse from get_detection_job
    j = await db.get_collection('detection_jobs').find_one({'_id': job_id})
    if not j:
        raise HTTPException(status_code=404, detail='Job not found')
    if (user or {}).get('role') != 'authority':
        if j.get('user_email') and j.get('user_email') != (user or {}).get('sub'):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')

    # Try to fetch visualization from visualization router/service
    try:
        # Import lazily to avoid circular deps if any
        from ..visualization.router import get_visualization_data  # hypothetical internal helper
        viz = await get_visualization_data(job_id, db)
    except Exception:
        # Fallback: if layers stored on job doc
        viz = j.get('viz') or {}

    layers = (viz or {}).get('layers') or {}
    polys = layers.get('illegal_polygons') or layers.get('illegal') or []
    depth = layers.get('depth_polygons') or layers.get('depth') or []
    boundary = layers.get('legal_boundary') or layers.get('boundary') or None

    def as_feature(g, props=None):
        return { 'type': 'Feature', 'geometry': g, 'properties': props or {} }

    features = []
    for f in polys:
        if isinstance(f, dict) and f.get('type') in ('Polygon','MultiPolygon'):
            features.append(as_feature(f, {'layer': 'illegal'}))
    for f in depth:
        if isinstance(f, dict) and f.get('geometry'):
            g = f.get('geometry')
            if isinstance(g, dict) and g.get('type') in ('Polygon','MultiPolygon'):
                props = f.get('properties') or {}
                props['layer'] = 'depth'
                features.append(as_feature(g, props))
    if isinstance(boundary, dict) and boundary.get('type') in ('Polygon','MultiPolygon'):
        features.append(as_feature(boundary, {'layer': 'boundary'}))

    fc = { 'type': 'FeatureCollection', 'features': features }
    return JSONResponse(content=fc)


@router.get('/detections/export.csv')
async def export_detections_csv(
    limit: int = Query(default=1000, ge=1, le=10000),
    skip: int = Query(default=0, ge=0),
    geometry_type: str | None = Query(default=None),
    db = Depends(get_db),
    user = Depends(get_current_user),
):
    """Export detections as CSV from mining_detections collection if present.
    Columns: id, report_id, type, confidence, area, centroid_lng, centroid_lat
    """
    col = db.get_collection('mining_detections')
    query = {}
    if geometry_type:
        query['geometry.type'] = { '$in': [g.strip() for g in geometry_type.split(',')] }
    rows = []
    async for d in col.find(query).skip(skip).limit(limit):
        props = d.get('properties') or {}
        cent = d.get('centroid') or {}
        rows.append([
            str(d.get('_id')),
            str(d.get('report_id') or ''),
            str(props.get('type') or props.get('class') or ''),
            props.get('confidence'),
            props.get('area') or props.get('area_ha') or props.get('area_sqkm'),
            (cent.get('coordinates') or [None,None])[0],
            (cent.get('coordinates') or [None,None])[1],
        ])
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(['id','report_id','type','confidence','area','centroid_lng','centroid_lat'])
    for r in rows: w.writerow(r)
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type='text/csv', headers={ 'Content-Disposition': 'attachment; filename="detections.csv"' })
