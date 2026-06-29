"""
scripts/create_super_admin.py
Create (or update) a SUPER_ADMIN User linked to the platform owner client.

Usage:
    python -m scripts.create_super_admin
    python -m scripts.create_super_admin --email you@example.com --password secret123

Defaults:
    email    = salman@salmansaas.com
    password = (prompted interactively if not passed)
    name     = Salman Houssam
"""

import asyncio
import sys
import os
import argparse
import getpass

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

# Bypass pgbouncer -- direct connection for writes
_direct = os.environ.get("DIRECT_URL")
if _direct:
    os.environ["DATABASE_URL"] = _direct

from prisma import Prisma
from app.core.security import get_password_hash
from app.core.config import settings


async def main(email: str, password: str, full_name: str):
    db = Prisma()
    await db.connect()

    print("\n==============================================")
    print("  Create / Update SUPER_ADMIN User")
    print("==============================================\n")

    try:
        # Find platform owner client
        owner_slug = getattr(settings, "SUPER_ADMIN_SLUG", "smar")
        owner = await db.client.find_unique(where={"slug": owner_slug})
        if not owner:
            print(f"[ERROR] Platform owner client '{owner_slug}' not found in DB.")
            print("        Make sure the smar client row exists before running this script.")
            return

        print(f"[OK]  Found platform owner: {owner.slug} ({owner.id})")

        # Check if user already exists
        existing = await db.user.find_unique(where={"email": email})
        if existing:
            await db.user.update(
                where={"email": email},
                data={
                    "password_hash": get_password_hash(password),
                    "role":          "SUPER_ADMIN",
                    "isActive":      True,
                    "fullName":      full_name,
                },
            )
            print(f"[UPDATE] Existing user updated: {email} -> role=SUPER_ADMIN, password reset")
        else:
            await db.user.create(data={
                "clientId":      owner.id,
                "email":         email,
                "password_hash": get_password_hash(password),
                "fullName":      full_name,
                "role":          "SUPER_ADMIN",
                "isActive":      True,
            })
            print(f"[CREATED] SUPER_ADMIN user: {email}")

        print(f"\n  Login at:  http://localhost:5173/login")
        print(f"  Email:     {email}")
        print(f"  Password:  (the one you just entered)")
        print(f"\n  After login -> /dashboard/{owner_slug}/units")
        print("==============================================\n")

    finally:
        await db.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create SUPER_ADMIN user")
    parser.add_argument("--email",    default="salman@salmansaas.com")
    parser.add_argument("--name",     default="Salman Houssam")
    parser.add_argument("--password", default=None)
    args = parser.parse_args()

    password = args.password
    if not password:
        password = getpass.getpass(f"Password for {args.email}: ")
        if len(password) < 8:
            print("[ERROR] Password must be at least 8 characters.")
            sys.exit(1)

    asyncio.run(main(args.email, password, args.name))
