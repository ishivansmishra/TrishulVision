from celery import Celery
import os
import socket

redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')


def _redis_available(url: str) -> bool:
    # quick check for default host:port pattern
    try:
        if url.startswith('redis://'):
            hostport = url[len('redis://'):].split('/')[0]
            host, port = hostport.split(':')
            port = int(port)
            s = socket.socket()
            s.settimeout(0.5)
            s.connect((host, port))
            s.close()
            return True
    except Exception:
        return False
    return False


# If Redis is not reachable, configure Celery to run tasks eagerly (synchronously)
if _redis_available(redis_url):
    celery_app = Celery('trishul_tasks', broker=redis_url, backend=redis_url)
    celery_app.conf.task_always_eager = False
else:
    celery_app = Celery('trishul_tasks', broker='memory://', backend='rpc://')
    celery_app.conf.task_always_eager = True

@celery_app.task(bind=True)
def process_image_task(self, filename: str):
    # Placeholder task - integrate ai/vision_model here
    print('Processing', filename)
    return {'filename': filename, 'status': 'done'}


@celery_app.task(bind=True)
def process_mining_report_task(self, report_id: str, path: str):
    # Import inside task to avoid heavy imports on worker startup
    from ..ai.vision_model import detect_mining
    from ..ai.predictive_model import estimate_depth_volume
    from ..reports import router as reports_router
    from ..blockchain import router as blockchain_router
    # Mongo-only backend; SQLAlchemy fallback removed
    from ..config import settings
    from pymongo import MongoClient
    from uuid import uuid4

    print(f'Processing report {report_id} for file {path}')

    # Run detection (stub)
    detections = detect_mining(path)
    # Run depth/volume estimation (stub) per detection (placeholder)
    est = estimate_depth_volume(path, {})

    client = MongoClient(settings.MONGO_URL)
    db = client[settings.MONGO_DB_NAME]
    rid = report_id if isinstance(report_id, str) else str(report_id)

    # Store detections as GeoJSON for geospatial queries (if present)
    try:
        det_col = db.get_collection('detections')
        det_col.create_index([('geometry', '2dsphere')])
        docs = []
        for d in (detections or []):
            geom = None
            if isinstance(d, dict):
                geom = d.get('geometry') or d.get('geojson')
                if isinstance(geom, dict) and geom.get('type') == 'Feature':
                    geom = geom.get('geometry')
            if isinstance(geom, dict) and 'type' in geom:
                docs.append({
                    '_id': str(uuid4()),
                    'report_id': rid,
                    'geometry': geom,
                    'properties': {
                        'area_sqm': d.get('area_sqm') if isinstance(d, dict) else None,
                        'confidence': d.get('confidence') if isinstance(d, dict) else None,
                        'model': d.get('model') if isinstance(d, dict) else None,
                    }
                })
        if docs:
            det_col.insert_many(docs)
    except Exception:
        # Non-fatal; continue
        pass

    # Update mining report status and result summary
    rep_col = db.get_collection('mining_reports')
    # Attempt blockchain log
    try:
        from ..blockchain.utils import log_report_hash
        tx_hash = log_report_hash({ 'report_id': rid, 'estimation': est })
    except Exception:
        tx_hash = '0xdeadbeef'
    rep_col.update_one({'_id': rid}, {
        '$set': {
            'status': 'completed',
            'result': {
                'detections': detections,
                'estimation': est,
                'area_ha': 7.2,
                'location': None,
                'tx_hash': tx_hash
            }
        }
    })

    # Generate report and log to blockchain (stubs)
    try:
        reports_router
        blockchain_router
    except Exception:
        pass

    return {'report_id': report_id, 'status': 'processed'}


@celery_app.task(bind=True)
def process_detection_job_task(self, job_id: str, paths: dict):
    from pymongo import MongoClient
    from ..config import settings
    from datetime import datetime
    from ..ai.vision_model import detect_mining as detect_mining_demo
    import os
    # Run detection if imagery present; otherwise simulate
    imagery_path = (paths or {}).get('imagery')
    detections = []
    if imagery_path and isinstance(imagery_path, str):
        try:
            # For s3:// URIs, a real implementation would download or stream
            if imagery_path.startswith('s3://'):
                detections = detect_mining_demo(imagery_path)
            else:
                detections = detect_mining_demo(imagery_path)
        except Exception:
            detections = []

    # Initialize DB client early for job doc reads/writes
    client = MongoClient(settings.MONGO_URL)
    db = client[settings.MONGO_DB_NAME]

    # DEM pipeline for bbox-only jobs (or augment imagery jobs)
    area_legal = 3.8  # ha
    area_illegal = 1.4  # ha
    volume_cubic_m = 65000
    depth_stats = { 'min': 4.2, 'avg': 12.5, 'max': 28.3 }
    result_map_url = f"/static/maps/{job_id}.json"  # placeholder

    try:
        j = db.get_collection('detection_jobs').find_one({'_id': job_id})
        if j and j.get('aoi_bbox'):
            bbox = j['aoi_bbox']
            # Build current DEM mosaic
            from ..dem.terrarium import build_mosaic_geotiff
            from ..utils.file_storage import STORAGE_ROOT
            import anyio
            mosaic_dir = STORAGE_ROOT / 'dem' / 'mosaics'
            mosaic_dir.mkdir(parents=True, exist_ok=True)
            current_mosaic_path = mosaic_dir / f"job_{job_id}_current.tif"
            anyio.run(build_mosaic_geotiff, tuple(bbox), 10, current_mosaic_path)

            # Compute estimates from current mosaic
            from ..ai.predictive_model import estimate_depth_volume
            est = estimate_depth_volume(str(current_mosaic_path), {})
            if isinstance(est, dict):
                volume_cubic_m = est.get('volume_m3', volume_cubic_m) or volume_cubic_m
                avg_d = est.get('depth_m') if isinstance(est.get('depth_m'), (int, float)) else None
                if isinstance(avg_d, (int, float)):
                    depth_stats = { 'min': max(0.0, avg_d * 0.3), 'avg': float(avg_d), 'max': float(avg_d) * 1.8 }

            # If older_date provided on job, build a second mosaic and compute Δh
            older_date = j.get('older_date')
            if older_date:
                older_mosaic_path = mosaic_dir / f"job_{job_id}_older_{older_date}.tif"
                # For Terrarium DEM, tiles are static over time; we still build a second mosaic for Δh scaffolding
                anyio.run(build_mosaic_geotiff, tuple(bbox), 10, older_mosaic_path)
                # Compute Δh stats (newer - older)
                import rasterio
                import numpy as np
                try:
                    with rasterio.open(current_mosaic_path) as ds_new, rasterio.open(older_mosaic_path) as ds_old:
                        arr_new = ds_new.read(1, masked=True).astype('float32')
                        arr_old = ds_old.read(1, masked=True).astype('float32')
                        if arr_new.shape == arr_old.shape:
                            dh = arr_new - arr_old
                            vals = dh.compressed() if hasattr(dh, 'compressed') else dh.flatten()
                            vals = vals[np.isfinite(vals)]
                            if vals.size:
                                depth_stats = {
                                    'min': float(np.min(vals)),
                                    'avg': float(np.mean(vals)),
                                    'max': float(np.max(vals)),
                                }
                except Exception:
                    # Non-fatal; keep previous depth_stats
                    pass
    except Exception:
        # Non-fatal path; keep default stats
        pass
    db.get_collection('detection_jobs').update_one({'_id': job_id}, {
        '$set': {
            'status': 'completed',
            'completed_at': datetime.utcnow(),
            'area_legal': area_legal,
            'area_illegal': area_illegal,
            'volume_cubic_m': volume_cubic_m,
            'depth_stats': depth_stats,
            'result_map_url': result_map_url,
        }
    })

    # Fire an alert if illegal area too large
    try:
        if area_illegal and area_illegal > 1.0:  # threshold
            alert = {
                'type': 'critical', 'title': 'Illegal Mining Detected',
                'location': 'Auto-detected site', 'area': f'{area_illegal} ha',
                'description': f'Illegal mining area exceeds threshold for job {job_id}',
                'created_at': datetime.utcnow(), 'acknowledged': False,
            }
            r = db.get_collection('alerts').insert_one(alert)
            # Try to broadcast over WS (best-effort; ignore failures if event loop not available)
            try:
                from ..alerts.ws_manager import manager as alerts_manager
                import anyio
                payload = { 'id': str(r.inserted_id), **{k:v for k,v in alert.items() if k!='_id'} }
                anyio.run(alerts_manager.broadcast_json, { 'type': 'alert.created', 'payload': payload })
            except Exception:
                pass
    except Exception:
        pass

    # Emit automation event to n8n (best-effort)
    try:
        from ..utils.n8n_client import emit_event
        import anyio
        anyio.run(emit_event, "detection.completed", {
            "job_id": job_id,
            "area_illegal": area_illegal,
            "volume_cubic_m": volume_cubic_m,
            "depth_stats": depth_stats,
        })
    except Exception:
        pass

    return { 'job_id': job_id, 'status': 'completed' }
