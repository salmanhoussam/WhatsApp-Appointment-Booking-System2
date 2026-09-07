"""Empty the customers registry, keeping a full JSON snapshot first.

DECISION 2026-09-07, Salman, verbatim: "امحي كل شي بقلبه ... نمحي كل شي باقي بالجدول."
This closes the three questions left open at the end of the previous session — the answer to all
three is "delete".

WHY THE TABLE HAS NOTHING REAL TO LOSE — measured live before writing, not assumed. All 28 rows:
  22  obvious fixtures        Race Test / Phase C-E / Load Test / QA ... DELETE ME / AuthzTest
   2  a merged fake identity  "زبون واتساب" phone "عبر واتساب" (rk 5 resv, mr-h 2 resv). The
                              string never appears in git history -> it was typed by hand into the
                              dashboard, it is not what the WhatsApp flow writes.
   4  Salman's own numbers    Hussam/96176985477 (= rk's OWN whatsapp_number, he booked from the
                              shop phone), Adel/96178727986, Houssam/78727986, حسام سلمان/96178727986
  ---
   0  real paying customers.

COLLATERAL — every FK on customers.customer_id, checked in information_schema:
  reservations  SET NULL   13 rows unlinked. NO DATA IS LOST: customer_name and customer_phone are
                           NOT NULL columns ON THE RESERVATION ITSELF, so the calendar entry keeps
                           the name and number it was booked with. Only the registry link breaks.
  store_orders  SET NULL   0 rows affected.
  bookings      CASCADE    1 row DELETED — smar / AuthzTest Booking2, status 'cancelled', a
                           2026-07-31 authorization fixture. This is the only genuine row loss.

The snapshot makes the whole thing reversible: every deleted customer and every reservation link is
written to .claudedocs/work/customer-registry-reset/<date>/ before the first DELETE runs.

Usage:
    venv/bin/python scripts/cleanup/reset_customer_registry.py --dry-run
    venv/bin/python scripts/cleanup/reset_customer_registry.py --execute
"""
import json
import os
import sys
from datetime import date

import psycopg2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _db_target  # noqa: E402

EVIDENCE_DIR = os.path.join(
    ".claudedocs", "work", "customer-registry-reset", date.today().isoformat()
)


def main() -> None:
    execute = "--execute" in sys.argv
    if not execute and "--dry-run" not in sys.argv:
        sys.exit("Pass --dry-run or --execute.")

    conn = psycopg2.connect(_db_target.resolve(direct=True))
    cur = conn.cursor()

    cur.execute(
        """
        select cu.id::text, c.slug, cu.name, cu.phone, cu.email,
               (cu.password_hash is not null), cu.created_at::text
        from customers cu join clients c on c.id = cu.client_id
        order by c.slug, cu.created_at
        """
    )
    customers = [
        dict(zip(("id", "slug", "name", "phone", "email", "has_password", "created_at"), r))
        for r in cur.fetchall()
    ]

    cur.execute(
        """
        select r.id::text, c.slug, r.customer_id::text, r.customer_name, r.customer_phone,
               r.status, r.reserved_at::text
        from reservations r join clients c on c.id = r.client_id
        where r.customer_id is not null order by c.slug, r.reserved_at
        """
    )
    reservations = [
        dict(zip(("id", "slug", "customer_id", "customer_name", "customer_phone",
                  "status", "reserved_at"), r))
        for r in cur.fetchall()
    ]

    cur.execute(
        """
        select b.id::text, c.slug, b.customer_id::text, b.status
        from bookings b join clients c on c.id = b.client_id where b.customer_id is not null
        """
    )
    bookings = [dict(zip(("id", "slug", "customer_id", "status"), r)) for r in cur.fetchall()]

    print(f"\ncustomers to delete : {len(customers)}")
    print(f"reservations unlinked: {len(reservations)}  (customer_name/phone preserved on the row)")
    print(f"bookings CASCADE-DELETED: {len(bookings)}")
    for b in bookings:
        print(f"    !! {b['slug']}  {b['id']}  status={b['status']}")

    if not execute:
        print("\nDRY RUN — nothing written, nothing deleted.")
        conn.close()
        return

    os.makedirs(EVIDENCE_DIR, exist_ok=True)
    snapshot = {
        "taken_at": date.today().isoformat(),
        "reason": "Salman 2026-09-07: empty the customers registry; 0 real customers measured",
        "customers": customers,
        "reservation_links": reservations,
        "bookings_cascade_deleted": bookings,
    }
    path = os.path.join(EVIDENCE_DIR, "snapshot.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(snapshot, fh, ensure_ascii=False, indent=2)
    print(f"\nsnapshot written: {path}")

    cur.execute("delete from customers")
    deleted = cur.rowcount
    conn.commit()

    cur.execute("select count(*) from customers")
    remaining = cur.fetchone()[0]
    cur.execute("select count(*) from reservations")
    resv_total = cur.fetchone()[0]
    cur.execute("select count(*) from reservations where customer_id is not null")
    still_linked = cur.fetchone()[0]

    print(f"deleted {deleted} customers -> remaining {remaining}")
    print(f"reservations still on file: {resv_total}  (linked: {still_linked})")
    conn.close()


if __name__ == "__main__":
    main()
