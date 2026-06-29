"""
scripts/fix_passwords.py
One-time migration: hash any plain-text passwords in Client and User tables.

Run once against production:
    python -m scripts.fix_passwords

Safe to run multiple times — bcrypt hashes are detected and skipped.
"""

import asyncio
import sys
import os

# Ensure project root is on path so app.* imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

# Scripts bypass pgbouncer — use the direct connection (port 5432)
import os
_direct = os.environ.get("DIRECT_URL")
if _direct:
    os.environ["DATABASE_URL"] = _direct

from prisma import Prisma
from app.core.security import get_password_hash


async def fix_client_passwords(db: Prisma) -> int:
    clients = await db.client.find_many()
    fixed = 0
    for c in clients:
        if c.password_hash and not c.password_hash.startswith("$2"):
            print(f"  [FIX] Client [{c.slug}]: plain-text detected -> hashing...")
            await db.client.update(
                where={"id": c.id},
                data={"password_hash": get_password_hash(c.password_hash)},
            )
            fixed += 1
        else:
            print(f"  [OK]  Client [{c.slug}]: already hashed - skipped")
    return fixed


async def fix_user_passwords(db: Prisma) -> int:
    users = await db.user.find_many()
    fixed = 0
    for u in users:
        if u.password_hash and not u.password_hash.startswith("$2"):
            print(f"  [FIX] User [{u.email}]: plain-text detected -> hashing...")
            await db.user.update(
                where={"id": u.id},
                data={"password_hash": get_password_hash(u.password_hash)},
            )
            fixed += 1
        else:
            print(f"  [OK]  User [{u.email}]: already hashed - skipped")
    return fixed


async def main():
    db = Prisma()
    await db.connect()
    print("\n==========================================")
    print("  Phase A - Password Hash Migration")
    print("==========================================")
    try:
        print("\n-- Clients --")
        c_fixed = await fix_client_passwords(db)

        print("\n-- Users --")
        u_fixed = await fix_user_passwords(db)

        print(f"\n==========================================")
        print(f"  Done. Fixed: {c_fixed} client(s), {u_fixed} user(s)")
        print(f"==========================================\n")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
