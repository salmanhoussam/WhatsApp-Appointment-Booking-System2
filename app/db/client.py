# app/db/client.py
import asyncio
import logging
import os
from prisma import Prisma
from prisma.engine.errors import EngineConnectionError
from prisma.errors import DataError as PrismaDataError

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

# Same transient-Prisma-error-code set app/core/db_resilience.py already uses for per-request
# resilience (2026-08-10) -- reused here, not duplicated with new logic, for the one call that
# was never covered by that module: the app's own one-time startup connect.
_TRANSIENT_PRISMA_CODES = {"P1001", "P1002", "P1008", "P1017"}


def _is_transient(exc: Exception) -> bool:
    if isinstance(exc, EngineConnectionError):
        return True
    if isinstance(exc, PrismaDataError):
        return getattr(exc, "code", None) in _TRANSIENT_PRISMA_CODES
    return False


async def connect_db():
    """
    ALZABT_CONNECT_DB_STARTUP_RESILIENCE_PROPOSAL.md (2026-08-16): up to 3 attempts, short
    increasing backoff (2s, 4s) between them, only for the same transient failure classes
    with_db_resilience() already treats as transient elsewhere. A non-transient error (or the
    3rd consecutive transient one) still raises immediately -- no silent infinite retry, no
    change to steady-state behavior when the first attempt succeeds (the normal case, unchanged).
    """
    if prisma_client.is_connected():
        return
    delays = [2, 4]
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            await prisma_client.connect()
            logger.info("✅ Successfully connected to the database (Prisma).")
            return
        except Exception as e:
            last_exc = e
            if not _is_transient(e) or attempt == 2:
                logger.error(f"❌ Failed to connect to the database: {e}")
                raise e
            logger.warning(
                "DB startup connect transient failure (attempt %d/3): %r -- retrying in %ds",
                attempt + 1, e, delays[attempt],
            )
            await asyncio.sleep(delays[attempt])
    # Unreachable (the loop always returns or raises), kept only to satisfy static analysis.
    raise last_exc

async def disconnect_db():
    try:
        if prisma_client.is_connected():
            await prisma_client.disconnect()
            logger.info("🛑 Successfully disconnected from the database (Prisma).")
    except Exception as e:
        logger.error(f"❌ Error while disconnecting from the database: {e}")