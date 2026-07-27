# P-002 — Content vs Structure: The Three Layers

**Tenant OS Principle** — genuinely new, no home in `.claude/rules/`. Extracted from
`TENANT_OS_PLAN.md` §4, during the ADR-0003 migration (Phase 4).

## The Principle

Every piece of tenant data or design belongs to exactly one of three layers, answering **"who owns
this"** — a different axis than `TOS-001`'s Capability/Interface/Governance anatomy, which answers
"how is the system organized internally." The same Content item (say, a Product's price) is
simultaneously Content-layer-owned (this principle: the tenant may edit it) and reached through the
Catalog Capability (`TOS-001`'s anatomy: via its one Contract/Service/Repository chain) — the two
axes are orthogonal, not redundant.

### Layer 1 — Platform (المنصة). Owned by the developer only. Never touched by any tenant, ever.

How the Store mechanism itself works; routing; checkout logic; WhatsApp integration; the AI layer;
the overall architecture; performance; the database structure. Maps directly to this project's
existing 4-layer backend rule (`.claude/rules/backend/architecture.md`), the multi-tenancy rule
(`.claude/rules/global.md`), and the Service Execution Constitution. Nothing at this layer has any
tenant-facing surface, not even read-only, except where the Platform's own behavior (e.g.
`require_service()` gating) quietly determines which Content-layer Capabilities a tenant even sees.

### Layer 2 — Template (القالب). Owned by the developer by default; narrow, curated exceptions only.

The shape of the Product Page; the shape of the Checkout page; where sections are placed;
animation; card design. This is `CanvasPageEditor.jsx`'s `SECTION_TYPES` registry, the page
component tree, the Framer Motion presets in `.claude/rules/frontend/animations.md` — real
Structure. Not automatically drag-and-drop-everything from day one: a tenant may be allowed to pick
a theme, a color, a font, or a bounded reordering of a small number of pre-defined slots — never
arbitrary layout freedom, never a new section type, never CSS access. Exactly which narrow
exceptions are granted is a Template-layer design decision the developer makes once per Template,
not something the tenant negotiates per-instance.

### Layer 3 — Content (المحتوى). Owned by the tenant, fully, forever, with zero technical knowledge required.

Everything Structure/Template was built to hold: Categories, Products, Images, Videos, Hero text,
About, Contact info, WhatsApp number, Social Media links, SEO metadata, Home section content, all
copy, all prices, product ordering, category ordering, publish/hide state for any item, and the
broader Site Configuration surface (`capabilities/site-configuration.md`). Every one of these
should map to a real existing field; where none exists yet, it is a named Gap in the owning
Capability file, not silently assumed to exist.

## The Layer Test

For any future feature request, ask in order:

1. **Does answering "yes" require touching a `.py`/`.jsx` file that isn't a data value?** →
   Platform or Template. Stop — this needs a developer, and if it's a new domain capability it
   needs its own ADR/Implementation Contract per `.claude/rules/documentation-policy.md`.
2. **Does it require picking from a developer-curated set of options (a theme, a font, a slot
   order) rather than writing free content?** → Template, and only if that specific exception was
   already designed into this Template — not created ad hoc per tenant request.
3. **Otherwise — is it a value (text, image, price, order, visibility) that a real field or model
   already holds, or reasonably could?** → Content. It belongs in the Tenant OS, full stop.

## Why This Is Permanent, Not Sprint-Specific

This boundary is what keeps "the tenant can edit anything" from silently becoming "the tenant can
break the page" — it is the standing filter every future feature request runs through, not a
one-time design pass.

## Related

- `TOS-001-tenant-os.md` §4.4 — one of the five Design Principles this expands.
- `P-001-dashboard-first.md` — applies specifically to what this principle calls Content.
- `capabilities/*.md` — where each real Content field's current ownership and mechanism (or Gap)
  is tracked, per-Capability.
