from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from datetime import datetime
from uuid import uuid4

from ..mongo import get_db
from ..dependencies import get_current_user
from ..utils.file_storage import save_upload_file
from ..tasks.celery_worker import process_mining_report_task
from typing import Optional, List, Dict, Any, Iterable

try:
    # Optional: used for geometry unions and centroid calculations
    from shapely.geometry import shape as shp_shape, mapping as shp_mapping
    from shapely.ops import unary_union as shp_unary_union
    _HAS_SHAPELY = True
except Exception:
    _HAS_SHAPELY = False

router = APIRouter()


@router.post('/upload')
async def upload_file(file: UploadFile = File(...), db = Depends(get_db), user=Depends(get_current_user)):
    # Save file and create DB report
    path = await save_upload_file(file, subpath='uploads')
    col = db.get_collection('mining_reports')
    rid = str(uuid4())
    doc = {
        '_id': rid,
        'user_email': (user or {}).get('sub', 'anonymous'),
        'filename': file.filename,
        'status': 'pending',
        'created_at': datetime.utcnow(),
        'result': None,
        'file_path': path,
    }
    await col.insert_one(doc)
    # enqueue celery task
    task = process_mining_report_task.delay(rid, path)
    return JSONResponse({"report_id": rid, "task_id": task.id})


## NOTE: Keep dynamic '/{report_id}' at the end to avoid shadowing static routes like '/detections-recent'


@router.get('/')
async def list_reports(email: Optional[str] = None, db = Depends(get_db)) -> List[Dict[str, Any]]:
    col = db.get_collection('mining_reports')
    query = {"user_email": email} if email else {}
    cursor = col.find(query).sort("created_at", -1).limit(100)
    items: List[Dict[str, Any]] = []
    async for r in cursor:
        items.append({
            "id": str(r["_id"]),
            "status": r.get("status"),
            "filename": r.get("filename"),
            "created_at": r.get("created_at").isoformat() if r.get("created_at") else None,
            "result": r.get("result"),
        })
    return items


def _parse_geom_types(value: Optional[str]) -> Optional[List[str]]:
    if not value:
        return None
    # Accept comma-separated values, trim whitespace
    items = [v.strip() for v in str(value).split(',') if v.strip()]
    return items or None


def _centroid_of_geojson(geom: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        if not geom:
            return None
        gtype = geom.get('type')
        # Points: centroid is the point itself
        if gtype == 'Point':
            return { 'type': 'Point', 'coordinates': list(geom.get('coordinates', [])) }
        if not _HAS_SHAPELY:
            return None
        centroid = shp_shape(geom).centroid
        return shp_mapping(centroid)
    except Exception:
        return None


@router.get('/detections')
async def get_detections(
    report_id: str,
    db = Depends(get_db),
    limit: int = 100,
    skip: int = 0,
    geometry_type: str | None = Query(default=None, description="Filter by one or more geometry types, comma-separated e.g. 'Polygon,Point'"),
    with_centroid: bool = Query(default=False, description="If true, include centroid GeoJSON for each detection as 'centroid'"),
) -> List[Dict[str, Any]]:
    limit = max(1, min(limit, 1000))
    skip = max(0, skip)
    col = db.get_collection('detections')
    q: Dict[str, Any] = { 'report_id': report_id }
    types = _parse_geom_types(geometry_type)
    if types:
        if len(types) == 1:
            q['geometry.type'] = types[0]
        else:
            q['geometry.type'] = { '$in': types }
    cursor = col.find(q).skip(skip).limit(limit)
    out: List[Dict[str, Any]] = []
    async for d in cursor:
        item = {
            'id': d.get('_id'),
            'report_id': d.get('report_id'),
            'geometry': d.get('geometry'),
            'properties': d.get('properties', {}),
        }
        if with_centroid:
            c = _centroid_of_geojson(item['geometry'])
            if c:
                item['centroid'] = c
        out.append(item)
    return out


@router.get('/detections/{detection_id}')
async def get_detection(detection_id: str, db = Depends(get_db)) -> Dict[str, Any]:
    col = db.get_collection('detections')
    d = await col.find_one({ '_id': detection_id })
    if not d:
        raise HTTPException(status_code=404, detail='Detection not found')
    return {
        'id': d.get('_id'),
        'report_id': d.get('report_id'),
        'geometry': d.get('geometry'),
        'properties': d.get('properties', {}),
    }


@router.get('/detections-recent')
async def list_recent_detections(db = Depends(get_db), limit: int = 200) -> List[Dict[str, Any]]:
    limit = max(1, min(limit, 1000))
    col = db.get_collection('detections')
    cursor = col.find({}).sort('_id', -1).limit(limit)
    out: List[Dict[str, Any]] = []
    async for d in cursor:
        out.append({
            'id': d.get('_id'),
            'report_id': d.get('report_id'),
            'geometry': d.get('geometry'),
            'properties': d.get('properties', {}),
        })
    return out


    


@router.post('/illegal/by-boundary')
async def get_illegal_by_boundary(
    boundary: dict,
    db = Depends(get_db),
    mode: str = 'within',
    report_id: str | None = None,
    geometry_type: str | None = Query(default=None, description="Filter detections by one or more geometry types, comma-separated e.g., 'Point,Polygon'"),
    with_centroid: bool = Query(default=False, description="If true, include centroid GeoJSON for each detection as 'centroid'"),
):
    """
    Basic geospatial check:
    - Accepts a GeoJSON Polygon/MultiPolygon as { "type": "Polygon"|"MultiPolygon", "coordinates": [...] }
    - Returns detections whose geometry is NOT within the boundary (illegal outside area)
    Requirements:
    - 'detections' collection with 'geometry' GeoJSON field and 2dsphere index
    """
    geom = boundary
    # Accept Feature or FeatureCollection as well
    if isinstance(geom, dict) and geom.get('type') == 'Feature':
        geom = geom.get('geometry')
    elif isinstance(geom, dict) and geom.get('type') == 'FeatureCollection':
        # Server-side union using shapely
        try:
            if not _HAS_SHAPELY:
                raise RuntimeError('Shapely unavailable')
            feats = (geom.get('features') or [])
            polys = []
            for f in feats:
                g = (f or {}).get('geometry')
                if isinstance(g, dict) and g.get('type') in ('Polygon', 'MultiPolygon'):
                    polys.append(shp_shape(g))
            if not polys:
                geom = None
            else:
                merged = shp_unary_union(polys)
                geom = shp_mapping(merged)
        except Exception:
            # Fallback: take first polygon-like geometry
            feats = (geom.get('features') or [])
            geom = None
            for f in feats:
                g = (f or {}).get('geometry')
                if isinstance(g, dict) and g.get('type') in ('Polygon', 'MultiPolygon'):
                    geom = g
                    break
    if not isinstance(geom, dict) or geom.get('type') not in ('Polygon', 'MultiPolygon'):
        raise HTTPException(status_code=400, detail='Provide GeoJSON Polygon or MultiPolygon/Feature/FeatureCollection in request body')
    col = db.get_collection('detections')
    # Choose operator based on requested mode
    # mode='within': illegal if NOT within (outside)
    # mode='intersects': illegal if NOT intersects (completely outside)
    if mode == 'intersects':
        base_cond = {'geometry': {'$geoIntersects': {'$geometry': geom}}}
    else:
        base_cond = {'geometry': {'$geoWithin': {'$geometry': geom}}}

    query = {'$nor': [base_cond]}
    if report_id:
        query['report_id'] = report_id
    types = _parse_geom_types(geometry_type)
    if types:
        if len(types) == 1:
            query['geometry.type'] = types[0]
        else:
            query['geometry.type'] = { '$in': types }
    cursor = col.find(query).limit(200)
    results = []
    async for d in cursor:
        item = {
            'id': d.get('_id'),
            'report_id': d.get('report_id'),
            'geometry': d.get('geometry'),
            'properties': d.get('properties', {}),
        }
        if with_centroid:
            c = _centroid_of_geojson(item['geometry'])
            if c:
                item['centroid'] = c
        results.append(item)
    return results


@router.get('/{report_id}')
async def get_report(report_id: str, db = Depends(get_db)):
    col = db.get_collection('mining_reports')
    report = await col.find_one({'_id': report_id})
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    return {
        "id": str(report["_id"]),
        "status": report.get("status"),
        "result": report.get("result"),
        "filename": report.get("filename"),
        "created_at": report.get("created_at").isoformat() if report.get("created_at") else None,
    }

@router.post('/compliance/check')
async def compliance_check(
    lease: dict,
    db = Depends(get_db),
    report_id: str | None = None,
    geometry_type: str | None = Query(default=None, description="Filter detections by types e.g. 'Polygon,Point'"),
):
    """
    Compare a lease boundary (GeoJSON Polygon/MultiPolygon or Feature/FeatureCollection) with AI detections.
    Returns detections outside the lease and a basic compliance score in [0,1].

    - compliance_score ~ 1.0 when no detections outside
    - Also returns summary counts/areas when Shapely is available
    """
    # Normalize lease geometry
    geom = lease
    if isinstance(geom, dict) and geom.get('type') == 'Feature':
        geom = geom.get('geometry')
    elif isinstance(geom, dict) and geom.get('type') == 'FeatureCollection':
        # Union of polygonal features if possible
        try:
            if not _HAS_SHAPELY:
                raise RuntimeError('Shapely unavailable')
            feats = (geom.get('features') or [])
            polys = []
            for f in feats:
                g = (f or {}).get('geometry')
                if isinstance(g, dict) and g.get('type') in ('Polygon', 'MultiPolygon'):
                    polys.append(shp_shape(g))
            if polys:
                merged = shp_unary_union(polys)
                geom = shp_mapping(merged)
        except Exception:
            # take first polygon-like geometry
            feats = (geom.get('features') or [])
            for f in feats:
                g = (f or {}).get('geometry')
                if isinstance(g, dict) and g.get('type') in ('Polygon', 'MultiPolygon'):
                    geom = g
                    break
    if not isinstance(geom, dict) or geom.get('type') not in ('Polygon', 'MultiPolygon'):
        raise HTTPException(status_code=400, detail='Provide GeoJSON Polygon/MultiPolygon/Feature/FeatureCollection')

    # Query detections outside lease (reuse logic)
    col = db.get_collection('detections')
    base_cond = {'geometry': {'$geoWithin': {'$geometry': geom}}}
    query = {'$nor': [base_cond]}
    if report_id:
        query['report_id'] = report_id
    types = _parse_geom_types(geometry_type)
    if types:
        query['geometry.type'] = types[0] if len(types) == 1 else {'$in': types}

    outside: list[dict] = []
    cursor = col.find(query).limit(500)
    async for d in cursor:
        outside.append({
            'id': d.get('_id'),
            'geometry': d.get('geometry'),
            'properties': d.get('properties', {}),
            'report_id': d.get('report_id'),
        })

    # Summary and compliance score
    count_out = len(outside)
    comp_score = 1.0 if count_out == 0 else max(0.0, 1.0 - min(1.0, count_out / 50.0))
    area_out = None
    lease_area = None
    if _HAS_SHAPELY:
        try:
            lease_poly = shp_shape(geom)
            lease_area = float(lease_poly.area)
        except Exception:
            lease_area = None
        try:
            polys = []
            for it in outside:
                g = it.get('geometry')
                if isinstance(g, dict) and g.get('type') in ('Polygon','MultiPolygon'):
                    polys.append(shp_shape(g))
            if polys:
                u = shp_unary_union(polys)
                area_out = float(u.area)
        except Exception:
            area_out = None
        # area-sensitive score if both areas known
        if area_out is not None and lease_area and lease_area > 0:
            frac = min(1.0, area_out / lease_area)
            comp_score = max(0.0, 1.0 - frac)

    return {
        'compliance_score': round(float(comp_score), 3),
        'outside_count': count_out,
        'outside_area': area_out,
        'lease_area': lease_area,
        'outside': outside[:200],
    }
