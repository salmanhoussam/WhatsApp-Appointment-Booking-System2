# Dashboard Production Readiness Audit — 2026-08-22

Study only, per Salman's explicit instruction: no code, no commits, no DB changes. Triggered after
Track A (Calendar) and Track B (Store) both closed — a full sweep of every remaining Dashboard tab
and its capability gating / API calls, on mr-h and rk, real browser evidence throughout, per
`investigation-protocol.md`. Special focus: Staff/Services, Customers, Notifications,
Settings/Section Editor.

## Confirmed Findings

### New — Overview's unconditional `/admin/catalog/items` call (P1)

`OverviewTab.jsx` (lines 552-566) fires `GET /admin/catalog/categories` and `GET /admin/catalog/items`
unconditionally on every load, with no `activeServices`/capability check — unlike every other fetch
in the same file (`loadOrders`/`loadResStats`, both correctly gated). The backend's own
`GET /admin/catalog/items` route (`app/api/v1/admin/catalog.py:193-199`) requires
`require_service("catalog")`; `GET /categories` uses a more permissive combined
`_require_catalog_or_reservations` check.

**Live confirmed, both tenants:**
- mr-h (no catalog service, only `reservations`/`booking`/`whatsapp_ordering`): `GET
  /admin/catalog/items?client_slug=mr-h` → **403 Forbidden**, reproduced on 4/4 separate Overview
  loads. Silently caught (`.catch(() => {})`), so nothing crashes — but the "Products"/"Categories"
  stat widgets then render a literal **"٠" (zero)**, indistinguishable from "this tenant genuinely
  has zero products," when the true state is "this capability isn't active for this tenant at
  all." Real, user-visible, misleading state on the very first tab any admin sees.
- rk (has `catalog`/`store`): both calls → 200 OK, real data, correct.

Same class of bug already found and fixed twice this session in different places (Store's nav
gating, B1/B2/B3; the error-message-field bug in `StoreTab.jsx`/`CatalogTab.jsx`) — this is a third,
previously-unfound instance of "a call/UI element not gated on `activeServices`," on a different
tab (Overview) that was never audited for this specific pattern before.

### Everything else checked — working correctly, both tenants

| Tab | mr-h | rk |
|---|---|---|
| Overview | 🟡 (see above) | ✅ |
| Calendar / Reservations | ✅ (Track A, already closed) | ✅ |
| Staff → الفريق | ✅ real barber "Ali", 09:00-18:00 | ✅ 2 real barbers, real hours |
| Staff → الخدمات (H2) | ✅ `catalog-services`/`catalog/categories` both 200, 6 real services render — confirms the more permissive backend gate works correctly for a non-catalog tenant | ✅ |
| Customers | ✅ `GET /admin/customers/` 200, 5 real rows | ✅ 9 real rows, mixed service/store |
| Notifications | ✅ static placeholder, "سيُتاح قريباً", zero requests fired — confirmed via code (`ComingSoonTab`, `GenericAdminDashboard.jsx:266-289`) and live, intentional per A3.1's own Final Gate finding, not a dead-end | ✅ same |
| Settings / Section Editor | ✅ 9 real sections list, Hero fields pre-populated with real values, all requests 200 | ✅ Section Editor + live preview iframe load cleanly |
| Store (rk only) | — | ✅ Categories/Products/Orders all real, already closed under Track B |

### Transient, non-actionable (P2)

- mr-h: one `GET /admin/catalog-services/` returned a real 503 on its first load, self-healed to
  200 on the app's own retry moments later — consistent with this project's already-documented,
  recurring Supabase pooler flakiness (same class as the P0-fix pass's `bg_type` investigation and
  A5's rk List-tab 500), not a new/distinct issue.
- rk: 4 `net::ERR_ABORTED` requests during a fast Settings→Store tab switch (live-preview iframe
  unmounting mid-request) — 0 console errors, 0 visible breakage, standard SPA request-cancellation
  behavior, not a real defect.

### Dismissed — not a real finding

Both tenants' dashboards landed on the Calendar tab rather than Overview at the start of each pass.
Investigated: `activeTab`'s real default (`GenericAdminDashboard.jsx:363`) is
`initialUrlTab || (isStaff ? 'calendar' : 'overview')` — neither test account is STAFF, so code
defaults to Overview. The observed Calendar landing is explained by this session's own repeated
`/{slug}/dashboard/calendar` navigations earlier today (persisted last-tab state), not a real
regression — not counted as a finding.

## Side Findings — already known, re-confirmed present, not opened for work

Per Salman's own standing instruction, none of these are touched:
- Customer Registry test-data pollution (both tenants).
- `/rk/store` + `/rk/catalog` Services tab "0 USD" display bug.
- `/mr-h/store` orphaned URL.
- `update_section_field()` silently skips a field explicitly cleared to `null`.
- Quick Create doesn't pre-validate a clicked slot's time before opening (found during A5).
- rk List tab's `GET /admin/reservations/?date_from=...` real 500 (found during A5), same pooler-
  flakiness class as this audit's own mr-h 503.

## Unknowns

- Whether other `hasReservations`-without-catalog tenants beyond mr-h exist or are planned before
  2026-08-31 — if so, they'd hit the same Overview 403 on day one.
- Whether the misleading "٠" Products/Categories display on Overview has ever confused a real
  tenant admin in practice — no evidence either way, flagging as unverified rather than assumed.

## Classification

| Severity | Count | Items |
|---|---|---|
| **P0** | 0 | none found — no crash, no data risk, no blocked core journey anywhere audited |
| **P1** | 1 (new) | Overview's unconditional `/admin/catalog/items` call — misleading "٠" for a capability-inactive tenant |
| **P2** | 2 (new) | mr-h transient 503 (self-healed, pooler flakiness); rk `ERR_ABORTED` on fast tab-switch (cosmetic, no impact) |
| **Already parked** | 6 | listed above, unchanged, not re-opened |

## Proposed execution plan (not started — awaiting Salman's decision)

**P0**: none — no action required.

**P1 (the one real, new, worth-fixing item)** — smallest safe fix, matching this session's own
established discipline: gate `OverviewTab.jsx`'s catalog fetch on `hasCapability(activeServices,
'catalog') || hasCapability(activeServices, 'store')` (the same helper already imported and used
for `hasOrders` two lines below it), skipping the fetch entirely for a tenant without either —
mirrors exactly how `loadOrders`/`loadResStats` already guard themselves in the same file. Real
browser verification on both tenants (confirm mr-h's Overview no longer requests `/catalog/items`
at all, confirm rk unaffected), 0 console errors, then commit + evidence, matching this session's
per-phase pattern (e.g. `CALENDAR_RESOURCE_COLUMNS/A*.md`).

**P2**: no action proposed — both are transient/cosmetic with zero real impact; registering is
enough.

## Status

**Report complete. No code, no DB, no fixes applied — per instruction.** Awaiting Salman's decision
on whether to authorize the one proposed P1 fix.
