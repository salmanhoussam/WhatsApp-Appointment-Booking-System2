"""Single gate for anonymous tenant creation.

Salman's decision, 2026-09-07: self-service registration is not wanted at this stage. Leaving
those doors open is an invitation to spam and resource-exhaustion, and the only thing guarding
them was a rate limit that is quietly 2x its stated value -- slowapi uses per-process MemoryStorage
and the app runs `gunicorn -w 2`, so "3/hour" is really 6/hour, which is nothing against a
distributed source.

ONE gate, not three copies. The same reasoning as record_auth_event(): the fail-open `_verify_secret`
defect ended up in two files at once precisely because it was copy-pasted, and it took a live
production incident to find. A single dependency means reopening or re-closing this is one env var
and one place to read.

Fails CLOSED: the flag must be explicitly "true" to open. An unset variable keeps the doors shut,
matching the convention established for the webhook secrets the same day.
"""

from fastapi import Depends, HTTPException

from app.core.config import settings


async def require_self_registration_enabled() -> None:
    """403 unless SELF_REGISTRATION_ENABLED is explicitly true.

    403, not 503: this is a deliberate policy decision, not a misconfiguration. The message is
    explicit so a frontend CTA can render something honest instead of a bare failure.
    """
    if not settings.SELF_REGISTRATION_ENABLED:
        raise HTTPException(
            status_code=403,
            detail="التسجيل الذاتي مغلق حالياً. إنشاء الحسابات يتم عبر دعوة من الإدارة.",
        )
