"""Narrow tests for the two measured defects in `_match_service_by_text`, and for the behaviour
that must NOT change while fixing them.

Run:  venv/bin/python scripts/test_reservation_text_matcher.py

The service dicts are shaped exactly like `catalog_service_service._fmt()` output, carrying the
real `nameAr`/`nameEn` values read from the production rows of `barberlab-test` and `rk` on
2026-09-13. This matters: a fixture invented to suit the matcher would prove only that the
fixture suits the matcher. `rk` in particular sells "شعر" as nameEn "Hair" AND "شعر ودقن" as
nameEn "Haircut" -- "Hair" is a substring of "Haircut" -- and three of its six services have no
English name at all. Those are the cases that constrain the design.

Nothing here touches a database, sends a message, or writes anything.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.whatsapp_reservation_flow import (      # noqa: E402
    _canon_tokens,
    _match_service_by_text,
)


def _svc(i, ar, en):
    return {"id": f"id-{i}", "category_id": "cat", "name_ar": ar, "name_en": en,
            "description_ar": None, "description_en": None, "image_url": None,
            "price": 25.0, "currency": "USD", "duration_min": 30,
            "is_active": True, "is_featured": False, "sort_order": i, "metadata": {}}


BARBERLAB = [
    _svc(1, "البروتين للشعر", None),
    _svc(2, "دقن", "Beard Trim"),
    _svc(3, "تمشيط أو تسريح", "Styling"),
    _svc(4, "شعر", "Haircut"),
    _svc(5, "شعر ودقن", "Haircut & Beard"),
    _svc(6, "حنة أو صبغة", "Hair Color"),
    _svc(7, "كرياتين", "Keratin"),
]

RK = [
    _svc(1, "شعر", "Hair"),
    _svc(2, "شعر ودقن", "Haircut"),
    _svc(3, "كرياتين", "Keratin"),
    _svc(4, "دقن", None),
    _svc(5, "تمشيط أو تسريح", None),
    _svc(6, "حنة أو صبغة", None),
]

# (tenant services, label, typed message, expected name_ar or None)
CASES = [
    # ── DEFECT 1 — Arabic word boundary. A glued preposition is not a service name. ──────────
    (BARBERLAB, "barberlab", "بدى أعمل كرياتين لشعرى", "كرياتين"),
    (RK,        "rk",        "بدى أعمل كرياتين لشعرى", "كرياتين"),
    (RK,        "rk",        "لشعري",                  None),
    (RK,        "rk",        "بدي شامبو للشعر",        None),
    # `rk` has no protein service, so a question is the only right answer. Before the fix this
    # booked "شعر" -- a wrong match, which is worse than a question.
    (RK,        "rk",        "البروتين للشعر",         None),

    # ── word order, both spellings of the conjunction ────────────────────────────────────────
    (BARBERLAB, "barberlab", "دقن وشعر",               "شعر ودقن"),
    (RK,        "rk",        "دقن وشعر",               "شعر ودقن"),
    (RK,        "rk",        "شعر ودقن",               "شعر ودقن"),
    (RK,        "rk",        "شعر و دقن",              "شعر ودقن"),
    (RK,        "rk",        "بدي شعر ودقن",           "شعر ودقن"),

    # ── the definite article still names the service ─────────────────────────────────────────
    (RK,        "rk",        "بدي الشعر",              "شعر"),
    (RK,        "rk",        "وشعر",                   "شعر"),

    # ── DEFECT 2 — English names, from data that exists; nothing invented ────────────────────
    (BARBERLAB, "barberlab", "keratin",                "كرياتين"),
    (RK,        "rk",        "keratin",                "كرياتين"),
    (RK,        "rk",        "Keratin",                "كرياتين"),
    (BARBERLAB, "barberlab", "beard trim",             "دقن"),
    (BARBERLAB, "barberlab", "styling",                "تمشيط أو تسريح"),
    (BARBERLAB, "barberlab", "i want keratin",         "كرياتين"),
    # "Hair" is a substring of "Haircut" and both are real names on `rk`. Whole-word equality is
    # what keeps each one answerable.
    (RK,        "rk",        "hair",                   "شعر"),
    (RK,        "rk",        "haircut",                "شعر ودقن"),
    # On barberlab "hair" is genuinely two services (Haircut, Hair Color) -> ask, never guess.
    (BARBERLAB, "barberlab", "hair",                   None),
    # NULL name_en contributes nothing. No translation is fabricated for it.
    (RK,        "rk",        "beard trim",             None),
    (RK,        "rk",        "styling",                None),

    # ── no regression in what already worked ─────────────────────────────────────────────────
    (BARBERLAB, "barberlab", "بدي دقن",                "دقن"),
    (BARBERLAB, "barberlab", "بدي شعر",                "شعر"),
    (BARBERLAB, "barberlab", "بدي حنة",                "حنة أو صبغة"),
    (BARBERLAB, "barberlab", "بدي صبغة",               "حنة أو صبغة"),
    (BARBERLAB, "barberlab", "بدي تسريح",              "تمشيط أو تسريح"),
    (BARBERLAB, "barberlab", "كرياتين",                "كرياتين"),
    (BARBERLAB, "barberlab", "البروتين للشعر",         "البروتين للشعر"),
    (BARBERLAB, "barberlab", "بدي دقن!",               "دقن"),

    # ── adversarial: matching must NOT have become more permissive in general ────────────────
    (BARBERLAB, "barberlab", "مرحبا",                  None),
    (BARBERLAB, "barberlab", "بدي شي",                 None),
    (RK,        "rk",        "قن",                     None),   # 2-char fragment of two services
    (RK,        "rk",        "بدي وجه",                None),   # clitic letter that is not one
    (RK,        "rk",        "sha3r",                  None),   # Franco-Arabic, out of scope
    (RK,        "rk",        "da8n",                   None),   # ditto
    (RK,        "rk",        "بدي موعد",               None),   # pure noise words
    # English participates in the equality passes only -- see the matcher's own comment. Under a
    # subset pass this booked "شعر" for a customer who asked for hair AND beard.
    (RK,        "rk",        "hair and beard",         None),
    (BARBERLAB, "barberlab", "hair and beard",         None),
    (RK,        "rk",        "i want a haircut",       "شعر ودقن"),
]


def main() -> int:
    failures = 0
    print("_canon_tokens sanity")
    for text, want in (
        ("شعر ودقن",  {"شعر", "دقن"}),
        ("دقن وشعر",  {"دقن", "شعر"}),
        ("شعر و دقن", {"شعر", "دقن"}),
        ("لشعري",     {"لشعري"}),
        ("للشعر",     {"للشعر"}),
        ("الشعر",     {"شعر"}),
        ("وجه",       {"وجه"}),
        ("بدي دقن!",  {"بدي", "دقن"}),
    ):
        got = _canon_tokens(text)
        good = got == want
        failures += not good
        print(f"  {'PASS' if good else 'FAIL'}  {text!r:<14} -> {sorted(got)}"
              f"{'' if good else '   want ' + str(sorted(want))}")

    print("\n_match_service_by_text")
    for services, label, text, want in CASES:
        svc = _match_service_by_text(text, services)
        got = svc["name_ar"] if svc else None
        good = got == want
        failures += not good
        print(f"  {'PASS' if good else 'FAIL'}  [{label:<10}] {text!r:<26} -> {got!r}"
              f"{'' if good else '   want ' + repr(want)}")

    total = len(CASES) + 8
    print(f"\n{total - failures}/{total} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
