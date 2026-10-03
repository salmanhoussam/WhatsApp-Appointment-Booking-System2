#!/usr/bin/env python3
"""
scripts/test_caracas_price_absence.py — the menu decides from the ABSENCE of a price, not a name.

Salman, 2026-10-03, items ⑥-ج and ⑥-د. The three rules under test:

    item      price == null            ⇒ «اسأل عن السعر» / «Ask for the price», and NO Add button
    category  item_count > 0 AND priced_item_count === 0   ⇒ it leaves the food rail
    and the hardcoded DAILY_PRICE_CATEGORIES list is gone

HOW THESE ARE EXERCISED
    `formatPrice`, `isDailyPriced` and the two `price == null` locks are EXTRACTED from the real
    MenuPage.jsx by brace/line matching and run in node — the file is JSX and cannot be imported,
    so the alternative would be a copy of the logic, which tests the copy
    (`.claudedocs/evolution/test-evidence-discipline.md`). Rename either function and this refuses
    to run instead of passing: D-0 proves the extractor fails loudly.

    `t()` is stubbed here because this file is about the PREDICATES, not the dictionary — that one
    is covered by test_caracas_bilingual.py, which checks every key against the real file. The
    stub returns the key itself, so an assertion can only pass by reaching the right branch.
"""
import io
import json
import os
import re
import subprocess
import sys
import tempfile

PAGE = 'frontend/src/pages/caracas/normal/MenuPage.jsx'


def extract_fn(name, src):
    m = re.search(r'^function\s+%s\s*\(' % re.escape(name), src, re.M)
    if not m:
        raise SystemExit('🔴 function %s() not found in %s — the check cannot run' % (name, PAGE))
    i = src.index('{', m.end() - 1)
    depth, j = 0, i
    while j < len(src):
        if src[j] == '{':
            depth += 1
        elif src[j] == '}':
            depth -= 1
            if depth == 0:
                return src[m.start():j + 1]
        j += 1
    raise SystemExit('🔴 unbalanced braces around %s()' % name)


def extract_const(name, src):
    m = re.search(r'^const\s+%s\s*=\s*(.+?);\s*$' % re.escape(name), src, re.M)
    if not m:
        raise SystemExit('🔴 const %s not found in %s — the check cannot run' % (name, PAGE))
    return 'const %s = %s;' % (name, m.group(1))


def run_node(body):
    with tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False, encoding='utf-8') as f:
        f.write(body)
        path = f.name
    try:
        p = subprocess.run(['node', path], capture_output=True, text=True)
        return p.returncode, p.stdout.strip(), p.stderr.strip()
    finally:
        os.unlink(path)


src = io.open(PAGE, encoding='utf-8').read()
format_price = extract_fn('formatPrice', src)
is_daily = extract_const('isDailyPriced', src)

checks = []

# ── D-0 — the extractor's own control ──────────────────────────────────────────────
try:
    extract_const('isDailyPricedXX', src)
    extractor_raises = False
except SystemExit:
    extractor_raises = True
checks.append(('D-0 CONTROL — the extractor refuses a name that is not there', extractor_raises))

probe = ("const t = (k) => k;\n" + format_price + '\n' + is_daily + '\n' + """
const out = {
  absent:        formatPrice(null, 'ar'),
  undef:         formatPrice(undefined, 'ar'),
  absent_en:     formatPrice(null, 'en'),
  priced_str:    formatPrice('4.5', 'ar'),
  priced_num:    formatPrice(6, 'ar'),
  literal_zero:  formatPrice(0, 'ar'),
  rubbish:       formatPrice('abc', 'ar'),

  daily:         isDailyPriced({ item_count: 10, priced_item_count: 0 }),
  all_priced:    isDailyPriced({ item_count: 25, priced_item_count: 25 }),
  mixed:         isDailyPriced({ item_count: 10, priced_item_count: 3 }),
  empty_cat:     isDailyPriced({ item_count: 0,  priced_item_count: 0 }),
  not_loaded:    isDailyPriced({ item_count: null, priced_item_count: null }),
  all_pill:      isDailyPriced({ id: '__all__', name_ar: 'الكل' }),
  no_field:      isDailyPriced({ item_count: 10 }),
  undefined_cat: isDailyPriced(undefined),
  named_like_the_old_list: isDailyPriced({ name_ar: 'متبلات(1كغ)', item_count: 10, priced_item_count: 10 }),
};
console.log(JSON.stringify(out));
""")
code, out, err = run_node(probe)
if code != 0:
    raise SystemExit('🔴 node refused the extracted source (exit %d)\n%s' % (code, err))
r = json.loads(out)

checks += [
    ('D-1 no price → the daily-price text          null → "dailyPrice"', r['absent'] == 'dailyPrice'),
    ('D-2 undefined behaves the same as null', r['undef'] == 'dailyPrice'),
    ('D-3 and in English too (same key, dictionary resolves it)', r['absent_en'] == 'dailyPrice'),
    ('D-4 a real price is formatted               "4.5" → "$4.50"', r['priced_str'] == '$4.50'),
    ('D-5 a numeric price works too               6 → "$6.00"', r['priced_num'] == '$6.00'),
    ('D-6 a LITERAL zero is a price, not absence  0 → "$0.00"', r['literal_zero'] == '$0.00'),
    ('D-7 a non-numeric value is treated as absent, not NaN', r['rubbish'] == 'dailyPrice'),

    ('D-8 items but none priced → daily          10/0 → true', r['daily'] is True),
    ('D-9 all priced → not daily                 25/25 → false', r['all_priced'] is False),
    ('D-10 mixed → not daily                     10/3 → false', r['mixed'] is False),
    ('D-11 an EMPTY category is NOT daily         0/0 → false', r['empty_cat'] is False),
    ('D-12 items not loaded → not daily (null)', r['not_loaded'] is False),
    ('D-13 the synthetic «الكل» pill → not daily', r['all_pill'] is False),
    ('D-14 a payload missing the field → not daily (never guessed)', r['no_field'] is False),
    ('D-15 undefined category → not daily, no throw', r['undefined_cat'] is False),
    ('D-16 CONTROL — a category NAMED like the old list but fully priced is NOT daily '
     '(the name no longer decides)', r['named_like_the_old_list'] is False),
]

# ── source-level assertions, parsed rather than grepped where it matters ───────────
body = re.sub(r'/\*.*?\*/', '', re.sub(r'//[^\n]*', '', src), flags=re.S)
checks += [
    ('D-17 ⑥-د — DAILY_PRICE_CATEGORIES is gone from the code',
     'DAILY_PRICE_CATEGORIES' not in body),
    ('D-18 and from the comments too (so a future grep is not fooled)',
     'DAILY_PRICE_CATEGORIES' not in src),
    ('D-19 the predicate reads priced_item_count, not a name',
     'priced_item_count' in body and 'name_ar' not in is_daily),
    ('D-20 AddButton refuses an unpriced item (lock 1)',
     'if (item.price == null) return null;' in body),
    ('D-21 the add handler refuses too (lock 2)',
     'if (item.price == null) return;' in body),
    ('D-22 and no `Number(item.price) || 0` survives in the add path',
     'Number(item.price) || 0' not in body),
]

print('page   : %s' % PAGE)
print('extracted: formatPrice (%d chars) · isDailyPriced (%d chars)'
      % (len(format_price), len(is_daily)))
print()
failed = 0
for label, ok in checks:
    print('  %s  %s' % ('✅' if ok else '🔴', label))
    failed += 0 if ok else 1
print()
print('%d/%d checks' % (len(checks) - failed, len(checks)))
sys.exit(1 if failed else 0)
