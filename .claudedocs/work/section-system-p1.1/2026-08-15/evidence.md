# P1.1 — `StaffSection` — Evidence

**Scope**: per `ALZABT_P1_1_STAFF_SECTION_PROPOSAL.md`, decision "extend `GET /reservations/barbers`
now" approved. New `StaffSection.jsx`, one additive backend response extension, one `SECTION_MAP`
registry line, one barrel-export line. No `CredentialsSection`, no P1.2, no `page_template`, no
`service_type`, no provisioning changes, no unrelated cleanup.

## Re-checked before editing

- `app/api/v1/public/reservations.py`'s `list_public_barbers()` — confirmed still returning only
  `{id, name}` before any edit, matching the proposal's own stated baseline exactly.
- `DynamicPage.jsx`'s `SECTION_MAP`/imports and `dynamic-sections/index.js`'s barrel — confirmed
  clean baseline, no prior drift.

## The changes

- **`app/api/v1/public/reservations.py`**: `list_public_barbers()`'s return dict gains `image_url`
  (`b.imageUrl`) and `description` (`b.description`) alongside the unchanged `id`/`name`. Same
  field names the admin `_fmt()` already uses. Ordering, auth (`get_current_tenant` +
  `require_service("reservations")`), and the `service_id` soft-filter are all untouched.
- **New `frontend/src/components/dynamic-sections/StaffSection.jsx`**: fetches
  `GET /reservations/barbers` only when `config.active_services.includes('reservations')` (capability
  check, never `vertical === 'barber'`). Renders name always; description only if present (omitted,
  never fabricated, if absent); photo via real `<img>` if `image_url` is set, otherwise a neutral
  accent-tinted initial-letter placeholder (same "no fabricated image" convention
  `CatalogItemCard.jsx` already uses). Empty roster → `null`, same convention every other section in
  this library already follows.
- **`DynamicPage.jsx`**: one import line, one `SECTION_MAP` entry (`staff: StaffSection`) — the
  exact minimum the Work Sequence doc names as expected for this item.
- **`dynamic-sections/index.js`**: one barrel-export line.

## Live verification (real Playwright browser + real backend, this session)

Backend was restarted (no `--reload` configured) to pick up the `reservations.py` change; several
navigations hit the same pre-existing Supabase pooler flakiness this whole session has documented
repeatedly (`503`/`500`, once affecting the pooler broadly enough that even the running backend's
established connection briefly failed) — each resolved on retry, noted honestly rather than omitted.

### Endpoint verified directly, including the new fields

| Tenant | Response (real, via `curl`) |
|---|---|
| **RK** | `[{"حسين", image_url:null, description:null}, {"جعفر", image_url:null, description:null}]` — same order as `sortOrder/createdAt`, matches |
| **Ali** | `[{"Ali", image_url:null, description:null}]` |
| **alzabt-demo** | `[{"كريم", ...null}, {"طارق", ...null}]` — order matches |

Confirms "real Barber names render from the endpoint," correct ordering, and graceful nulls for
every real tenant, without modifying any of their stored data (no `staff` section exists in any of
their real `config.content.sections` — adding one is a separate, later, explicitly-approved step,
same discipline as every prior phase).

### Component rendering verified via a throwaway barbershop tenant (`demo-p11testbarbershop-780b`, created and deleted for this check)

- **Name + description present**: real barber name and a real description (set via the live admin
  API, `PATCH /admin/barbers/{id}`) both rendered correctly. 0 console errors, exactly 2
  `GET /reservations/barbers` calls (React StrictMode's known dev-only double-invoke, same pattern
  every other section already exhibits), no unexpected extra requests.
- **No photo**: confirmed no `<img>` element rendered — the accent-tinted initial-letter fallback
  used instead. No broken image, nothing fabricated.
- **Has photo**: set a real `image_url` via the same live admin API, re-verified — a real `<img>`
  element rendered with `src` exactly matching the set URL.

### Retail/non-reservations control (`demo-p11teststore-dd6c`, created and deleted for this check)

A `staff` section was injected into this store-type tenant's config (no `reservations` in its real
`active_services`). Result: **zero `GET /reservations/barbers` requests fired at all** — the
capability gate correctly prevented the call — no heading, no interference with the rest of the
page, 0 console errors/warnings.

### RK regression check

Re-navigated to RK's real live page after the backend restart — confirmed unaffected: 0 console
errors (one pre-existing, unrelated Framer Motion warning only, same as every prior round this
session).

## What was NOT touched, confirmed by the diff itself

`git diff --stat` on the three modified files: `reservations.py` (+10/-1),
`dynamic-sections/index.js` (+1), `DynamicPage.jsx` (+2) — plus the new `StaffSection.jsx` file.
No schema change, no `CredentialsSection`, no `page_template`, no `service_type`, no provisioning
file touched, no unrelated section modified.

## Result

All requirements verified with real evidence: real Barber data as the sole source of truth (never
author-defined rows), correct ordering, graceful no-photo/no-description degradation, capability
gating (not vertical string checks), zero impact on RK/Ali/alzabt-demo's real stored data, zero
impact on retail/restaurant tenants.
