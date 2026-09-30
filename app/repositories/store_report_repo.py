"""Store/Restaurant Report Repository — Prisma queries only.

ADR-0008 D-4, plan Phase 1. Every query filters by `clientId` — no exception
(`rules/global.md`, and `rules/backend/architecture.md` §3: filtered AT THE DB, never in Python
after fetching).

WHY ONE READ AND NOT FOUR
-------------------------
A report needs order count, revenue, an hourly/daily distribution and a ranked item list for the
SAME window. Four aggregate queries would be four round trips to a database that is ~16,600 km
away (`project_db_latency_root_cause`: the app is in Amsterdam, the database in Sydney — a round
trip is expensive enough that the count matters more than the rows).

So this module does ONE windowed read with the item rows included, and the shaping happens in the
service above it. That is a deliberate trade: more bytes over one round trip, rather than fewer
bytes over four.

🔴 NO INDEX BACKS THIS QUERY YET — MEASURED, NOT ASSUMED
---------------------------------------------------------
`StoreOrder` carries `@@index([clientId])`, `@@index([status])` and `@@index([clientId,
customerId])`. There is **no index on `createdAt`**, so a date-ranged read scans this tenant's
orders and filters. That is acceptable at today's volumes — the largest real order count on any
tenant is 4 (`beit-al-fakhar`, measured 2026-09-30) — and it is NOT acceptable silently at scale.

Adding `@@index([clientId, createdAt])` is a production DDL change with its own decision, listed
as Q5 in `.claudedocs/plans/restaurant-visual-report.md` and deliberately not bundled into this
phase. By contrast `Reservation` already carries `@@index([clientId, moduleKey, reservedAt])`, so
the barber vertical's reader will not inherit this problem when it is written.

THE TIME REPRESENTATION
-----------------------
`createdAt` is stored in the system's labelled-UTC convention (F-TZ-1 — see
`app/services/report_contract.py`'s docstring and `availability_engine.py:25-45`). The bounds
passed in here come from `report_contract`, which builds them in that same representation, so the
comparison needs no conversion at either end. A caller that builds its own bounds from
`datetime.now(timezone.utc)` would be off by the tenant's UTC offset — the exact defect `044aafe`
fixed in 2026-08.
"""

from datetime import datetime

from app.db.client import prisma_client

# Terminal states that must not count toward revenue. Read off `ORDER_STATUSES` in
# `app/api/v1/admin/store.py:46-50` rather than invented here: that list is the one place the
# store and restaurant paths agree on what a status means, and `admin/store.py`'s own
# `order_stats` already excludes exactly these two from its revenue sum.
NON_REVENUE_STATUSES = frozenset({"cancelled", "refunded"})


async def list_orders_in_window(client_id: str, starts_at: datetime, ends_at: datetime) -> list:
    """This tenant's orders in the half-open window [starts_at, ends_at), with their item rows.

    Half-open matches `ReportPeriod.contains`: an order written at exactly midnight belongs to the
    day beginning, never to both and never to neither.

    `catalogItem` is included because a ranked item list needs the item's NAME, and the name lives
    on `CatalogItem`, not on `StoreOrderItem` (which carries only `catalogItemId`, `quantity`,
    `unitPrice` and `totalPrice`). Resolving names in a second pass would be one more round trip
    for data this one already has to fetch a key for.

    Returns rows, never an aggregate: shaping is the service's job, and a repository that returned
    a computed total would be business logic in the wrong layer.
    """
    return await prisma_client.storeorder.find_many(
        where={
            "clientId":  client_id,
            "createdAt": {"gte": starts_at, "lt": ends_at},
        },
        include={"items": {"include": {"catalogItem": True}}},
        order={"createdAt": "asc"},
    )


async def count_orders_all_time(client_id: str) -> int:
    """Every order this tenant has ever had, ignoring any window.

    This is the POSITIVE CONTROL, and it exists in the repository rather than in a test because
    the service uses it to tell two different zeros apart:

        "you had no orders this week"        — the tenant has orders, just not in this window
        "you have never had an order at all" — a different sentence, and a different product state

    Without it, a reader that is silently pointed at the wrong tenant, or a window built in the
    wrong time representation, returns zero and looks exactly like a quiet week. That failure mode
    has cost this project real time more than once (`feedback_test_evidence_discipline`), so the
    distinguishing query is part of the capability rather than an afterthought in a test.
    """
    return await prisma_client.storeorder.count(where={"clientId": client_id})
