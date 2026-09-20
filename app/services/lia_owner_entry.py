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
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.core.permissions import is_authorized
from app.core.phone import normalize_for_storage
from app.db.client import prisma_client
from app.repositories import catalog_service_repo, user_repo
from app.services import lia_operations
from app.services import catalog_service, catalog_service_service, whatsapp_reservation_flow
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
# S7. A name that already exists: the draft is complete and held, and the owner picks what to do
# with it. Belongs in STATES because it HAS a draft, so the expiry guard's wording fits it.
LIA_AWAITING_DUP     = "LIA_AWAITING_DUP"
# S7. The family question, asked before any draft exists.
LIA_AWAITING_FAMILY  = "LIA_AWAITING_FAMILY"

# Every state `try_handle` routes. The import guard below holds it to "declared means routed".
STATES = {LIA_AWAITING_FIELD, LIA_AWAITING_CONFIRM, LIA_AWAITING_DUP, LIA_AWAITING_FAMILY}

# The subset whose liveness IS a draft — and the distinction matters, because S7 nearly got it
# wrong. `LIA_AWAITING_FAMILY` is routed like the others, so it belongs in STATES, but it has no
# draft: what keeps it alive is a pending record. The expiry guard below reads THIS set, so a
# family answer is not eaten by a "your draft expired" branch it was never part of, and does not
# receive a message about a draft that never existed.
_DRAFT_STATES = {LIA_AWAITING_FIELD, LIA_AWAITING_CONFIRM, LIA_AWAITING_DUP}

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
# S7: the two answers to "this name already exists". `CANCEL_ID` is reused for the third, because
# cancelling means the same thing here as anywhere else and a second cancel id would be a second
# way to say one thing.
DUP_EDIT_ID = "__LIA_DUP_EDIT__"
DUP_NEW_ID  = "__LIA_DUP_NEW__"

# What makes a message a DATA-ENTRY attempt at all. Checked before spending a model call, and
# deliberately narrow: an owner also books, asks and chats on this number, and every non-matching
# message must fall through to the normal flow untouched. "ضيف" alone is not enough -- "ضيفني"
# is a person talking -- so the object word has to be there too.
# SPLIT IN S7 (2026-09-17), and the split is what lets the gate widen without promising what is
# not built. `ضيف` adds a THING to the catalogue; `سجل` records an EVENT -- which is the verb an
# owner reaches for when he means a reservation. Only the ADD verbs get the wider, noun-optional
# treatment below; widening `سجل` too would answer "سجل إنه أحمد إجا مبارح" with
# "خدمة أو بضاعة؟", offering a third thing that does not exist yet. It widens in T4, when that
# question becomes three-way.
_ADD_VERBS = ("ضيف", "ضيّف", "اضف", "أضف", "زيد", "add", "create")
_RECORD_VERBS = ("سجل", "سجّل")
# D-5 (2026-09-20, Salman's decision, APPROVED WITHIN THIS LIMIT). The owner reporting his own
# finished work does not say «سجّل» -- he says what he did: «اليوم الصبح حلقت لي علي، محمد
# وأحمد». MEASURED that day, before the decision: `_entry_family` returned None for that exact
# sentence, so it never reached Lia at all -- no tenant, no model call, no reply, dropped in
# silence.
#
# THE VERB OPENS THE PATH AND DECIDES NOTHING ELSE, which is the whole of Salman's limit: it does
# not infer the service, the time, or who the customer is. Those come from the model, from the
# defaults he already approved (T4.1), or from a question. Deliberately NOT generalised to "any
# verb that implies a service" -- the order stays
# visit action -> reservation intent -> extraction -> validation -> preview -> confirmation -> write.
_VISIT_VERBS = ("حلقت", "حلقنا", "قصيت", "قصينا")
# FRANCO ARABIC, S7 (2026-09-18, Salman's decision 3). The owner writes Latin letters with digits
# standing in for letters -- 3=ع, 7=ح, 2=ء, 5=خ -- and that is INPUT UNDERSTANDING only: nothing
# Lia sends back is ever Franco.
#
# 🔴 WHY THESE ARE A SEPARATE TUPLE INSTEAD OF MORE ENTRIES ABOVE. The Arabic lists are matched
# by SUBSTRING, which is safe for Arabic script but not for three or four Latin letters: `dif` is
# inside `ndif`/`ndife` (نضيف, "clean"), a word a person really might type. A false verb match
# would walk an owner writing AS A CUSTOMER into the owner-entry path -- and an owner is very
# often also a customer, which is the one case the plan requires proving. So every Franco token
# is matched on a WORD BOUNDARY. The Arabic path keeps its existing semantics untouched.
_FRANCO_ADD_VERBS     = ("dif", "dayef", "dayif", "dayyef", "zid", "2dif", "dif2")
# T4: the RECORD verb in Franco. Kept in its own tuple for the same reason the Arabic ones are
# split -- `سجل` opens a reservation and `ضيف` does not, and that distinction must survive the
# transliteration rather than be flattened by it.
_FRANCO_RECORD_VERBS  = ("sajel", "sajjel", "sajil", "sajell", "sejjel", "record")
_FRANCO_SERVICE_WORDS = ("khedme", "khidme", "khedmi", "khedma", "serves")
_FRANCO_PRODUCT_WORDS = ("mantoj", "mantouj", "menteg", "mantouj", "bde3a", "bda3a", "sel3a",
                         "senf")


def _has_franco(low: str, words: tuple) -> bool:
    """Whole-word match for a Latin-script token -- see `_FRANCO_ADD_VERBS` for why not substring."""
    return any(re.search(r"(?<![a-z0-9])" + re.escape(w) + r"(?![a-z0-9])", low) for w in words)
# The union stays under the original name: "is there a Lia verb here at all" is still one question.
_ENTRY_VERBS = _ADD_VERBS + _RECORD_VERBS + _VISIT_VERBS


def _has_visit_verb(text: str) -> bool:
    """Did the owner say the service ALREADY HAPPENED? D-5 · D-2, 2026-09-20.

    Read in two places, which is why it is a function and not an inline `any(...)`: it decides
    that the message may enter the reservation path at all, and later that the row is born
    `arrived` rather than `pending`. Salman's governing rule:

        "Explicit owner-reported completed visit is sufficient evidence for `arrived`; no
         additional business confirmation of completion is required."

    THE DATE IS NOT THE EVIDENCE — THIS VERB IS. «سجل موعد لأحمد مبارح الساعة ٤» is a historical
    APPOINTMENT and stays `pending`; `scripts/test_lia_reservation_t1.py:18` has pinned that
    since T1 and T5 does not touch it.
    """
    low = " ".join((text or "").split()).lower()
    return any(v in low for v in _VISIT_VERBS)
_ENTRY_OBJECTS = ("خدمة", "خدمه", "سيرفس", "service")


# What a message may be about, and the operation each family maps to. S3, 2026-09-17.
#
# THIS REPLACED `_looks_like_service_entry`, which was deleted rather than kept beside it. Keeping
# both would have left a second copy of the same verb/noun logic with no caller in `app/` --
# alive only because a test named it, which is how a duplicate survives long enough to drift from
# the one that runs. `_entry_family(t) == "create_service"` is exactly what that predicate
# answered, and `scripts/test_lia_product_s3.py` asserts that equivalence on the real messages.
#
# THE GATE NOW CHOOSES WHICH QUESTION TO ASK THE MODEL, and that is a real widening of its job --
# it used to answer "is a model call justified", it now also answers "justified for which
# operation". The reason it must be here rather than in the model's answer is decision D9's own
# order: the operation has to be KNOWN before A and B run, and A and B run before any model call.
# An operation named by the model would be named after it was already authorised.
#
# It is still not a classifier. It matches a REQUIRED GENERIC NOUN -- "خدمة" or "منتج"/"بضاعة" --
# and nothing else. It does not know that شامبو is a product and حلاقة is a service, and it must
# not learn: a dictionary of Arabic product names is a list that is wrong the day a shop stocks
# something new. The cost is that an owner says the noun ("ضيف منتج شامبو بـ12 دولار"), which is
# exactly the shape the live service path already requires of him ("ضيف خدمة...").
_PRODUCT_OBJECTS = ("منتج", "منتوج", "بضاعة", "بضاعه", "سلعة", "سلعه", "صنف",
                    "product", "item")

# Returned when the family cannot be decided from the words alone. Not a family, and deliberately
# not a silent preference for the live one: guessing "service" here could authorise
# `services.write` for a message that meant a product, which is the one thing the operation-aware
# model exists to stop. It is now reached by TWO routes -- both nouns present, or neither.
# T4 (2026-09-18). The third family. `موعد` is the noun; `سجل` is its verb, and the verb alone is
# enough -- «سجّللي إنو أحمد إجا مبارح» names no noun at all, which is exactly how an owner speaks
# about something that already happened. That is why `_RECORD_VERBS` was kept narrow until today:
# widening it earlier would have answered a reservation with "خدمة أو بضاعة؟", promising a third
# thing that did not exist. It exists now.
_RESERVATION_OBJECTS = ("موعد", "مواعيد", "حجز", "حجوزات", "appointment", "booking", "reservation")
_FRANCO_RESERVATION_WORDS = ("maw3ad", "maw3ed", "mawaid", "hajz", "7ajz", "7ajez")

_AMBIGUOUS = "__ambiguous__"
# An add verb and nothing to add. Mine, but empty -- and the owner gets a sentence, not silence.
_INCOMPLETE = "__incomplete__"


def _entry_family(text: str) -> Optional[str]:
    """The OPERATION this message asks for, `_AMBIGUOUS`, `_INCOMPLETE`, or None for "not mine".

    Returns an operation name straight out of `lia_operations`, not a private label, so there is
    no second vocabulary to keep in step with the registry.

    🔴 WIDENED IN S7, BECAUSE THE NARROW VERSION FAILED IN A REAL TEST. It used to require a
    generic noun -- `خدمة` or `منتج` -- and refuse everything else, on the argument that the
    alternative was a dictionary of Arabic product names that would be wrong the first day a shop
    stocked something new. That argument still holds. What it missed is that there was a third
    option, and the cost of missing it was measured on 2026-09-17: Salman wrote
    «ضيف ماكينة حلاقة 20 دولار» and got TOTAL SILENCE, four times, because `ماكينة` is in neither
    list. An owner writes the way he speaks.

    The third option is to widen the gate and let the AMBIGUITY BRANCH carry the load: an add verb
    plus something to add is enough to enter, and a message whose family we cannot read becomes a
    QUESTION instead of nothing. No dictionary is introduced, and D9's order is untouched -- the
    question is asked before any operation is known, and authorisation runs after he answers. The
    question costs no model call either, so the wider gate is free.
    """
    low = " ".join((text or "").split()).lower()
    if len(low) < 6:
        return None
    # A VERB IS STILL REQUIRED FOR EVERY PATH, and this line is load-bearing. The first S7 draft
    # checked the nouns before the verb, and the existing suite caught it immediately: «بدي خدمة
    # حلاقة» -- a CUSTOMER asking for a haircut -- contains `خدمة` and would have entered the
    # owner-entry path. No customer message carries `ضيف`/`سجل`; that is the whole reason the
    # gate is built on the verb.
    if not (any(v in low for v in _ENTRY_VERBS)
            or _has_franco(low, _FRANCO_ADD_VERBS)
            or _has_franco(low, _FRANCO_RECORD_VERBS)):
        return None
    service = any(o in low for o in _ENTRY_OBJECTS) or _has_franco(low, _FRANCO_SERVICE_WORDS)
    product = any(o in low for o in _PRODUCT_OBJECTS) or _has_franco(low, _FRANCO_PRODUCT_WORDS)
    booking = (any(o in low for o in _RESERVATION_OBJECTS)
               or _has_franco(low, _FRANCO_RESERVATION_WORDS))
    # A NOUN NAMES THE FAMILY, and more than one noun is a question rather than a precedence rule.
    # Guessing here could authorise `services.write` for a message that meant a reservation.
    named = [f for f, hit in (("create_service", service), ("create_product", product),
                              ("create_reservation", booking)) if hit]
    if len(named) > 1:
        return _AMBIGUOUS
    if named:
        return named[0]
    # No noun at all. A RECORD verb is now enough on its own -- «سجّللي إنو أحمد إجا مبارح الساعة
    # ٤» is a reservation and names nothing. An ADD verb still is not: «ضيف أحمد الساعة ٤» could
    # be any of the three, so it goes to the question.
    # D-5 (2026-09-20): a VISIT verb reads the same way and for the same reason -- «حلقت لعلي
    # ومحمد وأحمد» names no family noun either, and what it reports is a reservation that already
    # happened. It is placed here, in the no-noun branch, rather than earlier: a message that DOES
    # name a family keeps being read by its noun, so «ضيف خدمة… وحلقت» still goes to the question
    # instead of being decided by the verb.
    if (any(v in low for v in _RECORD_VERBS) or _has_franco(low, _FRANCO_RECORD_VERBS)
            or _has_visit_verb(low)):
        return "create_reservation"
    if not (any(v in low for v in _ADD_VERBS) or _has_franco(low, _FRANCO_ADD_VERBS)):
        return None
    # Is there anything to add? A price-like number, or at least two words beyond the verb. This
    # is a CHEAPNESS test, not a classifier: it keeps a bare "ضيف" from costing a database read
    # while letting a real request through to the question.
    rest = low
    for v in _ADD_VERBS + _FRANCO_ADD_VERBS + _FRANCO_RECORD_VERBS:
        rest = rest.replace(v, " ", 1) if v in rest else rest
    words = rest.split()
    if re.search(r"\d", low) or len(words) >= 2:
        return _AMBIGUOUS
    return _INCOMPLETE


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


def _fold_ar(text: str) -> str:
    """Lowercase, drop punctuation and emoji, fold the alef/ya/ta-marbuta spellings.

    Its own small copy rather than importing the reservation flow's `_normalise_ar`: that one is
    private to a different module and tuned for service names, and this project's own convention
    is to keep a four-line helper local instead of reaching across a module boundary for it.

    RENAMED FROM `_fold_greeting` IN S7. It was never about greetings -- it is general Arabic
    folding, and S7 needs the same folding to compare PRODUCT NAMES. Salman named the reason
    directly: Arabic typed fast on WhatsApp spells the same word several ways, so «ماكينة حلاقة»
    and «ماكينه حلاقه» must not become two products. The old name is kept as an alias below so
    nothing that reads it breaks, and a name that describes one of two callers is exactly the
    drift this file has corrected elsewhere.
    """
    low = (text or "").strip().lower()
    for src_ch, dst in _AR_FOLD:
        low = low.replace(src_ch, dst)
    low = re.sub(r"[\u064B-\u0652]", "", low)
    low = re.sub(r"[^\w\s]", " ", low, flags=re.UNICODE)
    return " ".join(low.split())


# The original name, kept so existing readers and callers are undisturbed.
_fold_greeting = _fold_ar


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


async def _find_existing_product(client_id: str, name_ar: str) -> Optional[dict]:
    """The tenant's existing product with this name, or None. S7, 2026-09-17. READ ONLY.

    🔴 THIS EXISTS BECAUSE A REAL TEST PRODUCED A REAL DUPLICATE. On 2026-09-17 Salman added
    «مشط خشب» twice and got two products in his shop. Decision B4 already said an existing name
    must become a QUESTION -- never a silent second row -- but B4 was scoped to the batch slice
    (S4), so the single-product path shipped without it. That scoping was the mistake; the
    decision was right all along.

    MEASURED: there is no duplicate check anywhere in this repository -- not in
    `admin_create_item`, not in the repository, not on the route. So the dashboard carries the
    same gap. Only Lia is guarded here, because only Lia makes it one sentence away; the
    dashboard's own gap is recorded as a finding rather than fixed from inside a chat handler.

    COMPARED ON FOLDED ARABIC, at Salman's instruction: typed fast on WhatsApp the same word
    arrives spelled several ways, so «ماكينه حلاقه» must find «ماكينة حلاقة». `_fold_ar` is the
    folding this module already uses for greetings, now serving its second caller.

    SEARCHED TENANT-WIDE, not inside the resolved category. A product may already sit on a
    different shelf, and answering "you have it, in «أدوات الحلاقة»" is the guidance Salman asked
    for -- naming the shelf turns a refusal into help. One service-layer read
    (`admin_list_items`), no new path.
    """
    wanted = _fold_ar(name_ar)
    if not wanted:
        return None
    for item in await catalog_service.admin_list_items(client_id):
        if item.get("is_active") and _fold_ar(item.get("name_ar") or "") == wanted:
            return item
    return None


async def _resolve_store_category(client_id: str) -> tuple[Optional[str], list]:
    """(category_id, store_categories). None means "ask", never "create one". S3, 2026-09-17.

    RESOLVED BY PARTITION, NOT BY CONTENT -- and that asymmetry with `_resolve_service_category`
    above is the single most important line in this function.

    That one finds the category that already HOLDS services, because a name match would be a guess
    about Arabic labels. Doing the same for products would be actively wrong, and there is a
    measured row proving it: mr-h's «تمشيط أو تسريح» was a `CatalogItem` sitting inside the
    SERVICES category (`scripts/fix_mrh_service_modelled_as_item.py`, applied 2026-09-16). A
    content-based resolver asked "which category holds items?" would have answered with the
    services category on that tenant, and a product would have been written onto the booking
    surface.

    `moduleKey` is the partition discriminator, verified to work without exception --
    `admin/store.py` passes `module_key="store"` on eight call sites. So the question here is
    "which category belongs to the STORE?", which is a structural fact rather than an inference.

    Nothing is created when the answer is empty. A category is a customer-visible grouping; a
    shop that sells nothing yet has not decided how its shelf is organised, and a chat message is
    not where that gets decided.
    """
    cats = await prisma_client.catalogcategory.find_many(
        where={"clientId": client_id, "isActive": True, "moduleKey": "store"})
    if not cats:
        return None, []
    if len(cats) == 1:
        return cats[0].id, cats
    # More than one shelf: prefer the one that already holds products, on the same reasoning the
    # service resolver uses -- where the tenant's products already live is a fact.
    with_items = []
    for cat in cats:
        count = await prisma_client.catalogitem.count(
            where={"categoryId": cat.id, "isActive": True})
        if count:
            with_items.append(cat)
    if len(with_items) == 1:
        return with_items[0].id, cats
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
# The product prompt: a THIRD model-facing block (S3, 2026-09-17). Separate from the service
# prompt above, not an extension of it, for two reasons stated in full in the file's own header:
# the service prompt is pinned byte-identical by two test suites and must stay at zero change,
# and one block per intent is what makes the operation the model names identical to the operation
# already authorised -- see `LiaProductExtraction.intent`.
_PRODUCT_PROMPT_START = "<!--LIA_PRODUCT_PROMPT_START-->"
_PRODUCT_PROMPT_END   = "<!--LIA_PRODUCT_PROMPT_END-->"
# The owner's welcome message. A SECOND, separate block -- never merged into the prompt above,
# because it is not sent to a model at all: it is sent verbatim to a person. Keeping them apart
# is what lets the prompt stay provably byte-identical to what it was while the welcome changes.
_WELCOME_START = "<!--LIA_WELCOME_START-->"
_WELCOME_END   = "<!--LIA_WELCOME_END-->"
# The edit prompt: a second model-facing block, kept separate from the first because it takes a
# DRAFT PLUS AN INSTRUCTION and returns only the changed fields, not a whole draft.
# T4: the reservation block, a FOURTH model-facing block. Separate for the same reason the
# product one is: a different question, different required fields, and its own pinned intent.
_RESERVATION_START = "<!--LIA_RESERVATION_PROMPT_START-->"
_RES_EDIT_START = "<!--LIA_RESERVATION_EDIT_PROMPT_START-->"
_RES_EDIT_END   = "<!--LIA_RESERVATION_EDIT_PROMPT_END-->"
_RESERVATION_END   = "<!--LIA_RESERVATION_PROMPT_END-->"
_EDIT_START = "<!--LIA_EDIT_PROMPT_START-->"
_EDIT_END   = "<!--LIA_EDIT_PROMPT_END-->"
# Owner-facing wording that this round changes. NOT the whole file's messages -- see the block's
# own header in app/prompts/lia.md for why moving the rest pre-emptively is refused.
_REPLIES_START = "<!--LIA_REPLIES_START-->"
_REPLIES_END   = "<!--LIA_REPLIES_END-->"
_REPLY_KEY = re.compile(r"^\[\[([a-z_]+)\]\]$", re.M)
# Every key the code actually sends. Checked at IMPORT: a missing one must fail pre-flight, not
# reach an owner as a KeyError or an empty message.
_REQUIRED_REPLIES = ("cancel", "confirm_nudge", "edit_unclear", "edit_unavailable",
                     # S3, 2026-09-17 -- the five owner-facing texts the product path needs.
                     # Listed here so a missing one fails the app's startup rather than reaching
                     # an owner as an empty WhatsApp message.
                     "store_inactive", "product_no_category", "product_created_note",
                     "product_unclear", "entry_ambiguous",
                     # S7, 2026-09-17 -- every one of these exists because a real live test
                     # produced silence, a duplicate, or a dead end.
                     "entry_incomplete", "dup_found", "dup_ask_price", "dup_updated",
                     "dup_cancelled",
                     # S7, 2026-09-18. `dup_nudge` replaces a text that named an absent button;
                     # `dup_price_only` closes the loop the widened question would otherwise
                     # create. Both texts are pending Salman's approval before any deposit.
                     "dup_nudge", "dup_price_only",
                     # Moved out of the service module on 2026-09-18, unchanged (F-C2).
                     "dup_choose",
                     # T4, 2026-09-18 -- the reservation path. Every one of these is required at
                     # import, so a missing key fails `from app.main import app` rather than
                     # reaching an owner as an empty WhatsApp message.
                     "reservation_ask_customer", "reservation_ask_phone", "reservation_ask_when",
                     "reservation_ask_service", "reservation_ask_barber",
                     "reservation_service_unknown", "reservation_barber_unknown",
                     "reservation_no_barbers", "reservation_no_services",
                     "reservation_preview", "reservation_preview_past", "reservation_confirm",
                     "reservation_created", "reservation_conflict", "reservation_unclear",
                     "reservations_inactive", "walkin_label",
                     # 2026-09-19. Cancel and expiry, PER OPERATION. The single `cancel` text was
                     # written for a service («الاسم والسعر والمدة») and reached an owner who had
                     # just cancelled an APPOINTMENT -- the 5th "text written for one context
                     # shown in another". `service_expired` is the old inline literal, moved here
                     # unchanged so every expiry text lives under the drift rule.
                     "reservation_cancelled", "reservation_expired",
                     "product_cancelled", "product_expired", "service_expired",
                     # 2026-09-19. Marks a barber or service the SERVER filled in, so the owner
                     # sees in the preview what he did not say.
                     "auto_label",
                     # The service edit text names a price and a duration -- wrong on an
                     # appointment preview (the 6th "text for one context shown in another").
                     "reservation_edit_unclear",
                     # T5-1…T5-11 (2026-09-20, every one approved verbatim by Salman, one at a
                     # time, before any of this code existed). The singular texts beside them are
                     # untouched: a one-customer message reads exactly as it did yesterday.
                     "reservation_item_prefix", "reservation_preview_multi",
                     "reservation_item_line", "reservation_time_approx",
                     "reservation_confirm_multi", "reservation_created_multi",
                     "reservation_created_partial", "reservation_edit_which",
                     "reservation_cancelled_multi", "reservation_expired_multi",
                     # 2026-09-19, Salman: the first reply of an appointment greets the person
                     # by name («أهلاً سلمان، نسيت تقلّي الحلاق»).
                     "greet_prefix")


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
# Loaded at import for the same reason as the others: a missing or malformed block must fail
# pre-flight, where it is visible, not one owner's message, where it is not.
_PRODUCT_PROMPT = _load_block(_PRODUCT_PROMPT_START, _PRODUCT_PROMPT_END, "product prompt")
# The welcome is loaded at import for the same reason the prompt is: a missing block is caught in
# pre-flight, not by an owner whose "مرحبا" goes unanswered.
_WELCOME = _load_block(_WELCOME_START, _WELCOME_END, "welcome", min_len=40)
_EDIT_PROMPT = _load_block(_EDIT_START, _EDIT_END, "edit prompt")
_RESERVATION_PROMPT = _load_block(_RESERVATION_START, _RESERVATION_END, "reservation prompt")
_RESERVATION_EDIT_PROMPT = _load_block(_RES_EDIT_START, _RES_EDIT_END, "reservation edit prompt")
_REPLIES = _load_replies()


# Returned when the MODEL could not be reached at all -- a missing key, a dead key, a network
# failure. Distinct from None, which means "the model answered and the answer was unusable".
# Collapsing the two would tell an owner he was unclear when the truth is that our AI is down.
_UNAVAILABLE = object()

# "handled, but there is no session to persist" -- distinct from None ("not mine, fall through")
# and from a session object ("persist this").
_SENTINEL = object()


async def _extract(text: str) -> Optional["object"]:
    """Ask the model for a SERVICE draft. Returns a validated LiaExtraction, or None.

    Same shape as `onboarding.py`'s `_extract_with_claude`, including the fence stripping -- the
    model wraps JSON in ```json often enough that handling it is not defensive, it is the observed
    behaviour. Anything that fails validation returns None: a malformed extraction must become a
    clarifying question, never a partially-trusted draft.
    """
    from app.schemas.lia_drafts import LiaExtraction

    return await _ask_model(_SYSTEM_PROMPT, text, LiaExtraction)


async def _extract_product(text: str) -> Optional["object"]:
    """Ask the model for a PRODUCT draft. Returns a validated LiaProductExtraction, or None.

    A different prompt and a different contract, but the SAME transport, the same fence stripping
    and the same three-way outcome (`_UNAVAILABLE` / None / a validated object) -- which is why
    the body is shared rather than copied. A second copy of the failure classification below is
    exactly how "unavailable" and "misunderstood" would drift apart again, and that distinction
    was paid for once already (2026-09-13, a dead API key answered with "ما فهمت").
    """
    from app.schemas.lia_drafts import LiaProductExtraction

    return await _ask_model(_PRODUCT_PROMPT, text, LiaProductExtraction)


async def _extract_reservation(text: str) -> Optional["object"]:
    """One owner message -> a reservation candidate. T4, 2026-09-18.

    THE PROMPT IS GIVEN THE CURRENT TIME, and it has to be: «مبارح» and «بكرا» are meaningless
    without it, and a model left to guess today's date will silently file an appointment in the
    wrong week. The time handed over is `datetime.now()` -- the container runs TZ=Asia/Beirut, so
    the server's wall clock IS the shop's wall clock, which is the same representation every
    reservation in this system is stored in. Deliberately NOT `utcnow()`: that would be three
    hours off the only clock that matters here.
    """
    from app.schemas.lia_drafts import LiaReservationExtraction
    from app.services.whatsapp_notifications import fmt_reserved_at
    now = datetime.now()
    prompt = _RESERVATION_PROMPT.format(now=f"{now:%Y-%m-%d %H:%M} ({fmt_reserved_at(now)})")
    return await _ask_model(prompt, text, LiaReservationExtraction)


async def _extract_reservation_edit(draft_data: dict, instruction: str) -> Optional["object"]:
    """One edit instruction against a RESERVATION draft -> a LiaReservationEditPatch, None, or
    _UNAVAILABLE. 2026-09-19.

    The service edit reader knows name/price/duration only, so «خلّيه مع زياد» on an appointment
    preview was «ما فهمت». Needed the moment the server started filling the barber and service in
    by default: a default the owner cannot correct is a guess he has to cancel to escape.

    The model sees the draft's five fields and the current time (a «خليها الساعة 5» keeps the
    draft's date), and returns only what changed. The same transport as every other extraction.
    """
    from app.schemas.lia_drafts import LiaReservationEditPatch
    from app.services.whatsapp_notifications import fmt_reserved_at
    now = datetime.now()
    prompt = _RESERVATION_EDIT_PROMPT.format(now=f"{now:%Y-%m-%d %H:%M} ({fmt_reserved_at(now)})")
    visible = {k: draft_data.get(k) for k in _RESERVATION_FIELDS
               if draft_data.get(k) not in (None, "")}
    payload = ("المسوّدة الحالية:\n" + json.dumps(visible, ensure_ascii=False)
               + "\n\nتعليمة المالك:\n" + (instruction or "").strip())
    return await _ask_model(prompt, payload, LiaReservationEditPatch)


_RESERVATION_FIELDS = ("customer_name", "customer_phone", "reserved_at", "service_name",
                       "barber_name")

# Salman, 2026-09-19: «إذا الخدمة مش موجودة يحطها افتراضياً شعر ودقن». Matched FOLDED against this
# shop's real services; a shop without it gets the question, exactly as before.
_DEFAULT_SERVICE_NAME = "شعر ودقن"


async def _apply_reservation_defaults(draft: dict) -> None:
    """Fill a missing service and barber the way Salman decided, ONCE per draft. 2026-09-19.

    Supersedes R-6 («an unnamed barber is a question, never a choice») by Salman's own decision:
      * service missing -> «شعر ودقن» if this shop has it;
      * barber missing  -> the barber row linked to the account TALKING (`User.barberId`, read
        when the draft opened) if it is active here. No link, no default -- never a name match.
    Anything filled here is listed in `draft["defaulted"]` so the preview marks it «(تلقائي)», and
    every one of them can be changed by a sentence at the preview before ✅.

    ONCE, deliberately: `_resolve_reservation_rows` drops a name it cannot resolve and asks, and a
    second pass here would put the same default straight back -- a loop the owner cannot leave.
    """
    if draft.get("defaults_applied"):
        return
    draft["defaults_applied"] = True
    data, auto = draft["data"], set(draft.get("defaulted") or [])
    if not data.get("service_name"):
        wanted = _fold_ar(_DEFAULT_SERVICE_NAME)
        svc = next((s for s in await _list_services(draft["client_id"])
                    if _fold_ar(getattr(s, "nameAr", "") or "") == wanted), None)
        if svc is not None:
            data["service_name"] = svc.nameAr
            auto.add("service_name")
    # D-4 (2026-09-20, approved): a visit he says he already performed, with no number given, is
    # a walk-in — «اليوم الصبح حلقت لعلي ومحمد وأحمد» carries no phones and never will. Asking for
    # three numbers that do not exist is what would kill the feature.
    #
    # SCOPED TO A REPORTED VISIT, and the scope is the decision: «سجل موعد لأحمد مبارح الساعة ٤»
    # is a historical APPOINTMENT, Lia still asks for its number exactly as she did yesterday, and
    # the T4 flow is untouched. Marked «(تلقائي)» and editable like every other filled-in value,
    # so he can still say «رقمه 70…» at the preview.
    if (not data.get("customer_phone") and draft.get("visit_reported")
            and data.get("reserved_at")):
        from app.schemas.lia_drafts import WALK_IN_PHONE
        try:
            when = data["reserved_at"]
            past = _is_past(when if isinstance(when, datetime)
                            else datetime.fromisoformat(str(when)))
        except ValueError:
            past = False
        if past:
            data["customer_phone"] = WALK_IN_PHONE
            auto.add("customer_phone")
    if not data.get("barber_name") and draft.get("actor_barber_id"):
        brb = next((b for b in await _list_barbers(draft["client_id"])
                    if str(getattr(b, "id", "")) == str(draft["actor_barber_id"])), None)
        if brb is not None:
            data["barber_name"] = brb.name
            auto.add("barber_name")
    draft["defaulted"] = sorted(auto)


# A barber offered as a BUTTON (2026-09-19, Salman: «إذا عند الحلاق بطلع الأوبشن زرار»). The id
# carries the Barber row id, so a tap resolves to exactly one row of THIS shop -- never a name.
BARBER_PICK_PREFIX = "lia_barber:"


def _take_greeting(draft: dict) -> str:
    """«أهلاً {first name}، » ONCE per appointment draft, then "". 2026-09-19.

    The name is the first word of the talking account's `fullName`, read when the draft opened.
    No name, no greeting -- never a placeholder. Marked on the draft BEFORE the caller saves it.
    """
    if draft.get("greeted") or _draft_operation(draft) != "create_reservation":
        return ""
    draft["greeted"] = True
    name = (draft.get("actor_name") or "").strip()
    # The space is added HERE: the reply loader strips each text, so a trailing space in lia.md
    # never survives (measured: «أهلاً سلمان،نسيت»).
    return _REPLIES["greet_prefix"].format(name=name).strip() + " " if name else ""


async def _ask_barber(wa, phone: str, draft: dict, text: str) -> None:
    """Ask for the barber WITH the shop's real barbers as buttons (up to 3, WhatsApp's limit).

    More than three -> the same question as text with the names listed, as before. Typing a name
    still works in every case: the tap is a shortcut, not the only door.
    """
    barbers = await _list_barbers(draft["client_id"])
    if 1 <= len(barbers) <= 3:
        await wa.send_interactive_buttons(
            to=phone, text=text,
            buttons=[{"type": "reply",
                      "reply": {"id": f"{BARBER_PICK_PREFIX}{b.id}",
                                "title": (getattr(b, "name", "") or "—").strip()[:20]}}
                     for b in barbers])
        return
    names = " · ".join((getattr(b, "name", "") or "").strip() for b in barbers)
    await wa.send_text(phone, f"{text}\n{names}" if names else text)


async def _list_barbers(client_id: str) -> list:
    """Active barbers, through the SAME repository the customer flow reads.

    `whatsapp_reservation_flow:494` calls exactly this with `active_only=True`; Lia asking a
    different question would let her offer a barber the booking flow would refuse.
    """
    from app.repositories import barber_repo
    try:
        return await barber_repo.list_barbers(client_id, active_only=True) or []
    except Exception as exc:                                   # pragma: no cover - read failure
        logger.error("🔥 Lia: could not list barbers for %s: %s", client_id, exc)
        return []


async def _list_services(client_id: str) -> list:
    """Active `CatalogService` rows — the BOOK side, never `CatalogItem`.

    The two must not be confused: a product is bought and has no duration; a service is booked and
    carries `durationMin`, which is the number this reservation's length comes from.
    """
    from app.repositories import catalog_service_repo
    try:
        return await catalog_service_repo.list_catalog_services(client_id) or []
    except Exception as exc:                                   # pragma: no cover - read failure
        logger.error("🔥 Lia: could not list services for %s: %s", client_id, exc)
        return []


def _match_by_name(rows: list, spoken: str, attr: str = "nameAr"):
    """The row whose `nameAr` the owner meant, or None. Folded, never fuzzy.

    Exact-on-folded first, then containment in either direction, so «قص» finds «قص شعر» and
    «قص شعر» finds «قص». `_fold_ar` is the same normaliser the duplicate check uses -- an owner
    typing «حلاقه دقن» must reach «حلاقة دقن». Nothing scores or ranks: a name that matches two
    rows is treated as no match at all, because guessing between two real services would put the
    wrong one on a real appointment.
    """
    wanted = _fold_ar(spoken or "")
    if not wanted:
        return None
    # THE COLUMN IS NOT THE SAME ON BOTH SIDES, measured not assumed: `CatalogService.nameAr`
    # and `Barber.name`. Passing it in beats a helper that silently reads the wrong attribute and
    # matches nothing -- which would present as "Lia never finds my barber", not as an error.
    folded = [(r, _fold_ar(getattr(r, attr, "") or "")) for r in rows]
    exact = [r for r, f in folded if f == wanted]
    if len(exact) == 1:
        return exact[0]
    if exact:
        return None
    partial = [r for r, f in folded if f and (wanted in f or f in wanted)]
    return partial[0] if len(partial) == 1 else None


async def _ask_model(system_prompt: str, text: str, model_cls) -> Optional["object"]:
    """One model call, one contract. `_UNAVAILABLE` for our fault, None for an unusable answer.

    `model_cls` is a Pydantic class with `extra="forbid"` and a one-value `intent` Literal, so the
    caller's already-authorised operation and the model's claimed one cannot disagree: a product
    prompt answering `create_service` fails validation and becomes a question.
    """
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
            system=system_prompt,
            messages=[{"role": "user", "content": text}],
        )
        raw = resp.content[0].text.strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return model_cls.model_validate_json(raw)
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
        # 🔴 NEVER THE EXCEPTION'S TEXT, AND NO TRACEBACK (2026-09-19, before R0 went live). A
        # pydantic ValidationError quotes the model's answer back -- measured locally: a customer's
        # name, phone and notes reached the log in 8 of 8 invalid answers. Only the exception type
        # and pydantic's own error-type codes (fixed constants, never input) are written.
        codes = []
        if hasattr(exc, "errors"):
            try:
                codes = sorted({e.get("type", "?") for e in exc.errors(include_input=False)})
            except Exception:
                codes = []
        logger.error("🔥 Lia extraction failed: %s %s", type(exc).__name__, codes)
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

def _stale_draft_operation(session) -> Optional[str]:
    """The operation of the stored draft EVEN IF it has aged out -- for wording its expiry only."""
    data = getattr(session, "lia", None) or {}
    raw = data.get(DRAFT_KEY) if isinstance(data, dict) else None
    return _draft_operation(raw) if isinstance(raw, dict) else None


def _per_operation(op_name: Optional[str], moment: str, many: bool = False) -> str:
    """The reply key for a cancel or an expiry, worded for the operation it ends.

    `moment` is "cancelled" or "expired". A service keeps the original texts: `cancel` for a
    cancel (its wording was right for a service) and `service_expired` for an expiry. Anything
    unreadable falls back to the service wording -- the behaviour before 2026-09-19.

    `many` (T5-10/T5-11, approved 2026-09-20) picks the plural wording for a list. The singular
    texts say «ألغيت **الموعد**… ابعتلي **الزبون والوقت والخدمة**», which would reach an owner
    who had just cancelled three of them -- the seventh and eighth instances of "a text written
    for one context shown in another". The singular forms are untouched.
    """
    if op_name == "create_reservation":
        return f"reservation_{moment}_multi" if many else f"reservation_{moment}"
    if op_name == "create_product":
        return f"product_{moment}"
    return "cancel" if moment == "cancelled" else "service_expired"


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


_PENDING_KEY = "family"


def _load_pending(session) -> Optional[dict]:
    """The unanswered family question, or None when there is none or it aged out. S7.

    Stored beside the draft in `session.lia`, under its own key, because it is NOT a draft: there
    is no extracted data yet, nothing has been validated, and no operation is known. Folding it
    into the draft would give `_load_draft` two meanings and make "is there a draft" ambiguous at
    every call site.

    Same 10-minute window as a draft, for the same reason: an answer half an hour later is not an
    answer, it is a stale tap on whatever the screen still showed.
    """
    data = getattr(session, "lia", None) or {}
    pend = data.get(_PENDING_KEY) if isinstance(data, dict) else None
    if not isinstance(pend, dict):
        return None
    started = pend.get("started_at")
    if started:
        try:
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(started)).total_seconds()
            if age > DRAFT_WINDOW_MIN * 60:
                return None
        except (ValueError, TypeError):
            return None
    return pend


def _save_pending(session, pending: Optional[dict]) -> None:
    data = getattr(session, "lia", None)
    if not isinstance(data, dict):
        data = {}
    if pending is None:
        data.pop(_PENDING_KEY, None)
    else:
        data[_PENDING_KEY] = pending
    session.lia = data


# The words an owner actually answers "خدمة أو بضاعة؟" with. Folded before matching, so
# «بضاعه» finds «بضاعة» -- the same spelling tolerance the duplicate check needs.
_FAMILY_ANSWERS = {
    "create_service": ("خدمه", "خدمة", "سيرفس", "service", "khedme", "khidme", "khedma"),
    "create_product": ("بضاعه", "بضاعة", "منتج", "منتوج", "سلعه", "صنف", "product", "item",
                       "bde3a", "bda3a", "mantoj", "mantouj", "menteg"),
    "create_reservation": ("موعد", "حجز", "appointment", "booking", "maw3ad", "7ajz"),
}


def _parse_family_answer(text: str) -> Optional[str]:
    """Which family he named, or None for anything else — including a change of subject.

    None is what makes the state INTERRUPTIBLE, at Salman's instruction: an owner who answers
    "انسى الموضوع، احجزلي موعد" must not be held at the question. The caller drops the pending
    record and lets the message be handled from scratch, so it reaches the booking flow instead
    of being argued with.
    """
    folded = _fold_ar(text)
    if not folded:
        return None
    # 🔴 SHORT ANSWERS ONLY — and this bound was NOT here until T4 made it necessary. The existing
    # suite caught it the moment `موعد` joined the answer words: «انسى الموضوع واحجزلي موعد» is an
    # owner ABANDONING the question to go and book, and substring matching read it as "he said
    # reservation". That is precisely the interruptibility Salman required, broken by widening the
    # vocabulary. A real answer to "خدمة، بضاعة، ولا موعد؟" is one or two words; a sentence is a
    # change of subject and must fall through to be handled from scratch.
    if len(folded.split()) > 3:
        return None
    for family, words in _FAMILY_ANSWERS.items():
        if any(w in folded for w in words):
            return family
    return None


_FIELD_QUESTIONS = {
    "price":        "قدّيش سعرها؟ (بالدولار)",
    "duration_min": "وقدّيش بتاخد وقت؟ (بالدقائق، أو قول «ساعة»)",
    "name_ar":      "شو اسم الخدمة؟",
}

# The product's own questions. A separate dict rather than a widened one, so the service
# questions above stay byte-identical -- and because the wording genuinely differs: «سعرها» is a
# service, «سعره» is a product, and there is no duration question at all.
_PRODUCT_FIELD_QUESTIONS = {
    "price":   "قدّيش سعره؟ (بالدولار)",
    "name_ar": "شو اسم المنتج؟",
}

# T4. READ FROM THE PROMPT FILE, not written here -- these are owner-facing text, and F-C2 was
# exactly the cost of keeping such a string in a service module.
_RESERVATION_FIELD_QUESTIONS = {
    "customer_name":  _REPLIES["reservation_ask_customer"],
    "customer_phone": _REPLIES["reservation_ask_phone"],
    "reserved_at":    _REPLIES["reservation_ask_when"],
    "service_name":   _REPLIES["reservation_ask_service"],
    "barber_name":    _REPLIES["reservation_ask_barber"],
}

# What the owner says when the customer has no number (R-1's escape, Salman 2026-09-18).
_WALKIN_WORDS = ("طيار", "عابر", "ما عندي رقمه", "ما عندي رقم", "بدون رقم", "بلا رقم",
                 "ما بعرف رقمه", "walk in", "walkin", "tayyar", "tayar")


def _op_spec(op_name: str):
    """(required_fields, field_questions, draft_class) for one operation. S3, 2026-09-17.

    THE ONE PLACE THE SHAPE OF A DRAFT IS DECIDED, so `_advance`, `_preview_text` and `_commit`
    read it instead of each carrying its own idea of what a complete draft looks like. Before
    this, all three were frozen to the service shape -- `_advance` looped over a literal
    ("name_ar", "price", "duration_min") and `_commit` named `LiaServiceDraft` outright -- and a
    second operation would have had to be threaded through each of them separately.

    REQUIRED MEANS REQUIRED, and it is enforced here rather than in the prompt: the model is
    asked not to invent a price, and this makes the absence of one a QUESTION regardless of what
    the model actually did.
    """
    from app.schemas.lia_drafts import (LiaProductDraft, LiaReservationDraft, LiaServiceDraft)

    if op_name == "create_reservation":
        # `barber_name` is REQUIRED BY THE FLOW while staying Optional on the draft class, and the
        # difference is deliberate: R-6 says an unnamed barber is a QUESTION, never an automatic
        # choice (every live tenant has two barbers, so "there is only one" would help nobody).
        # The class stays tolerant so a draft that reaches validation without it fails on the
        # flow's terms rather than on Pydantic's.
        return (("customer_name", "customer_phone", "reserved_at", "service_name", "barber_name"),
                _RESERVATION_FIELD_QUESTIONS, LiaReservationDraft)
    if op_name == "create_product":
        return ("name_ar", "price"), _PRODUCT_FIELD_QUESTIONS, LiaProductDraft
    # `create_service` and, deliberately, anything unknown: a draft whose operation cannot be
    # read is treated as the one operation that has always existed. This is not a default
    # OPERATION -- authorisation never falls back, `lia_operations.get` returns None for an
    # unknown name and the caller refuses. It is only how a draft written by the PREVIOUS deploy,
    # which carries `intent` and no `operation` key, still completes instead of dying mid-flow.
    return ("name_ar", "price", "duration_min"), _FIELD_QUESTIONS, LiaServiceDraft


def _draft_operation(draft: dict) -> str:
    """Which operation this draft is for, tolerant of a draft written before S3.

    A draft that was mid-flight when this code deployed has `intent` and no `operation`. Reading
    both, in that order, is what stops the deploy itself from cancelling every open preview.
    """
    return draft.get("operation") or draft.get("intent") or "create_service"

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
    if field in ("name_ar", "customer_name", "service_name", "barber_name"):
        return value or None
    if field == "customer_phone":
        # R-1 in full: Lia ASKS, and never invents. What she accepts is the owner SAYING there is
        # no number -- which is a fact he stated, not a number she made up.
        from app.schemas.lia_drafts import WALK_IN_PHONE
        folded = _fold_ar(value)
        if any(_fold_ar(w) in folded for w in _WALKIN_WORDS):
            return WALK_IN_PHONE
        from app.core.phone import normalize_for_storage
        return normalize_for_storage(value) or None
    if field == "duration_min":
        for word, minutes in _DURATION_WORDS.items():
            if word in value:
                return minutes
    digits = re.findall(r"\d+(?:[.,]\d+)?", value.replace(",", "."))
    if not digits:
        return None
    number = float(digits[0])
    return int(number) if field == "duration_min" else number


# ── T5 · more than one customer in one message (2026-09-20) ──────────────────
#
# Salman's real need, in his own words: «اليوم الصبح حلقت لي علي، محمد وأحمد. هون الوقت ماله قيمة
# بالظبط متى، المهم يسجّل الزباين مشان يعمل حسابات بعدين» -- a DAY'S VISIT LOG, not two
# appointments. The same shape a photographed page of names will arrive in later, which is why it
# is worth getting right now rather than reshaping twice.
_MAX_ITEMS = 3              # D-7: this TEXT interface only. The image stage decides its own.


def _clean_item(raw: dict, known: set) -> dict:
    """One extracted appointment, ready to enter a draft. ONE path for every item.

    Two jobs, and both existed before T5 -- they are gathered here so `data` and each entry of
    `extra` cannot drift apart:

    FILTERED to the draft class's own fields, which closes a real livelock: `data` is a free dict
    on the extraction contract, so a stray key would reach `_advance`, fail validation on a field
    that has no question, and re-ask forever.

    PHONE NORMALISED at the point the value ENTERS the draft (2026-09-20), because a number the
    owner TYPES as an answer goes through `_parse_field_answer` and one he DICTATES did not --
    the same person could become two `customers` rows, the first unreachable by any outbound send
    (`rules/phone-numbers.md`). Not done at validation time: the preview reads `draft["data"]`
    while the write reads the validated model, so normalising there would show him one number and
    store another. An unreadable number becomes absent, which makes it a QUESTION, never a guess.
    """
    data = {k: v for k, v in (raw or {}).items() if k in known}
    phone_said = data.get("customer_phone")
    if phone_said:
        data["customer_phone"] = _parse_field_answer("customer_phone", str(phone_said))
        if not data["customer_phone"]:
            data.pop("customer_phone", None)
    return data


def _sequence_time(cursor: Optional[datetime], said_at: datetime, time_said: bool,
                   duration_min: Optional[int]) -> tuple[datetime, datetime]:
    """(this item's start, the cursor after it) — the ONE rule that serves both T5 modes.

    Salman's decision (2026-09-20): sequential from the start of the period, spaced by the
    service's own duration. «اليوم الصبح» with a 30-minute service gives 09:00 · 09:30 · 10:00,
    in the order he said the names.

    THIS IS A DATABASE REQUIREMENT, NOT A PREFERENCE. `reservations_active_barber_slot_uidx` is a
    real partial unique index on `(client_id, barber_id, reserved_at)` WHERE the status is one of
    pending/confirmed/arrived -- and `arrived` is inside it. Three names at one time collide at
    the index, not merely at the Python conflict check, so spacing them is what makes the write
    possible at all.

    The MODEL never invents an hour: when the owner gave only a day or a period it answers
    `time_said=false` with the period's start, and the distribution is the server's decision.
    An explicit hour is used exactly as said and moves the cursor past itself, so a mixed message
    keeps what he actually stated.
    """
    start = said_at if (time_said or cursor is None) else cursor
    return start, start + timedelta(minutes=duration_min or 30)


# Everything that belongs to ONE item and must not survive into the next one. `data` is replaced
# outright; these are cleared, because a leftover `barber_id` from علي would be written onto محمد.
_ITEM_KEYS = ("service_id", "barber_id", "duration_min", "defaulted", "defaults_applied",
              "asking", "settled")


def _focus_item(draft: dict, pos: int) -> bool:
    """Make the item at `pos` the live one, so the existing machinery can work on it. T5-5.

    The whole edit path — the patch, the merge, the re-validation, the name→id resolution — is
    written against `draft["data"]`. Rather than teach each of those to address an item by index,
    the one being edited is brought to `data` and the previous occupant is filed back with its
    own `pos`, so the list he reads never reorders. Returns False when `pos` is already live.
    """
    if draft.get("pos", 0) == pos:
        return False
    target = next((i for i in (draft.get("done") or []) if i.get("pos") == pos), None)
    if target is None:
        return False
    draft["done"] = [i for i in draft["done"] if i.get("pos") != pos] + [{
        "data":         draft["data"],
        "service_id":   draft.get("service_id"),
        "barber_id":    draft.get("barber_id"),
        "duration_min": draft.get("duration_min"),
        "defaulted":    draft.get("defaulted"),
        "pos":          draft.get("pos", 0),
        "settled":      draft.get("settled", False),
    }]
    draft["data"] = target["data"]
    draft["pos"] = pos
    for key in _ITEM_KEYS:
        draft.pop(key, None)
    for key in ("service_id", "barber_id", "duration_min", "defaulted", "settled"):
        if target.get(key) is not None:
            draft[key] = target[key]
    return True


def _match_item(draft: dict, instruction: str) -> Optional[int]:
    """Which of them «خلّي موعد علي مع زياد» is about — by NAME, or None. T5-8's promise.

    None means "ask", never "guess the first one": with three names on the screen, picking one
    because it was listed first would write a change onto a customer he did not mention. Two
    names in one instruction is also None — that is ambiguous, and ambiguity is a question in
    this module by long-standing rule (I-3).
    """
    folded = _fold_ar(instruction or "")
    hits = [i.get("pos", 0) for i in _all_items(draft)
            if (i.get("data") or {}).get("customer_name")
            and _fold_ar(i["data"]["customer_name"]) in folded]
    return hits[0] if len(hits) == 1 else None


def _settle_item(draft: dict) -> None:
    """Give the finished item its final wall clock, and move the batch cursor past it.

    Called once per item, AFTER `_resolve_reservation_rows` -- which is the first moment the
    service's real `durationMin` is known, and the spacing is that duration. Before that point
    there is nothing to space by except a guess.
    """
    if draft.get("settled"):
        # Re-entered after an edit. The hour is already this item's own; re-running the cursor
        # would walk every later item forward by one more service length each time he corrects
        # a name. An edit that changes the TIME clears this flag, so a real change still lands.
        return
    said = draft["data"].get("reserved_at")
    when = said if isinstance(said, datetime) else datetime.fromisoformat(str(said))
    cursor = draft.get("time_cursor")
    start, after = _sequence_time(datetime.fromisoformat(cursor) if cursor else None,
                                  when, bool(draft.get("time_said", True)),
                                  draft.get("duration_min"))
    draft["data"]["reserved_at"] = start.isoformat()
    draft["time_cursor"] = after.isoformat()
    # Remembered across items so the preview can say «الساعات تقريبيّة» only when the server
    # really did choose one. One item he did not time is enough to make the list approximate.
    draft["settled"] = True
    if not draft.get("time_said", True):
        draft["all_times_said"] = False


def _next_item(draft: dict) -> None:
    """Retire the finished item into `done`, and load the next one into `data`."""
    pos = draft.get("pos", 0)
    draft.setdefault("done", []).append({
        "data":         draft["data"],
        "service_id":   draft.get("service_id"),
        "barber_id":    draft.get("barber_id"),
        "duration_min": draft.get("duration_min"),
        "defaulted":    draft.get("defaulted"),
        "pos":          pos,
        "settled":      draft.get("settled", False),
    })
    nxt = draft["rest"].pop(0)
    draft["data"] = nxt["data"]
    draft["time_said"] = bool(nxt.get("time_said", True))
    for key in _ITEM_KEYS:
        draft.pop(key, None)
    draft["pos"] = pos + 1


def _item_lead(draft: dict) -> str:
    """«بالنسبة لـعلي،» — which of them a question is about. T5-7, approved 2026-09-20.

    BY NAME, NOT BY NUMBER, and that was Salman's own reasoning: the names are what he typed, so
    «بالنسبة لمحمد» is something he can act on while «الموعد التاني» makes him count. Empty for
    the first item (nothing to disambiguate) and empty when the missing field IS the name, where
    the plain question is already the clearest thing to say.

    The trailing space is added HERE because `_load_replies` strips every text -- the same real
    bug that made the greeting read «أهلاً سلمان،نسيت» on 2026-09-19.
    """
    if not draft.get("done"):
        return ""
    name = (draft.get("data") or {}).get("customer_name")
    if not name:
        return ""
    return _REPLIES["reservation_item_prefix"].format(name=name).strip() + " "


def _normalise_reservation_changes(changes: dict) -> dict:
    """Server-side checks on a reservation edit before it touches the draft. 2026-09-19."""
    out = {}
    for field, value in changes.items():
        if field == "customer_phone":
            parsed = _parse_field_answer("customer_phone", str(value))
            if parsed:
                out[field] = parsed
        elif field == "reserved_at":
            try:
                out[field] = datetime.fromisoformat(str(value)).replace(tzinfo=None).isoformat()
            except ValueError:
                pass
        elif field in _RESERVATION_FIELDS:
            cleaned = " ".join(str(value).split())
            if cleaned:
                out[field] = cleaned
    return out


async def _resolve_reservation_rows(wa, phone: str, session, draft: dict) -> bool:
    """Turn the two NAMES the model returned into the two real ids the write needs. T4.

    🔴 THE IDS TRAVEL IN `metadata`, NOT AS PARAMETERS, and that is measured rather than designed:
    `create_reservation` has no `barber_id` or `service_id` argument at all. `_resolve_barber` reads
    `metadata["barber_id"]` and `_resolve_catalog_service` reads `metadata["service_id"]`
    (reservation_service.py:318, :337), which is exactly how the customer flow already writes them
    (whatsapp_reservation_flow.py:892). Lia follows that literally instead of inventing a shape.

    A name that matches nothing becomes the SAME question again, with the real list attached --
    never a guess, and never a silent drop. Returns False when the owner still owes an answer.
    """
    client_id = draft["client_id"]

    services = await _list_services(client_id)
    if not services:
        await wa.send_text(phone, _REPLIES["reservation_no_services"])
        return False
    svc = _match_by_name(services, draft["data"].get("service_name"), attr="nameAr")
    if svc is None:
        names = " · ".join((getattr(r, "nameAr", "") or "") for r in services)
        draft["data"].pop("service_name", None)
        draft["asking"] = "service_name"
        _save_draft(session, draft)
        session.state = LIA_AWAITING_FIELD
        await wa.send_text(phone, _item_lead(draft)
                           + _REPLIES["reservation_service_unknown"].format(names=names))
        return False

    barbers = await _list_barbers(client_id)
    if not barbers:
        await wa.send_text(phone, _REPLIES["reservation_no_barbers"])
        return False
    brb = _match_by_name(barbers, draft["data"].get("barber_name"), attr="name")
    if brb is None:
        names = " · ".join((getattr(r, "name", "") or "") for r in barbers)
        draft["data"].pop("barber_name", None)
        draft["asking"] = "barber_name"
        greeting = _take_greeting(draft)
        _save_draft(session, draft)
        session.state = LIA_AWAITING_FIELD
        await _ask_barber(wa, phone, draft,
                          greeting + _item_lead(draft)
                          + _REPLIES["reservation_barber_unknown"].format(names=names))
        return False

    # The ROW's own spelling replaces what he typed, for the same reason F-C1 exists: the preview
    # must show what will be written, not what was heard.
    draft["service_id"]   = svc.id
    draft["barber_id"]    = brb.id
    draft["duration_min"] = getattr(svc, "durationMin", None) or 30
    draft["data"]["service_name"] = getattr(svc, "nameAr", "") or draft["data"]["service_name"]
    draft["data"]["barber_name"]  = getattr(brb, "name", "") or draft["data"]["barber_name"]
    return True


def _is_past(reserved_at: datetime) -> bool:
    """ONE place decides this, and it never converts. T4.

    The stored representation is a local wall clock wearing a UTC label — proved by construction
    2026-09-17 — so the comparison is built the same way the three routes build theirs, character
    for character. A "more correct" comparison using a real UTC instant would sit three hours away
    from every other guard in this system.
    """
    when = reserved_at if reserved_at.tzinfo is None else reserved_at.replace(tzinfo=None)
    return when < datetime.now()


# ── Preview + write ───────────────────────────────────────────────────────────

def _preview_text(draft_data: dict, category_name: str,
                  op_name: str = "create_service") -> str:
    """What the owner reads BEFORE anything is written.

    This message is the primary safety mechanism of the whole slice, not a courtesy. Every value
    the model produced is quoted back, so a hallucinated price is visible as a number the owner
    did not say -- the plan's §15 marks "hallucinated price" as the one failure that BLOCKS Phase 1
    for exactly this reason. Nothing is summarised or rounded here.

    THE PRODUCT PREVIEW OMITS THE DURATION LINE, and that omission is itself the safety property:
    printing "*المدة:* None دقيقة" would show the owner a field his product does not have and
    teach him that Lia does not know what she is writing. `op_name` defaults to the service so an
    S2-era draft previews exactly as it did.
    """
    label = "المنتج" if op_name == "create_product" else "الخدمة"
    lines = [
        "هيك فهمت 👇",
        "",
        f"*{label}:*  {draft_data.get('name_ar')}",
        f"*السعر:*   {draft_data.get('price')} {draft_data.get('currency', 'USD')}",
    ]
    if op_name != "create_product":
        lines.append(f"*المدة:*   {draft_data.get('duration_min')} دقيقة")
    lines.append(f"*الفئة:*   {category_name}")
    if draft_data.get("name_en"):
        lines.append(f"*بالإنجليزي:* {draft_data['name_en']}")
    if draft_data.get("description_ar"):
        lines.append(f"*الوصف:*   {draft_data['description_ar']}")
    return "\n".join(lines)


def _all_items(draft: dict) -> list[dict]:
    """Every item this draft will write, in the order he said them. One item = a one-element list.

    `done` holds the ones already completed and `data` is the live one, so this is simply the two
    put back together — the single place that knows the draft's shape, so the preview, the commit
    loop and the cancel wording cannot each invent their own idea of "how many".
    """
    live = {
        "data":         draft.get("data") or {},
        "service_id":   draft.get("service_id"),
        "barber_id":    draft.get("barber_id"),
        "duration_min": draft.get("duration_min"),
        "defaulted":    draft.get("defaulted"),
        "pos":          draft.get("pos", 0),
        "settled":      draft.get("settled", False),
    }
    # SORTED BY `pos`, NOT BY WHERE THEY HAPPEN TO SIT. Editing one of them makes it the live
    # item, and without an explicit position «خلّي موعد علي مع زياد» would quietly move علي to the
    # end of the list he is reading. The order is his, and it is the one thing this feature was
    # asked for -- «لازم بس تسجلهم بالترتيب».
    return sorted((draft.get("done") or []) + [live], key=lambda i: i.get("pos", 0))


def _item_preview_line(item: dict, index: int) -> str:
    """One line of the multi-item preview. T5-2, approved verbatim 2026-09-20.

    A COMPACT LINE RATHER THAN THE FIVE-LINE BLOCK, and that is a real choice: the single
    appointment's block is five lines, so three of them would be fifteen on a phone screen. The
    single-item preview keeps that block byte for byte — this shape exists only once there is a
    list to read.
    """
    from app.schemas.lia_drafts import WALK_IN_PHONE
    from app.services.whatsapp_notifications import fmt_reserved_at
    data = item.get("data") or {}
    auto = set(item.get("defaulted") or [])
    mark = lambda field: (f"{data.get(field)} {_REPLIES['auto_label']}" if field in auto
                          else data.get(field))
    when = data.get("reserved_at")
    if isinstance(when, str):
        try:
            when = datetime.fromisoformat(when)
        except ValueError:
            pass
    return _REPLIES["reservation_item_line"].format(
        n=index,
        customer=data.get("customer_name"),
        when=fmt_reserved_at(when) if isinstance(when, datetime) else when,
        service=mark("service_name"), barber=mark("barber_name"),
        phone=(_REPLIES["walkin_label"] if data.get("customer_phone") == WALK_IN_PHONE
               else data.get("customer_phone")))


def _reservation_preview_multi_text(draft: dict) -> str:
    """The whole list, before anything is written. T5-1 · T5-2 · T5-3, approved verbatim."""
    items = _all_items(draft)
    text = _REPLIES["reservation_preview_multi"] + "\n\n" + "\n\n".join(
        _item_preview_line(item, n) for n, item in enumerate(items, start=1))
    # Said only when the SERVER chose an hour. If he stated every time himself there is nothing
    # approximate about them, and claiming otherwise would be a small lie in a message whose whole
    # job is to be checkable.
    if not draft.get("all_times_said", True):
        text += "\n\n" + _REPLIES["reservation_time_approx"]
    if any(isinstance(i.get("data", {}).get("reserved_at"), str)
           and _is_past(datetime.fromisoformat(i["data"]["reserved_at"]))
           for i in items if i.get("data", {}).get("reserved_at")):
        text += "\n" + _REPLIES["reservation_preview_past"]
    return text


def _reservation_preview_text(draft: dict) -> str:
    """What the owner reads BEFORE a reservation is written. T4.

    The same safety property as the service/product preview: every value is quoted back, so a
    mis-read date is visible as a date he did not say. The time is rendered by the platform's ONE
    formatter (`fmt_reserved_at`), which prints the value exactly as stored — using a second
    formatter here would let the preview and the merchant alert disagree about the same row.
    """
    from app.schemas.lia_drafts import WALK_IN_PHONE
    from app.services.whatsapp_notifications import fmt_reserved_at
    data = draft["data"]
    phone_shown = (_REPLIES["walkin_label"] if data.get("customer_phone") == WALK_IN_PHONE
                   else data.get("customer_phone"))
    when = data.get("reserved_at")
    if isinstance(when, str):
        try:
            when = datetime.fromisoformat(when)
        except ValueError:
            pass
    auto = set(draft.get("defaulted") or [])
    mark = lambda field: (f"{data.get(field)} {_REPLIES['auto_label']}" if field in auto
                          else data.get(field))
    text = _REPLIES["reservation_preview"].format(
        customer=data.get("customer_name"), phone=phone_shown,
        when=fmt_reserved_at(when) if isinstance(when, datetime) else when,
        service=mark("service_name"), barber=mark("barber_name"))
    if isinstance(when, datetime) and _is_past(when):
        text += "\n" + _REPLIES["reservation_preview_past"]
    return text


async def _send_preview(wa, phone: str, draft: dict, greeting: str = "") -> None:
    if _draft_operation(draft) == "create_reservation":
        many = len(_all_items(draft)) > 1
        await wa.send_text(phone, greeting + (_reservation_preview_multi_text(draft) if many
                                              else _reservation_preview_text(draft)))
        await wa.send_interactive_buttons(
            to=phone,
            text=_REPLIES["reservation_confirm_multi"] if many else _REPLIES["reservation_confirm"],
            buttons=[
                # T5-9, approved 2026-09-20. The message and the button had to move together --
                # «سجّلهن هلق؟» above a button reading «سجّله» is the same class of mismatch this
                # file has already paid for five times. Still an inline literal here, like every
                # other button title, and that remains a known F-C2 gap rather than a new one.
                {"type": "reply", "reply": {"id": CONFIRM_ID,
                                            "title": "✅ سجّلهم" if many else "✅ سجّله"}},
                {"type": "reply", "reply": {"id": CANCEL_ID,  "title": "❌ إلغاء"}},
            ],
        )
        return
    await wa.send_text(phone, _preview_text(draft["data"], draft.get("category_name", "—"),
                                            _draft_operation(draft)))
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
    client_id = draft.get("client_id")
    actor, actor_id = draft.get("actor"), draft.get("actor_id")
    op_name = _draft_operation(draft)
    _, _, draft_cls = _op_spec(op_name)

    # Consume first. A failure after this point means the owner re-sends, which is recoverable;
    # a double write is not.
    clear_draft()

    # The SAME definition the pre-model checks used -- looked up by the operation the DRAFT
    # carries, not by a name written into this function. `get` returns None for an unknown name
    # and there is no fallback: a draft naming an operation this registry does not know is
    # refused, because the alternative is writing under a permission nobody checked.
    op = lia_operations.get(op_name)
    if op is None:
        await log_security_event(
            event_type="lia_write_refused", client_id=client_id, endpoint=_ENDPOINT,
            detail={"reason": "unknown_operation", "operation": op_name,
                    "sender_phone": phone}, actor=actor_id,
        )
        logger.error("🔥 Lia: draft named unknown operation %r — write refused", op_name)
        return

    try:
        validated = draft_cls.model_validate(draft["data"])
    except Exception as exc:
        logger.error("🔥 Lia: draft failed final validation: %s", exc)
        await wa.send_text(phone, "صار خلل بالبيانات 😅 ابعتلي الخدمة من جديد.")
        return

    ok, reason = await _still_authorised(phone, client_id, op)
    if not ok:
        await log_security_event(
            event_type="lia_write_refused", client_id=client_id, endpoint=_ENDPOINT,
            detail={"reason": reason, "operation": op.name, "sender_phone": phone},
            actor=actor_id,
        )
        logger.warning("🚫 Lia: write refused at commit time (%s) from %s", reason, phone)
        return

    if op.name == "create_reservation" and len(_all_items(draft)) > 1:
        await _commit_reservations(wa, phone, client_id, draft, op, actor, actor_id)
        return

    if op.name == "create_reservation":
        created = await _write_reservation(wa, phone, client_id, validated,
                                           _all_items(draft)[0], _row_status(draft, validated))
    elif op.name == "create_product":
        created = await _write_product(wa, phone, client_id, validated)
    else:
        created = await _write_service(wa, phone, client_id, validated)
    if created is None:
        return                                     # the branch already told the owner why

    if op.name == "create_reservation":
        from app.services.whatsapp_notifications import fmt_reserved_at
        await wa.send_text(phone, _REPLIES["reservation_created"].format(
            customer=validated.customer_name,
            when=fmt_reserved_at(validated.reserved_at),
            barber=validated.barber_name or "—"))

    await log_security_event(
        event_type=f"lia_{actor}_{op.name}", client_id=client_id, endpoint=_ENDPOINT,
        # `getattr` on every field: a reservation draft has no `name_ar` and no `price`, and an
        # audit line that raises is an audit line that never gets written.
        detail={"row_id": created.get("id"),
                "name_ar": getattr(validated, "name_ar", None),
                "price": getattr(validated, "price", None),
                # A reservation's duration lives on the DRAFT (it comes from the service row in
                # `_resolve_reservation_rows`), not on the validated class -- reading only the
                # class audited `None` for reservation 86efa834, whose row carries 20 (2026-09-19).
                "duration_min": (getattr(validated, "duration_min", None)
                                 or draft.get("duration_min")),
                "reserved_at": (validated.reserved_at.isoformat()
                                if getattr(validated, "reserved_at", None) else None),
                "historical": (_is_past(validated.reserved_at)
                               if getattr(validated, "reserved_at", None) else None),
                "operation": op.name, "permission": op.permission,
                "service_key": op.service_key,
                "sender_phone": phone, "source": "whatsapp_text"},
        actor=actor_id,
    )
    logger.info("✅ Lia: %s %s created for %s by %s %s",
                op.name, created.get("id"), client_id, actor, actor_id)


async def _update_existing_price(wa, phone: str, session, draft: dict, dup: dict,
                                 new_price: float) -> None:
    """Change an existing product's price. S7, 2026-09-17.

    THE OTHER HALF OF THE DUPLICATE ANSWER. Telling an owner "you already have this" and stopping
    there sends him to the dashboard, which is the one thing Lia exists to spare him. So the
    answer carries an action.

    A FULL WRITE, AUTHORISED LIKE ANY OTHER. `_still_authorised` re-runs C, ①, A and B against
    `update_product`'s own definition -- the same gate and permission as creating a product,
    read off the PATCH route -- and the draft is consumed before the call so a double tap cannot
    apply the change twice.

    ONLY THE PRICE IS SENT. `admin_update_item` drops every `None` from its patch, so the name,
    the category, the image and the flags are untouched. An "edit the price" that quietly rewrote
    a field the owner never mentioned would be worse than no edit at all.
    """
    client_id = draft.get("client_id")
    actor, actor_id = draft.get("actor"), draft.get("actor_id")
    item_id, old_price = dup.get("id"), dup.get("price")
    currency = dup.get("currency") or "USD"

    _save_draft(session, None)
    session.state = "IDLE"

    op = lia_operations.get("update_product")
    ok, reason = await _still_authorised(phone, client_id, op)
    if not ok:
        await log_security_event(
            event_type="lia_write_refused", client_id=client_id, endpoint=_ENDPOINT,
            detail={"reason": reason, "operation": "update_product", "sender_phone": phone},
            actor=actor_id,
        )
        logger.warning("🚫 Lia: price update refused (%s) from %s", reason, phone)
        return

    try:
        await catalog_service.admin_update_item(
            client_id      = client_id,
            item_id        = item_id,
            name_ar        = None,
            name_en        = None,
            description_ar = None,
            description_en = None,
            image_url      = None,
            price          = new_price,
            currency       = None,
            is_featured    = None,
            is_active      = None,
            sort_order     = None,
            metadata       = None,
        )
    except Exception as exc:
        logger.error("🔥 Lia: price update failed: %s", exc, exc_info=True)
        await wa.send_text(phone, "تعذّر تعديل السعر. جرّب من جديد أو من اللوحة.")
        return

    await log_security_event(
        event_type=f"lia_{actor}_update_product", client_id=client_id, endpoint=_ENDPOINT,
        detail={"row_id": item_id, "name_ar": draft["data"].get("name_ar"),
                "price": new_price, "old_price": old_price,
                "operation": "update_product", "permission": op.permission,
                "service_key": op.service_key,
                "sender_phone": phone, "source": "whatsapp_text"},
        actor=actor_id,
    )
    logger.info("✏️  Lia: product %s repriced %s -> %s for %s", item_id, old_price, new_price,
                client_id)
    await wa.send_text(phone, _REPLIES["dup_updated"].format(
        name=draft["data"].get("name_ar"), price=new_price, currency=currency,
        old_price=old_price))


async def _write_service(wa, phone: str, client_id: str, validated) -> Optional[dict]:
    """The service write, unchanged in substance -- only moved out of `_commit`.

    Returns None once the owner has been told what went wrong, so the caller does not have to
    distinguish "failed" from "failed and already explained".
    """
    category_id, _ = await _resolve_service_category(client_id)
    if not category_id:
        await wa.send_text(phone, "ما لقيت فئة للخدمات بالمحل. أضفها من اللوحة أول مرّة.")
        return None

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
        return None

    await wa.send_text(
        phone,
        f"✅ تمّت إضافة *{validated.name_ar}*\n"
        f"{validated.price} {validated.currency} · {validated.duration_min} دقيقة\n\n"
        f"صارت ظاهرة للزبائن بالحجز هلق.",
    )
    return created


async def _write_product(wa, phone: str, client_id: str, validated) -> Optional[dict]:
    """The product write. S3, 2026-09-17.

    `catalog_service.admin_create_item` is the SAME function `POST /api/v1/admin/store/products`
    calls -- the function itself, not a copy of its body, which is the rule
    `rules/backend/architecture.md` §9 states and the reason no new write path was built for this
    operation. `scripts/test_lia_product_s1.py` runs this exact function against a faked
    repository and asserts the row it produces: clientId carried, the store partition, isActive
    set by the service, and NO duration field.

    FOUR ARGUMENTS ARE DELIBERATELY NOT PASSED FROM THE DRAFT -- `image_url`, `metadata`,
    `is_featured`, `sort_order`. Each of them is a real column the route lets a dashboard set, and
    none of them is something a chat message may decide. `image_url=None` is why the product shows
    a generic icon, which the owner is TOLD in the success message rather than left to discover.
    """
    category_id, cats = await _resolve_store_category(client_id)
    if not category_id:
        if len(cats) > 1:
            names = " · ".join(c.nameAr for c in cats)
            # More than one shelf and none of them obviously the right one: the owner names it,
            # Lia does not pick. Same shape as the service branch's own ambiguity message.
            await wa.send_text(
                phone,
                f"عندك أكتر من قسم بضاعة ({names}). ضيفه من اللوحة هالمرّة، أو خبّرني بأي قسم.",
            )
        else:
            await wa.send_text(phone, _REPLIES["product_no_category"])
        return None

    try:
        created = await catalog_service.admin_create_item(
            client_id      = client_id,
            category_id    = category_id,
            name_ar        = validated.name_ar,
            name_en        = validated.name_en,
            description_ar = validated.description_ar,
            description_en = None,
            image_url      = None,
            price          = validated.price,
            currency       = validated.currency,
            is_featured    = False,
            sort_order     = 0,
            metadata       = None,
        )
    except Exception as exc:
        logger.error("🔥 Lia: product creation failed: %s", exc, exc_info=True)
        await wa.send_text(phone, "تعذّر إضافة المنتج. جرّب من جديد أو من اللوحة.")
        return None

    await wa.send_text(
        phone,
        f"✅ تمّت إضافة *{validated.name_ar}*\n"
        f"{validated.price} {validated.currency}\n\n"
        f"صارت ظاهرة بالمتجر هلق.\n"
        f"{_REPLIES['product_created_note']}",
    )
    return created


def _row_status(draft: dict, validated) -> str:
    """`arrived` or `pending` — D-2, decided 2026-09-20, in Salman's own words:

        "Explicit owner-reported completed visit is sufficient evidence for `arrived`; no
         additional business confirmation of completion is required. Preview/confirm only
         validates the extracted fields before writing."

    TWO CONDITIONS, BOTH REQUIRED. The VERB is the evidence — «حلقتلو» — and the date alone never
    is: «سجل موعد لأحمد مبارح الساعة ٤» is a historical APPOINTMENT and stays `pending`, the
    invariant `scripts/test_lia_reservation_t1.py:18` has pinned since T1. And it must actually be
    past: a visit cannot have been completed at a time that has not arrived.
    """
    if draft.get("visit_reported") and _is_past(validated.reserved_at):
        return "arrived"
    return "pending"


async def _commit_reservations(wa, phone: str, client_id: str, draft: dict, op,
                               actor: Optional[str], actor_id: Optional[str]) -> None:
    """Write every item in the list, in order, and report each one's real outcome. D-6.

    NO TRANSACTION, AND THAT IS THE DECISION, NOT AN OVERSIGHT (Salman, 2026-09-20): a successful
    reservation is never rolled back because a later one clashed, and Lia has no delete path with
    which to undo one anyway. What replaces the transaction is honesty — the owner is told exactly
    which names were recorded and which were not, and why.

    EVERY ITEM GOES THROUGH THE SAME GATES as a single one: its own validation, its own name→id
    resolution (done in `_advance`, before this), its own conflict check inside
    `create_reservation`, and one authorisation check that already passed for this batch in
    `_commit`. Nothing is written on a weaker path because it arrived in a list.
    """
    from app.schemas.lia_drafts import LiaReservationDraft
    done, failed, reason = [], [], ""
    for item in _all_items(draft):
        data = item.get("data") or {}
        try:
            validated = LiaReservationDraft.model_validate(data)
        except Exception as exc:
            logger.error("🔥 Lia: item failed final validation: %s", exc)
            failed.append(data.get("customer_name") or "—")
            reason = reason or _REPLIES["reservation_unclear"]
            continue
        status = _row_status(draft, validated)
        row, why = await _try_write_reservation(client_id, validated, item, status)
        if row is None:
            failed.append(validated.customer_name)
            reason = reason or why
            continue
        done.append(validated.customer_name)
        await log_security_event(
            event_type=f"lia_{actor}_{op.name}", client_id=client_id, endpoint=_ENDPOINT,
            detail={"row_id": row.get("id"), "duration_min": item.get("duration_min"),
                    "reserved_at": validated.reserved_at.isoformat(),
                    "historical": _is_past(validated.reserved_at), "status": status,
                    "batch": len(_all_items(draft)),
                    "operation": op.name, "permission": op.permission,
                    "service_key": op.service_key,
                    "sender_phone": phone, "source": "whatsapp_text"},
            actor=actor_id,
        )
        logger.info("✅ Lia: %s %s created for %s by %s %s (%s)",
                    op.name, row.get("id"), client_id, actor, actor_id, status)

    # Joined OUTSIDE the send call on purpose. `test_lia_s7.py` counts every Arabic literal that
    # reaches a `send_*`, so that a new owner-facing sentence can never slip in unnoticed; a list
    # separator is punctuation, not a message, and letting it inflate that count would make the
    # one real signal noisier for nothing.
    _sep = "، "
    if failed and done:
        await wa.send_text(phone, _REPLIES["reservation_created_partial"].format(
            done=_sep.join(done), failed=_sep.join(failed), reason=reason))
    elif failed:
        await wa.send_text(phone, reason)
    else:
        await wa.send_text(phone, _REPLIES["reservation_created_multi"])


async def _write_reservation(wa, phone: str, client_id: str, validated, item: dict,
                             status: str = "pending"):
    """Write ONE reservation through the existing service. T4, 2026-09-18.

    THE THREE KEYWORDS ARE THE WHOLE DECISION, and each one is a ratified rule rather than a
    convenience:

        allow_past            R-4 — recording the past must be ASKED FOR, never inherited.
        notify_merchant       R-3 — «حجز جديد» about yesterday is a lie to the merchant.
        enforce_working_hours R-2/T3-c — a walk-in the barber really served on his day off is a
                              fact; the schedule configured today does not get a vote on it.

    All three are True/default-preserving for a FUTURE appointment, so Lia's future path behaves
    exactly like the dashboard's own Quick Create.

    `module_key="barber"` mirrors `whatsapp_reservation_flow.py:886` literally, and is what all 52
    production reservations carry.
    """
    row, reason = await _try_write_reservation(client_id, validated, item, status)
    if row is None:
        await wa.send_text(phone, reason)
    return row


async def _try_write_reservation(client_id: str, validated, item: dict, status: str):
    """(row, None) or (None, the owner-facing reason). T5, 2026-09-20.

    SPLIT OUT OF `_write_reservation` SO A LIST CAN FAIL HONESTLY. Sending from inside the write
    was right while one message meant one reservation; with three of them it would mean three
    separate refusals arriving between successes, instead of the one explicit per-item result
    D-6 asked for. Nothing about the write itself changed -- same function, same three keywords,
    same translations.

    The reason is always one of this file's OWN controlled texts, never the exception: Salman's
    condition on T5-6 was that `{reason}` stay a controlled message and never a raw error.
    """
    from app.services import reservation_service
    past = _is_past(validated.reserved_at)
    when = validated.reserved_at.replace(tzinfo=timezone.utc)
    try:
        row = await reservation_service.create_reservation(
            client_id      = client_id,
            module_key     = "barber",
            customer_name  = validated.customer_name,
            customer_phone = validated.customer_phone,
            reserved_at    = when,
            duration_min   = item.get("duration_min"),
            notes          = validated.notes,
            metadata       = {"barber_id": item.get("barber_id"),
                              "service_id": item.get("service_id")},
            source         = "lia",
            allow_past            = past,
            notify_merchant       = not past,
            enforce_working_hours = not past,
            status                = status,
        )
        return row, None
    except ValueError as exc:
        # The service says why in a sentence meant for a developer. The owner gets the one case he
        # can act on -- a clash -- and anything else is logged rather than pasted at him.
        if "already booked" in str(exc):
            return None, _REPLIES["reservation_conflict"].format(
                barber=validated.barber_name or "الحلاق")
        logger.error("🔥 Lia: reservation refused for %s: %s", client_id, exc)
        return None, _REPLIES["reservation_unclear"]
    except Exception as exc:                                   # pragma: no cover - write failure
        logger.error("🔥 Lia: reservation write failed for %s: %s", client_id, exc)
        return None, _REPLIES["reservation_unclear"]


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
    if session is not None and not draft and session.state in _DRAFT_STATES:
        # The aged-out draft is still in the session -- `_load_draft` only stops RETURNING it --
        # so its operation is read from there, BEFORE it is cleared, to word the expiry for what
        # the owner was actually doing.
        expired_op = _stale_draft_operation(session)
        # Counted BEFORE the draft is cleared, for the same reason its operation is.
        expired_many = len((session.lia or {}).get(DRAFT_KEY, {}).get("done") or []) > 0
        session.state = "IDLE"
        _save_draft(session, None)
        logger.info("⏲  Lia: draft window expired for %s — state reset to IDLE", sender_phone)
        await wa.send_text(sender_phone,
                           _REPLIES[_per_operation(expired_op, "expired", expired_many)])
        return session

    # ── 0.1 The same guard for the family question, which has no draft. ──
    #
    # S7. `LIA_AWAITING_FAMILY` is deliberately outside STATES, so the block above cannot rescue
    # it -- and a state no branch answers is the dead conversation that guard exists to prevent.
    # It gets its own, SILENT reset: nothing was promised and nothing was lost, so announcing an
    # expiry would be noise about a question the owner has already forgotten. Returning None lets
    # the message be handled from scratch, which is also what makes the state interruptible.
    if session is not None and session.state == LIA_AWAITING_FAMILY and not _load_pending(session):
        session.state = "IDLE"
        logger.info("⏲  Lia: family question expired for %s — state reset", sender_phone)

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

    # ── 0.9 S7: the name already exists, and the owner is choosing. ──
    #
    # Before the confirmation branch, because this state has its own three answers and a draft
    # that must NOT be written until one of them is given. Nothing here writes except the
    # explicit "edit the existing one" path, which is its own registered operation.
    if draft and session is not None and session.state == LIA_AWAITING_DUP:
        dup = draft.get("dup") or {}
        if msg_type in ("button_reply", "list_reply"):
            if value == DUP_NEW_ID:
                # He meant a second, genuinely separate product with the same name. `dup_ack`
                # stops `_advance` asking again on the way back through.
                draft["dup_ack"] = True
                draft.pop("dup", None)
                logger.info("➕ Lia: %s keeps a second product named %r",
                            sender_phone, draft["data"].get("name_ar"))
                await _advance(wa, sender_phone, session, draft)
                return session
            if value == DUP_EDIT_ID:
                draft["asking"] = "dup_price"
                _save_draft(session, draft)
                session.state = LIA_AWAITING_DUP
                await wa.send_text(sender_phone, _REPLIES["dup_ask_price"])
                return session
            if value == CANCEL_ID:
                _save_draft(session, None)
                session.state = "IDLE"
                await log_security_event(
                    event_type="lia_draft_cancelled", client_id=draft.get("client_id"),
                    endpoint=_ENDPOINT, detail={"sender_phone": sender_phone, "reason": "duplicate"},
                    actor=draft.get("actor_id"),
                )
                await wa.send_text(sender_phone, _REPLIES["dup_cancelled"])
                return session

        # A typed number after "عدّل الموجود" is the new price. Anything else re-asks.
        if msg_type == "text" and draft.get("asking") == "dup_price":
            new_price = _parse_field_answer("price", value)
            if new_price is None:
                # NOT `dup_ask_price` again, and this is the whole reason `dup_price_only`
                # exists. That question names three fields -- price, name, section -- because
                # Salman kept it open for a later, independent widening. Only PRICE is built in
                # S7, so an owner who answers «الاسم» (a perfectly sensible answer to the
                # question he was asked) would be re-asked the identical question forever. This
                # branch is the one that must not loop.
                await wa.send_text(sender_phone, _REPLIES["dup_price_only"])
                return session
            await _update_existing_price(wa, sender_phone, session, draft, dup, new_price)
            return session

        # 🔴 WAS `confirm_nudge`, WHICH WAS A REAL DEFECT. That text says «اضغط ✅ ضيفها أو
        # ❌ إلغاء» -- and in THIS state the buttons on his screen are عدّل الموجود / صنف جديد /
        # إلغاء. It pointed at a button that was not there. Found by reading the texts against
        # the state that shows them, not by a test.
        await wa.send_text(sender_phone, _REPLIES["dup_nudge"])
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
                await wa.send_text(sender_phone,
                                   _REPLIES[_per_operation(_draft_operation(draft), "cancelled",
                                                           len(_all_items(draft)) > 1)])
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
            is_res_draft = _draft_operation(draft) == "create_reservation"
            # T5-5 · D-3: with a list on the screen, «خليه مع زياد» does not say whose. Naming one
            # of them targets that one; naming none (or two) is a QUESTION, never a guess.
            if is_res_draft and len(_all_items(draft)) > 1:
                target = _match_item(draft, value)
                if target is None:
                    await wa.send_text(sender_phone, _REPLIES["reservation_edit_which"])
                    return session
                _focus_item(draft, target)
            patch = await (_extract_reservation_edit(draft.get("data") or {}, value) if is_res_draft
                           else _extract_edit(draft.get("data") or {}, value))
            if patch is _UNAVAILABLE:
                # Ours, not his -- and the draft is untouched, so the two working actions are
                # offered instead of sending him to the dashboard.
                await wa.send_text(sender_phone, _REPLIES["edit_unavailable"])
                return session
            changes = patch.changes.applied() if patch is not None else {}
            if is_res_draft and changes:
                # The SERVER normalises what the model read, exactly as it does for an answered
                # field: a phone through the one phone normaliser (WALK_IN words included), a time
                # parsed to prove it is a date. Anything that does not survive is not applied.
                changes = _normalise_reservation_changes(changes)
            # R1's rule, applied to edits: for a reservation the server judges the change, so a
            # `low` grade with a readable change is not a refusal. Service/product keep the gate.
            unclear_edit = (patch is None or not changes
                            or (patch.confidence == "low" and not is_res_draft))
            if unclear_edit:
                logger.info("🤷 Lia: edit not understood for %s — asking, draft kept intact",
                            sender_phone)
                await wa.send_text(sender_phone, _REPLIES["reservation_edit_unclear" if is_res_draft else "edit_unclear"])
                return session

            # MERGED ON A COPY. A patch that passes its own validation can still be refused by
            # the draft's own contract once merged, and the owner must not lose a good draft to a
            # bad instruction -- so nothing is written back until the merge validates.
            #
            # VALIDATED AGAINST THE DRAFT'S OWN CLASS, not `LiaServiceDraft` outright: the edit
            # prompt speaks the service vocabulary, so "خلّي المدة ساعة" on a PRODUCT draft
            # produces a `duration_min` that `LiaProductDraft` simply does not have. It is dropped
            # at validation and never reaches the write, which is the correct outcome -- a product
            # has no duration column to put it in.
            _, _, merge_cls = _op_spec(_draft_operation(draft))
            merged = dict(draft.get("data") or {})
            merged.update(changes)
            try:
                merge_cls.model_validate(merged)
            except Exception as exc:
                logger.info("🚫 Lia: edit %s rejected by the draft contract (%s) — old draft kept",
                            list(changes), type(exc).__name__)
                await wa.send_text(sender_phone, _REPLIES["reservation_edit_unclear" if is_res_draft else "edit_unclear"])
                return session

            draft["data"] = merged
            # A value the owner has now SAID is no longer an automatic one.
            draft["defaulted"] = [f for f in (draft.get("defaulted") or []) if f not in changes]
            if "reserved_at" in changes:
                # He gave this one an hour himself, so it stops being a slot the server chose:
                # the item is re-settled around his value, and it keeps it.
                draft["settled"] = False
                draft["time_said"] = True
            logger.info("✏️  Lia: draft edited for %s — fields=%s", sender_phone, list(changes))
            await _advance(wa, sender_phone, session, draft)
            return session

        await wa.send_text(sender_phone, _REPLIES["confirm_nudge"])
        return session

    # ── 1.9 A barber TAPPED from the buttons (2026-09-19). ──
    # Resolved by the row id the button carries, against THIS shop's active barbers -- a stale or
    # foreign id matches nothing and the question is asked again, with the buttons.
    if (draft and session is not None and session.state == LIA_AWAITING_FIELD
            and msg_type in ("button_reply", "list_reply")
            and draft.get("asking") == "barber_name"
            and str(value or "").startswith(BARBER_PICK_PREFIX)):
        wanted = str(value)[len(BARBER_PICK_PREFIX):]
        brb = next((b for b in await _list_barbers(draft["client_id"])
                    if str(getattr(b, "id", "")) == wanted), None)
        if brb is None:
            await _ask_barber(wa, sender_phone, draft, _REPLIES["reservation_ask_barber"])
            return session
        draft["data"]["barber_name"] = brb.name
        draft["defaulted"] = [f for f in (draft.get("defaulted") or []) if f != "barber_name"]
        draft["unresolved"] = [f for f in draft.get("unresolved", []) if f != "barber_name"]
        await _advance(wa, sender_phone, session, draft)
        return session

    # ── 2. An answer to one asked field. ──
    if draft and session is not None and session.state == LIA_AWAITING_FIELD and msg_type == "text":
        field = draft.get("asking")
        # 🔴 «مبارح الساعة ٤» IS NOT PARSEABLE BY A REGEX, and pretending otherwise is how a
        # wrong date reaches a real appointment. The reservation prompt already turns relative
        # Arabic time into an ISO datetime and already knows what "now" is, so the answer goes
        # back through the SAME extractor rather than through a second, weaker parser written
        # here. Everything else stays on the cheap synchronous path.
        if field == "reserved_at":
            again = await _extract_reservation(value)
            parsed = None
            if again is not None and again is not _UNAVAILABLE:
                raw = (again.data or {}).get("reserved_at")
                if raw:
                    try:
                        # PARSED TO PROVE IT IS A DATE, STORED AS A STRING. The draft is persisted
                        # as JSONB (`_session_to_state_data` -> json.dumps), and a `datetime`
                        # object in `data` would raise there — one branch later, in a different
                        # function, with the owner's answer already lost. The draft class parses
                        # the ISO string back at validation time.
                        parsed = datetime.fromisoformat(str(raw)).isoformat()
                    except ValueError:
                        parsed = None
        else:
            parsed = _parse_field_answer(field, value)
        if parsed is None:
            # Re-asked in the DRAFT's own wording: a product must not be asked "شو اسم الخدمة؟".
            _, questions, _ = _op_spec(_draft_operation(draft))
            await wa.send_text(sender_phone, questions.get(field, "ما فهمت، جرّب مرّة تانية."))
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
    #
    # S7: this entry is reached two ways now -- a fresh message, or the ANSWER to the family
    # question. The answer carries no product details of its own ("بضاعة" is not a request), so
    # the text that gets extracted is the ORIGINAL message the owner wrote. Forgetting that is
    # exactly what made the question a dead end when it first shipped: it was asked, answered,
    # and the answer landed nowhere.
    pending = _load_pending(session) if session is not None else None
    entry_text = value
    if pending and msg_type == "text" and session is not None \
            and session.state == LIA_AWAITING_FAMILY:
        family = _parse_family_answer(value)
        if family is None:
            # INTERRUPTIBLE, at Salman's instruction. "انسى الموضوع، احجزلي موعد" must not be
            # held at a question. Drop the pending record and let the message be handled from
            # scratch -- returning None is what carries it on to the booking flow.
            _save_pending(session, None)
            session.state = "IDLE"
            logger.info("↩️  Lia: family question dropped for %s — he changed the subject",
                        sender_phone)
            return None
        entry_text = pending.get("text") or value
        _save_pending(session, None)
        logger.info("🧭 Lia: family answered %s for %s", family, sender_phone)
    else:
        family = _entry_family(value) if msg_type == "text" else None
    if family is None:
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

    # ── AMBIGUITY IS A QUESTION, and it is asked HERE -- after C and ①, before A and B. ──
    #
    # A message naming both families has no operation, so there is no `service_key` to check and
    # no permission to evaluate: A and B literally cannot run yet. Asking at this point leaks
    # nothing an owner who already passed ① does not know, and the alternative -- picking the
    # live operation because it is the live one -- would authorise `services.write` for a message
    # that may have meant a product.
    if family is _AMBIGUOUS:
        # S7: the question is now REMEMBERED. Before this it was asked and the answer had nowhere
        # to land, so the owner answered, got silence, and retyped his original message -- twice,
        # in the 2026-09-17 test. The pending record holds his original text for exactly as long
        # as a draft would.
        _save_pending(session, {"text": value,
                                "started_at": datetime.now(timezone.utc).isoformat()})
        session.state = LIA_AWAITING_FAMILY
        logger.info("🤔 Lia: family unclear for %s — asking, and remembering the request",
                    sender_phone)
        await wa.send_text(sender_phone, _REPLIES["entry_ambiguous"])
        return session

    # ── S7: an add verb with nothing to add. Mine, but empty — and answered, never ignored. ──
    #
    # Asked AFTER C and ① for the same reason every other reply is: a stranger must learn nothing
    # about what this number accepts. `F-2` in the live test was this exact shape -- four
    # messages, four silences, and an owner who could not tell whether the bot was broken or
    # deaf.
    if family is _INCOMPLETE:
        logger.info("🫱 Lia: entry had a verb and no payload from %s — guiding", sender_phone)
        await wa.send_text(sender_phone, _REPLIES["entry_incomplete"])
        return session

    # [operation] -- named by the cheap gate, which is the only place it CAN be named: D9 requires
    # the operation to be known before A and B, and A and B run before the model is called. The
    # registry is the single place that says what this operation requires; nothing below re-states
    # it. `get` has no default -- an unregistered family would refuse rather than fall back.
    op = lia_operations.get(family)
    if op is None:
        logger.error("🔥 Lia: entry gate produced unregistered family %r", family)
        return _SENTINEL

    # A AND B, from that definition.
    allowed, why = await _authorise_operation(client_id, user, op)
    if not allowed:
        if why == "capability_inactive":
            # THE SENTENCE NOW FOLLOWS THE OPERATION'S OWN KEY, which it did not before: this
            # branch said "خدمة الحجوزات مش مفعّلة" for every operation, and that is true for
            # `create_service` (its `service_key` IS `reservations`) and FALSE for
            # `create_product`, whose key is `store`. Both texts live in app/prompts/lia.md.
            await wa.send_text(
                sender_phone,
                _REPLIES["store_inactive"] if op.service_key == "store"
                # Moved out of this module on 2026-09-18 (T4 touches this branch, so the rule
                # «كل رسالة تُنقَل حين يلمسها تغيير حقيقي» applies): same sentence, now a key.
                else _REPLIES["reservations_inactive"],
            )
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

    # The PROMPT follows the operation, and so does the contract that validates the answer. A
    # product prompt whose answer claims `create_service` fails `LiaProductExtraction` and lands
    # in the "did not understand" branch -- the operation authorised above and the operation the
    # model names cannot come apart.
    is_product     = op.name == "create_product"
    is_reservation = op.name == "create_reservation"
    extraction = await (
        _extract_reservation(entry_text) if is_reservation else
        _extract_product(entry_text) if is_product else
        _extract(entry_text)
    )
    if extraction is _UNAVAILABLE:
        # Our fault, said as our fault. And the dashboard still works, so the owner is not stuck.
        logger.error("🔥 Lia: unavailable for %s at %s — owner told, not blamed",
                     sender_phone, client_id)
        await wa.send_text(
            sender_phone,
            "المساعد مش متوفّر هلق 🔧 ضيف الخدمة من اللوحة، وأنا رح كون جاهز بعدين.",
        )
        return session
    # 🔴 R1 (2026-09-19, Salman's decision): FOR A RESERVATION, THE SERVER JUDGES THE JSON -- NOT
    # THE MODEL'S GRADE OF ITSELF. Measured live twice on d3d6785 (R0): the model read «سجل موعد
    # لأحمد مبارح الساعة 4 شعر مع سامي» completely and correctly -- name, yesterday 16:00, service,
    # barber -- and still said `low`, because only the phone was missing. The prompt gives no such
    # reason for `low`, and obeying it here, BEFORE `_advance` looks at anything, turned "one field
    # missing" into «ما فهمت» and no draft, every time.
    #
    # So a schema-valid reservation always opens a draft: `_advance` asks for whatever is missing
    # (a missing or unreadable time included), `LiaReservationDraft` validates the values,
    # `_resolve_reservation_rows` checks the names against this shop's real rows, and nothing is
    # written until the owner presses ✅ on a preview that shows exactly what will be stored.
    # `confidence` still travels -- into the lia_draft_opened audit row -- as information, not a
    # gate. Service and product keep the old gate; widening this is a separate decision.
    unclear = extraction is None or (extraction.confidence == "low" and not is_reservation)
    if unclear:
        await wa.send_text(
            sender_phone,
            _REPLIES["reservation_unclear"] if is_reservation else
            _REPLIES["product_unclear"] if is_product else
            "ما فهمت تماماً 😅 اكتبها هيك مثلاً:\n«ضيف خدمة كيراتين، 25 دولار، ساعة»",
        )
        return session

    # A RESERVATION HAS NO CATEGORY. The service and the product both live on a shelf; an
    # appointment does not, and its two real references (barber, service) are resolved AFTER the
    # owner has answered the questions, in `_advance` -- because at this point the names he owes
    # may still be missing entirely.
    if is_reservation:
        category_id, cats, category_name = None, [], "—"
    elif is_product:
        category_id, cats = await _resolve_store_category(client_id)
        if not category_id:
            if len(cats) > 1:
                names = " · ".join(c.nameAr for c in cats)
                await wa.send_text(
                    sender_phone,
                    f"عندك أكتر من قسم بضاعة ({names}). ضيفه من اللوحة هالمرّة، "
                    f"أو خبّرني بأي قسم.",
                )
            else:
                await wa.send_text(sender_phone, _REPLIES["product_no_category"])
            return session
        category_name = next((c.nameAr for c in cats if c.id == category_id), "—")
    else:
        category_id, cats = await _resolve_service_category(client_id)
        if not category_id:
            names = " · ".join(c.nameAr for c in cats) if cats else "—"
            await wa.send_text(
                sender_phone,
                f"عندك أكتر من فئة ({names}). أضف الخدمة من اللوحة هالمرّة، أو خبّرني بأي فئة.",
            )
            return session
        category_name = next((c.nameAr for c in cats if c.id == category_id), "—")

    # FILTERED TO THE FIELDS THE DRAFT'S OWN CLASS OWNS, and that is not tidiness -- it closes a
    # real livelock. `data` is a free dict on both extraction contracts (`extra="forbid"` guards
    # the top-level keys, not what is inside `data`), so a product model could still put
    # `duration_min` in there. `_advance` would then fail validation on a field that has no
    # question, fall back to re-asking `price`, and re-fail forever. Nothing unknown enters the
    # draft, so that cannot happen.
    _, _, draft_cls = _op_spec(op.name)
    known = set(draft_cls.model_fields)
    # `time_said` is a real part of the reservation contract (T5) that is deliberately NOT a draft
    # field -- it says how `reserved_at` was arrived at, not what it is. Naming it here keeps it
    # out of the "dropped, not a field of" warning, which is for surprises.
    carried = known | ({"time_said"} if op.name == "create_reservation" else set())
    dropped = [k for k in (extraction.data or {}) if k not in carried]
    if dropped:
        logger.info("🧹 Lia: dropped %s from a %s extraction — not fields of %s",
                    dropped, op.name, draft_cls.__name__)

    draft = {
        # `operation` is the authoritative key from S3 on. `intent` is kept beside it, carrying
        # the same value, because a draft written by the previous deploy has only `intent` and
        # `_draft_operation` reads both -- so a deploy mid-conversation costs nobody his draft.
        "operation":     op.name,
        "intent":        extraction.intent,
        "data":          _clean_item(extraction.data, known),
        "unresolved":    list(extraction.unresolved or []),
        "client_id":     client_id,
        "actor":         actor,
        "actor_id":      actor_id,
        # 2026-09-19: the TALKING account's own barber row, for the default barber. Read from the
        # user row already resolved above -- no second lookup, and never matched by name.
        "actor_barber_id": getattr(user, "barberId", None),
        # The first word of the talking account's name, for the one greeting (2026-09-19).
        "actor_name": ((getattr(user, "fullName", None) or "").split() or [""])[0],
        "category_id":   category_id,
        "category_name": category_name,
        "started_at":    datetime.now(timezone.utc).isoformat(),
        "asking":        None,
    }
    if op.name == "create_reservation":
        # T5 slice 1: the queue is BUILT here and consumed later. `data` stays the item being
        # completed -- every existing reader (`_advance`, `_resolve_reservation_rows`, the
        # preview, `_commit`, `_parse_field_answer`) goes on reading exactly what it read
        # before -- and the rest wait their turn, in the order he said them.
        draft["time_said"] = bool((extraction.data or {}).get("time_said", True))
        # D-2: the EVIDENCE for `arrived`, captured from the sentence that opened the draft --
        # never from the date, and never from the model. Read here, where the owner's own words
        # are still in hand, and used at write time. `entry_text` rather than `value` so that a
        # message resumed after the family question is still judged by what he originally wrote.
        draft["visit_reported"] = _has_visit_verb(entry_text)
        draft["done"] = []
        draft["rest"] = [
            {"data": _clean_item(item, known),
             "time_said": bool((item or {}).get("time_said", True))}
            for item in (getattr(extraction, "extra", None) or [])[:_MAX_ITEMS - 1]
        ]
    await log_security_event(
        event_type="lia_draft_opened", client_id=client_id, endpoint=_ENDPOINT,
        detail={"intent": extraction.intent, "operation": op.name,
                "confidence": extraction.confidence, "items": 1 + len(draft.get("rest") or []),
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

    WHICH fields are required now comes from the draft's operation (`_op_spec`) instead of being
    written into this loop, so a product is never asked how long it takes.
    """
    required, questions, draft_cls = _op_spec(_draft_operation(draft))

    if _draft_operation(draft) == "create_reservation":
        await _apply_reservation_defaults(draft)

    for field in required:
        if draft["data"].get(field) in (None, "", []):
            draft["asking"] = field
            greeting = _take_greeting(draft)
            lead = _item_lead(draft)
            _save_draft(session, draft)
            session.state = LIA_AWAITING_FIELD
            if field == "barber_name" and _draft_operation(draft) == "create_reservation":
                await _ask_barber(wa, phone, draft, greeting + lead + questions[field])
            else:
                await wa.send_text(phone, greeting + lead + questions[field])
            return

    try:
        draft_cls.model_validate(draft["data"])
    except Exception as exc:
        # A value present but invalid (a negative price, a 37-minute duration) is re-asked rather
        # than silently corrected -- correcting it would put a number in the row the owner never
        # said.
        bad = None
        for err in getattr(exc, "errors", lambda: [])():
            loc = err.get("loc") or ()
            if loc and loc[0] in questions:
                bad = loc[0]
                break
        field = bad or "price"
        draft["data"].pop(field, None)
        draft["asking"] = field
        _save_draft(session, draft)
        session.state = LIA_AWAITING_FIELD
        await wa.send_text(phone, "هالقيمة ما زبطت. " + questions[field])
        return

    draft["asking"] = None

    # ── S7: an existing name becomes a QUESTION, and this is the one right place to ask it. ──
    #
    # HERE, not at entry and not at commit. At entry the name may still be missing (it can arrive
    # in `unresolved` and be asked for), so there would be nothing to compare. At commit the draft
    # has already been consumed by design, so offering "edit the existing one" would mean writing
    # a draft back after consuming it -- and the consume-before-write rule is what stops a double
    # tap creating two rows. At this point every required field is filled and the draft is still
    # held, which is exactly what the question needs.
    # T4: names -> ids, and a name that matches nothing is asked again with the real list. Placed
    # exactly where the duplicate question is, and for the same reason: every required field is
    # filled and the draft is still held, so a refusal here costs nothing and writes nothing.
    if _draft_operation(draft) == "create_reservation":
        if not await _resolve_reservation_rows(wa, phone, session, draft):
            return
        # The item is complete: it has its ids and, with them, the service's real duration. Give
        # it its wall clock, then hand the conversation to the next name he said. RECURSION, not a
        # loop, because the next item may itself be missing a field -- and then this function has
        # to do exactly what it does for a first item: ask, and come back when he answers.
        _settle_item(draft)
        if draft.get("rest"):
            _next_item(draft)
            _save_draft(session, draft)
            await _advance(wa, phone, session, draft)
            return

    if _draft_operation(draft) == "create_product" and not draft.get("dup_ack"):
        existing = await _find_existing_product(draft["client_id"], draft["data"]["name_ar"])
        if existing:
            draft["dup"] = {"id": existing["id"], "price": existing.get("price"),
                            "currency": existing.get("currency") or "USD",
                            "category": existing.get("category_name") or "—"}
            _save_draft(session, draft)
            session.state = LIA_AWAITING_DUP
            # F-C1 (Gate ①, 2026-09-18). WAS `draft["data"]["name_ar"]` -- what the OWNER typed,
            # as the model extracted it. The real read on production showed «مشط خشب » quoted
            # back with his trailing space, and «ماكينه حلاقه» would be quoted in HIS spelling
            # while the row on his shelf is spelled «ماكينة حلاقة». This message exists to tell
            # him what the system FOUND, so the stored row's own name is the only correct
            # reference. The fold that matched them is deliberately not shown to him.
            await wa.send_text(phone, _REPLIES["dup_found"].format(
                name=existing.get("name_ar") or draft["data"]["name_ar"],
                price=existing.get("price"),
                currency=existing.get("currency") or "USD",
                category=existing.get("category_name") or "—"))
            await wa.send_interactive_buttons(
                to=phone,
                # F-C2 (Gate ①, 2026-09-18). This was an Arabic owner-facing string living in a
                # service module -- a SECOND WhatsApp message, invisible to the text review
                # because it was not a key. Moved verbatim: "انقل ولا تُحسِّن". Re-wording it is
                # a separate decision, and it now has to pass the same gate as every other text.
                text=_REPLIES["dup_choose"],
                buttons=[
                    {"type": "reply", "reply": {"id": DUP_EDIT_ID, "title": "✏️ عدّل الموجود"}},
                    {"type": "reply", "reply": {"id": DUP_NEW_ID,  "title": "➕ صنف جديد"}},
                    {"type": "reply", "reply": {"id": CANCEL_ID,   "title": "❌ إلغاء"}},
                ],
            )
            return

    greeting = _take_greeting(draft)
    _save_draft(session, draft)
    session.state = LIA_AWAITING_CONFIRM
    await _send_preview(wa, phone, draft, greeting)
