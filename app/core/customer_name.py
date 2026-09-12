"""
Customer names — the one place a typed name is judged before it becomes an identity.

Established 2026-09-12, Salman's decision, from a trap he set deliberately on production: he
booked through the WhatsApp bot and typed a profanity as the customer name. It was accepted,
written to `Reservation.customerName`, AND written to `Customer.name` -- which is the identity
`whatsapp_reservation_flow.start()` greets by, so the bot would have opened that person's next
conversation with "أهلاً بعودتك <profanity>", and the merchant sees it in his alert and dashboard.

THE THIRD TIME THIS EXACT HOLE BIT, which is why it gets its own module rather than an inline
check:

    1. A diagnostic label I used while testing -- "سلمان — فحص A2" -- became his stored identity
       at `barberlab-test`, and the bot greeted him with it (fixed by a one-off script).
    2. `WHATSAPP_PLACEHOLDER_NAME` = "زبون واتساب" is still the stored name on web-handoff rows.
    3. This one.

The only validation that existed was `len(value.strip()) >= 2`.

WHY THIS FILE AND NOT AN INLINE GUARD. Same reasoning as `app/core/phone.py`, and the same shape:
one canonical function, called at the boundary, so a second entry point cannot drift. The web
booking route is a second such boundary and is NOT yet wired to this -- named here rather than
silently assumed covered.

WHAT IS DELIBERATELY NOT CLAIMED. A blocklist is never complete, and pretending otherwise is the
real risk. Three things keep that honest:

  * The shape rules below (length, letters, no URLs) are objective and catch the accidental junk.
  * The blocklist catches the obvious deliberate junk, and no more than that.
  * Every refusal is logged with the raw value, so the list grows from real evidence instead of
    from guessing what people might type. That log is the point: it is how we find out what the
    list is missing, rather than assuming it is complete.

And the merchant can always edit a name from the dashboard, which is the real backstop.
"""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

MIN_LEN = 2
MAX_LEN = 40

# Arabic block + Latin. `\w` would accept digits and underscores, which is exactly what
# "at least two ALPHABETIC characters" is meant to exclude.
_LETTER = re.compile(r"[A-Za-z؀-ۿݐ-ݿ]")

# A name is never a link or an address. Checked as substrings on purpose -- "a.b@c" has no
# whitespace to tokenise on.
_LINKISH = ("@", "http", "www.", "://", ".com", ".net", ".org", "t.me", "wa.me")

# Franco-Arabic digit substitutions, so "3ars" and "عرص" are judged by the same list. Applied
# ONLY for blocklist matching -- never to the name we store, which keeps exactly what was typed.
_FRANCO = {"2": "a", "3": "a", "5": "kh", "6": "t", "7": "h", "8": "gh", "9": "q"}

# Deliberately short, and every entry is here because it is a real insult in Lebanese/Levantine
# usage rather than because it could theoretically offend. Matched as WHOLE TOKENS, so a name
# that merely contains these letters ("Kassem", "Zein") is unaffected -- substring matching here
# would reject real names, which is a worse failure than letting one insult through.
_BLOCKED_TOKENS = frozenset({
    # Arabic
    "كس", "كسم", "كسمك", "عرص", "شرموط", "شرموطة", "منيك", "منيوك", "زب", "طيز", "خرا", "خره",
    "متناك", "لبوة", "قحبة", "قحبه",
    # Franco-Arabic, already digit-folded by _fold()
    "kes", "kis", "ks", "ksm", "ksmk", "amk", "omak", "ommak", "ars", "aars",
    "sharmout", "sharmouta", "mnyak", "manyouk", "zeb", "tiz", "khara", "ahbe", "kahba",
})


def _fold(value: str) -> str:
    """Lowercase and fold franco-Arabic digits, for blocklist matching only."""
    out = value.lower()
    for digit, letter in _FRANCO.items():
        out = out.replace(digit, letter)
    return out


def clean_customer_name(raw: Optional[str]) -> Optional[str]:
    """Return the name to store, or None when it must be refused.

    Never raises: a booking flow asking "ما اسمك الكريم؟" must be able to judge any byte sequence
    a phone keyboard can produce, and answer by re-asking rather than by crashing.

    The returned value has its whitespace collapsed but is otherwise EXACTLY what was typed --
    including case, punctuation and diacritics. Normalising a person's own name beyond whitespace
    is not this function's business; deciding whether to accept it is.
    """
    if not raw or not isinstance(raw, str):
        return None

    # Collapse every run of whitespace (including the newlines a pasted message carries) to one
    # space, so "  ابو   سلو \n" and "ابو سلو" are the same name.
    name = re.sub(r"\s+", " ", raw).strip()

    if not (MIN_LEN <= len(name) <= MAX_LEN):
        return None

    # "At least two alphabetic characters" also settles "digits only", "....", and a lone emoji
    # in one rule instead of three overlapping ones.
    if len(_LETTER.findall(name)) < 2:
        return None

    lowered = name.lower()
    if any(marker in lowered for marker in _LINKISH):
        return None

    folded = _fold(name)
    tokens = set(re.split(r"[^0-9a-z؀-ۿݐ-ݿ]+", folded)) - {""}
    if tokens & _BLOCKED_TOKENS:
        return None

    return name


def reject_reason(raw: Optional[str]) -> str:
    """WHY a name was refused — for the log only, never shown to the customer.

    The customer always gets the same neutral sentence: telling someone which rule their input
    tripped is either useless ("too short") or an invitation to probe the blocklist.
    """
    if not raw or not isinstance(raw, str):
        return "empty"
    name = re.sub(r"\s+", " ", raw).strip()
    if len(name) < MIN_LEN:
        return "too_short"
    if len(name) > MAX_LEN:
        return "too_long"
    if len(_LETTER.findall(name)) < 2:
        return "not_enough_letters"
    if any(marker in name.lower() for marker in _LINKISH):
        return "looks_like_a_link"
    folded = _fold(name)
    tokens = set(re.split(r"[^0-9a-z؀-ۿݐ-ݿ]+", folded)) - {""}
    if tokens & _BLOCKED_TOKENS:
        return "blocked_word"
    return "accepted"
