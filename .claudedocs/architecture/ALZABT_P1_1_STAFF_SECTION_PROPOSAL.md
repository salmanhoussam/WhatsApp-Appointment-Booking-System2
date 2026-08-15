# P1.1 — `StaffSection` Proposal

**Status:** Discovery + proposal only. **No code.** Same disciplined pattern as P0.1/P0.2: governing
docs re-read, real impact map built, live tenant state checked — then a proposal for approval, not
an implementation.

---

## Governing docs re-read (this pass)

- `ALZABT_PRODUCT_MODEL.md` — Layer 1 (Alzabt, shared) vs. Layer 2 (Tenant, owns identity/content)
  boundary; nothing about Staff contradicts it.
- `ALZABT_VERTICAL_REPERTOIRE_MATRIX.md` — Cross-Vertical Observation #2: Barber's "Staff,"
  Clinic's "Doctors," Beauty's "Artists" are **one shared capability**, vertical-label-only
  difference — confirmed still the governing shape, no drift.
- `ALZABT_SECTION_SYSTEM_CONTRACT.md`'s `staff` entry — proposed shape `{name, photo_url, role_ar,
  bio_ar?}`, open question "does this read real `Barber` data or stay author-defined" — **resolved**
  by P0.3 (below), not still open.
- P0.3 discovery summary (`.claudedocs/work/section-system-p0.3-discovery/2026-08-15/summary.md`) —
  the exact constraint this proposal must satisfy, re-verified and **refined** below (a real
  admin-side capability I hadn't traced yet turned out to exist).

---

## Impact map — every real reader/writer, verified live

| Layer | File / route | Real state, verified this pass |
|---|---|---|
| **Data model** | `Barber` (`prisma/schema.prisma:868-887`) | Real fields: `name`, `phone`, `description`, `imageUrl`, `isActive`, `workingHours`, `sortOrder`. No `role`/title field exists — the Contract's proposed `role_ar` has no backing field today. |
| **Admin write path** | `app/api/v1/admin/barbers.py` (`POST/PATCH /admin/barbers`) | Already writes `description`/`imageUrl` (lines 122-123, 152-155) — nothing new needed here. |
| **Admin read path** | Same file, `_fmt()` (lines 71-81) | Already returns `description`, `image_url`, plus everything else. |
| **Admin UI** | `frontend/src/pages/generic-admin/tabs/StaffTab.jsx` | **A real, already-shipped editor exists** — a description textarea (line 673, "وصف مختصر (اختياري)") and an image upload flow (`adminApi.patch('/barbers/{id}', {image_url})`, line 325), with a live preview and thumbnail in the staff list (lines 620-621, 638-640). **Correction to the P0.3 discovery's framing**: the earlier summary implied no path to populate these fields exists yet — it does; no tenant has *used* it yet, which is a different, more specific fact. |
| **Public read path** | `app/api/v1/public/reservations.py:116-148`, `GET /reservations/barbers` | Real, public, gated `require_service("reservations")`. Re-confirmed exact return: `{"success": True, "data": [{"id": b.id, "name": b.name} for b in barbers]}` — **only `id`/`name`**, confirmed again, not changed since P0.3 discovery. |
| **Ordering** | `barber_repo.list_barbers()` (`app/repositories/barber_repo.py:11-18`) | Already orders `sortOrder asc, createdAt asc`, already applied to both the admin list and this same public endpoint (same function, `active_only=True` for the public call). **No new ordering logic needed** — inherited for free. |
| **Existing real callers** | `frontend/src/hooks/useReservationBooking.js:117,163` | The only two real callers today, both booking-flow "choose your barber" pickers — `{id, name}` is sufficient for that use case, which is why the endpoint was never extended. A showcase-style Staff section is a genuinely different consumer with different needs. |
| **Capability gate available client-side** | `DynamicPage.jsx:272,285-294` | `sectionProps` already includes `config` (carries `active_services`) and `slug` — same two props P0.1/P0.2 already used to make this exact kind of decision. No `DynamicPage.jsx` logic change needed beyond the one expected `SECTION_MAP` registry line the Work Sequence doc already names. |

## Real live tenant state, verified this pass

| Tenant | Real active `Barber` rows | `image_url` | `description` | `active_services` includes `reservations`? |
|---|---|---|---|---|
| **RK** | جعفر, حسين | `None`, `None` | `None`, `None` | ✅ |
| **Ali** | Ali | `None` | `None` | ✅ |
| **alzabt-demo** | كريم, طارق | `None`, `None` | `None`, `None` | ✅ |

Every real barber today would render name-only under any design — this is the universal current
case, not an edge case, confirmed directly (not re-derived from the earlier P0.3 note).

---

## Proposal

### Exact file scope
- **New**: `frontend/src/components/dynamic-sections/StaffSection.jsx`.
- **One registry line**: `DynamicPage.jsx`'s `SECTION_MAP` gets `staff: StaffSection` added — the
  exact addition the Work Sequence doc already names as expected for this item, not a redesign of
  that file.
- **Conditionally** (see the one open decision below): `app/api/v1/public/reservations.py`'s
  `list_public_barbers()` return dict gains two keys.

### Exact API / data source
`GET /reservations/barbers` (existing, unmodified route/path/auth) — no new endpoint. Called only
when `active_services.includes('reservations')` (same capability-gating pattern P0.1 established),
`service_id` param omitted (this is a showcase list, not the service-scoped booking picker).

### Exact response shape
Today: `{id, name}`. **Proposed addition** (if the decision below is "yes"): `image_url`,
`description` — same field names the admin `_fmt()` already uses, zero new vocabulary. No `role_ar`
— no backing field exists; inventing one now would be authoring platform-level content ahead of any
real vertical asking for it, the exact thing the Abstraction Rule and this whole arc's own "don't
invent data" discipline argues against.

### Whether backend changes are actually necessary
**Not strictly, for a functioning v1** — every real barber today has no photo/description anyway, so
a name-only v1 is honest and complete for the current real data. But the extension itself is
trivial, additive, backward-compatible (existing callers ignore new keys), and the admin-side write
path already exists and is live — the only missing piece is 2 keys in one `return` dict. This is the
one explicit decision point (below).

### Empty state behavior
Zero active barbers for a tenant → `StaffSection` returns `null`, same convention every other
section in this library already uses (`FeaturedItemsSection`'s `items.length===0`, `HoursSection`'s
`rows.length===0`).

### Missing-photo behavior
Render a neutral placeholder (initials or a generic person glyph, matching `CatalogItemCard`'s
existing no-image fallback pattern: `background: accent+12` with a centered glyph) — never a broken
`<img>`, never invented stock photography. This is the default state for 100% of real barbers today,
not a rare fallback.

### Missing-description behavior
Simply omit the bio line for that card — no placeholder text, no "no bio yet" filler copy (same
honesty principle `HoursSection`'s empty-state rule already established).

### Ordering behavior
Inherited for free from `barber_repo.list_barbers()`'s existing `sortOrder asc, createdAt asc` —
already the same order the admin Staff tab shows, no new logic.

### Capability gating
`active_services.includes('reservations')`, checked client-side before calling the endpoint — same
pattern, same source (`config.active_services`), as P0.1's `featured_items` fix. **Not** a
`vertical === 'barber'` check anywhere — the component only ever reasons about the `reservations`
capability, staying vertical-neutral per the governing model. Server-side, the existing
`require_service("reservations")` gate on the route is the real enforcement; the client check only
avoids an avoidable failed request.

### Ownership / auth implications
None new. `GET /reservations/barbers` already resolves the tenant via `get_current_tenant()` (no
`client_id` in the request), same pattern audited clean for P0.1/P0.2's endpoints. No admin auth
involved — this is a public read.

### Retail / restaurant behavior
Unaffected. No retail/restaurant tenant has (or would get) a `staff`-type entry in
`config.content.sections` — this section type doesn't exist in any current page/template for them.
If a `staff` section type ever appeared in a non-reservations tenant's sections (not expected, not
built now), the capability gate above means it renders `null` rather than crashing or calling a
route it has no access to.

### RK / Ali / alzabt-demo impact
None until a `staff` section entry is manually added to any of their `config.content.sections` —
which this proposal does **not** do (same "don't touch tenant data" discipline as P0.1/P0.2; adding
the section to a real tenant's real page is a separate, later, explicitly-approved step). Building
the component and registering it in `SECTION_MAP` has zero visible effect on any real tenant until
that separate step happens.

### Real risks / unresolved design decisions
- **The one explicit decision below** (endpoint extension timing).
- Scope-creep risk, same one the Work Sequence doc already names for this item: keep v1 to
  name + photo + description, resist individual staff detail pages or freeform staff-authored bios
  disconnected from the real `Barber` row — not proposed here, flagged as a boundary to hold.

### Live verification plan (once approved and built)
1. Temporarily add a `staff` entry to a throwaway demo tenant's sections (same create-and-delete
   pattern used for P0.1/P0.2's retail-case tests) — confirm real barbers render, names correct,
   order matches `sortOrder`.
2. Confirm graceful no-photo/no-description rendering against RK/Ali/alzabt-demo's real current data
   (all `None` today) via a similar temporary section injection — **not** a permanent change to
   their real pages.
3. Zero-barber case: confirm `null`/no crash for a tenant with no active barbers.
4. Console/network check: confirm exactly one `GET /reservations/barbers` call, no extra requests,
   no fallback to a different endpoint.
5. Confirm a genuinely non-reservations tenant either has no `staff` section at all (expected) or,
   if one were forced onto it for the test, renders `null` rather than a failed request.

---

## The one explicit decision I'm not making unilaterally

**Extend `GET /reservations/barbers`'s response now (bundled into this same P1.1 round) to include
`image_url`/`description`, or ship name-only v1 and defer the extension until a tenant actually
uploads a photo?**

- **Extend now (my recommendation)**: the change is two dict keys, additive, backward-compatible,
  zero schema/migration, the admin write path already exists and is live — there's no real reason to
  make a second round out of it later. `StaffSection` is built once, correctly, from day one.
- **Defer**: stricter "smallest possible v1" — but means a second, near-identical approval cycle the
  moment any tenant uploads a barber photo, to change 2 lines in a route that's already understood
  and already reviewed today.

Both are legitimate; I lean toward extending now given how small and low-risk it genuinely is, but
this is exactly the kind of call this arc has consistently put in front of you rather than assuming.

Waiting for that decision, then approval to implement.
