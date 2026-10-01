"""Where a PRINTED QR code points. Ratified by Salman 2026-10-01.

Run:  venv/bin/python scripts/test_qr_target.py

🔴 WHY THIS FILE EXISTS
The QR endpoint hardcoded the literal path "store", written for the Store Template Pilot
(2026-07-31). Measured in a real browser on 2026-10-01: `/caracas/store` renders NOTHING — zero
text after 45 seconds — while `/caracas/menu` renders the full 97-item menu. The dashboard was
therefore offering a restaurant owner a code that leads to a blank page, and the whole point of a
printed code is that it cannot be corrected afterwards.

WHAT THIS DOES NOT PROVE
It does not prove any URL renders. That was proven separately, in a real browser against
production: caracas/menu, arizona/menu, a bare /rk and footlab/store all returned real content.
This pins the RULE; the browser proved the TARGETS.
"""
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


import app.main  # noqa: F401,E402  — real import order; the settings module alone trips a
                 # pre-existing circular import, which is not this change's business to fix
from app.api.v1.admin import settings as st  # noqa: E402

p = st._qr_path_for

print("\n── Q-1  a restaurant gets its MENU, never the store ──")
check("Q-1a  restaurant.menu → menu", p(["catalog", "restaurant.menu", "whatsapp_ordering"]) == "menu")
check("Q-1b  restaurant → menu", p(["restaurant"]) == "menu")
check("Q-1c  🔴 THE REGRESSION: a restaurant also carries `catalog`, and must NOT get 'store'",
      p(["catalog", "restaurant", "restaurant.menu", "whatsapp_ordering"]) != "store",
      "this exact service set is caracas, and 'store' renders a blank page for it")
check("Q-1d  restaurant beats store when a tenant somehow has both",
      p(["store", "restaurant"]) == "menu")

print("\n── Q-2  a booking vertical is NOT guessed at ──")
check("Q-2a  reservations → None, so the resolver picks the tenant's own landing page",
      p(["reservations"]) is None)
check("Q-2b  🔴 a barber carrying `store` must still NOT be sent to /store",
      p(["lia", "reservations", "store", "whatsapp_ordering"]) is None,
      "that service set is rk, a real paying tenant; /rk/store is not where its customers book")
check("Q-2c  and a real store tenant still gets /store",
      p(["catalog", "store", "store.cart"]) == "store")

print("\n── Q-3  the unknown case is honest, not invented ──")
check("Q-3a  no recognised service → None", p(["gallery", "booking"]) is None)
check("Q-3b  empty → None", p([]) is None)
check("Q-3c  None input does not raise", p(None) is None)

print("\n── Q-4  a printed link must not move ──")
check("Q-4a  the base is the ratified host",
      st.STORE_QR_BASE_URL == "https://alzabt.salmansaas.com",
      "Salman 2026-10-01: «عطيت أ ليعتمده الكلاينت»")
import ast, inspect  # noqa: E402

def _code_only(text):
    """CODE only — comments are dropped by unparse, docstrings blanked. The module's own comments
    explain WHY lifecycle_state is not consulted, so a grep for it would match the explanation."""
    tree = ast.parse(text)
    for node in ast.walk(tree):
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant) \
                and isinstance(node.value.value, str):
            node.value.value = ""
    return ast.unparse(tree)

src = _code_only(inspect.getsource(st))
check("Q-4b  the QR URL does not consult lifecycle_state — a trial→subscribed move must not break "
      "a sheet already taped to a counter",
      "lifecycle_state" not in src)
check("Q-4b-ctrl  ...and the detector WOULD see a real use of it",
      "lifecycle_state" in _code_only("x = client.lifecycle_state\n"))
check("Q-4c  error correction is H, which is what makes a centre logo legal later",
      "ERROR_CORRECT_H" in src)

print(f"\nPASS={PASS}  FAIL={FAIL}")
sys.exit(1 if FAIL else 0)
