#!/usr/bin/env python3
"""
scripts/clear_dead_category_images.py — drop the references to a decommissioned Supabase project.

Salman, 2026-10-03, item ⑤. DRY RUN BY DEFAULT; `--execute` writes.

    TARGET : caracas
    ACTION : clear dead category-image references (image_url -> NULL)
    SCOPE  : 10 caracas rows
    GUARD  : arizona is not touched

WHAT IS DEAD AND WHY THIS LOSES NOTHING
    The URLs point at `gdzthjcvzvhfpsvoxhbm.supabase.co`, a Supabase project that no longer
    resolves — the browser reports ERR_NAME_NOT_RESOLVED, five times per page load. They render
    NOTHING today. `CategoryPill` already falls back to `fallback_image_url` (the first item in
    that category carrying a picture) and then to the first letter, so clearing the dead value
    moves each circle from "broken image" to the picture it is already showing.

    Measured under a sealed read-only session before writing (2026-10-03):
        caracas dead references     : 10   (7 on active categories, 3 on inactive ones)
        arizona dead references     :  2   ← deliberately OUT of scope
        active affected categories  :  9 platform-wide, and ZERO of them lack a fallback
        (ساندويش 25 · وجبات 17 · ترويقة 14 · مشروبات باردة 10 · متبلات 10 · قطع دجاج 8 · مازة 7)

WHY ARIZONA IS COUNTED TWICE
    "We did not touch arizona" is a claim; a count before and after is evidence. The write is
    scoped by client_id, and the run still re-reads arizona afterwards and fails loudly if its
    number moved. A guard that cannot fail is not a guard.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _db_target                        # noqa: E402

import psycopg2                          # noqa: E402

DEAD_HOST = 'gdzthjcvzvhfpsvoxhbm'
TARGET_SLUG = 'caracas'
EXPECTED_ROWS = 10
UNTOUCHED = {'arizona': 2}               # slug -> dead references that must still be there after


def dead_count(cur, slug):
    cur.execute("""SELECT count(*) FROM catalog_categories c JOIN clients cl ON cl.id = c.client_id
                    WHERE cl.slug = %s AND c.image_url LIKE %s""", (slug, '%%%s%%' % DEAD_HOST))
    return cur.fetchone()[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--execute', action='store_true')
    args = ap.parse_args()
    url = _db_target.resolve(direct=True, quiet=True)

    ro = psycopg2.connect(url)
    ro.set_session(readonly=True)
    cur = ro.cursor()
    try:
        cur.execute("UPDATE catalog_categories SET sort_order = sort_order WHERE false")
        print('🔴 SEAL FAILED — the read-only session accepted a write. Aborting.')
        return 1
    except psycopg2.Error:
        ro.rollback()
        print('seal     : write refused ✅')

    cur.execute("""SELECT c.id, c.name_ar, c.is_active, c.image_url,
                          (SELECT count(*) FROM catalog_items i
                            WHERE i.category_id = c.id AND i.is_active
                              AND i.image_url IS NOT NULL AND i.image_url <> '') AS fallbacks
                     FROM catalog_categories c JOIN clients cl ON cl.id = c.client_id
                    WHERE cl.slug = %s AND c.image_url LIKE %s
                    ORDER BY c.sort_order""", (TARGET_SLUG, '%%%s%%' % DEAD_HOST))
    rows = cur.fetchall()
    before = {s: dead_count(cur, s) for s in UNTOUCHED}
    ro.close()

    print('target   : %s · %d rows' % (TARGET_SLUG, len(rows)))
    for r in rows:
        print('  %-24s active=%-5s fallbacks=%-3d %s' % (r[1], r[2], r[4], r[3].rsplit('/', 1)[-1]))
    print('untouched: %s' % ', '.join('%s=%d' % (k, v) for k, v in before.items()))

    if len(rows) != EXPECTED_ROWS:
        print('\n🔴 expected %d rows, measured %d. Refusing — re-measure first.'
              % (EXPECTED_ROWS, len(rows)))
        return 1
    for slug, n in UNTOUCHED.items():
        if before[slug] != n:
            print('\n🔴 %s carries %d dead references, not the %d measured. Refusing.'
                  % (slug, before[slug], n))
            return 1
    blind = [r for r in rows if r[2] and r[4] == 0]
    if blind:
        print('\n🔴 %d ACTIVE categories would be left with no image at all: %s. Refusing — that '
              'is a visible loss, not a cleanup.' % (len(blind), [r[1] for r in blind]))
        return 1

    if not args.execute:
        print('\nDRY RUN — nothing written. Re-run with --execute.')
        return 0

    w = psycopg2.connect(url)
    try:
        with w:
            c = w.cursor()
            c.execute("""UPDATE catalog_categories c SET image_url = NULL
                          FROM clients cl
                         WHERE cl.id = c.client_id AND cl.slug = %s AND c.image_url LIKE %s""",
                      (TARGET_SLUG, '%%%s%%' % DEAD_HOST))
            if c.rowcount != EXPECTED_ROWS:
                raise RuntimeError('expected %d rows, wrote %d — rolling back'
                                   % (EXPECTED_ROWS, c.rowcount))
            print('\n✅ %d rows written' % c.rowcount)
    finally:
        w.close()

    v = psycopg2.connect(url)
    v.set_session(readonly=True)
    vc = v.cursor()
    after_target = dead_count(vc, TARGET_SLUG)
    after_other = {s: dead_count(vc, s) for s in UNTOUCHED}
    vc.execute("""SELECT count(*) FROM catalog_items i JOIN clients cl ON cl.id = i.client_id
                   WHERE cl.slug = %s AND i.image_url IS NOT NULL AND i.image_url <> ''""",
               (TARGET_SLUG,))
    item_images = vc.fetchone()[0]
    v.close()

    print('verified : %s dead references now %d (expected 0)' % (TARGET_SLUG, after_target))
    for s, n in after_other.items():
        print('           %s still %d (expected %d) %s'
              % (s, n, UNTOUCHED[s], '✅' if n == UNTOUCHED[s] else '🔴 TOUCHED'))
    print('           caracas item images still %d — the fallbacks are untouched' % item_images)
    ok = after_target == 0 and all(after_other[s] == UNTOUCHED[s] for s in UNTOUCHED)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
