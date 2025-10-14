# Simple OpenCV-based segmentation placeholder that returns a few polygons as GeoJSON features.
# Replace with real UNet/SAM inference and polygonization for production.
from typing import List, Dict, Any
import numpy as np
import rasterio
from skimage import measure
try:
    from shapely.geometry import Polygon, mapping
    _HAS_SHAPELY = True
except Exception:
    _HAS_SHAPELY = False

def _demo_polygons() -> List[Dict[str, Any]]:
    # Demo fallback removed: return empty list so production uses real detections only.
    return []


def _ndvi_from_raster(path: str) -> np.ndarray | None:
    try:
        with rasterio.open(path) as ds:
            if ds.count >= 4:
                # Sentinel-2 style: B8 (nir) often band 8; B4 (red) band 4 (this is heuristic)
                red = ds.read(4).astype('float32')
                nir = ds.read(8).astype('float32') if ds.count >= 8 else ds.read(ds.count).astype('float32')
                denom = (nir + red)
                denom[denom == 0] = 1e-6
                ndvi = (nir - red) / denom
                return ndvi
    except Exception:
        return None
    return None


def _polygonize_mask(mask: np.ndarray, transform) -> List[Dict[str, Any]]:
    feats: List[Dict[str, Any]] = []
    # find contours at 0.5
    contours = measure.find_contours(mask.astype('uint8'), 0.5)
    for cnt in contours:
        # cnt is array of (row, col)
        # map to coordinates using affine transform
        coords = []
        for r, c in cnt:
            x, y = rasterio.transform.xy(transform, r, c)
            coords.append((x, y))
        if _HAS_SHAPELY and len(coords) >= 3:
            try:
                poly = Polygon(coords)
                if poly.area <= 0:
                    continue
                gj = mapping(poly)
                feats.append({ 'type': 'Feature', 'geometry': gj, 'properties': { 'model': 'ndvi-thresh', 'confidence': 0.5 } })
                continue
            except Exception:
                pass
        # Fallback: output raw ring
        if len(coords) >= 3:
            ring = [[x, y] for x, y in coords]
            if ring[0] != ring[-1]:
                ring.append(ring[0])
            feats.append({ 'type': 'Feature', 'geometry': { 'type': 'Polygon', 'coordinates': [ring] }, 'properties': { 'model': 'ndvi-thresh', 'confidence': 0.3 } })
    return feats


def detect_mining(image_path: str) -> List[Dict[str, Any]]:
    """Return detection polygons: try NDVI threshold polygonization; fallback to demo polygons."""
    try:
        with rasterio.open(image_path) as ds:
            arr1 = ds.read(1).astype('float32')
            ndvi = _ndvi_from_raster(image_path)
            if ndvi is None:
                # Simple intensity threshold on band 1 as a placeholder
                thr = float(np.percentile(arr1, 75))
                mask = arr1 > thr
            else:
                # Bare soil / non-veg proxy: low NDVI
                mask = ndvi < 0.2
            feats = _polygonize_mask(mask, ds.transform)
            # If nothing found, return detected features (may be empty). No demo fallbacks.
            return feats
    except Exception:
        # On error, return empty list instead of demo polygons
        return []
