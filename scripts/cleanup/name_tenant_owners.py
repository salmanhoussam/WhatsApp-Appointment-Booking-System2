"""Give each tenant's admin account the real owner's name.

DECISION 2026-09-07, Salman: "تحطلي حاليا حسين رقا، هو الأدمن مع رقمه ... وجعفر صالح هو المانجر،
وبعدين نصير منزيد لكل تenant اسم صاحبه ونحطه admin."

WHY A SCRIPT AND NOT THE DASHBOARD. There is no update path for a user's name or phone anywhere in
the product: app/api/v1/admin/team.py exposes POST /team (create), DELETE /team/{id} (deactivate)
and POST /team/{id}/reactivate — nothing edits an existing account. So an owner's account keeps
whatever name it was seeded with, forever. That is a real gap, recorded rather than worked around;
this script is the interim.

THE PROBLEM IT FIXES — 31 user rows, and the admin accounts are named after the SEEDING SCRIPT, not
the person: "Admin" x4, "????" x3, "Test Fixture Owner", "Alzabt Demo Admin", "RK Barber Shop".
Salman's registry is meant to answer "who owns this shop", and today it cannot.

RENAMES is deliberately a small, explicit map — only names Salman has actually given. Every other
tenant stays untouched until he supplies the owner's name; this script must never guess one from a
slug or a shop name, because "RK Barber Shop" as a person's name is precisely the defect being
fixed here.

Usage:
    venv/bin/python scripts/cleanup/name_tenant_owners.py --dry-run
    venv/bin/python scripts/cleanup/name_tenant_owners.py --execute
"""
import os
import sys

import psycopg2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _db_target  # noqa: E402

# email -> (full_name, phone or None to leave the phone as it is)
# 96176985477 is what clients.phone and clients.whatsapp_number already hold for rk; the user row
# carried the same number without its country code (76985477).
RENAMES = {
    "rkbarber@dev.invalid":     ("حسين رقا", "96176985477"),
    "jaafar@rk.salmansaas.com": ("جعفر صالح", None),
}


def main() -> None:
    execute = "--execute" in sys.argv
    if not execute and "--dry-run" not in sys.argv:
        sys.exit("Pass --dry-run or --execute.")

    conn = psycopg2.connect(_db_target.resolve(direct=True))
    cur = conn.cursor()

    for email, (name, phone) in RENAMES.items():
        cur.execute(
            "select u.full_name, u.phone, u.role, c.slug from users u "
            "join clients c on c.id = u.client_id where u.email = %s",
            (email,),
        )
        row = cur.fetchone()
        if not row:
            print(f"  SKIP {email} — no such account")
            continue
        old_name, old_phone, role, slug = row
        print(f"  {slug:<6} {email}")
        print(f"      name  {old_name!r} -> {name!r}")
        print(f"      phone {old_phone!r} -> {phone if phone else old_phone!r}")
        print(f"      role  {role} (unchanged)")

        if execute:
            if phone:
                cur.execute(
                    "update users set full_name = %s, phone = %s, updated_at = now() "
                    "where email = %s",
                    (name, phone, email),
                )
            else:
                cur.execute(
                    "update users set full_name = %s, updated_at = now() where email = %s",
                    (name, email),
                )

    if execute:
        conn.commit()
        print("\ncommitted.")
        cur.execute(
            "select c.slug, u.full_name, u.phone, u.role from users u "
            "join clients c on c.id = u.client_id where c.slug = 'rk' order by u.created_at"
        )
        for r in cur.fetchall():
            print("  verify:", r)
    else:
        print("\nDRY RUN — nothing written.")
    conn.close()


if __name__ == "__main__":
    main()
