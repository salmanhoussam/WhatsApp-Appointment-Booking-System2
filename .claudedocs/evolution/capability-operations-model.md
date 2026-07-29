# Capability → Operations → Interfaces — Evolution Log

Accumulating understanding of how a Capability's Contract should actually be described. See
`.claude/rules/documentation-policy.md`'s "Architecture Evolution Log" section for what this file
is and isn't — entries accumulate here across sessions; promotion to a real ADR only happens once
the understanding has stabilized through multiple independent real implementations.

## 2026-07-29

### Context

Site Configuration Sprint 3, Phase 3 planning — deciding which Site Configuration fields should be
wrapped in `EditableRegion` for inline click-to-edit versus left as Dashboard form controls.

### Discovery

Salman's correction, generalized from the specific Phase 3 decision: **the Editing Engine is an
optional presentation layer over a Capability, not the Capability itself.** A Capability may expose
some Operations through inline editing (`Rendered Content → Inline Editing`) and others through a
Dashboard control (`Global Configuration → Dashboard Controls`) while both share the exact same
backend Contract. Forcing every field through `EditableRegion` — as Phase 3's first draft implied
for Theme tokens — would have been wrapping Configuration in a presentation mechanism built for
Content, not because the mechanism fits, just because it existed.

Alongside this, a second, related correction: describing a Capability's Contract as "Capability →
Fields" undersells what's already been proven. Three real Operation types already exist across
Content/Media (`UpdateField`, `ReplaceMedia`, and Story Experience's own processing-pipeline
shape — not a Field edit at all). Site Configuration's write behavior is a fourth,
`UpdateConfiguration` — distinguished from `UpdateField` specifically by its primary Interface
being a Dashboard control rather than inline rendered-content editing.

### Current Understanding

A working three-layer model, stated for the first time here, not yet ratified:

```
Capability
    ↓
Operations       (UpdateField, ReplaceMedia, Story Experience's pipeline, UpdateConfiguration, ...)
    ↓
Interfaces       (Inline, Dashboard, Processing, API)
```

This explains, rather than special-cases, why Content uses Inline, Media uses Processing (its
`ReplaceMedia` pipeline), and Site Configuration uses Dashboard — all three are still one
Capability model underneath, differing only in which Interface(s) their real Operations expose.
Not yet a rule: which Interface(s) an Operation type gets is still decided per-Capability by
judgment (Brand name inline, Theme tokens dashboard), not by a formal lookup table.

### Open Questions

- Does every real Operation type need exactly one canonical Interface, or can one Operation
  legitimately expose more than one (e.g. a field editable both inline and from a Dashboard form)?
  Only Site Configuration's `UpdateConfiguration` (Dashboard-only so far) and Content/Media's
  Inline-only Operations exist as real cases — not enough to answer this yet.
- Should `Interfaces` become a real, named field on each Operation type's definition (schema-level,
  checkable), or stay a descriptive category humans/agents reason with, the way `Capability →
  Fields` used to?

### Promoted?

No — Salman's own framing: this is "one of the most important ideas that will enter the Capability
Architecture ADR later, once it matures more." Explicitly logged here rather than written into a
rule file now, per this project's own Abstraction Rule (`rules/team-roles.md`) — one real case
(Site Configuration's `UpdateConfiguration`) is not yet the second/third independent proof this
project's own promotion threshold requires.

## 2026-07-29 (same day, later — Phase 3 execution)

### Context

Executing Phase 3: investigating where `Client.name_ar` (Brand Name) actually renders on the real
generic public page, to wrap it in `EditableRegion` per the entry above's own example ("Brand name
inline, Theme tokens dashboard").

### Discovery

No real rendered surface exists. The only two places `name_ar` appears in `DynamicPage.jsx` are a
demo-only `TrialRibbon` (never shown for a real tenant) and an empty-page fallback (only shown when
zero sections exist). Making it Inline Editable would have required creating a rendered surface
*for the sake of the test* — the reverse of this project's standing discipline (never build ahead
of a real, proven need). Not executed; reported as a finding instead.

### Current Understanding — revises the entry above's example, doesn't discard it

**Finding**: Inline editing is not a capability requirement. It is a property of a rendered
surface. Capabilities that do not naturally render on the public page remain Dashboard-only until
a legitimate public surface exists.

This is not a bug and not a TODO — it's the same architectural line the entry above already drew
(Content → Rendered Content → Inline; Configuration → Global Configuration → Dashboard), now
confirmed by a real negative case rather than assumed from a general principle. `Client.name_ar`
stays Site Configuration's (Brand), unchanged — Brand is real and used elsewhere (Dashboard,
browser title, metadata, share cards, search, email templates) even on pages whose body never
literally renders it. The Editing Engine's actual goal was never "everything Inline" — it's
"everything edited from its most suitable Interface," and Site Configuration having zero Inline
Operations today is exactly what that goal predicts, not an exception to it.

```
Content              Dashboard ✅   Inline ✅
Media                Dashboard ✅   Inline ✅
Site Configuration    Dashboard ✅   Inline ❌ (unless a real public surface exists)
```

### Open Questions

- If a real Brand-display surface is ever added to the public page, does it become Inline then, or
  does Brand stay Dashboard-only by design regardless? Not yet decided — depends on whether such a
  surface is ever built for a real product reason, not for this finding's sake.

### Promoted?

No — same reasoning as the entry above. This sharpens that entry's own open question about
Interfaces rather than closing it.

## Related

- `.claudedocs/adr/TOS-002-editing-engine.md` — where `UpdateField`/`ReplaceMedia` were first
  named as real Operation types; this entry's `UpdateConfiguration` is the natural fourth.
- `.claudedocs/architecture/capabilities/site-configuration.md` — the Capability this insight came
  from applying in practice.
- `.claudedocs/reviews/site-configuration-phase3-verification.md` — the real investigation
  (`DynamicPage.jsx` read directly) behind the second entry's Discovery.
