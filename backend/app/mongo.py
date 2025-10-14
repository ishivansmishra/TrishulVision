from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        # Add conservative timeouts so API fails fast when Mongo isn't running
        _client = AsyncIOMotorClient(
            settings.MONGO_URL,
            serverSelectionTimeoutMS=1500,
            connectTimeoutMS=1500,
            socketTimeoutMS=3000,
        )
    return _client


async def get_db():
    client = get_client()
    return client[settings.MONGO_DB_NAME]
