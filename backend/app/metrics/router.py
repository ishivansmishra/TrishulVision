from fastapi import APIRouter, Depends
from ..mongo import get_db

router = APIRouter()


@router.get('/overview')
async def metrics_overview(db = Depends(get_db)):
    out = {}
    try:
        out['reports_total'] = await db.get_collection('mining_reports').count_documents({})
    except Exception:
        out['reports_total'] = 0
    try:
        out['alerts_total'] = await db.get_collection('alerts').count_documents({})
    except Exception:
        out['alerts_total'] = 0
    try:
        out['blockchain_verified'] = await db.get_collection('blockchain_logs').count_documents({'verified': True})
    except Exception:
        out['blockchain_verified'] = 0
    try:
        out['detection_jobs'] = await db.get_collection('detection_jobs').count_documents({})
    except Exception:
        out['detection_jobs'] = 0
    try:
        out['active_sites'] = await db.get_collection('shapefiles').count_documents({})
    except Exception:
        out['active_sites'] = 0
    return out


@router.get('/environmental')
async def environmental_metrics(db = Depends(get_db)):
    """Return a lightweight environmental score bundle.
    Placeholder computes NDVI/PM2.5/CO2 proxies from latest detections & reports.
    """
    out = {
        'ndvi_score': 0.62,
        'pm25_ugm3': 18.4,
        'co2_ppm': 417.2,
        'timestamp': None,
    }
    try:
        # Use most recent report timestamp as reference
        doc = await db.get_collection('mining_reports').find_one({}, sort=[('created_at', -1)])
        if doc and doc.get('created_at'):
            out['timestamp'] = doc['created_at']
    except Exception:
        pass
    return out


@router.get('/environmental/score')
async def environmental_score(
    lat: float | None = None,
    lng: float | None = None,
    date: str | None = None,
):
    """
    Compute a simple environmental impact score using NDVI (proxy), rainfall, and CO2 (fallbacks).
    If lat/lng not provided, returns global defaults.
    Score ~ [0,100] where higher means higher impact.
    """
    import httpx, math
    ndvi = 0.6
    rain = 20.0
    co2 = 417.0
    # Try Open-Meteo rainfall
    try:
        if isinstance(lat, (int,float)) and isinstance(lng, (int,float)):
            url = 'https://api.open-meteo.com/v1/forecast'
            params = { 'latitude': lat, 'longitude': lng, 'hourly': 'rain' }
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(url, params=params)
                if r.status_code == 200:
                    j = r.json(); arr = (j.get('hourly') or {}).get('rain') or []
                    if arr:
                        rain = float(sum([v for v in arr if isinstance(v,(int,float))]) / max(1,len(arr)))
    except Exception:
        pass
    # NASA POWER NDVI proxy not directly available; keep stub constant
    # Score composition
    score = 50.0 * (1.0 - ndvi) + 0.3 * rain + 0.02 * (co2 - 400.0)
    return { 'score': round(float(score),2), 'ndvi': ndvi, 'rain_mm_h': round(float(rain),2), 'co2_ppm': co2 }


@router.post('/environmental/eri')
async def environmental_risk_index(payload: dict | None = None, db = Depends(get_db)):
    """AI Environmental Risk Index (ERI) combining NDVI, CO2, deforestation rate, rainfall.
    Returns ERI in [0,100] where higher = higher risk.
    """
    ndvi = float((payload or {}).get('ndvi') or 0.5)
    co2 = float((payload or {}).get('co2_ppm') or 417.0)
    defor = float((payload or {}).get('deforestation_rate') or 0.02)  # 2%
    rain = float((payload or {}).get('rain_mm') or 20.0)
    # Weighted composition (tunable)
    eri = 40.0*(1.0-ndvi) + 0.03*(co2-400.0) + 30.0*defor + 0.2*rain
    return { 'eri': round(float(eri),2), 'components': { 'ndvi': ndvi, 'co2_ppm': co2, 'deforestation_rate': defor, 'rain_mm': rain } }


@router.post('/environmental/recovery')
async def ecosystem_recovery_predictor(payload: dict | None = None):
    """Predict recovery time (years) based on ERI and area disturbed (ha)."""
    eri = float((payload or {}).get('eri') or 50.0)
    area = float((payload or {}).get('area_ha') or 5.0)
    # Simple heuristic: higher ERI and larger area -> longer recovery
    years = max(0.5, 0.1*area + 0.05*eri)
    return { 'recovery_years': round(float(years), 1) }


@router.post('/environmental/carbon')
async def carbon_footprint_estimator(payload: dict | None = None):
    """Estimate CO2e emissions from exposed area.
    Inputs: area_ha, depth_m (optional), material_factor (tCO2e/ha baseline)
    """
    area = float((payload or {}).get('area_ha') or 2.0)
    depth = float((payload or {}).get('depth_m') or 5.0)
    factor = float((payload or {}).get('material_factor') or 10.0)
    co2e = area * factor * (1.0 + 0.02*max(0.0, depth-3.0))
    return { 'co2e_tons': round(float(co2e), 2) }


@router.post('/environmental/reforestation')
async def reforestation_suggestions(payload: dict | None = None):
    """Suggest zones for re-plantation: returns center points with priority scores (stub)."""
    # Return 3 pseudo-suggestions within [0,1]x[0,1] AOI-local grid
    suggestions = [
        { 'lonlat': [0.2, 0.7], 'priority': 0.92 },
        { 'lonlat': [0.5, 0.5], 'priority': 0.81 },
        { 'lonlat': [0.8, 0.3], 'priority': 0.77 },
    ]
    return { 'suggestions': suggestions }


@router.get('/timeline/mining')
async def mining_timeline(db = Depends(get_db), buckets: int = 12):
    """Aggregate detected illegal area by month (stub fallback if no data)."""
    buckets = max(3, min(48, int(buckets or 12)))
    out = []
    try:
        cur = db.get_collection('mining_reports').find({}, projection={'created_at':1,'result.area_illegal_ha':1})
        async for r in cur:
            ts = r.get('created_at')
            area = ((r.get('result') or {}).get('area_illegal_ha'))
            out.append({ 't': ts, 'area_illegal_ha': area })
        # If empty, return synthetic trend
        if not out:
            out = [{ 't': i, 'area_illegal_ha': max(0.0, 5.0 * (i/buckets) + (i%3)) } for i in range(buckets)]
    except Exception:
        out = [{ 't': i, 'area_illegal_ha': max(0.0, 3.0 * (i/buckets)) } for i in range(buckets)]
    return out
