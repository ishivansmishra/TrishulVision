from __future__ import annotations
"""
Sentinel Hub provider stub.

This module provides placeholder functions for searching and preparing Sentinel imagery.
Replace with real Sentinel Hub (sentinelhub-py) integration when credentials are configured.
"""
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from ..config import settings


def search(aoi: Dict[str, Any], time_range: Dict[str, str], collection: str = "S2L2A", limit: int = 10) -> List[Dict[str, Any]]:
    """Return a deterministic list of fake results for development.
    aoi: GeoJSON Polygon/MultiPolygon/Feature/FeatureCollection
    time_range: { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
    """
    return [
        {
            "id": f"{collection}-fake-0001",
            "bbox": [77.2, 28.6, 77.3, 28.7],
            "cloudiness": 5.0,
            "acquisition": (time_range.get("end") or time_range.get("start") or "2024-01-01"),
            "provider": "sentinelhub",
        }
    ]


def download_preview(asset_id: str) -> bytes:
    """Return a tiny placeholder PNG/JPEG bytes for UI previews (stub)."""
    return b""


def available_dates(
    aoi: Dict[str, Any] | None,
    start: str,
    end: str,
    collection: str = "S2L2A",
    step_days: int = 5,
    bbox: Optional[List[float]] = None,
    max_cloud_percent: Optional[float] = None,
    intersects: bool = False,
) -> List[str]:
    """Return available acquisition dates from Sentinel Hub if configured; else synthetic cadence.

    Args:
        aoi: GeoJSON geometry; used when `intersects=True`.
        bbox: [minx,miny,maxx,maxy] in EPSG:4326 when geometry not passed or intersects=False.
        start,end: ISO date strings (YYYY-MM-DD) inclusive.
        collection: 'S2L2A' maps to Sentinel-2 L2A.
        max_cloud_percent: optional cloud cover threshold.
        intersects: if True, use geometry intersects instead of bbox search.
    """
    # Attempt real Sentinel Hub Catalog query when credentials are present
    try:
        from sentinelhub import SHConfig, SentinelHubCatalog, BBox, CRS, DataCollection

        cfg = SHConfig()
        if settings.SENTINELHUB_CLIENT_ID and settings.SENTINELHUB_CLIENT_SECRET:
            cfg.sh_client_id = settings.SENTINELHUB_CLIENT_ID
            cfg.sh_client_secret = settings.SENTINELHUB_CLIENT_SECRET
        # else rely on env or default config if available

        collection_map = {
            'S2L2A': DataCollection.SENTINEL2_L2A,
            'S2L1C': DataCollection.SENTINEL2_L1C,
        }
        dc = collection_map.get(collection.upper(), DataCollection.SENTINEL2_L2A)
        cat = SentinelHubCatalog(config=cfg)
        query: Dict[str, Any] = {}
        if isinstance(max_cloud_percent, (int, float)):
            # STAC query filter for cloud cover
            query = { 'eo:cloud_cover': { 'lt': float(max_cloud_percent) } }
        geom = None
        bbox_obj = None
        if intersects and isinstance(aoi, dict):
            geom = aoi  # STAC-compatible GeoJSON geometry
        else:
            bb = bbox
            if not bb and isinstance(aoi, dict):
                # fallback: compute bbox from geometry
                try:
                    coords = []
                    def _collect(g):
                        t = g.get('type')
                        if t == 'Polygon':
                            for ring in g.get('coordinates', []):
                                coords.extend(ring)
                        elif t == 'MultiPolygon':
                            for poly in g.get('coordinates', []):
                                for ring in poly:
                                    coords.extend(ring)
                        elif t == 'Feature':
                            return _collect(g.get('geometry') or {})
                        elif t == 'FeatureCollection':
                            for f in g.get('features', []):
                                _collect(f.get('geometry') or {})
                    _collect(aoi)
                    xs = [c[0] for c in coords]; ys = [c[1] for c in coords]
                    if xs and ys:
                        bb = [min(xs), min(ys), max(xs), max(ys)]
                except Exception:
                    bb = None
            if bb and len(bb) == 4:
                bbox_obj = BBox(bb, crs=CRS.WGS84)
        it = cat.search(
            dc,
            bbox=bbox_obj,
            geometry=geom,
            time=(start[:10], end[:10]),
            query=query or None,
            fields={"include": ["id", "properties.datetime", "properties.eo:cloud_cover"], "exclude": ["assets"]},
        )
        dates: List[str] = []
        for item in it:
            props = item.get('properties', {}) if isinstance(item, dict) else getattr(item, 'properties', {})
            dt = props.get('datetime')
            if isinstance(dt, str):
                dates.append(dt[:10])
        if dates:
            return sorted(list(set(dates)))
    except Exception:
        # If sentinelhub not installed or auth missing, fallback to synthetic cadence
        pass

    # Fallback synthetic cadence (no external dependency)
    try:
        d0 = datetime.fromisoformat(start[:10])
        d1 = datetime.fromisoformat(end[:10])
    except Exception:
        return [end[:10] or start[:10]]
    if d1 < d0:
        d0, d1 = d1, d0
    step = max(1, int(step_days or 5))
    out: List[str] = []
    cur = d0
    while cur <= d1:
        out.append(cur.date().isoformat())
        cur += timedelta(days=step)
    if out and out[-1] != d1.date().isoformat():
        out.append(d1.date().isoformat())
    return out
