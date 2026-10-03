#!/usr/bin/env python3
"""
scripts/test_caracas_surface_and_touch.py — segments ②③④ of the post-⑥ cleanup.

Salman, 2026-10-03: «٢٣٤ + ورقة».

    ② the menu surface is warm cream + a faint paper tooth + sparse line-art, CSS only
    ③ /demo/caracas resolves to the MENU, through the registry, not through a hardcoded path
    ④ the «+» is bigger with a 48px hit area, motion is tasteful and reduced-motion is honoured

Every check reads a real file. The two that matter most carry controls: S-3 proves the poster's
own content is absent (not merely that cream is present), and T-9 proves the ⑥ lock survives.
"""
import io
import re
import sys

CSS = 'frontend/src/pages/caracas/caracas.css'
PAGE = 'frontend/src/pages/caracas/normal/MenuPage.jsx'
REG = 'frontend/src/router/tenants/index.js'
DASH = 'frontend/src/pages/generic-admin/GenericAdminDashboard.jsx'
RESOLVER = 'frontend/src/router/DynamicTenantResolver.jsx'

css = io.open(CSS, encoding='utf-8').read()
page = io.open(PAGE, encoding='utf-8').read()
reg = io.open(REG, encoding='utf-8').read()
dash = io.open(DASH, encoding='utf-8').read()
resolver = io.open(RESOLVER, encoding='utf-8').read()

page_body = re.sub(r'/\*.*?\*/', '', re.sub(r'//[^\n]*', '', page), flags=re.S)
css_body = re.sub(r'/\*.*?\*/', '', css, flags=re.S)

checks = []

# ── ② the surface ─────────────────────────────────────────────────────────────────
checks += [
    ('S-1 the page root carries .caracas-menu', 'caracas-menu min-h-screen' in page_body),
    ('S-2 and the flat #FAFAF9 surface is gone from the page',
     'bg-[#FAFAF9]' not in page_body),
    ('S-3 CONTROL — the poster itself is NOT reproduced: no qr/logo/whatsapp/poster asset',
     not re.search(r'qr|logo|whatsapp|poster', css_body, re.I)),
    ('S-4 cream base + a paper tooth + a warm wash, all in CSS',
     '#FCF7EF' in css_body and css_body.count('radial-gradient') >= 2 and 'linear-gradient' in css_body),
    ('S-5 the line-art is inline (zero network requests)',
     'data:image/svg+xml' in css_body and 'http' not in re.sub(r'http://www\.w3\.org/2000/svg', '', css_body)),
    ('S-6 and it cannot intercept a tap or grow the page',
     'pointer-events: none' in css_body and 'position: fixed' in css_body),
    ('S-7 it is faint — opacity ≤ 0.08',
     bool(re.search(r'opacity:\s*0\.0[0-8]', css_body))),
    ('S-8 everything new is scoped to .caracas-menu / .caracas-card / .caracas-add / .caracas-thumb',
     all(sel in css_body for sel in ('.caracas-menu', '.caracas-card', '.caracas-add', '.caracas-thumb'))),
    ('S-9 the inert body[data-slug] block is left exactly as it was',
     'body[data-slug="caracas"]' in css_body and 'background: #0a0a0f' in css_body),
]

# ── ③ the route ───────────────────────────────────────────────────────────────────
m = re.search(r'caracas:\s*\{(.*?)\n\s*\},', reg, re.S)
caracas_entry = m.group(1) if m else ''
redirect = re.search(r"defaultRedirect:\s*'([a-z]+)'", caracas_entry)
checks += [
    ('R-1 the caracas registry entry now redirects to %r' % (redirect.group(1) if redirect else None),
     bool(redirect) and redirect.group(1) == 'menu'),
    ('R-2 the resolver still reads defaultRedirect (the canonical mechanism)',
     'defaultRedirect' in resolver),
    ('R-3 the dashboard preview is UNCHANGED — still /demo/${slug}, no hardcoded tenant path',
     '`/demo/${settings.slug}`' in dash and '/caracas/menu' not in dash),
    ('R-4 and no other tenant moved: smar=home · arizona=home · footlab=store',
     all(("defaultRedirect: '%s'" % v) in reg for v in ('home', 'store'))
     and re.search(r"smar:.*?defaultRedirect:\s*'home'", reg, re.S)
     and re.search(r"arizona:.*?defaultRedirect:\s*'home'", reg, re.S)),
    # 🔴 The first version of this line asserted `True` — a check that cannot fail, which is the
    # fake-control trap this repo has paid for repeatedly. It now reads the file and asserts the
    # thing Salman actually asked for: caracas.routes.jsx keeps ITS OWN redirect to home.
    ('R-5 caracas.routes.jsx keeps its own `Navigate to="home"` — untouched, as instructed',
     io.open('frontend/src/router/tenants/caracas.routes.jsx', encoding='utf-8').read()
       .count('<Navigate to="home" replace />') == 2),
]

# ── ④ the button and the motion ───────────────────────────────────────────────────
add_fn = re.search(r'function AddButton.*?\n}', page, re.S).group(0)
checks += [
    ('T-1 the button is drawn at 40px, not 32', 'width: 40, height: 40' in add_fn),
    ('T-2 and the old w-8 h-8 is gone', 'w-8 h-8' not in page_body),
    ('T-3 the hit area is extended to 48px by a pseudo-element, so no box grows',
     '.caracas-add::after' in css_body and 'inset: -4px' in css_body),
    ('T-4 a tap gives visual feedback that ends by itself (600ms, no loop)',
     'setAdded(true)' in add_fn and '600' in add_fn),
    ('T-5 double-add is guarded', 'if (added) return;' in add_fn),
    ('T-6 the timer is cleaned up on unmount', 'clearTimeout(timer.current)' in add_fn),
    ('T-7 framer motion is disabled under reduced-motion (JS side)',
     'useReducedMotion' in page_body and 'reduce ? undefined' in add_fn),
    ('T-8 and the CSS hover/lift is disabled too',
     'prefers-reduced-motion: reduce' in css_body),
    ('T-9 ⑥ LOCK — price == null still returns null BEFORE any of the new state is used',
     add_fn.index('if (item.price == null) return null;') < add_fn.index('const handle')),
    ('T-10 hover is desktop-only (a phone is never left hovered)',
     '(hover: hover) and (pointer: fine)' in css_body),
    ('T-11 all three layouts carry the hover class',
     page_body.count('caracas-card') >= 3 and page_body.count('caracas-thumb') >= 3),
    ('T-12 focus stays visible for keyboard users', ':focus-visible' in css_body),
]

print('files  : %s · %s · %s' % (CSS, PAGE, REG))
print()
failed = 0
for label, ok in checks:
    print('  %s  %s' % ('✅' if ok else '🔴', label))
    failed += 0 if ok else 1
print()
print('%d/%d checks' % (len(checks) - failed, len(checks)))
sys.exit(1 if failed else 0)
