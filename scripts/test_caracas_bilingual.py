#!/usr/bin/env python3
"""
scripts/test_caracas_bilingual.py — the caracas menu actually reads the language it is given.

Salman, 2026-10-03, item ①. The platform's language machinery (AppLanguageProvider, mounted
app-wide since ADR-0006 Phase 1; `resolveTenantText`; the shared dictionary) was already real and
already read by eight live components. This page read `name_ar` directly at fourteen sites, so the
toggle had no effect here. These checks assert the wiring, not the appearance.

🔴 WHY THE SCOPE CHECK IS WRITTEN THE WAY IT IS
   The first version split the file on `\\n(?=function\\s+\\w+)` and printed "zero undeclared uses"
   — while never examining `MenuPage` at all, because that one is `export default function`. It
   reported a clean result for the most important function in the file by silently skipping it.
   That is this project's recurring failure (`.claudedocs/evolution/test-evidence-discipline.md`):
   a check that fails to look is indistinguishable from a check that looked and found nothing. So
   B-1 now PROVES it looked: `MenuPage` must appear in the set of functions examined, and the
   examined count is printed. B-2 is the control — a synthetic function that uses `lang` without
   declaring it must be caught.
"""
import io, re, subprocess, sys, tempfile, os

PAGE = 'frontend/src/pages/caracas/normal/MenuPage.jsx'
DICT = 'frontend/src/i18n/dictionary.js'
VARS = ('lang', 'toggleLang', 'isRtl')
SPLIT = r'\n(?=(?:export\s+default\s+)?function\s+\w+)'
NAME = r'(?:export\s+default\s+)?function\s+(\w+)'


def strip_comments(t):
    return re.sub(r'/\*.*?\*/', '', re.sub(r'//[^\n]*', '', t), flags=re.S)


def scope_offenders(src):
    """-> (offenders, names examined)"""
    offenders, names = [], []
    for part in re.split(SPLIT, src):
        m = re.match(NAME, part)
        if not m:
            continue
        names.append(m.group(1))
        body = strip_comments(part)
        declared = re.search(r'useAppLanguage\(\)', body) or re.search(r'\blang\s*=', body)
        for v in VARS:
            if re.search(r'\b%s\b' % v, body) and not declared:
                offenders.append((m.group(1), v))
    return offenders, names


src = io.open(PAGE, encoding='utf-8').read()
dic = io.open(DICT, encoding='utf-8').read()
offenders, names = scope_offenders(src)

checks = []

# ── B-1/B-2 — the scope check, and the proof that it looks ─────────────────────────
checks.append(('B-1 the scope check really examined MenuPage (%d functions: %s…)'
               % (len(names), ', '.join(names[:4])), 'MenuPage' in names))
checks.append(('B-2 and no function uses lang/toggleLang/isRtl undeclared%s'
               % ('' if not offenders else ' → %s' % offenders), not offenders))

planted = src + """
function PlantedOffender() {
  return <span>{lang}</span>;
}
"""
planted_offenders, planted_names = scope_offenders(planted)
checks.append(('B-3 CONTROL — a planted undeclared use IS caught',
               ('PlantedOffender', 'lang') in planted_offenders))

# ── B-4… — the wiring itself ───────────────────────────────────────────────────────
checks.append(('B-4 the page imports the mounted provider',
               "from '../../../context/AppLanguageContext'" in src))
checks.append(('B-5 and the shared resolver, not a local copy',
               "from '../../../i18n/resolveTenantText'" in src and 'resolveTenantText(rec, ' in src))
checks.append(('B-6 and the shared dictionary',
               "from '../../../i18n/dictionary'" in src))
checks.append(('B-7 the toggle is actually bound to a button',
               'onClick={toggleLang}' in src))
checks.append(('B-8 the page direction follows the language',
               "dir={isRtl ? 'rtl' : 'ltr'}" in src))

body = strip_comments(src)
# The `(?<!\$)` matters and is not defensive: the first version of this pattern counted
# `${item.name_ar}` INSIDE the owner's WhatsApp template literal, so B-9 demanded the removal of
# the exact line B-11 demands be kept — two checks of mine contradicting each other over one
# character. A JSX render is `{item.name_ar}`; an interpolation is `${item.name_ar}`.
RENDER = r'(?<!\$)\{\s*item\.name_ar\s*\}|(?<!\$)\{\s*cat\.name_ar\s*\}'
direct = re.findall(RENDER, body)
checks.append(('B-9 zero dish/category names rendered straight from name_ar%s'
               % ('' if not direct else ' → %d left' % len(direct)), not direct))
checks.append(('B-9b CONTROL — a planted JSX render of name_ar IS still caught',
               bool(re.findall(RENDER, body + '<h3>{item.name_ar}</h3>'))))

# The owner's two WhatsApp messages stay Arabic — the reader is Mahmoud, not the customer.
checks.append(('B-10 the order message still names dishes in Arabic (the owner reads it)',
               'i.name_ar || i.name_en' in body))
checks.append(('B-11 and the daily-price question too',
               'كم سعر اليوم لـ ${item.name_ar}' in body))

# A literal that is still Arabic-only in JSX text is a string with no English path.
jsx_text = re.findall(r'>\s*([^<>{}\n]*[ء-ي][^<>{}\n]*?)\s*<', body)
leftovers = [x.strip() for x in jsx_text if x.strip()]
checks.append(('B-12 no Arabic-only JSX text left%s'
               % ('' if not leftovers else ' → %s' % leftovers[:3]), not leftovers))

# ── B-13 — every t() key the page uses must exist in the dictionary ────────────────
used = sorted(set(re.findall(r"\bt\('([A-Za-z]+)'", body)))
missing = [k for k in used if not re.search(r"^\s+%s:\s*\{" % re.escape(k), dic, re.M)]
checks.append(('B-13 all %d dictionary keys the page asks for exist%s'
               % (len(used), '' if not missing else ' → MISSING %s' % missing), not missing))

# ── B-14 — the dictionary resolves both ways, run for real in node ────────────────
probe = ("import { t } from './%s';\n" % DICT +
         "const ks = %r;\n" % used +
         "const bad = ks.filter(k => { const a = t(k,'ar'), e = t(k,'en');"
         " return !a || !e || a === k || e === k || a === e; });\n"
         "console.log(JSON.stringify(bad));\n")
with tempfile.NamedTemporaryFile('w', suffix='.mjs', dir='.', delete=False, encoding='utf-8') as f:
    f.write(probe); tmp = f.name
try:
    r = subprocess.run(['node', tmp], capture_output=True, text=True)
finally:
    os.unlink(tmp)
if r.returncode != 0:
    raise SystemExit('🔴 node could not load the dictionary\n%s' % r.stderr.strip())
bad = r.stdout.strip()
checks.append(('B-14 each key returns a real, DIFFERENT string in ar and en%s'
               % ('' if bad == '[]' else ' → %s' % bad), bad == '[]'))

print('page       : %s' % PAGE)
print('dictionary : %s' % DICT)
print('keys used  : %d → %s' % (len(used), ', '.join(used)))
print()
failed = 0
for label, ok in checks:
    print('  %s  %s' % ('✅' if ok else '🔴', label))
    failed += 0 if ok else 1
print()
print('%d/%d checks' % (len(checks) - failed, len(checks)))
sys.exit(1 if failed else 0)
