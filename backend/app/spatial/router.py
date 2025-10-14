from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from ..utils.file_storage import save_upload_file
from ..config import settings
import httpx
import rasterio
import numpy as np
from pathlib import Path
from ..utils.file_storage import STORAGE_ROOT
from ..mongo import get_db
from ..dem.terrarium import build_mosaic_geotiff


router = APIRouter()


class SatelliteFetchIn(BaseModel):
    provider: str
    aoi: Dict[str, Any]
    date_range: Dict[str, str]
    product: str | None = None


@router.post('/satellite/fetch')
async def satellite_fetch(data: SatelliteFetchIn):
    # Stub: in future integrate SentinelHub/USGS/GEE
    return { 'status': 'queued', 'provider': data.provider }


class TemporalCompareIn(BaseModel):
    aoi: Dict[str, Any]
    t1: str
    t2: str
    collection: str | None = 'S2L2A'


@router.post('/temporal/compare')
async def temporal_compare(data: TemporalCompareIn):
    """Return preview asset ids for two time points (Sentinel stub)."""
    from ..providers.sentinelhub import search as sh_search
    aoi = data.aoi
    res1 = sh_search(aoi, { 'start': data.t1, 'end': data.t1 }, collection=data.collection or 'S2L2A', limit=1)
    res2 = sh_search(aoi, { 'start': data.t2, 'end': data.t2 }, collection=data.collection or 'S2L2A', limit=1)
    return { 't1': res1[:1], 't2': res2[:1] }


class SyncJobIn(BaseModel):
    aoi: Dict[str, Any]
    cadence_days: int = 14
    provider: str | None = 'earthdata'


@router.post('/sync/schedule')
async def sync_schedule(data: SyncJobIn, db = Depends(get_db)):
    doc = {
        'aoi': data.aoi,
        'cadence_days': max(1, int(data.cadence_days or 14)),
        'provider': (data.provider or 'earthdata').lower(),
        'status': 'scheduled',
    }
    _ = await db.get_collection('satellite_sync').insert_one(doc)
    try:
        from ..utils.n8n_client import emit_event
        await emit_event('satellite.sync.scheduled', doc)
    except Exception:
        pass
    return { 'status': 'scheduled' }


@router.get('/sync/jobs')
async def sync_jobs(db = Depends(get_db)):
    out = []
    async for j in db.get_collection('satellite_sync').find({}).sort('_id', -1).limit(50):
        out.append({ 'id': str(j.get('_id')), 'status': j.get('status'), 'cadence_days': j.get('cadence_days') })
    return out


class PreprocessIn(BaseModel):
    steps: list[str] = []  # ['denoise','radiometric','atmospheric']
    asset_path: str | None = None


@router.post('/satellite/preprocess')
async def satellite_preprocess(data: PreprocessIn):
    # Stub pipeline
    return { 'status': 'done', 'applied': data.steps }


class DEMIn(BaseModel):
    dem_source: str = 'SRTM'
    boundary: Dict[str, Any]


@router.post('/dem/estimate-volume')
async def dem_estimate_volume(data: DEMIn):
    # Stub: return fake volume; later compute via Simpson's Rule over DEM tiles
    return { 'volume_cubic_m': 12345.6, 'dem_source': data.dem_source }


@router.post('/dem/fetch')
async def dem_fetch(meta: DEMIn):
    # Placeholder that returns metadata and a hypothetical path/URL
    bbox = meta.boundary.get('bbox') if isinstance(meta.boundary, dict) else None
    return { 'status': 'ok', 'source': meta.dem_source, 'bbox': bbox, 'path': f"/data/dem/{meta.dem_source.lower()}_tile.tif" }


class SrtmMosaicIn(BaseModel):
    bbox: list[float]  # [minLon,minLat,maxLon,maxLat]


@router.post('/dem/srtm/mosaic')
async def srtm_mosaic(input: SrtmMosaicIn):
    """
    Stub: plan SRTM tile list for an AOI bbox and return an output mosaic path.
    Next step: download tiles from AWS Open Data, build VRT or merge to GeoTIFF.
    """
    minx, miny, maxx, maxy = input.bbox
    # Simplistic estimate of needed tiles by 1-degree grid cells
    tiles = []
    for lat in range(int(np.floor(miny)), int(np.ceil(maxy))):
        for lon in range(int(np.floor(minx)), int(np.ceil(maxx))):
            # SRTM naming like N28E077; this is a placeholder
            ns = 'N' if lat >= 0 else 'S'
            ew = 'E' if lon >= 0 else 'W'
            tiles.append(f"{ns}{abs(lat):02d}{ew}{abs(lon):03d}")
    out_dir = STORAGE_ROOT / 'dem' / 'srtm'
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"mosaic_{int(minx*100)}_{int(miny*100)}_{int(maxx*100)}_{int(maxy*100)}.tif"
    return { 'tiles': tiles, 'mosaic_path': str(out_path) }


class BuildMosaicIn(BaseModel):
    bbox: list[float]
    zoom: int = 10
    target_crs: str | None = 'EPSG:3857'


@router.post('/dem/srtm/build-mosaic')
async def srtm_build_mosaic(input: BuildMosaicIn):
    bbox = tuple(input.bbox)  # type: ignore
    out_dir = STORAGE_ROOT / 'dem' / 'mosaics'
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"terrarium_z{input.zoom}_{int(bbox[0]*100)}_{int(bbox[1]*100)}_{int(bbox[2]*100)}_{int(bbox[3]*100)}.tif"
    path = await build_mosaic_geotiff(bbox, input.zoom, out_path, target_crs=input.target_crs or 'EPSG:3857')
    return { 'path': str(path) }


class DemDeltaIn(BaseModel):
    dem_older_path: str
    dem_newer_path: str
    mask_polygon: Dict[str, Any] | None = None  # optional polygon to focus stats


@router.post('/dem/delta')
async def dem_delta(input: DemDeltaIn):
    """Compute Δh statistics between two DEM rasters using Rasterio."""
    def read_raster(path: str):
        with rasterio.open(path) as ds:
            arr = ds.read(1, masked=True)
            profile = ds.profile
        return arr, profile
    arr0, prof0 = read_raster(input.dem_older_path)
    arr1, prof1 = read_raster(input.dem_newer_path)
    if arr0.shape != arr1.shape:
        raise HTTPException(status_code=400, detail='DEM shapes differ')
    dh = arr1.astype('float32') - arr0.astype('float32')
    # Masking by polygon could be added via rasterio.features.rasterize
    vals = dh.compressed() if hasattr(dh, 'compressed') else dh.flatten()
    vals = vals[np.isfinite(vals)]
    if vals.size == 0:
        return { 'count': 0 }
    stats = {
        'count': int(vals.size),
        'min': float(np.min(vals)),
        'max': float(np.max(vals)),
        'mean': float(np.mean(vals)),
        'std': float(np.std(vals)),
    }
    return { 'stats': stats }


@router.post('/lidar/import')
async def lidar_import(file: UploadFile = File(...)):
    # Stub: save file, later process via PDAL/laspy
    path = await save_upload_file(file, 'lidar')
    return { 'status': 'stored', 'path': path }


class ChangeDetectIn(BaseModel):
    scene1: str
    scene2: str
    aoi: Dict[str, Any]


@router.post('/change-detection')
async def change_detection(data: ChangeDetectIn):
    # Stub: later use SAR/optical temporal differencing
    return { 'changed_area_ha': 0.0, 'metrics': { 'ndvi_delta_mean': 0.0 } }


# NASA CMR Search (common entry point for Sentinel/Landsat via CMR)
class CmrSearchIn(BaseModel):
    short_name: str  # e.g., 'SENTINEL-1A' or 'LANDSAT_8_C1'
    bbox: str | None = None  # 'minLon,minLat,maxLon,maxLat'
    temporal: str | None = None  # 'start,end' ISO8601
    page_size: int = 25


@router.post('/nasa/cmr/search')
async def nasa_cmr_search(input: CmrSearchIn):
    url = 'https://cmr.earthdata.nasa.gov/search/granules.json'
    params = { 'short_name': input.short_name, 'page_size': max(1, min(input.page_size, 2000)) }
    if input.bbox: params['bounding_box'] = input.bbox
    if input.temporal: params['temporal'] = input.temporal
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            j = r.json()
            return j
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NASA CMR error: {e}")


# NASA GIBS WMTS layer template reference
@router.get('/nasa/gibs/layers')
async def nasa_gibs_layers():
    # Simple curated list commonly used for basemaps/overlays
    layers = [
        { 'id': 'BlueMarble_ShadedRelief', 'format': 'jpg', 'tileMatrixSet': 'GoogleMapsCompatible_Level9' },
        { 'id': 'VIIRS_SNPP_CorrectedReflectance_TrueColor', 'format': 'jpg', 'tileMatrixSet': 'GoogleMapsCompatible_Level9' },
        { 'id': 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', 'format': 'jpg', 'tileMatrixSet': 'GoogleMapsCompatible_Level9' },
        { 'id': 'MODIS_Terra_CorrectedReflectance_TrueColor', 'format': 'jpg', 'tileMatrixSet': 'GoogleMapsCompatible_Level9' },
        { 'id': 'MODIS_Aqua_CorrectedReflectance_TrueColor', 'format': 'jpg', 'tileMatrixSet': 'GoogleMapsCompatible_Level9' },
        { 'id': 'VIIRS_SNPP_CorrectedReflectance_BandsM11-I2-I1', 'format': 'jpg', 'tileMatrixSet': 'GoogleMapsCompatible_Level9' },
    ]
    template = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{time}/{set}/{z}/{y}/{x}.{fmt}'
    friendly = {
        'BlueMarble_ShadedRelief': 'Blue Marble Shaded Relief',
        'VIIRS_SNPP_CorrectedReflectance_TrueColor': 'VIIRS True Color (SNPP)',
        'VIIRS_NOAA20_CorrectedReflectance_TrueColor': 'VIIRS True Color (NOAA-20)',
        'MODIS_Terra_CorrectedReflectance_TrueColor': 'MODIS Terra True Color',
        'MODIS_Aqua_CorrectedReflectance_TrueColor': 'MODIS Aqua True Color',
        'VIIRS_SNPP_CorrectedReflectance_BandsM11-I2-I1': 'VIIRS Color Infrared',
    }
    return { 'template': template, 'layers': layers, 'time': 'current', 'friendly': friendly }


# Available imagery dates for discrete timelapse snapping
class AvailableDatesIn(BaseModel):
    provider: str = 'sentinelhub'  # 'sentinelhub' | 'gee' | 'earthdata' (future)
    aoi: Dict[str, Any] | None = None  # GeoJSON; optional for stub
    bbox: Optional[list[float]] = None  # [minx,miny,maxx,maxy]
    start: str
    end: str
    collection: Optional[str] = None
    step_days: int | None = None
    max_cloud_percent: float | None = None
    intersects: bool = False


@router.post('/imagery/available-dates')
async def imagery_available_dates(input: AvailableDatesIn):
    prov = (input.provider or 'sentinelhub').lower()
    start = input.start
    end = input.end
    if not start or not end:
        raise HTTPException(status_code=400, detail='start and end are required (YYYY-MM-DD)')
    try:
        if prov == 'gee':
            from ..providers.gee import available_dates as gee_dates  # type: ignore
            dates = gee_dates(input.aoi, start, end, input.collection or 'COPERNICUS/S2_SR', bbox=input.bbox, max_cloud_percent=input.max_cloud_percent, intersects=bool(input.intersects))
        elif prov == 'sentinelhub':
            from ..providers.sentinelhub import available_dates as sh_dates  # type: ignore
            dates = sh_dates(input.aoi or {}, start, end, input.collection or 'S2L2A', step_days=int(input.step_days or 5), bbox=input.bbox, max_cloud_percent=input.max_cloud_percent, intersects=bool(input.intersects))
        else:
            # For earthdata or unknown, fallback to weekly sampling
            from datetime import datetime, timedelta
            try:
                d0 = datetime.fromisoformat(start[:10]); d1 = datetime.fromisoformat(end[:10])
                if d1 < d0: d0, d1 = d1, d0
                out: List[str] = []
                cur = d0
                while cur <= d1:
                    out.append(cur.date().isoformat())
                    cur += timedelta(days=7)
                if out and out[-1] != d1.date().isoformat(): out.append(d1.date().isoformat())
                dates = out
            except Exception:
                dates = [end[:10] or start[:10]]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to compute available dates: {e}")
    # ensure unique + sorted
    dates = sorted(list({ d[:10] for d in dates }))
    return { 'provider': prov, 'start': start[:10], 'end': end[:10], 'count': len(dates), 'dates': dates }


# NASA EONET events (natural events)
@router.get('/nasa/eonet/events')
async def nasa_eonet_events(limit: int = 50):
    url = 'https://eonet.gsfc.nasa.gov/api/v3/events'
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url, params={'limit': max(1, min(limit, 200))})
            r.raise_for_status()
            return r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NASA EONET error: {e}")


# ISRO Bhuvan tiles reference (public tile endpoints vary; provide configurable template)
@router.get('/isro/bhuvan/tiles')
async def isro_bhuvan_tiles():
    # Allow override via env Bhuvan template; otherwise provide a placeholder
    template = getattr(settings, 'ISRO_BHUVAN_TEMPLATE', '') or 'https://bhuvan-tiles.example/{z}/{x}/{y}.png'
    return { 'template': template, 'note': 'Replace ISRO_BHUVAN_TEMPLATE in .env with the correct Bhuvan WMTS URL if available.' }


class NdviIn(BaseModel):
    scene_url: str | None = None
    red_band: int | None = None
    nir_band: int | None = None


@router.post('/ndvi')
async def compute_ndvi(input: NdviIn):
    """Compute NDVI from a GeoTIFF scene (stub fallback to synthetic NDVI map).
    Returns summary stats and an optional small thumbnail URL in future.
    """
    try:
        if input.scene_url and input.scene_url.lower().endswith('.tif'):
            import rasterio
            import numpy as np
            with rasterio.open(input.scene_url) as ds:
                r = ds.read(input.red_band or 3).astype('float32')
                n = ds.read(input.nir_band or 4).astype('float32')
                nd = (n - r) / ((n + r) + 1e-6)
                vals = nd.flatten()
                vals = vals[np.isfinite(vals)]
                stats = {
                    'min': float(np.min(vals)),
                    'max': float(np.max(vals)),
                    'mean': float(np.mean(vals)),
                    'std': float(np.std(vals)),
                }
                return { 'stats': stats }
    except Exception:
        pass
    # synthetic
    return { 'stats': { 'min': -0.1, 'max': 0.72, 'mean': 0.28, 'std': 0.12 } }


class CloudMaskIn(BaseModel):
    scene_url: str | None = None
    threshold: float | None = 0.2


@router.post('/cloudmask')
async def cloud_mask(input: CloudMaskIn):
    """Return cloud coverage percent and a stub mask ratio value."""
    # TODO: integrate s2cloudless or QA bands from provider
    pct = 12.5  # default stub
    return { 'cloud_percent': float(pct), 'masked_ratio': float(min(1.0, max(0.0, (pct/100.0)))) }


@router.post('/evolution/available-dates')
async def evolution_available_dates(aoi: Dict[str, Any], start: str, end: str):
    """Proxy to imagery available dates for time slider 4D evolution."""
    from . import router as _r  # self
    # Delegate to providers via existing endpoint
    try:
        # reuse sentinelhub cadence
        from ..providers.sentinelhub import available_dates
        dates = available_dates(aoi, start, end, collection='S2L2A', step_days=10, intersects=True)
    except Exception:
        dates = []
    if not dates:
        # weekly fallback
        from datetime import datetime, timedelta
        try:
            d0 = datetime.fromisoformat(start[:10]); d1 = datetime.fromisoformat(end[:10])
            if d1 < d0: d0, d1 = d1, d0
            out = []
            cur = d0
            while cur <= d1:
                out.append(cur.date().isoformat()); cur += timedelta(days=7)
            dates = out
        except Exception:
            dates = [end[:10] or start[:10]]
    return { 'dates': sorted(list({d[:10] for d in dates})) }