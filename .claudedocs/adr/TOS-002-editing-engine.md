# TOS-002 — Editing Engine: Capability → Operation → Schema → Renderer

**Status:** Decided. Extracted from `TENANT_OS_PLAN.md` §14 (in full) and §8 (Live Preview,
folded in here since Live Preview is the Editing Engine's own Draft/Publish mechanism), during the
ADR-0003 migration (Phase 3).

**Scope note:** Tenant-OS-scoped (`TOS-XXX`), lives in `.claudedocs/adr/` alongside `ADR-000X` per
`ADR-0003.md` §4.

---

## 1. Context / Problem Statement

A real investigation of the dashboard's two "page editor" tabs (originally its own document,
`LIVE_PAGE_EDITOR_PLAN.md`, merged here per Salman's explicit direction) found both
`CanvasPageEditor.jsx`'s center canvas and the orphaned `PageBuilderTab.jsx` render a hand-built
mockup — confirmed by their full import lists, which pull **zero** components from
`components/dynamic-sections/`. Two section types (`featured_items`, `categories_grid`) render only
placeholder text, forever, regardless of real data. The actual production page (`DynamicPage.jsx`
→ `SECTION_MAP` → 10 real components) is a completely separate, working system these editors never
touch — a live Duplicate Architecture finding, and a direct violation of the Live Preview
principle below.

The first fix proposed (an iframe + click-to-select) was itself rejected by Salman for being tied
to one specific UI mechanism. His deeper point: the fix is not a better Page Editor — it is a real
architectural layer, because tomorrow there will be an AI Assistant, a Mobile app, a Public API,
possibly Voice, and all of them must reach the exact same editable data through the exact same
mechanism, or each new Interface reinvents its own.

## 2. Decision Drivers

- Design Principle 5 (One Capability, One Contract, One Service, One Source of Truth, Many
  Interfaces — `backend/architecture.md` §9) already forbids per-Interface reinvention; this
  decision applies it to the *editing* side of Capabilities, not just their storage.
- **Discoverability** — no Interface should need a developer to have separately told it where a
  given field (e.g. "Hero Title") physically lives.
- **The concrete test**: if a new Capability (e.g. Testimonials) is added tomorrow, how many files
  change? A design that requires touching a new Dashboard form, new AI intent-handling, a new API
  route, and a new Mobile screen has failed to decouple Interfaces from Capabilities.

## 3. Options Considered

**Option A — iframe + click-to-select over the existing hand-built canvases.** Rejected by Salman:
still one Interface's specific mechanism, not a shared one; doesn't help the AI/Mobile/API cases at
all.

**Option B — a bespoke editor form per section type** (today's real `CanvasPageEditor.jsx`
approach: `Click Section → Open HeroEditor`, field logic living inside `HeroEditor.jsx`). Rejected:
breaks the moment a non-click Interface (an AI instruction, an API call) needs the same field —
`HeroEditor.jsx`'s logic is simply unreachable from that path.

**Option C — Capability → Operation → Schema → Renderer, chosen.** Every Interface is only ever a
renderer of, or caller into, a Schema and a small fixed vocabulary of Operations — never an owner
of field-level business logic.

## 4. Decision

Adopt Option C.

### 4.1 The core correction

Direction reverses from today's `Click Section → Open HeroEditor` (UI-to-UI) to always starting
from the Capability side:

```
Capability  →  Operation  →  Schema  →  Renderer
```

- **Operation** — a small, fixed vocabulary of generic action types, not one bespoke action per
  field: `UpdateField` (text/richtext/number/boolean), `ReplaceMedia` (image/video),
  `ReorderList`, `ToggleVisibility`. Always addressed by `{capability, key}` — e.g.
  `{capability: "content", key: "hero.title", operation: "UpdateField", value: "..."}` — never by
  a page name or component name.
- **Schema** — each Capability declares once which keys exist and which Operation types apply to
  each. A generic form-renderer draws from this — not a bespoke `HeroEditor.jsx`/`OffersEditor.jsx`
  per section type.
- **Renderer** — each Interface only renders, or calls into, the same Schema and Operations. The
  Dashboard draws the Schema as inline-editable regions on the real rendered page. The AI reads the
  same Schema to know what an instruction like "change the hero title" needs, then calls the
  identical Operation-execution endpoint a click would have called. The API exposes Operation
  execution directly. A future Mobile app renders the same Schema natively. None contain
  field-level business logic — all of it lives once, in the Capability's Schema.

**The Engine is a dispatcher, not a second writer.** Given `{capability, key, operation, value}`,
it resolves which Capability owns that key and calls that Capability's one existing canonical
Service — never a parallel write path. An Engine that ever wrote directly to a Repository or DB
would itself become a Duplicate Architecture finding, the exact failure this decision exists to
prevent.

### 4.2 Discoverability — `EditableRegion`

`Page → Regions → Fields → Operations` — any editable page, section-driven or bespoke, exposes this
same tree to any Interface that asks. A developer marks a real piece of a page once, declaratively:

```jsx
<EditableRegion capability="content" key="hero.title">
  {children}
</EditableRegion>
```

This is a Contract, not merely a clickable wrapper: for a real visitor it renders its children
inertly, zero behavior change. For any editing context, it registers `{capability, key}` into a
Discovery registry that a Dashboard, an AI planning step, or a Mobile client all read identically.
An `EditableRegion` never contains a form, modal, or field-specific rendering logic — that's the
Renderer's job, driven entirely by the Capability's Schema.

### 4.3 The concrete test — adding Testimonials tomorrow

1. Define its Contract/Schema once (which keys exist, e.g. `items[].quote`, `items[].author`;
   which Operation types apply).
2. Mark up wherever testimonials already render (`TestimonialsSection.jsx`) with `EditableRegion`
   contracts. No new editor form file is written.
3. Its data needs exactly one real canonical Service — the same requirement every Capability
   already has, not new work created by the Engine.

The Dashboard's generic Schema-renderer, the AI's Schema-reader, the API's Operation endpoint, and
a future Mobile renderer all pick up Testimonials automatically — zero of them need new
Testimonials-specific code.

### 4.4 Applying it to the two real tracks

- **Section-driven tenants** (footlab, caracas, olivello): `DynamicPage.jsx`'s real `SECTION_MAP`
  components get `EditableRegion` contracts around their real fields. `CanvasPageEditor.jsx`'s
  per-section-type editor forms are retired in favor of one generic Schema-driven form renderer;
  both fake canvases (including the orphaned `PageBuilderTab.jsx`) are deleted entirely — its one
  worth-keeping idea, real `@dnd-kit` drag-reorder, folds into the `ReorderList` Operation's
  Dashboard renderer.
- **Bespoke tenants** (beit-al-fakhar): the exact same `EditableRegion` Contract, Discovery tree,
  and Operation-execution endpoint, placed directly around real Content in hand-built JSX. This is
  the second independent real case the Abstraction Rule (`team-roles.md`) asks for before treating
  a shared mechanism as earned — a data-driven page and a hand-built page both served by the same
  machinery.

### 4.5 Known Requirement — `ReplaceMedia` may need a Processing Pipeline

Confirmed by reading beit-al-fakhar's real Hero implementation
(`frontend/src/pages/beit-al-fakhar/sections/hero/`, the `frame-sequence-canvas` skill's reference
implementation): it is not a `<video>` tag. It scroll-scrubs real, pre-extracted video frames
painted onto a `<canvas>`, prepared entirely offline by hand (`ffmpeg`, then a hardcoded
`FRAME_COUNT` and Supabase URL in `walkthroughAssets.js`). No field, Service, endpoint, or
automation connects "a new video was uploaded" to "the frames get regenerated."

**Generalized principle**: `ReplaceMedia` is not always `file → URL`. For some fields it is
`file → Processing Pipeline → Derived Assets → Published Result`. The Interface's job stays "replace
the hero video" — whether that requires a pipeline afterward, and what it does, is entirely the
owning Capability's decision, invisible to every Interface.

| Asset | Pipeline after Upload? |
|---|---|
| Logo | Upload only |
| Product photo | Upload only |
| Hero video (frame-sequence Hero) | Upload **+ frame extraction** (today: manual `ffmpeg`, unautomated) |
| Gallery images (future) | Upload **+ thumbnail generation** |
| PDF/Catalog (future) | Upload **+ preview generation** |

**Not built now** — a named Gap (see `capabilities/media.md`), not a Sprint 3 deliverable. Sprint
2's real `ReplaceMedia` (`hero.bg_image`) remains a direct file→URL swap for the *generic*
`HeroSection.jsx` path and is explicitly not the same mechanism as beit-al-fakhar's bespoke Hero,
which has no Editing Engine integration today.

### 4.6 Live Preview — the Governance layer's Draft/Publish mechanism

Requirement, not optional. Built once at the Governance layer; every Capability inherits it
identically — no Capability designs its own. The architecturally sound approach: the preview must
render using the exact same public-facing components a real customer sees, not a second, parallel
"preview renderer" that could drift.

**A real, working precedent already existed before this was written down**: the Settings tab
already renders a real `<iframe src="/demo/{slug}">` — the actual production page, live, inside the
dashboard — with a working `postMessage` bridge pushing edited field values into it instantly, no
save/reload required (`GenericAdminDashboard.jsx:260-269`, `DynamicPage.jsx:216-233`). It carried
only 3 primitive fields (accent color, hero type, catalog layout) before the Editing Engine, but
the plumbing is exactly this principle, already real. The Engine generalizes this real foundation
to every Capability's editable fields rather than inventing a second mechanism beside it.

Whether draft/live is a `draft_config` column, a separate `is_published` flag, or something else is
deliberately not decided here — real schema work for a future Implementation Contract, gated by
whichever Capability needs Live Preview first proving the shape (Abstraction Rule).

### 4.7 The Admin/Public Contract split

The Editing Engine's write path and the Dashboard's live preview are not the same API surface —
architecture, not incidental plumbing. Elevated to its own platform-wide rule at
`backend/architecture.md` §10 (canonical statement, not restated here). Confirmed real by reading
the actual files: `content.py`/`media.py` sit under `app/api/v1/admin/`, gated by `require_roles`;
`DynamicPage.jsx` — rendered by both the live-preview `<iframe>` and every real visitor — imports
only `publicApi`, never `adminApi`. This is what makes the live-preview verification a genuine
end-to-end proof rather than a mock that could quietly drift from production:

```
Dashboard → Admin API → Draft Storage → (Publish) → Published Content → Public API → Visitors
```

Any Interface found reading/writing a Repository directly, or crossing this boundary, is a Broken
Architecture finding (see `capabilities/*.md`'s Open Findings, and the taxonomy this rule shares
with a Route bypassing its Service).

## 5. Single Source of Truth

This ADR for the Editing Engine's design (Capability → Operation → Schema → Renderer,
`EditableRegion`, Live Preview, the Admin/Public split). `capabilities/media.md` for the
`ReplaceMedia` Processing Pipeline Known Requirement as it applies specifically to the Media
Capability's own Open Findings.

## 6. Scope / Non-Goals

No message-payload shapes, no Schema file format, no Discovery-registry implementation, and no
decision on how `EditableRegion` technically registers itself (React Context, a build-time static
scan, a runtime call) are specified here — real Implementation Contract work for whichever
Capability builds this first.

## 7. Consequences

- `CanvasPageEditor.jsx` and `PageBuilderTab.jsx` are retired once a generic Schema-driven renderer
  replaces them.
- Every future Capability (Testimonials, FAQs, etc.) is added via Contract + `EditableRegion`
  markup only — no new per-Interface editor code, by construction, or that itself is a finding.
- Wiring beit-al-fakhar's Hero into the Engine later must account for the Processing Pipeline
  Known Requirement from the start, not copy Sprint 2's simpler shape and reintroduce the
  stale-frames bug this decision names explicitly.
