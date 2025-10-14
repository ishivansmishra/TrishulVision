from fastapi import APIRouter, Depends, HTTPException
from typing import Any, Dict, List
from ..mongo import get_db
from ..storage.ipfs import pin_bytes_pinata
from ..blockchain.utils import log_report_hash, verify_hash
import hashlib, json

router = APIRouter()


@router.post('/log')
async def integrity_log(payload: Dict[str, Any], db = Depends(get_db)):
    js = json.dumps(payload, sort_keys=True).encode()
    sha = hashlib.sha256(js).hexdigest()
    rec = { 'payload': payload, 'sha256': sha }
    try:
        cid = await pin_bytes_pinata(js, name=f'hash_{sha}.json')
        rec['ipfs_cid'] = cid
    except Exception:
        pass
    try:
        tx = log_report_hash({ 'sha256': sha })
        rec['tx_hash'] = tx
        rec['verified'] = verify_hash(tx)
    except Exception:
        pass
    await db.get_collection('integrity_logs').insert_one(rec)
    return { 'sha256': sha, 'ipfs_cid': rec.get('ipfs_cid'), 'tx_hash': rec.get('tx_hash'), 'verified': rec.get('verified') }


@router.get('/logs')
async def list_integrity_logs(db = Depends(get_db)) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    async for d in db.get_collection('integrity_logs').find({}).sort('_id', -1).limit(100):
        out.append({ 'sha256': d.get('sha256'), 'ipfs_cid': d.get('ipfs_cid'), 'tx_hash': d.get('tx_hash'), 'verified': d.get('verified', False) })
    return out
