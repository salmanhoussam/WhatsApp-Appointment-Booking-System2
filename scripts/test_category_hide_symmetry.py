#!/usr/bin/env python3
"""Hiding a category must be reversible — and must not resurrect anything retired on purpose.

    venv/bin/python scripts/test_category_hide_symmetry.py

Plan §5, decided by Salman 2026-10-01. The defect: `soft_delete_category` deactivated the CATEGORY
**and every item in it**, while `admin_update_category(is_active=True)` patches the category row
only. Hide → show returned an empty section. Measured live: كوشينيا, hidden 15:58, took its 8
items with it.

WHY THE ASSERTIONS PARSE THE CODE INSTEAD OF GREPPING IT
--------------------------------------------------------
"this function no longer calls X" is a claim about CODE, and a substring search cannot make it:
the docstring added in the same change NAMES the removed call, on purpose, so anyone reading the
function learns what used to be there. A grep for `catalogitem.update_many` matches that sentence
and reports the cascade alive. Failed three times in one session before this was learned, so every
absence check below walks the AST of the one function and ignores prose entirely.
"""
import ast
import inspect
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.repositories import admin_catalog_repo, restaurant_repo  # noqa: E402

PASS = FAIL = 0


def check(name, cond, detail=""):
    global PASS, FAIL
    ok = bool(cond)
    PASS, FAIL = PASS + ok, FAIL + (not ok)
    print(f"  {'✅' if ok else '🔴'} {name}" + (f"   {detail}" if detail else ""))
    return ok


def calls_in(fn):
    """Every dotted call name really invoked in fn's body. Prose cannot enter this set."""
    src = inspect.getsource(fn)
    tree = ast.parse(ast.unparse(ast.parse(src)))
    out = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            out.add(ast.unparse(node.func))
    return out


def where_of(fn):
    """The literal `where=` dict of the first find_many in fn, as source text."""
    tree = ast.parse(inspect.getsource(fn))
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and "find_many" in ast.unparse(node.func):
            for kw in node.keywords:
                if kw.arg == "where":
                    return ast.unparse(kw.value)
    return ""


print("\n── CH-1 · the cascade is gone, asserted on the parsed function ──")
sd_calls = calls_in(admin_catalog_repo.soft_delete_category)
check("CH-1a  soft_delete_category does NOT call catalogitem.update_many",
      not any("catalogitem.update_many" in c for c in sd_calls))
check("CH-1b  it still deactivates the CATEGORY itself",
      any("catalogcategory.update_many" in c for c in sd_calls))
check("CH-1c  and it reactivates nothing — no blanket undo was added in its place",
      "isActive': True" not in ast.unparse(ast.parse(
          inspect.getsource(admin_catalog_repo.soft_delete_category))).replace('"', "'"))

print("\n── CH-1 CONTROL · the assertion must be able to fail ──")
# The docstring deliberately names the removed call. A substring search over the SOURCE finds it;
# the AST walk must not. If both agree, CH-1a is measuring prose, not code.
src = inspect.getsource(admin_catalog_repo.soft_delete_category)
check("CH-1d  the docstring really does mention the removed call (so grep WOULD be fooled)",
      "catalogitem.update_many" in src)
check("CH-1e  …and the AST walk is not fooled by it",
      "catalogitem.update_many" in src
      and not any("catalogitem.update_many" in c for c in sd_calls))
# a function that genuinely still cascades must come back positive, proving the walk sees calls
arch_calls = calls_in(admin_catalog_repo.archive_catalog_by_client)
check("CH-1f  POSITIVE CONTROL — archive_catalog_by_client DOES cascade, and the walk sees it",
      any("catalogitem.update_many" in c for c in arch_calls),
      "(this one is meant to: it retires a whole catalog on purpose)")

print("\n── CH-2 · visibility is decided by the CATEGORY, at read time ──")
for fn, label in ((restaurant_repo.list_menu_categories, "list_menu_categories"),
                  (restaurant_repo.find_menu_category_with_items, "find_menu_category_with_items")):
    s = ast.unparse(ast.parse(inspect.getsource(fn))).replace('"', "'")
    check(f"CH-2a  {label} filters the category on isActive", "'isActive': True" in s)
check("CH-2b  find_catalog_items_by_ids now requires a VISIBLE category too",
      "'isActive': True" in where_of(restaurant_repo.find_catalog_items_by_ids)
      .replace('"', "'").split("'category'")[-1],
      "— with the cascade gone, this is what keeps a hidden category's items unorderable")

print("\n── CH-3 · the retired stay retired (the whole risk of this change) ──")
# Nothing in this change touches `isActive` on any item, in either direction. That is the
# guarantee the 17 deliberately-retired rows — the three فول among them — depend on.
touched = set()
for name in ("soft_delete_category",):
    fn = getattr(admin_catalog_repo, name)
    t = ast.unparse(ast.parse(inspect.getsource(fn)))
    if "catalogitem" in t.split('"""')[-1]:
        touched.add(name)
check("CH-3a  no item row is written by the hide path at all, in either direction",
      not touched, "— so a retired item cannot be revived by hiding or showing a category")
check("CH-3b  the archive path still frees the SKU (A-Q6), untouched by this change",
      "sku_tool.archive" in inspect.getsource(admin_catalog_repo))

print(f"\n{'='*70}\n  PASS={PASS}  FAIL={FAIL}\n{'='*70}\n")
sys.exit(1 if FAIL else 0)
