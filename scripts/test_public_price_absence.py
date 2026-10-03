#!/usr/bin/env python3
"""
scripts/test_public_price_absence.py — the public restaurant API publishes absence as absence.

Salman, 2026-10-03, item ⑥-أ. Exercises the REAL `_fmt_item` / `_fmt_category` imported from
`app.api.v1.public.restaurant` — not a restatement of them.

🔴 WHY THE STUB RAISES INSTEAD OF ANSWERING
   A stub that returns None for every attribute is KINDER than a Prisma row, and this project has
   already shipped a bug because of exactly that (`.claudedocs/evolution/test-evidence-discipline
   .md`: a fake kinder than reality tests the fake). So `Row` is built from an explicit field list
   and its `__getattr__` RAISES for anything else: if the serializer starts reading a column the
   stub does not declare, this file fails loudly instead of silently producing None. P-0 proves
   that guard is live by asking for a field nobody declared.
"""
import ast
import json
import os
import sys
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.api.v1.public.restaurant import _fmt_category, _fmt_item   # noqa: E402

SRC = 'app/api/v1/public/restaurant.py'

ITEM_FIELDS = ('id', 'categoryId', 'nameAr', 'nameEn', 'descriptionAr', 'descriptionEn',
               'imageUrl', 'price', 'currency', 'isActive', 'sortOrder', 'metadata')
CAT_FIELDS = ('id', 'nameAr', 'nameEn', 'imageUrl', 'sortOrder', 'items')


class Row:
    """A stand-in for one Prisma row that refuses to invent a column."""

    def __init__(self, allowed, **kw):
        unknown = set(kw) - set(allowed)
        if unknown:
            raise AssertionError('test declared fields the row does not have: %s' % unknown)
        object.__setattr__(self, '_allowed', allowed)
        object.__setattr__(self, '_v', kw)

    def __getattr__(self, name):
        v = object.__getattribute__(self, '_v')
        if name in v:
            return v[name]
        raise AttributeError(
            'the serializer read `%s`, which this test never declared — the stub is NOT allowed '
            'to answer for a column it does not model. Add it to the field list on purpose.' % name)


def item(price, **kw):
    base = dict(id='i1', categoryId='c1', nameAr='صنف', nameEn='Item', descriptionAr=None,
                descriptionEn=None, imageUrl=None, price=price, currency='USD', isActive=True,
                sortOrder=1, metadata=None)
    base.update(kw)
    return Row(ITEM_FIELDS, **base)


def category(items, **kw):
    base = dict(id='c1', nameAr='قسم', nameEn='Cat', imageUrl=None, sortOrder=1, items=items)
    base.update(kw)
    return Row(CAT_FIELDS, **base)


src = open(SRC, encoding='utf-8').read()


def price_fallback(source):
    """The `orelse` of the conditional behind "price" in _fmt_item, read off the AST.

    🔴 NOT a grep. The first version of P-5 asserted `'else "0"' not in src` and FAILED — on the
    docstring I had just written to explain the change, which quotes the old expression verbatim.
    This project has paid for that exact trap before (`test_category_hide_symmetry.py` CH-1d/1e: a
    comment naming a removed call matches a grep for that call). A comment is prose; the code is
    the contract, so the contract is what gets parsed.
    """
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == '_fmt_item':
            for d in ast.walk(node):
                if isinstance(d, ast.Dict):
                    for k, v in zip(d.keys, d.values):
                        if isinstance(k, ast.Constant) and k.value == 'price':
                            return ast.unparse(v.orelse) if isinstance(v, ast.IfExp) else ast.unparse(v)
    return None


_p5_actual = price_fallback(src)
_p5_ok = _p5_actual == 'None'
_p5_control = price_fallback(
    'def _fmt_item(item):\n    return {"price": str(item.price) if item.price is not None else "0"}\n')

checks = []
checks.append(('P-5b CONTROL — the parser reads the OLD fallback as %r and would fail P-5'
               % _p5_control, _p5_control == "'0'"))

# ── P-0 — the control on the instrument ────────────────────────────────────────────
try:
    getattr(item(Decimal('1')), 'aColumnNobodyDeclared')
    stub_raises = False
except AttributeError:
    stub_raises = True
checks.append(('P-0 CONTROL — the stub REFUSES an undeclared column', stub_raises))

# ── the item contract ──────────────────────────────────────────────────────────────
priced = _fmt_item(item(Decimal('5.00')))
absent = _fmt_item(item(None))
zero = _fmt_item(item(Decimal('0')))

checks += [
    ('P-1 a real price is unchanged            5.00 → "5.00"', priced['price'] == '5.00'),
    ('P-2 an absent price is null, not "0"     None → None', absent['price'] is None),
    ('P-3 and it survives JSON as null',
     json.loads(json.dumps(absent))['price'] is None and '"price": null' in json.dumps(absent, indent=0)),
    ('P-4 a literal zero still serialises as a price ("0")', zero['price'] == '0'),
    ('P-5 the PARSED price expression falls back to None, not to a string', _p5_ok),
    ('P-6 nothing else about the item changed',
     priced['currency'] == 'USD' and priced['is_available'] is True and priced['id'] == 'i1'),
]

# ── the category contract ──────────────────────────────────────────────────────────
mixed = _fmt_category(category([item(Decimal('5.00'), id='a'), item(None, id='b'),
                                item(Decimal('0'), id='c')]), include_items=False)
all_absent = _fmt_category(category([item(None, id='a'), item(None, id='b')]), include_items=False)
not_loaded = _fmt_category(category(None), include_items=False)
empty = _fmt_category(category([]), include_items=False)

checks += [
    ('P-7 priced_item_count counts a price, and a zero IS one   [5, None, 0] → 2',
     mixed['priced_item_count'] == 2),
    ('P-8 a category whose items all lack a price → 0', all_absent['priced_item_count'] == 0),
    ('P-9 items not loaded → None, like item_count',
     not_loaded['priced_item_count'] is None and not_loaded['item_count'] is None),
    ('P-10 an EMPTY category reports 0/0 — which is why the UI predicate needs item_count > 0',
     empty['item_count'] == 0 and empty['priced_item_count'] == 0),
    ('P-11 item_count semantics untouched', mixed['item_count'] == 3),
    ('P-12 inactive items are still excluded',
     _fmt_category(category([item(Decimal('5.00'), id='a'),
                             item(Decimal('5.00'), id='b', isActive=False)]),
                   include_items=False)['item_count'] == 1),
]

# ── P-13 — the control on the assertion: the OLD code must fail P-2 ────────────────
old_behaviour = (lambda p: str(p) if p is not None else "0")(None)
checks.append(('P-13 CONTROL — the old expression returns "0" and fails P-2',
               old_behaviour == '0'))

print('module   : app.api.v1.public.restaurant (real import)')
print('source   : %s' % SRC)
print()
failed = 0
for label, ok in checks:
    print('  %s  %s' % ('✅' if ok else '🔴', label))
    failed += 0 if ok else 1
print()
print('%d/%d checks' % (len(checks) - failed, len(checks)))
sys.exit(1 if failed else 0)
