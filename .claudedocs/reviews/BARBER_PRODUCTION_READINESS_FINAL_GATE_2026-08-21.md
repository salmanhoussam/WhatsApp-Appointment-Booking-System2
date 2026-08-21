# Barber Production Readiness — Final Gate (2026-08-21)

Study only, per Salman's explicit instruction: no code, no commits, no DB changes. Reviews all work
done this session on mr-h/rk: Tenant OS Section Editor Phases 1-6, Customer Registry,
Products/Services Separation, Calendar A2.1+A2.2, Store B1/B2/B3. Real browser/DB/git evidence
throughout, per `investigation-protocol.md`.

## Verdict: **NO-GO**

One real P0 blocker confirmed live, reproducible, on both tenants. Everything else reviewed is
either working correctly or a real-but-parkable finding (stated explicitly below, not silently
folded into the blocker).

---

## P0 — Blocker

### Section Editor: switching sections silently shows wrong data, real risk of overwriting real content on Save

**Severity: P0.** Affects the single most routine admin workflow in the entire Tenant OS Editing
Engine — opening Settings and clicking through more than one section — on **both tenants**, since
`SectionEditorPanel` is one shared component.

**Root cause, confirmed by code + live reproduction:**
`frontend/src/pages/generic-admin/tabs/SettingsTab.jsx`'s `SectionEditorPanel`
(`<SectionEditorPanel section={selectedSection} .../>`, no `key` prop) initializes its `values`
state via `useState(() => {...section.data...})` — a **lazy initializer that only runs on the
component's first mount**. Since nothing forces a remount when `selectedSection` changes (no `key`,
same component type), every subsequent section click reuses the *same* `values` object, now
rendered against a *different* section's `fieldsConfig` (different field key names per section).

**Live reproduction (mr-h, no data changed, no Save clicked):**
1. Fresh page load → "الصفحة الرئيسية (Hero)" auto-selected → real values shown correctly
   (`title_ar: "صالون مستر إتش"`, etc.).
2. Click "الخدمات" (featured_items, field key `heading_ar`) → its "العنوان" field renders
   **empty**, even though the real public homepage shows a real heading ("خدماتنا") — because
   `values` still only has Hero's keys (`title_ar`, `subtitle_ar`, ...), not `heading_ar`.
3. Typed a marker string into that empty field (`LEAK-TEST-MARKER-XYZ`) — not saved.
4. Clicked "ليش تختارنا" (why_choose_us, **also** field key `heading_ar` — confirmed via
   `app/schemas/section_schemas.py`, `heading_ar` is reused across at least 7 different sections:
   staff, gallery, featured_items, products, why_choose_us, hours/location, cta) → its own
   "العنوان" field now showed **"LEAK-TEST-MARKER-XYZ"** — the value typed for a *different*
   section, not why_choose_us's own real content.

**Real consequence if Save had been clicked at step 4**: `PATCH /content/sections/why_choose_us/fields`
would have sent `{heading_ar: "LEAK-TEST-MARKER-XYZ", ...}`, silently overwriting
why_choose_us's real heading with featured_items' typed text — no warning, no confirmation, nothing
to distinguish it from a correct save. The same class of corruption applies to *any* two sections
sharing a field key, and any section clicked after the first always shows blank/wrong scalar
fields regardless of key collisions.

**Not affected**: repeatable groups (`RepeatableGroupEditor`, shown correctly — stats in the Story
test above rendered real values) and media fields — different code paths, this bug is scoped to
`fieldsConfig`-driven scalar text/textarea/number/boolean/select fields only.

**Smallest fix** (not applied — study only): add `key={section.type}` to the
`<SectionEditorPanel>` usage (`SettingsTab.jsx` ~line 804) — forces a real remount, and the
existing lazy initializer becomes correct again on every section switch, no other logic change
needed. This exact fix was already identified and named during Phase 5A (2026-08-20,
`.claudedocs/implementation/TENANT_OS_SECTION_EDITOR/PHASE_5.md`) but explicitly deferred as
out-of-scope each time it recurred — this Final Gate is the first time its real severity (content
loss, not just a console warning) has been demonstrated live.

---

## Real, Confirmed, Non-Blocking Findings (parked — do not block launch, but need a decision)

### 1. Customer Registry shows real test/phantom entries on both tenants

Confirmed live: rk's real Customer Registry shows **"B3 Fix Verification Test Order"** (this
session's own Store checkout verification, phone `+96170888003`, order correctly cancelled but
still counted — `customer_registry_service.py` applies no status filter to reservations or orders
by design). mr-h's shows **three** — "Regression Check Fix A2.1", "A2.2 Last Valid Slot" (this
session's Calendar fix verifications) plus "Ali Isolation Test" (pre-existing, from the 2026-08-02
Reservation Pilot, already flagged then). Not a code bug — a real, self-caused (and one
pre-existing) data-hygiene gap in a real, customer-facing-adjacent admin view. A real business
owner opening "العملاء" today sees these names alongside real customers.
**Why parked, not blocking**: cosmetic/informational only — no functional breakage, no wrong
charge, no real customer confused. **Smallest fix**: a one-off cleanup (mark/hide these 4 specific
test rows, or extend the Customer Registry to exclude `cancelled`-only customers) — a real decision
Salman should make, not something to silently resolve.

### 2. `/rk/store` and `/rk/catalog`'s "الخدمات" tab shows "0 USD" for every real service

Confirmed live via screenshot on both URLs (same underlying `CatalogPage.jsx` component) — all 6
real services (real prices 8-40 USD elsewhere: public homepage, admin booking popovers) show
"0 USD" here. **Why parked, not blocking**: this generic browse view's "+" add-button doesn't even
make functional sense for a bookable service (you don't add a haircut to a cart) — the real,
correct booking path (public homepage's Services section, `/rk/reserve`) was independently
verified multiple times this session with correct prices. This looks like a secondary/redundant
view, not the primary customer path. Pre-existing, unrelated to any change made this session.
**Smallest fix**: needs its own investigation to confirm whether real customers ever reach this
specific view before deciding whether it's worth fixing or removing.

### 3. `/mr-h/store` is a real, live, but orphaned URL

Confirmed in the original B1 investigation, re-confirmed unaffected by this session's Store fixes:
not linked anywhere in mr-h's real site nav, 403-then-empty-state resolves within a few seconds
(not confirmed as a true infinite hang). Low real-world severity since no real customer path leads
there today.

### 4. Week-view Calendar still uses tenant-wide hours, not barber-specific (A2.2's own registered gap)

Confirmed still true, unchanged, exactly as documented in A2.2's evidence — Week view pools every
barber's reservations per day column, so no single barber's hours can correctly narrow the grid
without a real per-barber-lane redesign (explicitly out of A2.2's "no refactor" scope). Today view
(the default, primary calendar surface) is fully fixed. Real but scoped, already named, not
silently reintroduced as new.

### 5. Architecture-level notes carried forward, not live bugs

`store.py`/`catalog_service.py` dual-write-path (flagged twice previously, ADR/Review candidate,
not touched this session) and dead `StoreCustomer` code remain exactly as previously documented —
re-confirmed not to interact with anything built this session.

---

## Explicitly Checked and Found Clean

- **Git/working-tree state**: clean. Only the pre-existing, deliberately-uncommitted
  `capability-operations-model.md` (unrelated, predates this whole session) is modified. All this
  session's work is committed: `fbb51f1`, `058e653`, `d4c49fc`, `dcbffa5`, `04374fd`, `0607d91`,
  `a53c325`, `bb66a49`, `b8d0081` — 9 real commits, in order, each independently reviewed this
  session already.
- **Dashboard nav dead-ends**: mr-h's "المتجر" tab (the B1-confirmed dead-end) is now correctly
  hidden (Store fix verified live, no regression on rk which still shows it). Staff, Customers,
  Overview, Calendar/Reservations tabs all load cleanly on both tenants, 0 console errors.
  "الإشعارات" (Notifications) remains an intentional, clearly-labeled "سيُتاح قريباً" placeholder —
  not a dead-end, a stated future phase.
- **Public homepage flow, both tenants**: 0 console errors on fresh loads, post all this session's
  changes combined. rk's homepage now shows the real Products section with 4 real "أضف للسلة"
  buttons (Store B3). mr-h's homepage unaffected, no Products section (by design).
- **Store full purchase chain (rk)**: independently re-confirmed still functioning as of the B3
  evidence — homepage → browse → cart → checkout → real order → WhatsApp confirmation, verified
  end-to-end with real data in the prior turn, test order cleanly cancelled.
- **Calendar create/reschedule (mr-h, rk)**: independently verified in A2.1/A2.2 — real creates and
  reschedules succeed for in-hours times, correctly rejected for out-of-hours times, backend and UI
  boundaries now agree.
- **Reorder flow (Section Editor's ↑/↓ buttons)**: not touched or exercised this pass (would require
  a real reorder + revert, judged unnecessary given the Section Editor's core Save-safety already
  failed at a more fundamental level above — reordering is a smaller concern than content
  corruption on Save).

## Unknowns

- Whether the Section Editor bug has already caused a real, silent content overwrite on either
  tenant before today is not established — no evidence either way; nobody reported one, but the bug
  itself provides no error trail that would reveal it after the fact.
- Whether `/rk/store` / `/rk/catalog`'s "0 USD" display bug is reachable from any real, currently
  linked customer path beyond what was checked here.

## Status

**NO-GO.** One P0 blocker (Section Editor stale-state / cross-section value leak on Save), smallest
fix identified (`key={section.type}`) but **not applied** — study only, per instruction. Four
real, evidenced, non-blocking findings parked for a decision, not silently resolved. Awaiting
Salman's direction on the P0 fix before any further Barber production-readiness work proceeds.
