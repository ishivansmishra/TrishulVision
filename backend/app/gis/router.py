from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Any, Dict, List
from ..mongo import get_db
from uuid import uuid4
from ..utils.file_storage import save_upload_file, STORAGE_ROOT
from pathlib import Path
import zipfile
import io


router = APIRouter()


class ShapefileIn(BaseModel):
    name: str
    geojson: Dict[str, Any]
    metadata: Dict[str, Any] | None = None


@router.post("/shapefiles")
async def create_shapefile(data: ShapefileIn, db=Depends(get_db)):
    sf = {"_id": str(uuid4()), "name": data.name, "geojson": data.geojson, "metadata": data.metadata or {}}
    await db.get_collection("shapefiles").insert_one(sf)
    return {"id": sf["_id"]}


@router.get("/shapefiles")
async def list_shapefiles(db=Depends(get_db)) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    async for d in db.get_collection("shapefiles").find({}).sort("_id", -1).limit(200):
        out.append({"id": str(d.get("_id")), "name": d.get("name"), "geojson": d.get("geojson"), "metadata": d.get("metadata", {})})
    return out


@router.delete("/shapefiles/{sf_id}")
async def delete_shapefile(sf_id: str, db=Depends(get_db)):
    r = await db.get_collection("shapefiles").delete_one({"_id": sf_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "deleted"}


def _read_shapefile_zip_to_geojson(zbytes: bytes) -> Dict[str, Any]:
    try:
        import shapefile  # type: ignore  # pyshp
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Shapefile support unavailable: {e}")
    with zipfile.ZipFile(io.BytesIO(zbytes)) as zf:
        # Find .shp base name
        shp_names = [n for n in zf.namelist() if n.lower().endswith('.shp')]
        if not shp_names:
            raise HTTPException(status_code=400, detail="No .shp found in zip")
        base = shp_names[0][:-4]
        def _extract(name: str) -> bytes:
            with zf.open(name) as f:
                return f.read()
        shp = _extract(base + '.shp')
        shx = _extract(base + '.shx') if (base + '.shx') in zf.namelist() else None
        dbf = _extract(base + '.dbf') if (base + '.dbf') in zf.namelist() else None
        if not dbf:
            raise HTTPException(status_code=400, detail=".dbf missing in zip")
        # Use pyshp Reader from bytes
        r = shapefile.Reader(shp=io.BytesIO(shp), shx=io.BytesIO(shx) if shx else None, dbf=io.BytesIO(dbf))
        fields = [f[0] for f in r.fields[1:]]
        features: List[Dict[str, Any]] = []
        for sr in r.iterShapeRecords():
            geom = sr.shape.__geo_interface__
            props = {fields[i]: sr.record[i] for i in range(len(fields))}
            features.append({ 'type': 'Feature', 'geometry': geom, 'properties': props })
        return { 'type': 'FeatureCollection', 'features': features }


def _read_kml_to_geojson(kml_bytes: bytes) -> Dict[str, Any]:
    try:
        from fastkml import kml  # type: ignore
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"KML support unavailable: {e}")
    k = kml.KML()
    k.from_string(kml_bytes)
    # Traverse all features
    def _collect_features(obj) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        try:
            import shapely.geometry as sgeom  # fastkml uses shapely
        except Exception:
            sgeom = None
        stack = [obj]
        while stack:
            node = stack.pop()
            for f in getattr(node, 'features', []) or []:
                stack.append(f)
                geom = getattr(f, 'geometry', None)
                if geom is not None:
                    gj = geom.__geo_interface__ if hasattr(geom, '__geo_interface__') else None
                    if not gj and sgeom:
                        try:
                            gj = sgeom.mapping(geom)  # type: ignore
                        except Exception:
                            gj = None
                    if gj:
                        out.append({ 'type': 'Feature', 'geometry': gj, 'properties': {'name': getattr(f, 'name', None)} })
        return out
    feats = _collect_features(k)
    return { 'type': 'FeatureCollection', 'features': feats }


@router.post('/upload/convert-geojson')
async def upload_convert_geojson(file: UploadFile = File(...), db=Depends(get_db)):
    """
    Accept .zip containing ESRI Shapefile or a .kml, convert to GeoJSON FeatureCollection,
    store to DB as a shapefile record, and return the stored id + geojson.
    """
    name = file.filename or 'upload'
    data = await file.read()
    if name.lower().endswith('.zip'):
        gj = _read_shapefile_zip_to_geojson(data)
    elif name.lower().endswith('.kml'):
        gj = _read_kml_to_geojson(data)
    else:
        raise HTTPException(status_code=400, detail='Unsupported file type. Provide .zip (shapefile) or .kml')
    sf = { '_id': str(uuid4()), 'name': name, 'geojson': gj, 'metadata': { 'source': 'upload' } }
    await db.get_collection('shapefiles').insert_one(sf)
    return { 'id': sf['_id'], 'geojson': gj }

# --- AOIs (Areas of Interest) ---

class AoiIn(BaseModel):
    name: str | None = None
    geometry: Dict[str, Any]
    metadata: Dict[str, Any] | None = None


@router.post('/aois')
async def create_aoi(data: AoiIn, db=Depends(get_db)):
    aoi = {
        '_id': str(uuid4()),
        'name': data.name or 'AOI',
        'geometry': data.geometry,
        'metadata': data.metadata or {},
    }
    await db.get_collection('aois').insert_one(aoi)
    return { 'id': aoi['_id'] }


@router.get('/aois')
async def list_aois(db=Depends(get_db)) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    async for d in db.get_collection('aois').find({}).sort('_id', -1).limit(200):
        out.append({ 'id': str(d.get('_id')), 'name': d.get('name'), 'geometry': d.get('geometry'), 'metadata': d.get('metadata', {}) })
    return out


@router.delete('/aois/{aoi_id}')
async def delete_aoi(aoi_id: str, db=Depends(get_db)):
    res = await db.get_collection('aois').delete_one({ '_id': aoi_id })
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='AOI not found')
    return { 'id': aoi_id, 'deleted': True }