# app/db/client.py
import logging
import os
from prisma import Prisma

logger = logging.getLogger(__name__)

def _pool_url() -> str | None:
    """Append connection_limit to DATABASE_URL if not already set."""
    url = os.getenv("DATABASE_URL", "")
    if url and "connection_limit" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}connection_limit=10&pool_timeout=30"
    return url or None

_url = _pool_url()
prisma_client = Prisma(datasource={"url": _url}) if _url else Prisma()

async def connect_db():
    try:
        if not prisma_client.is_connected():
            await prisma_client.connect()
            logger.info("✅ Successfully connected to the database (Prisma).")
    except Exception as e:
        logger.error(f"❌ Failed to connect to the database: {e}")
        raise e

async def disconnect_db():
    try:
        if prisma_client.is_connected():
            await prisma_client.disconnect()
            logger.info("🛑 Successfully disconnected from the database (Prisma).")
    except Exception as e:
        logger.error(f"❌ Error while disconnecting from the database: {e}")