#!/usr/bin/env python3
"""
scripts/test_caracas_money_format.py — the WhatsApp message carries cents only when there ARE cents.

Salman, 2026-10-03: «برسالة الواتس أب الرقم التوتال ما يكون فيه فاصلة، إذا مش ضروري … إذا بس 12
دولار ما تحط 12.00، بس 12».

WHY THIS READS THE REAL FILE INSTEAD OF RESTATING THE FUNCTION
--------------------------------------------------------------
A check that carries its own copy of `money()` tests the copy. This project has paid for that
mistake enough times to have a rule about it (`.claudedocs/evolution/test-evidence-discipline.md`,
22 instances): the instrument has to touch the shipped code. So the two functions are EXTRACTED
from `MenuPage.jsx` by brace matching and executed in node. Rename or delete either one and this
file stops running rather than passing.

And M-9 is the control on the control: the OLD implementation (`toFixed(2)`) is pushed through the
same assertion, and the run FAILS unless that old code actually fails M-1. A green suite that would
also be green against the bug has measured nothing.
"""
import io, json, re, subprocess, sys, tempfile, os

SRC = 'frontend/src/pages/caracas/normal/MenuPage.jsx'


def extract(name, src):
    """Return the full source of `function <name>(...) {...}` by matching braces."""
    m = re.search(r'^function\s+%s\s*\(' % re.escape(name), src, re.M)
    if not m:
        raise SystemExit('🔴 %s() not found in %s — the check cannot run' % (name, SRC))
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


def run_node(body):
    with tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False, encoding='utf-8') as f:
        f.write(body)
        path = f.name
    try:
        p = subprocess.run(['node', path], capture_output=True, text=True)
        return p.returncode, p.stdout.strip(), p.stderr.strip()
    finally:
        os.unlink(path)


src = io.open(SRC, encoding='utf-8').read()
money_src = extract('money', src)
msg_src = extract('buildWaMessage', src)

print('source      : %s' % SRC)
print('extracted   : money() %d chars · buildWaMessage() %d chars' % (len(money_src), len(msg_src)))

# ── M-7/M-8 — assertions about the shipped source itself, not its output ─────────────
checks = []
checks.append(('M-7 buildWaMessage reads the total through money()', 'money(total)' in msg_src))
checks.append(('M-8 and no toFixed survives inside it', 'toFixed' not in msg_src))

CART = [
    {"quantity": 2, "name_ar": "برغر لحم", "price": 6},
    {"quantity": 1, "name_ar": "كوشينيا", "price": 0},
]

probe = money_src + '\n' + msg_src + '\n' + """
const out = {
  whole:        money(12),
  cents:        money(12.5),
  cents_exact:  money(12.50),
  zero:         money(0),
  float_trap:   money(8.1 * 3),
  rounds_up:    money(12.999),
  sub_dollar:   money(0.5),
  message:      buildWaMessage(%s, 12),
  message_cents: buildWaMessage(%s, 12.5),
};
console.log(JSON.stringify(out));
""" % (json.dumps(CART, ensure_ascii=False), json.dumps(CART, ensure_ascii=False))

code, out, err = run_node(probe)
if code != 0:
    raise SystemExit('🔴 node refused the extracted source (exit %d)\n%s' % (code, err))
r = json.loads(out)

checks += [
    ('M-1 a whole price loses the cents       12    → "12"',      r['whole'] == '12'),
    ('M-2 a real fifty cents keeps them      12.5  → "12.50"',    r['cents'] == '12.50'),
    ('M-3 12.50 written as 12.50 is the same',                     r['cents_exact'] == '12.50'),
    ('M-4 zero is "0", never "0.00"',                              r['zero'] == '0'),
    ('M-5 float trap  8.1*3 = 24.2999…       → "24.30"',          r['float_trap'] == '24.30'),
    ('M-6 rounding must not re-create .00    12.999 → "13"',      r['rounds_up'] == '13'),
    ('M-6b under a dollar                    0.5   → "0.50"',     r['sub_dollar'] == '0.50'),
    ('M-10 message total reads $12',          '💰 المجموع: $12' in r['message']),
    ('M-11 and never $12.00',                 '$12.00' not in r['message']),
    ('M-12 a priced line reads $12',          '2x برغر لحم — $12' in r['message']),
    ('M-13 a zero line still reads السعر يومي', 'كوشينيا — السعر يومي' in r['message']),
    ('M-14 a total with cents keeps them',    '💰 المجموع: $12.50' in r['message_cents']),
]

# ── M-9 — the control on the control: the OLD code must FAIL M-1 ────────────────────
old_impl = 'function money(value) { return (Number(value) || 0).toFixed(2); }\n'
code, out, err = run_node(old_impl + 'console.log(money(12));')
old_whole = out if code == 0 else None
checks.append(('M-9 CONTROL — the old toFixed(2) prints "%s" and fails M-1' % old_whole,
               old_whole == '12.00'))

print()
failed = 0
for label, ok in checks:
    print('  %s  %s' % ('✅' if ok else '🔴', label))
    failed += 0 if ok else 1

print()
print('%d/%d checks' % (len(checks) - failed, len(checks)))
sys.exit(1 if failed else 0)
