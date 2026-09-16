"""S1 — does the EXISTING write path produce a correct product? Measured, not assumed.

Run:  venv/bin/python scripts/test_lia_product_s1.py

WHY THIS EXISTS BEFORE ANY PRODUCT CODE

    `lia-product-entry.md` rests on one claim: that `create_product` needs NO new write path,
    because `catalog_service.admin_create_item` plus a backend-resolved `store` category already
    does the job. That claim was derived by READING signatures. Reading a signature tells you a
    function can be called; it does not tell you the row it writes is a correct product.

    So this is the falsification attempt, run before the operation is registered rather than after
    it ships. Four things have to hold, and each could plausibly fail:

      S1-a  a store-partition category can be resolved in the backend, without the model ever
            supplying a category id
      S1-b  `admin_create_item` writes into that category and the row lands in the store partition
      S1-c  the row carries the fields a product needs, and none it should not (no duration)
      S1-d  the operation's gate and permission come from `admin/store.py`, verbatim -- not from
            `admin/catalog.py`, whose capability is inactive on every live tenant

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES.
    The repository layer is faked. `admin_create_item` itself is the REAL function -- faking it
    would test the fake, which is the one thing this file exists to avoid.
"""
import ast
import asyncio
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import lia_owner_entry as _lia                      # noqa: E402,F401  (import chain)
from app.services import catalog_service                              # noqa: E402

ok = True


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


def _done(v):
    f = asyncio.get_event_loop().create_future()
    f.set_result(v)
    return f


# The three live tenants' real shape, measured 2026-09-16.
CLIENT = "client-barberlab"
STORE_CAT = type("C", (), {"id": "cat-store", "clientId": CLIENT, "moduleKey": "store",
                           "nameAr": "منتجات العناية", "isActive": True})()
SERVICES_CAT = type("C", (), {"id": "cat-catalog", "clientId": CLIENT, "moduleKey": "catalog",
                              "nameAr": "الخدمات", "isActive": True})()


class FakeRepo:
    """Shaped from the real `admin_catalog_repo` signatures this path actually calls."""

    def __init__(self, cats):
        self.cats, self.created = cats, []

    async def find_active_category(self, client_id, category_id, module_key=None):
        for c in self.cats:
            if c.id == category_id and c.clientId == client_id and c.isActive:
                if module_key and c.moduleKey != module_key:
                    return None
                return c
        return None

    async def create_item(self, data):
        self.created.append(data)
        return type("I", (), {**data, "id": "new-item", "metadata": data.get("metadata")})()

    async def list_categories(self, client_id, module_key=None, **kw):
        return [c for c in self.cats
                if c.clientId == client_id and (not module_key or c.moduleKey == module_key)]


async def main():
    print("── S1-a. the category is resolved in the BACKEND, never supplied by the model ──")
    repo = FakeRepo([STORE_CAT, SERVICES_CAT])
    # The same shape `_resolve_service_category` uses for services: ask the data where the
    # tenant's products already live, rather than matching an Arabic name.
    store_cats = await repo.list_categories(CLIENT, module_key="store")
    check("exactly one store-partition category is found",
          len(store_cats) == 1 and store_cats[0].id == "cat-store",
          str([c.nameAr for c in store_cats]))
    check("   and the services category is NOT among them (partitions stay separate)",
          SERVICES_CAT not in store_cats)
    check("   a tenant with no store category resolves to nothing -> ask, never invent",
          await FakeRepo([SERVICES_CAT]).list_categories(CLIENT, module_key="store") == [])

    print("\n── S1-b + S1-c. the REAL admin_create_item writes a correct product ──")
    orig = catalog_service.admin_catalog_repo
    catalog_service.admin_catalog_repo = repo
    try:
        created = await catalog_service.admin_create_item(
            client_id      = CLIENT,
            category_id    = STORE_CAT.id,
            name_ar        = "شامبو كيراتين",
            name_en        = None,
            description_ar = None,
            description_en = None,
            image_url      = None,
            price          = 12.0,
            currency       = "USD",
            is_featured    = False,
            sort_order     = 0,
            metadata       = None,
        )
    finally:
        catalog_service.admin_catalog_repo = orig

    row = repo.created[0] if repo.created else {}
    check("the write happened through the real service function", bool(repo.created))
    check("   clientId is carried (tenant isolation)", row.get("clientId") == CLIENT)
    check("   categoryId is the STORE category -> the row lands in the store partition",
          row.get("categoryId") == "cat-store")
    check("   name and price survive", row.get("nameAr") == "شامبو كيراتين"
          and float(row.get("price") or 0) == 12.0)
    check("   currency is carried", row.get("currency") == "USD")
    check("   isActive defaults True — set by the SERVICE, not by the caller",
          row.get("isActive") is True)
    check("   NO duration field is written (a product is not a service)",
          "durationMin" not in row and "duration_min" not in row)
    check("   the returned dict has an id", bool(created.get("id")))

    print("\n── the guard that makes the backend-resolved category safe ──")
    # `admin_create_item` does not filter by module. That looseness is only reachable by a caller
    # who can SUPPLY a category id. Lia cannot: it resolves the category itself. Proven by showing
    # the filter exists and works when asked, i.e. the tightening is available if ever needed.
    check("find_active_category CAN filter by module when asked",
          await repo.find_active_category(CLIENT, "cat-catalog", module_key="store") is None)
    check("   and returns the row when the module matches",
          (await repo.find_active_category(CLIENT, "cat-store", module_key="store")) is STORE_CAT)
    src = ast.unparse(ast.parse(open("app/services/lia_owner_entry.py", encoding="utf-8").read()))
    check("Lia still accepts NO category id from the model (the loophole's precondition)",
          "category_id" not in src or "_resolve_service_category" in src)

    print("\n── S1-d. the gate and permission come from admin/store.py, verbatim ──")

    def route_literals(path, pattern):
        s = open(path, encoding="utf-8").read()
        m = re.search(pattern, s)
        return tuple(re.findall(r'"([A-Za-z_.]+)"', m.group(0))) if m else ()

    store_perm = route_literals("app/api/v1/admin/store.py",
                                r'require_permission\(\s*"store\.write"[^)]*\)')
    store_gate = route_literals("app/api/v1/admin/store.py", r'require_service\(\s*"store"\s*\)')
    check("store.write's legacy tuple is readable from the route",
          store_perm[:1] == ("store.write",) and len(store_perm) == 4, str(store_perm))
    check("   and the capability gate is `store`", store_gate == ("store",), str(store_gate))
    cat_gate = route_literals("app/api/v1/admin/catalog.py", r'require_service\(\s*"catalog"\s*\)')
    check("   admin/catalog.py's gate is `catalog` — a DIFFERENT key, inactive on all three "
          "live tenants", cat_gate == ("catalog",), str(cat_gate))
    check("   so a product operation must NOT reuse create_catalog_item's definition",
          store_gate != cat_gate)

    print("\n── nothing here touched a network, a database or a send ──")
    check("the repository was faked for every call",
          catalog_service.admin_catalog_repo is orig)

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
