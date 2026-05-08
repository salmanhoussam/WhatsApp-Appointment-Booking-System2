"""
scripts/create_admin_user.py
Create (or reset) any admin User linked to a specific client.

Usage:
    python scripts/create_admin_user.py --email admin@salmansaas.com --role TENANT_ADMIN --password secret
    python scripts/create_admin_user.py --email salman@salmansaas.com --role SUPER_ADMIN  --password secret
    python scripts/create_admin_user.py --email admin@caracas.com --slug caracas --role TENANT_ADMIN --password secret
    python scripts/create_admin_user.py --email admin@footlab.com --slug footlab --role TENANT_ADMIN --password secret

Roles: SUPER_ADMIN | TENANT_ADMIN | MANAGER_RESERVATIONS | MANAGER_UNITS
--slug defaults to "smar" (platform owner) when omitted.
"""

import asyncio
import sys
import os
import argparse
import getpass

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

_direct = os.environ.get("DIRECT_URL")
if _direct:
    os.environ["DATABASE_URL"] = _direct

from prisma import Prisma
from app.core.security import get_password_hash

VALID_ROLES = {"SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS", "MANAGER_UNITS"}


async def main(email: str, password: str, full_name: str, role: str, slug: str):
    if role not in VALID_ROLES:
        print(f"[ERROR] Invalid role '{role}'. Choose: {sorted(VALID_ROLES)}")
        return

    db = Prisma()
    await db.connect()

    print("\n==============================================")
    print(f"  Create / Update Admin User  [{role}]")
    print("==============================================\n")

    try:
        owner = await db.client.find_unique(where={"slug": slug})
        if not owner:
            print(f"[ERROR] Client '{slug}' not found.")
            return

        print(f"[OK]  Client found: {owner.slug} (status={owner.status})")

        existing = await db.user.find_unique(where={"email": email})
        if existing:
            await db.user.update(
                where={"email": email},
                data={
                    "password_hash": get_password_hash(password),
                    "role":          role,
                    "isActive":      True,
                    "fullName":      full_name,
                },
            )
            print(f"[UPDATE] {email} -> role={role}, password reset")
        else:
            await db.user.create(data={
                "clientId":      owner.id,
                "email":         email,
                "password_hash": get_password_hash(password),
                "fullName":      full_name,
                "role":          role,
                "isActive":      True,
            })
            print(f"[CREATED] {email} -> role={role}")

        # Show where they'll land after login
        if role == "SUPER_ADMIN":
            print(f"\n  Login:    https://auth.salmansaas.com/login")
            print(f"  Redirect: https://auth.salmansaas.com/super/clients")
        elif owner.status in ("trial",):
            print(f"\n  Login:    https://auth.salmansaas.com/login")
            print(f"  Redirect: https://auth.salmansaas.com/demo/{owner.slug}/units")
            print(f"  NOTE: smar status='{owner.status}' -- run set_client_status.py to set 'active'")
        else:
            print(f"\n  Login:    https://auth.salmansaas.com/login")
            print(f"  Redirect: https://{owner.slug}.salmansaas.com/admin  (prod)")
            print(f"            http://localhost:5173/{owner.slug}/admin     (local)")

        print("==============================================\n")

    finally:
        await db.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create/update admin user")
    parser.add_argument("--email",    required=True)
    parser.add_argument("--slug",     default="smar", help="Client slug to link user to (default: smar)")
    parser.add_argument("--name",     default=None)
    parser.add_argument("--role",     default="TENANT_ADMIN", choices=sorted(VALID_ROLES))
    parser.add_argument("--password", default=None)
    args = parser.parse_args()

    full_name = args.name or args.email.split("@")[0].replace(".", " ").title()

    password = args.password
    if not password:
        password = getpass.getpass(f"Password for {args.email}: ")
        if len(password) < 8:
            print("[ERROR] Password must be at least 8 characters.")
            sys.exit(1)

    asyncio.run(main(args.email, password, full_name, args.role, args.slug))
