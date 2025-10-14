from fastapi import APIRouter, Depends, WebSocket
from pydantic import BaseModel
from typing import Any, Dict, List
from ..mongo import get_db
from uuid import uuid4

router = APIRouter()


class AnnotationIn(BaseModel):
    aoi: Dict[str, Any]
    note: str | None = None
    severity: str | None = 'info'


@router.post('/annotations')
async def create_annotation(data: AnnotationIn, db = Depends(get_db)):
    doc = { '_id': str(uuid4()), 'aoi': data.aoi, 'note': data.note, 'severity': data.severity }
    await db.get_collection('annotations').insert_one(doc)
    return { 'id': doc['_id'] }


@router.get('/annotations')
async def list_annotations(db = Depends(get_db)) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    async for a in db.get_collection('annotations').find({}).sort('_id', -1).limit(200):
        out.append({ 'id': str(a.get('_id')), 'aoi': a.get('aoi'), 'note': a.get('note'), 'severity': a.get('severity') })
    return out
