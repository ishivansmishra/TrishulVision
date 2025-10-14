import hashlib
import json
import httpx
from pathlib import Path
from ..utils.file_storage import STORAGE_ROOT
from ..config import settings


IPFS_DIR = STORAGE_ROOT / 'ipfs'
IPFS_DIR.mkdir(parents=True, exist_ok=True)


def add_bytes(data: bytes) -> str:
    h = hashlib.sha256(data).hexdigest()
    p = IPFS_DIR / h
    if not p.exists():
        p.write_bytes(data)
    return h


def get_bytes(cid: str) -> bytes:
    p = IPFS_DIR / cid
    return p.read_bytes()


async def pin_bytes_pinata(data: bytes, name: str = 'artifact.bin') -> str:
    if not settings.PINATA_JWT and not (settings.PINATA_API_KEY and settings.PINATA_API_SECRET):
        return add_bytes(data)
    headers = {}
    if settings.PINATA_JWT:
        headers['Authorization'] = f'Bearer {settings.PINATA_JWT}'
    files = {'file': (name, data, 'application/octet-stream')}
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post('https://api.pinata.cloud/pinning/pinFileToIPFS', headers=headers, files=files)
        r.raise_for_status()
        j = r.json()
        return j.get('IpfsHash') or add_bytes(data)


async def pin_json_pinata(obj: dict, name: str = 'metadata.json') -> str:
    data = json.dumps(obj, sort_keys=True).encode()
    return await pin_bytes_pinata(data, name)