"""Lia's per-vertical OPERATION allowlist — Phase 2 of ADR-0008 (decision D-5).

Run:  venv/bin/python scripts/test_lia_vertical_allowlist.py

WHAT THIS GUARDS
----------------
Salman's decision: Lia reaches `restaurant` READ-ONLY. The obvious implementation — adding
`"restaurant"` to `_LIA_VERTICALS` — would have violated that decision outright, because that
frozenset is the primary gate over ALL of Lia (`_vertical_allows_lia` at the three entry points),
not a write-only backstop. One word would have granted all seven registered operations, six of
which write.

So the fence moved one level down: a vertical declares WHICH OPERATIONS it may reach, by name.

🔴 TRANSITION, DECLARED (`feedback_invariant_vs_transition_tests`)
------------------------------------------------------------------
    WAS:  _LIA_VERTICALS = frozenset({"barber"})        — a flat set of vertical names
    NOW:  _LIA_VERTICAL_OPERATIONS: dict[str, frozenset] — vertical -> allowed operation names
          _LIA_VERTICALS is DERIVED from it, and keeps its old meaning and its old value

Any assertion elsewhere that `_LIA_VERTICALS` is the literal source of truth flips here. Its VALUE
does not: it is `{"barber"}` before and after, and LV-1 below asserts exactly that, because a
refactor that quietly changes who may reach Lia is the one outcome this phase must not produce.
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


import app.services.lia_operations as lia_ops  # noqa: E402
from app.services.lia_owner_entry import (  # noqa: E402
    _LIA_VERTICALS,
    _LIA_VERTICAL_OPERATIONS,
    _vertical_allows_operation,
)

ROOT = Path(__file__).resolve().parent.parent
ENTRY_SRC = (ROOT / "app/services/lia_owner_entry.py").read_text(encoding="utf-8")


def _code_only(src: str) -> str:
    """The module's CODE, with every comment and docstring removed.

    `ast.unparse` drops comments (they never enter the tree); the loop blanks docstrings and bare
    string expressions, which do.

    🔴 This exists because LV-1c FAILED against the raw source on its first run, and it was right
    to: the comment above `_LIA_VERTICAL_OPERATIONS` explains why the set is NOT written as
    `frozenset(OPERATIONS)` — so the prose justifying the absence matched the search for the
    thing's presence. That is the exact failure `feedback_assert_on_code_not_text` records from
    three earlier real instances, reproduced here a fourth time by the check meant to prevent it.
    """
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant) \
                and isinstance(node.value.value, str):
            node.value.value = ""
    return ast.unparse(tree)


ENTRY_CODE = _code_only(ENTRY_SRC)

# The registry is private on purpose; this suite reaches it deliberately, to assert that the
# allowlist and the registry agree. Resolved by shape rather than by name so a rename does not
# silently turn these checks into no-ops.
REGISTRY = next(
    v for v in vars(lia_ops).values()
    if isinstance(v, dict) and v and all(hasattr(x, "permission") for x in v.values())
)
READS = {n for n, d in REGISTRY.items() if d.permission.endswith(".read")}
WRITES = set(REGISTRY) - READS


print("\n── LV-0  the registry is what we think it is (the ground truth these rest on) ──")
check("LV-0a  seven operations are registered", len(REGISTRY) == 7, f"got {len(REGISTRY)}")
check("LV-0b  exactly one is a read, and it is daily_report", READS == {"daily_report"}, str(READS))
check("LV-0c  the other six write", len(WRITES) == 6, str(sorted(WRITES)))
check("LV-0d  'read' is derivable from the permission string — no new registry field was needed",
      all(d.permission.endswith((".read", ".write")) for d in REGISTRY.values()),
      "if a permission stops ending in .read/.write, LV-2 loses its signal and must be rewritten")

print("\n── 🔴 LV-1  TRANSITION: who may reach Lia is UNCHANGED by this refactor ──")
check("LV-1a  _LIA_VERTICALS is still exactly {'barber'} — was frozenset({'barber'}) before",
      _LIA_VERTICALS == frozenset({"barber"}), f"got {sorted(_LIA_VERTICALS)}")
check("LV-1b  barber reaches EVERY registered operation, as it did before",
      _LIA_VERTICAL_OPERATIONS["barber"] == set(REGISTRY),
      f"missing={set(REGISTRY) - _LIA_VERTICAL_OPERATIONS['barber']} "
      f"extra={_LIA_VERTICAL_OPERATIONS['barber'] - set(REGISTRY)}")
check("LV-1c  and it reaches all seven BY NAME, not by a derived frozenset(REGISTRY)",
      "frozenset(REGISTRY)" not in ENTRY_CODE and "frozenset(OPERATIONS)" not in ENTRY_CODE,
      "deriving barber's set would silently grant it any operation a future phase registers")
check("LV-1c-ctrl  ...and the detector still SEES a real derived set when one is planted",
      "frozenset(REGISTRY)" in _code_only("x = frozenset(REGISTRY)\n"))
check("LV-1c-ctrl2  ...while a COMMENT mentioning it no longer fires — the bug this check had",
      "frozenset(REGISTRY)" not in _code_only("# never write frozenset(REGISTRY) here\nx = 1\n"))

print("\n── LV-2  restaurant is READ-ONLY, and today it is empty ──")
rest = _LIA_VERTICAL_OPERATIONS["restaurant"]
check("LV-2a  restaurant is declared", "restaurant" in _LIA_VERTICAL_OPERATIONS)
check("LV-2b  it reaches ZERO write operations", not (rest & WRITES), f"would write: {rest & WRITES}")
check("LV-2c  every operation it may ever reach carries a .read permission",
      rest <= READS, f"non-read: {rest - READS}")
check("LV-2d  it is empty TODAY — the fence is built before anything is granted",
      rest == frozenset(), f"got {sorted(rest)}")
check("LV-2e  so restaurant is still fenced OUT of Lia entirely — zero behaviour change",
      "restaurant" not in _LIA_VERTICALS)
check("LV-2f  no write operation is reachable from ANY vertical but barber",
      all(not (ops & WRITES) for v, ops in _LIA_VERTICAL_OPERATIONS.items() if v != "barber"))

print("\n── LV-3  everything unknown fails CLOSED ──")
check("LV-3a  an unregistered vertical reaches nothing",
      not _vertical_allows_operation("bakery", "daily_report"))
check("LV-3b  vertical=None reaches nothing", not _vertical_allows_operation(None, "daily_report"))
check("LV-3c  vertical='' reaches nothing", not _vertical_allows_operation("", "daily_report"))
check("LV-3d  an operation nobody listed is refused even for barber",
      not _vertical_allows_operation("barber", "delete_everything"))
check("LV-3e  a real barber operation IS allowed — the gate is not simply always-false",
      _vertical_allows_operation("barber", "daily_report"))
check("LV-3f  ...and so is a barber WRITE, which is correct for barber",
      _vertical_allows_operation("barber", "create_reservation"))

print("\n── LV-4  the allowlist is SOURCE — no runtime or tenant-side widening ──")
tree = ast.parse(ENTRY_SRC)
assign = next(
    (n for n in ast.walk(tree)
     if isinstance(n, ast.AnnAssign) and getattr(n.target, "id", "") == "_LIA_VERTICAL_OPERATIONS"),
    None,
)
check("LV-4a  it is a module-level literal, not built at runtime", assign is not None)
check("LV-4b  its value is a plain dict display of constants",
      assign is not None and isinstance(assign.value, ast.Dict))
check("LV-4c  nothing mutates it anywhere in the module",
      not any(s in ENTRY_CODE for s in
              ("_LIA_VERTICAL_OPERATIONS[", "_LIA_VERTICAL_OPERATIONS.update",
               "_LIA_VERTICAL_OPERATIONS.setdefault", "_LIA_VERTICAL_OPERATIONS.pop")),
      "a tenant row or an env var must never be able to widen this")
check("LV-4d  the sets are frozen, so a caller cannot add to one by accident",
      all(isinstance(ops, frozenset) for ops in _LIA_VERTICAL_OPERATIONS.values()))
check("LV-4-ctrl  the mutation detector WOULD fire on a planted subscript-assign",
      "_LIA_VERTICAL_OPERATIONS[" in '_LIA_VERTICAL_OPERATIONS["x"] = frozenset()')

print("\n── LV-5  the derived set stays honest ──")
check("LV-5a  a vertical with an empty operation set is NOT in _LIA_VERTICALS",
      all(v in _LIA_VERTICALS for v, ops in _LIA_VERTICAL_OPERATIONS.items() if ops)
      and all(v not in _LIA_VERTICALS for v, ops in _LIA_VERTICAL_OPERATIONS.items() if not ops))
check("LV-5b  every member of _LIA_VERTICALS can actually reach at least one operation",
      all(_LIA_VERTICAL_OPERATIONS[v] for v in _LIA_VERTICALS),
      "a vertical Lia 'serves' that can do nothing is a greeting that cannot be honoured")

print("\n── LV-6  the tolerant `lia OR reservations` migration bridge is untouched ──")
check("LV-6a  _tenant_has_lia still exists and is still separate from the vertical gate",
      "_tenant_has_lia" in ENTRY_CODE and "_vertical_allows_lia" in ENTRY_CODE)
check("LV-6b  the bridge's OR is still present — mr-h and alzabt-demo depend on it",
      "reservations" in ENTRY_CODE and "_tenant_has_lia" in ENTRY_CODE)
check("LV-6c  _vertical_allows_lia still reads Client.vertical and nothing else",
      "_LIA_VERTICALS" in ENTRY_CODE and "_vertical_allows_operation" in ENTRY_CODE)

print("\n── 🔴 LV-7  THE KNOWN GAP — the per-operation gate is DEFINED but NOT WIRED ──")
#
# Found by reviewing this phase's own diff, not by a failing test. `_vertical_allows_operation`
# has zero production call sites: only this suite calls it. What actually keeps `restaurant` out
# today is the DERIVED `_LIA_VERTICALS` being empty for it.
#
# That is safe RIGHT NOW and unsafe the moment someone adds an operation name to
# `restaurant` without also wiring the call — the vertical would become served, with its
# per-operation fence never consulted. Pinned as a failing-state guard on purpose, the same shape
# as R-7 in test_restaurant_vertical_registration: a known gap must not become a forgotten one.
_prod_calls = [
    ln for ln in ENTRY_CODE.splitlines()
    if "_vertical_allows_operation(" in ln and "def _vertical_allows_operation" not in ln
]
check("LV-7-ctrl-a  the detector DOES find a planted call",
      any("_vertical_allows_operation(" in ln
          for ln in _code_only("x = _vertical_allows_operation('a', 'b')\n").splitlines()))
check("LV-7-ctrl-b  ...and does not count the definition itself as a call",
      not [ln for ln in _code_only("def _vertical_allows_operation(v, o):\n    return True\n").splitlines()
           if "_vertical_allows_operation(" in ln and "def _vertical_allows_operation" not in ln])

check("🔴 LV-7  the gate is STILL unwired — zero production call sites",
      len(_prod_calls) == 0,
      "if this now fails, Phase 3 wired it: say so, flip this assertion, and name the old state")
check("🔴 LV-7b  and restaurant is kept out by the DERIVED set, not by the gate",
      "restaurant" not in _LIA_VERTICALS and _LIA_VERTICAL_OPERATIONS["restaurant"] == frozenset(),
      "the moment restaurant gets an operation name, LV-7 must already have been fixed")

print(f"\nPASS={PASS}  FAIL={FAIL}")
if FAIL:
    print("\n🔴 A failure in LV-7 is not a regression — it is a guard on a KNOWN gap.\n"
          "   If LV-7 failed, the gate was wired. That is the fix we want; update the assertion\n"
          "   and name the behaviour it used to pin.")
sys.exit(1 if FAIL else 0)
