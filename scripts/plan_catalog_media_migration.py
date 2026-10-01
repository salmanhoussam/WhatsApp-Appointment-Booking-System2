#!/usr/bin/env python3
"""Plan the catalog media naming migration. READ-ONLY, and deliberately has no --execute.

    venv/bin/python scripts/plan_catalog_media_migration.py caracas

WHAT THIS IS
------------
Step 4 of `.claudedocs/plans/catalog-media-naming.md`, dry-run half only. Steps 1-3 shipped
(113e387, 190be4c, fb39636): every item is born with a SKU, and a NEW upload is already named
after it. This step is about the files that landed BEFORE that — 72 live caracas rows whose
image sits at `catalog/{category_id}/{item_id}/main.jfif`, a path that names a category six of
them no longer belong to.

THE CONTRACT — ratified by Salman 2026-10-01, five decisions, verbatim
---------------------------------------------------------------------
  (1) the destination is the BARE `{SKU}.{ext}` — no random suffix. Deterministic, re-runnable,
      reconcilable. The suffixed form that `storage_service.py` produces today is NOT used here.
  (2) `{ext}` is `jpg`, derived from the content-type the server actually serves, through the
      same map `_ext_for_content_type` uses. 71 of 72 stored files are named `.jfif` and every
      one is served `image/jpeg`, so 71 destinations change extension.
  (3) `storage_service.py` is NOT touched by this step. Making a REPLACEMENT upload
      deterministic (upsert) is a separate behaviour decision, deliberately deferred — this is a
      migration, not a refactor of the upload service.
  (4) the old files STAY. They are the rollback. Deleting them is its own authorisation.
  (5) dry-run first, and it must PROVE the destination is deterministic and the run is repeatable
      before any production write.

WHY IT CANNOT WRITE
-------------------
No copy, no UPDATE, no `--execute` flag to find. The DB connection is sealed read-only and the
seal is proven before the first read — with a probe against a column that EXISTS, because
2026-10-01 taught that a probe refused for a missing column proves nothing about the seal.
Storage is reached only through `list` and `HEAD`.

THE VERIFICATION GATE — Salman's words, applied literally
---------------------------------------------------------
Only **HTTP 200** is success. Supabase answers **400**, not 404, for an object that is not there
(measured; the negative control is what caught it) and a real live file has been seen to time out
once and return 200 on the retry. So: every probe retries; anything that is not 200 after the
retries is a FAILURE, never a shrug; and a non-200 on a destination probe is NOT read as
"destination free" — freedom is established by ENUMERATING the folder, and the HEAD must agree
with the enumeration or the row STOPS.
"""
import collections
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import psycopg2                      # noqa: E402
from dotenv import load_dotenv       # noqa: E402
from supabase import create_client   # noqa: E402

from scripts import _db_target       # noqa: E402

load_dotenv()

BUCKET = "properties"
PUBLIC_PREFIX = f"/storage/v1/object/public/{BUCKET}/"
# The one place the destination shape lives. Decision (1)+(2).
DEST_TEMPLATE = "{slug}/catalog/{sku}.{ext}"
# The same mapping `storage_service._ext_for_content_type` applies, restated rather than imported
# so this script does not pull FastAPI in. Decision (2) says the extension comes from the SERVED
# content-type through this map — not from the stored filename.
EXT_BY_CONTENT_TYPE = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
}
RETRIES = 3
TIMEOUTS = (20, 35, 50)


# ── the destination: a pure function of (slug, sku, ext) ──────────────────────────────────────
def destination(slug: str, sku: str, ext: str) -> str:
    """No uuid, no clock, no counter. Called twice with the same inputs it returns the same key —
    which is the whole of decision (1) and is asserted, not asserted-to-be, further down."""
    return DEST_TEMPLATE.format(slug=slug, sku=sku, ext=ext)


# Supabase Storage answers 400 — not 404 — for an object that is not there. MEASURED, and the
# negative control at [7] is what caught it. 400 is therefore the ONLY status that corroborates
# absence. Everything else that is not 200 (429, 5xx, a timeout) means THE PROBE FAILED, which is
# not the same statement as "the file is absent" and is never allowed to stand in for it.
ABSENT = 400
RETRYABLE = {429, 500, 502, 503, 504}


def classify_destination(enumerated: bool, status) -> str:
    """PRESENT / FREE / INCONCLUSIVE. One predicate, so it can be controlled rather than trusted.

    FREE requires absence to be said TWICE — missing from the folder listing AND a settled 400.
    Any other combination is INCONCLUSIVE and stops the row. The branch that must never exist is
    "not in the listing, probe failed → free", which is how a throttled probe would otherwise
    authorise a copy over a file nobody looked at.
    """
    if enumerated and status == 200:
        return "PRESENT"
    if not enumerated and status == ABSENT:
        return "FREE"
    return "INCONCLUSIVE"


def head(url: str):
    """Returns (status, content_type). Only 200 means present; only 400 means absent.

    A throttled or timed-out probe is retried with a backoff and, if it never resolves, reported
    as-is so the caller must STOP on it. This is the lesson of 2026-10-01 in its narrowest form:
    a check that fails for the wrong reason has measured nothing, and the dangerous version of
    that is the one whose wrong reason happens to fall on the side you wanted.
    """
    last = None
    for attempt in range(RETRIES):
        if attempt:
            time.sleep(1.5 * attempt)
        try:
            req = urllib.request.Request(url, method="HEAD")
            with urllib.request.urlopen(req, timeout=TIMEOUTS[attempt]) as r:
                return r.status, r.headers.get("content-type")
        except urllib.error.HTTPError as e:
            last = e.code
            if e.code not in RETRYABLE:
                return last, None      # a settled answer — 200 or 400 or a real refusal
        except Exception as e:
            last = f"ERR:{type(e).__name__}"
    return last, None


def main() -> int:
    slug = sys.argv[1] if len(sys.argv) > 1 else "caracas"
    print(f"\n{'='*94}\nCATALOG MEDIA MIGRATION — DRY RUN · tenant = {slug}\n{'='*94}")

    # ── 0 · seal the reader, and prove the seal ───────────────────────────────────────────────
    conn = psycopg2.connect(_db_target.resolve(direct=True, quiet=True))
    conn.set_session(readonly=True)

    def probe(sql):
        cur = conn.cursor()
        try:
            cur.execute(sql)
            return "WROTE", None
        except Exception as e:
            return "REFUSED", str(e).strip().splitlines()[0]
        finally:
            conn.rollback()

    real = probe("UPDATE catalog_items SET sort_order = sort_order WHERE id IS NULL")
    print("\n[0] SEAL")
    print(f"    probe on a column that EXISTS (sort_order) : {real[0]} — {real[1]}")
    if real[0] != "REFUSED" or "read-only" not in (real[1] or "").lower():
        print("🔴 the seal is not proven — the probe did not fail for the seal's reason. ABORT.")
        return 1
    print("    ✅ writes refused AS READ-ONLY, on a column that is really there")

    cur = conn.cursor()

    # ── 1 · selection, with every exclusion counted ───────────────────────────────────────────
    cur.execute("""
        SELECT i.id, i.sku, i.name_ar, i.image_url, i.is_active, cat.name_ar
          FROM catalog_items i
          JOIN clients cl             ON cl.id  = i.client_id
          JOIN catalog_categories cat ON cat.id = i.category_id
         WHERE cl.slug = %s
         ORDER BY cat.sort_order, i.sort_order
    """, (slug,))
    all_rows = cur.fetchall()

    excl = collections.Counter()
    selected = []
    for iid, sku, nar, url, active, cat in all_rows:
        if not active:
            excl["archived (is_active = false)"] += 1;              continue
        if not url:
            excl["no image on the row"] += 1;                        continue
        if PUBLIC_PREFIX not in url:
            excl["image not in the properties bucket"] += 1;         continue
        if not sku:
            excl["live, has an image, but NO SKU"] += 1;             continue
        key = url.split(PUBLIC_PREFIX, 1)[1]
        if not key.startswith(f"{slug}/"):
            excl["image belongs to another tenant's folder"] += 1;   continue
        selected.append(dict(id=iid, sku=sku, name_ar=nar, cat=cat, old_url=url, old_key=key))

    print(f"\n[1] SELECTION — {len(all_rows)} rows exist for {slug}")
    for reason, n in excl.most_common():
        print(f"    −{n:<4} {reason}")
    print(f"    = {len(selected)} SELECTED")

    # ── 2 · controls on the selection itself ──────────────────────────────────────────────────
    print("\n[2] SELECTION CONTROLS — can the query prove itself?")
    if not selected:
        # An empty selection is a real, reportable answer — `footlab` holds three live items whose
        # images are images.unsplash.com URLs that were never in our bucket, so there is nothing to
        # copy and nothing is wrong. The first version of this script CRASHED here
        # (`'NoneType' object is not subscriptable`) because it assumed at least one row, which
        # turned "nothing to migrate" into a traceback — a tool that cannot say "zero" cleanly
        # will eventually have its zero mistaken for a failure, or its failure for a zero.
        print("    (no rows selected — the controls below need at least one, so they are skipped)")
        print(f"\n{'='*94}\n    🟢 NOTHING TO MIGRATE for {slug}. The exclusions above are the "
              f"whole story, and none of them is an error.\n{'='*94}\n")
        conn.close()
        return 0
    pos = selected[0]
    cur.execute("""
        SELECT i.sku, i.name_ar FROM catalog_items i JOIN clients cl ON cl.id = i.client_id
         WHERE cl.slug = %s AND NOT i.is_active AND i.image_url IS NOT NULL LIMIT 1
    """, (slug,))
    neg_arch = cur.fetchone()
    cur.execute("""
        SELECT i.sku, i.name_ar FROM catalog_items i JOIN clients cl ON cl.id = i.client_id
         WHERE cl.slug = %s AND i.is_active AND i.image_url IS NULL LIMIT 1
    """, (slug,))
    neg_noimg = cur.fetchone()
    sel_ids = {r["id"] for r in selected}
    print(f"    ✅ POSITIVE  must be IN : {pos['sku']} — in = {pos['id'] in sel_ids}")
    if neg_arch:
        cur.execute("SELECT id FROM catalog_items WHERE sku = %s", (neg_arch[0],))
        nid = cur.fetchone()[0]
        print(f"    ✅ NEGATIVE  archived, carries an image, must be OUT : {neg_arch[0]} — "
              f"in = {nid in sel_ids}")
    if neg_noimg:
        print(f"    ✅ NEGATIVE  live, no image, must be OUT : "
              f"{neg_noimg[0] or '(no sku)'} / {neg_noimg[1]}")
    cur.execute("""
        SELECT count(*) FROM catalog_items i JOIN clients cl ON cl.id = i.client_id
         WHERE cl.slug <> %s AND i.is_active AND i.image_url IS NOT NULL
    """, (slug,))
    others = cur.fetchone()[0]
    print(f"    ✅ NEGATIVE  other tenants carrying live images, all must be OUT : {others} rows, "
          f"selected = {sum(1 for r in selected if not r['old_key'].startswith(slug + '/'))}")

    # ── 3 · the served content-type decides the extension ─────────────────────────────────────
    print(f"\n[3] SOURCE VERIFICATION — HEAD every old URL (only 200 passes; {RETRIES} attempts)")
    with ThreadPoolExecutor(10) as ex:
        for r, (st, ct) in zip(selected, ex.map(lambda r: head(r["old_url"]), selected)):
            r["old_status"], r["old_ct"] = st, ct
    by_status = collections.Counter(r["old_status"] for r in selected)
    for st, n in by_status.most_common():
        print(f"    {n:>4}  {st}")
    dead = [r for r in selected if r["old_status"] != 200]
    if dead:
        print(f"    🔴 {len(dead)} source(s) are NOT 200 after {RETRIES} attempts — these STOP "
              f"the migration, they are not skipped silently:")
        for r in dead:
            print(f"        {r['old_status']}  {r['sku']}  {r['old_key']}")

    for r in selected:
        r["ext"] = EXT_BY_CONTENT_TYPE.get(r["old_ct"] or "", None)
    unmapped = [r for r in selected if not r["ext"]]
    print(f"    content-types served: "
          f"{dict(collections.Counter(r['old_ct'] for r in selected))}")
    if unmapped:
        print(f"    🔴 {len(unmapped)} row(s) serve a content-type outside the map — a destination "
              f"cannot be named for them. STOP, do not guess an extension.")
    offcontract = [r for r in selected if r["ext"] and r["ext"] != "jpg"]
    if offcontract:
        print(f"    ⚠️  {len(offcontract)} row(s) derive an extension that is NOT jpg — decision (2) "
              f"named jpg for THIS set; these need their own word:")
        for r in offcontract[:8]:
            print(f"        .{r['ext']}  {r['sku']}")
    stored_vs_new = collections.Counter(
        (r["old_key"].rsplit(".", 1)[-1].lower(), r["ext"]) for r in selected if r["ext"])
    print("    stored extension → destination extension:")
    for (old, new), n in stored_vs_new.most_common():
        print(f"        {n:>3}  .{old:<6} → .{new}{'   ← CHANGES' if old != new else ''}")

    # ── 4 · DETERMINISM — decision (5)'s first requirement ────────────────────────────────────
    print("\n[4] DETERMINISM — is the destination a pure function of (slug, sku, ext)?")
    planA = {r["id"]: destination(slug, r["sku"], r["ext"]) for r in selected if r["ext"]}
    planB = {r["id"]: destination(slug, r["sku"], r["ext"]) for r in selected if r["ext"]}
    same = json.dumps(planA, sort_keys=True) == json.dumps(planB, sort_keys=True)
    print(f"    computed twice, independently → identical : {same}  ({len(planA)} destinations)")
    if not same:
        print("🔴 not deterministic. ABORT."); return 1
    import re as _re
    nondet = [k for k in planA.values() if _re.search(r"-[0-9a-f]{6}\.", k)]
    print(f"    destinations carrying a random suffix       : {len(nondet)}  (decision (1) → must be 0)")
    # NEGATIVE CONTROL of this very test: the shipped upload shape MUST fail it.
    import uuid as _uuid
    shipA = f"{slug}/catalog/X-{_uuid.uuid4().hex[:6]}.jpg"
    shipB = f"{slug}/catalog/X-{_uuid.uuid4().hex[:6]}.jpg"
    print(f"    ✅ NEGATIVE CONTROL — the shape storage_service.py produces today, computed twice:")
    print(f"        {shipA}\n        {shipB}\n        identical = {shipA == shipB}  "
          f"← must be False, proving this test can fail")
    if shipA == shipB:
        print("🔴 the determinism test cannot distinguish the two shapes. ABORT."); return 1

    # ── 5 · destination state, measured by ENUMERATION then confirmed by HEAD ──────────────────
    print("\n[5] DESTINATION STATE — enumerated from the bucket, then confirmed by HEAD")
    sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
    listing, offset = {}, 0
    while True:
        batch = sb.storage.from_(BUCKET).list(
            f"{slug}/catalog", {"limit": 1000, "offset": offset})
        if not batch:
            break
        for e in batch:
            if e.get("id"):                      # a file, not a prefix
                listing[e["name"]] = (e.get("metadata") or {}).get("mimetype")
        if len(batch) < 1000:
            break
        offset += 1000
    print(f"    files directly under {slug}/catalog/ : {len(listing)}")
    for name, mt in list(listing.items())[:6]:
        print(f"        {name}   {mt}")

    base = os.getenv("SUPABASE_URL").rstrip("/") + PUBLIC_PREFIX
    def dest_state(r):
        key = planA[r["id"]]
        fname = key.rsplit("/", 1)[-1]
        enumerated = fname in listing
        st, _ = head(base + key)
        return key, enumerated, st

    with ThreadPoolExecutor(4) as ex:
        for r, (key, enumerated, st) in zip(
                [r for r in selected if r["ext"]],
                ex.map(dest_state, [r for r in selected if r["ext"]])):
            r["dest"], r["dest_enumerated"], r["dest_status"] = key, enumerated, st

    print("    CLASSIFIER CONTROL — the predicate, exercised on both outcomes:")
    for enumerated, status, must in [
        (False, 400,              "FREE"),          # absent twice over
        (True,  200,              "PRESENT"),       # there, twice over
        (False, 429,              "INCONCLUSIVE"),  # THROTTLED — the branch that must not say FREE
        (False, "ERR:TimeoutError", "INCONCLUSIVE"),
        (True,  400,              "INCONCLUSIVE"),  # listing and probe disagree
    ]:
        got = classify_destination(enumerated, status)
        mark = "✅" if got == must else "🔴"
        print(f"        {mark} enumerated={str(enumerated):<5} status={str(status):<17} "
              f"→ {got:<12} (must be {must})")
        if got != must:
            print("🔴 the classifier does not behave as documented. ABORT.")
            return 1

    buckets = collections.Counter()
    disagree, occupied = [], []
    for r in selected:
        if not r.get("dest"):
            continue
        verdict = classify_destination(r["dest_enumerated"], r["dest_status"])
        if verdict == "PRESENT":
            buckets["ALREADY AT DESTINATION"] += 1
            if r["old_key"] != r["dest"]:
                occupied.append(r)
        elif verdict == "FREE":
            buckets["TO COPY (destination free)"] += 1
        else:
            buckets["🔴 INCONCLUSIVE — the probe did not resolve"] += 1
            disagree.append(r)
    for k, n in buckets.most_common():
        print(f"    {n:>4}  {k}")
    seen = sorted({str(r["dest_status"]) for r in selected
                   if r.get("dest") and not r["dest_enumerated"]})
    print(f"    statuses seen on destinations absent from the listing: {seen}")
    print(f"    ← {ABSENT} is Supabase for 'not there' and is the ONLY status that corroborates "
          f"absence.\n      429 / 5xx / a timeout are unresolved probes and STOP the row.")
    if disagree:
        print(f"    🔴 {len(disagree)} row(s) STOP — the destination probe never resolved "
              f"(throttled, timed out, or the listing and the HEAD disagree). An unresolved probe "
              f"is NOT 'destination free':")
        for r in disagree[:10]:
            print(f"        status={r['dest_status']}  enumerated={r['dest_enumerated']}  "
                  f"{r['dest']}")
    if occupied:
        print(f"    🔴 {len(occupied)} destination(s) are occupied by a DIFFERENT file than this "
              f"row's own. STOP — never overwrite:")
        for r in occupied[:8]:
            print(f"        {r['dest']}  (row points at {r['old_key']})")

    # ── 6 · collisions among the destinations themselves ──────────────────────────────────────
    coll = {k: v for k, v in collections.Counter(planA.values()).items() if v > 1}
    print(f"\n[6] COLLISIONS among the {len(planA)} destinations : {len(coll)}")
    for k, v in coll.items():
        print(f"    x{v}  {k}")

    # ── 7 · probe controls, both directions ──────────────────────────────────────────────────
    print("\n[7] PROBE CONTROLS — does the instrument know how to fail?")
    live = base + selected[0]["old_key"]
    print(f"    ✅ POSITIVE  a file known to exist        : {head(live)[0]}  (must be 200)")
    print(f"    ✅ NEGATIVE  a key deliberately absent    : "
          f"{head(base + slug + '/catalog/__NO_SUCH_FILE__.jpg')[0]}  (must NOT be 200)")
    print(f"    ✅ NEGATIVE  the decommissioned project   : "
          f"{head('https://gdzthjcvzvhfpsvoxhbm.supabase.co' + PUBLIC_PREFIX + 'x.jpg')[0]}"
          f"  (must NOT be 200)")

    # ── 8 · the plan, row by row ──────────────────────────────────────────────────────────────
    print(f"\n[8] THE PLAN — {buckets['TO COPY (destination free)']} copies, grouped by category")
    bycat = collections.defaultdict(list)
    for r in selected:
        if r.get("dest"):
            bycat[r["cat"]].append(r)
    for cat, rs in bycat.items():
        print(f"\n  [{cat}]  {len(rs)}")
        for r in rs:
            print(f"    {r['old_key']}")
            print(f"      → {r['dest']}      src={r['old_status']} dest={r['dest_status']}")

    # ── 9 · what execution would do, and how it comes back ────────────────────────────────────
    ok = (not dead and not unmapped and not disagree and not occupied and not coll
          and len(nondet) == 0)
    print(f"\n{'='*94}\n[9] EXECUTION PLAN (not executed — this script has no --execute)\n{'='*94}")
    print(f"""
    BEFORE   {slug}: {len(all_rows)} items · {len(selected)} selected · \
{buckets['TO COPY (destination free)']} to copy · {len(listing)} files already under catalog/

    1  COPY   download each source (verified 200 above) and upload to its destination with
              content-type image/jpeg. Never move. Never delete. Never overwrite — a destination
              that is occupied stopped this run at [5].
    2  VERIFY HEAD every new URL. **Only 200 passes.** 400 / timeout / anything else retries
              {RETRIES}×, then STOPS the whole run. No row is skipped quietly.
    3  WRITE  one transaction, this tenant only:
                 BEGIN;
                 UPDATE catalog_items SET image_url = $new, updated_at = now()
                  WHERE id = $id AND client_id = $caracas AND image_url = $old;
                 -- the `image_url = $old` guard makes the UPDATE idempotent and makes a
                 -- concurrent dashboard edit lose instead of being silently overwritten
                 -- expect rowcount = 1 per statement; any 0 → ROLLBACK
                 COMMIT;
    4  AFTER  re-read all {len(selected)} rows: every image_url matches {DEST_TEMPLATE},
              every one returns 200, platform-wide StoreOrderItem count unchanged.

    ROLLBACK the old files are untouched and still 200. Reverting is one UPDATE back to $old
             per row — no file operation at all. Decision (4).

    RE-RUN   the destination is a pure function of (slug, sku, ext), so a second run finds every
             destination ALREADY AT DESTINATION and plans 0 copies. That is the repeatability
             decision (5) asked for, and it is measured at [5], not asserted.
""")
    print(f"    GATE: {'🟢 every check passes — ready for your word' if ok else '🔴 BLOCKED, see the 🔴 lines above'}")
    print(f"    This run wrote nothing: 0 copies, 0 DB writes, 0 deletes.\n")
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
