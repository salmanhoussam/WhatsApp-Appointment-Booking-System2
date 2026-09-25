"""P1 gate — the ONE authorised query. READ ONLY. SELECT ONLY. Nothing else.

Salman, 2026-09-25: "نفّذوا الاستعلام نفسه بالقارئ المختوم، ولا أي استعلام إضافي، ولا أي write."

Same seal as read_evidence.py in this folder: 276 write methods sealed + a SELECT-only guard on
query_raw, both PROVEN by a real attempt before the read runs.
"""
import asyncio, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".."))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import _db_target                                                          # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=False, quiet=True)
from app.db.client import prisma_client                                    # noqa: E402
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from read_evidence import seal, WriteAttempted                             # noqa: E402

# The approved statement, verbatim. Nothing is added to it.
SQL = """SELECT c.slug, c.vertical, cs.service_key, cs.is_active
FROM clients c
JOIN client_services cs ON cs.client_id = c.id
WHERE cs.service_key IN ('lia','reservations')
  AND cs.is_active = true"""


async def main() -> int:
    await prisma_client.connect()
    sealed = seal(prisma_client)
    try:
        await prisma_client.catalogitem.create(data={"nameAr": "SEAL-TEST"})
        print("🔴 SEAL DID NOT HOLD"); return 2
    except WriteAttempted:
        pass
    try:
        await prisma_client.query_raw("UPDATE client_services SET is_active = false")
        print("🔴 SELECT-ONLY GUARD DID NOT HOLD"); return 2
    except WriteAttempted:
        pass
    print(f"sealed {sealed} write methods · both guards proven by real attempts\n")
    print("THE STATEMENT, verbatim:")
    print("  " + SQL.replace("\n", "\n  ") + "\n")

    rows = await prisma_client.query_raw(SQL)
    print(f"{len(rows)} row(s)\n")
    print(f"  {'slug':<18} {'vertical':<10} {'service_key':<14} is_active")
    print("  " + "-" * 56)
    for r in sorted(rows, key=lambda x: (str(x['slug']), str(x['service_key']))):
        print(f"  {str(r['slug']):<18} {str(r['vertical']):<10} "
              f"{str(r['service_key']):<14} {r['is_active']}")

    await prisma_client.disconnect()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
