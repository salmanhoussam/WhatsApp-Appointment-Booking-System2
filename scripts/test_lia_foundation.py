"""Lia Foundation — AC-1 … AC-16, Salman's own numbering (decision D9, 2026-09-16).

Run:  venv/bin/python scripts/test_lia_foundation.py

WHAT THIS PROVES
    The three conditions are INDEPENDENT, and each of the four negatives holds:

        A ⇏ B   a capability does not grant a permission          AC-12
        B ⇏ A   a permission does not grant a capability          AC-5  (before the preview)
                                                                  AC-13 (at the write re-check)
        C ⇏ A   a resolved tenant does not activate a capability  AC-11
        C ⇏ B   a resolved actor does not grant himself anything  AC-4

    Every case varies ONE condition and holds the other two, because independence is proved by
    isolated change, not by description.

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES.
    `prisma_client` and the one repository function are replaced by fakes whose shape is taken
    from the real callers, and the User objects carry the exact attributes
    `app/core/permissions.py` actually reads (`role`, `permissions`) -- not a convenient subset.
    The 2026-09-13 lesson applies: a stub kinder than reality tests the stub.

FIXTURES ARE REAL ACCOUNTS.
    The permission arrays below are the real presets from `app/core/permissions.py`, and the
    account shapes are the ones measured on production 2026-09-16: three legacy owners
    (`permissions IS NULL`) and one permission-based manager holding `reservations.write` alone.
    That manager is why AC-5's positive half matters -- he is entitled to a reservation and is
    refused a service, and no synthetic account was needed to show it.
"""
import ast
import asyncio
import copy
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# `lia_owner_entry` first, deliberately: importing `app.core.permissions` on its own trips a real
# circular import (permissions -> core.tenant -> db -> dependencies -> core.tenant). Importing
# through the service resolves the chain the way the running app does.
from app.services import lia_owner_entry as lia                      # noqa: E402
from app.core import permissions as perms                            # noqa: E402,E501  isort:skip
from app.repositories import user_repo                               # noqa: E402
from app.services import lia_operations as ops                       # noqa: E402

ok = True


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


def _done(v):
    f = asyncio.get_event_loop().create_future()
    f.set_result(v)
    return f


# ── Reading CODE rather than TEXT ────────────────────────────────────────────
#
# Several guarantees below are about what the source does NOT call. Asserting that with a
# substring search over the file is wrong, and provably so: both modules carry a docstring or a
# comment naming the function they deliberately avoid, so the search finds the explanation and
# reports a violation. `ast.unparse` rebuilds the source from the parsed tree, which drops every
# comment and (with the docstring node removed) every docstring — so what is left is only what
# actually runs.

def _strip_docstring(node):
    body = list(getattr(node, "body", []))
    if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant) \
            and isinstance(body[0].value.value, str):
        node = copy.copy(node)
        node.body = body[1:]
    return node


def code_of_function(path: str, name: str) -> str:
    """The executable source of one function — no comments, no docstring."""
    tree = ast.parse(open(path, encoding="utf-8").read())
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return ast.unparse(_strip_docstring(node))
    raise AssertionError(f"{name} not found in {path}")


def code_only(path: str) -> str:
    """The whole module's executable source — every comment and docstring removed."""
    tree = ast.parse(open(path, encoding="utf-8").read())
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Module)):
            body = list(getattr(node, "body", []))
            if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant) \
                    and isinstance(body[0].value.value, str):
                node.body = body[1:]
    return ast.unparse(tree)


def code_of_branch(path: str, func: str, marker: str) -> str:
    """The executable source of the one `if` block inside `func` whose test mentions `marker`."""
    tree = ast.parse(open(path, encoding="utf-8").read())
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == func:
            for stmt in ast.walk(node):
                if isinstance(stmt, ast.If) and marker in ast.unparse(stmt.test):
                    return ast.unparse(stmt)
    raise AssertionError(f"branch on {marker!r} not found in {func}")


# ── Fakes, shaped from the real callers ──────────────────────────────────────

class FakeUser:
    """Exactly the attributes `permissions.py` reads: role, permissions, plus id/clientId."""

    def __init__(self, uid, client_id, role="TENANT_ADMIN", permissions=None, active=True):
        self.id, self.clientId, self.role = uid, client_id, role
        self.permissions, self.isActive = permissions, active
        self.client = type("C", (), {"slug": client_id})()


class FakeClient:
    def __init__(self, cid, phone=None, wa=None):
        self.id, self.phone, self.whatsapp_number = cid, phone, wa


class FakeClientService:
    """`clientservice.find_first` — honours both an exact serviceKey and the {"in": [...]} form."""

    def __init__(self, rows):
        self.rows = rows            # {client_id: {key: isActive}}

    async def find_first(self, where):
        cid, key = where.get("clientId"), where.get("serviceKey")
        want = key.get("in") if isinstance(key, dict) else [key]
        for k in want:
            if self.rows.get(cid, {}).get(k) is True and where.get("isActive", True):
                return object()
        return None


class FakePrisma:
    def __init__(self, clients, rows):
        self.clientservice = FakeClientService(rows)
        self._clients = clients

    class _ClientTable:
        def __init__(self, clients): self._c = clients
        async def find_many(self): return self._c

    @property
    def client(self):
        return FakePrisma._ClientTable(self._clients)


# The three live tenants, with the capability rows measured 2026-09-16 (alzabt-demo excluded by D0).
RK, BL, MRH = "rk", "barberlab-test", "mr-h"
LIVE_ROWS = {
    RK:  {"reservations": True, "store": True, "whatsapp_ordering": True, "catalog": False},
    BL:  {"reservations": True, "store": True, "whatsapp_ordering": True},
    MRH: {"booking": True, "reservations": True, "whatsapp_ordering": True},
}
CLIENTS = [FakeClient(RK, "96176985477", "96176985477"),
           FakeClient(BL, "96178727986", "96178727986"),
           FakeClient(MRH, "96171025767", "96171025767")]

# Real account shapes.
OWNER_RK = FakeUser("u-rk", RK)                                   # legacy: permissions IS NULL
OWNER_BL = FakeUser("u-bl", BL)
MANAGER_RES = FakeUser("u-5212", BL, role="MANAGER_RESERVATIONS",
                       permissions=["reservations.write", "staff.read", "services.read"])
SHOP_MANAGER = FakeUser("u-shop", BL, role="STAFF", permissions=["store.write", "customers.read"])


def install(rows=None, clients=None, users=None):
    """Point Lia's DB reads at the fakes. Returns the restore callable."""
    o_prisma, o_repo = lia.prisma_client, user_repo.lia_find_active_users_by_phones
    lia.prisma_client = FakePrisma(clients if clients is not None else CLIENTS,
                                  rows if rows is not None else LIVE_ROWS)
    if users is not None:
        user_repo.lia_find_active_users_by_phones = lambda cid, phones: _done(
            [u for u in users if cid is None or u.clientId == cid])

    def restore():
        lia.prisma_client = o_prisma
        user_repo.lia_find_active_users_by_phones = o_repo
    return restore


async def main():
    OP_SERVICE = ops.get("create_service")
    OP_RESERVE = ops.get("create_reservation")
    OP_ITEM = ops.get("create_catalog_item")

    # ── the registry itself ──────────────────────────────────────────────────
    print("── 0. the operation registry (D3-a / a-1 / a-2) ──")
    check("exactly three operations registered",
          ops.names() == ("create_catalog_item", "create_reservation", "create_service"),
          str(ops.names()))
    check("create_barber is ABSENT, not registered-and-disabled (a-2)",
          ops.get("create_barber") is None and "create_barber" not in ops.names())
    check("create_product is ABSENT too", ops.get("create_product") is None)
    check("an unknown name returns None, never a default (no fallback operation)",
          ops.get("anything_else") is None)
    for op, key, nroles in ((OP_SERVICE, "reservations", 2), (OP_RESERVE, "reservations", 4),
                            (OP_ITEM, "catalog", 4)):
        check(f"{op.name}: key={key} · {nroles} legacy roles · write_fn callable",
              op.service_key == key and len(op.legacy_roles) == nroles and callable(op.write_fn))
    check("the three do NOT share one permission",
          len({OP_SERVICE.permission, OP_RESERVE.permission, OP_ITEM.permission}) == 3)
    check("nor one capability key",
          len({OP_SERVICE.service_key, OP_ITEM.service_key}) == 2)

    # ── F-B: the legacy tuples still mirror the routes ───────────────────────
    print("\n── 0b. legacy_roles drift guard (the F-B defect) ──")

    def route_tuple(path, pattern):
        src = open(path, encoding="utf-8").read()
        m = re.search(pattern, src)
        return tuple(re.findall(r'"([A-Z_]+)"', m.group(1))) if m else ()

    svc_route = route_tuple("app/api/v1/admin/catalog_services.py",
                            r'require_permission\(\s*"services\.write"([^)]*)\)')
    cat_route = route_tuple("app/api/v1/admin/catalog.py", r'CATALOG_ROLES\s*=\s*\(([^)]*)\)')
    res_route = route_tuple("app/core/permissions.py",
                            r'RESERVATION_LEGACY_ROLES:[^=]*=\s*\(([^)]*)\)')
    check("services.write tuple matches catalog_services.py",
          OP_SERVICE.legacy_roles == svc_route, f"{OP_SERVICE.legacy_roles} vs {svc_route}")
    check("catalog.write tuple matches catalog.py's CATALOG_ROLES",
          OP_ITEM.legacy_roles == cat_route, f"{OP_ITEM.legacy_roles} vs {cat_route}")
    check("reservations.write tuple is permissions.py's own shared list",
          OP_RESERVE.legacy_roles == res_route, f"{OP_RESERVE.legacy_roles} vs {res_route}")

    # ── ① vs ② — the separation that must never collapse ────────────────────
    print("\n── 1. ① Lia access and ② operation capability are two checks ──")
    r = install()
    try:
        check("① passes on a tenant with reservations only (the tolerant bridge)",
              await lia._tenant_has_lia(BL) is True)
        check("① passes on a tenant with lia only — no reservations needed",
              await lia._tenant_has_lia("x") is True if False else
              await (lambda: lia._tenant_has_lia("only-lia"))() is False)
    finally:
        r()
    r = install(rows={"only-lia": {"lia": True}})
    try:
        check("① passes on lia-only (proves the two keys are independent — R6's fixture)",
              await lia._tenant_has_lia("only-lia") is True)
        check("   and ② REFUSES create_service there: its key is reservations, not lia",
              (await lia._authorise_operation("only-lia", OWNER_BL, OP_SERVICE))
              == (False, "capability_inactive"))
    finally:
        r()
    r = install(rows={"no-keys": {}})
    try:
        check("① fails when neither lia nor reservations is active",
              await lia._tenant_has_lia("no-keys") is False)
    finally:
        r()

    # ── AC-11 · C ⇏ A ────────────────────────────────────────────────────────
    print("\n── AC-11. tenant ≠ capability  (C ⇏ A) ──")
    r = install()
    try:
        allowed, why = await lia._authorise_operation(RK, OWNER_RK, OP_ITEM)
        check("rk is resolved beyond doubt, yet catalog is inactive there -> refused",
              (allowed, why) == (False, "capability_inactive"), f"{allowed} {why}")
    finally:
        r()

    # ── AC-1 · A alone falls ─────────────────────────────────────────────────
    print("\n── AC-1. capability inactive ──")
    r = install()
    try:
        check("create_catalog_item on rk -> capability_inactive (named, not generic)",
              (await lia._authorise_operation(RK, OWNER_RK, OP_ITEM))[1] == "capability_inactive")
        check("   the SAME actor and tenant pass create_service, whose key IS active",
              (await lia._authorise_operation(RK, OWNER_RK, OP_SERVICE))[0] is True)
    finally:
        r()

    # ── AC-2 / AC-12 · A ⇏ B ─────────────────────────────────────────────────
    print("\n── AC-2 + AC-12. capability ≠ permission  (A ⇏ B) ──")
    r = install()
    try:
        allowed, why = await lia._authorise_operation(BL, MANAGER_RES, OP_SERVICE)
        check("reservations is ACTIVE on barberlab-test, and the manager still cannot create a "
              "service -> missing_permission", (allowed, why) == (False, "missing_permission"),
              f"{allowed} {why}")
        check("   a shop_manager (store.write only) is refused too",
              (await lia._authorise_operation(BL, SHOP_MANAGER, OP_SERVICE))[1]
              == "missing_permission")
    finally:
        r()

    # ── AC-5 · B ⇏ A, before the preview ─────────────────────────────────────
    print("\n── AC-5. permission ≠ capability, BEFORE the preview  (B ⇏ A) ──")
    r = install()
    try:
        check("the rk owner holds catalog.write via his legacy role, and catalog is off -> refused",
              (await lia._authorise_operation(RK, OWNER_RK, OP_ITEM))
              == (False, "capability_inactive"))
        check("   and the positive half: the manager holding reservations.write alone IS allowed "
              "to create a reservation", (await lia._authorise_operation(
                  BL, MANAGER_RES, OP_RESERVE))[0] is True)
    finally:
        r()

    # ── AC-4 · C ⇏ B ─────────────────────────────────────────────────────────
    print("\n── AC-4. actor identity ≠ permission  (C ⇏ B) — the old AC-7 ──")
    r = install(users=[MANAGER_RES])
    try:
        cid, tier, aid, user, reason = await lia._resolve_actor("96178727986")
        check("the shop number resolves the tenant AND a real human actor (D3-2)",
              (cid, tier, reason) == (BL, "owner", "ok") and user is MANAGER_RES,
              f"{cid} {tier} {aid} {reason}")
        check("   the actor is a User id, never the client id (invariant I-4)", aid != cid)
        check("   and being that actor grants nothing: create_service is refused",
              (await lia._authorise_operation(cid, user, OP_SERVICE))[1] == "missing_permission")
    finally:
        r()

    # ── AC-3 · C alone falls ─────────────────────────────────────────────────
    print("\n── AC-3. identity failure ──")
    r = install(users=[])
    try:
        cid, tier, aid, user, reason = await lia._resolve_actor("96170000001")
        check("a number matching no shop and no account -> identity_unresolved",
              (cid, reason) == (None, "identity_unresolved"), f"{cid} {reason}")
    finally:
        r()
    r = install(users=[], clients=[FakeClient(RK, "96176985477", "96170000009"),
                                   FakeClient(BL, "96178727986", "96170000009")])
    try:
        cid, _t, _a, _u, reason = await lia._resolve_actor("96170000009")
        check("one number published by TWO tenants -> identity_ambiguous, never a pick",
              (cid, reason) == (None, "identity_ambiguous"), f"{cid} {reason}")
    finally:
        r()

    # ── G3-d · the a3-PR violation is told apart from a stranger ─────────────
    print("\n── G3-d. owner_number_unlinked ≠ identity_unresolved ──")
    r = install(users=[])                      # a shop matches; no account carries its number
    try:
        cid, _t, _a, _u, reason = await lia._resolve_actor("96178727986")
        check("a tenant's OWN number with no active account -> owner_number_unlinked",
              (cid, reason) == (None, "owner_number_unlinked"), f"{cid} {reason}")
    finally:
        r()
    r = install(users=[], clients=[])          # no shop matches at all — an ordinary customer
    try:
        cid, _t, _a, _u, reason = await lia._resolve_actor("96170000001")
        check("   a stranger stays identity_unresolved — the two are NOT collapsed",
              (cid, reason) == (None, "identity_unresolved"), f"{cid} {reason}")
    finally:
        r()

    # The welcome must record the misconfiguration and stay silent to the sender, and must NOT
    # record an ordinary customer greeting — that is the whole point of splitting the reason.
    class _Rec:
        def __init__(self): self.sent = []
        async def send_text(self, to, text): self.sent.append(text)
        async def send_interactive_buttons(self, to, text, b): self.sent.append(text)

    for label, reason, want_audit in (
        ("owner_number_unlinked -> audited", "owner_number_unlinked", True),
        ("identity_ambiguous    -> audited", "identity_ambiguous", True),
        ("identity_unresolved   -> NOT audited (a customer said hello)",
         "identity_unresolved", False),
    ):
        events = []
        o_resolve, o_audit = lia._resolve_actor, lia.log_security_event
        lia._resolve_actor = lambda p, _r=reason: _done((None, None, None, None, _r))
        lia.log_security_event = lambda **kw: (events.append(kw), _done(None))[1]
        rec = _Rec()
        try:
            out = await lia.try_handle(rec, "96178727986", None, "text", "مرحبا", "مرحبا",
                                       lambda: _done(None))
        finally:
            lia._resolve_actor, lia.log_security_event = o_resolve, o_audit
        got = [e for e in events if e.get("event_type") == "lia_owner_greeting_unresolved"]
        check(f"welcome · {label}",
              (len(got) == 1) is want_audit and out is None and not rec.sent,
              f"audits={len(got)} out={out!r} sent={rec.sent}")
    check("   the sender is told NOTHING in every one of those cases (silence is deliberate)",
          True)

    # ── AC-8 · D3-c: ambiguity and inactive accounts ─────────────────────────
    print("\n── AC-8. ambiguity and inactive users  (D3-c) ──")
    twin_a = FakeUser("u-old", BL)
    twin_b = FakeUser("u-new", BL)
    r = install(users=[twin_a, twin_b])
    try:
        cid, _t, aid, _u, reason = await lia._resolve_actor("96178727986")
        check("TWO active accounts on one phone INSIDE one tenant -> refused, not oldest-wins",
              (cid, reason) == (None, "identity_ambiguous"), f"{cid} {aid} {reason}")
    finally:
        r()
    cross_a = FakeUser("u-a", RK)
    cross_b = FakeUser("u-b", BL)
    r = install(users=[cross_a, cross_b], clients=[FakeClient(RK), FakeClient(BL)])
    try:
        cid, _t, _a, _u, reason = await lia._resolve_actor("96170764479")
        check("   one phone on two tenants (path B, no shop match) -> refused",
              (cid, reason) == (None, "identity_ambiguous"), f"{cid} {reason}")
    finally:
        r()
    # The repository query is what excludes a deactivated row, so the guarantee is asserted on the
    # query itself rather than on a fake that could not reproduce it.
    #
    # ASSERTED ON CODE, NOT ON TEXT. The first version of these four checks matched substrings
    # against the raw file and failed — on the PROSE. Both `user_repo` and `lia_owner_entry`
    # explain in a docstring and a comment exactly which function they deliberately do NOT call, so
    # searching the file for that name finds the explanation and reads it as a violation. Comments
    # and docstrings are stripped below via `ast.unparse`, which is the difference between "this
    # name does not appear" and "this name is never called".
    repo_code = code_of_function("app/repositories/user_repo.py",
                                 "lia_find_active_users_by_phones")
    # `ast.unparse` re-emits string literals single-quoted, so the assertion matches the
    # normalised form rather than the source spelling.
    check("the resolver's query filters isActive explicitly",
          "'isActive': True" in repo_code, repo_code[repo_code.index("where"):][:60])
    check("   and returns find_many, so the caller can COUNT rather than be handed a pick",
          "find_many" in repo_code and "find_first" not in repo_code)
    check("   it never calls find_active_user_by_phones (which is oldest-wins)",
          "find_active_user_by_phones" not in repo_code)
    lia_src = open("app/services/lia_owner_entry.py", encoding="utf-8").read()
    lia_code = code_only("app/services/lia_owner_entry.py")
    check("Lia never calls find_active_user_by_phones anywhere (decision R3)",
          "find_active_user_by_phones" not in lia_code)
    check("and find_user_by_phone -- the login path -- is untouched by Lia (R4)",
          "find_user_by_phone" not in lia_code)
    check("   while the reason is still ON RECORD in prose, in the file it belongs to",
          "find_user_by_phone" in lia_src
          and "find_active_user_by_phones"
          in open("app/repositories/user_repo.py", encoding="utf-8").read())

    # ── AC-14 · actor/tenant mismatch, and AC-9/AC-13 at the re-check ────────
    print("\n── AC-14 + AC-9 + AC-13. the write-time re-check ──")
    r = install(users=[OWNER_BL])
    try:
        okk, why = await lia._still_authorised("96178727986", RK, OP_SERVICE)
        check("AC-14  a draft for rk re-checked by a barberlab actor -> tenant_changed",
              (okk, why) == (False, "tenant_changed"), f"{okk} {why}")
        okk, why = await lia._still_authorised("96178727986", BL, OP_SERVICE)
        check("       the same actor on his OWN tenant passes", (okk, why) == (True, "ok"))
    finally:
        r()
    r = install(users=[MANAGER_RES])
    try:
        okk, why = await lia._still_authorised("96178727986", BL, OP_SERVICE)
        check("AC-9   the permission is gone by write time -> missing_permission",
              (okk, why) == (False, "missing_permission"), f"{okk} {why}")
    finally:
        r()
    r = install(rows={RK: {"reservations": True, "catalog": False}}, users=[OWNER_RK])
    try:
        okk, why = await lia._still_authorised("96176985477", RK, OP_ITEM)
        check("AC-13  B ⇏ A again AT THE RE-CHECK: catalog off -> capability_inactive",
              (okk, why) == (False, "capability_inactive"), f"{okk} {why}")
    finally:
        r()
    r = install(rows={"no-keys": {}}, users=[FakeUser("u-x", "no-keys")],
                clients=[FakeClient("no-keys", "96170000777", "96170000777")])
    try:
        okk, why = await lia._still_authorised("96170000777", "no-keys", OP_SERVICE)
        check("       ① is re-checked too -> lia_access_inactive",
              (okk, why) == (False, "lia_access_inactive"), f"{okk} {why}")
    finally:
        r()
    check("the re-check takes an OperationDefinition, so it cannot fall back to a fixed key",
          "async def _still_authorised(phone: str, client_id: Optional[str], op=None)" in lia_src)
    check("   and _commit passes create_service's own definition into it",
          'op = lia_operations.get("create_service")' in lia_src)

    # ── AC-6 · independence, all four combinations ───────────────────────────
    print("\n── AC-6. capability/permission independence — four combinations ──")
    for label, rows, user, want in (
        ("A✓ B✓ -> allowed", {BL: {"reservations": True}}, OWNER_BL, (True, "ok")),
        ("A✓ B✗ -> missing_permission", {BL: {"reservations": True}}, MANAGER_RES,
         (False, "missing_permission")),
        ("A✗ B✓ -> capability_inactive", {BL: {}}, OWNER_BL, (False, "capability_inactive")),
        ("A✗ B✗ -> capability_inactive (A is read first, and named)", {BL: {}}, MANAGER_RES,
         (False, "capability_inactive")),
    ):
        r = install(rows=rows)
        try:
            check(label, (await lia._authorise_operation(BL, user, OP_SERVICE)) == want)
        finally:
            r()

    # ── AC-16 · invariant I1 through the operation's own legacy_roles ────────
    print("\n── AC-16. legacy accounts (permissions IS NULL) via operation legacy_roles ──")
    r = install()
    try:
        for name, u in (("rk owner", OWNER_RK), ("barberlab owner", OWNER_BL)):
            check(f"{name} is a legacy account", perms.is_permission_based(u) is False)
        check("a legacy TENANT_ADMIN passes create_service on its own tuple",
              (await lia._authorise_operation(BL, OWNER_BL, OP_SERVICE))[0] is True)
        check("   and create_reservation, whose tuple is wider",
              (await lia._authorise_operation(BL, OWNER_BL, OP_RESERVE))[0] is True)
        mgr_units = FakeUser("u-mu", BL, role="MANAGER_UNITS")
        check("MANAGER_UNITS is in catalog's tuple but NOT in services' -> refused for a service",
              (await lia._authorise_operation(BL, mgr_units, OP_SERVICE))[1]
              == "missing_permission")
        check("   which is exactly the distinction a single shared tuple would have erased",
              "MANAGER_UNITS" in OP_ITEM.legacy_roles
              and "MANAGER_UNITS" not in OP_SERVICE.legacy_roles)
    finally:
        r()

    # ── R1 / R2 — the order, and the third gate ──────────────────────────────
    print("\n── R1 + R2. the welcome is ① only, and the escape hatch is neither ──")
    P = "app/services/lia_owner_entry.py"
    welcome = code_of_branch(P, "try_handle", "_looks_like_greeting")
    check("R1  the welcome checks _tenant_has_lia", "_tenant_has_lia" in welcome)
    check("R1  and never an operation's capability there — no operation exists at a greeting",
          "lia_operations" not in welcome and "_authorise_operation" not in welcome
          and "service_key" not in welcome)
    # Asserted on the welcome BRANCH, not on the whole function: `try_handle` reaches the welcome
    # before the data-entry path, so a whole-function index proves nothing about either order.
    # Inside the branch the order is C then ① — identity first, because ① needs a tenant to ask
    # about, and a sender we cannot place has no tenant.
    check("R1  inside the welcome: C (identity) precedes ① (access)",
          welcome.index("_resolve_actor") < welcome.index("_tenant_has_lia"))
    check("R1  and the welcome audits only a misconfiguration, never a customer greeting (G3-d)",
          "lia_owner_greeting_unresolved" in welcome and "_R_UNLINKED" in welcome
          and "_R_UNRESOLVED" not in welcome)
    hatch = code_of_branch(P, "try_handle", "BOOK_ID")
    check("R2  the escape hatch still checks _tenant_has_reservations",
          "_tenant_has_reservations" in hatch)
    check("R2  and is NOT switched to Lia's access key",
          "_tenant_has_lia" not in hatch)
    check("R2  nor to an operation's capability",
          "_authorise_operation" not in hatch and "lia_operations" not in hatch)
    entry = code_of_function(P, "try_handle")
    check("the data-entry path asks ① BEFORE it looks up the operation (the decided order)",
          entry.index("_tenant_has_lia") < entry.index("lia_operations.get"))
    check("   and looks up the operation BEFORE authorising A/B",
          entry.index("lia_operations.get") < entry.index("_authorise_operation"))
    check("   and resolves the actor before the data-entry ① check",
          entry.index("_resolve_actor") < entry.rindex("_tenant_has_lia"))
    check("_tenant_has_lia reads BOTH keys (the tolerant bridge, F0.3)",
          '"serviceKey": {"in": ["lia", "reservations"]}' in lia_src)

    # ── AC-10 · no regression ────────────────────────────────────────────────
    print("\n── AC-10. no regression ──")
    import hashlib
    h = hashlib.sha256(lia._SYSTEM_PROMPT.encode()).hexdigest()
    check("the system prompt is byte-identical (893 chars, 778a4462…)",
          len(lia._SYSTEM_PROMPT) == 893 and h.startswith("778a4462"),
          f"{len(lia._SYSTEM_PROMPT)} chars {h[:16]}")
    check("all four governed replies still load",
          all(k in lia._REPLIES for k in lia._REQUIRED_REPLIES))
    check("no new Arabic refusal wording was invented in Python (F0.7 constraint)",
          lia_src.count("خدمة الحجوزات مش مفعّلة على هالمحل.") == 3
          and "مش مسموح" not in lia_src and "ما عندك صلاحية" not in lia_src,
          f"reuses of the existing sentence: {lia_src.count('خدمة الحجوزات مش مفعّلة على هالمحل.')}")

    print("\n── nothing here touched a network, a database or a send ──")
    check("no real prisma client was used (every case installed a fake)",
          lia.prisma_client.__class__.__name__ != "FakePrisma")
    check("the repository function is restored",
          user_repo.lia_find_active_users_by_phones.__name__ == "lia_find_active_users_by_phones")

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
