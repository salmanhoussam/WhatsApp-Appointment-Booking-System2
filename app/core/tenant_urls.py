"""Which host a tenant's own dashboard links must point at.

Established 2026-09-09 from a real failure: a staff invite link was built from the global
`FRONTEND_URL` env var, which was unset on Railway, so `admin/team.py` fell back to
`https://salmansaas.com` — the APEX domain. The apex serves a DIFFERENT frontend build from
`demo.`/`alzabt.` (measured the same day: `index-RDs22Cyx.js` vs `index-BUukhr3G.js`), and that
older build cannot handle a setup token. The invite arrived at a page that answered
"رابط غير صالح".

Two defects in one line, both fixed by deriving the host instead of reading it from the environment:

1. **A tenant-dependent value was stored in a single global variable.** `rules/frontend/routing.md`
   §0b already defines the mapping — trial tenants live on `demo.`, subscribed ones on `alzabt.` —
   so one env var can never be right for both at once.
2. **`FRONTEND_URL` is documented as COMMA-SEPARATED** (`app/core/config.py:32`, for CORS) while
   three call sites consumed it as a single base URL. Set it to two hosts to fix CORS and every
   generated link silently becomes `https://a.com,https://b.com/setup?token=…`.

This module does not read `FRONTEND_URL` at all. Nothing here needs an environment variable,
because the answer is already in the tenant row.
"""

from typing import Optional

# rules/frontend/routing.md §0b. Kept as data so a third host is a one-line change, not a new
# branch, and so the mapping is readable next to the reason it exists.
_TRIAL_HOST      = "https://demo.salmansaas.com"
_SUBSCRIBED_HOST = "https://alzabt.salmansaas.com"

# Only `evergreen` means "subscribed" today (the one real instance is `smar`); every other tenant
# is `trial`. Defaulting the UNKNOWN case to the trial host is deliberate: a trial host serving a
# subscribed tenant is a cosmetic wrong-domain link, while the reverse sends a trial tenant to a
# host it may not be provisioned on.
_SUBSCRIBED_STATES = {"evergreen", "subscribed", "active_paid"}


def admin_base_url(lifecycle_state: Optional[str]) -> str:
    """The host this tenant's dashboard — and therefore its setup/invite links — lives on."""
    return _SUBSCRIBED_HOST if (lifecycle_state or "").lower() in _SUBSCRIBED_STATES else _TRIAL_HOST


def setup_link(lifecycle_state: Optional[str], token: str, slug: Optional[str] = None) -> str:
    """The one-time account-setup URL for a tenant's invitee.

    `slug` is carried in the URL at Salman's request (2026-09-09) even though the page does not
    strictly need it: the API answers `GET /auth/setup` with the slug already. Two real reasons to
    include it anyway — the owner can SEE which shop a link belongs to before sending it, and the
    page has somewhere to route to if that API call ever fails.

    It is CONTEXT, never AUTHORITY. The page must keep taking the slug it routes to from the API
    response, because a URL parameter is client-supplied: trusting it would let anyone holding a
    valid token land themselves on another tenant's dashboard path.
    """
    url = f"{admin_base_url(lifecycle_state)}/setup?token={token}"
    return f"{url}&slug={slug}" if slug else url


def mint_setup_token(slug: str) -> str:
    """A setup token that says which tenant it belongs to: `<slug>_<32 random bytes>`.

    Salman's request 2026-09-09: "بدي الـslug يكون كمان جزء من الـlink token … ليعرف حاله وين عم
    يشتغل عند أي client." Three real benefits, none of them security:

      * **Self-describing.** A token in a log, a support message or a pasted URL can be traced to a
        tenant instantly, without a database lookup.
      * **The invitee knows where they are joining** before any API call answers — the page can read
        the prefix straight off the URL.
      * **Operable.** Two invites for two shops are told apart by eye.

    It adds NO guessability: the slug is public (it is in every tenant URL), and the random half is
    still a full 32-byte `token_urlsafe`. The prefix is a LABEL, never a credential — the server
    keeps matching the whole string against `users.setup_token`, and the tenant it acts on comes
    from the matched USER ROW, never from the prefix. Anything else would let a crafted prefix aim a
    valid token at another tenant.
    """
    import re as _re
    import secrets as _secrets
    safe = _re.sub(r"[^a-z0-9-]", "", (slug or "").lower()) or "tenant"
    return f"{safe}_{_secrets.token_urlsafe(32)}"


def slug_from_setup_token(token: str) -> Optional[str]:
    """The label half of a token minted above, or None for a legacy/unprefixed one.

    For DISPLAY only. Never use it to choose a tenant.
    """
    if not token or "_" not in token:
        return None
    prefix = token.split("_", 1)[0]
    return prefix or None
