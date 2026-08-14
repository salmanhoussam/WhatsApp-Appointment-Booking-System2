# Alzabt Tenant Website System — Work Sequencing Proposal

**Status:** Planning round output. Turns the 4 architecture documents (`ALZABT_TEMPLATE_
REPERTOIRE_MECHANISM.md`, `ALZABT_TEMPLATE_REPERTOIRE_PROPOSAL.md`,
`ALZABT_VERTICAL_REPERTOIRE_MATRIX.md`, `ALZABT_SECTION_SYSTEM_CONTRACT.md`) into a practical P0→P3
sequence. **No code, no DB, no tenant data touched.** Every claim below was re-checked against real
code just now, not carried forward from memory. Stop after this document — implementation starts
only after Salman's explicit approval.

**Goal restated, per instruction**: not a redesign of Alzabt — an improvement to the *existing*
tenant website system so it produces genuinely good, vertical-appropriate sites, without becoming
a website builder.

---

## P0 — Existing structural fixes

### P0.1 — `featured_items` calls the wrong catalog endpoint (highest-impact item in this whole proposal)

| | |
|---|---|
| **Why it matters** | `featured_items` (Services) is **Required in all three verticals** — the one section every Matrix independently agreed is load-bearing. Confirmed right now, at the code level: it's broken for any tenant that doesn't separately activate `catalog`/`store`. |
| **Evidence** | `FeaturedItemsSection.jsx:10` imports `fetchAllCategories`/`fetchItems` from `services/catalogApi.js` — the old retail `CatalogItem` service, whose real backend route (`app/api/v1/public/__init__.py:227`, `/{slug}/catalog/categories`) is gated behind `require_service("catalog")` (confirmed: `app/api/v1/public/__init__.py`, `Depends(require_service("catalog"))`). A completely separate, already-working, reservations-native route exists: `app/api/v1/public/reservations.py:151`, `GET /catalog-services`, gated behind `reservations` — the service key every Reservations tenant actually has. Today's real browser audit confirmed the failure mode directly: `ali`'s public `/ali/home` page shows "6 خدمات" in its stat line while the Services section renders completely empty, with a real `403 Forbidden` in the console. |
| **Files/components eventually affected** | `frontend/src/components/dynamic-sections/FeaturedItemsSection.jsx` (swap its data source to the reservations-native endpoint, same one `useServices()`/`ReservePage.jsx` already use successfully) |
| **Dependencies** | None |
| **Risk of doing it now** | Low. This is a wrong-endpoint bug, not a design decision — no ambiguity, no visual-system judgment involved. Real risk is scoping it correctly: for a tenant that genuinely IS retail (store/restaurant), `featured_items` may need to keep working against the old catalog service — so the fix should branch by the tenant's real active capability, not blindly repoint every tenant. |
| **What NOT to do** | Don't touch `featured_items`'s visual layout/cards while fixing this (that's P2). Don't touch the `catalog`/`store` service-gating logic itself — the gate is correct, the section is calling the wrong route. |

### P0.2 — `hours` re-authors free text instead of reading real `working_hours`

| | |
|---|---|
| **Why it matters** | RK — a real, live production tenant — shows literal "قريباً" in its Hours section, despite the booking engine already having real, structured `working_hours` data (confirmed: `ReservationsTab.jsx` already reads `config?.config?.working_hours` for the admin calendar's own hour range). The public Hours section duplicates this as separate, never-filled free text instead of reading the same real source. |
| **Evidence** | `ALZABT_SECTION_SYSTEM_CONTRACT.md`'s own `hours` entry; today's real browser audit of RK's live page. |
| **Files/components eventually affected** | `frontend/src/components/dynamic-sections/HoursSection.jsx` (read `Client.config.working_hours` directly instead of/alongside `data.rows[]`); confirm `GET /public/{slug}/config` already returns this field (it does — same field the admin dashboard reads) |
| **Dependencies** | None — purely a frontend data-source change, no backend change needed |
| **Risk of doing it now** | Low. Main risk: a tenant with no real `working_hours` configured either (e.g. some Demo Builder tenants) needs a real, honest empty state — not a fabricated schedule. |
| **What NOT to do** | Don't restyle the Hours section while fixing this (P2's job). Don't remove the `data.rows[]` override entirely if a tenant genuinely wants custom display text (e.g. "By appointment only") — real `working_hours` should be the default, not force every tenant into one rigid format. |

### P0.3 — `staff`/`team` data source: resolved now, as requested

**Recommendation, explicit and final for this proposal: `staff` reads real `Barber` data, never
author-defined text.** Same reasoning `featured_items` already establishes as precedent (P0.1
aside — the *pattern* of reading real Layer-0 data is proven, only its wiring is currently
broken): a staff section listing people who aren't real, bookable staff would be actively
misleading, not just incomplete. `GET /reservations/barbers` is already real, already public,
already proven working (it's what `ReservePage.jsx`'s staff picker already uses). This decision
has no separate P0 file-level action — it's consumed directly by P1.1's build.

### P0.4 — Investigate (not yet fix) RK's large section-spacing gaps

| | |
|---|---|
| **Why it matters** | Real, visually confirmed in today's audit (huge unstyled vertical gaps between sections on RK's live page) — very likely a large contributor to the original "feels 90% blank" complaint. Not yet root-caused. |
| **Evidence** | Today's browser audit screenshots (`rk-home-desktop.png`, `rk-home-desktop-bottom.png`). |
| **Files/components eventually affected** | Unknown until investigated — candidates: `DynamicPage.jsx`'s section-wrapper composition, or individual sections not collapsing when their real content is minimal (e.g. Hours showing one line of text but reserving a full section's worth of vertical space) |
| **Dependencies** | None to investigate; the fix (if a discrete bug is found) may depend on P0.2 first, since a populated Hours section might shrink the gap on its own without any CSS change at all |
| **Risk of doing it now** | The *investigation* is free and low-risk. Declared explicitly as investigate-only here: if a real, isolated bug is found (e.g. a hardcoded `min-height`), it's a legitimate small P0 fix; if it turns out to be "there is no spacing system at all," that's not a bug, it graduates into P2 rather than being forced into a rushed P0 patch. |
| **What NOT to do** | Don't build a full spacing-token system as part of "investigating" — that's P2's scope, this step is diagnostic only. |

---

## P1 — Missing shared capabilities

### P1.1 — `staff`/`team` section (new)

| | |
|---|---|
| **Why it matters** | Recommended in all three Matrix verticals; the single clearest cross-vertical finding from the whole exercise (Barber's "Staff," Clinic's "Doctors," Beauty's "Artists" are one capability, not three). Blocks nothing else directly, but is real, load-bearing content for Beauty specifically (Matrix: Recommended, but the vertical most personality/artist-driven). |
| **Evidence** | `ALZABT_VERTICAL_REPERTOIRE_MATRIX.md` Cross-Vertical Observation #2; `ALZABT_SECTION_SYSTEM_CONTRACT.md`'s `staff` entry; P0.3's resolved data-source decision above. |
| **Files/components eventually affected** | New `frontend/src/components/dynamic-sections/StaffSection.jsx`; one new entry in `DynamicPage.jsx`'s `SECTION_MAP`; reuses the already-real, already-public `GET /reservations/barbers` endpoint — no new backend route needed |
| **Dependencies** | P0.3 (resolved, no blocker) |
| **Risk of doing it now** | Low-medium. Real risk is scope creep — keep v1 to name + photo + role, resist "let tenants write custom bios / individual staff pages" until a real vertical asks for it (same Abstraction Rule discipline the whole exercise has applied everywhere else). |
| **What NOT to do** | Don't build individual staff detail/profile pages. Don't let a tenant type in staff names disconnected from real `Barber` rows — that reintroduces the exact "misleading content" risk this decision exists to avoid. |

### P1.2 — `credentials` section (new)

| | |
|---|---|
| **Why it matters** | Clinic's **Required**, unique trust-carrying section (nothing else in the current library substitutes for it — Clinic deliberately excludes `gallery`, per the Matrix). Without this, a real Clinic reference tenant cannot be built at all — this directly gates P3's Clinic phase. |
| **Evidence** | `ALZABT_VERTICAL_REPERTOIRE_MATRIX.md`'s Clinic row; `ALZABT_SECTION_SYSTEM_CONTRACT.md`'s `credentials` entry. |
| **Files/components eventually affected** | New `frontend/src/components/dynamic-sections/CredentialsSection.jsx`; one new `SECTION_MAP` entry; purely author-defined content, no live-data dependency, no backend change |
| **Dependencies** | None |
| **Risk of doing it now** | Low — smaller and simpler than `staff` (no data-source ambiguity, self-contained). |
| **What NOT to do** | Don't build verification/trust-score gamification (badges, scoring) — a clean, credible list is the actual Contract spec; don't build this generically for "any future vertical" beyond Clinic speculatively. |

---

## P2 — Existing section visual quality

Per instruction, this phase is about **reusable, Layer-1-wide improvements**, not per-tenant
cosmetic fixes. Ranked by real evidence, not by guessing which sections "feel" weakest.

| Axis | Where the real evidence points | Why this scope, not a full redesign |
|---|---|---|
| **Empty states** | `hours`, `location` — both showed bare "قريباً" placeholder text sitting inside a full section's worth of chrome/whitespace on RK's real, live page. Likely the single most evidenced, most fixable contributor to "feels blank." | A real empty state (either collapse the section entirely when there's no real data, or a small, honest "info coming soon" treatment) is a contained, Layer-1-wide fix — one pattern applied to every section, not per-tenant patching. |
| **Spacing rhythm** | The same RK evidence as P0.4 — pending that investigation's outcome. If P0.4 finds no discrete bug, this becomes the real fix: a defined vertical-rhythm scale applied at the section-composition level (`DynamicPage.jsx`), not 10 separate per-section margin tweaks. | Systemic, one-time investment; every section and every future vertical inherits it automatically — the same "Layer 1, built once" logic the whole mechanism is built on. |
| **Typography hierarchy** | Not independently audited yet (no dedicated typography pass was run this session) — named here because it's the natural sibling fix to spacing, likely solvable by confirming whether `dynamic-sections/*.jsx` actually draws from `frontend/src/theme.js`'s existing `FONT`/token system, or has drifted into ad-hoc per-section values (unconfirmed, flagged as a real open question in the Section System Contract). | If it already draws from `theme.js`, this line item may already be mostly solved — worth confirming before assuming new work is needed. |
| **Imagery treatment** | `hero`, `gallery` (Required for Beauty, Recommended for Barber) — Round 1's own audit found photography is the single most visible differentiator between "feels real" (RK) and "feels like a demo" (Ali, zero images anywhere). | Consistent aspect ratio, real-photo-vs-fallback handling, and graceful degradation when a tenant hasn't uploaded photos yet — directly serves the vertical(s) where Gallery is Required/Recommended. |
| **Cards / information density** | `featured_items` (once P0.1's data bug is fixed, worth a real layout pass too — Round 3's proposal already named "name + price + duration always visible" as the bar) | Contained to card-level styling, not full section redesign. |
| **CTA treatment** | `cta` — Contract already establishes its *placement* is a real per-vertical decision (Layer 2), but its *visual execution* (prominence, spacing) is a Layer-1 concern | Small, contained — button/section styling, not new mechanics. |
| **Mobile behavior** | Genuinely the least urgent item on this list today — this session's real audits found **zero horizontal overflow anywhere**, across RK/Ali/`alzabt-demo`, desktop and mobile. Worth a dedicated pass once the sections above are actually touched (so it's verified against the *updated* components, not the current ones), not as a standalone first step. | Avoids double-verification work — fold into each section's own P2 pass rather than a separate sweep. |

**Sequencing within P2**: empty states and spacing first (both Layer-1-wide, both directly
evidenced, both likely share a root investigation from P0.4) — then imagery/density/CTA as
targeted per-section passes on the sections the Matrix actually weights heavily
(`hero`, `gallery`, `featured_items`, `cta` — Required/Recommended across the board), not all 10
sections uniformly regardless of real usage.

**What NOT to do (per instruction, restated for this phase specifically):** no tenant-by-tenant
restyling of RK/Ali/`alzabt-demo`'s actual live content as part of P2 — P2 changes shared component
code; applying the result to a real tenant is a separate, later, explicitly-approved step (same
"never touch tenant data without sign-off" discipline this whole session has held throughout).

---

## P3 — Vertical repertoires

Only after P0 + P1 land, and at minimum P2's empty-state/spacing items — building vertical
templates on top of a still-broken Services section or still-blank Hours/Location boxes would
just reproduce today's exact complaint with new labels.

| Vertical | Real dependency status | What it needs from P0-P2 before it can start for real |
|---|---|---|
| **Barber** | Least blocked — RK already proves the mechanism works with real content once populated | P0.1 (Services), P0.2 (Hours), P2's empty-state/spacing work. `staff` (P1.1) is Recommended, not blocking, but should land first for a genuinely complete reference |
| **Clinic** | Fully blocked | P1.2 (`credentials`, Required) does not exist yet — cannot build a real Clinic reference without it |
| **Beauty / Makeup** | Blocked on quality, not existence | `gallery` is Required (not just Recommended) for this vertical specifically — the P2 imagery-treatment pass matters most here; `staff` (P1.1) also Recommended |

**Work here is curation, not construction** — per Round 2's own finding, the mechanism
(`Client.config.content` → `seed_page_content.py` → `DynamicPage.jsx`) already exists and works;
P3 is authoring `scripts/data/page_templates/{vertical}.json` files using the ratified Matrix
directly, the same way `restaurant.json`/`store.json`/`booking.json` already exist — no new
system, per Round 2's mechanism proposal.

**Not decided here, a real business-priority call, not architecture**: whether Clinic or Beauty
comes second, after Barber. Left open deliberately rather than guessed at.

**What NOT to do**: don't rebuild RK's or Ali's actual live tenant data as part of P3 itself —
authoring the *template* is P3; applying a finished template to a specific real, live tenant is a
separate, later, explicitly-approved step, same discipline as everywhere else this session.

---

## Constraints checked against this proposal

- **Reservations engine**: not touched anywhere above. P0.1/P0.2/P1.1 all *read* existing
  Reservations data (`catalog-services`, `working_hours`, `barbers`) through already-real, already-
  public endpoints — none require a new backend capability or a change to booking logic itself.
- **Demo Builder**: not reopened — no item above touches `/demo-builder`, `demo_service.py`, or the
  `/demo/create` flow.
- **Alzabt marketing pages**: not reopened — no item touches `/alzabt`, root, or `AlzabtLandingPage.jsx`.
- **No one-off tenant redesigns**: every P0-P2 item is Layer-1/shared component work; applying
  results to a specific real tenant (RK/Ali/`alzabt-demo`) is explicitly named as a separate,
  later, gated step in P2 and P3 both.
- **No drag-and-drop builder**: P1's two new sections are fixed-layout, content-in/content-out —
  consistent with the already-ratified "Configured Template," not a builder.
- **No speculative sections**: nothing beyond `staff`/`credentials` is proposed — `offers`/
  `categories_grid` stay Candidates, untouched, per the Contract's own ruling.

---

## Recommended sequence

```
P0.1  featured_items data-source fix        ← START HERE
P0.2  hours real-data fix
P0.4  spacing-gap investigation (diagnostic only)
  │
  ▼
P1.1  staff/team section (new)
P1.2  credentials section (new)
  │
  ▼
P2    empty states + spacing rhythm first, then imagery/density/CTA on
      hero/gallery/featured_items/cta specifically
  │
  ▼
P3    Barber template first (least blocked) → Clinic or Beauty next
      (Salman's call, not architecture's)
```

## Start Here

**P0.1 — fix `FeaturedItemsSection.jsx`'s data source.** Concrete reasons this is the single right
first move, not just "first on the list": it's the highest real, confirmed-at-the-code-level
impact item in this entire proposal (breaks the one section every vertical agrees is Required); it
is unambiguous — a wrong endpoint call, not a design judgment call like everything in P2; it is
fully isolated (one file, no dependency on any other item above); and it is immediately,
concretely testable using the exact same evidence method already proven this session (curl the
real endpoint, real browser check against Ali's actual live page, before/after).

Waiting for approval before touching any code.
