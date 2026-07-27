# P-001 — Dashboard-First Principle

**Tenant OS Principle** — genuinely new, no home in `.claude/rules/`. Extracted from
`TENANT_OS_PLAN.md` §3, point 4, during the ADR-0003 migration (Phase 4).

## The Principle

Every future feature, before it is considered finished, must answer one question:

> **How will the client edit this a month from now, without a developer?**

If there is no answer, the feature is incomplete — regardless of how well it works or how good it
looks.

## What This Means Concretely

For a new Hero: it is not enough that it renders. Before it ships, it must be clear where the
client changes the image, the headline, the video, the button, and the Hero's order relative to
other sections.

For a new Product Page: the real test is never "is this page beautiful?" — it is **"can the client
create a new product from the dashboard and have it appear on this exact page, with zero developer
involvement?"** If yes, the architecture is correct. If no, the Product Page — however polished —
is not actually done.

## "Dashboard" Means Any Capability Consumer, Not Only the Dashboard UI

The name no longer implicitly means "...from the Dashboard" alone. It means "...from *any*
Capability consumer" — the Dashboard today, an AI assistant or the public tenant-authoring API
tomorrow. A feature whose only answer is "there's a button in the Dashboard" has coupled a
Capability to one Interface, which the Tenant OS anatomy (`TOS-001`) says not to do.

## Why This Is Permanent, Not Sprint-Specific

This is not a checklist item for one feature — it is the standing definition of "done" for
anything touching tenant-facing Content or Structure, for as long as Tenant OS exists. A feature
built without a real editing path accumulates exactly the cost this whole system exists to remove
(see `TOS-001`'s Problem Statement): a developer stuck fixing tenant content by hand, forever.

## Related

- `TOS-001-tenant-os.md` — the Tenant OS decision this principle is one of five for.
- `TOS-002-editing-engine.md` — the real mechanism ("any Capability consumer") that makes this
  principle enforceable rather than aspirational.
- `P-002-content-vs-structure.md` — the layer test this principle applies to (Content only; a
  Platform/Template answer means the feature needs a developer by design, not a gap).
