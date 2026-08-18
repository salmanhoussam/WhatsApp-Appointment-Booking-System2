# Homepage Phase 2.3 — Footer (new, site-wide) — Evidence

Contract: `ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md`, Phase 2.3, Footer row. Per
`ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md` §3 — not a `content.sections[]` entry, rendered
once by `DynamicPage.jsx` outside the sections loop, sourced entirely from real `Client` fields.

## Real finding: the Expansion Proposal's own "gap" claim was stale

That proposal (written earlier the same day) said `instagram_url` "would need one small additive
DB field, not fabricated." Checked the real schema before building anything: `instagram_url`
already exists as a real `Client` column (`prisma/schema.prisma`, `@map("instagram_url")`), same as
`whatsapp_number`/`maps_url`. **No migration needed** — the actual gap was just that no tenant had
a value set yet, not a missing column. Corrected in the Contract rather than silently building an
unnecessary migration.

## Real bug found and fixed while building this

`lucide-react` (this project's installed version, `^1.8.0`) has **no brand/logo icons at all** —
confirmed via a real directory listing of `node_modules/lucide-react/dist/esm/icons/` (3886 icons,
zero matching Facebook/Twitter/LinkedIn/YouTube/TikTok/Instagram). The first pass imported
`Instagram` from `lucide-react`, which doesn't exist in this version — confirmed live via a real
console error (`does not provide an export named 'Instagram'`) before shipping anything further.
Fixed by using `AtSign` (a real, existing icon) next to the "انستغرام" text label instead — reads
correctly without an official Instagram logo, and avoids inventing an icon that doesn't exist.

## What changed

- `frontend/src/components/Footer.jsx` (new) — 4-column responsive grid: Brand (name + Instagram
  link if set), Quick Links (scroll-to-section anchors + a real `/reserve` link), Contact (a real
  `wa.me/{whatsapp_number}` link), Hours (from `Client.config.working_hours`). Every field
  conditionally rendered only when the real data exists — no fabricated placeholder content.
- `frontend/src/pages/generic/normal/DynamicPage.jsx` — mounts `<Footer>` once, after the sections
  loop, for every tenant (not gated behind `homepageTheme` — Footer's mere existence is a new
  structural addition every tenant benefits from equally; its colors still respect
  `homepageTheme` the same way every other component does).
- `scripts/set_mrh_social_contact.py` (one-off) — set Mister H's real `instagram_url`
  (`https://instagram.com/mr.salon.h`, the real handle extracted from the Instagram screenshot
  earlier this session) and `whatsapp_number` (`96171455767`, the real phone `71455767` already
  used in `LocationSection`'s content, formatted to match RK's own real international-digits
  convention).

## Live verification

| Check | Result |
|---|---|
| `mr-h` footer | Full real content: "صالون مستر إتش", "انستغرام" link, quick links, `+96171455767` (real `wa.me` link), `09:00 — 20:00` hours, copyright — screenshot-confirmed. Black+gold themed (`homepageTokens`) |
| `rk` footer | Full real content: "RK Barber Shop", quick links, `+96176985477`, `09:00 — 21:00`, copyright — **no Instagram link** (RK's `instagram_url` is null, correctly omitted, not fabricated). Link color confirmed `rgb(47,79,79)` = RK's own real `#2F4F4F` accent, not gold |
| Console errors | 0 on both, after the `AtSign` fix (was 1 real error before the fix, confirmed and resolved) |

## Data impact

Two real field writes to Mister H only (`instagram_url`, `whatsapp_number`). RK and every other
tenant: zero data writes — Footer reads their existing real fields only.
