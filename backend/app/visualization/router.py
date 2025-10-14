from fastapi import APIRouter, Depends, HTTPException, WebSocket
from ..mongo import get_db
from ..config import settings
from .ws_manager import manager as viz_ws_manager


router = APIRouter()

# Internal helper to assemble a consistent visualization payload
async def get_visualization_data(job_id: str, db):
    jobs = db.get_collection('detection_jobs')
    job = await jobs.find_one({'_id': job_id})
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    # Provide proper GeoJSON stubs so 3D viewer can render polygons and derive extents
    # If you store real results, replace these with actual job outputs.
    legal_boundary = job.get('legal_boundary') or {
        'type': 'Polygon',
        'coordinates': [[[77.20, 28.60],[77.30, 28.60],[77.30, 28.70],[77.20, 28.70],[77.20, 28.60]]]
    }
    illegal_zones = job.get('illegal_zones') or [
        { 'type': 'Polygon', 'coordinates': [[[77.23, 28.62],[77.26, 28.62],[77.26, 28.65],[77.23, 28.65],[77.23, 28.62]]]},
        { 'type': 'Polygon', 'coordinates': [[[77.275, 28.635],[77.285, 28.635],[77.285, 28.645],[77.275, 28.645],[77.275, 28.635]]]},
    ]
    depth_polygons = job.get('depth_polygons') or [
        { 'geometry': { 'type': 'Polygon', 'coordinates': [[[77.24,28.625],[77.255,28.625],[77.255,28.64],[77.24,28.64],[77.24,28.625]]] }, 'properties': { 'depth': 10 }},
        { 'geometry': { 'type': 'Polygon', 'coordinates': [[[77.26,28.645],[77.28,28.645],[77.28,28.665],[77.26,28.665],[77.26,28.645]]] }, 'properties': { 'depth': 22 }},
    ]

    # Compute AOI bbox from legal boundary if available
    def _bbox_from_poly(poly: dict):
        try:
            coords = []
            if poly.get('type') == 'Polygon':
                coords = poly.get('coordinates', [])
            elif poly.get('type') == 'MultiPolygon':
                # flatten outer rings
                coords = [p[0] for p in poly.get('coordinates', [])]
            pts = []
            for ring in coords:
                for x,y in ring:
                    pts.append((x,y))
            if not pts:
                return None
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            return [min(xs), min(ys), max(xs), max(ys)]
        except Exception:
            return None

    bbox = _bbox_from_poly(legal_boundary) or [77.20, 28.60, 77.30, 28.70]
    layers = {
        'legal_boundary': legal_boundary,
        'illegal_zones': illegal_zones,
        'illegal_polygons': illegal_zones,  # alias for exporters
        'depth_polygons': depth_polygons,
    }
    metrics = {
        'area_legal': job.get('area_legal'),
        'area_illegal': job.get('area_illegal'),
        'volume_cubic_m': job.get('volume_cubic_m'),
        'depth_stats': job.get('depth_stats'),
    }
    # Prefer stored map url, else deep-link to frontend terrain page
    map_url = job.get('result_map_url') or f"/authority/terrain3d?job={job_id}"
    return { 'job_id': job_id, 'status': job.get('status'), 'layers': layers, 'metrics': metrics, 'map_url': map_url, 'aoi_bbox': bbox }
@router.get('/heatmap')
async def get_heatmap(db = Depends(get_db), limit: int = 1000, metric: str = 'density'):
    """Return a simple heatmap point list from recent detections' centroids.
    Each item: { lat, lng, intensity } where intensity depends on metric:
    - density: 1 per detection
    - volume: properties.area_sqm (fallback 1)
    - violations: 100 if properties.violation truthy else 0 or 1
    - depth: properties.depth (fallback 1)
    For non-Point geometries, centroid is computed when Shapely is available.
    """
    det = db.get_collection('detections')
    cursor = det.find({}).sort('_id', -1).limit(max(1, min(limit, 5000)))
    out = []
    try:
        from shapely.geometry import shape as shp_shape
        _HAS_SHAPELY = True
    except Exception:
        _HAS_SHAPELY = False
    async for d in cursor:
        g = (d or {}).get('geometry')
        props = (d or {}).get('properties', {})
        try:
            lat = lng = None
            if isinstance(g, dict):
                if g.get('type') == 'Point':
                    lng, lat = g.get('coordinates', [None, None])
                elif _HAS_SHAPELY:
                    try:
                        centroid = shp_shape(g).centroid
                        lat = float(centroid.y); lng = float(centroid.x)
                    except Exception:
                        lat = lng = None
            if isinstance(lng, (int,float)) and isinstance(lat, (int,float)):
                if metric == 'density':
                    intensity = 1
                elif metric == 'volume':
                    intensity = float(props.get('area_sqm') or 1)
                elif metric == 'violations':
                    v = props.get('violation')
                    intensity = 100 if (bool(v)) else 1
                elif metric == 'depth':
                    intensity = float(props.get('depth') or 1)
                else:
                    intensity = float(props.get('confidence') or props.get('area_sqm') or 1)
                out.append({ 'lat': float(lat), 'lng': float(lng), 'intensity': float(intensity) })
        except Exception:
            pass
    # If no detections found in 'detections', try 'mining_detections' (alternate collection name)
    if not out:
        try:
            det2 = db.get_collection('mining_detections')
            cursor2 = det2.find({}).sort('_id', -1).limit(max(1, min(limit, 5000)))
            async for d in cursor2:
                g = (d or {}).get('geometry')
                props = (d or {}).get('properties', {})
                lat = lng = None
                if isinstance(g, dict):
                    if g.get('type') == 'Point':
                        lng, lat = g.get('coordinates', [None, None])
                    elif _HAS_SHAPELY:
                        try:
                            centroid = shp_shape(g).centroid
                            lat = float(centroid.y); lng = float(centroid.x)
                        except Exception:
                            lat = lng = None
                if isinstance(lng, (int,float)) and isinstance(lat, (int,float)):
                    if metric == 'density':
                        intensity = 1
                    elif metric == 'volume':
                        intensity = float(props.get('area_sqm') or 1)
                    elif metric == 'violations':
                        v = props.get('violation')
                        intensity = 100 if (bool(v)) else 1
                    elif metric == 'depth':
                        intensity = float(props.get('depth') or 1)
                    else:
                        intensity = float(props.get('confidence') or props.get('area_sqm') or 1)
                    out.append({ 'lat': float(lat), 'lng': float(lng), 'intensity': float(intensity) })
        except Exception:
            pass

    # Return whatever was found (may be empty). Demo fallbacks removed.
    return out


@router.get('/{job_id}')
async def get_visualization(job_id: str, db = Depends(get_db)):
    return await get_visualization_data(job_id, db)


@router.get('/vr/{job_id}')
async def get_visualization_vr(job_id: str, db = Depends(get_db)):
    """Return 3D layer descriptors suitable for Cesium/WebXR viewers (stub)."""
    base = await get_visualization(job_id, db)
    # If you have real tilesets, populate tileset URLs here. Demo tileset removed.
    tileset = {
        'type': '3dtiles',
        'url': None,
        'style': { 'color': 'rgba(200,160,120,0.8)' },
    }
    return { **base, 'vr': { 'enabled': True, 'tilesets': [tileset] } }


# --- WebSocket for live heatmap updates ---
@router.websocket('/ws')
async def visualization_ws(websocket: WebSocket):
    await viz_ws_manager.connect(websocket)
    try:
        while True:
            # keep alive; ignore incoming messages
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        viz_ws_manager.disconnect(websocket)


# Optional: lightweight emit endpoints so other services can push updates without direct import
@router.post('/heatmap/emit')
async def heatmap_emit(point: dict):
    """Emit a single heatmap point add event: { lat, lng, intensity }"""
    try:
        await viz_ws_manager.broadcast_json({ 'type': 'heatmap.add', 'point': point })
        return { 'sent': True }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/heatmap/remove')
async def heatmap_remove(point: dict):
    """Emit a remove event for a point (client decides matching strategy)."""
    try:
        await viz_ws_manager.broadcast_json({ 'type': 'heatmap.remove', 'point': point })
        return { 'sent': True }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))