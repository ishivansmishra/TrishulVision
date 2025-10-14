import asyncio
from sqlalchemy import text
from .database import engine, Base
from .config import settings

# Import models so they are registered with SQLAlchemy's Base before create_all
# These imports are intentionally unused but required for side effects
from .auth import models as auth_models  # noqa: F401
from .mining import models as mining_models  # noqa: F401

async def create_all():
    async with engine.begin() as conn:
        # Ensure PostGIS extension when using PostgreSQL
        if settings.DATABASE_URL.startswith("postgresql"):
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            except Exception as e:
                # log and continue; extension may already exist or lack privileges
                print("POSTGIS extension init warning:", e)
        await conn.run_sync(Base.metadata.create_all)

if __name__ == '__main__':
    asyncio.run(create_all())
