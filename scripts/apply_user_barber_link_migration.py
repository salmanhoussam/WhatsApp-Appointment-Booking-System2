"""
scripts/apply_user_barber_link_migration.py

One-off: apply prisma/migrations/add_user_barber_link.sql (Staff Scoped Access, Phase A).
Each statement is executed separately, not batched in one transaction -- ALTER TYPE ... ADD VALUE
has real constraints around running inside the same transaction as other DDL in older Postgres
versions; running statements individually avoids that class of failure entirely.

Usage:
    python -m scripts.apply_user_barber_link_migration
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.db.client import prisma_client

STATEMENTS = [
    """ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STAFF';""",
    """ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "barber_id" UUID;""",
    """ALTER TABLE "users" ADD CONSTRAINT "users_barber_id_key" UNIQUE ("barber_id");""",
    """ALTER TABLE "users" ADD CONSTRAINT "users_barber_id_fkey"
       FOREIGN KEY ("barber_id") REFERENCES "barbers"("id")
       ON DELETE SET NULL ON UPDATE CASCADE;""",
]


async def main():
    await prisma_client.connect()
    try:
        for i, stmt in enumerate(STATEMENTS, 1):
            print(f"[{i}/{len(STATEMENTS)}] {stmt.strip()[:80]}...")
            try:
                await prisma_client.execute_raw(stmt)
                print(f"  [OK]")
            except Exception as e:
                msg = str(e)
                if "already exists" in msg or "duplicate" in msg.lower():
                    print(f"  [SKIP] already applied: {msg[:120]}")
                else:
                    raise
        print("\n[DONE] Migration applied.")
    finally:
        await prisma_client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
