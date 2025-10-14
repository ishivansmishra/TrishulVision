from fastapi import APIRouter
import logging
from .config import settings
from pymongo import MongoClient
from pymongo.errors import PyMongoError

router = APIRouter()


@router.get("/db")
def db_status():
    """Quick diagnostic endpoint to check MongoDB connectivity.

    Returns JSON indicating whether Mongo is reachable and any error message.
    This is safe for debugging but should not expose secrets in production logs.
    """
    url = settings.MONGO_URL
    if not url:
        return {"ok": False, "reason": "MONGO_URL not set", "demo_mode": True}
    try:
        client = MongoClient(url, serverSelectionTimeoutMS=5000)
        # ping to force a server selection
        client.admin.command('ping')
        # optional: list databases (may require privileges)
        try:
            dbs = client.list_database_names()
        except Exception:
            dbs = None
        return {"ok": True, "mongo_ok": True, "databases": dbs}
    except PyMongoError as e:
        logging.warning("Mongo connection failed: %s", e)
        return {"ok": False, "reason": str(e), "demo_mode": True}
    except Exception as e:
        logging.warning("Unexpected error checking Mongo: %s", e)
        return {"ok": False, "reason": str(e), "demo_mode": True}
