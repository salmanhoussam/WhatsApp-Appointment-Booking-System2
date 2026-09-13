"""The opening-message matcher and Lia's owner welcome + escape hatch.

Run:  venv/bin/python scripts/test_first_message_and_escape.py

NO REAL SENDS AND NO WRITES. The WhatsApp client is a recorder; the two branches that would
write (`_accept_service`'s barber lookup, `_commit`) are not reached by any case here.

The session object is the REAL `whatsapp_flow.ConversationSession` dataclass, built through the
real serialisation round-trip. That is not pedantry: on 2026-09-13 a hand-written stub defined a
`state_data` field the real class does not have, so it proved a draft was persisted that in
production was silently dropped. A stub kinder than reality tests the stub.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import lia_owner_entry as lia                      # noqa: E402
from app.services import whatsapp_reservation_flow as res            # noqa: E402
from app.services.whatsapp_flow import (                             # noqa: E402
    ConversationSession, _session_from_row, _session_to_state_data,
)


class Recorder:
    """Records what would have been sent. Same three methods the flows actually call."""

    def __init__(self):
        self.sent = []

    async def send_text(self, to, text):
        self.sent.append(("text", text))

    async def send_interactive_buttons(self, to, text, buttons):
        self.sent.append(("buttons", text, [b["reply"]["title"] for b in buttons],
                          [b["reply"]["id"] for b in buttons]))

    async def send_list_message(self, to, header, body, button_text, sections):
        self.sent.append(("list", header, body, button_text,
                          [r["title"] for s in sections for r in s["rows"]]))


class _Row:
    """The shape `_session_from_row` really reads: a Prisma WhatsAppSession row."""

    def __init__(self, step, client_id, state_data):
        self.step, self.clientId, self.stateData = step, client_id, state_data


def _real_session(state="IDLE"):
    """A real ConversationSession, put through the real serialisation round-trip.

    `_session_to_state_data` then `_session_from_row` are the exact two functions production
    uses to store and reload a session, so a field this test sets is a field that survives.""" 
    s = ConversationSession(state=state)
    return _session_from_row(_Row(s.state, s.client_id, _session_to_state_data(s)))


class FakeClient:
    def __init__(self, slug="barberlab-test", name="Barber Lab"):
        self.id, self.slug, self.name = "client-1", slug, name


def _svc(i, ar, en, dur=30):
    return {"id": f"svc-{i}", "category_id": "cat", "name_ar": ar, "name_en": en,
            "description_ar": None, "description_en": None, "image_url": None,
            "price": 25.0, "currency": "USD", "duration_min": dur,
            "is_active": True, "is_featured": False, "sort_order": i, "metadata": {}}


SERVICES = [
    _svc(1, "البروتين للشعر", "Hair Protein", 45),
    _svc(2, "دقن", "Beard Trim"),
    _svc(3, "شعر", "Haircut"),
    _svc(4, "شعر ودقن", "Haircut & Beard", 60),
    _svc(5, "كرياتين", "Keratin", 90),
]

ok = True


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


async def opening(text, returning=None, services=SERVICES):
    """Run start() with an opening message, stubbing only the two DB reads it makes."""
    rec, sess, client = Recorder(), _real_session(), FakeClient()
    accepted = {}

    class _Cust:
        def __init__(self, n): self.name = n

    class _Repo:
        def __init__(self, *a, **k): pass
        async def get_by_phone(self, phone, cid): return _Cust(returning) if returning else None

    async def _accept(wa, phone, session, cl, service):
        accepted["service"] = service["name_ar"]

    orig_repo, orig_list, orig_accept = (
        res.CustomerRepository, res.catalog_service_service.public_list_services,
        res._accept_service)
    res.CustomerRepository = _Repo
    res.catalog_service_service.public_list_services = lambda cid: _done(services)
    res._accept_service = _accept
    try:
        await res.start(rec, "96178727986", sess, client, "text", text)
    finally:
        res.CustomerRepository = orig_repo
        res.catalog_service_service.public_list_services = orig_list
        res._accept_service = orig_accept
    return rec, sess, accepted.get("service")


def _done(v):
    f = asyncio.get_event_loop().create_future()
    f.set_result(v)
    return f


async def main():
    print("── A. the opening message reaches the matcher ──")
    rec, sess, got = await opening("بدي دقن")
    check("«بدي دقن» as the FIRST message resolves the service", got == "دقن", f"got={got!r}")
    check("   it is quoted back before moving",
          any(k == "text" and "دقن" in t and "✅" in t for k, t, *_ in rec.sent),
          repr(rec.sent[0][1]) if rec.sent else "nothing sent")
    check("   and the greeting is part of that same message",
          any(k == "text" and "أهلاً فيك" in t for k, t, *_ in rec.sent))
    check("   state moved to RES_AWAITING_SERVICE", sess.state == res.RES_AWAITING_SERVICE,
          sess.state)
    check("   no list was pushed on top of it",
          not any(k == "list" for k in (s[0] for s in rec.sent)))

    rec, sess, got = await opening("بدى أعمل كرياتين لشعرى")
    check("the real live failure «بدى أعمل كرياتين لشعرى» now resolves", got == "كرياتين",
          f"got={got!r}")

    rec, sess, got = await opening("دقن وشعر")
    check("«دقن وشعر» resolves to «شعر ودقن»", got == "شعر ودقن", f"got={got!r}")

    rec, sess, got = await opening("hair protein")
    check("English opening resolves", got == "البروتين للشعر", f"got={got!r}")

    rec, sess, got = await opening("بدي دقن", returning="Salman Houssam")
    check("a returning customer is greeted by name, not generically",
          any(k == "text" and "أهلاً بعودتك" in t and "Salman" in t for k, t, *_ in rec.sent))

    print("\n── B. ambiguity falls through to the greeting, never to a refusal ──")
    # "بدي شعر ودقن وكرياتين" is a REAL ambiguity: four candidates are all subsets of it.
    # "شعر و" deliberately is not in this list -- see the note below it.
    for text in ("مرحبا", "بدي شي", "بدي شعر ودقن وكرياتين", "بدي احجز", "بدي شي حلو"):
        rec, sess, got = await opening(text)
        listed = [s for s in rec.sent if s[0] == "list"]
        refused = [t for k, t, *_ in rec.sent if k == "text" and "ما فهمت" in t]
        check(f"{text!r} -> greeting + list, no refusal",
              got is None and len(listed) == 1 and not refused,
              f"service={got!r} lists={len(listed)} refusals={len(refused)}")
        check(f"   {text!r} leaves state at RES_AWAITING_SERVICE",
              sess.state == res.RES_AWAITING_SERVICE, sess.state)

    # RECORDED, not hidden: a truncated "شعر و" DOES resolve to شعر. The customer named the
    # service and the trailing single letter is dropped as a conjunction, which is the same answer
    # the old substring matcher gave -- so this is documented behaviour, not a regression. It is
    # listed here rather than left out so that a future change to it shows up as a test failure.
    rec, sess, got = await opening("شعر و")
    check("«شعر و» resolves to شعر (truncated but unambiguous)", got == "شعر", f"got={got!r}")

    print("\n── C. mid-flow behaviour is unchanged (the refusal still exists where it belongs) ──")
    rec, sess = Recorder(), _real_session(res.RES_AWAITING_SERVICE)
    orig = res.catalog_service_service.public_list_services
    res.catalog_service_service.public_list_services = lambda cid: _done(SERVICES)
    try:
        await res._step_awaiting_service(rec, "96178727986", sess, FakeClient(), "text", "بدي شي")
    finally:
        res.catalog_service_service.public_list_services = orig
    check("an ambiguous message MID-FLOW still gets «ما فهمت»",
          any(k == "text" and "ما فهمت" in t for k, t, *_ in rec.sent),
          str(rec.sent))

    print("\n── D. Lia's greeting gate ──")
    for text, want in (("مرحبا", True), ("أهلاً", True), ("hi", True), ("كيفك؟", True),
                       ("مرحبا بدي احجز دقن", False), ("بدي دقن", False),
                       ("ضيف خدمة كرياتين 25 دولار وساعة", False), ("شو عندي حجوزات", False)):
        check(f"greeting gate {text!r} -> {want}", lia._looks_like_greeting(text) is want)

    print("\n── E. the welcome only promises what is live ──")
    w = lia._WELCOME
    check("welcome mentions adding a service", "ضيف خدمة" in w)
    check("welcome does NOT promise reservation analytics (Phase 2)",
          "حجوزات" not in w and "كم حجز" not in w)
    check("welcome does NOT promise blocking a barber (no table exists)",
          "أوقف" not in w and "اوقف" not in w)
    check("welcome points at the escape hatch", "الزرّ" in w or "الزر" in w)

    print("\n── F. the owner welcome and the escape hatch ──")
    rec = Recorder()
    orig_resolve = lia._resolve_owner
    lia._resolve_owner = lambda p: _done(("client-1", "owner", "user-1"))
    try:
        out = await lia.try_handle(rec, "96178727986", None, "text", "مرحبا", "مرحبا",
                                   lambda: _done(_real_session()))
    finally:
        lia._resolve_owner = orig_resolve
    btns = [s for s in rec.sent if s[0] == "buttons"]
    check("an owner's «مرحبا» gets Lia's welcome", len(btns) == 1, str(rec.sent)[:120])
    check("   carrying exactly one button, «احجز موعد 💈»",
          bool(btns) and btns[0][2] == ["احجز موعد 💈"], str(btns[0][2]) if btns else "-")
    check("   whose id is BOOK_ID", bool(btns) and btns[0][3] == [lia.BOOK_ID])
    check("   and no session is left behind", out is lia._SENTINEL, repr(out))

    rec = Recorder()
    lia._resolve_owner = lambda p: _done((None, None, None))
    try:
        out = await lia.try_handle(rec, "96170000001", None, "text", "مرحبا", "مرحبا",
                                   lambda: _done(_real_session()))
    finally:
        lia._resolve_owner = orig_resolve
    check("a CUSTOMER's «مرحبا» falls through untouched", out is None and not rec.sent,
          f"out={out!r} sent={rec.sent}")

    rec, sess = Recorder(), _real_session(res.RES_AWAITING_SLOT)
    lia._resolve_owner = lambda p: _done(("client-1", "owner", "user-1"))
    try:
        out = await lia.try_handle(rec, "96178727986", sess, "text", "مرحبا", "مرحبا",
                                   lambda: _done(sess))
    finally:
        lia._resolve_owner = orig_resolve
    check("an owner MID-BOOKING is not hijacked by the welcome",
          out is None and not rec.sent, f"out={out!r} sent={rec.sent}")

    print("\n── G. the escape hatch binds the tenant and opens the customer flow ──")
    rec, sess = Recorder(), _real_session()
    started = {}

    async def _fake_start(wa, phone, session, client, msg_type=None, value=None):
        started["slug"] = client.slug
        session.state = res.RES_AWAITING_SERVICE

    orig_start, orig_has = res.start, lia._tenant_has_reservations
    lia._resolve_owner = lambda p: _done(("client-1", "owner", "user-1"))
    lia._tenant_has_reservations = lambda cid: _done(True)
    lia.whatsapp_reservation_flow.start = _fake_start

    class _P:
        class client:
            @staticmethod
            async def find_unique(where): return FakeClient()
    orig_prisma = lia.prisma_client
    lia.prisma_client = _P
    try:
        out = await lia.try_handle(rec, "96178727986", sess, "button_reply", lia.BOOK_ID,
                                   "احجز موعد 💈", lambda: _done(sess))
    finally:
        lia._resolve_owner = orig_resolve
        lia._tenant_has_reservations = orig_has
        lia.whatsapp_reservation_flow.start = orig_start
        lia.prisma_client = orig_prisma
    check("tapping the hatch opens the reservation flow",
          started.get("slug") == "barberlab-test", repr(started))
    check("   the tenant is bound onto the session",
          out is not None and out is not lia._SENTINEL
          and out.client_id == "client-1" and out.client_slug == "barberlab-test",
          f"client_id={getattr(out, 'client_id', None)!r}")
    check("   and the session is returned so it is persisted",
          out is sess and out.state == res.RES_AWAITING_SERVICE)

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
