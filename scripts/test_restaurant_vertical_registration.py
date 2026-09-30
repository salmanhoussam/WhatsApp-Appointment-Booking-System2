"""`restaurant` becomes a real platform vertical — and the one thing registering it does NOT fix.

Run:  venv/bin/python scripts/test_restaurant_vertical_registration.py

WHAT THIS PROVES

    Salman, 2026-09-30: register `restaurant` in VERTICAL_REGISTRY so the word stops meaning two
    things in two layers and nothing in the third. Investigation:
    .claudedocs/work/caracas-vertical-classification/2026-09-30/summary.md

    Scope is deliberately narrow: THE REGISTRY ENTRY ONLY. No production write, no demo_service,
    no emoji, no frontend, no schema, no provisioning implementation, no restaurant booking engine.

🔴 THE ASSERTION THAT MATTERS MOST IS R-7, AND IT IS A FAILURE, NOT A SUCCESS.

    The investigation claimed registering `restaurant` would stop `public_service` logging
    "🔴 booking_module unresolved ... This is a provisioning defect". Measured: IT DOES NOT.
    `_resolve_booking_module_for` branches on the RESOLVED VALUE being None, and a registered
    vertical that honestly declares `booking_module: None` produces exactly the same None as a
    typo. So caracas and arizona, once classified, will log a warning calling itself a
    provisioning defect on EVERY /config fetch — and it will not be one.

    R-7 asserts that this is still true. It is written as a failing-state guard on purpose: it is
    the difference between a known gap and a forgotten one. When `_resolve_booking_module_for` is
    fixed to branch on `get_vertical(vertical) is None` instead, R-7 flips — and whoever flips it
    must say so, naming the old behaviour, per feedback_invariant_vs_transition_tests.
"""
import sys, io, logging, ast, inspect
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


from app.core.verticals import VERTICAL_REGISTRY, get_vertical, resolve_booking_module
from app.services.public_service import _resolve_booking_module_for

ALLOWED = {"default_services", "page_template", "staff_backing_model", "booking_module"}

print("\n── R-1  restaurant is registered, and the other two are untouched ──")
check("R-1a  restaurant present", "restaurant" in VERTICAL_REGISTRY)
check("R-1b  exactly three verticals", sorted(VERTICAL_REGISTRY) == ["barber", "clinic", "restaurant"],
      f"got {sorted(VERTICAL_REGISTRY)}")
# regression guard: the two that already worked must be byte-identical to what they were
check("R-1c  barber unchanged", VERTICAL_REGISTRY["barber"] == {
    "default_services": ["reservations", "catalog", "whatsapp_ordering"],
    "page_template": None, "staff_backing_model": "Barber", "booking_module": "barber"})
check("R-1d  clinic unchanged", VERTICAL_REGISTRY["clinic"] == {
    "default_services": ["reservations"],
    "page_template": None, "staff_backing_model": "Resource", "booking_module": "clinic"})

print("\n── R-2  the entry obeys the file's own ALLOWED shape, no extra keys ──")
for name, entry in VERTICAL_REGISTRY.items():
    check(f"R-2  {name}: keys == ALLOWED", set(entry) == ALLOWED,
          f"extra={set(entry)-ALLOWED} missing={ALLOWED-set(entry)}")

print("\n── R-3  default_services matches what caracas really carries in production ──")
# measured 2026-09-30 by a sealed read-only reader against production `client_services`
MEASURED_ON_CARACAS = {"catalog", "restaurant", "restaurant.menu", "whatsapp_ordering"}
check("R-3  restaurant.default_services == caracas' live service set",
      set(VERTICAL_REGISTRY["restaurant"]["default_services"]) == MEASURED_ON_CARACAS,
      f"registry={set(VERTICAL_REGISTRY['restaurant']['default_services'])}")

print("\n── R-4  the three Nones are declared, not missing ──")
r = VERTICAL_REGISTRY["restaurant"]
check("R-4a  page_template is None", r["page_template"] is None)
check("R-4b  staff_backing_model is None — a restaurant books no person", r["staff_backing_model"] is None)
check("R-4c  booking_module is None — no booking engine is opened here", r["booking_module"] is None)
# a None that is PRESENT is different from a key that is absent; R-2 already proves presence,
# this proves we did not smuggle a string in later
check("R-4d  no restaurant booking module invented", resolve_booking_module("restaurant") is None)

print("\n── R-5  registered-but-no-booking is now distinguishable AT THE REGISTRY level ──")
check("R-5a  get_vertical('restaurant') returns an entry", get_vertical("restaurant") is not None)
check("R-5b  get_vertical('typo-xyz') returns None", get_vertical("typo-xyz") is None)
check("R-5c  ...yet resolve_booking_module gives BOTH the same None",
      resolve_booking_module("restaurant") is None and resolve_booking_module("typo-xyz") is None)

print("\n── R-6  provisioning fails CLOSED for restaurant, it does not provision the wrong object ──")
import app.services.provisioning_service as _prov
src = inspect.getsource(_prov)
tree = ast.parse(src)
for n in ast.walk(tree):
    if isinstance(n, ast.Expr) and isinstance(n.value, ast.Constant) and isinstance(n.value.value, str):
        n.value.value = ""
code = ast.unparse(tree)
check("R-6a  provisioning raises on an unknown staff_backing_model",
      "No provisioning implementation for staff_backing_model" in code)
check("R-6b  and it has no branch for a null staff model",
      "staff_backing_model is None" not in code and "staff_model is None" not in code)

print("\n── 🔴 R-7  THE KNOWN GAP — registering did NOT silence the warning ──")


class Rec:
    def __init__(self, v):
        self.vertical, self.slug = v, "caracas"


def warned_for(vertical):
    buf = io.StringIO()
    h = logging.StreamHandler(buf)
    lg = logging.getLogger("app.services.public_service")
    lg.addHandler(h); lg.setLevel(logging.WARNING)
    try:
        _resolve_booking_module_for(Rec(vertical))
        return buf.getvalue()
    finally:
        lg.removeHandler(h)


w_rest, w_typo = warned_for("restaurant"), warned_for("typo-xyz")
w_barber, w_null = warned_for("barber"), warned_for(None)

# positive control FIRST: the detector must be able to see a warning at all, and silence at all
check("R-7-ctrl-a  a real unregistered vertical DOES warn (detector sees warnings)", bool(w_typo.strip()))
check("R-7-ctrl-b  barber does NOT warn (detector sees silence)", not w_barber.strip())
check("R-7-ctrl-c  vertical=None does NOT warn (legacy tenants stay quiet)", not w_null.strip())

check("🔴 R-7  restaurant STILL warns — registering does not fix this", bool(w_rest.strip()),
      "if this now fails, the gap was fixed: say so and name the old behaviour")
check("🔴 R-7b  and it is still mislabelled 'a provisioning defect'",
      "provisioning defect" in w_rest, "the message no longer says it — update this assertion")

print(f"\nPASS={PASS}  FAIL={FAIL}")
if FAIL:
    print("\n🔴 A failure here is not automatically a regression — R-7 is a guard on a KNOWN gap.\n"
          "   If R-7 or R-7b failed, `_resolve_booking_module_for` was changed. That is the fix we\n"
          "   want; update these two assertions and name the behaviour they used to pin.")
sys.exit(1 if FAIL else 0)
