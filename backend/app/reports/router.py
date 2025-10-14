from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import io
from ..mongo import get_db
from ..reports.pdf_generator import generate_pdf
from ..ai.llm import summarize_report
from ..storage.ipfs import pin_bytes_pinata
from ..config import settings
from ..blockchain.utils import log_report_hash, verify_hash
from ..utils.n8n_client import emit_event

router = APIRouter()


@router.get('/{report_id}')
async def get_report(report_id: str, db = Depends(get_db)):
    col = db.get_collection('mining_reports')
    report = await col.find_one({'_id': report_id})
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    pdf = generate_pdf(report.get('result') or {"id": str(report.get('_id'))})
    return StreamingResponse(io.BytesIO(pdf), media_type='application/pdf', headers={"Content-Disposition": f"attachment; filename=report_{report_id}.pdf"})


@router.get('/{report_id}/summary')
async def get_report_summary(report_id: str, db = Depends(get_db)):
    col = db.get_collection('mining_reports')
    report = await col.find_one({'_id': report_id})
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    r = report.get('result') or {}
    status = report.get('status')
    summary = summarize_report(r)
    return { 'report_id': report_id, 'status': status, 'summary': summary }


@router.post('/{report_id}/pin')
async def pin_report(report_id: str, db = Depends(get_db)):
    col = db.get_collection('mining_reports')
    report = await col.find_one({'_id': report_id})
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    pdf_bytes = generate_pdf(report.get('result') or {"id": str(report.get('_id'))})
    cid = await pin_bytes_pinata(pdf_bytes, name=f'report_{report_id}.pdf')
    url = (settings.IPFS_GATEWAY_BASE or 'https://ipfs.io/ipfs/') + cid
    # Update report with IPFS info
    await col.update_one({'_id': report_id}, {'$set': {'ipfs_cid': cid, 'ipfs_url': url}})
    # Log on-chain
    try:
        tx_hash = log_report_hash({'report_id': report_id, 'ipfs_cid': cid})
        verified = verify_hash(tx_hash)
    except Exception:
        tx_hash = '0xdeadbeef'
        verified = False
    await col.update_one({'_id': report_id}, {'$set': {'blockchain': {'tx_hash': tx_hash, 'verified': verified}}})
    # Emit automation event
    try:
        await emit_event("report.pinned", {"report_id": report_id, "cid": cid, "url": url, "tx_hash": tx_hash, "verified": verified})
    except Exception:
        pass
    return { 'report_id': report_id, 'cid': cid, 'url': url, 'tx_hash': tx_hash, 'verified': verified }


@router.post('/{report_id}/mint')
async def mint_report_nft(report_id: str, db = Depends(get_db)):
    col = db.get_collection('mining_reports')
    report = await col.find_one({'_id': report_id})
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    # Ensure IPFS pin available
    if not report.get('ipfs_url'):
        await pin_report(report_id, db)  # type: ignore
        report = await col.find_one({'_id': report_id})
    # Use blockchain.mint_nft logic indirectly: compute payload and log
    payload = {
        'action': 'mint_nft',
        'report_id': report_id,
        'token_uri': report.get('ipfs_url') or report.get('ipfs_cid'),
    }
    try:
        tx_hash = log_report_hash(payload)
        ok = verify_hash(tx_hash)
    except Exception:
        tx_hash, ok = '0xdeadbeef', False
    await db.get_collection('blockchain_logs').insert_one({ 'type': 'mint_nft', **payload, 'tx_hash': tx_hash, 'verified': ok })
    try:
        await emit_event('report.nft.minted', { 'report_id': report_id, 'tx_hash': tx_hash })
    except Exception:
        pass
    return { 'report_id': report_id, 'tx_hash': tx_hash }


@router.get('/{report_id}/authenticity')
async def report_authenticity(report_id: str, db = Depends(get_db)):
    col = db.get_collection('mining_reports')
    report = await col.find_one({'_id': report_id})
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    cid = report.get('ipfs_cid')
    url = report.get('ipfs_url')
    chain = (report.get('blockchain') or {})
    tx_hash = chain.get('tx_hash')
    valid = verify_hash(tx_hash) if tx_hash else None
    try:
        await emit_event("report.authenticity_checked", {"report_id": report_id, "tx_hash": tx_hash, "valid": valid})
    except Exception:
        pass
    return { 'report_id': report_id, 'cid': cid, 'url': url, 'tx_hash': tx_hash, 'valid': valid }
