"""Correct the working_hours SHAPE on cliniclab-test — my own defect, fixed by reading the contract.

Run:  venv/bin/python .../fix_working_hours.py [--execute]

WHAT WENT WRONG, PLAINLY
I invented the shape instead of reading it. create_tenant.py wrote per-day dicts
(`{"monday": {"open": ..., "close": ...}, ...}`). availability_engine.check_working_hours() documents
and reads a completely different one:

    {"closed_days": [...], "open_time": "HH:MM", "close_time": "HH:MM"}

Its parse is `working_hours.get("open_time")`, so my dict produced `None` for both bounds, no day was
in `closed_days`, and the guard returned early — yet availability still came back EMPTY for both
doctors, which is how the defect surfaced. Service Execution Constitution rule 3: "prefer evidence
over assumptions -- if a Service needs a shape it does not have memorized, it finds a real example
and follows that". I did not, and the live read caught it, which is precisely why T-4 exists.

Only these two JSON columns change. No row is added or removed.
"""
import asyncio, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import _db_target                                                          # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=True, quiet=True)
from prisma import Json                                                     # noqa: E402
from app.db.client import prisma_client                                     # noqa: E402

EXECUTE = "--execute" in sys.argv
IDS = json.load(open(os.path.join(HERE, "created-ids.json"), encoding="utf-8"))

# The shape availability_engine.check_working_hours() actually reads, and UTC because that function
# says so: "All times treated as UTC directly". A wide window so a browser journey has real slots on
# any weekday it runs.
HOURS = {"closed_days": ["sunday"], "open_time": "08:00", "close_time": "20:00"}


async def main():
    await prisma_client.connect()
    try:
        cid = IDS["client_id"]
        d1 = IDS["resource_ids"][0]          # doctor1 keeps its OWN hours
        before_c = (await prisma_client.client.find_unique(where={"id": cid})).config
        before_r = (await prisma_client.resource.find_unique(where={"id": d1})).workingHours
        print("before · client.config.working_hours:", json.dumps(before_c.get("working_hours"), ensure_ascii=False)[:90])
        print("before · doctor1.working_hours      :", json.dumps(before_r, ensure_ascii=False)[:90])
        print("target                              :", json.dumps(HOURS, ensure_ascii=False))
        if not EXECUTE:
            print("\nDRY RUN — nothing written.")
            return 0

        cfg = dict(before_c)
        cfg["working_hours"] = HOURS
        await prisma_client.client.update(where={"id": cid}, data={"config": Json(cfg)})
        await prisma_client.resource.update(where={"id": d1}, data={"workingHours": Json(HOURS)})

        after_c = (await prisma_client.client.find_unique(where={"id": cid})).config
        after_r = (await prisma_client.resource.find_unique(where={"id": d1})).workingHours
        d2 = (await prisma_client.resource.find_unique(where={"id": IDS["resource_ids"][1]})).workingHours
        print("\nafter  · client.config.working_hours:", json.dumps(after_c.get("working_hours"), ensure_ascii=False))
        print("after  · doctor1.working_hours      :", json.dumps(after_r, ensure_ascii=False))
        print("after  · doctor2.working_hours      :", repr(d2), "← must stay None (ق-٤-د fallback)")
        sections = len((after_c.get("content") or {}).get("sections") or [])
        print(f"sections preserved: {sections} ← must still be 6")
        return 0 if (after_r == HOURS and d2 is None and sections == 6) else 1
    finally:
        await prisma_client.disconnect()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
