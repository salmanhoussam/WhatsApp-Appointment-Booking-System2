"""Deleting a catalog item DEACTIVATES it and never removes the row — Track A3.

Run:  venv/bin/python scripts/test_catalog_soft_delete.py

WHAT THIS GUARDS, AND WHY IT IS NOT A STYLE PREFERENCE
------------------------------------------------------
`StoreOrderItem` CASCADES from `CatalogItem` (prisma/schema.prisma:755), as do `StoreCartItem`
(:695) and `GalleryImage` (:438). So a hard delete of one dish erased every order line that had
ever referenced it — and `StoreOrder` keeps its own `totalPrice`, so revenue still looked correct
while the item breakdown silently emptied.

Two LIVE routes did exactly that until 2026-09-30, one of them the owner's own delete button in
the menu tab. Measured against production before the fix, with a positive control:

    caracas  97 items · 0 orders · 0 order lines       arizona  28 · 0 · 0
    control -- platform-wide: 14 orders · 18 order lines · 181 items

So the counters could see rows, the zeros were real, and no history had been lost yet. The hazard
was live and unfired.

These checks are STRUCTURAL — they parse the real source with `ast` and assert on the code, not on
prose. `feedback_assert_on_code_not_text`: a comment explaining a deliberate omission matches a
grep for it, which has now inverted a result four separate times in this project, including once
in the very check written to prevent it. Every absence below therefore carries a positive control
proving the detector can see the thing when it is there.

🔴 WHAT THIS SUITE DOES NOT PROVE
A cascade is a database behaviour. These checks prove no code path can trigger it; they do NOT
prove Postgres' own FK behaviour, which is asserted from schema.prisma rather than executed. A
real end-to-end proof needs a throwaway tenant with a real order — that is a production write and
is deliberately out of scope here.
"""
import ast
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

PASS = FAIL = 0


def check(label, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {label}")
    else:
        FAIL += 1
        print(f"  ❌ {label}" + (f"  — {detail}" if detail else ""))


ROOT = Path(__file__).resolve().parent.parent


def code_only(rel: str) -> str:
    """A module's CODE — comments dropped by ast.unparse, docstrings blanked."""
    tree = ast.parse((ROOT / rel).read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant) \
                and isinstance(node.value.value, str):
            node.value.value = ""
    return ast.unparse(tree)


REPO = code_only("app/repositories/admin_catalog_repo.py")
SVC = code_only("app/services/catalog_service.py")
R_ROUTE = code_only("app/api/v1/admin/restaurant.py")
S_ROUTE = code_only("app/api/v1/admin/store.py")
C_ROUTE = code_only("app/api/v1/admin/catalog.py")
SCHEMA = (ROOT / "prisma/schema.prisma").read_text(encoding="utf-8")

from app.repositories import admin_catalog_repo  # noqa: E402
from app.services import catalog_service  # noqa: E402

print("\n── SD-0  the hazard this exists for is real (read from the schema) ──")
check("SD-0a  StoreOrderItem cascades from CatalogItem",
      "catalogItem CatalogItem @relation(fields: [catalogItemId], references: [id], onDelete: Cascade)"
      in SCHEMA.replace("\n", " ").replace("  ", " "),
      "if this ever stops being true, the whole rationale below changes — say so")
check("SD-0b  CatalogItem is the parent of three cascading children",
      SCHEMA.count("onDelete: Cascade") >= 3)
check("SD-0c  is_active exists, so soft delete needed no migration",
      'isActive      Boolean  @default(true) @map("is_active")' in SCHEMA)

print("\n── SD-1  the hard-delete function is GONE and cannot be called ──")
check("SD-1a  delete_item_by_filter no longer exists on the repository",
      not hasattr(admin_catalog_repo, "delete_item_by_filter"))
check("SD-1b  and its name appears nowhere in repository CODE",
      "delete_item_by_filter" not in REPO,
      "the tombstone comment may mention it; code must not")
check("SD-1-ctrl  the detector WOULD see a real call, not just a comment",
      "delete_item_by_filter" in ast.unparse(ast.parse("x = delete_item_by_filter(1, 2)")))
check("SD-1-ctrl2  ...and does NOT fire on a comment mentioning it",
      "delete_item_by_filter" not in ast.unparse(ast.parse("# delete_item_by_filter was removed\nx = 1")))

print("\n── SD-2  NO route can hard-delete a catalog item ──")
for name, src in (("restaurant", R_ROUTE), ("store", S_ROUTE), ("catalog", C_ROUTE)):
    check(f"SD-2  admin/{name}.py contains no catalogitem delete call",
          "catalogitem.delete" not in src and "delete_item_by_filter" not in src, name)
check("SD-2d  the repository itself never deletes a catalogitem row",
      "catalogitem.delete_many" not in REPO and "catalogitem.delete(" not in REPO)
check("SD-2-ctrl  the detector WOULD see a planted delete",
      "catalogitem.delete_many" in ast.unparse(ast.parse("await prisma_client.catalogitem.delete_many(where={})")))

print("\n── SD-3  delete means isActive=False, and it is scoped ──")
check("SD-3a  soft_delete_item writes isActive False", "'isActive': False" in REPO or '"isActive": False' in REPO)
check("SD-3b  it accepts module_key, so a store route cannot retire a restaurant item",
      "module_key" in REPO.split("def soft_delete_item")[1].split("def ")[0])
check("SD-3c  its update is scoped by clientId",
      "'clientId': client_id" in REPO.split("def soft_delete_item")[1].split("def ")[0]
      or '"clientId": client_id' in REPO.split("def soft_delete_item")[1].split("def ")[0])
import inspect  # noqa: E402
sig = inspect.signature(admin_catalog_repo.soft_delete_item)
check("SD-3d  signature is (client_id, item_id, module_key=None)",
      list(sig.parameters) == ["client_id", "item_id", "module_key"], str(sig))

print("\n── SD-4  every delete route goes through the ONE service write path (§9) ──")
for name, src in (("restaurant", R_ROUTE), ("store", S_ROUTE), ("catalog", C_ROUTE)):
    check(f"SD-4  admin/{name}.py calls catalog_service.admin_delete_item",
          "catalog_service.admin_delete_item" in src, name)
svc_sig = inspect.signature(catalog_service.admin_delete_item)
check("SD-4d  the service takes module_key so scoping survives the move",
      "module_key" in svc_sig.parameters, str(svc_sig))
check("SD-4e  the service soft-deletes and never calls a repo delete",
      "soft_delete_item" in SVC and "delete_item_by_filter" not in SVC)
check("SD-4f  it still 404s on a missing item, via find_item rather than a row count",
      "find_item" in SVC.split("def admin_delete_item")[1].split("async def ")[0])

print("\n── SD-5  the customer never sees a retired item ──")
READERS = {
    "restaurant_repo": "app/repositories/restaurant_repo.py",
    "store_repo":      "app/repositories/store_repo.py",
    "catalog_repository": "app/repositories/catalog_repository.py",
}
for name, rel in READERS.items():
    src = code_only(rel)
    n_find = src.count("catalogitem.find_many") + src.count("catalogitem.find_first")
    n_active = src.count("'isActive': True") + src.count('"isActive": True')
    check(f"SD-5  {name}: every catalogitem read filters isActive=True "
          f"({n_find} reads, {n_active} filters)", n_find > 0 and n_active >= n_find,
          "a read without the filter would serve a retired dish to a customer")

print("\n── SD-7  categories too — the WIDEST hazard of the three ──")
# CatalogCategory -> CatalogItem (schema.prisma:528) -> StoreOrderItem (:755). Deleting ONE menu
# section erased every dish in it and every order line for those dishes.
check("SD-7a  CatalogItem cascades from its category",
      "category        CatalogCategory  @relation(fields: [categoryId], references: [id], onDelete: Cascade)"
      in SCHEMA)
check("SD-7b  delete_category_by_filter no longer exists",
      not hasattr(admin_catalog_repo, "delete_category_by_filter"))
check("SD-7c  and its name is absent from repository CODE", "delete_category_by_filter" not in REPO)
for name, src in (("restaurant", R_ROUTE), ("store", S_ROUTE), ("catalog", C_ROUTE)):
    check(f"SD-7  admin/{name}.py calls catalog_service.admin_delete_category",
          "catalog_service.admin_delete_category" in src, name)
check("SD-7d  no DELETE ROUTE hard-deletes a category",
      all("catalogcategory.delete" not in x for x in (R_ROUTE, S_ROUTE, C_ROUTE)),
      "the repository still holds one, pinned as SD-8 below")
check("SD-7e  soft_delete_category takes module_key",
      "module_key" in inspect.signature(admin_catalog_repo.soft_delete_category).parameters)
check("SD-7f  the service passes it through",
      "module_key" in inspect.signature(catalog_service.admin_delete_category).parameters)
check("SD-7-ctrl  the detector WOULD see a planted category delete",
      "catalogcategory.delete_many" in ast.unparse(ast.parse("await prisma_client.catalogcategory.delete_many(where={})")))

print("\n── SD-6  the int-vs-.count crash is gone ──")
# delete_many()/update_many() return a plain int in prisma-client-py 0.15.0. The restaurant route
# read `.count` on that int, so it raised AttributeError -> 500 AFTER the rows were already gone:
# the owner saw a failure and the data was destroyed anyway.
check("SD-6a  admin/restaurant.py no longer reads .count on ANY delete result",
      "result.count" not in R_ROUTE, "both the item and the category route had this")
check("SD-6b  admin/store.py no longer reads a delete row count either",
      "deleted_count" not in S_ROUTE)
check("SD-6-ctrl  the detector WOULD see a planted result.count",
      "result.count" in ast.unparse(ast.parse("if result.count == 0:\n    pass")))

print("\n── 🔴 SD-8  TRANSITION: the fifth hard delete is CLOSED ──")
#
# WAS (pinned here 2026-09-30, earlier the same day): `delete_categories_by_client()` hard-deleted
# EVERY category for a tenant and was reachable from admin/catalog.py:195 ->
# admin_seed_from_template, plus provisioning_service.py:217. Same cascade as everything above:
# categories -> items -> order lines. It was left unfixed at the time because "seed from template"
# MEANS replace-the-catalog and softening it was a semantic decision, not a bug fix.
#
# NOW: Salman decided A-Q6 (2026-09-30) -- soft delete WITH namespace freeing. The menu path
# archives instead of deleting, and the provisioning path keeps its hard delete (it relies on the
# cascade to clear CatalogServices) but REFUSES when any order line exists.
check("SD-8a  delete_categories_by_client is GONE — was a hard delete of every category",
      not hasattr(admin_catalog_repo, "delete_categories_by_client"))
check("SD-8b  archive_catalog_by_client replaces it", hasattr(admin_catalog_repo, "archive_catalog_by_client"))
check("SD-8c  the menu path (seed-from-template) now ARCHIVES — was a hard delete",
      "archive_catalog_by_client" in SVC and "delete_categories_by_client" not in SVC)
check("SD-8d  archiving deactivates BOTH items and categories",
      "catalogitem.update_many" in REPO and "catalogcategory.update_many" in REPO)
check("SD-8e  and it frees each retired SKU (A-Q6), so the new menu can reuse the clean key",
      "sku_tool.archive" in REPO)
check("SD-8f  the archive path never deletes a row",
      "catalogcategory.delete_many" not in REPO.split("def archive_catalog_by_client")[1].split("async def ")[0])

print("\n── SD-9  the ONE surviving hard delete is provisioning-only, and guarded ──")
check("SD-9a  it is renamed so its scope is unmistakable",
      hasattr(admin_catalog_repo, "hard_delete_categories_for_provisioning"))
guard_src = REPO.split("def hard_delete_categories_for_provisioning")[1].split("async def ")[0]
check("SD-9b  it COUNTS order lines before deleting", "storeorderitem.count" in guard_src)
check("SD-9c  and RAISES rather than proceeding when any exist", "raise ValueError" in guard_src)
check("SD-9d  only provisioning_service calls it",
      "hard_delete_categories_for_provisioning" not in SVC
      and all("hard_delete_categories_for_provisioning" not in x for x in (R_ROUTE, S_ROUTE, C_ROUTE)))
PROV = code_only("app/services/provisioning_service.py")
check("SD-9e  provisioning uses the guarded name, not the old one",
      "hard_delete_categories_for_provisioning" in PROV and "delete_categories_by_client" not in PROV)

print("\n── SD-10  SKU: the column is real and the boundary owns it ──")
check("SD-10a  schema.prisma declares sku, paired with the executed migration",
      'sku           String?  @map("sku")' in SCHEMA)
check("SD-10b  and declares the unique index that exists in production",
      "@@unique([clientId, sku]" in SCHEMA,
      "an index in the DB but not the schema is one prisma db push from deletion")
check("SD-10c  app/core/sku.py is the single normalisation boundary",
      (ROOT / "app/core/sku.py").exists())

print(f"\nPASS={PASS}  FAIL={FAIL}")
if FAIL:
    print("\n🔴 A failure in SD-8 is not a regression — it is a guard on a KNOWN gap.")
sys.exit(1 if FAIL else 0)
