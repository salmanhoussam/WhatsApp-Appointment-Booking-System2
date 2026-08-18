# Homepage Phase 2.3 — CTA variants + a real found-live bug — Evidence

Contract: `ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md`, Phase 2.3, CTA row (§1.1's
correction). Adds `variant: "banner"`/`"promo-strip"` to `CtaSection.jsx`, plus the same
`homepageTheme` opt-in as every other section.

## Real bug found live while wiring this (not the point of this pass, found along the way)

Mister H's `cta` section data used field names (`heading_ar`/`body_ar`/`cta_text_ar`) that
`CtaSection.jsx` has never read — it expects `text_ar`/`subtext_ar`/`button_ar`/`link`. Confirmed
live: the section rendered a real DOM structure (729 chars of HTML) but `innerText` was completely
empty — no heading, no text, no button, ever, since it went live. RK's own `cta` data already uses
the correct field names (`text_ar`, `link`), confirming this was a one-off seeding mistake specific
to Mister H, not a component bug affecting anyone else. Fixed via
`scripts/fix_cta_mrh.py` — remapped the existing real values (not fabricated) to the correct field
names, added a real `link` (`/mr-h/reserve`) which never existed before, and set `variant: "banner"`.

## What changed (code)

`frontend/src/components/dynamic-sections/CtaSection.jsx` — `variant` prop:
- `"banner"`: full solid-accent background (dark text/button, the deliberate full-bleed gold break
  named in the Design Spec §3.4).
- `"promo-strip"`: compact charcoal card, thin accent border, heading+button on one row — built and
  available, not applied to any real tenant yet (no second CTA instance requested).
- default (`"plain"`/absent): original tinted-gradient treatment, byte-identical for any tenant not
  using a variant (confirmed live on RK).
Same `homepageTheme` opt-in as every prior section.

## Live verification

| Check | Result |
|---|---|
| `mr-h` — before fix | `innerText: ""` — confirmed the bug was real, not assumed |
| `mr-h` — after fix | `innerText: "جاهز تحجز؟\n\nاختر الخدمة والوقت المناسب — التأكيد فوري.\n\nاحجز الآن"`, `background: rgb(217,164,65)` (`#D9A441`) — screenshot-confirmed: solid gold banner, near-black heading/button text |
| Button navigation | Clicked the real "احجز الآن" button — confirmed `window.location` moved to `/mr-h/reserve` |
| Console errors | 0 |
| `rk` | `innerText` and `background` (`linear-gradient(135deg, rgba(47,79,79,0.133)...)`) both confirmed byte-identical to before — RK's `cta` has no `variant` field, stays on the original plain treatment. 0 console errors |

## Data impact

Two real writes to Mister H's `cta` section only (field-name fix + `variant`). Zero writes to RK
or any other tenant.
