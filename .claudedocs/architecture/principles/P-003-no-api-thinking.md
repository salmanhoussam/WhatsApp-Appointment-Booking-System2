# P-003 — No API Thinking

**Tenant OS Principle** — genuinely new, no home in `.claude/rules/`. Extracted from
`TENANT_OS_PLAN.md` §9, during the ADR-0003 migration (Phase 4).

## The Principle

A tenant "changes a photo / writes text / drags an item / hits Save" — never sees PUT/PATCH/POST,
never sees schema language, never sees an endpoint name, ever. Every interface interaction maps to
exactly one save action from the tenant's point of view, however many requests it takes underneath,
and regardless of which Interface (Dashboard, AI, Mobile) originated it.

## Already Mostly True, Not Aspirational

This is not a future aspiration invented from nothing — real, already-shipped code already holds
this line:

- `SettingsTab.jsx` already collapses an entire branding form into one `PATCH /settings` call the
  tenant never sees.
- `CatalogTab.jsx`'s image-upload flow already hides the two-step upload-then-attach sequence
  behind a single "choose photo" interaction.

The architectural rule going forward is simply to **hold this line** as new Content types are
added — a constraint on future Implementation Contracts, not new design work. The pattern to keep
replicating already exists in two real files; nothing needs to be invented, only continued.

## Why This Is Permanent, Not Sprint-Specific

Every new Capability's Admin projection (`capabilities/*.md`) is measured against this line before
it ships: if a tenant-facing interaction ever requires understanding a technical vocabulary
(a field name, a status code, a request shape) to complete it, that interaction has failed this
principle, regardless of whether the underlying feature technically works.

## Related

- `TOS-001-tenant-os.md` §4.4 — one of the five Design Principles this expands.
- `TOS-002-editing-engine.md` — the Editing Engine's `EditableRegion`/Operation vocabulary is what
  keeps this true even as new Interfaces (AI, Mobile) are added, without each one re-deriving its
  own hidden-plumbing convention.
- `P-004-direct-manipulation.md` — the Dashboard-specific *feel* this principle's "no exposed API"
  constraint is a precondition for.
