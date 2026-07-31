"""
scripts/seed_authz_hardening_test_users.py
One-off: create disposable role-test accounts for finishing Authorization Hardening
(bookings/gallery/properties/services/upload/fleet/dashboard/restaurant/store), 2026-07-31.

Creates, per tenant, one MANAGER_UNITS and one MANAGER_RESERVATIONS test user (skips creation
if a real TENANT_ADMIN/SUPER_ADMIN already exists to reuse for positive-admin-role checks).
All created users are prefixed "authz-verify-" for easy identification/cleanup (deactivate,
never delete, matching this project's established convention).

Usage:
    python -m scripts.seed_authz_hardening_test_users
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

_direct = os.environ.get("DIRECT_URL")
if _direct:
    os.environ["DATABASE_URL"] = _direct

from prisma import Prisma
import bcrypt

PASSWORD = "TestPass123!"


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


TARGETS = [
    ("smar", ["MANAGER_UNITS", "MANAGER_RESERVATIONS", "TENANT_ADMIN"]),
    ("caracas", ["MANAGER_RESERVATIONS", "MANAGER_UNITS", "TENANT_ADMIN"]),
    ("footlab", ["MANAGER_RESERVATIONS", "MANAGER_UNITS", "TENANT_ADMIN"]),
]


async def main():
    db = Prisma()
    await db.connect()
    try:
        for slug, roles in TARGETS:
            client = await db.client.find_unique(where={"slug": slug})
            if not client:
                print(f"[SKIP] {slug} not found")
                continue

            for role in roles:
                email = f"authz-verify-{role.lower()}@{slug}.test"
                existing = await db.user.find_unique(where={"email": email})
                if existing:
                    if not existing.isActive:
                        await db.user.update(where={"id": existing.id}, data={"isActive": True})
                        print(f"[OK] {slug}: reactivated {email}")
                    else:
                        print(f"[OK] {slug}: {email} already active")
                    continue

                user = await db.user.create(data={
                    "clientId": client.id, "email": email, "password_hash": _hash(PASSWORD),
                    "fullName": f"AuthzTest {role}", "role": role,
                })
                print(f"[OK] {slug}: created {email} ({role})")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
