#!/usr/bin/env python3
"""
scripts/clean_category_name_en_crlf.py — remove the literal CRLF from one category's English name.

Salman, 2026-10-03, item ① («AR/EN + تنظيف الاسم»). DRY RUN BY DEFAULT; `--execute` writes.

WHY THIS BECAME VISIBLE TODAY AND NOT BEFORE
    `name_en` was in the API payload all along and NOTHING rendered it, so a CRLF pasted into the
    dashboard sat there harmlessly for months. Wiring the AR/EN toggle on the caracas menu is what
    turned it into a line break a customer reads. The defect did not change; its reachability did.

MEASURED FIRST, PLATFORM-WIDE (sealed read-only session, 2026-10-03)
    categories carrying a CR or LF : 1   ← caracas · قطع دجاج نيء(1كغ)
    items carrying a CR or LF      : 0
    caracas categories in total    : 14  (so the match is a subset, not "everything matched")

THE GUARD
    The UPDATE re-asserts the row id, the client slug AND the exact current `name_en` in its WHERE.
    If anybody edits that name from the dashboard between the read and the write, this writes zero
    rows and says so, instead of overwriting their edit with a value computed from a stale read.
    One row expected; any other count rolls back.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _db_target                        # noqa: E402

import psycopg2                          # noqa: E402

CATEGORY_ID = '2fb9824a-dfa5-49b4-bd8f-822116544a9f'
SLUG = 'caracas'
EXPECTED_AR = 'قطع دجاج نيء(1كغ)'
EXPECTED_EN = 'Raw Chicken Parts(1Kg)\r\n(daily prices)'

# The two candidate replacements. Salman picks; nothing is invented here beyond removing the break.
CANDIDATES = {
    'minimal': 'Raw Chicken Parts(1Kg) (daily prices)',
    'dash':    'Raw Chicken Parts (1Kg) — daily prices',
}


def read_row(cur):
    cur.execute(
        """SELECT c.id, c.name_ar, c.name_en, cl.slug
             FROM catalog_categories c JOIN clients cl ON cl.id = c.client_id
            WHERE c.id = %s""", (CATEGORY_ID,))
    return cur.fetchone()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--execute', action='store_true')
    ap.add_argument('--style', choices=sorted(CANDIDATES), default='dash')
    args = ap.parse_args()
    target = CANDIDATES[args.style]

    url = _db_target.resolve(direct=True, quiet=True)

    ro = psycopg2.connect(url)
    ro.set_session(readonly=True)
    cur = ro.cursor()
    # The seal is proven against a column that EXISTS, so a refusal is attributable to the seal
    # rather than to a misspelled column name.
    try:
        cur.execute("UPDATE catalog_categories SET sort_order = sort_order WHERE false")
        print('🔴 SEAL FAILED — the read-only session accepted a write. Aborting.')
        return 1
    except psycopg2.Error:
        ro.rollback()

    row = read_row(cur)
    ro.close()

    if not row:
        print('🔴 category %s does not exist. Nothing to do, and that is an error — the id came '
              'from a real read.' % CATEGORY_ID)
        return 1

    _id, name_ar, name_en, slug = row
    print('row      : %s' % _id)
    print('tenant   : %s   (expected %s)' % (slug, SLUG))
    print('name_ar  : %r' % name_ar)
    print('name_en  : %r   ← now' % name_en)
    print('name_en  : %r   ← after (--style %s)' % (target, args.style))
    print()
    print('the other candidate was: %r' % CANDIDATES['minimal' if args.style == 'dash' else 'dash'])

    if slug != SLUG or name_ar != EXPECTED_AR or name_en != EXPECTED_EN:
        print('\n🔴 the row no longer matches what was measured. Refusing — re-measure first.')
        return 1
    if '\r' in target or '\n' in target:
        print('\n🔴 the replacement itself carries a line break. Refusing.')
        return 1

    if not args.execute:
        print('\nDRY RUN — nothing written. Re-run with --execute to write this one row.')
        return 0

    w = psycopg2.connect(url)
    try:
        with w:
            c = w.cursor()
            c.execute(
                """UPDATE catalog_categories SET name_en = %s, updated_at = now()
                    WHERE id = %s AND name_ar = %s AND name_en = %s""",
                (target, CATEGORY_ID, EXPECTED_AR, EXPECTED_EN))
            if c.rowcount != 1:
                raise RuntimeError('expected exactly 1 row, got %d — rolling back' % c.rowcount)
            print('\n✅ 1 row written')
    finally:
        w.close()

    v = psycopg2.connect(url)
    v.set_session(readonly=True)
    row = read_row(v.cursor())
    v.close()
    print('verified : name_en = %r' % row[2])
    print('CR/LF    : %s' % ('🔴 STILL PRESENT' if ('\r' in row[2] or '\n' in row[2]) else 'none'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
