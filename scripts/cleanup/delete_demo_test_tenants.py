"""Phase B — delete the 17 zero-reference demo/test tenants from the LIVE database.

PREPARED 2026-09-06. NOT run by the assistant: the Claude Code safety classifier blocked the
destructive DB call, so this is handed over for Salman to run deliberately.

Preconditions already satisfied (verify again if you re-run this later):
  1. A verified snapshot exists — pg_dump custom-format of Frankfurt, row-parity checked EXACT
     against live: clients 37, client_services 110, barbers 20, catalog_services 81,
     reservations 40, bookings 1, units 16, catalog_items 238, customers 26.
  2. Every slug below was grepped across app/, frontend/src/ and scripts/ and has ZERO references.
  3. FK delete rules read from information_schema: 22 CASCADE, 4 RESTRICT
     (customers / prices / services / units), 1 SET NULL. None of these 17 holds a RESTRICT row.

DELIBERATELY EXCLUDED — do not add any of these without an explicit decision:
  alzabt-demo               21 refs — App.jsx:232 routes /alzabt -> /alzabt-demo/reserve (LIVE demo)
  store-pilot-20260731       9 refs — has a tenantRegistry entry + its own routes file
  barberlab-test             4 refs — also holds 2 `services` rows (RESTRICT: would block a delete)
  pilot-test-20260720        4 refs
  store-pilot-test-20260727  3 refs
  test-fashion               1 ref

Usage:
    venv/bin/python scripts/cleanup/delete_demo_test_tenants.py --dry-run
    venv/bin/python scripts/cleanup/delete_demo_test_tenants.py --execute
"""
import re
import sys

import psycopg2

SAFE = [
    'bohussein-redirecttest-1786113608', 'bohussein-test-1786114296',
    'demo-barber-5513', 'demo-barber-6970', 'demo-barber-82d5', 'demo-barber-a484',
    'demo-barber-c57f', 'demo-barber-f93b', 'demo-code-verify-test-fd92',
    'demo-phase2extractiontest-0b4a', 'demo-phase2extractiontest-5282',
    'demo-phase2extractiontest-61f2', 'demo-verify-salon-25-0803',
    'demo-verticalregistrytest-f87f', 'demo-verticalregistrytestrestaurant-6433',
    'magic-test', 'test-catalog-fix',
]
REAL = {'smar', 'caracas', 'footlab', 'roz', 'olivello', 'arizona',
        'beit-al-fakhar', 'rk', 'mr-h'}
UND = {'cafe', 'tastybites', 'sneakers-lb', 'sneakers-beirut', 'assi'}
HOLD = {'alzabt-demo', 'store-pilot-20260731', 'barberlab-test',
        'pilot-test-20260720', 'store-pilot-test-20260727', 'test-fashion'}

TABLES = ['clients', 'client_services', 'barbers', 'catalog_services', 'catalog_items',
          'catalog_categories', 'reservations', 'users', 'store_orders', 'services']


def guards() -> None:
    """Refuse to run at all if the target list has been contaminated."""
    assert len(SAFE) == 17, f"expected 17 slugs, got {len(SAFE)}"
    assert not (set(SAFE) & REAL), "ABORT: a REAL tenant is in the delete list"
    assert not (set(SAFE) & UND), "ABORT: an UNDECIDED tenant is in the delete list"
    assert not (set(SAFE) & HOLD), "ABORT: a HELD tenant is in the delete list"
    print("guards passed — no real / undecided / held slug in the target list")


def db_url() -> str:
    line = [l for l in open('.env') if l.startswith('EU_DATABASE_URL')][0]
    return re.match(r'^EU_DATABASE_URL="?([^"\n]+)"?', line.strip()).group(1).split('?')[0]


def main(execute: bool) -> None:
    guards()
    url = db_url()
    host = url.split('@')[1].split(':')[0]
    assert 'eu-central-1' in host, f"ABORT: not the Frankfurt host ({host})"
    assert 'ap-southeast-2' not in host, "ABORT: this is Sydney — never touch it"
    print(f"host: {host}\n")

    conn = psycopg2.connect(url, connect_timeout=60)
    cur = conn.cursor()

    before = {}
    for t in TABLES:
        cur.execute(f"select count(*) from public.{t}")
        before[t] = cur.fetchone()[0]

    cur.execute("select slug from clients where slug = any(%s)", (SAFE,))
    found = sorted(s for (s,) in cur.fetchall())
    print(f"target rows present in DB: {len(found)} / 17")
    if len(found) != 17:
        print("  missing:", sorted(set(SAFE) - set(found)))

    if not execute:
        print("\nDRY RUN — nothing deleted. Re-run with --execute to apply.")
        cur.close()
        conn.close()
        return

    try:
        cur.execute("delete from public.clients where slug = any(%s)", (SAFE,))
        n = cur.rowcount
        assert n == len(found), f"ABORT: delete touched {n} rows, expected {len(found)}"
        conn.commit()
        print(f"\nCOMMITTED — {n} client rows deleted")
    except Exception as exc:
        conn.rollback()
        print("ROLLED BACK:", exc)
        raise

    after = {}
    for t in TABLES:
        cur.execute(f"select count(*) from public.{t}")
        after[t] = cur.fetchone()[0]

    print(f"\n{'TABLE':<22}{'before':>8}{'after':>8}{'removed':>9}")
    print("-" * 47)
    for t in TABLES:
        print(f"{t:<22}{before[t]:>8}{after[t]:>8}{before[t] - after[t]:>9}")

    for label, group in (("REAL", REAL), ("HELD", HOLD), ("UNDECIDED", UND)):
        cur.execute("select count(*) from clients where slug = any(%s)", (list(group),))
        print(f"  {label:<10} surviving: {cur.fetchone()[0]} / {len(group)}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main(execute="--execute" in sys.argv)
