# P-004 — Direct Manipulation, Not Forms

**Tenant OS Principle** — genuinely new, no home in `.claude/rules/`. Extracted from
`TENANT_OS_PLAN.md` §7, during the ADR-0003 migration (Phase 4).

## Scope: the Dashboard's Own Felt Experience

This principle is about how the **Dashboard Interface specifically** should feel — one of four
Interface siblings in `TOS-001`'s anatomy. An AI Chat interface or a future Mobile app will have
their own natural interaction modes over the same Capabilities; this principle does not govern
those.

## The Principle

The deliverable is not "an admin panel with fewer forms." The Dashboard should feel the way Notion,
Shopify, or Framer feel (named here as the *felt experience* to aim for, not as products to
integrate with or copy pixel-for-pixel): direct manipulation of the real thing, not filling out a
form that describes the real thing somewhere else.

Concretely, the difference this demands:

- **Not**: a form with labeled fields — Product Name / Description / Image / Category — submitted
  to save.
- **Instead**: open the product itself. Click the name, it's editable in place, it saves. Drag a
  photo onto the image area, it uploads and appears. Drag a product up in the list, the order
  changes. Drop a video in, it plays. Every action is direct manipulation of the thing itself, not
  a proxy form describing it.

## What Already Exists, and What Doesn't

The shared upload flow (`upload.py`, `useImageUpload.js`) already collapses upload into a single
drop-target interaction — a real building block this identity needs. `CanvasPageEditor.jsx`,
however, does **not** meet this bar: it renders a separate, hand-rolled mockup canvas that never
renders the real page — exactly the anti-pattern this principle (and the Live Preview mechanism in
`TOS-002`) warns against.

`TOS-002`'s Editing Engine is the real fix: inline-in-context editing becomes the default posture
for every Content item not because each Interface hand-builds it, but because the Editing Engine's
Discovery mechanism makes every editable field clickable-in-place automatically, on the real
rendered page, for any Interface that chooses to surface it that way.

Where a Capability's own real Gaps get closed (e.g. reorder for `CatalogItem`/`CatalogCategory`,
tracked in `capabilities/catalog.md` and `capabilities/category.md`), they should be closed in this
same direct-manipulation spirit — drag the card, not "edit `sort_order` in a number field" —
continuing the real pattern `GalleryImage`'s reorder endpoint already proves works.

## Why This Is Permanent, Not Sprint-Specific

This is the standing bar every future Dashboard interaction is measured against, not a one-time
redesign goal. A new Content type shipped with a plain form instead of in-place editing has not
met this principle, regardless of whether the form technically functions.

## Related

- `TOS-001-tenant-os.md` §4.4 — one of the five Design Principles this expands.
- `TOS-002-editing-engine.md` — the mechanism (`EditableRegion`, Discovery) that makes
  inline-in-context editing the default without each Interface hand-building it per Capability.
- `P-003-no-api-thinking.md` — the underlying-plumbing constraint this Dashboard-specific feel
  depends on.
