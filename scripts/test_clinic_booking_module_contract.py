"""ق-٥-ب — the server resolves `booking_module`, and the page is told rather than left to guess.

Run:  venv/bin/python scripts/test_clinic_booking_module_contract.py

WHAT THIS PROVES

    ق-٥-ب (Salman, 2026-09-27), option (أ): `Client.vertical` -> VERTICAL_REGISTRY ->
    `booking_module` -> /config -> the frontend -> `ReservationIn.module_key`. The raw vertical
    NEVER reaches an Interface; the resolved answer does. Contract:
    .claudedocs/implementation/CLINIC_Q5B_BOOKING_MODULE_CONTRACT.md

    And `vertical = NULL` resolves to `null` — never coerced to "barber" (Salman, same day):
    "هيدا بيحوّل قيمة مجهولة إلى افتراض business meaning، وبيخلق silent compatibility".

    🔴 T-ب-١ is the assertion that carries the weight, and it is deliberately NOT "the dict says
    clinic". A declared `booking_module` is only real if the CREATE PATH actually treats it that
    way, so each one is measured by a DIFFERENTIATED OUTCOME from one identical input:

        eligible=False + module_key='clinic'  ->  REFUSED, RESOURCE_SERVICE_MISMATCH
        eligible=False + module_key='barber'  ->  CREATED

    Same input, two module keys, two different real code paths. A `booking_module` the engine has
    no branch for cannot produce that difference, which is what makes the gate meaningful rather
    than tautological — the failure mode it exists to catch is a Registry entry that NAMES a module
    the reservation engine never heard of, which would silently skip resource validation.

    🔴 And the set of declared modules must EQUAL the set with a written expectation. So adding a
    vertical without proving its module is wired FAILS this suite on purpose. That is the whole
    point: the next vertical cannot be declared and left unproven.

DEFERRED, AND SAID OUT LOUD
    T-ب-٦ of the contract ("`module_key:'barber'` stops being a literal in the hook") is NOT
    asserted here, because it cannot be: consuming `booking_module` in useReservationBooking IS
    P5-D ("resolver داخلَ الهوك"), and P5-D is not authorized. The contract listed that gate under
    §5 while §6 excluded every frontend line — a real inconsistency in the contract, recorded
    rather than quietly resolved by expanding scope. It moves to P5-D's gates.

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES, NO PRODUCTION, NO TENANT.
"""
import asyncio
import io
import logging
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.verticals import (                                           # noqa: E402
    VERTICAL_REGISTRY, resolve_booking_module,
)
from app.services.public_service import _record_to_dict                    # noqa: E402
from test_clinic_public_booking_contract import book                       # noqa: E402

ok = True


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


class FakeRecord:
    """Only the fields `_record_to_dict` reads. Nothing is faked kinder than reality: every
    attribute a real Client row carries for this payload is present, so a missing key in the
    result is a real missing key."""
    def __init__(self, vertical=None, slug="t"):
        self.slug = slug
        self.name = "N"
        self.name_ar = self.name_en = self.primary_color = None
        self.whatsapp_number = self.instagram_url = self.maps_url = self.email = None
        self.currency = "USD"
        self.features = {}
        self.config = {}
        self.unit_types = []
        self.payment_methods = []
        self.service_type = None
        self.pageType = "normal"
        self.templateKey = None
        self.clientServices = []
        self.vertical = vertical


# The payload BEFORE ق-٥-ب — the 17 keys `_record_to_dict` returned at commit 324b042. Written out
# rather than computed, so T-ب-٣ compares against a fixed record instead of against itself.
KEYS_BEFORE = {
    "slug", "name_ar", "name_en", "primary_color", "whatsapp_number", "instagram_url",
    "maps_url", "email", "currency", "features", "config", "unit_types", "payment_methods",
    "service_type", "active_services", "page_type", "template_key",
}

# Every declared booking_module needs a real, differentiated expectation here. `refuses_ineligible`
# means: this module is resource-backed, so an ineligible resource MUST be refused.
EXPECTATIONS = {
    "barber": {"refuses_ineligible": False, "metadata": {"barber_id": "brb-1", "service_id": "svc-1"}},
    "clinic": {"refuses_ineligible": True,  "metadata": {"resource_id": "res-1", "service_id": "svc-1"}},
}


async def main():
    print("\n── ق-٥-ب · booking_module — server-resolved ─────────────────────────────────────")

    # ── T-ب-١ · the declared module is one the CREATE PATH really branches on ────────────────
    declared = {v: e.get("booking_module") for v, e in VERTICAL_REGISTRY.items()}
    # ── T-ب-١a · TRANSITION, 2026-09-30 (Salman) ─────────────────────────────────────────
    # WAS: `all(declared.values())` — "every Registry entry declares a booking_module", i.e. every
    # value must be TRUTHY. That assertion was correct for the world it was written in: the
    # Registry held exactly two verticals, barber and clinic, and BOTH book someone — barber books
    # a `Barber`, clinic books a `Resource`.
    #
    # CHANGED because `restaurant` was registered 2026-09-30 and a restaurant books NOBODY. Its
    # `booking_module` is None on purpose: ق-٥-ب §7-ب already ratifies what the frontend does when
    # booking_module is null, so declaring None opens no engine and invents no behaviour. Keeping
    # the truthy requirement would have meant inventing a restaurant booking module to satisfy a
    # test — the test dictating the product, exactly backwards.
    #
    # WHAT THE OLD ASSERTION PROTECTED, and what this one still protects: that the KEY is never
    # silently forgotten. A MISSING key and a DELIBERATE None are different facts and only the
    # first is a bug. T-ب-١b below is unchanged and still proves every non-None value is one the
    # create path really branches on, so a declared module can never be a word nobody wired.
    present = {v: ("booking_module" in e) for v, e in VERTICAL_REGISTRY.items()}
    check("T-ب-١a  every Registry entry CARRIES the booking_module key — an explicit None is a "
          "declaration (a restaurant books nobody), a MISSING key is the defect this guards. "
          "Was: every value must be truthy — true while both verticals booked someone",
          all(present.values()), repr(present))
    check("T-ب-١a2  and a None is spelled None — never omitted, and never a falsy stand-in ('' or "
          "0), which would pass as 'no module' while being a typo",
          all(e["booking_module"] is None
              or (isinstance(e["booking_module"], str) and e["booking_module"])
              for e in VERTICAL_REGISTRY.values()),
          repr(declared))
    check("T-ب-١b  and the declared set EQUALS the set with a written expectation — a new vertical "
          "cannot be declared without proving its module is wired",
          set(v for v in declared.values() if v) == set(EXPECTATIONS),
          f"declared={sorted(x for x in declared.values() if x)} "
          f"expected={sorted(EXPECTATIONS)}")

    for module, exp in sorted(EXPECTATIONS.items()):
        exc, row, _store, _p = await book(module_key=module, eligible=False,
                                          metadata=exp["metadata"])
        refused = exc is not None
        code = getattr(exc, "error_code", None)
        if exp["refuses_ineligible"]:
            check(f"T-ب-١c  '{module}' is resource-backed: an INELIGIBLE resource is refused, with "
                  f"its own code",
                  refused and code == "RESOURCE_SERVICE_MISMATCH",
                  f"{type(exc).__name__ if exc else 'created'} code={code}")
        else:
            check(f"T-ب-١c  '{module}' is NOT resource-backed: the same ineligible input is "
                  f"CREATED, so the difference is the module key and nothing else",
                  not refused and row is not None,
                  f"{type(exc).__name__ if exc else 'created'}")

    # ── T-ب-٢ · null means two things in the server, and only one of them is a defect ────────
    check("T-ب-٢a  vertical=None            -> booking_module is null",
          resolve_booking_module(None) is None)
    check("T-ب-٢b  vertical set, registered  -> the declared value",
          resolve_booking_module("clinic") == "clinic" and resolve_booking_module("barber") == "barber")
    check("T-ب-٢c  vertical set, UNregistered -> null (not an exception, not a guess)",
          resolve_booking_module("clnic") is None)

    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setLevel(logging.WARNING)
    log = logging.getLogger("app.services.public_service")
    log.addHandler(handler)
    prev = log.level
    log.setLevel(logging.WARNING)
    try:
        null_payload = _record_to_dict(FakeRecord(vertical=None, slug="smar"))
        quiet = stream.getvalue()
        typo_payload = _record_to_dict(FakeRecord(vertical="clnic", slug="typo-tenant"))
        noisy = stream.getvalue()
    finally:
        log.removeHandler(handler)
        log.setLevel(prev)

    check("T-ب-٢d  a NULL vertical is SILENT — it is the real state of 5 of 9 client rows, not an "
          "error, and logging it would be noise",
          quiet == "" and null_payload["booking_module"] is None, repr(quiet[:60]))
    check("T-ب-٢e  🔴 but a SET-yet-unregistered vertical logs a WARNING naming the slug and the "
          "value — the two null causes are not conflated, which is the bug this decision exists "
          "to stop reproducing",
          "typo-tenant" in noisy and "clnic" in noisy
          and typo_payload["booking_module"] is None,
          repr(noisy[len(quiet):][:70]))

    # ── T-ب-٣ · the payload grew by exactly one key, and NOT by `vertical` ───────────────────
    keys = set(_record_to_dict(FakeRecord(vertical="clinic")))
    check("T-ب-٣a  /config gained EXACTLY one key, and it is booking_module",
          keys - KEYS_BEFORE == {"booking_module"}, repr(sorted(keys - KEYS_BEFORE)))
    check("T-ب-٣b  and lost none (positive control — the 17 that were there are all still there)",
          KEYS_BEFORE - keys == set(), repr(sorted(KEYS_BEFORE - keys)))
    check("T-ب-٣c  🔴 `vertical` is NOT in the payload — the rejected half of the decision, "
          "asserted so it cannot be added later by reflex",
          "vertical" not in keys)

    # ── T-ب-٥ · the frontend never learns a TENANT's OWN vertical ───────────────────────────
    # 🔴 The direction is the whole point, and getting this filter wrong is how the investigation's
    # own C-2 finding came out overstated. `frontend/src/config/template-registry.js` DOES carry a
    # `vertical` field on all 20 signup templates (19 null, 1 'barber'), and that is OUTBOUND and
    # legitimate: it means "create the new tenant AS this vertical", read only by the signup form
    # and sent to the backend. ق-٥-ب governs the INBOUND direction — what the backend tells a page
    # about the tenant it is already rendering — and there the answer is the resolved
    # booking_module, never the raw vertical. Two directions, two moments; only one is asserted
    # absent here.
    #
    # The first version of this filter also matched `? 'vertical' : undefined` — a TERNARY colon in
    # ReservePage.jsx:55's `resize:` — and reported a data read that does not exist. The regex was
    # the defect, not the code, so the regex was narrowed rather than the assertion softened.
    hits = subprocess.run(
        ["grep", "-rn", "vertical", "frontend/src/"], capture_output=True, text=True).stdout
    # Three precise shapes an inbound read would actually take. A bare `vertical =` is NOT one of
    # them: that also matches recharts' `vertical={false}` JSX prop (OverviewTab.jsx:278) and the
    # legitimate OUTBOUND `const vertical = template?.vertical` in the signup form — two more false
    # positives the broader pattern reported before this was narrowed. A filter that flags allowed
    # code is not a stricter gate, it is a broken one.
    INBOUND = re.compile(
        r"config\s*\??\.\s*vertical\b"            # config.vertical / config?.vertical
        r"|\bdata\s*\??\.\s*vertical\b"          # data.vertical
        r"|\{[^}]*\bvertical\b[^}]*\}\s*="         # const { vertical } = <something>
    )
    inbound = [ln for ln in hits.splitlines() if INBOUND.search(ln)]
    check("T-ب-٥a  zero INBOUND reads of a tenant's own `vertical` in frontend/src — the page is "
          "never handed the raw vertical, only the resolved booking_module",
          inbound == [], f"{len(inbound)} found: {inbound[:2]}")

    reg = open("frontend/src/config/template-registry.js", encoding="utf-8").read()
    tr = subprocess.run(["grep", "-rln", r"template?\.vertical\|template\.vertical",
                         "frontend/src/"], capture_output=True, text=True).stdout.split()
    check("T-ب-٥c  and the OUTBOUND signup vertical is untouched: 20 template entries still declare "
          "one, and the signup form is still its only reader — this decision did not disturb the "
          "direction that already worked",
          reg.count("vertical:") == 20
          and tr == ["frontend/src/pages/auth/TenantRegisterPage.jsx"],
          f"{reg.count('vertical:')} entries, readers={tr}")
    bm = subprocess.run(
        ["grep", "-rn", "booking_module", "frontend/src/"], capture_output=True, text=True).stdout
    check("T-ب-٥b  and DEFAULT_CONFIG declares booking_module explicitly, so a FAILED config "
          "request cannot silently mean 'barber'",
          "useTenantConfig.js" in bm and "booking_module:  null" in bm)

    # ── The contract amendment is on the record, not merely performed ────────────────────────
    src = open("app/core/verticals.py", encoding="utf-8").read()
    check("T-ب-٢f  verticals.py's own ALLOWED whitelist was AMENDED to name booking_module — the "
          "4th field in an explicit list of 3 was approved (ق-ب-٢), not quietly stretched",
          "booking_module (str | None)" in src and "ALLOWED:" in src)
    check("T-ب-٢g  and the clinic entry carries exactly what the ratified tenant contract §2 says: "
          "`reservations` only, Resource-backed, no page_template invented",
          VERTICAL_REGISTRY["clinic"]["default_services"] == ["reservations"]
          and VERTICAL_REGISTRY["clinic"]["staff_backing_model"] == "Resource"
          and VERTICAL_REGISTRY["clinic"]["page_template"] is None)

    print("\nALL GREEN" if ok else "\nFAILURES ABOVE")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
