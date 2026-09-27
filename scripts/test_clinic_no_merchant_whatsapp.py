"""«لا واتساب قبل P6» — as a guard that can be measured, not a side effect of an empty column.

Run:  venv/bin/python scripts/test_clinic_no_merchant_whatsapp.py

WHY THIS SUITE EXISTS

    CLINIC_TEST_TENANT_CONTRACT.md §4 rested "zero WhatsApp for the clinic test tenant" on
    `Client.phone = NULL`. Creating the tenant is what proved that impossible: schema.prisma:21 is
    `phone String @unique` -- NOT NULL -- and `migrate diff` is empty, so the deployed column really
    is NOT NULL. The guarantee was never satisfiable, and therefore had never been verified.

    Salman's ruling (2026-09-27, option هـ): make it an explicit guard. This suite is the half that
    makes it worth more than the empty column ever was -- the empty column could not be tested, and
    this can.

🔴 THE SHAPE OF THE PROOF IS A DIFFERENTIATED OUTCOME, NOT AN ABSENCE

    Asserting "a clinic sends nothing" alone would also pass if the notifier were broken for
    everyone, or if the fake never reached it at all. So the SAME booking runs twice and only
    `Client.vertical` differs:

        vertical='barber'  ->  EXACTLY ONE send   (positive control -- the notifier really fires)
        vertical='clinic'  ->  ZERO sends         (the guard)

    That is the T-12 lesson applied here: an absence is only evidence once the same measurement
    produces a presence under the one condition that is supposed to change it.

    The client row is otherwise IDENTICAL, including whatsapp_number AND phone both populated with a
    real-shaped number -- deliberately the hardest case for the guard, and the exact state the
    production test tenant will be in once it is created.

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES, NO PRODUCTION.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import reservation_service as rs                         # noqa: E402
from test_lia_reservation_t1 import install as _t1_install, Row, CLIENT     # noqa: E402

ok = True


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


async def notify_with_vertical(vertical):
    """Run the REAL _notify_merchant_new_reservation against a client row whose only distinguishing
    field is `vertical`. Returns the number of sends the recorder saw."""
    prisma, sends, restore = _t1_install()
    # A fake POORER than reality gives a false negative as easily as a richer one gives a false
    # positive (this project has paid for that twice), so every attribute the notifier reads is
    # present -- and BOTH phone fields are filled, which is the hardest case for the guard.
    async def find_unique(where):
        return Row(id=where["id"], config={"working_hours": {}},
                   whatsapp_number="96178727986", phone="96178727986",
                   slug="cliniclab-test" if vertical == "clinic" else "barberlab-test",
                   name="Clinic Test", name_ar="عيادة اختبار", vertical=vertical)
    prisma.client.find_unique = find_unique
    try:
        await rs._notify_merchant_new_reservation(Row(
            id="res-abc12345", clientId=CLIENT, barberId=None, resourceId="r1", serviceId=None,
            customerName="أحمد", customerPhone="96170123456", reservedAt=None,
        ))
        # 🔴 THE SEND IS A BACKGROUND TASK (`_fire_and_forget` -> asyncio.create_task), so reading
        # the recorder the instant the notifier returns counts a RACE, not a behaviour. The first
        # version of this suite did exactly that and reported 0 sends for a BARBER -- the positive
        # control caught it, and had W-1 not existed, W-2's "clinic sends zero" would have been
        # accepted as proof of a guard that had not run at all.
        #
        # Awaiting the module's own tracked set is deterministic; `sleep(0)` would merely be usually
        # long enough.
        pending = set(rs._background_notification_tasks)
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)
        return len(sends.calls)
    finally:
        restore()


async def main():
    print("\n── لا واتساب قبل P6 · the guard, measured by difference ──────────────────────────")

    barber = await notify_with_vertical("barber")
    clinic = await notify_with_vertical("clinic")

    check("W-1  POSITIVE CONTROL — vertical='barber' really DOES send exactly one merchant alert, so "
          "the notifier was reached and the fake is not swallowing it",
          barber == 1, f"{barber} send(s)")
    check("W-2  🔴 vertical='clinic' sends ZERO — with whatsapp_number AND phone both populated, "
          "which is precisely the state the production test tenant will be in",
          clinic == 0, f"{clinic} send(s)")
    check("W-3  🔴 and the DIFFERENCE is the proof: identical booking, identical client row, only "
          "`vertical` changed — 1 vs 0. An absence alone would also pass if the notifier were "
          "simply broken",
          barber == 1 and clinic == 0, f"barber={barber} clinic={clinic}")

    # The guard must sit before recipients are collected -- a filter applied later could be bypassed
    # by any future path that appends a recipient earlier.
    src = open("app/services/reservation_service.py", encoding="utf-8").read()
    body = src.split("async def _notify_merchant_new_reservation")[1].split("\nasync def ")[0]
    i_guard = body.find("NO_MERCHANT_WHATSAPP_VERTICALS")
    i_recips = body.find("recipients: list[tuple[str, str]] = []")
    check("W-4  the guard is positioned BEFORE any recipient is collected — not a filter over a list "
          "already built, which a later code path could sidestep",
          0 < i_guard < i_recips, f"guard@{i_guard} recipients@{i_recips}")
    check("W-5  it is a frozenset naming the vertical, with P6 named as the phase that removes it — "
          "a temporary fence with a stated end, not a permanent special case",
          'NO_MERCHANT_WHATSAPP_VERTICALS = frozenset({"clinic"})' in src
          and "this set is what P6 removes" in src)
    check("W-6  INVARIANT — the barber path is untouched: `whatsapp_number or phone` still resolves "
          "the owner, and the staff lookup is unchanged",
          'owner_phone = getattr(client, "whatsapp_number", None) or getattr(client, "phone", None)' in src
          and "user_repo.find_user_by_barber_id" in src)

    print("\nALL GREEN" if ok else "\nFAILURES ABOVE")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
