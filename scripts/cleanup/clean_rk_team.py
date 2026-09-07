"""Hard-delete rk's contaminated team accounts and the leftover QA barber.

PREPARED 2026-09-07 at Salman's instruction: "امحي كل التيم وتخلي حسين، مش اخفاء".
The dashboard only soft-deactivates (users) / hides (barbers) — there is no hard delete anywhere
in the API — and the Claude Code safety classifier blocks the assistant from issuing the DELETE
itself, so this is handed over to be run deliberately. Same pattern as
scripts/cleanup/delete_demo_test_tenants.py, which ran successfully 2026-09-06.

WHY THIS IS SAFE — measured live against Frankfurt before writing, not assumed:
  users    ← only properties.manager_id references it (ON DELETE SET NULL), and 0 properties
             reference any rk user. Deleting them has no collateral at all.
  barbers  ← barber_services CASCADE, reservations SET NULL, users SET NULL.
             'Test Staff QA' holds 0 reservations and 0 service links, so its deletion touches
             nothing either.

WHAT IS DELIBERATELY KEPT:
  rkbarber@dev.invalid  the TENANT_ADMIN — deleting it locks the shop out of its own dashboard.
  barber حسين           27 reservations, 3 service links. Salman: "وتخلي حسين".
  barber جعفر            1 reservation, 2 service links. Only his LOGIN ACCOUNT is deleted here;
                        the barber row stays so the new account can link back to the same person.

AFTER THIS RUNS: re-create جعفر from the dashboard (الفريق → حساب جديد) so he gets a fresh
setup link built with the now-corrected FRONTEND_URL.

Usage:
    venv/bin/python scripts/cleanup/clean_rk_team.py --dry-run
    venv/bin/python scripts/cleanup/clean_rk_team.py --execute
"""
import re
import sys

import psycopg2

SLUG = "rk"
KEEP_USER_EMAILS   = {"rkbarber@dev.invalid"}          # the owner — never delete
KEEP_BARBER_NAMES  = {"حسين", "جعفر"}                   # real staff — never delete
DELETE_BARBER_NAMES = {"Test Staff QA"}                # QA residue, 0 collateral


def db_url() -> str:
    line = [l for l in open(".env") if l.startswith("EU_DATABASE_URL")][0]
    return re.match(r'^EU_DATABASE_URL="?([^"\n]+)"?', line.strip()).group(1).split("?")[0]


def main(execute: bool) -> None:
    url = db_url()
    host = url.split("@")[1].split(":")[0]
    assert "eu-central-1" in host, f"ABORT: not the Frankfurt host ({host})"
    assert "ap-southeast-2" not in host, "ABORT: this is Sydney — never touch it"
    assert not (KEEP_BARBER_NAMES & DELETE_BARBER_NAMES), "ABORT: a kept barber is in the delete set"
    print(f"host: {host}\n")

    conn = psycopg2.connect(url, connect_timeout=60)
    cur = conn.cursor()

    cur.execute("select id from clients where slug=%s", (SLUG,))
    row = cur.fetchone()
    assert row, f"ABORT: client '{SLUG}' not found"
    client_id = row[0]

    # ── what would go ────────────────────────────────────────────────────────
    cur.execute(
        "select id, email, full_name from users where client_id=%s and not (email = any(%s))",
        (client_id, list(KEEP_USER_EMAILS)),
    )
    doomed_users = cur.fetchall()
    cur.execute(
        "select id, name from barbers where client_id=%s and name = any(%s)",
        (client_id, list(DELETE_BARBER_NAMES)),
    )
    doomed_barbers = cur.fetchall()

    print(f"users to delete ({len(doomed_users)}):")
    for _, email, name in doomed_users:
        print(f"   {email:<40} {name}")
    print(f"\nbarbers to delete ({len(doomed_barbers)}):")
    for _, name in doomed_barbers:
        print(f"   {name}")

    # The owner must survive, or the shop cannot log in. Assert it, never assume it.
    cur.execute(
        "select count(*) from users where client_id=%s and email = any(%s)",
        (client_id, list(KEEP_USER_EMAILS)),
    )
    assert cur.fetchone()[0] == len(KEEP_USER_EMAILS), "ABORT: the owner account is missing"

    # Re-verify the collateral claim at run time rather than trusting this file's header.
    for bid, name in doomed_barbers:
        cur.execute("select count(*) from reservations where barber_id=%s", (bid,))
        res = cur.fetchone()[0]
        cur.execute("select count(*) from barber_services where barber_id=%s", (bid,))
        links = cur.fetchone()[0]
        assert res == 0, f"ABORT: barber '{name}' holds {res} reservations — deleting it would orphan them"
        print(f"\n   checked '{name}': {res} reservations, {links} service links — safe")

    if not execute:
        print("\nDRY RUN — nothing deleted. Re-run with --execute to apply.")
        cur.close(); conn.close()
        return

    try:
        cur.execute(
            "delete from users where client_id=%s and not (email = any(%s))",
            (client_id, list(KEEP_USER_EMAILS)),
        )
        n_users = cur.rowcount
        assert n_users == len(doomed_users), f"ABORT: user delete touched {n_users}, expected {len(doomed_users)}"

        cur.execute(
            "delete from barbers where client_id=%s and name = any(%s)",
            (client_id, list(DELETE_BARBER_NAMES)),
        )
        n_barbers = cur.rowcount
        assert n_barbers == len(doomed_barbers), f"ABORT: barber delete touched {n_barbers}, expected {len(doomed_barbers)}"

        conn.commit()
        print(f"\nCOMMITTED — {n_users} users, {n_barbers} barbers deleted")
    except Exception as exc:
        conn.rollback()
        print("ROLLED BACK:", exc)
        raise

    print("\n── surviving state ──")
    cur.execute("select email, full_name, role from users where client_id=%s order by email", (client_id,))
    for e, f, r in cur.fetchall():
        print(f"   USER    {e:<40} {f:<20} {r}")
    cur.execute("""select b.name, b.is_active,
                     (select count(*) from reservations r where r.barber_id=b.id),
                     (select count(*) from barber_services bs where bs.barber_id=b.id)
                   from barbers b where b.client_id=%s order by b.name""", (client_id,))
    for n, a, res, links in cur.fetchall():
        print(f"   BARBER  {n:<20} active={str(a):<6} reservations={res:<4} links={links}")

    cur.close(); conn.close()


if __name__ == "__main__":
    main(execute="--execute" in sys.argv)
