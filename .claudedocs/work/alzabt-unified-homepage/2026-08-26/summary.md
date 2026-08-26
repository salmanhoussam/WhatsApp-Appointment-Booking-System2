# Alzabt Unified Homepage — Contract Execution Evidence

Follows: `service-execution-constitution.md`, `investigation-protocol.md`. Executes
`.claude/plans/we-moved-on-new-hazy-barto.md` (Alzabt Homepage Implementation Contract, approved
by Salman with 3 amendments) literally — no scope drift beyond it.

## What was built

**File 1**: `frontend/src/pages/home/ProductShowcaseHome.jsx` — rewritten in place per the
Contract's Sections 2-6 (page structure, copy, assets, visual/responsive rules). 10 sections:
Nav → Hero (one composition: phone+laptop) → Capabilities (3 cards, non-sequential) → Master
Dashboard (reuses the same `DashboardControlCenterMockup` as the Hero's laptop) → Order→Dashboard
Ecosystem (phone "تم الدفع ✓" → `EcosystemConnector` → laptop "طلب جديد" toast) → Vertical
Showcase (4 illustrated demo scenes, explicit "بيئات تجريبية توضيحية — مش عملاء حقيقيين" caption)
→ How It Works → Trust → Closing CTA → Footer.

Every visual is a hand-built product-UI mockup (CSS, no `<img>`, no external image generation) —
light "screen" content (matching what the real app's actual light-mode UI looks like) framed in
dark device bezels (`LaptopFrame`/`PhoneFrame`, generalized from prior pages to accept
`children`), so each is a swappable, isolated component per the Contract's Definition of Done.

**File 2**: `frontend/src/App.jsx` — `/alzabt`'s marketing route (previously rendering
`AlzabtLandingPage`) now redirects to `/`; its now-unused lazy import removed.
`App.jsx:214-216`'s separate `demo.salmansaas.com/alzabt` → `alzabt-demo` tenant redirect was
**not touched** (confirmed by direct read before and after the edit).

**Untouched, on disk, not deleted** (Contract Section 1, step 4, and Salman's own amendment #2):
`frontend/src/pages/alzabt/AlzabtLandingPage.jsx`.

## Confirmed Findings

1. **Desktop real browser pass** (`/showcase`, dev-mode mount): 0 console errors. Direct DOM
   evaluate confirmed: `scrollWidth === clientWidth` (1519=1519, no overflow); `forbidden` array
   (`Smart Booking`/`Smart Menu`/`Smart Order`/`عملاؤنا`/`زبائننا`/`customers`) — **empty, 0
   matches**; `realScreenshots` filter for `dashboard.png`/`booking-page.png` in any `<img src>`
   — **empty**; `imgCount: 0` — confirms zero `<img>` elements exist anywhere on the page, i.e.
   the Contract's core rule (no real tenant screenshots as marketing assets) is structurally
   impossible to violate here, not just avoided by convention. All four target section strings
   (`كل شغلك`, `منصة وحدة. ثلاث قدرات`, `لمسة عند الزبون`, `بيئات تجريبية توضيحية`) present.
2. **CTA click test**: nav's "جرّب عالزبط" button clicked for real (not assumed) — navigated to
   `/showcase/demo-builder`, the real, working self-serve demo flow.
3. **Tablet (768×1024) and mobile (390×844→375 effective) real checks**: both `scrollWidth ===
   clientWidth`, 0 overflow. Visually reviewed both full-page screenshots — Hero stacks correctly,
   Vertical Showcase 4-card grid reflows 2×2 (tablet) then 1-column (mobile) via the existing
   `auto-fit, minmax()` pattern, no manual breakpoint needed, no overlap or clipping anywhere.
4. **`/alzabt` redirect test**: navigating to `http://localhost:5173/alzabt` resolved to
   `/showcase` with the new homepage's real headline present in the DOM — confirmed the full
   chain works (`/alzabt` → `/` → dev-mode's own pre-existing `/`→`/showcase` redirect, unrelated
   to this change) end-to-end, not just that the route registration compiles.
5. **0 console errors** across every step of every pass (desktop, tablet, mobile, CTA click,
   redirect test) — checked explicitly each time, not assumed carried-over from the first check.

## Side Findings

- None beyond what's already logged as Confirmed Finding 4's clarifying note (the redirect chain
  passing through dev-mode's own unrelated `/`→`/showcase` logic is expected behavior, not a bug —
  worth stating plainly since a naive read of "resolved to /showcase, not /alzabt" could look like
  a broken redirect if this context weren't known).

## Unknowns

- No explicit visual sign-off yet from Salman on this specific execution (built directly off his
  approved Contract, per his own explicit "no new study needed, let bo-hussein execute literally"
  instruction) — he still gets a real look before this is considered fully closed.
- Production-domain routing (`IS_SHOWCASE_DOMAIN` branch, real `demo.salmansaas.com`/bare-domain
  behavior) was not separately verified — only the dev-mode `/showcase` mount was tested via the
  local Vite server. The route registrations themselves were read directly and confirmed correct
  for both branches, but a live production-domain click-through wasn't performed in this pass
  (no such environment is reachable from here yet — Railway is still Salman's own pending step).

## Verification checklist (per the Contract's Section 7)

- [x] Desktop 1440-ish (actual viewport 1519): 0 console errors, screenshot, no overflow.
- [x] Tablet 768×1024: no overflow, screenshot, showcase grid reflow confirmed.
- [x] Mobile 390×844: no overflow, screenshot, phone mockup scaling confirmed.
- [x] Every CTA click tested for real navigation, 0 console errors after.
- [x] `/alzabt` redirect confirmed real (not just route-table read).
- [x] Forbidden-string text search — 0 matches.
- [x] No `<img>` pointing at real tenant screenshots — confirmed via `imgCount: 0` (stronger than
      the Contract's own literal ask, since no `<img>` exists at all, not just none pointing at
      the two named files).
- [x] Screenshots reviewed against the Definition of Done before writing this evidence file.
