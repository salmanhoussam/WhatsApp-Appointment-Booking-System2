"""Lia S3 — `create_product` through the existing store write path.

Run:  venv/bin/python scripts/test_lia_product_s3.py

WHAT THIS PROVES, AND WHY EACH ONE COULD HAVE GONE WRONG

    S1 (`scripts/test_lia_product_s1.py`) proved the WRITE is correct. This file proves the
    OPERATION around it is correct, which is a different claim and a larger one:

      S3-AC-1   the definition is read off `admin/store.py`, not chosen -- and it is NOT
                `create_catalog_item`'s, whose capability is inactive on every live tenant
      S3-AC-2   the cheap gate names the operation, and holds no dictionary of product names
      S3-AC-3   D9's order survives a second operation: C -> ① -> [operation] -> A -> B -> model
      S3-AC-4   A is the operation's OWN key -- `store`, so mr-h is refused and rk is not
      S3-AC-5   B is independent in BOTH directions, on two real permission-based accounts
      S3-AC-6   a legacy MANAGER_UNITS may write a catalog item and may NOT write a product
      S3-AC-7   the product contract has no duration, and cannot acquire one
      S3-AC-8   the model cannot name an operation other than the one already authorised
      S3-AC-9   a draft written by the PREVIOUS deploy still completes
      S3-AC-10  a product is never asked how long it takes
      S3-AC-11  the preview shows no field the product does not have
      S3-AC-12  the category is resolved by PARTITION -- the one thing content-matching gets wrong
      S3-AC-13  four columns a chat message may not decide are not passed from the draft
      S3-AC-14  every owner-facing text lives in the prompt file, and the right one is sent
      S3-AC-15  the service path is byte-for-byte unchanged

NO NETWORK, NO DATABASE, NO MODEL CALLS, NO SENDS, NO WRITES.
    `prisma_client` and `admin_create_item` are replaced by recorders. The REAL
    `OperationDefinition`s, the REAL Pydantic contracts and the REAL `_advance`/`_preview_text`/
    `_write_product` are exercised -- faking those would test the fakes, which is the one thing
    `feedback_assert_on_code_not_text` and the 2026-09-13 stub lesson both warn about.

ASSERTIONS ABOUT WHAT THE SOURCE DOES NOT DO PARSE THE CODE, never the file. A comment explaining
a deliberate omission contains the very name being forbidden -- that failed three times in one
day on 2026-09-16. The helpers are imported from `test_lia_foundation`.
"""
import asyncio
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# `lia_owner_entry` first: importing `app.core.permissions` alone trips a real circular import
# (permissions -> core.tenant -> db -> dependencies -> core.tenant).
from app.services import lia_owner_entry as lia                        # noqa: E402
from app.services import catalog_service, lia_operations as ops        # noqa: E402
from app.schemas.lia_drafts import (                                   # noqa: E402
    LiaExtraction, LiaProductDraft, LiaProductExtraction, LiaServiceDraft,
)
from app.services.whatsapp_flow import (                               # noqa: E402
    ConversationSession, _session_from_row, _session_to_state_data,
)
from test_lia_foundation import (                                      # noqa: E402
    FakeUser, code_of_function, code_only, install, BL, MRH, RK, MANAGER_RES, OWNER_BL,
    SHOP_MANAGER,
)

ok = True


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


def _done(v):
    f = asyncio.get_event_loop().create_future()
    f.set_result(v)
    return f


class Recorder:
    def __init__(self):
        self.sent = []

    async def send_text(self, to, text):
        self.sent.append(("text", text))

    async def send_interactive_buttons(self, to, text, buttons):
        self.sent.append(("buttons", text))

    def texts(self):
        return [t for _k, t in self.sent]


class _Row:
    def __init__(self, step, client_id, state_data):
        self.step, self.clientId, self.stateData = step, client_id, state_data


class FakeCategory:
    def __init__(self, cid, client_id, module_key, name, active=True):
        self.id, self.clientId, self.moduleKey = cid, client_id, module_key
        self.nameAr, self.isActive = name, active


class CategoryPrisma:
    """`catalogcategory.find_many` + `catalogitem.count`, honouring the real `where` keys."""

    def __init__(self, cats, item_counts=None):
        self._cats, self._counts = cats, item_counts or {}

    class _Cats:
        def __init__(self, cats): self._c = cats

        async def find_many(self, where):
            out = []
            for c in self._c:
                if c.clientId != where.get("clientId"):
                    continue
                if where.get("isActive") is True and not c.isActive:
                    continue
                if "moduleKey" in where and c.moduleKey != where["moduleKey"]:
                    continue
                out.append(c)
            return out

    class _Items:
        def __init__(self, counts): self._n = counts

        async def count(self, where):
            return self._n.get(where.get("categoryId"), 0)

    @property
    def catalogcategory(self):
        return CategoryPrisma._Cats(self._cats)

    @property
    def catalogitem(self):
        return CategoryPrisma._Items(self._counts)


PRODUCT_DATA = {"name_ar": "شامبو كيراتين", "price": 12.0, "currency": "USD"}


def _product_session(data=None, state=None, operation="create_product"):
    s = ConversationSession(state=state or lia.LIA_AWAITING_CONFIRM, client_id=BL)
    draft = {
        "client_id": BL, "actor": "owner", "actor_id": "u-bl",
        "category_id": "cat-store", "category_name": "منتجات العناية",
        "data": dict(PRODUCT_DATA if data is None else data), "asking": None,
        "started_at": "2999-01-01T00:00:00+00:00",
    }
    if operation:
        draft["operation"] = operation
    else:                                   # a draft written by the PREVIOUS deploy
        draft["intent"] = "create_service"
    lia._save_draft(s, draft)
    return _session_from_row(_Row(s.state, s.client_id, _session_to_state_data(s)))


async def main():
    # S7: `_advance` now asks whether this product name already exists, through
    # `catalog_service.admin_list_items`. Every `_advance` case below means "a shop with no
    # matching product", so the read is stubbed empty here and overridden where a duplicate is
    # the point. Leaving it unstubbed reaches the REAL prisma client -- which is how this suite
    # started crashing instead of failing.
    _orig_list_items = catalog_service.admin_list_items
    catalog_service.admin_list_items = lambda *a, **kw: _done([])

    OP_PRODUCT = ops.get("create_product")
    OP_ITEM = ops.get("create_catalog_item")
    OP_SERVICE = ops.get("create_service")

    # ── S3-AC-1 · the definition is READ, not chosen ─────────────────────────
    print("── S3-AC-1. the operation definition mirrors admin/store.py verbatim ──")
    route = open("app/api/v1/admin/store.py", encoding="utf-8").read()
    m = re.search(r'require_permission\(\s*"store\.write"([^)]*)\)', route)
    route_roles = tuple(re.findall(r'"([A-Z_]+)"', m.group(1))) if m else ()
    check("legacy roles are the route's own tuple, copied not re-derived",
          OP_PRODUCT.legacy_roles == route_roles, f"{OP_PRODUCT.legacy_roles} vs {route_roles}")
    check("permission is store.write", OP_PRODUCT.permission == "store.write")
    check("capability key is `store`, and the route agrees",
          OP_PRODUCT.service_key == "store"
          and 'require_service("store")' in route)
    check("   NOT create_catalog_item's definition — different key, different permission",
          OP_PRODUCT.service_key != OP_ITEM.service_key
          and OP_PRODUCT.permission != OP_ITEM.permission)
    check("   yet the SAME write function object — the table writes, the route authorises",
          OP_PRODUCT.write_fn() is OP_ITEM.write_fn()
          and OP_PRODUCT.write_fn() is catalog_service.admin_create_item)
    check("MANAGER_UNITS is in the catalog tuple and NOT in the store tuple",
          "MANAGER_UNITS" in OP_ITEM.legacy_roles
          and "MANAGER_UNITS" not in OP_PRODUCT.legacy_roles)

    # ── S3-AC-2 · the cheap gate names the operation ─────────────────────────
    print("\n── S3-AC-2. the entry gate — a required generic noun, never a product dictionary ──")
    cases = [
        ("ضيف خدمة كيراتين بـ25 دولار", "create_service"),
        ("ضيف منتج شامبو كيراتين بـ12 دولار", "create_product"),
        ("زيد بضاعة جل شعر 8 دولار", "create_product"),
        ("add product shampoo 12", "create_product"),
        ("ضيف صنف جديد مشط بـ3 دولار", "create_product"),
        ("ضيف خدمة وبضاعة", lia._AMBIGUOUS),
        # 🔴 TRANSITION, S7 (2026-09-17). This returned None — TOTAL SILENCE — until the live
        # test made the cost visible: Salman wrote «ضيف ماكينة حلاقة 20 دولار» four times and
        # got nothing back, because the noun was in neither list. It is now a QUESTION. The
        # dictionary of product names is still refused; what changed is that the gate hands an
        # unreadable family to the ambiguity branch instead of dropping the message.
        ("ضيف شامبو كيراتين بـ12 دولار", lia._AMBIGUOUS),
        ("مرحبا", None),
        ("بدي احجز دقن بكرا", None),                  # a customer, untouched — still silent
        ("سجل إنه أحمد إجا مبارح", None),             # a RECORD verb stays narrow until T4
        ("ضيف", None),                                # too short
        ("ضيف واحد", lia._INCOMPLETE),                # mine, but empty -> guided, not ignored
    ]
    for text, want in cases:
        got = lia._entry_family(text)
        check(f"{text[:34]!r:38} -> {want}", got == want, f"got {got}")
    gate_src = code_of_function("app/services/lia_owner_entry.py", "_entry_family")
    check("the gate holds NO product-name dictionary (asserted on code, not on the file)",
          not any(w in gate_src for w in ("شامبو", "جل", "مشط", "كريم")))
    check("   ambiguity is its own value, never a silent preference for the live operation",
          "_AMBIGUOUS" in gate_src and "return 'create_service'" in gate_src
          and gate_src.index("_AMBIGUOUS") < gate_src.index("return 'create_service'"))

    # ── S3-AC-3 · D9's order with a second operation ─────────────────────────
    print("\n── S3-AC-3. D9 order: C -> ① -> [operation] -> A/B -> model ──")
    th = code_of_function("app/services/lia_owner_entry.py", "try_handle")
    i_family = th.index("family = _entry_family(value)")
    i_actor = th.index("_resolve_actor(sender_phone)", i_family)
    i_lia = th.index("_tenant_has_lia(client_id)", i_family)
    i_op = th.index("lia_operations.get(family)")
    i_auth = th.index("_authorise_operation(client_id, user, op)")
    # S7 renamed the argument: the extraction reads `entry_text`, which is the ORIGINAL request
    # when the message being handled is an answer to the family question. Asserting on the old
    # spelling made this suite CRASH rather than fail — see the harness note in the session log.
    i_model = th.index("_extract_product(entry_text)")
    check("the gate runs before the tenant is even read (no model, no DB for a stranger)",
          i_family < i_actor)
    check("C before ①", i_actor < i_lia)
    check("① before the operation is looked up", i_lia < i_op)
    check("the operation is KNOWN before A and B", i_op < i_auth)
    check("A and B before the model is called — every time", i_auth < i_model)
    check("the ambiguity question is asked AFTER ① and BEFORE the operation lookup",
          i_lia < th.index("_REPLIES['entry_ambiguous']") < i_op)
    check("no literal operation name survives in try_handle's entry path",
          'lia_operations.get("create_service")' not in th
          and "lia_operations.get('create_service')" not in th)

    # ── S3-AC-4 · A — the operation's OWN capability key ─────────────────────
    print("\n── S3-AC-4. A: `store`, measured on the three live tenants ──")
    r = install()
    try:
        for cid, label, want in ((RK, "rk (store active)", (True, "ok")),
                                 (BL, "barberlab-test (store active)", (True, "ok")),
                                 (MRH, "mr-h (NO store row)", (False, "capability_inactive"))):
            got = await lia._authorise_operation(cid, FakeUser("u", cid), OP_PRODUCT)
            check(f"create_product on {label}", got == want, str(got))
        # The same three tenants, the SAME accounts, the OTHER operation: the keys are separate.
        got = await lia._authorise_operation(MRH, FakeUser("u", MRH), OP_SERVICE)
        check("   and create_service on mr-h is ALLOWED — one refusal is not the other",
              got == (True, "ok"), str(got))
        got = await lia._authorise_operation(RK, FakeUser("u", RK), OP_ITEM)
        check("   and create_catalog_item on rk is REFUSED — `catalog` is inactive there",
              got == (False, "capability_inactive"), str(got))
    finally:
        r()

    # ── S3-AC-5 · B — independent in both directions, on real accounts ───────
    print("\n── S3-AC-5. B: a permission for one operation is not a permission for another ──")
    r = install()
    try:
        got = await lia._authorise_operation(BL, MANAGER_RES, OP_PRODUCT)
        check("reservations.write holder is REFUSED a product (B ⇏ B)",
              got == (False, "missing_permission"), str(got))
        got = await lia._authorise_operation(BL, SHOP_MANAGER, OP_PRODUCT)
        check("store.write holder is ALLOWED a product", got == (True, "ok"), str(got))
        got = await lia._authorise_operation(BL, SHOP_MANAGER, OP_SERVICE)
        check("   and the SAME holder is REFUSED a service — the other direction",
              got == (False, "missing_permission"), str(got))
    finally:
        r()

    # ── S3-AC-6 · legacy accounts, where invariant I1 actually bites ─────────
    print("\n── S3-AC-6. a LEGACY account is judged by the route's own tuple (I1) ──")
    r = install()
    try:
        got = await lia._authorise_operation(BL, OWNER_BL, OP_PRODUCT)
        check("legacy TENANT_ADMIN (permissions IS NULL) may write a product",
              got == (True, "ok"), str(got))
        units = FakeUser("u-units", BL, role="MANAGER_UNITS", permissions=None)
        got_item = await lia._authorise_operation(RK, FakeUser("u-units", RK,
                                                               role="MANAGER_UNITS"), OP_ITEM)
        got_prod = await lia._authorise_operation(BL, units, OP_PRODUCT)
        check("legacy MANAGER_UNITS is refused a PRODUCT (store.py admits no MANAGER_UNITS)",
              got_prod == (False, "missing_permission"), str(got_prod))
        check("   and is refused the catalog item only by its CAPABILITY, not its role — "
              "proving the role would have passed there", got_item[1] == "capability_inactive",
              str(got_item))
    finally:
        r()

    # ── S3-AC-7 · the product contract ───────────────────────────────────────
    print("\n── S3-AC-7. LiaProductDraft — one absence is the whole point ──")
    check("no duration field exists on the contract at all",
          "duration_min" not in LiaProductDraft.model_fields
          and "duration_min" in LiaServiceDraft.model_fields)
    p = LiaProductDraft.model_validate(PRODUCT_DATA)
    check("a real product validates", p.name_ar == "شامبو كيراتين" and p.price == 12.0)
    for bad, why in (({**PRODUCT_DATA, "price": 0}, "a zero price"),
                     ({**PRODUCT_DATA, "price": -5}, "a negative price"),
                     ({**PRODUCT_DATA, "name_ar": "ش"}, "a one-letter name"),
                     ({**PRODUCT_DATA, "currency": "EUR"}, "an unknown currency")):
        try:
            LiaProductDraft.model_validate(bad)
            check(f"{why} is refused", False, "it was accepted")
        except Exception:
            check(f"{why} is refused", True)
    merged = LiaProductDraft.model_validate({**PRODUCT_DATA, "duration_min": 60})
    check("a duration slipped into a product draft is DROPPED, never written",
          not hasattr(merged, "duration_min"))

    # ── S3-AC-8 · the model cannot rename the operation ──────────────────────
    print("\n── S3-AC-8. the authorised operation and the named one cannot diverge ──")
    good = '{"intent":"create_product","confidence":"high","data":{"name_ar":"شامبو","price":12}}'
    check("the product prompt's own answer validates",
          LiaProductExtraction.model_validate_json(good).intent == "create_product")
    for raw, why in (
        ('{"intent":"create_service","confidence":"high","data":{}}',
         "a product extraction claiming create_service"),
        ('{"intent":"create_product","confidence":"high","data":{},"quantity":5}',
         "an invented top-level field"),
    ):
        try:
            LiaProductExtraction.model_validate_json(raw)
            check(f"{why} is refused", False, "it was accepted")
        except Exception:
            check(f"{why} is refused", True)
    try:
        LiaExtraction.model_validate_json(
            '{"intent":"create_product","confidence":"high","data":{}}')
        check("a SERVICE extraction claiming create_product is refused", False, "accepted")
    except Exception:
        check("a SERVICE extraction claiming create_product is refused", True)

    # ── S3-AC-9 · a draft from the previous deploy ───────────────────────────
    print("\n── S3-AC-9. a draft written before S3 still completes ──")
    check("a pre-S3 draft (intent only) reads as create_service",
          lia._draft_operation({"intent": "create_service"}) == "create_service")
    check("a draft with neither key falls back to the one operation that always existed",
          lia._draft_operation({}) == "create_service")
    check("`operation` wins when both are present",
          lia._draft_operation({"operation": "create_product",
                                "intent": "create_service"}) == "create_product")
    req, qs, cls = lia._op_spec("create_product")
    check("product spec: two required fields, no duration question, product contract",
          req == ("name_ar", "price") and "duration_min" not in qs and cls is LiaProductDraft)
    req, qs, cls = lia._op_spec("create_service")
    check("service spec is untouched",
          req == ("name_ar", "price", "duration_min") and cls is LiaServiceDraft)

    # ── S3-AC-10 · a product is never asked for a duration ───────────────────
    print("\n── S3-AC-10. _advance asks the product's own questions ──")
    rec, sess = Recorder(), _product_session(data={"name_ar": "شامبو كيراتين"})
    await lia._advance(rec, "96178727986", sess, lia._load_draft(sess))
    check("it asks for the price, in the product's wording",
          rec.texts() == ["قدّيش سعره؟ (بالدولار)"], str(rec.texts()))
    check("   and never for a duration", not any("وقت" in t or "دقايق" in t
                                                 for t in rec.texts()))
    check("   and the state parks on the field question",
          sess.state == lia.LIA_AWAITING_FIELD and lia._load_draft(sess)["asking"] == "price")
    rec, sess = Recorder(), _product_session()
    await lia._advance(rec, "96178727986", sess, lia._load_draft(sess))
    check("a complete product draft goes straight to the preview",
          sess.state == lia.LIA_AWAITING_CONFIRM and len(rec.sent) == 2)

    # ── S3-AC-11 · the preview shows nothing the product lacks ───────────────
    print("\n── S3-AC-11. the preview ──")
    pv = lia._preview_text(PRODUCT_DATA, "منتجات العناية", "create_product")
    check("it names the product, not 'الخدمة'", "*المنتج:*" in pv and "*الخدمة:*" not in pv)
    check("   no duration line at all", "المدة" not in pv)
    check("   the price and category are quoted back verbatim",
          "12.0 USD" in pv and "منتجات العناية" in pv)
    sv = lia._preview_text({"name_ar": "بروتين", "price": 30.0, "duration_min": 45,
                            "currency": "USD"}, "الخدمات")
    check("the SERVICE preview is unchanged — label, duration line and order",
          sv.splitlines()[2:6] == ["*الخدمة:*  بروتين", "*السعر:*   30.0 USD",
                                   "*المدة:*   45 دقيقة", "*الفئة:*   الخدمات"],
          repr(sv.splitlines()[2:6]))

    # ── S3-AC-12 · the category is resolved by PARTITION ─────────────────────
    print("\n── S3-AC-12. the store category — partition, not content ──")
    SERVICES_CAT = FakeCategory("cat-services", BL, "catalog", "الخدمات")
    STORE_CAT = FakeCategory("cat-store", BL, "store", "منتجات العناية")
    orig_prisma = lia.prisma_client
    try:
        # THE mr-h TRAP, reproduced: an item sitting inside the SERVICES category. A resolver that
        # asked "which category holds items?" would answer with the booking surface.
        lia.prisma_client = CategoryPrisma([SERVICES_CAT, STORE_CAT],
                                           {"cat-services": 1, "cat-store": 0})
        cid, cats = await lia._resolve_store_category(BL)
        check("an item inside the SERVICES category does not make it the store category",
              cid == "cat-store", f"{cid} of {[c.nameAr for c in cats]}")

        lia.prisma_client = CategoryPrisma([SERVICES_CAT])
        cid, cats = await lia._resolve_store_category(BL)
        check("a tenant with no store partition resolves to nothing -> ask, never invent",
              (cid, cats) == (None, []))

        A = FakeCategory("a", BL, "store", "عناية")
        B = FakeCategory("b", BL, "store", "أدوات")
        lia.prisma_client = CategoryPrisma([A, B], {"a": 5, "b": 0})
        cid, cats = await lia._resolve_store_category(BL)
        check("two shelves, one already holding products -> that one", cid == "a")
        lia.prisma_client = CategoryPrisma([A, B], {"a": 5, "b": 3})
        cid, cats = await lia._resolve_store_category(BL)
        check("two shelves both holding products -> ask, and both are offered",
              cid is None and len(cats) == 2)
        lia.prisma_client = CategoryPrisma([FakeCategory("z", BL, "store", "x", active=False)])
        cid, cats = await lia._resolve_store_category(BL)
        check("an INACTIVE store category is not a store category", (cid, cats) == (None, []))
    finally:
        lia.prisma_client = orig_prisma
    src = code_of_function("app/services/lia_owner_entry.py", "_resolve_store_category")
    check("the resolver filters by moduleKey (asserted on code)",
          "'moduleKey': 'store'" in src)
    check("   and never creates a category",
          "create" not in src and "upsert" not in src)

    # ── S3-AC-13 · what the write is, and is not, given ──────────────────────
    print("\n── S3-AC-13. the write — the real function, and four columns withheld ──")
    calls = []

    async def fake_item(**kw):
        calls.append(kw)
        return {"id": "item-new", **kw}

    orig_item, orig_prisma = catalog_service.admin_create_item, lia.prisma_client
    lia.catalog_service = type("M", (), {"admin_create_item": staticmethod(fake_item)})()
    lia.prisma_client = CategoryPrisma([STORE_CAT], {"cat-store": 0})
    try:
        rec = Recorder()
        created = await lia._write_product(rec, "96178727986", BL,
                                           LiaProductDraft.model_validate(PRODUCT_DATA))
    finally:
        lia.catalog_service = catalog_service
        lia.prisma_client = orig_prisma
        catalog_service.admin_create_item = orig_item

    kw = calls[0] if calls else {}
    check("the write happened", bool(calls) and created and created.get("id") == "item-new")
    check("   clientId is carried (tenant isolation)", kw.get("client_id") == BL)
    check("   the category came from the RESOLVER, not from the draft or the model",
          kw.get("category_id") == "cat-store")
    check("   name, price and currency survive untouched",
          kw.get("name_ar") == "شامبو كيراتين" and kw.get("price") == 12.0
          and kw.get("currency") == "USD")
    check("   NO duration is passed under any spelling",
          not any("duration" in k for k in kw))
    for field, value in (("image_url", None), ("metadata", None),
                         ("is_featured", False), ("sort_order", 0)):
        check(f"   {field} is withheld from the chat — passed as {value!r}",
              kw.get(field) == value and kw[field] is not True)
    check("   isActive is NOT passed at all — the service layer owns it (S1)",
          "is_active" not in kw and "isActive" not in kw)
    joined = " ".join(rec.texts())
    check("the owner is told it is live, and told where the image goes",
          "شامبو كيراتين" in joined and lia._REPLIES["product_created_note"] in joined)

    # ── S3-AC-14 · every owner-facing text lives in the prompt file ──────────
    print("\n── S3-AC-14. the five new texts, and the refusal that used to lie ──")
    for key in ("store_inactive", "product_no_category", "product_created_note",
                "product_unclear", "entry_ambiguous"):
        check(f"{key} loads and is not empty", bool(lia._REPLIES.get(key, "").strip()))
        check(f"   {key} is in _REQUIRED_REPLIES, so a missing one fails startup",
              key in lia._REQUIRED_REPLIES)
    check("the store refusal does NOT say 'الحجوزات'",
          "الحجوزات" not in lia._REPLIES["store_inactive"])
    branch = code_of_function("app/services/lia_owner_entry.py", "try_handle")
    check("   and it is chosen by the OPERATION's key, not by the operation's name",
          "_REPLIES['store_inactive'] if op.service_key == 'store'" in branch)
    check("the product 'did not understand' example is a product, not a service with a duration",
          "منتج" in lia._REPLIES["product_unclear"]
          and "ساعة" not in lia._REPLIES["product_unclear"])

    # ── S3-AC-15 · the live service path is untouched ────────────────────────
    print("\n── S3-AC-15. zero change to the operation that is already in production ──")
    import hashlib
    h = hashlib.sha256(lia._SYSTEM_PROMPT.encode()).hexdigest()
    check("the service prompt is still byte-identical (893 chars, 778a4462…)",
          len(lia._SYSTEM_PROMPT) == 893 and h.startswith("778a4462"),
          f"{len(lia._SYSTEM_PROMPT)} chars {h[:16]}")
    check("the product prompt is a SEPARATE block that loads",
          len(lia._PRODUCT_PROMPT) > 100 and lia._PRODUCT_PROMPT != lia._SYSTEM_PROMPT)
    check("   and it forbids a duration in so many words",
          "duration_min" in lia._PRODUCT_PROMPT and "لا حقل مدة" in lia._PRODUCT_PROMPT)
    check("the service field questions are unchanged",
          lia._FIELD_QUESTIONS == {"price": "قدّيش سعرها؟ (بالدولار)",
                                   "duration_min": "وقدّيش بتاخد وقت؟ (بالدقائق، أو قول «ساعة»)",
                                   "name_ar": "شو اسم الخدمة؟"})
    check("the old service-only gate is GONE, not kept as a caller-less twin",
          not hasattr(lia, "_looks_like_service_entry")
          and "_looks_like_service_entry" not in code_only("app/services/lia_owner_entry.py"))
    check("   and _entry_family answers the service question exactly as it did",
          lia._entry_family("ضيف خدمة كيراتين بـ25 دولار") == "create_service"
          and lia._entry_family("ضيف خ") is None                     # under 6 chars, as before
          and lia._entry_family("خدمة كيراتين 25") is None)          # no verb, as before
    ws = code_of_function("app/services/lia_owner_entry.py", "_write_service")
    check("the service write still calls admin_create_service by name",
          "catalog_service_service.admin_create_service" in ws and "duration_min=" in
          ws.replace(" ", ""))

    # ── nothing was written, sent or dialled ─────────────────────────────────
    print("\n── nothing here touched a network, a database or a send ──")
    check("admin_create_item is the real function again",
          catalog_service.admin_create_item is orig_item)
    check("lia.prisma_client is restored", lia.prisma_client is orig_prisma)

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
