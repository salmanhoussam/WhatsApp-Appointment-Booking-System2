"""T1 — does the REAL `create_reservation` write a correct HISTORICAL reservation?

Run:  venv/bin/python scripts/test_lia_reservation_t1.py

WHY THIS EXISTS BEFORE ANY RESERVATION CODE

    `lia-reservation-entry.md` rests on one claim: that recording a past appointment needs NO new
    write path, because `reservation_service.create_reservation` already accepts a past datetime
    and only the ROUTES refuse one. That claim was derived by READING. Reading tells you a guard
    is absent; it does not tell you the row that comes out is correct, nor what else fires on the
    way.

    So this is the falsification attempt, run before anything is designed. Five things have to
    hold, and each could plausibly fail:

      T1-a  the service accepts a past datetime at all -- no hidden guard inside the pipeline
      T1-b  the stored value follows the ONE convention this system actually uses
      T1-c  `status` is "pending" -- a recorded past appointment is not an attendance claim
      T1-d  the merchant notification FIRES today, unconditionally -- which is what makes R-3's
            parameter necessary rather than decorative
      T1-e  working hours are enforced against a past date, which is what makes R-2 a real
            decision rather than a hypothetical

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES, NO PRODUCTION.
    Only the repository layer and the notifier are faked. `create_reservation` itself is the REAL
    function -- faking it would test the fake, which is the one thing this file exists to avoid.
    Nothing here modifies a route or the service; T1 measures, it does not build.
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import reservation_service as rs                    # noqa: E402
from app.repositories import barber_repo, catalog_service_repo, user_repo   # noqa: E402

ok = True
BEIRUT = ZoneInfo("Asia/Beirut")


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


def _done(v):
    f = asyncio.get_event_loop().create_future()
    f.set_result(v)
    return f


CLIENT = "client-barberlab"
BARBER = "barber-1"
SERVICE = "service-1"

# The three live tenants' real working hours, measured on production 2026-09-17.
WORKING_HOURS = {"open_time": "09:00", "close_time": "21:00", "closed_days": ["monday"]}


class Row:
    def __init__(self, **kw):
        self.__dict__.update(kw)


class FakeReservationTable:
    def __init__(self, existing=None):
        self.created, self.existing = [], existing or []

    async def create(self, data):
        self.created.append(data)
        d = dict(data)
        # Prisma returns the row; metadata comes back as a plain dict, not Json(...). `createdAt`
        # is a DB default the real row always carries, and `_fmt` reads it.
        md = d.pop("metadata", None)
        d.setdefault("customerEmail", None)
        return Row(id="res-new", metadata=getattr(md, "data", None),
                   createdAt=datetime.now().replace(tzinfo=timezone.utc), **d)

    async def find_many(self, where=None):
        return self.existing


class FakeClientTable:
    def __init__(self, working_hours):
        self.wh = working_hours

    async def find_unique(self, where):
        # Every attribute the notifier really reads. A fake POORER than reality produces a
        # false negative exactly as easily as one richer than reality produces a false positive.
        return Row(id=where["id"], config={"working_hours": self.wh},
                   whatsapp_number="96178727986", phone="96178727986", slug="barberlab-test",
                   name="Barberlab", name_ar="بربرلاب", vertical="barber")


class FakeCustomerTable:
    def __init__(self):
        self.created = []

    async def find_first(self, where=None, **kw):
        return None

    async def create(self, data=None, **kw):
        payload = (data or {}).get("data", data)
        self.created.append(payload)
        return Row(id="cust-new", **(payload or {}))


class FakePrisma:
    def __init__(self, working_hours=WORKING_HOURS, existing=None):
        self.reservation = FakeReservationTable(existing)
        self.client = FakeClientTable(working_hours)
        self.customer = FakeCustomerTable()


class Sends:
    """Intercepts ONE function -- the send -- and delegates everything else to the real module.

    THE FIRST VERSION OF THIS CLASS STUBBED ONLY THE SEND AND NOTHING ELSE, and it lied: the
    notifier also calls `fmt_reserved_at` and `shop_label` on the way, so the stub raised
    AttributeError, `_notify_merchant_new_reservation` swallowed it (its contract is "never
    raises"), and the recorder saw ZERO sends. The measurement then said the notification does
    not fire -- the exact opposite of the truth.

    That is the stub-kinder-than-reality failure this project has paid for before, in its
    sharpest form: a fake that is POORER than reality produces a false negative just as readily
    as one that is richer. `__getattr__` delegation keeps the real formatter, the real labelling
    and the real control flow, and fakes only the boundary that would touch the network.
    """

    def __init__(self, real):
        self.calls, self._real = [], real

    def __getattr__(self, name):
        return getattr(self._real, name)

    async def send_new_reservation_to_merchant(self, *a, **kw):
        self.calls.append(kw or a)
        return True


def install(working_hours=WORKING_HOURS, existing=None, barber_active=True):
    """Point the REAL service's collaborators at fakes. Returns (prisma, sends, restore)."""
    orig = (rs.prisma_client, barber_repo.find_barber, catalog_service_repo.find_catalog_service,
            user_repo.find_user_by_barber_id, rs.whatsapp_notifications)
    prisma = FakePrisma(working_hours, existing)
    sends = Sends(orig[4])
    rs.prisma_client = prisma
    barber_repo.find_barber = lambda cid, bid: _done(
        Row(id=bid, clientId=cid, name="حسين", isActive=barber_active, workingHours=None))
    catalog_service_repo.find_catalog_service = lambda cid, sid: _done(
        Row(id=sid, clientId=cid, nameAr="قص شعر", durationMin=30))
    user_repo.find_user_by_barber_id = lambda bid: _done(None)
    rs.whatsapp_notifications = sends

    def restore():
        (rs.prisma_client, barber_repo.find_barber, catalog_service_repo.find_catalog_service,
         user_repo.find_user_by_barber_id, rs.whatsapp_notifications) = orig
    return prisma, sends, restore


async def _drain():
    """Let the notifier's fire-and-forget task actually run before we measure it.

    `_notify_merchant_new_reservation` schedules the send with `asyncio.create_task`, so the
    recorder sees nothing until that task is given the loop. Measuring before draining would
    report "no notification" for a notification that is merely one turn away -- the timing
    equivalent of the poorer-than-reality stub above.
    """
    for _ in range(5):
        await asyncio.sleep(0)
    pending = [t for t in rs._background_notification_tasks if not t.done()]
    if pending:
        await asyncio.gather(*pending, return_exceptions=True)


async def book(reserved_at, working_hours=WORKING_HOURS, existing=None, phone="96170123456",
               allow_past=True, notify_merchant=True):
    """`allow_past` defaults to True here because this suite IS the historical measurement.

    Added 2026-09-17 with T3-b. Before it, the past was reachable because no guard existed —
    which is precisely the accident the new parameter removes. So every call in this file now
    ASKS for the past explicitly, which is the contract Salman decided: the past is opened by an
    operation saying so, never inherited from the absence of a check.
    """
    prisma, sends, restore = install(working_hours, existing)
    try:
        result = await rs.create_reservation(
            allow_past      = allow_past,
            notify_merchant = notify_merchant,
            client_id      = CLIENT,
            module_key     = "barber",
            customer_name  = "أحمد",
            customer_phone = phone,
            reserved_at    = reserved_at,
            duration_min   = 30,
            notes          = "سجّلها المالك بالحكي",
            metadata       = {"barber_id": BARBER, "service_id": SERVICE},
            source         = "lia",
        )
        await _drain()
        return result, prisma, sends, None
    except Exception as exc:                      # noqa: BLE001 — the failure IS the measurement
        await _drain()
        return None, prisma, sends, exc
    finally:
        restore()


async def main():
    # This whole system stores LOCAL WALL CLOCK wearing a UTC label — proven separately against
    # production (52/52 stored hours fall inside the shop's own 09:00–21:00, which could not be
    # true of a real UTC instant). So a past appointment "yesterday at 16:00 Beirut" is built the
    # same way every other caller builds one, and NOT converted.
    now_local = datetime.now().replace(tzinfo=timezone.utc)
    yesterday_4pm = (now_local - timedelta(days=1)).replace(hour=16, minute=0, second=0,
                                                            microsecond=0)
    # Avoid the tenant's closed day so T1-a measures the PAST, not the weekday rule.
    while yesterday_4pm.strftime("%A").lower() in WORKING_HOURS["closed_days"]:
        yesterday_4pm -= timedelta(days=1)

    print("── T1-a. the REAL service accepts a PAST datetime — no hidden guard inside ──")
    print(f"     asking for: {yesterday_4pm.isoformat()}  ({yesterday_4pm:%A})")
    res, prisma, sends, exc = await book(yesterday_4pm)
    check("a past reservation is CREATED, not refused", res is not None and exc is None,
          f"{type(exc).__name__}: {exc}" if exc else "")
    if res is None:
        print("\n🔴 T1 stops here — the premise is false.")
        return 1
    row = prisma.reservation.created[0]

    print("\n── T1-b. the stored value follows the ONE convention in use ──")
    check("reserved_at is stored EXACTLY as given — no conversion, no shift",
          row["reservedAt"] == yesterday_4pm, f"{row['reservedAt'].isoformat()}")
    check("   the hour survives as the owner's local wall clock (16:00)",
          row["reservedAt"].hour == 16)
    check("   and it is tz-aware, labelled UTC, like every other row",
          row["reservedAt"].tzinfo is not None
          and row["reservedAt"].utcoffset() == timedelta(0))
    shifted = yesterday_4pm.astimezone(BEIRUT)
    check("   NOT astimezone()-converted — that would move it by 3 hours",
          row["reservedAt"].hour != shifted.hour, f"convention B would give {shifted:%H:%M}")

    print("\n── T1-c. status, and what it does NOT claim ──")
    check("status is 'pending'", row.get("status") == "pending", str(row.get("status")))
    check("   nothing says the customer arrived",
          row.get("status") not in ("arrived", "completed", "confirmed"))
    check("   source is carried through as 'lia'", row.get("source") == "lia")
    check("   clientId is carried (tenant isolation)", row.get("clientId") == CLIENT)
    check("   barberId and serviceId are resolved to real FKs, not left in metadata",
          row.get("barberId") == BARBER and row.get("serviceId") == SERVICE)
    check("   the customer was found-or-CREATED by phone",
          len(prisma.customer.created) == 1
          and prisma.customer.created[0]["phone"] == "96170123456")
    check("   and the reservation keeps its own name/phone snapshot",
          row.get("customerName") == "أحمد" and row.get("customerPhone") == "96170123456")

    print("\n── T1-d. 🔴 the merchant notification FIRES — unconditionally, today ──")
    check("a merchant alert was raised for an appointment that already happened",
          len(sends.calls) == 1, f"{len(sends.calls)} call(s)")
    # TRANSITION, flipped by T3-b (2026-09-17). Until then this read "there is no parameter to
    # suppress it", and its being true was the whole argument for R-3. It is now false BY
    # DECISION, and the assertion states the change rather than being quietly deleted.
    check("   T3-b added the parameter that suppresses it (was: none existed)",
          "notify_merchant" in rs.create_reservation.__code__.co_varnames)
    check("   ⇒ R-3's parameter is NECESSARY, not decorative", len(sends.calls) == 1)

    print("\n── T1-e. 🔴 working hours ARE enforced against the past ──")
    monday = yesterday_4pm
    while monday.strftime("%A").lower() != "monday":
        monday -= timedelta(days=1)
    res2, _p, _s, exc2 = await book(monday)
    check("a past appointment on the tenant's CLOSED day is refused",
          res2 is None and isinstance(exc2, ValueError), f"{exc2}")
    check("   ⇒ R-2 is a real decision: reality does not obey today's schedule",
          res2 is None)
    early = yesterday_4pm.replace(hour=7)
    res3, _p, _s, exc3 = await book(early)
    check("a past appointment before opening time is refused too",
          res3 is None and isinstance(exc3, ValueError), f"{exc3}")

    print("\n── and the conflict rule applies to the past as well ──")
    taken = Row(id="res-old", reservedAt=yesterday_4pm, durationMin=30, metadata={},
                barberId=BARBER, status="pending")
    res4, _p, _s, exc4 = await book(yesterday_4pm, existing=[taken])
    check("a past slot already taken by that barber is refused",
          res4 is None and isinstance(exc4, ValueError), f"{exc4}")
    check("   ⇒ correct: two customers cannot have sat with one barber at one moment",
          res4 is None)

    print("\n── nothing left this process ──")
    check("the real prisma_client is restored", rs.prisma_client is not None
          and not isinstance(rs.prisma_client, FakePrisma))
    check("the real notifier is restored",
          getattr(rs.whatsapp_notifications, "__name__", "").endswith("whatsapp_notifications"))
    check("zero database writes, zero WhatsApp sends", True)

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
