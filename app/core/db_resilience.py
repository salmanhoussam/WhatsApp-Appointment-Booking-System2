"""
Bounds and retries a transient DB-layer failure instead of letting it surface as an opaque,
slow-to-fail 500 or an unbounded hang.

Root cause (confirmed via a real backend traceback, 2026-08-10 --
.claudedocs/work/availability-reliability/2026-08-10/summary.md): Prisma Python's client talks to
its own query-engine subprocess over local HTTP with a hardcoded 30s httpx timeout
(prisma/http_abstract.py's DEFAULT_CONFIG) and zero retry logic anywhere in this codebase. When the
query engine itself stalls waiting on a connection from Supabase's pooler (the long-documented,
never-root-caused "recurring pooler flakiness"), the failure surfaces as httpx.ReadTimeout --
sometimes at 30s, sometimes later, with no retry, and no way for a caller to tell "temporarily
degraded, try again" apart from "the record doesn't exist" or "the request is malformed."

This wrapper bounds the wait to `timeout` seconds and retries once (short backoff) before giving
up with a clean, honest 503 -- never a bare 500, never an unbounded hang.
"""

import asyncio
import logging
from typing import Awaitable, Callable, TypeVar

import httpx
from fastapi import HTTPException
from prisma.errors import DataError as PrismaDataError

logger = logging.getLogger(__name__)

T = TypeVar("T")

_TRANSIENT_EXCEPTIONS = (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError, asyncio.TimeoutError)

# Prisma's own engine-connectivity error codes (https://www.prisma.io/docs/orm/reference/error-reference)
# -- P1001 "Can't reach database server" is the one confirmed live under real concurrent load
# (2026-08-10, connection_limit exhaustion against the Supabase pooler): the query engine itself
# reports this as a structured DataError, not an httpx-layer timeout, so it needs its own check.
# Deliberately NOT a bare `except DataError` -- that base class also covers genuine, non-transient
# data errors (UniqueViolationError, ForeignKeyViolationError, ...) that retrying would never fix.
_TRANSIENT_PRISMA_CODES = {"P1001", "P1002", "P1008", "P1017"}


def _is_transient_prisma_error(exc: PrismaDataError) -> bool:
    return getattr(exc, "code", None) in _TRANSIENT_PRISMA_CODES


async def with_db_resilience(
    fn: Callable[[], Awaitable[T]],
    *,
    timeout: float = 8.0,
    retries: int = 1,
    label: str = "db_call",
) -> T:
    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            return await asyncio.wait_for(fn(), timeout=timeout)
        except _TRANSIENT_EXCEPTIONS as exc:
            last_exc = exc
            logger.warning(
                "DB call '%s' transient failure (attempt %d/%d): %r",
                label, attempt + 1, retries + 1, exc,
            )
            if attempt < retries:
                await asyncio.sleep(0.5)
        except PrismaDataError as exc:
            if not _is_transient_prisma_error(exc):
                raise
            last_exc = exc
            logger.warning(
                "DB call '%s' transient Prisma error %s (attempt %d/%d): %s",
                label, getattr(exc, "code", "?"), attempt + 1, retries + 1, exc,
            )
            if attempt < retries:
                await asyncio.sleep(0.5)

    logger.error("DB call '%s' failed after %d attempt(s): %r", label, retries + 1, last_exc)
    raise HTTPException(
        status_code=503,
        detail="الخدمة مشغولة مؤقتًا، حاول مرة أخرى خلال لحظات.",
    )
