import os
from pathlib import Path
from fastapi import UploadFile

STORAGE_ROOT = Path(os.getenv('TRISHUL_STORAGE', '/tmp/trishul'))
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)

async def save_upload_file(upload: UploadFile, subpath: str = '') -> str:
    dest = STORAGE_ROOT / subpath
    dest.mkdir(parents=True, exist_ok=True)
    path = dest / upload.filename
    with open(path, 'wb') as f:
        f.write(await upload.read())
    return str(path)
