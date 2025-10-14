from __future__ import annotations
import math
from io import BytesIO
from pathlib import Path
from typing import Tuple

import httpx
import numpy as np
from PIL import Image
import rasterio
from rasterio.transform import Affine
from rasterio.warp import calculate_default_transform, reproject, Resampling

TILE_SIZE = 256
ORIGIN_SHIFT = 20037508.342789244
INIT_RES = (2 * ORIGIN_SHIFT) / TILE_SIZE


def _tile_resolution(z: int) -> float:
    return INIT_RES / (2 ** z)


def _mercator_bounds_for_tile(x: int, y: int, z: int) -> Tuple[float, float, float, float]:
    # Compute bounds in EPSG:3857 meters
    res = _tile_resolution(z)
    xmin = -ORIGIN_SHIFT + x * TILE_SIZE * res
    xmax = -ORIGIN_SHIFT + (x + 1) * TILE_SIZE * res
    ymax = ORIGIN_SHIFT - y * TILE_SIZE * res
    ymin = ORIGIN_SHIFT - (y + 1) * TILE_SIZE * res
    return xmin, ymin, xmax, ymax


def _latlon_to_tile_xy(lon: float, lat: float, z: int) -> Tuple[int, int]:
    lat = max(min(lat, 85.05112878), -85.05112878)
    n = 2 ** z
    xtile = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    ytile = int((1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return xtile, ytile


def _bbox_to_tile_range(bbox: Tuple[float, float, float, float], z: int) -> Tuple[int, int, int, int]:
    minx, miny, maxx, maxy = bbox
    x0, y1 = _latlon_to_tile_xy(minx, miny, z)
    x1, y0 = _latlon_to_tile_xy(maxx, maxy, z)
    x_min, x_max = min(x0, x1), max(x0, x1)
    y_min, y_max = min(y0, y1), max(y0, y1)
    return x_min, y_min, x_max, y_max


async def _fetch_terrarium_tile(z: int, x: int, y: int) -> np.ndarray:
    url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url)
        r.raise_for_status()
        img = Image.open(BytesIO(r.content)).convert('RGB')
    arr = np.asarray(img, dtype=np.float32)
    rch = arr[..., 0]
    gch = arr[..., 1]
    bch = arr[..., 2]
    elev = (rch * 256.0 + gch + bch / 256.0) - 32768.0
    return elev


async def build_mosaic_geotiff(bbox: Tuple[float, float, float, float], z: int, out_path: Path, target_crs: str = 'EPSG:3857') -> Path:
    x_min, y_min, x_max, y_max = _bbox_to_tile_range(bbox, z)
    tiles_x = x_max - x_min + 1
    tiles_y = y_max - y_min + 1
    width = tiles_x * TILE_SIZE
    height = tiles_y * TILE_SIZE
    mosaic = np.zeros((height, width), dtype=np.float32)

    # Upper-left bounds
    xmin, _, _, ymax = _mercator_bounds_for_tile(x_min, y_min, z)
    res = _tile_resolution(z)
    transform = Affine(res, 0, xmin, 0, -res, ymax)

    # Fetch tiles and paste
    for ty in range(y_min, y_max + 1):
        for tx in range(x_min, x_max + 1):
            elev = await _fetch_terrarium_tile(z, tx, ty)
            off_x = (tx - x_min) * TILE_SIZE
            off_y = (ty - y_min) * TILE_SIZE
            mosaic[off_y:off_y + TILE_SIZE, off_x:off_x + TILE_SIZE] = elev

    out_path.parent.mkdir(parents=True, exist_ok=True)
    profile = {
        'driver': 'GTiff',
        'dtype': 'float32',
        'count': 1,
        'width': width,
        'height': height,
        'crs': 'EPSG:3857',
        'transform': transform,
        'compress': 'LZW',
    }
    with rasterio.open(out_path, 'w', **profile) as ds:
        ds.write(mosaic, 1)

    # Reproject if requested CRS differs
    if target_crs and target_crs != 'EPSG:3857':
        reproj_path = out_path.with_suffix('.reproj.tif')
        with rasterio.open(out_path) as src:
            dst_transform, dst_width, dst_height = calculate_default_transform(
                src.crs, target_crs, src.width, src.height, *src.bounds
            )
            dst_profile = src.profile.copy()
            dst_profile.update({
                'crs': target_crs,
                'transform': dst_transform,
                'width': dst_width,
                'height': dst_height,
            })
            with rasterio.open(reproj_path, 'w', **dst_profile) as dst:
                reproject(
                    source=rasterio.band(src, 1),
                    destination=rasterio.band(dst, 1),
                    src_transform=src.transform,
                    src_crs=src.crs,
                    dst_transform=dst_transform,
                    dst_crs=target_crs,
                    resampling=Resampling.bilinear,
                )
        out_path = reproj_path
    return out_path
