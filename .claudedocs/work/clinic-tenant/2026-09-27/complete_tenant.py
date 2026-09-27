"""Finish `cliniclab-test` — the two rows the first --execute could not write.

Run:  venv/bin/python .claudedocs/work/clinic-tenant/2026-09-27/complete_tenant.py [--execute]

WHY A SECOND SCRIPT AND NOT A RE-RUN
create_tenant.py refuses to run when the slug exists, and that guard is correct: it creates, it never
adopts. So the remainder is finished here, from the manifest, which is exactly what §10.1 said the
manifest was for -- written after EVERY insert precisely so a halfway failure leaves a complete,
resumable record instead of an unknown state.

WHAT FAILED, AND WHY IT IS A LIBRARY DETAIL AND NOT A DATA PROBLEM
Prisma Python rejects `workingHours: None` on a nullable Json column: `None` is read as "a value is
required but not set" rather than as SQL NULL. The key must be OMITTED. doctor2 must have NULL
working hours on purpose -- that is what makes it fall back to Client.config (ق-٤-د) and what T-4
measures -- so omitting the key is also semantically the right thing, not a workaround.

Rows already written (from created-ids.json): client, client_service, user, category, 3 services,
resource D1. Remaining: resource D2, and the 3 resource_services rows.
"""
import asyncio
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import _db_target                                                          # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=True, quiet=True)
from app.db.client import prisma_client                                    # noqa: E402

EXECUTE = "--execute" in sys.argv
IDS_PATH = os.path.join(HERE, "created-ids.json")
SLUG = "cliniclab-test"
ELIGIBILITY = [(0, 0), (1, 0), (0, 2)]     # (resource index, service index) -- D1·S1, D2·S1, D1·S3


async def main():
    await prisma_client.connect()
    try:
        ids = json.load(open(IDS_PATH, encoding="utf-8"))
        cid = ids["client_id"]
        client = await prisma_client.client.find_unique(where={"id": cid})
        if not client or client.slug != SLUG:
            raise SystemExit(f"⛔ REFUSED — manifest client_id does not resolve to {SLUG}")
        print(f"resuming {SLUG} · client_id={cid}")

        svcs = await prisma_client.catalogservice.find_many(
            where={"clientId": cid}, order={"sortOrder": "asc"})
        ress = await prisma_client.resource.find_many(
            where={"clientId": cid}, order={"sortOrder": "asc"})
        links = await prisma_client.resourceservice.find_many(where={"clientId": cid})
        print(f"present: services={len(svcs)} resources={len(ress)} resource_services={len(links)}")

        need_d2 = len(ress) < 2
        need_links = 3 - len(links)
        print(f"missing: resource D2={need_d2} · resource_services={need_links}")
        if not EXECUTE:
            print("DRY RUN — re-run with --execute.")
            return 0

        if need_d2:
            # workingHours OMITTED -> SQL NULL -> falls back to Client.config (ق-٤-د / T-4)
            d2 = await prisma_client.resource.create(data={
                "clientId": cid, "type": "doctor", "name": "د. تجربة ثانية",
                "specialty": "أسنان", "isActive": True, "sortOrder": 1,
            })
            ids["resource_ids"].append(d2.id)
            json.dump(ids, open(IDS_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            print(f"✅ resource D2 created · {d2.id} · workingHours={d2.workingHours!r}")
            ress = await prisma_client.resource.find_many(
                where={"clientId": cid}, order={"sortOrder": "asc"})

        have = {(l.resourceId, l.serviceId) for l in links}
        for ri, si in ELIGIBILITY:
            pair = (ress[ri].id, svcs[si].id)
            if pair in have:
                continue
            row = await prisma_client.resourceservice.create(data={
                "clientId": cid, "resourceId": pair[0], "serviceId": pair[1]})
            ids["resource_service_ids"].append(row.id)
            json.dump(ids, open(IDS_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            print(f"✅ eligibility · {ress[ri].name} → {svcs[si].nameAr}")

        print("✅ manifest updated")
        return 0
    finally:
        await prisma_client.disconnect()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
