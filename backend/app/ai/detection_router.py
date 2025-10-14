from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from typing import Any, Dict

from .pytorch_inference import get_mining_detector

router = APIRouter(prefix="/ai/detect", tags=["ai-detect"]) 

@router.post("/image")
async def detect_image(file: UploadFile = File(...)) -> Dict[str, Any]:
    try:
        data = await file.read()
        det = get_mining_detector()
        boxes = det.detect_from_image(data)
        return { "count": len(boxes), "detections": [b.__dict__ for b in boxes] }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
