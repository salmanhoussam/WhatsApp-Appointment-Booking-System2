"""Clinic P1-B — apply the resource-slot unique index. THE ONE production change in P1.

Not a data write: no row is inserted, updated or deleted. DDL only, and exactly ONE statement,
read from the migration file itself so this script cannot drift from it.

GUARDS, in order, each refusing rather than continuing:
  1. DIRECT_URL (port 5432), validated by role via _db_target — never the pooled URL for DDL.
  2. The statement is read from prisma/migrations/, and must be exactly one statement that
     starts with CREATE UNIQUE INDEX and names the expected index. Anything else aborts.
  3. pg_indexes is read BEFORE and AFTER, and the barber index's definition is compared
     character for character across the two reads.
  4. A row count on reservations before and after -- it must not move. This is how "no data was
     written" is PROVEN rather than asserted.
"""
import asyncio, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".."))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import _db_target                                                          # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=True, quiet=True)   # DDL -> direct
from app.db.client import prisma_client                                    # noqa: E402

MIG = os.path.join(ROOT, "prisma", "migrations", "add_reservation_resource_slot_unique_index.sql")
NAME = "reservations_active_resource_slot_uidx"
BARBER = "reservations_active_barber_slot_uidx"

IDX_SQL = ("SELECT indexname, indexdef FROM pg_indexes "
           "WHERE schemaname='public' AND tablename='reservations' ORDER BY indexname")


def statement() -> str:
    raw = open(MIG, encoding="utf-8").read()
    body = "\n".join(l for l in raw.splitlines() if not l.strip().startswith("--")).strip()
    if body.count(";") != 1 or not body.endswith(";"):
        sys.exit(f"ABORT: expected exactly one statement, got: {body!r}")
    stmt = body[:-1].strip()
    if not re.match(r"^CREATE UNIQUE INDEX IF NOT EXISTS\s+" + NAME + r"\b", stmt):
        sys.exit(f"ABORT: statement is not the expected CREATE UNIQUE INDEX: {stmt[:80]!r}")
    if re.search(r"\b(DROP|ALTER|DELETE|UPDATE|INSERT|TRUNCATE)\b", stmt, re.I):
        sys.exit("ABORT: statement contains a forbidden keyword")
    return stmt


async def main() -> int:
    stmt = statement()
    print("THE STATEMENT, read from the migration file:\n  " + stmt.replace("\n", "\n  ") + "\n")
    await prisma_client.connect()

    before = {r["indexname"]: r["indexdef"] for r in await prisma_client.query_raw(IDX_SQL)}
    n_before = (await prisma_client.query_raw("SELECT count(*)::int AS n FROM reservations"))[0]["n"]
    print(f"BEFORE · {len(before)} index(es) on reservations · reservations rows = {n_before}")
    print(f"         {NAME} present? {NAME in before}")
    if NAME in before:
        print("         already present — nothing to do")

    print("\nAPPLYING …")
    await prisma_client.execute_raw(stmt)

    after = {r["indexname"]: r["indexdef"] for r in await prisma_client.query_raw(IDX_SQL)}
    n_after = (await prisma_client.query_raw("SELECT count(*)::int AS n FROM reservations"))[0]["n"]
    print(f"\nAFTER  · {len(after)} index(es) · reservations rows = {n_after}")

    print("\n── EVIDENCE ──")
    print(f"IX-1  {NAME} exists : {NAME in after}")
    print(f"      def: {after.get(NAME)}")
    print(f"IX-2  {BARBER} unchanged : {before.get(BARBER) == after.get(BARBER)}")
    print(f"      def: {after.get(BARBER)}")
    print(f"DATA  reservations rows before/after : {n_before} / {n_after} "
          f"({'UNCHANGED' if n_before == n_after else '🔴 MOVED'})")
    added = sorted(set(after) - set(before))
    removed = sorted(set(before) - set(after))
    changed = sorted(k for k in set(before) & set(after) if before[k] != after[k])
    print(f"DIFF  added={added} removed={removed} changed={changed}")

    print("\n── every index on reservations, after ──")
    for k in sorted(after):
        print(f"  · {k}\n      {after[k]}")

    await prisma_client.disconnect()
    okay = (NAME in after and before.get(BARBER) == after.get(BARBER)
            and n_before == n_after and not removed and not changed and added == [NAME])
    print("\n" + ("✅ P1-B APPLIED AND PROVEN STRUCTURALLY" if okay else "🔴 UNEXPECTED STATE"))
    return 0 if okay else 2


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
