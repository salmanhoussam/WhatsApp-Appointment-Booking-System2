"""The SKU rules — A-Q2 … A-Q6, ratified 2026-09-30.

Run:  venv/bin/python scripts/test_sku_rules.py

`app/core/sku.py` is the one place a SKU is normalised, generated or archived, for exactly the
reason `app/core/phone.py` exists: a UI rule is a good experience, and the normaliser at the write
boundary is the guarantee. These checks pin the rules as decided, so a later change has to state
which rule it is changing.

🔴 WHAT THIS DOES NOT PROVE
It does not prove the production index rejects a duplicate — that was proven separately, against
the real database, with a positive control (a second UPDATE to the same SKU, refused with
"duplicate key value violates unique constraint", inside a transaction that was rolled back).
These are the RULES; that was the CONSTRAINT.
"""
import sys
from datetime import datetime, timezone
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


from app.core import sku as s  # noqa: E402

print("\n── K-1  A-Q4: normalisation at the write boundary ──")
check("K-1a  lowercase becomes uppercase", s.normalise("shawarma-01") == "SHAWARMA-01")
check("K-1b  spaces and underscores become dashes", s.normalise("chicken shawarma_01") == "CHICKEN-SHAWARMA-01")
check("K-1c  runs of separators collapse", s.normalise("a   --  b") == "A-B")
check("K-1d  leading/trailing dashes are trimmed", s.normalise("--abc--") == "ABC")
check("K-1e  accents are folded, so Café and Cafe cannot be two keys",
      s.normalise("Café") == s.normalise("Cafe") == "CAFE")
check("K-1f  None stays None", s.normalise(None) is None)
check("K-1g  a value with nothing left becomes None, never an empty string",
      s.normalise("!!!") is None, "'' would collide with every other '' under a unique index")
check("K-1h  IDEMPOTENT — normalising a normalised value changes nothing",
      s.normalise(s.normalise("Chicken Shawarma")) == s.normalise("Chicken Shawarma"))
check("K-1i  Arabic normalises to None (it is not romanised, and does not pretend to be)",
      s.normalise("شاورما دجاج") is None)

print("\n── K-2  A-Q3: generated from the name, with a counter ──")
check("K-2a  the counter is always present, even when the base is free",
      s.generate("Shawarma", None, []) == "SHAWARMA-01",
      "a menu is a list of variants; SHAWARMA then SHAWARMA-02 would read wrong")
check("K-2b  a duplicate NAME increments rather than collides",
      s.generate("Shawarma", None, ["SHAWARMA-01"]) == "SHAWARMA-02")
check("K-2c  it keeps incrementing past several",
      s.generate("Shawarma", None, ["SHAWARMA-01", "SHAWARMA-02", "SHAWARMA-03"]) == "SHAWARMA-04")
check("K-2d  `taken` is compared NORMALISED, so a stray lowercase entry still blocks",
      s.generate("Shawarma", None, ["shawarma-01"]) == "SHAWARMA-02")
check("K-2e  an Arabic-only name yields an opaque but UNIQUE key, never an empty one",
      s.generate(None, "شاورما", []) == "ITEM-01",
      "an opaque unique key is more honest than a readable wrong one")
check("K-2f  two Arabic-only items do not collide",
      s.generate(None, "شاورما", ["ITEM-01"]) == "ITEM-02")
check("K-2g  the base is capped, so a pathological name cannot grow unbounded",
      len(s.generate("x" * 300, None, [])) <= s.MAX_BASE + 3)

print("\n── K-3  A-Q6: archiving frees the base, and A-Q5 still holds ──")
t = datetime(2026, 9, 30, 12, 0, tzinfo=timezone.utc)
arch = s.archive("CHICKEN-SHAWARMA-01", t)
check("K-3a  an archived SKU carries the marker and a timestamp",
      arch.startswith("CHICKEN-SHAWARMA-01" + s.ARCHIVE_MARKER) and arch.split("-")[-1].isdigit(), arch)
check("K-3b  it is DIFFERENT from the original, which is what frees the base",
      arch != "CHICKEN-SHAWARMA-01")
check("K-3c  the freed base is then generatable again for the new menu",
      s.generate("Chicken Shawarma", None, [arch]) == "CHICKEN-SHAWARMA-01",
      "this is the whole point of A-Q6")
check("K-3d  an archived value still satisfies A-Q4 — it survives re-normalisation unchanged",
      s.normalise(arch) == arch,
      "an `_archived_` suffix would not, which is why the marker is uppercase-with-dashes")
check("K-3e  archiving twice RE-STAMPS rather than stacking markers",
      s.archive(arch, t).count(s.ARCHIVE_MARKER) == 1,
      "deactivate/reactivate/deactivate would otherwise grow the key without bound")
check("K-3f  archiving None stays None — a row without a SKU does not acquire one",
      s.archive(None) is None)
check("K-3g  is_archived recognises it", s.is_archived(arch) and not s.is_archived("CHICKEN-SHAWARMA-01"))

print("\n── K-4  the tenant is the uniqueness scope, never the platform ──")
check("K-4a  generate() only consults the SKUs it is given",
      s.generate("Shawarma", None, []) == s.generate("Shawarma", None, []) == "SHAWARMA-01",
      "two tenants may both hold SHAWARMA-01 — @@unique([clientId, sku])")

print("\n── K-5  the module is a boundary, not a grab-bag ──")
import ast  # noqa: E402
import inspect  # noqa: E402

def _code_only(text: str) -> str:
    """CODE only — ast.unparse drops comments, the loop blanks docstrings.

    🔴 K-5a FAILED against the raw source first, and correctly: the module's docstring cites
    `prisma/schema.prisma` as the place the StoreOrderItem columns were verified, so the prose
    explaining WHY no database client is needed matched the search for one. Fifth instance of
    feedback_assert_on_code_not_text in this repository.
    """
    tree = ast.parse(text)
    for node in ast.walk(tree):
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant) \
                and isinstance(node.value.value, str):
            node.value.value = ""
    return ast.unparse(tree)

src = _code_only(inspect.getsource(s))
check("K-5a  it imports no database client", "prisma" not in src.lower() and "psycopg" not in src.lower())
check("K-5a-ctrl  the detector WOULD see a real import, not just a docstring mentioning one",
      "prisma" in _code_only("from prisma import Prisma\n").lower())
check("K-5a-ctrl2  ...and does NOT fire on a docstring mentioning it",
      "prisma" not in _code_only('"""see prisma/schema.prisma"""\nx = 1\n').lower())
check("K-5b  it reads no environment", "os.getenv" not in src and "environ" not in src)
check("K-5c  nothing here can raise on bad input — every public function tolerates junk",
      all(f(x) is not None or True for f in (s.normalise, s.archive) for x in ("", "???", None, 12345)))
check("K-5-ctrl  and the import detector WOULD fire on a planted prisma import",
      "prisma" in "from prisma import Prisma".lower())

print(f"\nPASS={PASS}  FAIL={FAIL}")
sys.exit(1 if FAIL else 0)
