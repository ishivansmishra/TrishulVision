from __future__ import annotations
"""
Google Earth Engine provider stub.

Note: Real GEE access requires the earthengine API and account authorization.
This stub exposes a minimal, no-network interface for development.
"""
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from ..config import settings


def search(aoi: Dict[str, Any], collection: str = "COPERNICUS/S2_SR", start: str = "2024-01-01", end: str = "2024-12-31") -> List[Dict[str, Any]]:
    return [
        {
            "id": f"gee-{collection}-sample",
            "bbox": [77.2, 28.6, 77.3, 28.7],
            "time_start": start,
            "time_end": end,
            "provider": "gee",
        }
    ]


def compute_ndvi(aoi: Dict[str, Any]) -> Dict[str, Any]:
    """Return a trivial NDVI summary for the AOI (stub)."""
    return {"mean": 0.32, "min": 0.05, "max": 0.78}


def available_dates(
    aoi: Dict[str, Any] | None,
    start: str,
    end: str,
    collection: str = "COPERNICUS/S2_SR",
    bbox: Optional[List[float]] = None,
    max_cloud_percent: Optional[float] = None,
    intersects: bool = False,
) -> List[str]:
    """Return unique acquisition dates from GEE if enabled; else coarse monthly list.

    Uses ImageCollection.filterDate and filterBounds (geometry or bbox) and a cloud cover property filter when available.
    """
    if settings.GEE_ENABLED:
        try:
            import ee  # type: ignore
            if not ee.data._initialized:  # type: ignore
                if settings.GEE_SERVICE_ACCOUNT and settings.GEE_PRIVATE_KEY:
                    credentials = ee.ServiceAccountCredentials(settings.GEE_SERVICE_ACCOUNT, key_data=settings.GEE_PRIVATE_KEY)
                    ee.Initialize(credentials)
                else:
                    ee.Initialize()
            geom = None
            if intersects and isinstance(aoi, dict):
                geom = ee.Geometry(aoi)
            elif bbox and len(bbox) == 4:
                minx, miny, maxx, maxy = bbox
                geom = ee.Geometry.Rectangle([minx, miny, maxx, maxy])
            elif isinstance(aoi, dict):
                geom = ee.Geometry(aoi).bounds()
            coll = ee.ImageCollection(collection).filterDate(start[:10], end[:10])
            if geom:
                coll = coll.filterBounds(geom)
            # Cloud cover property varies; try standard keys
            if isinstance(max_cloud_percent, (int, float)):
                for prop in ['CLOUD_COVER', 'CLOUDY_PIXEL_PERCENTAGE', 'cloudyPixelPercentage']:
                    try:
                        coll = coll.filter(ee.Filter.lt(prop, float(max_cloud_percent)))
                        break
                    except Exception:
                        pass
            # Map to dates
            def _to_date(img):
                return ee.Feature(None, {'date': ee.Date(img.get('system:time_start')).format('YYYY-MM-dd')})
            dates_fc = ee.FeatureCollection(coll.map(_to_date))
            dates = dates_fc.aggregate_array('date').getInfo()
            if isinstance(dates, list):
                return sorted(list(set([str(d)[:10] for d in dates])))
        except Exception:
            pass
    # Fallback: coarse monthly list
    try:
        d0 = datetime.fromisoformat(start[:10])
        d1 = datetime.fromisoformat(end[:10])
    except Exception:
        return [end[:10] or start[:10]]
    if d1 < d0:
        d0, d1 = d1, d0
    out: List[str] = []
    cur = datetime(d0.year, d0.month, 1)
    last = datetime(d1.year, d1.month, 1)
    while cur <= last:
        out.append(cur.date().isoformat())
        y = cur.year + (cur.month // 12)
        m = (cur.month % 12) + 1
        cur = datetime(y, m, 1)
    return out
