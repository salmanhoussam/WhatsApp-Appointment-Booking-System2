"""Canonical phone-number handling for the whole platform.

Established 2026-09-08, Salman's explicit decision, from a real production failure: a staff member
(جعفر at `rk`) was invited on 2026-09-07 and never received his WhatsApp setup link. His number was
stored as `70764479` — a Lebanese local number with no country code — and
`whatsapp_service.send_text()` passes `to` straight to Meta's Cloud API, which requires a full
international number. The send failed, `send_staff_setup_link()` swallowed the exception by design
("never raises"), and the owner was told the invite was sent. Six days later the account still had
no password and had never logged in.

THE RULE, in Salman's words:

    Storage is always WITH the country code. Entry is always WITHOUT it — the UI puts a country
    selector in front of the field, defaulting to Lebanon.

So this module is the one place that turns what a human typed into what the database stores.

WHY THIS IS NOT THE SAME AS `user_repo.normalize_local_phone`. That function (2026-08-29, also
Salman's decision) exists for LOGIN MATCHING: it strips the country code so "+96176985477",
"96176985477" and "76985477" all resolve to one account. The two rules are complements, not
rivals — one governs how a number is STORED, the other how it is MATCHED on read. Storing with the
country code stays fully loginable precisely because that function strips it again. Live proof:
`rkbarber@dev.invalid` is stored `96176985477` and logs in successfully.
"""

import re

# Lebanon. The default because every live tenant today is Lebanese; the UI's country selector is
# what makes this a default rather than an assumption.
DEFAULT_COUNTRY_CODE = "961"

# Country codes the selector offers. Kept here, beside the normaliser, so the two can never
# disagree about what a valid prefix is.
SUPPORTED_COUNTRY_CODES = ("961", "966", "971", "970", "962", "20", "965", "974", "973", "968")

# A Lebanese mobile/landline national number is 7-8 digits. Used only to decide whether a bare
# number still needs a country code prefixed, never to reject input.
_MAX_NATIONAL_LEN = 9


def normalize_for_storage(phone: str | None, country_code: str = DEFAULT_COUNTRY_CODE) -> str | None:
    """Return the number as it must be STORED and SENT: digits only, country code included.

    Accepts anything a human or an older row might carry — "+961 70 764 479", "0096170764479",
    "70764479", "070764479" — and returns "96170764479".

    Returns None for empty input, so an optional field stays optional; never raises, so a write
    path cannot fail because someone typed a space.
    """
    if not phone:
        return None

    digits = re.sub(r"\D", "", phone)
    if not digits:
        return None

    # "00" international prefix -> drop it; what follows already carries a country code.
    if digits.startswith("00"):
        digits = digits[2:]

    # Already carries a known country code -> keep as-is. Checked longest-first so "971" is not
    # mistaken for "97" + national digits.
    for cc in sorted(SUPPORTED_COUNTRY_CODES, key=len, reverse=True):
        if digits.startswith(cc) and len(digits) > len(cc):
            return digits

    # A national number written with a trunk "0" ("070764479") -> drop the trunk prefix before
    # prefixing the country code, otherwise the result carries a zero Meta will reject.
    if digits.startswith("0"):
        digits = digits.lstrip("0")

    if not digits:
        return None

    # Short enough to be a national number -> prefix the country code.
    if len(digits) <= _MAX_NATIONAL_LEN:
        return f"{country_code}{digits}"

    # Longer than any national number and matching no known code: return the digits unchanged
    # rather than corrupting a number from a country not in the list above.
    return digits


def split_for_display(phone: str | None) -> tuple[str, str]:
    """Inverse of the above, for prefilling an edit form: ("961", "70764479").

    Falls back to the default country code when the stored value carries none, so an old row
    written before this rule existed still renders correctly in the new UI.
    """
    if not phone:
        return DEFAULT_COUNTRY_CODE, ""
    digits = re.sub(r"\D", "", phone)
    for cc in sorted(SUPPORTED_COUNTRY_CODES, key=len, reverse=True):
        if digits.startswith(cc) and len(digits) > len(cc):
            return cc, digits[len(cc):]
    return DEFAULT_COUNTRY_CODE, digits
