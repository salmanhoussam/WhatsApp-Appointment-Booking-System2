#!/usr/bin/env python3
"""
scripts/null_out_caracas_zero_prices.py — eighteen dishes stop claiming to cost nothing.

Salman's authorisation, 2026-10-03, item ⑥-ب. DRY RUN BY DEFAULT; `--execute` writes.

    TARGET   caracas · the 18 rows listed below, BY ID
    ACTION   price 0 → NULL
    GUARD    nothing with a real price is reachable; arizona and every other tenant untouched
    SCOPE    the `price` column and nothing else — proven by a 16-column fingerprint, not promised

WHY BY ID AND NOT BY CATEGORY OR NAME
    Salman: «لا تعتمد على الاسم وحده». The ids below came from a real read (see
    `.claudedocs/work/caracas-price-absence/2026-10-03/summary.md`) and the UPDATE re-asserts THREE
    things in its WHERE: the id is in this list, the row belongs to caracas, and its price is still
    exactly 0. So if Mahmoud prices one of these dishes from his dashboard between the measurement
    and the write, that row drops out, the rowcount is no longer 18, and the whole transaction
    rolls back rather than overwriting his number with NULL.

WHY `updated_at` IS NOT STAMPED
    A defensible argument exists for stamping it — the row did change. It is deliberately NOT
    stamped, because Salman's scope says the price column and nothing else, and leaving it alone is
    what lets the fingerprint below prove that claim instead of asserting it: all 16 non-price
    columns must come back byte-identical, `updated_at` among them. A stamped column would have
    made that proof impossible.

WHAT ABSENCE MEANS AFTER THIS
    `price IS NULL` becomes the single source of truth for "this dish has no price" — the API
    already publishes it as JSON null (⑥-أ, shipped and verified live on
    alzabt.salmansaas.com/caracas/menu). ⑥-ج may then derive the daily-price behaviour from the
    absence itself instead of a hardcoded list of category names.
"""
import argparse
import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _db_target                        # noqa: E402

import psycopg2                          # noqa: E402

SLUG = 'caracas'
EXPECTED_ROWS = 18

# Measured 2026-10-03 under a sealed read-only session. SKUs are here for a human reader; the
# query keys on the ids.
TARGETS = [
    ('831f73df-1bd9-485e-b1f6-ffc0cbac5b17', 'CHICKEN-THIGHS-01'),
    ('8dd07632-7ab6-458b-8b00-3856312931d1', 'BONELESS-CHICKEN-THIGHS-01'),
    ('fdc7db83-e9b9-4cde-b67a-a7b86ae3a3fc', 'CHICKEN-WINGS-RAW-01'),
    ('94f21bb7-d4ce-4a01-8ef9-793eb5918716', 'CHICKEN-LIVER-RAW-01'),
    ('949a58e7-17c3-4620-81bc-5bbe2bef9a08', 'CHICKEN-BREASTS-WITH-BONE-01'),
    ('490da65d-9fb5-4a1f-98a1-1dcf54e3b2b9', 'BONELESS-CHICKEN-BREASTS-01'),
    ('5bad903a-4968-4e95-b2c1-255bf0545f9c', 'WHOLE-CHICKEN-01'),
    ('ca7c7974-c756-4185-b943-f2922c2b323d', 'CHICKEN-GIZZARDS-01'),
    ('453eb24e-3cbd-49dc-acdb-b0bdd318dfff', 'MARINATED-CHICKEN-THIGHS-01'),
    ('ecac5b8d-fed2-49d3-a7a4-7101bda042a0', 'MARINATED-ESCALOPE-01'),
    ('0e63a33f-a7bb-49e7-ad47-8c477d0c7dcf', 'MARINATED-CHICKEN-BURGER-01'),
    ('7111847c-9591-45d5-9605-4b60f8a2c73c', 'MARINATED-CHICKEN-WINGS-01'),
    ('b86f5ed3-80b6-431e-a90b-9112bd9c5b67', 'MARINATED-ZINGER-01'),
    ('78fce8f4-417a-49e2-af40-b6e525628a95', 'MARINATED-CHICKEN-SHAWARMA-01'),
    ('da2b43f0-46b1-46eb-be89-67e43483e7a3', 'MARINATED-TAWOOK-01'),
    ('a3dcc011-8163-4545-8649-c7c4ae5f4447', 'MARINATED-FAJITA-01'),
    ('e5584af5-7eff-4c43-8aad-9d8fd333bece', 'MARINATED-CRISPY-01'),
    ('f51df0f5-0d25-4783-b33c-164eed4b2121', 'CHICKEN-NUGGETS-01'),
]
IDS = [t[0] for t in TARGETS]
SKU_BY_ID = dict(TARGETS)

# Every column except `price`. A change in any of them is a bug, not a migration.
# `::uuid[]` on every ANY() is load-bearing, not decoration: catalog_items.id is a real uuid
# column and the ids here are Python strings, so Postgres refuses `uuid = text` outright — which
# is the good failure, a loud one on the first read rather than a silent zero-row match.
FINGERPRINT_COLS = ('id', 'client_id', 'category_id', 'name_ar', 'name_en', 'description_ar',
                    'description_en', 'image_url', 'currency', 'is_active', 'is_featured',
                    'sort_order', 'metadata', 'created_at', 'updated_at', 'sku')


def fingerprint(cur):
    """A stable hash per row over every column except price."""
    cur.execute("SELECT %s FROM catalog_items WHERE id = ANY(%%s::uuid[]) ORDER BY id"
                % ', '.join(FINGERPRINT_COLS), (IDS,))
    out = {}
    for row in cur.fetchall():
        blob = json.dumps([str(v) for v in row], ensure_ascii=False)
        out[row[0]] = hashlib.sha256(blob.encode()).hexdigest()[:16]
    return out


def baselines(cur):
    b = {}
    cur.execute("""SELECT count(*) FROM catalog_items i JOIN clients cl ON cl.id = i.client_id
                    WHERE cl.slug = %s AND i.price > 0""", (SLUG,))
    b['caracas_priced'] = cur.fetchone()[0]
    cur.execute("""SELECT count(*) FROM catalog_items i JOIN clients cl ON cl.id = i.client_id
                    WHERE cl.slug = %s AND i.price IS NULL""", (SLUG,))
    b['caracas_null'] = cur.fetchone()[0]
    cur.execute("""SELECT count(*) FROM catalog_items i JOIN clients cl ON cl.id = i.client_id
                    WHERE cl.slug <> %s AND i.price = 0""", (SLUG,))
    b['other_tenants_zero'] = cur.fetchone()[0]
    cur.execute("""SELECT count(*) FROM catalog_items i JOIN clients cl ON cl.id = i.client_id
                    WHERE cl.slug = 'arizona'""")
    b['arizona_items'] = cur.fetchone()[0]
    for t in ('store_order_items', 'store_orders', 'customers'):
        cur.execute('SELECT count(*) FROM %s' % t)
        b[t] = cur.fetchone()[0]
    return b


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--execute', action='store_true')
    args = ap.parse_args()
    url = _db_target.resolve(direct=True, quiet=True)

    ro = psycopg2.connect(url)
    ro.set_session(readonly=True)
    cur = ro.cursor()
    try:
        cur.execute("UPDATE catalog_items SET sort_order = sort_order WHERE false")
        print('🔴 SEAL FAILED — the read-only session accepted a write. Aborting.')
        return 1
    except psycopg2.Error:
        ro.rollback()
        print('seal     : write refused ✅')

    cur.execute("""SELECT i.id, i.sku, i.name_ar, c.name_ar, i.price, i.is_active, cl.slug
                     FROM catalog_items i
                     JOIN catalog_categories c ON c.id = i.category_id
                     JOIN clients cl ON cl.id = i.client_id
                    WHERE i.id = ANY(%s::uuid[]) ORDER BY c.name_ar, i.sku""", (IDS,))
    rows = cur.fetchall()
    before_fp = fingerprint(cur)
    before = baselines(cur)

    # Is the list COMPLETE — does any caracas row sit at 0 outside it?
    cur.execute("""SELECT i.id, i.sku FROM catalog_items i JOIN clients cl ON cl.id = i.client_id
                    WHERE cl.slug = %s AND i.price = 0 AND NOT (i.id = ANY(%s::uuid[]))""", (SLUG, IDS))
    stragglers = cur.fetchall()
    ro.close()

    print('targets  : %d ids declared · %d found' % (len(IDS), len(rows)))
    print('  %-38s %-30s %-22s %-7s %s' % ('id', 'sku', 'category', 'price', 'tenant'))
    for r in rows:
        print('  %-38s %-30s %-22s %-7s %s' % (r[0], r[1], r[3][:20], r[4], r[6]))
    print('baseline : %s' % ' · '.join('%s=%s' % kv for kv in before.items()))
    print('fingerprint: %d rows hashed over %d non-price columns'
          % (len(before_fp), len(FINGERPRINT_COLS)))

    # ── refusals ────────────────────────────────────────────────────────────────────
    if len(IDS) != EXPECTED_ROWS or len(set(IDS)) != EXPECTED_ROWS:
        print('\n🔴 the id list is not %d distinct ids. Refusing.' % EXPECTED_ROWS)
        return 1
    if len(rows) != EXPECTED_ROWS:
        print('\n🔴 %d of the declared ids exist, expected %d. Refusing — re-measure.'
              % (len(rows), EXPECTED_ROWS))
        return 1
    bad_tenant = [r[0] for r in rows if r[6] != SLUG]
    if bad_tenant:
        print('\n🔴 %d row(s) belong to another tenant: %s. Refusing.' % (len(bad_tenant), bad_tenant))
        return 1
    priced = [(r[1], r[4]) for r in rows if r[4] != 0]
    if priced:
        print('\n🔴 %d target row(s) no longer sit at 0: %s. Refusing — a real price is never '
              'overwritten.' % (len(priced), priced))
        return 1
    if stragglers:
        print('\n🔴 %d caracas row(s) sit at 0 OUTSIDE the declared list: %s. Refusing — the list '
              'is incomplete, and a partial migration leaves the lie half-told.'
              % (len(stragglers), [s[1] for s in stragglers]))
        return 1
    if before['caracas_null'] != 0:
        print('\n🔴 caracas already carries %d NULL prices, expected 0. Refusing — re-measure.'
              % before['caracas_null'])
        return 1

    if not args.execute:
        print('\nDRY RUN — nothing written. Re-run with --execute.')
        return 0

    # ── the write ───────────────────────────────────────────────────────────────────
    w = psycopg2.connect(url)
    try:
        with w:
            c = w.cursor()
            c.execute('SELECT count(*) FROM store_order_items')
            soi_inside = c.fetchone()[0]
            c.execute("""UPDATE catalog_items i SET price = NULL
                          FROM clients cl
                         WHERE cl.id = i.client_id AND cl.slug = %s
                           AND i.id = ANY(%s::uuid[]) AND i.price = 0""", (SLUG, IDS))
            # Captured IMMEDIATELY, because `cursor.rowcount` belongs to the LAST statement the
            # cursor ran. The first version of this script printed it after the store_order_items
            # SELECT below and reported «1 rows written» for a transaction that had correctly
            # written 18 — the guard was right, the sentence was wrong. A number read after
            # something else has overwritten it is not a measurement.
            written = c.rowcount
            if written != EXPECTED_ROWS:
                raise RuntimeError('expected %d rows, wrote %d — rolling back'
                                   % (EXPECTED_ROWS, written))
            c.execute('SELECT count(*) FROM store_order_items')
            if c.fetchone()[0] != soi_inside:
                raise RuntimeError('store_order_items moved inside the transaction — rolling back')
            print('\n✅ %d rows written' % written)
    finally:
        w.close()

    # ── read it back ────────────────────────────────────────────────────────────────
    v = psycopg2.connect(url)
    v.set_session(readonly=True)
    vc = v.cursor()
    vc.execute("SELECT id, sku, price FROM catalog_items WHERE id = ANY(%s::uuid[]) ORDER BY sku", (IDS,))
    after_rows = vc.fetchall()
    after_fp = fingerprint(vc)
    after = baselines(vc)
    v.close()

    nulls = [r for r in after_rows if r[2] is None]
    moved = {k: (before_fp[k], after_fp.get(k)) for k in before_fp if before_fp[k] != after_fp.get(k)}
    # `caracas_null` is the ONE baseline that is SUPPOSED to move (0 → 18). Comparing it as drift
    # printed a red flag over the very success the run was reporting, so it is asserted on its own
    # line instead of being folded in with the invariants.
    drift = {k: (before[k], after[k]) for k in before
             if k != 'caracas_null' and before[k] != after[k]}

    print('verified : price IS NULL on %d/%d rows' % (len(nulls), EXPECTED_ROWS))
    print('           non-price columns changed on %d rows %s'
          % (len(moved), '✅' if not moved else '🔴 %s' % moved))
    print('           caracas_null 0 → %d %s'
          % (after['caracas_null'], '✅' if after['caracas_null'] == EXPECTED_ROWS else '🔴'))
    print('           every other baseline: %s'
          % ('unchanged ✅' if not drift else '🔴 moved: %s' % drift))
    print('           caracas now: priced=%d · null=%d' % (after['caracas_priced'], after['caracas_null']))
    for r in after_rows:
        print('           %-30s price=%s' % (r[1], r[2]))

    ok = (len(nulls) == EXPECTED_ROWS and not moved
          and after['caracas_priced'] == before['caracas_priced']
          and after['caracas_null'] == EXPECTED_ROWS
          and after['other_tenants_zero'] == 0
          and all(after[t] == before[t] for t in ('store_order_items', 'store_orders', 'customers')))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
