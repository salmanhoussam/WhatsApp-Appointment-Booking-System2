"""Auto-ban: refuse authentication after repeated failures.

Salman's specification, 2026-09-07 — 5 failed attempts inside a 15-minute window, checked on two
axes so that neither brute-force (one account, many guesses) nor credential-stuffing (one source,
many accounts) slips through:

  ACTOR  a known account that has failed 5+ times is refused regardless of where the attempts
         come from -- an attacker rotating IPs still hits this.
  IP     a single source that has failed 5+ times is refused regardless of which accounts it
         tried -- including attempts against accounts that do not exist (actor='anon'), which the
         actor axis cannot see at all.

Reads the rows the audit trail started producing the same day. Recording became detecting.

── Two deliberate decisions, both worth arguing with rather than assuming ────────────────────────

1. FAILS OPEN on a database error, and that does NOT contradict the fail-closed rule adopted this
   morning for webhook secrets. A missing secret meant the gate had never been configured -- a
   permanent, silent hole. A transient query failure here is temporary, and skipping the lockout
   grants nobody anything: the password check still runs immediately afterwards and is untouched.
   Failing closed would turn a database blip into a total authentication outage for every real
   user, which is a self-inflicted incident, not a security posture.

2. COUNT ONLY, never the rows. The count is bounded by the timestamp index and returns a single
   integer, so this adds one cheap query to the front of a login rather than materialising a list
   that grows with every attack.

── Known limitation, stated rather than discovered later ────────────────────────────────────────

A successful login does NOT reset the counter: the window is a pure count of failures in the last
15 minutes, exactly as specified. So a user who mistypes four times, succeeds, then mistypes once
more is locked out. Excluding failures older than that actor's last success would fix it and is
safe (a success proves the legitimate owner is present), but it changes the specified rule, so it
is recorded as a refinement rather than slipped in.

There is also no index on `detail->>'ip'`. The timestamp index narrows the scan to 15 minutes
first, which is sufficient at this table's size and worth revisiting if it ever grows large.
"""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, Request

from app.db.client import prisma_client
from app.services.security_audit_service import client_ip_from

logger = logging.getLogger(__name__)

WINDOW_MINUTES = 15
MAX_FAILURES = 5

# One message for both axes, on purpose. Telling an attacker whether they tripped the account rule
# or the network rule tells them whether the account exists and whether their IP is already known.
_LOCKED_DETAIL = "تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة بعد 15 دقيقة."

_FAILED_EVENTS = (
    "admin_login_failed", "client_login_failed", "customer_login_failed",
    "setup_login_failed", "password_set_failed", "customer_register_failed",
)


async def _count_failures(column_sql: str, value: str) -> int:
    """COUNT of failed auth events matching one axis inside the window. Never raises."""
    try:
        rows = await prisma_client.query_raw(
            f"""
            SELECT COUNT(*)::int AS n
              FROM security_audit_log
             WHERE timestamp > NOW() - INTERVAL '{WINDOW_MINUTES} minutes'
               AND event_type = ANY($1::text[])
               AND {column_sql} = $2
            """,
            list(_FAILED_EVENTS),
            value,
        )
        return int(rows[0]["n"]) if rows else 0
    except Exception as exc:  # noqa: BLE001 - see module docstring, decision 1
        logger.error("Auth lockout count failed (%s=%s) — allowing the request: %s",
                     column_sql, value, exc)
        return 0


async def assert_ip_not_locked(request: Request) -> None:
    """Dependency: refuse a source that has failed too often, before the handler does any work."""
    ip = client_ip_from(request)
    if ip in ("", "unknown"):
        return
    n = await _count_failures("detail->>'ip'", ip)
    if n >= MAX_FAILURES:
        logger.warning("🚫 auth lockout (ip=%s, %d failures in %dm)", ip, n, WINDOW_MINUTES)
        raise HTTPException(status_code=429, detail=_LOCKED_DETAIL)


async def assert_actor_not_locked(actor: str) -> None:
    """Called INSIDE the handler, once the account is resolved and before the password is verified.

    Not a dependency, and that is not an oversight: the actor axis needs to know WHICH account is
    being attempted, which is only known after the identifier has been looked up. A dependency
    runs before the handler and cannot see that. The IP axis, which needs only headers, IS a
    dependency.
    """
    if not actor or actor == "anon":
        return
    n = await _count_failures("actor", actor)
    if n >= MAX_FAILURES:
        logger.warning("🚫 auth lockout (actor=%s, %d failures in %dm)", actor, n, WINDOW_MINUTES)
        raise HTTPException(status_code=429, detail=_LOCKED_DETAIL)
