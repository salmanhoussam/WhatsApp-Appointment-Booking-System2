"""The Report Data Contract and the restaurant reader — Phase 1 of ADR-0008.

Run:  venv/bin/python scripts/test_report_contract.py

WHAT THIS SUITE IS FOR
----------------------
Every assertion runs with NO DATABASE. That is deliberate, not a limitation: the arithmetic a
report makes — revenue excluding refunds, a ranked list, a delta against last week — is exactly
what a live-database test stops checking, because such a test ends up asserting that the database
is reachable. `build_report()` is pure so these can be real.

The structural checks (RC-2, RC-5, RC-6, RC-1) parse the source with `ast` rather than grepping
it. `feedback_assert_on_code_not_text` records why, from three real failures in one session: a
comment explaining a deliberate omission matches the grep and inverts the result.

🔴 POSITIVE CONTROLS FIRST. Several checks below assert that something is ABSENT. An absence
proves nothing unless the detector can be shown to find the thing when it IS there, so each of
those carries a control that plants the pattern and requires it to be seen.
"""
import ast
import sys
from dataclasses import fields as dataclass_fields
from datetime import datetime, timedelta, timezone
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


from app.services.report_contract import (  # noqa: E402
    Report,
    ReportMetric,
    ReportPeriod,
    ReportSeries,
    ReportTable,
    day_period,
    empty_report,
    previous_period,
    week_period,
)
from app.services import restaurant_report_service as rrs  # noqa: E402
from app.repositories import store_report_repo  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CONTRACT_SRC = (ROOT / "app/services/report_contract.py").read_text(encoding="utf-8")
READER_SRC = (ROOT / "app/services/restaurant_report_service.py").read_text(encoding="utf-8")
REPO_SRC = (ROOT / "app/repositories/store_report_repo.py").read_text(encoding="utf-8")


def _strip_docstrings(src: str) -> str:
    """Source with every docstring and bare string expression removed.

    Without this, a module that EXPLAINS in prose why it never calls `datetime.now()` fails the
    check that it never calls `datetime.now()` — which is exactly the false positive
    `feedback_assert_on_code_not_text` was written about.
    """
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant) \
                and isinstance(node.value.value, str):
            node.value.value = ""
    return ast.unparse(tree)


# ── fakes ─────────────────────────────────────────────────────────────────────
# Deliberately NOT poorer than reality: each carries the real field names and the real types the
# Prisma rows carry. `feedback_fake_poorer_than_reality` — a fake missing a field gives a false
# negative, and a fake KINDER than reality sank a live phase once.

class FakeCatalogItem:
    def __init__(self, name_ar=None, name_en=None):
        self.name_ar, self.name_en = name_ar, name_en


class FakeOrderItem:
    def __init__(self, catalog_item_id, quantity, total_price, name_ar=None, name_en=None):
        self.catalogItemId = catalog_item_id
        self.quantity = quantity
        self.totalPrice = total_price
        self.catalogItem = FakeCatalogItem(name_ar, name_en)


class FakeOrder:
    def __init__(self, created_at, total_price, status="delivered", items=None):
        self.createdAt = created_at
        self.totalPrice = total_price
        self.status = status
        self.items = items or []


# A fixed moment so nothing here depends on when the suite runs. Carries the system's labelled-UTC
# representation, which is what the contract builds and what the rows are stored in (F-TZ-1).
NOON_WED = datetime(2026, 9, 30, 12, 0, 0, tzinfo=timezone.utc)


print("\n── RC-2  the contract inherits 'now', it does not re-derive it ──")
contract_code = _strip_docstrings(CONTRACT_SRC)
check("RC-2a  report_contract imports wall_clock_now from availability_engine",
      "wall_clock_now" in contract_code and "availability_engine" in contract_code)
check("RC-2b  and never calls datetime.now() itself — F-TZ-1 stays one definition",
      "datetime.now()" not in contract_code and "datetime.now(" not in contract_code,
      "a local now() would put the reader hours away from the writer; see ADR-0008 D-3")
check("RC-2-ctrl  the detector DOES see a planted datetime.now( — absence is not blindness",
      "datetime.now(" in _strip_docstrings("import datetime\nx = datetime.now()\n"))

print("\n── RC-6  no report module may reach a model ──")
_MODEL_TOKENS = ("anthropic", "openai", "Anthropic(", "ChatCompletion", "claude_client")
for name, src in (("contract", contract_code), ("reader", _strip_docstrings(READER_SRC))):
    check(f"RC-6  {name}: zero LLM client references",
          not any(t.lower() in src.lower() for t in _MODEL_TOKENS),
          "ADR-0008 D-4: no figure in a report may come from a model")
check("RC-6-ctrl  the detector DOES see a planted anthropic import",
      any(t.lower() in "import anthropic".lower() for t in _MODEL_TOKENS))

print("\n── RC-5  the contract carries no vertical-specific field name ──")
_VERTICAL_WORDS = ("order", "reservation", "barber", "restaurant", "clinic", "item", "table_number")
bad = []
for dc in (ReportPeriod, ReportMetric, ReportSeries, ReportTable, Report):
    for f in dataclass_fields(dc):
        if any(w in f.name.lower() for w in _VERTICAL_WORDS):
            bad.append(f"{dc.__name__}.{f.name}")
check("RC-5  every contract field name is vertical-agnostic", not bad, f"offending: {bad}")
check("RC-5-ctrl  the word list WOULD catch a field called orders_count",
      any(w in "orders_count" for w in _VERTICAL_WORDS))

print("\n── RC-1  every repository read is scoped by client_id ──")
repo_tree = ast.parse(REPO_SRC)
repo_fns = [n for n in ast.walk(repo_tree) if isinstance(n, (ast.AsyncFunctionDef, ast.FunctionDef))]
check("RC-1a  the repository exposes at least one read", len(repo_fns) >= 1)
for fn in repo_fns:
    args = [a.arg for a in fn.args.args]
    check(f"RC-1  {fn.name}() takes client_id as its first argument",
          bool(args) and args[0] == "client_id", f"signature was {args}")
check("RC-1b  every Prisma call in the repository names clientId in its where",
      REPO_SRC.count("prisma_client.") == REPO_SRC.count('"clientId"'),
      f'{REPO_SRC.count("prisma_client.")} prisma calls vs {REPO_SRC.count(chr(34) + "clientId" + chr(34))} clientId mentions')

print("\n── P-1  period arithmetic, on a pinned moment ──")
d = day_period(NOON_WED)
check("P-1a  a day starts at the shop's midnight", d.starts_at == NOON_WED.replace(hour=0),
      str(d.starts_at))
check("P-1b  and is exactly 24 hours long", d.ends_at - d.starts_at == timedelta(days=1))
check("P-1c  the window is HALF-OPEN at the start (midnight belongs to the day beginning)",
      d.contains(d.starts_at))
check("P-1d  and half-open at the end (the next midnight does not)", not d.contains(d.ends_at))
check("P-1e  the bound keeps the stored representation — no conversion at either end",
      d.starts_at.tzinfo == NOON_WED.tzinfo)

w = week_period(NOON_WED)   # 2026-09-30 is a Wednesday
check("P-1f  a week starts on Monday", w.starts_at.weekday() == 0, str(w.starts_at))
check("P-1g  and is exactly 7 days long", w.ends_at - w.starts_at == timedelta(days=7))
check("P-1h  Wednesday falls inside its own week", w.contains(NOON_WED))

pw = previous_period(w)
check("P-1i  the previous week ends exactly where this one starts", pw.ends_at == w.starts_at)
check("P-1j  and is the same length — comparison is like for like",
      pw.ends_at - pw.starts_at == w.ends_at - w.starts_at)
check("P-1k  the two windows do not overlap by even one microsecond",
      not pw.contains(w.starts_at))

print("\n── RC-4  an empty period is a VALID report, never None and never invented ──")
er = build = rrs.build_report("caracas", d, orders=[], previous_orders=[], ever_had_an_order=True)
check("RC-4a  a period with zero rows still returns a Report", isinstance(er, Report))
check("RC-4b  it is flagged empty", er.is_empty)
check("RC-4c  it carries zero metrics rather than zero-valued fabrications", er.metrics == ())
check("RC-4d  and it still carries a headline — a branch with no message is incomplete",
      bool(er.headline.strip()))
check("RC-4e  empty_report() is the same shape",
      isinstance(empty_report("x", "restaurant", d, "h"), Report))

print("\n── PC-1  two different zeros are told apart (the positive control) ──")
quiet = rrs.build_report("caracas", d, [], [], ever_had_an_order=True)
never = rrs.build_report("caracas", d, [], [], ever_had_an_order=False)
check("PC-1a  'a quiet day' and 'never sold anything' produce DIFFERENT headlines",
      quiet.headline != never.headline,
      "without this, a reader aimed at the wrong tenant looks exactly like a quiet day")
check("PC-1b  the never-sold sentence is the one that mentions the first order",
      "أول" in never.headline, never.headline)

print("\n── R-1  revenue excludes cancelled and refunded, and nothing else ──")
orders = [
    FakeOrder(NOON_WED, 10.0, "delivered"),
    FakeOrder(NOON_WED, 25.5, "ready"),
    FakeOrder(NOON_WED, 99.0, "cancelled"),
    FakeOrder(NOON_WED, 50.0, "refunded"),
    FakeOrder(NOON_WED, 4.5, "pending"),
]
check("R-1a  revenue sums only the four live statuses", rrs._revenue(orders) == 40.0,
      f"got {rrs._revenue(orders)} — expected 10 + 25.5 + 4.5")
check("R-1b  the exclusion set is the repository's, not a second opinion",
      store_report_repo.NON_REVENUE_STATUSES == frozenset({"cancelled", "refunded"}))
check("R-1c  a pending order still counts — it is money owed, not money lost",
      rrs._revenue([FakeOrder(NOON_WED, 7.0, "pending")]) == 7.0)

print("\n── T-1  top items rank by quantity and group by ID, not by name ──")
dup = [
    FakeOrder(NOON_WED, 30.0, "delivered", items=[
        FakeOrderItem("id-A", 2, 20.0, name_ar="شاورما"),
        FakeOrderItem("id-B", 1, 10.0, name_ar="شاورما"),   # SAME NAME, different item
    ]),
    FakeOrder(NOON_WED, 15.0, "delivered", items=[
        FakeOrderItem("id-A", 3, 30.0, name_ar="شاورما"),
    ]),
]
tbl = rrs._top_items(dup)
check("T-1a  two items sharing a name stay two rows — production holds 5 duplicate names",
      len(tbl.rows) == 2, f"rows={tbl.rows}")
check("T-1b  quantities aggregate per catalogItemId (id-A = 2 + 3)",
      tbl.rows[0][1] == 5.0, str(tbl.rows))
check("T-1c  ranked by quantity, highest first", tbl.rows[0][1] >= tbl.rows[1][1])
check("T-1d  revenue rides along as the secondary figure (id-A = 20 + 30)",
      tbl.rows[0][2] == 50.0, str(tbl.rows))

cancelled_only = [FakeOrder(NOON_WED, 9.0, "cancelled",
                            items=[FakeOrderItem("id-C", 4, 9.0, name_ar="عصير")])]
check("T-1e  a cancelled order contributes no items to the ranking",
      rrs._top_items(cancelled_only).rows == ())
check("T-1f  an item with no catalogItem row renders as a dash, never as blank",
      rrs._item_label(FakeOrderItem("id-X", 1, 1.0)) == "—")

print("\n── S-1  series pre-seed their buckets so a quiet hour is visible ──")
s_day = rrs._orders_series([FakeOrder(NOON_WED, 1.0)], d)
check("S-1a  a day series has all 24 hours", len(s_day.points) == 24)
check("S-1b  the order lands in its own hour", dict(s_day.points)["12"] == 1.0)
check("S-1c  an empty hour is present as zero, not missing", dict(s_day.points)["03"] == 0.0)
s_week = rrs._orders_series([FakeOrder(NOON_WED, 1.0)], w)
check("S-1d  a week series has all 7 days", len(s_week.points) == 7)
check("S-1e  Wednesday's bucket holds it", s_week.points[2][1] == 1.0, str(s_week.points))

print("\n── D-1  a delta from zero is undefined, not 100% ──")
check("D-1a  previous=0 gives None, so the renderer must say something honest",
      ReportMetric(key="k", label_ar="l", value=5, previous=0).delta_pct is None)
check("D-1b  previous=None gives None", ReportMetric(key="k", label_ar="l", value=5).delta_pct is None)
check("D-1c  a real comparison computes",
      ReportMetric(key="k", label_ar="l", value=12, previous=10).delta_pct == 20.0)
check("D-1d  and a fall is negative",
      ReportMetric(key="k", label_ar="l", value=8, previous=10).delta_pct == -20.0)

print("\n── H-1  every headline branch produces a real sentence ──")
full = rrs.build_report("caracas", w,
                        orders=[FakeOrder(NOON_WED, 10.0)] * 12,
                        previous_orders=[FakeOrder(NOON_WED, 10.0)] * 10)
check("H-1a  a week with a real comparison names the direction and the number",
      "أحسن" in full.headline and "٪" in full.headline, full.headline)
no_prev = rrs.build_report("caracas", w, orders=[FakeOrder(NOON_WED, 10.0)] * 3, previous_orders=[])
check("H-1b  with no previous window it states the count instead of inventing a comparison",
      "3" in no_prev.headline and "٪" not in no_prev.headline, no_prev.headline)
check("H-1c  no headline is empty in any branch",
      all(r.headline.strip() for r in (full, no_prev, quiet, never)))

print("\n── B-1  a full report is well-formed end to end ──")
check("B-1a  vertical is stamped on the report", full.vertical == "restaurant")
check("B-1b  both metrics are present", {m.key for m in full.metrics} == {"orders", "revenue"})
check("B-1c  one series and one table", len(full.series) == 1 and len(full.tables) == 1)
check("B-1d  a report with rows is not flagged empty", not full.is_empty)
check("B-1e  the period travels with it", full.period.kind == "week")

print(f"\nPASS={PASS}  FAIL={FAIL}")
sys.exit(1 if FAIL else 0)
