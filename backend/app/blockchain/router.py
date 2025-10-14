from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from ..config import settings
from ..mongo import get_db
from ..utils.n8n_client import N8N_HEADER_INBOUND_SECRET, verify_inbound_secret
from .utils import log_report_hash, verify_hash


router = APIRouter()


@router.post("/log")
async def blockchain_log(payload: Dict[str, Any], db=Depends(get_db)):
    """Log a payload hash to chain (or deterministic stub) and persist in Mongo."""
    tx_hash = payload.get("tx_hash")
    if not tx_hash:
        try:
            tx_hash = log_report_hash(payload)
        except Exception:
            tx_hash = "0xdeadbeef"
    doc: Dict[str, Any] = {**payload, "tx_hash": tx_hash}
    try:
        doc["verified"] = verify_hash(tx_hash)
    except Exception:
        doc["verified"] = False
    await db.get_collection("blockchain_logs").insert_one(doc)
    return {"status": "logged", "tx_hash": tx_hash, "verified": bool(doc["verified"])}


@router.get("/verify/{tx_hash}")
async def blockchain_verify(tx_hash: str):
    return {"tx_hash": tx_hash, "valid": verify_hash(tx_hash)}


@router.get("/logs")
async def list_logs(db=Depends(get_db)) -> List[Dict[str, Any]]:
    col = db.get_collection("blockchain_logs")
    cursor = col.find({}).sort("_id", -1).limit(100)
    out: List[Dict[str, Any]] = []
    async for d in cursor:
        out.append(
            {
                "id": str(d.get("_id")),
                "report_id": d.get("report_id"),
                "tx_hash": d.get("tx_hash"),
                "verified": d.get("verified", True),
            }
        )
    return out


class MintIn(BaseModel):
    report_id: str
    token_uri: Optional[str] = None  # defaults to report's IPFS URL if available
    to_address: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@router.post("/mint-nft")
async def mint_nft(inp: MintIn, db=Depends(get_db)):
    """Stub NFT mint. Returns a deterministic tx hash when Web3 is not configured.

    - token_uri defaults to report.ipfs_url (or gateway+CID) when present.
    - Persists a record in both nft_mints and blockchain_logs.
    """
    token_uri = inp.token_uri
    try:
        if not token_uri:
            rep = await db.get_collection("mining_reports").find_one({"_id": inp.report_id})
            if rep:
                token_uri = rep.get("ipfs_url") or rep.get("ipfs_cid")
                if token_uri and isinstance(token_uri, str) and token_uri.startswith("Qm"):
                    base = settings.IPFS_GATEWAY_BASE or "https://ipfs.io/ipfs/"
                    token_uri = base.rstrip("/") + "/" + token_uri
        if not token_uri:
            token_uri = (
                "data:application/json,{\"name\":\"Trishul Report %s\",\"description\":\"Placeholder token\"}"
                % inp.report_id
            )
    except Exception:
        token_uri = "data:application/json,{\"name\":\"Trishul Report\"}"

    payload = {
        "action": "mint_nft",
        "report_id": inp.report_id,
        "token_uri": token_uri,
        "to": inp.to_address,
        "metadata": inp.metadata or {},
    }
    tx_hash = log_report_hash(payload)

    # Persist in nft_mints and logs
    await db.get_collection("nft_mints").insert_one(
        {
            "report_id": inp.report_id,
            "to": inp.to_address,
            "tx_hash": tx_hash,
            "token_uri": token_uri,
            "metadata": inp.metadata or {},
        }
    )
    await db.get_collection("blockchain_logs").insert_one(
        {
            "type": "mint_nft",
            "report_id": inp.report_id,
            "token_uri": token_uri,
            "tx_hash": tx_hash,
            "verified": verify_hash(tx_hash),
        }
    )

    token_id = (
        int(tx_hash[-6:], 16) if isinstance(tx_hash, str) and tx_hash.startswith("0x") else None
    )
    return {
        "report_id": inp.report_id,
        "tx_hash": tx_hash,
        "token_id": token_id,
        "token_uri": token_uri,
    }


@router.post("/callback")
async def blockchain_callback(
    body: Dict[str, Any] | None = None,
    x_n8n_secret: Optional[str] = Header(default=None, alias=N8N_HEADER_INBOUND_SECRET),
):
    """Inbound callback from n8n (or other automation) after real on-chain events."""
    if not verify_inbound_secret(x_n8n_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid n8n secret"
        )
    return {"ok": True, "received": body or {}}
