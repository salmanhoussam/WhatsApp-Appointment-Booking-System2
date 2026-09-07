"""Resolve the production database URL, and refuse to hand back anything else.

Established 2026-09-07, from the DB connection reference audit
(.claudedocs/work/db-connection-audit/2026-09-07/inventory.md). Twenty-four scripts had each
copy-pasted the same three unguarded lines:

    _direct = os.environ.get("DIRECT_URL")
    if _direct:
        os.environ["DATABASE_URL"] = _direct

That pattern has no idea what it is connecting to. While `.env` still pointed at the retired Sydney
database, every one of those scripts would have written there and **reported success** — the failure
mode Salman named as the dangerous one: *command succeeds → writes to the wrong DB*, which is worse
than a command that fails.

The rule this module implements, in Salman's words:

    Environment variable  ->  validate target  ->  connect

WHY THE GUARD DOES NOT CHECK A REGION. The first two guarded scripts asserted `"eu-central-1" in
host`. That works today and becomes wrong the day production moves off Frankfurt — the same defect
as naming a variable `EU_DIRECT_URL`. So the check here is by ROLE, not geography: the resolved URL
must not be one of the `SY_*` legacy values that `.env` itself declares. Move production anywhere and
this keeps working; retire a second database and it keeps working by adding one env var.
"""
import os
import sys
from typing import Optional
from urllib.parse import urlsplit

from dotenv import load_dotenv

load_dotenv()

# Legacy databases, named by role. A URL matching any of these is never a valid write target.
# `SY_` = the Sydney project retired 2026-09-06 (ADR-0007); it stays reachable on purpose as the
# rollback target until Gate 8 closes plus an observation period, which is exactly why scripts must
# be prevented from reaching it by accident.
_LEGACY_VARS = ("SY_DATABASE_URL", "SY_DIRECT_URL")


def _host(url: str) -> str:
    return urlsplit(url).hostname or "?"


def resolve(direct: bool = True, *, quiet: bool = False) -> str:
    """Return the production connection URL, or exit non-zero with the reason.

    direct=True  -> DIRECT_URL  (port 5432, bypasses pgbouncer; required for DDL and safest for
                    bulk writes)
    direct=False -> DATABASE_URL (pooled, keeps ?pgbouncer=true — load-bearing, see
                    .claudedocs/work/db-latency/, do not strip it)

    Exits rather than raising so a script that forgets to handle it still stops instead of
    continuing against an unknown target.
    """
    var = "DIRECT_URL" if direct else "DATABASE_URL"
    url = os.getenv(var)

    if not url:
        sys.exit(f"ABORT: {var} is not set. Refusing to guess a database.")

    target = _host(url)

    for legacy_var in _LEGACY_VARS:
        legacy = os.getenv(legacy_var)
        if legacy and _host(legacy) == target:
            sys.exit(
                f"ABORT: {var} resolves to {target}, which is {legacy_var} — a RETIRED database.\n"
                f"       Writing there would succeed silently and be invisible in production."
            )

    if not quiet:
        print(f"target: {target}  (via {var})")
    return url


def assert_not_legacy(url: str) -> None:
    """Same check for a caller that already has a URL in hand."""
    target = _host(url)
    for legacy_var in _LEGACY_VARS:
        legacy = os.getenv(legacy_var)
        if legacy and _host(legacy) == target:
            sys.exit(f"ABORT: {target} is {legacy_var} — a RETIRED database.")
