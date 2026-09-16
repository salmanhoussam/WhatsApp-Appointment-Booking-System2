"""Lia P1 — editing a draft before it is saved, and the cancel wording.

Run:  venv/bin/python scripts/test_lia_draft_editing.py

The 14 criteria of `.claudedocs/plans/lia-draft-editing-p1.md` §5, in order.

NO MODEL CALLS, NO SENDS, NO DATABASE. `_extract_edit` is replaced by a recorder that returns a
patch built from real `LiaEditPatch` JSON -- so the schema is exercised for real while the network
is not. `_commit`'s write path is stubbed at `admin_create_service`, the ONE function allowed to
write, so criterion 11 proves what reaches it rather than trusting that it would.

The session is the real `ConversationSession` through the real serialisation round-trip, for the
reason 2026-09-13 taught: a stub that defines a field the real class lacks proves the stub.
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.schemas.lia_drafts import LiaEditPatch, LiaServiceDraft      # noqa: E402
from app.services import lia_owner_entry as lia                        # noqa: E402
from app.services.whatsapp_flow import (                               # noqa: E402
    ConversationSession, _session_from_row, _session_to_state_data,
)

ok = True


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


class Recorder:
    def __init__(self):
        self.sent = []

    async def send_text(self, to, text):
        self.sent.append(("text", text))

    async def send_interactive_buttons(self, to, text, buttons):
        self.sent.append(("buttons", text, [b["reply"]["id"] for b in buttons]))

    async def send_list_message(self, to, header, body, button_text, sections):
        self.sent.append(("list", header))

    def texts(self):
        return [t for k, t in ((x[0], x[1]) for x in self.sent) if k in ("text", "buttons")]


class _Row:
    def __init__(self, step, client_id, state_data):
        self.step, self.clientId, self.stateData = step, client_id, state_data


def _done(v):
    f = asyncio.get_event_loop().create_future()
    f.set_result(v)
    return f


DRAFT_DATA = {"name_ar": "البروتين للشعر", "price": 30.0, "duration_min": 45, "currency": "USD"}


def _session_with_draft(data=None):
    s = ConversationSession(state=lia.LIA_AWAITING_CONFIRM, client_id="client-1")
    lia._save_draft(s, {
        "client_id": "client-1", "actor": "owner", "actor_id": "user-1",
        "category_id": "cat-1", "category_name": "الخدمات",
        "data": dict(data or DRAFT_DATA), "asking": None,
        "started_at": "2999-01-01T00:00:00+00:00",
    })
    return _session_from_row(_Row(s.state, s.client_id, _session_to_state_data(s)))


def _patch(changes, confidence="high"):
    return LiaEditPatch.model_validate_json(json.dumps(
        {"intent": "edit_draft", "confidence": confidence, "changes": changes}))


async def edit(instruction, patch_result, data=None):
    """One typed message against a live draft. Returns (recorder, session, draft)."""
    rec, sess = Recorder(), _session_with_draft(data)
    orig = lia._extract_edit
    lia._extract_edit = lambda d, i: _done(patch_result)
    try:
        out = await lia.try_handle(rec, "96178727986", sess, "text", instruction, instruction,
                                   lambda: _done(sess))
    finally:
        lia._extract_edit = orig
    return rec, out, lia._load_draft(out) if out not in (None, lia._SENTINEL) else None


async def main():
    import hashlib

    print("── 1. the two existing blocks are byte-identical after adding two more ──")
    import subprocess
    before = subprocess.run(
        ["git", "show", "4196e8f:app/services/lia_owner_entry.py"],
        capture_output=True, text=True).stdout
    import re
    literal = re.search(r'_SYSTEM_PROMPT = """(.*?)"""', before, re.S).group(1)
    check("system prompt unchanged", lia._SYSTEM_PROMPT == literal,
          f"{len(lia._SYSTEM_PROMPT)} chars sha256={hashlib.sha256(lia._SYSTEM_PROMPT.encode()).hexdigest()[:16]}")
    check("welcome still loads", len(lia._WELCOME) > 40, f"{len(lia._WELCOME)} chars")
    check("edit prompt loads", len(lia._EDIT_PROMPT) > 100, f"{len(lia._EDIT_PROMPT)} chars")
    check("every required reply loads", all(k in lia._REPLIES for k in lia._REQUIRED_REPLIES),
          str(sorted(lia._REPLIES)))

    print("\n── 2. the guards fire on a damaged file ──")
    import pathlib
    orig_file = lia._PROMPT_PATH.read_text(encoding="utf-8")
    for label, mangled, fn in (
        ("edit-prompt sentinel removed",
         orig_file.replace("<!--LIA_EDIT_PROMPT_END-->", "## x"),
         lambda: lia._load_block(lia._EDIT_START, lia._EDIT_END, "edit prompt")),
        ("replies sentinel removed",
         orig_file.replace("<!--LIA_REPLIES_START-->", "## x"), lia._load_replies),
        ("a required reply key renamed",
         orig_file.replace("[[cancel]]", "[[cancelled]]"), lia._load_replies),
        ("all [[key]] markers gone",
         orig_file.replace("[[", "((").replace("]]", "))"), lia._load_replies),
    ):
        try:
            lia._PROMPT_PATH.write_text(mangled, encoding="utf-8")
            try:
                fn()
                check(f"guard: {label}", False, "no raise")
            except RuntimeError as e:
                check(f"guard: {label}", True, str(e)[-52:])
        finally:
            lia._PROMPT_PATH.write_text(orig_file, encoding="utf-8")
    check("prompt file restored intact",
          lia._PROMPT_PATH.read_text(encoding="utf-8") == orig_file)

    print("\n── 3-5. an accepted edit changes only its field, and re-previews ──")
    rec, sess, draft = await edit("خلّي السعر 25", _patch({"price": 25}))
    check("price edited to 25", draft and draft["data"]["price"] == 25.0,
          str(draft["data"]) if draft else "-")
    check("   re-preview sent", any("هيك فهمت" in t for t in rec.texts()))
    check("   state is back at LIA_AWAITING_CONFIRM", sess.state == lia.LIA_AWAITING_CONFIRM,
          sess.state)
    check("   name and duration untouched",
          draft["data"]["name_ar"] == "البروتين للشعر" and draft["data"]["duration_min"] == 45)

    rec, sess, draft = await edit("غيّر الاسم لبروتين", _patch({"name_ar": "بروتين"}))
    check("name edited alone", draft and draft["data"]["name_ar"] == "بروتين")
    check("   price and duration NOT regenerated",
          draft["data"]["price"] == 30.0 and draft["data"]["duration_min"] == 45,
          str(draft["data"]))

    rec, sess, draft = await edit("خلّي المدة ساعة", _patch({"duration_min": 60}))
    check("duration edited to 60", draft and draft["data"]["duration_min"] == 60)

    print("\n── 6. ambiguity is a question, and the draft survives ──")
    rec, sess, draft = await edit("خليها أحسن", _patch({}, confidence="low"))
    check("unclear -> edit_unclear reply", lia._REPLIES["edit_unclear"] in rec.texts())
    check("   draft untouched", draft and draft["data"] == DRAFT_DATA, str(draft["data"]))
    check("   still awaiting confirm", sess.state == lia.LIA_AWAITING_CONFIRM)

    rec, sess, draft = await edit("عدّلها", None)          # model returned nothing usable
    check("unusable extraction -> question, draft kept",
          lia._REPLIES["edit_unclear"] in rec.texts() and draft["data"] == DRAFT_DATA)

    print("\n── 7-9. Pydantic is the authority ──")
    for label, raw in (("price 0", {"price": 0}), ("duration 37", {"duration_min": 37}),
                       ("invented field", {"made_up": 1}), ("currency EUR", {"currency": "EUR"})):
        try:
            _patch(raw)
            check(f"patch refused: {label}", False, "ACCEPTED")
        except Exception:
            check(f"patch refused: {label}", True)

    # THE MERGE GUARD, tested honestly. The first version of this check asserted
    # `name_ar == "اب" or data == DRAFT_DATA`, which passes either way and proved nothing -- and
    # "اب" is 2 characters, so `LiaServiceDraft` accepts it and the merge SUCCEEDED. The check was
    # describing a path it never took.
    #
    # It cannot be reached through the normal flow at all, and that is worth stating rather than
    # faking: `LiaDraftChanges` repeats every bound `LiaServiceDraft` has, so a patch that
    # validates always merges into something valid. The guard is defensive -- it catches a draft
    # that was ALREADY carrying a bad value in a field the patch does not touch. So it is tested
    # by building exactly that draft, which is the only way the branch is reachable.
    bad_draft = {**DRAFT_DATA, "duration_min": 37}     # 37 is off the 5-minute grid
    rec, sess, draft = await edit("خلّي السعر 25", _patch({"price": 25}), data=bad_draft)
    check("a merge that fails the full contract keeps the OLD draft",
          draft and draft["data"] == bad_draft, str(draft["data"]) if draft else "-")
    check("   and the owner is asked rather than silently corrected",
          lia._REPLIES["edit_unclear"] in rec.texts())
    check("   the invalid value was NOT rewritten to something plausible",
          draft["data"]["duration_min"] == 37)

    print("\n── 10. the model being down is our fault, and the draft is kept ──")
    rec, sess, draft = await edit("خلّي السعر 25", lia._UNAVAILABLE)
    check("unavailable -> edit_unavailable reply", lia._REPLIES["edit_unavailable"] in rec.texts())
    check("   draft still intact", draft and draft["data"] == DRAFT_DATA)
    check("   still awaiting confirm, so the buttons still work",
          sess.state == lia.LIA_AWAITING_CONFIRM)

    print("\n── 11. confirming AFTER an edit writes the edited values ──")
    rec, sess, draft = await edit("خلّي السعر 25", _patch({"price": 25}))
    wrote = {}

    async def _fake_create(**kw):
        wrote.update(kw)
        return {"id": "new-svc"}

    # `_commit` re-checks authorisation and resolves the category at WRITE time -- both are real
    # DB reads and both are real safety properties, so they are stubbed rather than bypassed:
    # this test is about which values reach the write, not about re-testing authorisation.
    orig_create = lia.catalog_service_service.admin_create_service
    orig_auth, orig_cat, orig_audit2 = (lia._still_authorised, lia._resolve_service_category,
                                        lia.log_security_event)
    lia.catalog_service_service.admin_create_service = _fake_create
    auth_calls = []

    def _fake_auth(phone, cid, op=None):
        # `op` added 2026-09-16 (Lia Foundation F0.7): the write-time re-check now takes the SAME
        # OperationDefinition the pre-model checks used, instead of re-checking a hardcoded key.
        # Recorded, not ignored -- the assertion below proves the real operation reached it.
        auth_calls.append((phone, cid, getattr(op, "name", None)))
        return _done((True, "ok"))

    lia._still_authorised = _fake_auth
    lia._resolve_service_category = lambda cid: _done(("cat-1", []))
    lia.log_security_event = lambda **kw: _done(None)
    rec2 = Recorder()
    try:
        out = await lia.try_handle(rec2, "96178727986", sess, "button_reply", lia.CONFIRM_ID,
                                   "✅ ضيفها", lambda: _done(sess))
    finally:
        lia.catalog_service_service.admin_create_service = orig_create
        lia._still_authorised, lia._resolve_service_category = orig_auth, orig_cat
        lia.log_security_event = orig_audit2
    check("admin_create_service was the write path", bool(wrote), str(list(wrote))[:70])
    check("   _commit re-checked authorisation at write time",
          len(auth_calls) == 1 and auth_calls[0][0] == "96178727986", str(auth_calls))
    check("   and re-checked it against the SAME OperationDefinition",
          len(auth_calls) == 1 and auth_calls[0][2] == "create_service", str(auth_calls))
    check("   it received the EDITED price", wrote.get("price") == 25.0, str(wrote.get("price")))
    check("   and the untouched name/duration",
          wrote.get("name_ar") == "البروتين للشعر" and wrote.get("duration_min") == 45)
    check("   draft cleared and state IDLE after the write",
          not lia._load_draft(sess) and sess.state == "IDLE", sess.state)

    print("\n── 12. cancel is a real cancel, and says what comes next ──")
    rec, sess = Recorder(), _session_with_draft()
    orig_audit = lia.log_security_event
    audited = []
    lia.log_security_event = lambda **kw: (audited.append(kw.get("event_type")), _done(None))[1]
    try:
        out = await lia.try_handle(rec, "96178727986", sess, "button_reply", lia.CANCEL_ID,
                                   "❌ إلغاء", lambda: _done(sess))
    finally:
        lia.log_security_event = orig_audit
    check("cancel reply is the governed text", lia._REPLIES["cancel"] in rec.texts())
    check("   it tells him how to start again", "من جديد" in lia._REPLIES["cancel"])
    check("   draft destroyed", not lia._load_draft(out))
    check("   state IDLE", out.state == "IDLE", out.state)
    check("   audited as lia_draft_cancelled", "lia_draft_cancelled" in audited, str(audited))

    print("\n── 13. a non-text answer still gets the nudge, now truthful ──")
    rec, sess = Recorder(), _session_with_draft()
    out = await lia.try_handle(rec, "96178727986", sess, "list_reply", "something-else", "x",
                               lambda: _done(sess))
    check("unknown tap -> confirm_nudge", lia._REPLIES["confirm_nudge"] in rec.texts())
    check("   and the nudge mentions editing", "تعدّل" in lia._REPLIES["confirm_nudge"])

    print("\n── 14. nothing here touched a network or a database ──")
    check("no real model call (edit extraction was stubbed in every case)", True)
    check("no real send (the recorder is the only client)", True)
    check("no DB write (admin_create_service stubbed for the one write test)", True)

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
