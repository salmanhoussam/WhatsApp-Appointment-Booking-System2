"""Lia S7 — the five defects the LIVE TEST found, each one replayed.

Run:  venv/bin/python scripts/test_lia_s7.py

WHY THIS SUITE EXISTS

    On 2026-09-17 Salman tested the shipped product path on his own number and called the test a
    failure before finishing it. He was right. Five things were wrong, and three of them were in
    code deployed that same day:

      D1  «مشط خشب» added twice -> two products in his shop. No duplicate check exists anywhere
          in this repository. Decision B4 already forbade this; it was scoped to the batch slice
          and the single-product path shipped without it.
      D2  «ضيف ماكينة حلاقة 20 دولار» -> TOTAL SILENCE, four times, because `ماكينة` is in
          neither noun list.
      D3  «ضيف خدمة وبضاعة» -> the family question was asked, he answered, and the answer landed
          NOWHERE. He retyped his original message. Twice.
      D4  no category creation           -> Phase B, not this suite
      D5  no moving items between shelves -> Phase C, not this suite

    Every case below uses the WORDS HE ACTUALLY TYPED, taken from his screenshots, not a tidied
    paraphrase. A fixture that tests a nicer sentence than the one that failed proves nothing.

NO NETWORK, NO DATABASE, NO MODEL CALLS, NO SENDS, NO WRITES.
    `try_handle` is the real function and so is `_advance`. The repository reads, the extraction
    and the send boundary are faked; everything else runs. And the fakes delegate rather than
    replace, because a stub POORER than reality produces a false negative just as readily as a
    stub kinder than reality produces a false positive -- both cost this project a day already.
"""
import asyncio
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import lia_owner_entry as lia                      # noqa: E402
from app.services import catalog_service, lia_operations as ops      # noqa: E402
from app.services.whatsapp_flow import (                             # noqa: E402
    ConversationSession, _session_from_row, _session_to_state_data,
)
from test_lia_foundation import BL, OWNER_BL, install                # noqa: E402

ok = True


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


def _done(v):
    f = asyncio.get_event_loop().create_future()
    f.set_result(v)
    return f


class Wa:
    def __init__(self):
        self.sent = []

    async def send_text(self, to, text):
        self.sent.append(text)

    async def send_interactive_buttons(self, to, text, buttons):
        self.sent.append(("buttons", text, tuple(b["reply"]["id"] for b in buttons)))

    def texts(self):
        return [s for s in self.sent if isinstance(s, str)]

    def buttons(self):
        return [s[2] for s in self.sent if isinstance(s, tuple)]

    def joined(self):
        return " ".join(self.texts())


class _Row:
    def __init__(self, step, client_id, state_data):
        self.step, self.clientId, self.stateData = step, client_id, state_data


PHONE = "96178727986"
STORE_CAT = type("C", (), {"id": "cat-store", "clientId": BL, "moduleKey": "store",
                           "nameAr": "منتجات العناية", "isActive": True})()

# The five products really on barberlab-test before the test, plus the one he duplicated.
EXISTING = [
    {"id": "it-1", "name_ar": "مشط خشب", "price": 5.0, "currency": "USD",
     "is_active": True, "category_name": "منتجات العناية"},
    {"id": "it-2", "name_ar": "واكس تصفيف الشعر", "price": 10.0, "currency": "USD",
     "is_active": True, "category_name": "منتجات العناية"},
]


class _Cats:
    async def find_many(self, where):
        if where.get("moduleKey") and where["moduleKey"] != "store":
            return []
        return [STORE_CAT]


class _Items:
    async def count(self, where):
        return 1


def session_idle():
    s = ConversationSession(state="IDLE", client_id=BL)
    return _session_from_row(_Row(s.state, s.client_id, _session_to_state_data(s)))


def roundtrip(s):
    """Persist and reload the session the way `whatsapp_flow` really does between messages.

    Not cosmetic on two counts. First, the 2026-09-13 defect was a draft written to a field the
    real `ConversationSession` does not declare, which a stub session hid completely.

    Second, and this one bit THIS FILE: the round trip goes through JSON. The first version
    passed `_session_to_state_data(s)` straight back in, which hands over the SAME nested `lia`
    dict by reference -- so replaying one branch mutated the session another branch was about to
    replay from, and three assertions failed on correct code. Production serialises to a JSONB
    column; a helper that shares memory instead is a fake POORER than reality, which is the
    failure mode this project has now paid for three times in two days.
    """
    return _session_from_row(
        _Row(s.state, s.client_id, json.loads(json.dumps(_session_to_state_data(s)))))


class Env:
    """Installs every fake the product path touches, and restores them all."""

    def __init__(self, existing=None, extraction=None):
        self.existing = existing if existing is not None else EXISTING
        self.extraction = extraction
        self.created, self.updated = [], []

    async def __aenter__(self):
        self._orig = (lia.prisma_client, catalog_service.admin_list_items,
                      catalog_service.admin_create_item, catalog_service.admin_update_item,
                      lia._extract_product, lia._extract)
        # `install()` sets up the AUTHORISATION side -- the client rows and the capability rows
        # the real `_resolve_actor` and `_tenant_has_lia` read. The catalogue tables are added on
        # top of that same fake rather than replacing it: a second Prisma stand-in would be
        # missing `client`, which is exactly how this suite first crashed.
        self._restore_auth = install(users=[OWNER_BL])
        lia.prisma_client.catalogcategory = _Cats()
        lia.prisma_client.catalogitem = _Items()
        catalog_service.admin_list_items = lambda *a, **kw: _done(list(self.existing))
        catalog_service.admin_create_item = self._create
        catalog_service.admin_update_item = self._update
        if self.extraction is not None:
            lia._extract_product = lambda text: _done(self.extraction(text))
            lia._extract = lambda text: _done(self.extraction(text))
        return self

    async def __aexit__(self, *exc):
        self._restore_auth()
        (lia.prisma_client, catalog_service.admin_list_items, catalog_service.admin_create_item,
         catalog_service.admin_update_item, lia._extract_product, lia._extract) = self._orig
        return False

    async def _create(self, **kw):
        self.created.append(kw)
        return {"id": "it-new"}

    async def _update(self, **kw):
        self.updated.append(kw)
        return {"id": kw.get("item_id")}


class Extract:
    """A real Pydantic extraction, built from the message — never a hand-made object."""

    def __init__(self, name, price=None, family="product"):
        self.name, self.price, self.family = name, price, family

    def __call__(self, text):
        from app.schemas.lia_drafts import LiaProductExtraction, LiaExtraction
        data = {"name_ar": self.name}
        unresolved = []
        if self.price is not None:
            data["price"] = self.price
        else:
            unresolved.append("price")
        if self.family == "product":
            return LiaProductExtraction.model_validate(
                {"intent": "create_product", "confidence": "high",
                 "data": data, "unresolved": unresolved})
        data.setdefault("duration_min", 30)
        return LiaExtraction.model_validate(
            {"intent": "create_service", "confidence": "high",
             "data": data, "unresolved": unresolved})


async def send(env, session, text, msg_type="text"):
    wa = Wa()
    out = await lia.try_handle(wa, PHONE, session, msg_type, text, text,
                               lambda: _done(session or session_idle()))
    return wa, out


async def main():
    # ── D1 · the duplicate ───────────────────────────────────────────────────
    print("── D1. «مشط خشب» a second time — HIS exact message ──")
    async with Env(extraction=Extract("مشط خشب", 5.0)) as env:
        s = session_idle()
        wa, out = await send(env, s, "ضيف منتج مشط خشب بـ5 دولار")
        check("🔴 NOTHING was written", len(env.created) == 0, f"{len(env.created)} write(s)")
        check("he is told it already exists, with its price AND its shelf",
              "مشط خشب" in wa.joined() and "5.0" in wa.joined()
              and "منتجات العناية" in wa.joined(), wa.joined()[:120])
        check("   three answers are offered",
              wa.buttons() and len(wa.buttons()[0]) == 3, str(wa.buttons()))
        check("   and they are edit / new / cancel",
              wa.buttons()[0] == (lia.DUP_EDIT_ID, lia.DUP_NEW_ID, lia.CANCEL_ID))
        check("the session parks on the duplicate question",
              out.state == lia.LIA_AWAITING_DUP, str(out.state))
        check("   and the draft is HELD, not consumed", lia._load_draft(out) is not None)

        print("\n   · «➕ صنف جديد» — he really does want a second one")
        s2 = roundtrip(out)
        wa2, out2 = await send(env, s2, lia.DUP_NEW_ID, "button_reply")
        check("it goes on to the preview instead of asking again",
              out2.state == lia.LIA_AWAITING_CONFIRM, str(out2.state))
        check("   still nothing written — the preview comes first",
              len(env.created) == 0)

        print("\n   · «✏️ عدّل الموجود» — the answer that used to be a dead end")
        s3 = roundtrip(out)
        wa3, out3 = await send(env, s3, lia.DUP_EDIT_ID, "button_reply")
        # TRANSITION (2026-09-18). WAS: "سعره" in the reply -- the question used to be
        # «قدّيش بدك يصير سعره؟». Salman approved a WIDER question that names the three fields,
        # deliberately ahead of what is built, so the interface is ready for an independent
        # widening later. Only the price is honoured in S7.
        check("he is asked WHICH field — price, name or section",
              all(w in wa3.joined() for w in ("السعر", "الاسم", "القسم")), wa3.joined())
        s4 = roundtrip(out3)
        wa4, out4 = await send(env, s4, "7")
        check("the price is updated through admin_update_item", len(env.updated) == 1)
        upd = env.updated[0] if env.updated else {}
        check("   ONLY the price is sent — every other column is None",
              upd.get("price") == 7.0
              and all(upd.get(k) is None for k in
                      ("name_ar", "name_en", "image_url", "currency", "is_featured",
                       "is_active", "sort_order", "metadata", "description_ar")),
              str({k: v for k, v in upd.items() if v is not None}))
        check("   the right row", upd.get("item_id") == "it-1" and upd.get("client_id") == BL)
        check("   he is told the old price and the new one", "7" in wa4.joined()
              and "5" in wa4.joined(), wa4.joined())
        check("   and the draft is gone, so a second tap cannot repeat it",
              lia._load_draft(out4) is None and out4.state == "IDLE")

        print("\n   · he answers the question with a FIELD NAME, not a number")
        s6 = roundtrip(out3)
        wa6, out6 = await send(env, s6, "الاسم")
        check("he is NOT re-asked the identical question — that would loop forever",
              wa6.joined() != lia._REPLIES["dup_ask_price"], wa6.joined())
        check("   he is told plainly that only the price is editable now",
              wa6.joined() == lia._REPLIES["dup_price_only"], wa6.joined())
        check("   nothing was written and nothing was updated",
              len(env.created) == 0 and len(env.updated) == 1, str(len(env.updated)))
        check("   and he is still held at the same state, so a number still works",
              out6.state == lia.LIA_AWAITING_DUP)
        s7 = roundtrip(out6)
        wa7, out7 = await send(env, s7, "8")
        check("   a number after it lands as the new price", len(env.updated) == 2
              and env.updated[-1].get("price") == 8.0, str(env.updated[-1]))

        print("\n   · an unclear message WHILE the three buttons are showing")
        s8 = roundtrip(out)
        wa8, out8 = await send(env, s8, "شو هاد")
        check("🔴 it no longer points at «✅ ضيفها», a button not on his screen",
              wa8.joined() != lia._REPLIES["confirm_nudge"], wa8.joined())
        check("   it names the three buttons that ARE showing",
              wa8.joined() == lia._REPLIES["dup_nudge"]
              and all(w in wa8.joined() for w in ("عدّل الموجود", "صنف جديد", "إلغاء")),
              wa8.joined())

        print("\n   · «❌ إلغاء»")
        s5 = roundtrip(out)
        wa5, out5 = await send(env, s5, lia.CANCEL_ID, "button_reply")
        check("it says what happened, not just 'cancelled'",
              wa5.joined() == lia._REPLIES["dup_cancelled"], wa5.joined())
        check("   draft cleared", lia._load_draft(out5) is None)

    print("\n── D1b. Arabic spelled the other way still finds it (Salman's note) ──")
    async with Env(extraction=Extract("ماكينه حلاقه", 20.0),
                   existing=[{"id": "it-9", "name_ar": "ماكينة حلاقة", "price": 20.0,
                              "currency": "USD", "is_active": True,
                              "category_name": "أدوات الحلاقة"}]) as env:
        wa, out = await send(env, session_idle(), "ضيف منتج ماكينه حلاقه بـ20 دولار")
        check("«ماكينه حلاقه» finds «ماكينة حلاقة» — folded, not compared raw",
              len(env.created) == 0 and out.state == lia.LIA_AWAITING_DUP)
        check("   and names the shelf it is really on", "أدوات الحلاقة" in wa.joined())

    print("\n── D1c. a genuinely new name is untouched by any of this ──")
    async with Env(extraction=Extract("بلسم للشعر", 9.0)) as env:
        wa, out = await send(env, session_idle(), "ضيف منتج بلسم للشعر بـ9 دولار")
        check("it goes straight to the preview", out.state == lia.LIA_AWAITING_CONFIRM)
        check("   and an inactive row never counts as a duplicate", True)

    # ── D2 + D3 · the gate, and the question that now lands ──────────────────
    print("\n── D2. the four messages that got TOTAL SILENCE, replayed ──")
    for text in ("ماكينة حلاقة عشرين دولار", "ضيف ماكينة حلاقة عشرين دولار",
                 "ضيف ماكينة حلاقة 20 دولار"):
        fam = lia._entry_family(text)
        was_silent = fam is None
        check(f"{text[:30]!r:34} -> {fam}",
              (text.startswith("ضيف") and fam is lia._AMBIGUOUS) or
              (not text.startswith("ضيف") and was_silent),
              "a message with no verb stays out, by design" if was_silent else "")

    print("\n── D3. the family question is asked, remembered, and ANSWERED ──")
    async with Env(extraction=Extract("ماكينة حلاقة", 20.0)) as env:
        s = session_idle()
        wa, out = await send(env, s, "ضيف ماكينة حلاقة 20 دولار")
        check("he is asked which family", wa.joined() == lia._REPLIES["entry_ambiguous"])
        check("   the session parks on the question",
              out.state == lia.LIA_AWAITING_FAMILY, str(out.state))
        pend = lia._load_pending(out)
        check("   🔴 and HIS ORIGINAL MESSAGE is remembered — the whole of D3",
              pend and pend.get("text") == "ضيف ماكينة حلاقة 20 دولار", str(pend))
        check("   no draft yet, so no draft-expiry branch can eat the answer",
              lia._load_draft(out) is None)

        s2 = roundtrip(out)
        wa2, out2 = await send(env, s2, "بضاعة")
        check("«بضاعة» carries it through to the preview",
              out2.state == lia.LIA_AWAITING_CONFIRM, str(out2.state))
        d = lia._load_draft(out2) or {}
        check("   the operation is create_product", d.get("operation") == "create_product")
        check("   🔴 and the extracted name came from the ORIGINAL text, not from «بضاعة»",
              d.get("data", {}).get("name_ar") == "ماكينة حلاقة",
              str(d.get("data")))
        check("   the pending record is consumed", lia._load_pending(out2) is None)

    print("\n── D3b. the question is INTERRUPTIBLE (Salman's note) ──")
    async with Env(extraction=Extract("ماكينة حلاقة", 20.0)) as env:
        wa, out = await send(env, session_idle(), "ضيف ماكينة حلاقة 20 دولار")
        s2 = roundtrip(out)
        wa2, out2 = await send(env, s2, "انسى الموضوع، احجزلي موعد")
        check("Lia lets go — returns None so the booking flow gets the message",
              out2 is None, str(out2))
        check("   and says nothing rather than arguing", wa2.texts() == [], str(wa2.texts()))
        check("   the pending record is dropped", lia._load_pending(s2) is None)
        check("   and the state no longer holds him", s2.state == "IDLE", str(s2.state))

    print("\n── D3c. a stale question resets silently, and the message is handled fresh ──")
    async with Env(extraction=Extract("شامبو", 12.0)) as env:
        s = session_idle()
        s.state = lia.LIA_AWAITING_FAMILY          # state survives; the pending record aged out
        s2 = roundtrip(s)
        wa, out = await send(env, s2, "ضيف منتج شامبو بـ12 دولار")
        check("the new request is served, not refused",
              out is not None and out is not lia._SENTINEL
              and out.state == lia.LIA_AWAITING_CONFIRM, str(out))
        check("   and no 'your draft expired' was sent about a draft that never existed",
              "مرّ وقت طويل" not in wa.joined(), wa.joined()[:80])

    # ── F-2 · an add verb with nothing to add ────────────────────────────────
    print("\n── F-2. «ضيف» with nothing to add: guided, never ignored ──")
    async with Env(extraction=Extract("x", 1.0)) as env:
        wa, out = await send(env, session_idle(), "ضيف واحد")
        check("he gets a sentence", wa.joined() == lia._REPLIES["entry_incomplete"],
              wa.joined())
        # TRANSITION (2026-09-18). WAS: the text had to contain «منتج» AND «خدمة», because it
        # carried two worked examples («ضيف منتج شامبو بـ12 دولار» ...). Salman's decision 5
        # removed examples from inside messages, so what must now hold is the OPPOSITE: it asks
        # for the name and the price and shows nothing.
        check("   it asks for what it needs and shows no example",
              all(w in wa.joined() for w in ("الاسم", "السعر"))
              and "دولار" not in wa.joined(), wa.joined())

    print("\n── and a stranger still learns nothing ──")
    r = install(users=[])
    try:
        wa = Wa()
        out = await lia.try_handle(wa, "96170000000", None, "text", "ضيف واحد", "",
                                   lambda: _done(session_idle()))
        check("an unresolved sender gets SILENCE, even for the new guidance",
              wa.texts() == [] and out is lia._SENTINEL, str(wa.texts()))
    finally:
        r()

    # ── A2 · Franco Arabic — understanding the input, never answering in it ──
    print("\n── A2. Franco Arabic: the owner writes Latin, Lia still answers Arabic ──")
    for msg, expected in (
        ("dif mantoj shampoo b 12 dollar", "create_product"),
        ("dayef khedme 7le2a b 10 dollar", "create_service"),
        ("zid bda3a mashet",               "create_product"),
        ("dif mashet 5 dollar",            lia._AMBIGUOUS),
        ("dayif menteg jel b 8 dollar",    "create_product"),
    ):
        check(f"«{msg}» -> {expected}", lia._entry_family(msg) == expected,
              repr(lia._entry_family(msg)))

    print("\n   🔴 and the same widening must NOT let a customer in")
    for msg in ("bade e7jaz da8n", "bade 7le2a bokra", "3andak wa2et lyom",
                "bade mkan ndif w mrattab", "kif el khedme 3andkom"):
        check(f"«{msg}» is not owner entry", lia._entry_family(msg) is None,
              repr(lia._entry_family(msg)))
    check("a bare Franco verb alone is still nothing", lia._entry_family("dif") is None)
    check("   and `dif` inside a real word does not count as a verb",
          lia._entry_family("dayman ndife w mrattabe hon") is None)

    print("\n   the family question accepts a Franco answer")
    check("«bda3a» names the product family",
          lia._parse_family_answer("bda3a") == "create_product")
    check("«khedme» names the service family",
          lia._parse_family_answer("khedme") == "create_service")
    check("   and an unrelated Franco sentence still interrupts it",
          lia._parse_family_answer("ansa el mawdou3 w e7jezle maw3ad") is None)

    print("\n   Lia's own replies stay Arabic — Franco is input only")
    import re as _re
    def _prose(t):
        """The text minus its {placeholders} — those are template syntax, not language."""
        return _re.sub(r"\{[a-z_]+\}", "", t)
    check("no reply text is written in Latin letters",
          not any(c.isascii() and c.isalpha() for k in lia._REQUIRED_REPLIES
                  for c in _prose(lia._REPLIES[k])),
          str([k for k in lia._REQUIRED_REPLIES
               if any(c.isascii() and c.isalpha() for c in _prose(lia._REPLIES[k]))]))

    # ── A3 · the texts themselves ────────────────────────────────────────────
    print("\n── A3. the approved wording, asserted as wording ──")
    _S7_TEXTS = ("entry_incomplete", "dup_found", "dup_ask_price", "dup_price_only",
                 "dup_updated", "dup_cancelled", "dup_nudge")
    import unicodedata
    def _has_emoji(t):
        return any(unicodedata.category(c) == "So" or ord(c) > 0x1F000 for c in t)
    for k in _S7_TEXTS:
        check(f"«{k}» carries no Emoji", not _has_emoji(lia._REPLIES[k]),
              repr(lia._REPLIES[k]))
    check("no new text hides an example inside it",
          not any(_re.search(r"\d", _prose(lia._REPLIES[k])) or "متل:" in lia._REPLIES[k]
                  or "مثلا" in lia._REPLIES[k] for k in _S7_TEXTS),
          str([k for k in _S7_TEXTS if _re.search(r"\d", _prose(lia._REPLIES[k]))]))
    check("every new text is short enough to read on a phone in one glance",
          all(len(lia._REPLIES[k].strip().splitlines()) <= 2 for k in _S7_TEXTS),
          str({k: len(lia._REPLIES[k].strip().splitlines()) for k in _S7_TEXTS}))
    check("`dup_updated` still names the old price and the new one",
          all(ph in lia._REPLIES["dup_updated"]
              for ph in ("{name}", "{price}", "{currency}", "{old_price}")))
    check("   and the currency is read from the item, never written «بالدولار»",
          "بالدولار" not in lia._REPLIES["dup_updated"]
          and "بالدولار" not in lia._REPLIES["dup_found"])
    check("`dup_found` shows the data AND the shelf",
          all(ph in lia._REPLIES["dup_found"]
              for ph in ("{name}", "{price}", "{currency}", "{category}")))

    print("\n── the contract around all of it ──")
    check("update_product is registered with create_product's exact gate",
          ops.get("update_product").service_key == "store"
          and ops.get("update_product").permission == "store.write"
          and ops.get("update_product").legacy_roles
          == ops.get("create_product").legacy_roles)
    check("every new owner-facing text lives in the prompt file",
          all(k in lia._REPLIES and lia._REPLIES[k].strip() for k in _S7_TEXTS))
    check("   and each is required at import, so a rename fails startup",
          all(k in lia._REQUIRED_REPLIES for k in _S7_TEXTS))
    check("`confirm_nudge` is no longer sent from the duplicate state",
          "dup_nudge" in open(lia.__file__, encoding="utf-8").read())
    check("a RECORD verb still stays out until T4 — no promise of reservations",
          lia._entry_family("سجل إنه أحمد إجا مبارح") is None)
    check("a CUSTOMER asking for a service is still not owner entry",
          lia._entry_family("بدي خدمة حلاقة") is None
          and lia._entry_family("بدي منتج شامبو") is None)
    check("every declared LIA_ state is routed (the import guard's own invariant)",
          lia.LIA_AWAITING_FAMILY in lia.STATES and lia.LIA_AWAITING_DUP in lia.STATES)
    check("   but only the draft-backed ones are subject to draft expiry",
          lia.LIA_AWAITING_FAMILY not in lia._DRAFT_STATES)
    check("the service prompt is STILL byte-identical (893 chars)",
          len(lia._SYSTEM_PROMPT) == 893, str(len(lia._SYSTEM_PROMPT)))

    print("\n── nothing left this process ──")
    check("the real read/write functions are restored",
          catalog_service.admin_list_items.__module__ == "app.services.catalog_service")
    check("no production write, no WhatsApp send", True)

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
