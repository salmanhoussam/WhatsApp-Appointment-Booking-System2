# Capability Contract Consistency Review — 2026-07-29

Per Salman's explicit request: compare Media, Catalog, and Content's Admin/Public Contract
implementations for where they diverge from the `TOS-003` Capability Contract model and from each
other. All findings below are re-verified against the real, current backend code today (not
re-stated from the capability `.md` files alone) — see Evidence per finding.

## Confirmed Findings

**1. Content is the clean baseline — single Service, no repo bypass.**
Evidence: `app/api/v1/admin/content.py:19` imports only `from app.services import
content_service` — no repository import anywhere in the file. Matches `capabilities/content.md`'s
own claim exactly; re-confirmed against real code, not stale.

**2. Catalog's Admin Projection is actively bypassed — confirmed still true today.**
Evidence: `app/api/v1/admin/store.py:15` and `app/api/v1/admin/restaurant.py:15` both import `from
app.repositories import admin_catalog_repo as _cat_repo` directly — the same Duplicate Architecture
finding already recorded in `capabilities/catalog.md`'s Open Findings, re-verified against real
code today rather than assumed from that file's prior text. `catalog_service.py` exists and is the
stated single write path, but two other route files skip it entirely.

**3. Media's Admin Projection has a genuine absence, not a duplicate — a different shape of
divergence than Catalog's.**
Evidence: `app/api/v1/admin/gallery.py` imports `gallery_repo` directly (line 18) and defines 5
route handlers (`list_gallery`, `upload_gallery_image`, `update_gallery_image`, `reorder_gallery`,
`delete_gallery_image`) with **no service import anywhere in the file**. This is not two
implementations racing (Catalog's shape) — it's zero Service ever having been built for this
context. Both are real violations of the same principle (`architecture.md §9`), but they are
architecturally distinct failure modes and shouldn't be treated as the same bug: Catalog needs a
bypass *closed*; Media's gallery context needs a Service *built* that doesn't exist yet.

**4. Media's own documented claim about its Public Projection is stale — a real endpoint exists
that the capability file says doesn't.**
`capabilities/media.md` states: *"Media itself has no dedicated public read endpoint; it is always
read through whichever Capability references the URL."* This is now incorrect. Evidence: `GET
/{slug}/units/{unit_id}/gallery` is real (`app/api/v1/public/__init__.py:167-175`), and calls a
real, defined function (`public_repo.list_gallery_images_for_unit`, `app/repositories/
public_repo.py:28`) — not a stub. However, a grep across `frontend/src` for any real caller of this
route found **zero** — the only frontend reference to `units/.../gallery` is
`UnitFormModal.jsx:669`, which is an *admin upload* storage-folder path string, not a call to this
public read endpoint. **Corrected in `capabilities/media.md` as part of this Review** (see below) —
the endpoint is real but has no confirmed live consumer, which is a different, more precise claim
than "no endpoint exists at all."

**5. The 2026-07-24 logged crash (`evolution/capability-contracts.md`) is not reproducible as
described today — the functions it named as missing now exist.**
That entry reported `app/api/v1/public/__init__.py`'s catalog endpoints calling `catalog_service`
function names that never existed. Evidence: `list_categories_public`, `get_category_items_public`,
and `get_item_public` are all real, defined functions today (`app/services/catalog_service.py:90,
101, 113`), and `public/__init__.py:235,247,258` call them correctly. This does **not** confirm the
underlying duplicate-route-definition shape was removed (see Unknowns) — only that the specific
crash is no longer reproducible from the code as it reads now.

## Side Findings

None beyond the above — no new, unrelated issue was noticed while investigating these three files
that isn't already the direct subject of this Review.

## Unknowns

- Whether `app/api/v1/public/__init__.py`'s catalog endpoints and the separate nested router
  (`app/api/v1/public/catalog.py`) still both independently exist for the same resource (two route
  definitions, even if both now call valid functions) — not checked; this Review confirmed the
  *crash* is gone, not that the *duplication* itself was removed.
- `evolution/capability-contracts.md`'s own standing Open Question — whether a similar duplication
  exists in Store, Restaurant, or Booking's own public route *definitions* specifically (distinct
  from Catalog's admin-side bypass found here) — still not audited by this Review; out of the
  Media/Catalog/Content scope Salman named.
- Whether the unused public gallery endpoint (Finding 4) is intentionally reserved for a future
  Interface or an accidental leftover — not determined.

## Comparison Across the Three

| Capability | Admin Projection | Public Projection | Divergence shape |
|---|---|---|---|
| Content | Single Service, no bypass | Single dedicated endpoint | None — the reference case |
| Catalog | Service exists, actively bypassed by 2 other route files | Single dedicated endpoint (crash-fixed) | **Duplicate Architecture** — a second/third path grew alongside the real one |
| Media | No Service exists for the gallery context at all | A real endpoint exists but is unconsumed | **Missing Architecture** — a Service was never built, not a competing one |

Content is the only one of the three that actually matches the intended one-Service-one-path model
end to end. Catalog and Media both diverge from it, but not in the same way — worth keeping
distinct rather than filing both under one generic "tech debt" line, since the fix each needs is
different (close a bypass vs. build a missing Service).

## Recommendation (not a decision, not an execution)

Both real divergences (Catalog's bypass, Media's missing gallery Service) are already named as open
items in their own capability files, with an existing precedent for how they'd be closed (a future
Implementation Contract, per `catalog.md`'s own text). This Review doesn't propose scheduling that
work now — Salman's own priority 4 in this same message keeps new architectural work paused pending
a second real signal, and this Review's job was comparison, not remediation.

## Related

- `.claudedocs/architecture/capabilities/content.md`, `media.md`, `catalog.md` — the three files
  this Review compares.
- `.claudedocs/evolution/capability-contracts.md` — the standing pattern (2 confirmed instances so
  far) this Review's Findings 2 and 3 relate to without being a new instance of it themselves
  (these are re-confirmations of already-known findings, not newly discovered cases).
