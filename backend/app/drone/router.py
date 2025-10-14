from fastapi import APIRouter, UploadFile, File, Depends
from typing import Any, Dict
from ..utils.file_storage import save_upload_file
from ..mongo import get_db
from uuid import uuid4

router = APIRouter()


@router.post('/upload')
async def drone_upload(image: UploadFile = File(...), meta: str | None = None, db = Depends(get_db)):
    path = await save_upload_file(image, 'drone')
    doc: Dict[str, Any] = { '_id': str(uuid4()), 'path': path, 'meta': meta }
    await db.get_collection('drone_uploads').insert_one(doc)
    return { 'id': doc['_id'], 'path': path }
