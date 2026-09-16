"""
Lia — owner data entry from WhatsApp. Phase 1: TEXT -> create_service.

Salman's decision, 2026-09-13. Architecture and every rejected alternative:
`.claudedocs/plans/lia-owner-data-entry.md`.

    owner text -> AI extraction -> draft -> missing-field questions -> preview
               -> owner taps ✅ -> is_authorized -> existing service layer -> DB

WHAT THIS MODULE IS NOT, and the whole design rests on it: it is NOT a second implementation of
service creation. It ends at `catalog_service_service.admin_create_service()` -- the same function
`POST /api/v1/admin/catalog-services` calls -- so the dashboard and Lia write through one path.
The AI is an interface layer, never a database layer.

INTERNAL CALL, NOT HTTP (Salman's decision). An HTTP call to our own API would need a token
minted for a phone number, which is a second authentication surface for no gain. So the route's
three gates are replicated EXPLICITLY here instead of inherited from FastAPI's dependency
injection, and that replication is the risky part, named rather than glossed:

    route gate                          what this module does
    ─────────────────────────────────────────────────────────────────────────────
    get_current_tenant                  resolve the tenant from the SENDER's phone
    require_service("reservations")      _tenant_has_reservations()
    require_permission("services.write") is_authorized(user, "services.write", ...)

Anything the route gains later must be added here too. That is the standing cost of the internal
call, and `whatsapp_merchant_actions` already pays it for reservations -- this follows its shape
deliberately rather than inventing a second one.

TENANT RESOLUTION IS THE PART THAT MUST NOT BE CLEVER. The central WhatsApp number is shared by
every tenant, so `phone_number_id` identifies the CHANNEL and never the tenant (the keystone
recorded in `project_whatsapp_channel_state`). For a merchant action the tenant comes from the
reservation being acted on; Lia has no reservation, so it comes from the sender's phone -- and
ONLY when that phone resolves to exactly ONE tenant. Two matches is a question, never a guess:
writing a service into the wrong shop is not recoverable by the owner who did not ask for it.
"""

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.core.permissions import is_authorized
from app.core.phone import normalize_for_storage
from app.db.client import prisma_client
from app.repositories import catalog_service_repo, user_repo
from app.services import lia_operations
from app.services import catalog_service_service, whatsapp_reservation_flow
from app.services.security_audit_service import log_security_event
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)

_ENDPOINT = "/api/v1/webhook/whatsapp"

# Session state keys. Lia's draft lives in the SAME `whatsapp_sessions.stateData` the booking flow
# uses -- one session store, not a second one. The 30-minute session TTL is the outer bound; the
# 10-minute window below is Lia's own, deliberately shorter (see the plan's §10).
DRAFT_KEY = "lia_draft"
DRAFT_WINDOW_MIN = 10

# States, registered the same way the reservation flow registers its own.
LIA_AWAITING_FIELD   = "LIA_AWAITING_FIELD"
LIA_AWAITING_CONFIRM = "LIA_AWAITING_CONFIRM"

STATES = {LIA_AWAITING_FIELD, LIA_AWAITING_CONFIRM}

# Every LIA_* state must be in STATES, checked at IMPORT. Same guard the reservation flow gained
# on 2026-09-12 after a declared state with a written handler shipped unregistered and a real
# customer's tap landed nowhere. The app refuses to start rather than going quiet on one branch,
# and `from app.main import app` -- already in every pre-flight here -- catches it before a push.
_DECLARED = {n: v for n, v in list(globals().items())
             if n.startswith("LIA_") and isinstance(v, str)}
_UNREGISTERED = {n for n, v in _DECLARED.items() if v not in STATES}
if _UNREGISTERED:                                          # pragma: no cover - import-time guard
    raise RuntimeError(
        f"lia_owner_entry: {sorted(_UNREGISTERED)} declared as state(s) but missing from STATES, "
        f"so try_handle would never see them and the message would land nowhere."
    )

CONFIRM_ID = "__LIA_CONFIRM__"
CANCEL_ID  = "__LIA_CANCEL__"

# What makes a message a DATA-ENTRY attempt at all. Checked before spending a model call, and
# deliberately narrow: an owner also books, asks and chats on this number, and every non-matching
# message must fall through to the normal flow untouched. "ضيف" alone is not enough -- "ضيفني"
# is a person talking -- so the object word has to be there too.
_ENTRY_VERBS = ("ضيف", "ضيّف", "اضف", "أضف", "زيد", "سجل", "سجّل", "add", "create")
_ENTRY_OBJECTS = ("خدمة", "خدمه", "سيرفس", "service")


def _looks_like_service_entry(text: str) -> bool:
    """A cheap, explicit gate before any model call.

    NOT an intent classifier -- the model does that. This only decides whether asking the model is
    justified, which keeps an owner's ordinary message (a booking, a question, a thank-you) from
    costing a call and, more importantly, from being interpreted at all.
    """
    low = " ".join((text or "").split()).lower()
    if len(low) < 6:
        return False
    return (any(v in low for v in _ENTRY_VERBS)
            and any(o in low for o in _ENTRY_OBJECTS))


# Greetings an owner actually opens with. A SECOND cheap gate, and it has to stay as cheap as
# the first one: `_resolve_owner` is a DB read, and every new conversation on this number starts
# with a greeting -- a customer's included. So this must almost never fire on anything else.
#
# Strict by construction: the whole message, folded and stripped of punctuation, must BE one of
# these. Not "starts with", not "contains" -- "مرحبا بدي احجز دقن" is a customer opening a
# booking, and it belongs to the reservation flow's own first-message matching, not to Lia.
_GREETINGS = frozenset({
    "مرحبا", "مرحبتين", "اهلا", "اهلين", "هلا", "هلو", "هاي", "يا هلا",
    "السلام عليكم", "سلام", "صباح الخير", "صباحو", "مسا الخير", "مساء الخير",
    "كيفك", "شلونك", "hi", "hello", "hey", "salam", "marhaba", "hala", "kifak",
})

# The escape hatch. An owner is very often also a barber and sometimes a customer -- measured:
# Salman's own number is TENANT_ADMIN at `barberlab-test` AND a Customer row there, and حسين owns
# `rk` while holding a Barber row. Without this button, routing an owner's greeting to Lia would
# take away his only way into the customer flow, on the one tenant we test on.
BOOK_ID = "__LIA_BOOK__"

_AR_FOLD = (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ى", "ي"), ("ة", "ه"), ("ـ", ""))


def _fold_greeting(text: str) -> str:
    """Lowercase, drop punctuation and emoji, fold the alef/ya/ta-marbuta spellings.

    Its own small copy rather than importing the reservation flow's `_normalise_ar`: that one is
    private to a different module and tuned for service names, and this project's own convention
    is to keep a four-line helper local instead of reaching across a module boundary for it.
    """
    low = (text or "").strip().lower()
    for src_ch, dst in _AR_FOLD:
        low = low.replace(src_ch, dst)
    low = re.sub(r"[\u064B-\u0652]", "", low)
    low = re.sub(r"[^\w\s]", " ", low, flags=re.UNICODE)
    return " ".join(low.split())


def _looks_like_greeting(text: str) -> bool:
    folded = _fold_greeting(text)
    return bool(folded) and len(folded) <= 20 and folded in _GREETINGS


# ── Actor + tenant ────────────────────────────────────────────────────────────

def _phone_candidates(sender: str) -> list[str]:
    """Every stored form the sender's number could legitimately have.

    Same helper shape as `whatsapp_merchant_actions._phone_candidates`, and same reasoning:
    Meta delivers the country code, rows written before the phone rule may not have it, and
    widening a READ is safe where widening a write is not.
    """
    normalized = normalize_for_storage(sender)
    out: list[str] = []
    for value in (normalized, sender, (normalized or "")[3:] if normalized else None):
        if value and value not in out:
            out.append(value)
    return out


# ── C · Actor resolution — decisions D3-2 and D3-c (2026-09-16) ───────────────
#
# Named refusal reasons. A caller must be able to say WHICH condition fell, because "returns None"
# for three different failures is what made the three conditions indistinguishable in the first
# place. These are codes, never text shown to anyone.
_R_OK         = "ok"
_R_UNRESOLVED = "identity_unresolved"
_R_AMBIGUOUS  = "identity_ambiguous"
# The a3-PR violation, told apart from an ordinary stranger (G3-d, 2026-09-16). Both end in a
# refusal, but they are opposite situations and only one is a misconfiguration:
#
#   identity_unresolved   nobody we know sent this. A customer said hello. Expected, constant,
#                         and the overwhelming majority -- auditing it would drown the log.
#   owner_number_unlinked a tenant's OWN published number wrote in, and that tenant has no active
#                         account carrying it. A real shop, a real owner, and Lia is silent at him.
#                         Rare, always wrong, and worth a record.
#
# Collapsing the two is what made the failure invisible: the owner gets silence by design, so
# without this distinction nothing anywhere said his shop was misconfigured.
_R_UNLINKED   = "owner_number_unlinked"


async def _resolve_actor(
    sender_phone: str,
) -> tuple[Optional[str], Optional[str], Optional[str], object, str]:
    """(client_id, actor_tier, actor_id, user_row, reason) — the ONE identity answer.

    Decision **D3-2**: the published shop number answers "WHICH TENANT", and it does NOT answer
    "who". Before this, path A returned `(client_id, "owner", client_id)` with no `User` row and no
    `is_authorized` call at all -- so tenant identity doubled as authorization, and invariant
    **I-4** was violated on the one path every real shop number takes. Measured 2026-09-16: all six
    published numbers of the three live tenants took that path.

    Decision **D3-c**: this resolver owns BOTH paths and shares its policy with nothing.

      path A  shop number -> tenant -> active User INSIDE that tenant
      path B  no shop match -> active User, searched across tenants (an admin or staff account
              texting from a number that is not any shop's published number)

    In both: `isActive` is an explicit condition, there is NO oldest-wins, and ambiguity is
    REFUSED BY COUNT -- including inside one tenant, not only across tenants (invariant **I-3**,
    scoped to Lia's own resolution; `user_repo.find_user_by_phone`, the login path, is deliberately
    left exactly as it is, oldest-wins and all, because changing it would stop a person who owns
    two shops from logging in).

    The tier is DERIVED, never stored twice: holding the shop's published number is `owner`,
    anything else resolved through a User row is `admin`. Same two values this module already
    audited under, so `lia_{actor}_create_service` keeps its existing shape.
    """
    candidates = _phone_candidates(sender_phone)

    # Path A -- which tenant publishes this number.
    clients = await prisma_client.client.find_many()
    def _digits(v): return "".join(ch for ch in (v or "") if ch.isdigit())
    wanted = {_digits(c) for c in candidates if _digits(c)}
    shop_matches = [
        c for c in clients
        if _digits(getattr(c, "whatsapp_number", None)) in wanted
        or _digits(getattr(c, "phone", None)) in wanted
    ]
    if len(shop_matches) > 1:
        # Two tenants publishing one number. Picking either would write into someone else's shop.
        # `Client.phone` is @unique so this can only arrive through `whatsapp_number`, which
        # carries no constraint -- hence a real check rather than a trusted invariant.
        logger.warning("🚫 Lia: phone %s is the published number of %d tenants — refusing",
                       sender_phone, len(shop_matches))
        return None, None, None, None, _R_AMBIGUOUS

    scoped_client_id = shop_matches[0].id if len(shop_matches) == 1 else None
    tier = "owner" if scoped_client_id else "admin"

    users = await user_repo.lia_find_active_users_by_phones(scoped_client_id, candidates)
    if not users:
        # The split described at `_R_UNLINKED`: a shop matched means this is that shop's own
        # number, so "no actor" is a misconfiguration of a known tenant, not an unknown sender.
        if scoped_client_id:
            logger.warning(
                "🔗 Lia: tenant %s published number %s resolves to NO active account — "
                "a3-PR invariant violated, Lia cannot act for this shop",
                scoped_client_id, sender_phone,
            )
            return None, None, None, None, _R_UNLINKED
        return None, None, None, None, _R_UNRESOLVED
    if len(users) > 1:
        logger.warning(
            "🚫 Lia: phone %s matches %d active accounts (%s) — refusing, not choosing",
            sender_phone, len(users),
            ", ".join(sorted({getattr(getattr(u, "client", None), "slug", "?") for u in users})),
        )
        return None, None, None, None, _R_AMBIGUOUS

    user = users[0]
    # Path A already fixed the tenant, so this is a restatement, not a new source of truth. Path B
    # takes the tenant FROM the account -- `User.clientId` is a real FK, which is why widening the
    # search there is safe.
    return user.clientId, tier, user.id, user, _R_OK


async def _resolve_owner(sender_phone: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """The three-value form, for the branches that need identity without an operation.

    Kept as its own seam deliberately: the welcome and the escape hatch ask only "whose shop is
    this", never "may he do X" -- there is no operation at that point to ask about.
    """
    client_id, tier, actor_id, _user, _reason = await _resolve_actor(sender_phone)
    return client_id, tier, actor_id


# ── ① Lia access, and ② operation capability — two checks, never one ─────────

async def _tenant_has_lia(client_id: str) -> bool:
    """① — may this tenant reach Lia AT ALL. F0.3, the deliberately tolerant gate.

    `lia OR reservations`, and the `OR` is a MIGRATION BRIDGE with a stated payoff condition, not
    the final architecture. Pinning Lia straight onto her own key would switch her off for every
    live tenant until the activation rows exist, which is a real outage window for a sold
    capability; the tolerant form removes any dependence on whether code or rows land first.

    THE DEBT: the `reservations` half is removed once every live tenant carries a `lia` row --
    proven by fixture/test that the two keys are independent, never by waiting for a tenant to
    look right (decision R6). Recorded with its payoff condition in
    `.claudedocs/architecture/capabilities/lia.md`.

    This is NOT an operation's capability. An operation's capability is `OP.service_key` and is
    checked separately, per operation, in `_authorise_operation`. Collapsing the two would re-pin
    Lia to `reservations` through the other door -- the exact coupling F1 exists to break.
    """
    row = await prisma_client.clientservice.find_first(where={
        "clientId": client_id, "serviceKey": {"in": ["lia", "reservations"]}, "isActive": True})
    return row is not None


async def _tenant_has_reservations(client_id: str) -> bool:
    """The customer Reservation flow's own gate — `require_service("reservations")`, replicated.

    KEPT, and kept SEPARATE (decision R2). This is neither ① nor ②: it is the capability of the
    flow the escape hatch hands the owner OVER TO. Replacing it with `_tenant_has_lia` would hand
    an owner into a booking flow on a tenant that has no Reservations surface -- a tenant with only
    `lia` active would pass the tolerant gate and land in a flow with nothing to show.
    """
    row = await prisma_client.clientservice.find_first(where={
        "clientId": client_id, "serviceKey": "reservations", "isActive": True})
    return row is not None


async def _authorise_operation(client_id: str, user, op) -> tuple[bool, str]:
    """② + B for ONE operation — `A AND B`, evaluated from the operation's own definition.

    The operation supplies the question (which permission, which legacy roles, which capability);
    the human actor supplies the answer. Lia holds no permission of her own -- invariant **I-7**.

    Order is A then B on purpose: a capability the tenant has not bought is a fact about the shop
    and is cheap to read, while a permission is a fact about the person. Both are returned by name
    so the caller says which one fell rather than "refused".
    """
    row = await prisma_client.clientservice.find_first(where={
        "clientId": client_id, "serviceKey": op.service_key, "isActive": True})
    if row is None:
        return False, "capability_inactive"
    if not is_authorized(user, op.permission, *op.legacy_roles):
        return False, "missing_permission"
    return True, _R_OK


# ── Category resolution — the backend's job, never the model's ────────────────

async def _resolve_service_category(client_id: str) -> tuple[Optional[str], list]:
    """(category_id, active_categories). None means "ask", never "create one".

    `CatalogServiceCreate.category_id` is REQUIRED, so this cannot be deferred to a later phase.
    Resolved by where the tenant's services actually live rather than by name: measured on both
    real barber tenants, every service sits in one category ('الخدمات') while a second
    ('منتجات العناية') sits empty -- so "the category that already holds services" is a fact,
    where a name match would be a guess about Arabic labels.

    Creating a category silently is refused on purpose. A category is a customer-visible grouping;
    inventing one from a chat message is exactly the "we don't want empty tables" failure in
    reverse -- a table filled with structure nobody asked for.
    """
    cats = await prisma_client.catalogcategory.find_many(
        where={"clientId": client_id, "isActive": True})
    if not cats:
        return None, []
    with_services = []
    for cat in cats:
        count = await prisma_client.catalogservice.count(where={"categoryId": cat.id})
        if count:
            with_services.append(cat)
    if len(with_services) == 1:
        return with_services[0].id, cats
    if len(cats) == 1:
        return cats[0].id, cats
    return None, cats


# ── Extraction ────────────────────────────────────────────────────────────────

# ── The prompt lives in a file, not here (2026-09-13, Salman's decision) ──

_PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "lia.md"
# Sentinels, not a markdown heading. The first version split on `## SYSTEM PROMPT` and that
# heading also appeared INSIDE the file's own explanatory comment, in a sentence describing it --
# so the split landed on the wrong occurrence and the entire file was sent as the prompt. A
# sentinel in this shape cannot appear in prose, which makes that mistake unrepeatable.
_PROMPT_START = "<!--LIA_PROMPT_START-->"
_PROMPT_END   = "<!--LIA_PROMPT_END-->"
# The owner's welcome message. A SECOND, separate block -- never merged into the prompt above,
# because it is not sent to a model at all: it is sent verbatim to a person. Keeping them apart
# is what lets the prompt stay provably byte-identical to what it was while the welcome changes.
_WELCOME_START = "<!--LIA_WELCOME_START-->"
_WELCOME_END   = "<!--LIA_WELCOME_END-->"
# The edit prompt: a second model-facing block, kept separate from the first because it takes a
# DRAFT PLUS AN INSTRUCTION and returns only the changed fields, not a whole draft.
_EDIT_START = "<!--LIA_EDIT_PROMPT_START-->"
_EDIT_END   = "<!--LIA_EDIT_PROMPT_END-->"
# Owner-facing wording that this round changes. NOT the whole file's messages -- see the block's
# own header in app/prompts/lia.md for why moving the rest pre-emptively is refused.
_REPLIES_START = "<!--LIA_REPLIES_START-->"
_REPLIES_END   = "<!--LIA_REPLIES_END-->"
_REPLY_KEY = re.compile(r"^\[\[([a-z_]+)\]\]$", re.M)
# Every key the code actually sends. Checked at IMPORT: a missing one must fail pre-flight, not
# reach an owner as a KeyError or an empty message.
_REQUIRED_REPLIES = ("cancel", "confirm_nudge", "edit_unclear", "edit_unavailable")


def _load_prompt() -> str:
    """Lia's system prompt, read from `app/prompts/lia.md`.

    WHY IT IS NOT A STRING IN THIS FILE ANY MORE. It was, and Lia's behaviour changed four times
    in one day -- the prompt itself, the unavailable/misunderstood split, making price and duration
    mandatory, the refusal wording -- and every one of those looked like a code edit rather than a
    behaviour change. `repository-hygiene.md`'s "Persona & Prompt Drift" rule exists for exactly
    that risk and is path-scoped, so a prompt buried in a service module sat outside it. The rule
    now covers `app/prompts/**`, which means a change to Lia's behaviour has to state its reason
    in the commit -- the protection is the file's LOCATION, not its format.

    ONLY THE TEXT BETWEEN THE TWO SENTINELS IS SENT. Everything outside them -- the governing
    rules, the reason the file exists -- is documentation for whoever opens it, and costs no
    tokens. That split is what lets the identity and the payload live in one reviewable place
    without the identity leaking into every API call.

    FAILS AT IMPORT, NOT AT RUNTIME. A missing or malformed prompt file means Lia cannot function,
    and the honest moment to say so is startup -- `from app.main import app` is already part of
    every pre-flight here, so the failure is caught before a push instead of by an owner whose
    message goes unanswered. Same shape as the two STATES registration guards added on 09-12 and
    09-13, for the same reason: a silent dead branch is worse than a loud refusal to start.
    """
    return _load_block(_PROMPT_START, _PROMPT_END, "prompt") + "\n"


def _load_block(start: str, end: str, label: str, min_len: int = 100) -> str:
    """One delimited block of `app/prompts/lia.md`, or a refusal to start.

    Two blocks live in that file and they are NOT interchangeable: the prompt goes to a model,
    the welcome goes to a person. Both are Lia's behaviour and both are under the drift rule, so
    both load through here and both fail the same loud way.
    """
    if not _PROMPT_PATH.exists():
        raise RuntimeError(
            f"Lia prompt file missing: {_PROMPT_PATH}. Lia cannot run without it; see "
            f".claudedocs/architecture/capabilities/lia.md"
        )
    raw = _PROMPT_PATH.read_text(encoding="utf-8")
    if start not in raw or end not in raw:
        raise RuntimeError(
            f"Lia prompt file {_PROMPT_PATH} is missing its {start}/{end} sentinels -- refusing "
            f"to send the whole file, whose header is documentation rather than instructions."
        )
    block = raw.split(start, 1)[1].split(end, 1)[0].strip()
    if len(block) < min_len:
        raise RuntimeError(
            f"Lia {label} from {_PROMPT_PATH} is only {len(block)} chars -- that is not a {label}."
        )
    return block


def _load_replies() -> dict:
    """The `[[key]]`-delimited owner-facing messages, and a refusal to start without them.

    A dict rather than four constants so the import-time guard can assert the whole set at once:
    an owner must never receive an empty message because a key was renamed in the file and not in
    the code.
    """
    block = _load_block(_REPLIES_START, _REPLIES_END, "replies", min_len=60)
    keys = list(_REPLY_KEY.finditer(block))
    if not keys:
        raise RuntimeError(
            f"Lia replies block in {_PROMPT_PATH} has no [[key]] markers -- refusing to start."
        )
    out: dict[str, str] = {}
    for i, m in enumerate(keys):
        end = keys[i + 1].start() if i + 1 < len(keys) else len(block)
        text = block[m.end():end].strip()
        if text:
            out[m.group(1)] = text
    missing = [k for k in _REQUIRED_REPLIES if k not in out]
    if missing:
        raise RuntimeError(
            f"Lia replies in {_PROMPT_PATH} are missing required key(s): {missing}. "
            f"Every message the code sends must exist in the file."
        )
    return out


_SYSTEM_PROMPT = _load_prompt()
# The welcome is loaded at import for the same reason the prompt is: a missing block is caught in
# pre-flight, not by an owner whose "مرحبا" goes unanswered.
_WELCOME = _load_block(_WELCOME_START, _WELCOME_END, "welcome", min_len=40)
_EDIT_PROMPT = _load_block(_EDIT_START, _EDIT_END, "edit prompt")
_REPLIES = _load_replies()


# Returned when the MODEL could not be reached at all -- a missing key, a dead key, a network
# failure. Distinct from None, which means "the model answered and the answer was unusable".
# Collapsing the two would tell an owner he was unclear when the truth is that our AI is down.
_UNAVAILABLE = object()

# "handled, but there is no session to persist" -- distinct from None ("not mine, fall through")
# and from a session object ("persist this").
_SENTINEL = object()


async def _extract(text: str) -> Optional["object"]:
    """Ask the model for a draft. Returns a validated LiaExtraction, or None.

    Same shape as `onboarding.py`'s `_extract_with_claude`, including the fence stripping -- the
    model wraps JSON in ```json often enough that handling it is not defensive, it is the observed
    behaviour. Anything that fails validation returns None: a malformed extraction must become a
    clarifying question, never a partially-trusted draft.
    """
    from app.schemas.lia_drafts import LiaExtraction

    api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
    if not api_key:
        logger.error("🔥 Lia: ANTHROPIC_API_KEY is not configured — extraction unavailable")
        return _UNAVAILABLE
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=api_key)
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": text}],
        )
        raw = resp.content[0].text.strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return LiaExtraction.model_validate_json(raw)
    except Exception as exc:
        # An authentication or transport failure is NOT "the owner was unclear", and telling him
        # "ما فهمت" for a dead API key would send him rephrasing a message that was perfectly
        # clear. Confirmed worth separating: on 2026-09-13 the key was invalid in BOTH the local
        # env and whatever `railway run` injects (401), and the deployed service answers
        # "AI not configured" outright -- so this is the branch that would actually have run.
        import anthropic as _a
        if isinstance(exc, (_a.AuthenticationError, _a.PermissionDeniedError,
                            _a.APIConnectionError, _a.RateLimitError)):
            logger.error("🔥 Lia: extraction UNAVAILABLE (%s) — not an owner error",
                         type(exc).__name__)
            return _UNAVAILABLE
        logger.error("🔥 Lia extraction failed: %s", exc, exc_info=True)
        return None



async def _extract_edit(draft_data: dict, instruction: str) -> Optional["object"]:
    """Read one edit instruction against a live draft. Returns a LiaEditPatch, None, or the
    _UNAVAILABLE sentinel.

    Same three-outcome contract as `_extract`, and for the same measured reason: a dead API key is
    not "the owner was unclear", and answering "ما فهمت" to a perfectly clear instruction would
    send him rephrasing something that was never the problem.

    THE MODEL IS GIVEN THE DRAFT, AND ASKED FOR THE DELTA. Not for a new draft -- see the edit
    prompt's own header in `app/prompts/lia.md`. The draft is passed as JSON rather than as the
    rendered preview, because the preview is prose for a human (bold markers, an Arabic category
    name) and re-parsing prose to get field names back would be inventing a second, weaker
    contract beside the one Pydantic already enforces.
    """
    from app.schemas.lia_drafts import LiaEditPatch

    api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
    if not api_key:
        logger.error("🔥 Lia: ANTHROPIC_API_KEY is not configured — edit unavailable")
        return _UNAVAILABLE
    # Only the editable fields are shown. `category_id`, ids and anything else the draft carries
    # internally stay out of the model's sight entirely -- it cannot change what it cannot see.
    visible = {k: draft_data.get(k) for k in
               ("name_ar", "price", "duration_min", "currency", "name_en", "description_ar")
               if draft_data.get(k) is not None}
    payload = ("المسوّدة الحالية:\n" + json.dumps(visible, ensure_ascii=False)
               + "\n\nتعليمة المالك:\n" + (instruction or "").strip())
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=api_key)
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=_EDIT_PROMPT,
            messages=[{"role": "user", "content": payload}],
        )
        raw = resp.content[0].text.strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return LiaEditPatch.model_validate_json(raw)
    except Exception as exc:
        import anthropic as _a
        if isinstance(exc, (_a.AuthenticationError, _a.PermissionDeniedError,
                            _a.APIConnectionError, _a.RateLimitError)):
            logger.error("🔥 Lia: edit UNAVAILABLE (%s) — not an owner error", type(exc).__name__)
            return _UNAVAILABLE
        logger.error("🔥 Lia edit failed: %s", exc, exc_info=True)
        return None

# ── Draft state ───────────────────────────────────────────────────────────────

def _load_draft(session) -> Optional[dict]:
    """The active draft, or None when there is none or it has aged out.

    READS `session.lia`, WHICH IS THE FIELD THAT ACTUALLY EXISTS. The first version read and
    wrote `session.state_data` -- an attribute `ConversationSession` does not declare. Python
    happily created it on assignment, `_session_to_state_data()` serialised `session.lia` (empty),
    and the draft died the instant the message finished. Salman tapped ✅ seconds after the
    preview and was told "مرّ وقت طويل على الطلب فألغيته".

    The test suite did not catch it because the stub session I wrote for it DEFINED a
    `state_data` property -- the stub was more capable than the real object, so it proved the
    wrong thing. The suite now builds a real `ConversationSession`, which is the only way a
    field-name mismatch cannot hide again.

    The window is Lia's own and shorter than the session's: a confirmation prompt the owner
    answers half an hour later is not a confirmation, it is a stale tap on whatever the screen
    still showed.
    """
    data = getattr(session, "lia", None) or {}
    draft = data.get(DRAFT_KEY) if isinstance(data, dict) else None
    if not isinstance(draft, dict):
        return None
    started = draft.get("started_at")
    if started:
        try:
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(started)).total_seconds()
            if age > DRAFT_WINDOW_MIN * 60:
                return None
        except (ValueError, TypeError):
            return None
    return draft


def _save_draft(session, draft: Optional[dict]) -> None:
    """Write the draft into `session.lia` -- the declared field, which is what gets persisted.

    See `_load_draft` for why this is not `state_data`: that name existed nowhere and silently
    dropped every draft.
    """
    data = getattr(session, "lia", None)
    if not isinstance(data, dict):
        data = {}
    if draft is None:
        data.pop(DRAFT_KEY, None)
    else:
        data[DRAFT_KEY] = draft
    session.lia = data


_FIELD_QUESTIONS = {
    "price":        "قدّيش سعرها؟ (بالدولار)",
    "duration_min": "وقدّيش بتاخد وقت؟ (بالدقائق، أو قول «ساعة»)",
    "name_ar":      "شو اسم الخدمة؟",
}

_DURATION_WORDS = {
    "ساعة": 60, "ساعه": 60, "ساعة ونص": 90, "ساعه ونص": 90, "نص ساعة": 30, "نص ساعه": 30,
    "ربع ساعة": 15, "ساعتين": 120,
}


def _parse_field_answer(field: str, text: str):
    """One typed answer to one asked field. None means "still not understood".

    Numbers only for price, because an owner answering a price question types a price. Durations
    additionally accept the words people actually say -- "ساعة" is far more common than "60".
    """
    value = " ".join((text or "").split())
    if field == "name_ar":
        return value or None
    if field == "duration_min":
        for word, minutes in _DURATION_WORDS.items():
            if word in value:
                return minutes
    digits = re.findall(r"\d+(?:[.,]\d+)?", value.replace(",", "."))
    if not digits:
        return None
    number = float(digits[0])
    return int(number) if field == "duration_min" else number


# ── Preview + write ───────────────────────────────────────────────────────────

def _preview_text(draft_data: dict, category_name: str) -> str:
    """What the owner reads BEFORE anything is written.

    This message is the primary safety mechanism of the whole slice, not a courtesy. Every value
    the model produced is quoted back, so a hallucinated price is visible as a number the owner
    did not say -- the plan's §15 marks "hallucinated price" as the one failure that BLOCKS Phase 1
    for exactly this reason. Nothing is summarised or rounded here.
    """
    lines = [
        "هيك فهمت 👇",
        "",
        f"*الخدمة:*  {draft_data.get('name_ar')}",
        f"*السعر:*   {draft_data.get('price')} {draft_data.get('currency', 'USD')}",
        f"*المدة:*   {draft_data.get('duration_min')} دقيقة",
        f"*الفئة:*   {category_name}",
    ]
    if draft_data.get("name_en"):
        lines.append(f"*بالإنجليزي:* {draft_data['name_en']}")
    if draft_data.get("description_ar"):
        lines.append(f"*الوصف:*   {draft_data['description_ar']}")
    return "\n".join(lines)


async def _send_preview(wa, phone: str, draft: dict) -> None:
    await wa.send_text(phone, _preview_text(draft["data"], draft.get("category_name", "—")))
    await wa.send_interactive_buttons(
        to=phone,
        text="أضيفها هلق؟",
        buttons=[
            {"type": "reply", "reply": {"id": CONFIRM_ID, "title": "✅ ضيفها"}},
            {"type": "reply", "reply": {"id": CANCEL_ID,  "title": "❌ إلغاء"}},
        ],
    )


async def _commit(wa, phone: str, session, draft: dict, clear_draft) -> None:
    """Validate one last time, then write through the EXISTING service layer.

    RE-VALIDATED HERE even though the draft was validated when it was completed, and the reason is
    not paranoia: between then and now the owner answered questions that mutated `data`, so the
    object being written is not the object that was checked. Pydantic is cheap; a bad row is not.

    RE-AUTHORISED HERE for the same reason -- minutes passed, and an account can be deactivated or
    have its permissions changed inside a 10-minute window. The check that matters is the one at
    the moment of the write.

    THE DRAFT IS CONSUMED BEFORE THE WRITE, so two taps on the same button cannot create two
    services. `wamid` idempotency already stops a Meta retry from reaching here twice, but a human
    double-tap produces two DIFFERENT wamids and would otherwise pass both.
    """
    from app.schemas.lia_drafts import LiaServiceDraft

    client_id = draft.get("client_id")
    actor, actor_id = draft.get("actor"), draft.get("actor_id")

    # Consume first. A failure after this point means the owner re-sends, which is recoverable;
    # a double write is not.
    clear_draft()

    try:
        validated = LiaServiceDraft.model_validate(draft["data"])
    except Exception as exc:
        logger.error("🔥 Lia: draft failed final validation: %s", exc)
        await wa.send_text(phone, "صار خلل بالبيانات 😅 ابعتلي الخدمة من جديد.")
        return

    # The SAME definition the pre-model checks used -- not a second lookup of a different shape.
    op = lia_operations.get("create_service")
    ok, reason = await _still_authorised(phone, client_id, op)
    if not ok:
        await log_security_event(
            event_type="lia_write_refused", client_id=client_id, endpoint=_ENDPOINT,
            detail={"reason": reason, "sender_phone": phone}, actor=actor_id,
        )
        logger.warning("🚫 Lia: write refused at commit time (%s) from %s", reason, phone)
        return

    category_id, _ = await _resolve_service_category(client_id)
    if not category_id:
        await wa.send_text(phone, "ما لقيت فئة للخدمات بالمحل. أضفها من اللوحة أول مرّة.")
        return

    try:
        # THE ONE WRITE PATH. Identical function to POST /api/v1/admin/catalog-services --
        # not a copy of its body, the function itself.
        created = await catalog_service_service.admin_create_service(
            client_id      = client_id,
            category_id    = category_id,
            name_ar        = validated.name_ar,
            name_en        = validated.name_en,
            description_ar = validated.description_ar,
            description_en = None,
            image_url      = None,
            price          = validated.price,
            currency       = validated.currency,
            duration_min   = validated.duration_min,
            is_featured    = False,
            sort_order     = 0,
        )
    except Exception as exc:
        logger.error("🔥 Lia: service creation failed: %s", exc, exc_info=True)
        await wa.send_text(phone, "تعذّر إضافة الخدمة. جرّب من جديد أو من اللوحة.")
        return

    await log_security_event(
        event_type=f"lia_{actor}_create_service", client_id=client_id, endpoint=_ENDPOINT,
        detail={"service_id": created.get("id"), "name_ar": validated.name_ar,
                "price": validated.price, "duration_min": validated.duration_min,
                "sender_phone": phone, "source": "whatsapp_text"},
        actor=actor_id,
    )
    logger.info("✅ Lia: service %s created for %s by %s %s",
                created.get("id"), client_id, actor, actor_id)
    await wa.send_text(
        phone,
        f"✅ تمّت إضافة *{validated.name_ar}*\n"
        f"{validated.price} {validated.currency} · {validated.duration_min} دقيقة\n\n"
        f"صارت ظاهرة للزبائن بالحجز هلق.",
    )


async def _still_authorised(phone: str, client_id: Optional[str], op=None) -> tuple[bool, str]:
    """Re-run C, ① , A and B at WRITE time — with the SAME `OperationDefinition`.

    Decision **D9**: the re-check is not a weaker version of the first check, it is the identical
    question asked again from the identical definition. Before this it re-checked a HARDCODED
    `reservations` key regardless of which operation was being written, so a second operation would
    have been re-validated against a capability that does not gate it.

    `op=None` keeps the signature usable by a caller that has no operation in hand; it then checks
    identity, the same tenant, and ① only. Every real write passes its operation.
    """
    if not client_id:
        return False, "no_client"
    resolved, _tier, _actor_id, user, reason = await _resolve_actor(phone)
    if resolved is None:
        # C fell. `identity_ambiguous` is kept distinct from `identity_unresolved` on purpose: one
        # is "we do not know you", the other is "we know you twice", and they need different fixes.
        # `identity_unresolved` keeps its historical name here so existing audit queries on
        # `not_authorised_now` still match; every other reason passes through as itself, including
        # `owner_number_unlinked`, which a reader must be able to tell from "we don't know you".
        return False, ("not_authorised_now" if reason == _R_UNRESOLVED else reason)
    if resolved != client_id:
        return False, "tenant_changed"
    if not await _tenant_has_lia(client_id):
        return False, "lia_access_inactive"
    if op is None:
        return True, _R_OK
    return await _authorise_operation(client_id, user, op)


# ── Entry point ───────────────────────────────────────────────────────────────

async def try_handle(wa, sender_phone: str, session, msg_type: str, value: str,
                     title: str, ensure_session) -> Optional[object]:
    """Handle an owner data-entry message. Returns the SESSION to persist, or None to fall through.

    RUNS BEFORE TENANT RESOLUTION (`whatsapp_flow`, right after `_peek_session`), because Lia's
    tenant comes from WHO SENT the message and never from the shared channel. Placing it after
    `_resolve_client` is what made its very first production message vanish: an owner's
    "أضيف خدمة البروتين..." has no deep-link keyword and no slug, so the resolver answered None and
    the message was dropped before this function was reached.

    Returning a session -- not True -- on every branch it owns, including refusals, for the same
    reason `whatsapp_merchant_actions` returns True on refusals: a half-handled owner message must
    never fall through into the CUSTOMER booking machine, where "ضيف خدمة كيراتين" would be read as
    an answer to "ما اسمك الكريم؟" and stored as a customer's name. `None` means "not mine".

    `session` may be None (a first-contact owner, or one whose session expired). `ensure_session`
    creates one, and is called ONLY once this module has resolved a real authorised owner -- which
    preserves the rule `_peek_session` exists for: an unresolvable message must not leave a phantom
    session behind.
    """
    draft = _load_draft(session) if session is not None else None

    # ── 0. A Lia state with no live draft: the window expired. ──
    #
    # THIS GUARD IS THE ONE THE RESERVATION FLOW LEARNED THE HARD WAY (2026-09-12): a session
    # parked in a state no branch answers is a message that lands nowhere and a customer who gets
    # silence. `session.state` outlives the draft by design -- the draft has a 10-minute window
    # while the session row has 30 -- so this is not an edge case, it is the NORMAL end of an
    # abandoned draft. Without it, an owner who walks away for 15 minutes and comes back finds a
    # dead conversation: Lia would decline the message (no draft) and the state router has no
    # LIA_* branch, so nothing would answer at all.
    if session is not None and not draft and session.state in STATES:
        session.state = "IDLE"
        _save_draft(session, None)
        logger.info("⏲  Lia: draft window expired for %s — state reset to IDLE", sender_phone)
        await wa.send_text(
            sender_phone,
            "مرّ وقت طويل على الطلب فألغيته 🙂 ابعتلي الخدمة من جديد إذا بدك.",
        )
        return session

    # ── 0.5 The escape hatch. Checked BEFORE the draft branches, deliberately. ──
    #
    # An owner who taps "احجز موعد" has said he wants out of Lia. Making him first finish a draft
    # he has already abandoned would be the tool arguing with the person. A live draft is dropped
    # here, and he is TOLD it was -- silently discarding work he can still see on screen is the
    # one thing this branch must not do.
    if msg_type in ("button_reply", "list_reply") and value == BOOK_ID:
        client_id, actor, actor_id = await _resolve_owner(sender_phone)
        if client_id is None:
            # The id is ours, the sender is not. Same silence as every other unresolved case:
            # a stranger must not learn what this number accepts.
            await log_security_event(
                event_type="lia_entry_refused", client_id=None, endpoint=_ENDPOINT,
                detail={"sender_phone": sender_phone, "reason": "book_escape_unresolved"},
            )
            return _SENTINEL
        # `reservations`, NOT `_tenant_has_lia` (decision R2). This gate belongs to the flow the
        # owner is being handed OVER TO, not to Lia: a tenant carrying only `lia` would pass the
        # tolerant access gate and land in a booking flow with no services to show. Third gate,
        # deliberately -- neither ① nor ②.
        if not await _tenant_has_reservations(client_id):
            await wa.send_text(sender_phone, "خدمة الحجوزات مش مفعّلة على هالمحل.")
            return _SENTINEL

        client = await prisma_client.client.find_unique(where={"id": client_id})
        if client is None:
            logger.error("🔥 Lia: escape hatch resolved client_id=%s that no longer exists",
                         client_id)
            return _SENTINEL

        session = await ensure_session()
        if _load_draft(session):
            _save_draft(session, None)
            await wa.send_text(sender_phone, "تمام، تركت المسودة 👌")
        # BINDING THE TENANT HERE IS THE POINT. Lia resolved it from the sender's phone; the
        # channel resolver could not have -- an owner with no bound session and no slug in his
        # message is exactly the case that made Lia's first production message vanish. Writing it
        # onto the session now means every following message in this booking resolves normally.
        session.client_id = client.id
        session.client_slug = client.slug
        session.state = "IDLE"
        logger.info("🚪 Lia: %s (%s) took the escape hatch into the customer flow at %s",
                    sender_phone, actor, client.slug)
        await whatsapp_reservation_flow.start(wa, sender_phone, session, client)
        return session

    # ── 1. A pending confirmation. Checked first: a tap answers the draft, nothing else. ──
    if draft and session is not None and session.state == LIA_AWAITING_CONFIRM:
        if msg_type in ("button_reply", "list_reply"):
            if value == CONFIRM_ID:
                await _commit(wa, sender_phone, session, draft,
                              lambda: (_save_draft(session, None),
                                       setattr(session, "state", "IDLE")))
                return session
            if value == CANCEL_ID:
                _save_draft(session, None)
                session.state = "IDLE"
                await log_security_event(
                    event_type="lia_draft_cancelled", client_id=draft.get("client_id"),
                    endpoint=_ENDPOINT, detail={"sender_phone": sender_phone},
                    actor=draft.get("actor_id"),
                )
                # A REAL CANCEL, and the wording now says what comes next. It used to end at
                # "تمام، ألغيت الطلب 👌" while the expiry message two blocks up told him how to
                # start again -- two logics for one moment. The text lives in
                # app/prompts/lia.md, under the drift rule, not in this line.
                await wa.send_text(sender_phone, _REPLIES["cancel"])
                return session

        # ── A TYPED MESSAGE HERE IS AN EDIT, not a failure to press a button. ──
        #
        # Measured 2026-09-13 17:43: Salman asked twice, in plain words, to change the service
        # name while the preview was on his screen, and was told "اضغط ✅ ضيفها أو ❌ إلغاء" both
        # times. He confirmed a name he did not want and fixed it from the dashboard afterwards.
        # Cancel was the only way to reject a preview, so cancel was being used as "edit" -- which
        # is why it hurt, and why these two were one defect rather than two.
        #
        # RE-PREVIEW IS MANDATORY. Every accepted change goes back through `_advance`, which
        # re-validates the WHOLE draft and shows it again, and the state returns to
        # LIA_AWAITING_CONFIRM. There is no path here that writes, and none that applies a change
        # silently: the principle stays AI proposes, Pydantic validates, the owner decides.
        if msg_type == "text" and (value or "").strip():
            patch = await _extract_edit(draft.get("data") or {}, value)
            if patch is _UNAVAILABLE:
                # Ours, not his -- and the draft is untouched, so the two working actions are
                # offered instead of sending him to the dashboard.
                await wa.send_text(sender_phone, _REPLIES["edit_unavailable"])
                return session
            changes = patch.changes.applied() if patch is not None else {}
            if patch is None or patch.confidence == "low" or not changes:
                logger.info("🤷 Lia: edit not understood for %s — asking, draft kept intact",
                            sender_phone)
                await wa.send_text(sender_phone, _REPLIES["edit_unclear"])
                return session

            # MERGED ON A COPY. A patch that passes its own validation can still be refused by
            # `LiaServiceDraft` once merged, and the owner must not lose a good draft to a bad
            # instruction -- so nothing is written back until the merge validates.
            from app.schemas.lia_drafts import LiaServiceDraft
            merged = dict(draft.get("data") or {})
            merged.update(changes)
            try:
                LiaServiceDraft.model_validate(merged)
            except Exception as exc:
                logger.info("🚫 Lia: edit %s rejected by the draft contract (%s) — old draft kept",
                            list(changes), type(exc).__name__)
                await wa.send_text(sender_phone, _REPLIES["edit_unclear"])
                return session

            draft["data"] = merged
            logger.info("✏️  Lia: draft edited for %s — fields=%s", sender_phone, list(changes))
            await _advance(wa, sender_phone, session, draft)
            return session

        await wa.send_text(sender_phone, _REPLIES["confirm_nudge"])
        return session

    # ── 2. An answer to one asked field. ──
    if draft and session is not None and session.state == LIA_AWAITING_FIELD and msg_type == "text":
        field = draft.get("asking")
        parsed = _parse_field_answer(field, value)
        if parsed is None:
            await wa.send_text(sender_phone, _FIELD_QUESTIONS.get(field, "ما فهمت، جرّب مرّة تانية."))
            return session
        draft["data"][field] = parsed
        draft["unresolved"] = [f for f in draft.get("unresolved", []) if f != field]
        await _advance(wa, sender_phone, session, draft)
        return session

    # ── 2.5 An owner's opening greeting -> Lia's own welcome, with the way out. ──
    #
    # ONLY WHEN HE HAS COMMITTED TO NOTHING. An owner mid-booking who types "مرحبا" is answered by
    # the state he is actually in -- hijacking it would lose his place in his own appointment, and
    # at that moment he is a customer whatever his role says.
    #
    # THE TEST IS WHAT HE PICKED, NOT WHAT THE STATE IS CALLED -- and the first version got that
    # wrong. It required `state == "IDLE"`, which locked the welcome out for anyone who had merely
    # been SHOWN the service list. Measured on 2026-09-14: Salman typed the slug to switch tenant,
    # which opened the flow and parked him at RES_AWAITING_SERVICE with `res_service_id=None`, and
    # "مرحبا" was then answered by "ما فهمت تماماً" instead of by Lia.
    #
    # And it could not be waited out, which is what made it a defect rather than a delay:
    # `whatsapp_session_repo.upsert()` refreshes `expiresAt` on EVERY save, so each attempt pushed
    # the 30-minute window another 30 minutes away. The owner's real path -- tap "احجز موعد",
    # browse, decide not to book, then ask to add a service -- was a dead end.
    #
    # Standing at the list having chosen nothing is not being mid-booking. A chosen service (and
    # so anything past it: a barber, a slot) is. The property/booking flow's own states are
    # deliberately NOT in here: they are a different engine, and an owner inside one is mid-task
    # there for reasons this module knows nothing about.
    uncommitted = (
        session is None
        or session.state == "IDLE"
        or (session.state == whatsapp_reservation_flow.RES_AWAITING_SERVICE
            and not session.res_service_id)
    )
    if msg_type == "text" and _looks_like_greeting(value) and uncommitted:
        client_id, actor, actor_id, _user, c_reason = await _resolve_actor(sender_phone)
        if client_id is None:
            # G3-d, 2026-09-16 (Salman's decision): the SENDER still gets silence -- that part is
            # deliberate and unchanged. What changes is that WE now have a record when the silence
            # is our fault.
            #
            # A customer greeting stays free: it takes the indexed read and nothing else, because
            # `identity_unresolved` is not audited. Only a tenant's own published number arriving
            # with no account behind it, or resolving to two, is written down -- the two cases that
            # mean a real shop is being met with silence by misconfiguration.
            if c_reason in (_R_UNLINKED, _R_AMBIGUOUS):
                await log_security_event(
                    event_type="lia_owner_greeting_unresolved", client_id=None,
                    endpoint=_ENDPOINT,
                    detail={"sender_phone": sender_phone, "reason": c_reason},
                )
            return None
        # ① AND ONLY ① (decision R1). At a greeting there is no operation yet, so there is no
        # `OP.service_key` to check -- asking for one here would force either an invented default
        # operation or the merge of ① with ②, and both are forbidden. So the question is exactly
        # "may this tenant reach Lia", and nothing narrower.
        #
        # BEHAVIOUR CHANGE, deliberate: before this, the welcome went out on identity alone, so an
        # owner whose tenant has no Lia access was greeted by an assistant that would refuse his
        # first instruction. A greeting that cannot be honoured is a promise not kept. He now falls
        # through to the customer flow -- the same treatment any other sender gets on that tenant,
        # and no new wording is invented to say it.
        if not await _tenant_has_lia(client_id):
            logger.info("🚪 Lia: welcome suppressed for %s — tenant %s has no Lia access",
                        sender_phone, client_id)
            return None
        logger.info("👋 Lia: welcome sent to %s (%s)", sender_phone, actor)
        await wa.send_interactive_buttons(
            sender_phone,
            _WELCOME,
            [{"type": "reply", "reply": {"id": BOOK_ID, "title": "احجز موعد 💈"}}],
        )
        # _SENTINEL, not a session: the welcome creates no draft and needs no state. The tap that
        # follows re-resolves the owner from his phone, so nothing has to be remembered.
        return _SENTINEL

    # ── 3. A new data-entry request. The cheap gate runs BEFORE the model. ──
    if msg_type != "text" or not _looks_like_service_entry(value):
        # NOT MINE. None is the only value that lets the message continue to tenant resolution
        # and the customer flow -- `False` would read as "handled" to the caller's
        # `is not None` check and silently swallow every ordinary message on this number.
        return None

    # ── D9, in its decided order: C -> ① -> [operation] -> A -> B ──
    #
    # Every one of these precedes the model call. That was already true for the single hardcoded
    # check; what changes is that the question now comes from the operation instead of being
    # frozen into this function.
    client_id, actor, actor_id, user, c_reason = await _resolve_actor(sender_phone)
    if client_id is None:
        # C fell -- SILENT, for the reason A2-c established: an unresolved or ambiguous sender must
        # not learn that this number accepts owner commands. The attempt is recorded instead, now
        # with WHICH condition fell rather than an undifferentiated refusal.
        await log_security_event(
            event_type="lia_entry_refused", client_id=None, endpoint=_ENDPOINT,
            detail={"sender_phone": sender_phone, "text_preview": (value or "")[:80],
                    "reason": c_reason},
        )
        logger.warning("🚫 Lia: data-entry refused (%s) from %s", c_reason, sender_phone)
        # Deliberately NOT `ensure_session()`: an unauthorised sender must leave no session
        # behind, which is the same rule `_peek_session` protects. `_SENTINEL` says "handled,
        # nothing to persist" -- returning None here would let the message fall through into the
        # customer flow, and returning a session would create one for a stranger.
        return _SENTINEL

    # From here on a draft will exist, so a session is needed -- and only from here on.
    session = await ensure_session()

    # ① -- may this tenant reach Lia at all.
    if not await _tenant_has_lia(client_id):
        # The existing wording, unchanged: ① is `lia OR reservations`, so failing it means
        # `reservations` is inactive too, which is exactly what this sentence says. No new text is
        # invented here -- a new refusal wording belongs in `app/prompts/lia.md` with a stated
        # Intent, not in Python.
        await wa.send_text(sender_phone, "خدمة الحجوزات مش مفعّلة على هالمحل.")
        return session

    # [operation] -- the one intent the model may produce today. The registry is the single place
    # that says what this operation requires; nothing below re-states it.
    op = lia_operations.get("create_service")

    # A AND B, from that definition.
    allowed, why = await _authorise_operation(client_id, user, op)
    if not allowed:
        if why == "capability_inactive":
            # Same sentence as ①, and accurate for this operation: its `service_key` IS
            # `reservations`. An operation gated on a different key will need its own wording, and
            # that wording is a prompt change, not a code change.
            await wa.send_text(sender_phone, "خدمة الحجوزات مش مفعّلة على هالمحل.")
        else:
            # B fell. SILENT + audited, byte-identical to how an unauthorised account was treated
            # before this change -- it was refused inside `_resolve_owner` and returned silently.
            # Telling a resolved-but-unentitled sender which permission he lacks would describe the
            # authorization model to someone who does not hold it.
            await log_security_event(
                event_type="lia_entry_refused", client_id=client_id, endpoint=_ENDPOINT,
                detail={"sender_phone": sender_phone, "reason": why,
                        "operation": op.name, "permission": op.permission},
                actor=actor_id,
            )
            logger.warning("🚫 Lia: %s refused for %s on %s (%s)",
                           op.name, sender_phone, client_id, why)
        return session

    extraction = await _extract(value)
    if extraction is _UNAVAILABLE:
        # Our fault, said as our fault. And the dashboard still works, so the owner is not stuck.
        logger.error("🔥 Lia: unavailable for %s at %s — owner told, not blamed",
                     sender_phone, client_id)
        await wa.send_text(
            sender_phone,
            "المساعد مش متوفّر هلق 🔧 ضيف الخدمة من اللوحة، وأنا رح كون جاهز بعدين.",
        )
        return session
    if extraction is None or extraction.confidence == "low":
        await wa.send_text(
            sender_phone,
            "ما فهمت تماماً 😅 اكتبها هيك مثلاً:\n«ضيف خدمة كيراتين، 25 دولار، ساعة»",
        )
        return session

    category_id, cats = await _resolve_service_category(client_id)
    if not category_id:
        names = " · ".join(c.nameAr for c in cats) if cats else "—"
        await wa.send_text(
            sender_phone,
            f"عندك أكتر من فئة ({names}). أضف الخدمة من اللوحة هالمرّة، أو خبّرني بأي فئة.",
        )
        return session
    category_name = next((c.nameAr for c in cats if c.id == category_id), "—")

    draft = {
        "intent":        extraction.intent,
        "data":          dict(extraction.data or {}),
        "unresolved":    list(extraction.unresolved or []),
        "client_id":     client_id,
        "actor":         actor,
        "actor_id":      actor_id,
        "category_id":   category_id,
        "category_name": category_name,
        "started_at":    datetime.now(timezone.utc).isoformat(),
        "asking":        None,
    }
    await log_security_event(
        event_type="lia_draft_opened", client_id=client_id, endpoint=_ENDPOINT,
        detail={"intent": extraction.intent, "confidence": extraction.confidence,
                "unresolved": draft["unresolved"], "sender_phone": sender_phone},
        actor=actor_id,
    )
    await _advance(wa, sender_phone, session, draft)
    return session


async def _advance(wa, phone: str, session, draft: dict) -> None:
    """Ask for the next missing field, or show the preview once nothing is missing.

    REQUIRED MEANS REQUIRED, and this is where that is enforced rather than in the prompt. The
    model is asked not to invent a price; this makes the absence of one a QUESTION regardless of
    what the model did. `price` and `duration_min` are optional on the API's own schema -- see
    `app/schemas/lia_drafts.py` for why Lia refuses to inherit those defaults.
    """
    from app.schemas.lia_drafts import LiaServiceDraft

    for field in ("name_ar", "price", "duration_min"):
        if draft["data"].get(field) in (None, "", []):
            draft["asking"] = field
            _save_draft(session, draft)
            session.state = LIA_AWAITING_FIELD
            await wa.send_text(phone, _FIELD_QUESTIONS[field])
            return

    try:
        LiaServiceDraft.model_validate(draft["data"])
    except Exception as exc:
        # A value present but invalid (a negative price, a 37-minute duration) is re-asked rather
        # than silently corrected -- correcting it would put a number in the row the owner never
        # said.
        bad = None
        for err in getattr(exc, "errors", lambda: [])():
            loc = err.get("loc") or ()
            if loc and loc[0] in _FIELD_QUESTIONS:
                bad = loc[0]
                break
        field = bad or "price"
        draft["data"].pop(field, None)
        draft["asking"] = field
        _save_draft(session, draft)
        session.state = LIA_AWAITING_FIELD
        await wa.send_text(phone, "هالقيمة ما زبطت. " + _FIELD_QUESTIONS[field])
        return

    draft["asking"] = None
    _save_draft(session, draft)
    session.state = LIA_AWAITING_CONFIRM
    await _send_preview(wa, phone, draft)
