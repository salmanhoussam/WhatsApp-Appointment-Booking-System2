"""Gate ① — Lia S7 Phase A against REAL barberlab-test data. READ ONLY.

Salman's explicit approval, 2026-09-18: production READ only, the real `try_handle` on the real
data, the «مشط خشب» duplicate check, and category/name resolution as the functions really do it.
FORBIDDEN and made IMPOSSIBLE below: any production write, any WhatsApp send.

HOW THE WRITE BAN IS ENFORCED -- at the PRISMA boundary, not the service boundary.
    Stubbing `catalog_service.admin_create_item` would only block the write path I already expect.
    This seals create/update/upsert/delete on EVERY model and both raw-exec methods, so a write
    from a path I did NOT predict raises loudly instead of succeeding quietly.
    One such path was found while writing this: `log_security_event` inserts a real
    `securityauditlog` row on every authorisation decision. It is sealed too.

THE ONE THING THAT IS REAL AND EXTERNAL: `_extract_product` calls Anthropic. Kept real on
purpose -- a stub would test my idea of the extraction instead of the extraction. It is a model
read; it writes nothing anywhere.
"""
import asyncio, os, sys

ROOT = "/home/musicmaster/Downloads/WhatsApp-Appointment-Booking-System2-main"
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import _db_target                                                          # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=False)

from app.db.client import prisma_client                                    # noqa: E402
from app.services import catalog_service                                   # noqa: E402
from app.services import lia_owner_entry as lia                            # noqa: E402

SLUG  = "barberlab-test"
PHONE = "96178727986"          # Salman's own number, per the standing test rule.

_WRITES = ("create", "create_many", "update", "update_many", "upsert", "delete", "delete_many")
attempted = []


class WriteAttempted(RuntimeError):
    pass


def seal(client):
    """Seal the write methods on every `prisma.actions.*Actions` CLASS.

    The first version set them on the model INSTANCES (`prisma_client.barber`) and Prisma refused
    -- those objects are immutable. The script aborted instead of continuing, which is the only
    acceptable outcome for a half-applied write ban. Class level works, and is in fact stronger:
    it covers every instance, including one obtained later from somewhere I did not think of.
    """
    import prisma.actions as pactions
    sealed = 0
    for cls_name in dir(pactions):
        cls = getattr(pactions, cls_name)
        if not isinstance(cls, type) or not cls_name.endswith("Actions"):
            continue
        for meth in _WRITES:
            if not hasattr(cls, meth):
                continue
            def raiser(*a, _m=f"{cls_name}.{meth}", **kw):
                attempted.append(_m)
                raise WriteAttempted(_m)
            try:
                setattr(cls, meth, raiser)
                sealed += 1
            except Exception as exc:
                print(f"  🔴 COULD NOT SEAL {cls_name}.{meth} ({exc}) — aborting")
                sys.exit(2)
    # Raw execution and batching bypass the actions entirely.
    for meth in ("execute_raw", "execute_raw_unsafe", "batch_"):
        if hasattr(type(client), meth):
            def raiser(*a, _m=meth, **kw):
                attempted.append(_m)
                raise WriteAttempted(_m)
            try:
                setattr(type(client), meth, raiser)
                sealed += 1
            except Exception as exc:
                print(f"  🔴 COULD NOT SEAL {meth} ({exc}) — aborting")
                sys.exit(2)
    return sealed


class Wa:
    """The send boundary. Records, never sends -- no network, no Meta, no token used."""

    def __init__(self):
        self.out = []

    async def send_text(self, phone, text):
        self.out.append(("text", text))

    # NAMED FROM THE SOURCE, NOT FROM MEMORY. The first version of this recorder defined
    # `send_buttons`, the real service defines `send_interactive_buttons`, and the run died on
    # an AttributeError -- a fake POORER than reality, which is the third time this project has
    # paid for exactly that. The method list came from grepping `wa.<call>` in the module.
    async def send_interactive_buttons(self, to, text, buttons):
        self.out.append(("buttons", text,
                         tuple(b.get("reply", {}).get("id") for b in buttons),
                         tuple(b.get("reply", {}).get("title") for b in buttons)))

    def joined(self):
        return "\n".join(o[1] for o in self.out)


async def noop_audit(**kw):
    """`log_security_event` writes a real row. Recorded here instead."""
    audits.append(kw.get("event_type"))


audits = []


def line(label, value):
    print(f"  {label:<46} {value}")


async def main():
    print("\n── sealing every write path before connecting ──")
    await prisma_client.connect()
    sealed = seal(prisma_client)
    lia.log_security_event = noop_audit
    line("prisma write methods sealed", sealed)
    line("log_security_event", "replaced with a recorder")
    # Prove the seal actually bites, rather than trusting that it does.
    try:
        await prisma_client.catalogitem.create(data={"nameAr": "SEAL-TEST"})
        print("  🔴 THE SEAL DID NOT HOLD — stopping")
        return 2
    except WriteAttempted as e:
        line("seal verified by a real attempt", f"blocked: {e}")
    attempted.clear()

    print("\n── 1. the tenant, read ──")
    client = await prisma_client.client.find_first(where={"slug": SLUG})
    if client is None:
        print("  🔴 tenant not found"); return 2
    line("slug -> id", f"{client.slug} -> {client.id}")
    cid = client.id

    print("\n── 2. the shelves, as `_resolve_store_category` really reads them ──")
    cats = await catalog_service.admin_list_categories(cid, module_key="store")
    line("store categories", len(cats))
    for c in cats:
        line("   ·", f"{c.get('name_ar')!r}  id={c.get('id')}")
    resolved, store_cats = await lia._resolve_store_category(cid)
    line("_resolve_store_category ->", resolved)
    # `_resolve_store_category` hands back PRISMA MODELS, while `admin_list_categories` hands
    # back dicts -- worth writing down, since anything else reading both will meet it too.
    def g(o, k):
        return o.get(k) if isinstance(o, dict) else getattr(o, {"name_ar": "nameAr",
                                                               "module_key": "moduleKey"}.get(k, k), None)
    match = [g(c, "name_ar") for c in store_cats if g(c, "id") == resolved]
    line("   which is", match[0] if match else "🔴 an id not in the list")

    all_cats = await catalog_service.admin_list_categories(cid)
    line("ALL categories (any module)", len(all_cats))
    for c in all_cats:
        line("   ·", f"{c.get('name_ar')!r}  module={c.get('module_key')}")

    print("\n── 3. the items, and the duplicate D1 was about ──")
    items = await catalog_service.admin_list_items(cid)
    active = [i for i in items if i.get("is_active")]
    line("items (all / active)", f"{len(items)} / {len(active)}")
    folded = {}
    for i in active:
        folded.setdefault(lia._fold_ar(i.get("name_ar") or ""), []).append(i)
    dups = {k: v for k, v in folded.items() if len(v) > 1}
    line("ACTIVE duplicate names, folded", len(dups))
    for k, v in dups.items():
        line("   🔴", f"{k!r} ×{len(v)}  ids={[x.get('id') for x in v]}  "
                      f"prices={[x.get('price') for x in v]}")
    for i in active:
        line("   ·", f"{i.get('name_ar')!r}  {i.get('price')} {i.get('currency')}  "
                     f"shelf={i.get('category_name')!r}")

    print("\n── 4. `_find_existing_product` on the real rows ──")
    for probe in ("مشط خشب", "مشط خشب ", "مشط خشپ", "ماكينه حلاقه", "بلسم للشعر لا يوجد"):
        hit = await lia._find_existing_product(cid, probe)
        line(f"{probe!r}", f"{hit.get('name_ar')!r} id={hit.get('id')} "
                           f"shelf={hit.get('category_name')!r}" if hit else "no match")

    print("\n── 5. the REAL try_handle, real extraction, on the real data ──")
    for msg in ("ضيف منتج مشط خشب بـ5 دولار",
                "ضيف ماكينة حلاقة 20 دولار",
                "dif mantoj shampoo keratin b 12 dollar"):
        wa = Wa()
        sess = {"box": None}

        def ensure():
            from app.services.whatsapp_flow import ConversationSession
            fut = asyncio.get_event_loop().create_future()
            if sess["box"] is None:
                sess["box"] = ConversationSession(state="IDLE")
            fut.set_result(sess["box"])
            return fut

        try:
            out = await lia.try_handle(wa, PHONE, None, "text", msg, msg, ensure)
        except WriteAttempted as e:
            print(f"\n  🔴 «{msg}» ATTEMPTED A WRITE: {e}")
            continue
        print(f"\n  «{msg}»")
        line("   state", getattr(out, "state", out))
        line("   buttons", [o[2] for o in wa.out if o[0] == "buttons"])
        line("   titles", [o[3] for o in wa.out if o[0] == "buttons"])
        for o in wa.out:
            for ln in o[1].splitlines():
                print(f"      | {ln}")

    # ── 5b. The real extractor is REFUSED BY THIS MACHINE'S KEY (AuthenticationError above), so
    #        step 5 never reached the duplicate branch -- it reached the "unavailable" branch,
    #        which is itself worth seeing: the failure mode is a SENTENCE, not silence.
    #        To answer D1 end-to-end, the extraction alone is faked. THAT IS THE ONLY FAKE, and
    #        it is the one component whose real behaviour production already demonstrated on
    #        2026-09-17 (it created these very rows). Everything downstream -- the duplicate
    #        read, the category resolution, the buttons, the state -- is real, on real data.
    print("\n── 5b. same path, extraction faked because THIS MACHINE's key is refused ──")
    from app.schemas.lia_drafts import LiaProductExtraction

    def fake_extract(name, price):
        async def _f(text):
            return LiaProductExtraction.model_validate(
                {"intent": "create_product", "confidence": "high",
                 "data": {"name_ar": name, "price": price}, "unresolved": []})
        return _f

    for msg, name, price in (("ضيف منتج مشط خشب بـ5 دولار", "مشط خشب", 5.0),
                             ("ضيف منتج مشط خشب بـ5 دولار", "مشط خشب ", 5.0),
                             ("ضيف منتج شامبو كيراتين بـ12 دولار", "شامبو كيراتين", 12.0),
                             ("ضيف منتج بلسم جديد بـ9 دولار", "بلسم جديد", 9.0)):
        lia._extract_product = fake_extract(name, price)
        wa = Wa()
        box = {}

        def ensure():
            from app.services.whatsapp_flow import ConversationSession
            fut = asyncio.get_event_loop().create_future()
            box.setdefault("s", ConversationSession(state="IDLE"))
            fut.set_result(box["s"])
            return fut

        try:
            out = await lia.try_handle(wa, PHONE, None, "text", msg, msg, ensure)
        except WriteAttempted as e:
            print(f"\n  🔴 «{name}» ATTEMPTED A WRITE: {e}")
            continue
        print(f"\n  «{msg}»   (extracted name {name!r})")
        line("   state", getattr(out, "state", out))
        line("   buttons", [o[2] for o in wa.out if o[0] == "buttons"])
        line("   titles", [o[3] for o in wa.out if o[0] == "buttons"])
        for o in wa.out:
            for ln in o[1].splitlines():
                print(f"      | {ln}")

    print("\n── 6. what left this process ──")
    line("production writes ATTEMPTED", len(attempted) or "0")
    line("   (any non-zero is a finding)", attempted or "none")
    line("audit rows that WOULD have been written", f"{len(audits)}: {audits}")
    line("WhatsApp sends", "0 — the send boundary is a recorder")
    await prisma_client.disconnect()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
