"""The restaurant vertical's report reader.

ADR-0008 D-2/D-4, plan Phase 1. This is the FIRST reader registered against the Report Data
Contract; `barber` and `clinic` get their own later, and adding one must not require editing
`report_contract.py` (ADR-0008 D-2). If a future vertical's reader cannot be written without
changing the contract, that is the signal the contract was shaped around restaurants — say so
rather than widening it quietly.

THE PURE/IMPURE SPLIT, AND WHY IT IS THE POINT
----------------------------------------------
`build_report()` takes ROWS and returns a `Report`. It touches nothing. `load_report()` does the
single database read and hands the rows over.

That split is what lets the suite assert real arithmetic — revenue excluding refunds, a top-items
ranking, a delta against last week — against known rows with **no database at all**, which is the
only way those assertions stay honest. A test that needs a live database to check a sum ends up
asserting that the database is reachable (`feedback_test_evidence_discipline`).

🔴 NO NUMBER HERE COMES FROM A MODEL
-------------------------------------
Every figure is computed from rows, and `headline` is SELECTED from those figures by the rules in
`_pick_headline`, never written by an LLM. ADR-0008 D-4. This module imports no model client and
`scripts/test_report_contract.py` asserts that structurally (RC-6).
"""

from __future__ import annotations

from collections import defaultdict
from typing import Optional, Sequence

from app.repositories import store_report_repo
from app.services.report_contract import (
    Report,
    ReportMetric,
    ReportPeriod,
    ReportSeries,
    ReportTable,
    empty_report,
    previous_period,
)

VERTICAL = "restaurant"

# How many rows a ranked list carries. Three, because the first screen of a phone is the whole
# product here and a ranked list of ten is a table nobody reads on a phone.
TOP_ITEMS = 3


def _revenue(orders: Sequence) -> float:
    """Total of every order that is not cancelled or refunded.

    The exclusion set is `store_report_repo.NON_REVENUE_STATUSES`, which mirrors what
    `admin/store.py`'s own `order_stats` already excludes. Two revenue definitions that everyone
    assumes agree are worse than one — the same reasoning `reservation_service.py:567-572` gives
    for keeping its past-guard comparison character-for-character identical to the routes'.
    """
    return round(
        sum(
            float(o.totalPrice)
            for o in orders
            if o.status not in store_report_repo.NON_REVENUE_STATUSES
        ),
        2,
    )


def _item_label(item) -> str:
    """The name to show for one order line.

    Arabic first — every owner this is built for reads Arabic, and `name_ar` is the field the
    catalog contract calls canonical (`rules/frontend/catalog-contract.md` §6). Falls back to
    English, then to a dash rather than to an empty string: a blank row in a ranked list reads as
    a rendering bug, while a dash reads as missing data, which is what it is.
    """
    catalog_item = getattr(item, "catalogItem", None)
    if catalog_item is None:
        return "—"
    return getattr(catalog_item, "name_ar", None) or getattr(catalog_item, "name_en", None) or "—"


def _top_items(orders: Sequence, limit: int = TOP_ITEMS) -> ReportTable:
    """The most-ordered items in the window, ranked by quantity sold.

    Ranked by QUANTITY, not by revenue, and the difference is the owner's decision: quantity tells
    him what the kitchen is actually making, revenue tells him what pays. Both are real questions
    and this picks one on purpose — revenue is carried alongside as the secondary figure so the
    renderer can show it without a second query.

    Aggregated by `catalogItemId` rather than by name, because production already holds five
    duplicate item names (`project_catalog_item_has_no_inventory`): grouping by name would silently
    merge two different items into one row.
    """
    by_item: dict[str, dict] = defaultdict(lambda: {"qty": 0.0, "total": 0.0, "label": "—"})
    for order in orders:
        if order.status in store_report_repo.NON_REVENUE_STATUSES:
            continue
        for item in (getattr(order, "items", None) or []):
            bucket = by_item[str(item.catalogItemId)]
            bucket["qty"] += float(item.quantity)
            bucket["total"] += float(item.totalPrice)
            bucket["label"] = _item_label(item)

    ranked = sorted(by_item.values(), key=lambda b: b["qty"], reverse=True)[:limit]
    return ReportTable(
        key      = "top_items",
        label_ar = "أكتر شي انطلب",
        rows     = tuple((b["label"], b["qty"], round(b["total"], 2)) for b in ranked),
    )


def _orders_series(orders: Sequence, period: ReportPeriod) -> ReportSeries:
    """Order counts bucketed by hour (a day) or by weekday (a week).

    Buckets are pre-seeded with zero so a quiet hour appears as a gap in the chart rather than
    vanishing from the axis — a chart that silently drops empty buckets makes a slow Tuesday look
    like it never existed, which is the opposite of what an owner is looking for.
    """
    if period.kind == "day":
        counts = {h: 0.0 for h in range(24)}
        for order in orders:
            counts[order.createdAt.hour] += 1
        return ReportSeries(
            key      = "orders_by_hour",
            label_ar = "الطلبات بالساعة",
            points   = tuple((f"{h:02d}", counts[h]) for h in range(24)),
        )

    names = ["الإثنين", "الثلاثا", "الأربعا", "الخميس", "الجمعة", "السبت", "الأحد"]
    counts = {d: 0.0 for d in range(7)}
    for order in orders:
        counts[order.createdAt.weekday()] += 1
    return ReportSeries(
        key      = "orders_by_day",
        label_ar = "الطلبات بالأيام",
        points   = tuple((names[d], counts[d]) for d in range(7)),
    )


def _pick_headline(period: ReportPeriod, orders_metric: ReportMetric, ever: bool) -> str:
    """The one line the first screen shows — SELECTED, never generated.

    Four branches, and every one of them is a real state rather than a default. The fourth exists
    because of `rules/text-context-rule.md`: a branch with no message is an incomplete branch, and
    "no comparison available" is a different situation from "you did worse", which is different
    again from "you have never had an order".
    """
    if not ever:
        return "لسّا ما إجاك ولا طلب — أول ما يوصل طلب بتشوفو هون"

    if orders_metric.value == 0:
        return f"ما إجاك طلبات {period.label_ar}"

    delta = orders_metric.delta_pct
    if delta is None:
        # Either there is no previous window on record, or it was zero — and a percentage change
        # from zero is undefined, not 100%. Say the number instead of inventing a comparison.
        return f"{int(orders_metric.value)} طلب {period.label_ar}"

    direction = "أحسن" if delta >= 0 else "أقلّ"
    return f"{period.label_ar} {direction} من {previous_period(period).label_ar} بـ{abs(delta)}٪"


def build_report(
    tenant_slug: str,
    period:      ReportPeriod,
    orders:      Sequence,
    previous_orders: Sequence = (),
    ever_had_an_order: bool = True,
) -> Report:
    """Shape rows into a `Report`. Pure — no I/O, no clock, no database.

    `ever_had_an_order` is the positive control from
    `store_report_repo.count_orders_all_time`, carried in so this function can tell "a quiet week"
    apart from "this tenant has never sold anything" — two zeros that look identical in the data
    and mean completely different things to the person reading the page.
    """
    if not orders:
        return empty_report(
            tenant_slug = tenant_slug,
            vertical    = VERTICAL,
            period      = period,
            headline    = _pick_headline(
                period,
                ReportMetric(key="orders", label_ar="الطلبات", value=0, previous=len(previous_orders) or None),
                ever_had_an_order,
            ),
        )

    orders_metric = ReportMetric(
        key      = "orders",
        label_ar = "عدد الطلبات",
        value    = float(len(orders)),
        unit     = "طلب",
        previous = float(len(previous_orders)) if previous_orders else None,
    )
    revenue_metric = ReportMetric(
        key      = "revenue",
        label_ar = "المبيعات",
        value    = _revenue(orders),
        unit     = "$",
        previous = _revenue(previous_orders) if previous_orders else None,
    )

    return Report(
        tenant_slug = tenant_slug,
        vertical    = VERTICAL,
        period      = period,
        headline    = _pick_headline(period, orders_metric, ever_had_an_order),
        metrics     = (orders_metric, revenue_metric),
        series      = (_orders_series(orders, period),),
        tables      = (_top_items(orders),),
    )


async def load_report(client_id: str, tenant_slug: str, period: ReportPeriod) -> Report:
    """The one impure function: read the window, read the window before it, shape the result.

    Two windowed reads rather than one wide read split in memory, because the comparison window is
    frequently empty for a young tenant and a second small read costs less than carrying a week of
    rows that will be discarded. Both go through the repository; nothing here touches Prisma.
    """
    previous = previous_period(period)
    orders = await store_report_repo.list_orders_in_window(
        client_id, period.starts_at, period.ends_at
    )
    previous_orders = await store_report_repo.list_orders_in_window(
        client_id, previous.starts_at, previous.ends_at
    )
    # Only asked when the window is empty: for a tenant with orders the answer cannot change the
    # headline, and this saves a round trip on the common path.
    ever = True if orders else (await store_report_repo.count_orders_all_time(client_id)) > 0

    return build_report(
        tenant_slug       = tenant_slug,
        period            = period,
        orders            = orders,
        previous_orders   = previous_orders,
        ever_had_an_order = ever,
    )
