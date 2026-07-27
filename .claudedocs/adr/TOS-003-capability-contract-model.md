# TOS-003 — Capability Proposal Gate & the Capability Contract Model

**Status:** Decided. Extracted from `TENANT_OS_PLAN.md` §12 (Capability Proposal, in full) and
§13's own meta-decision (that Capability Contracts exist, and what they must contain), during the
ADR-0003 migration (Phase 3). **The individual Capability contents themselves (Catalog, Category,
Media, Site Configuration, Content, Orders, Customers) are not in this ADR** — those are real,
living data that changes every Sprint, and live in `capabilities/*.md` (Phase 5), not in a decision
record.

**Scope note:** Tenant-OS-scoped (`TOS-XXX`), lives in `.claudedocs/adr/` alongside `ADR-000X` per
`ADR-0003.md` §4.

---

## 1. Context / Problem Statement

Architecture (the Capability/Interface/Governance anatomy, `TOS-001`) was already well covered
before this decision, but a different question was still unanswered: **who decides a new idea
deserves to become a Capability at all**, before any Architecture or Contract ever applies to it?
Salman's own framing: this is a Product Governance question, not an Architecture one — deliberately
not drawn as a fourth branch of `TOS-001`'s anatomy diagram, since it precedes that anatomy rather
than living inside it.

A second, related ambiguity: this codebase already uses the word "Service" for two different
things — the Service Execution Constitution's autonomous-agent "Service" (`tenant-seeder` and its
siblings) and `service-system.md`'s per-tenant feature-flag "Service" (`client_services.serviceKey`).
"Capability" needed to be established as a clearly third, different sense, to stop the terms from
colliding in future documentation.

## 2. Decision Drivers

- Every future Capability (Coupons, Inventory, CRM, Loyalty, or anything else) needs a consistent,
  repeatable admission test — not an ad hoc judgment call made differently each time.
- A cheap sanity check on the gate itself: it must actually be capable of confirming a real,
  already-accepted Capability (Catalog) passes it, or the gate is theoretical.
- Terminology collision (three different senses of "Service"/"Capability" in one codebase) must be
  resolved once, explicitly, rather than left to cause confusion in every future Capability
  writeup.

## 3. Options Considered

**Option A — no formal gate; a Capability is whatever a developer decides to build.** Rejected:
this is the status quo the gate exists to replace; it doesn't scale as more Capabilities
(Loyalty, Coupons, etc.) get proposed, and gives no way to catch "this should be an extension of
an existing Capability" before a redundant Contract gets written.

**Option B — a five-question Capability Proposal gate, chosen.** Every future Capability must
answer five questions before a Contract is written.

## 4. Decision

Adopt Option B.

### 4.1 The Capability Proposal Gate

Every future Capability must answer these five questions before a Contract (§4.3 below) is
written:

1. **What problem does this solve, and for whom?** Not "what does it do" — whose real need does it
   answer.
2. **Is this a new Capability, or the extension of an existing one?** Most ideas are the latter; a
   genuinely new Capability is the exception, not the default.
3. **Will more than one Interface need it?** Dashboard, AI, API, Mobile. If only one Interface will
   ever call it, it is probably not a Capability at all — more likely Interface-specific UI logic
   that doesn't need its own Contract/Service/Repository chain.
4. **What is the Source of Truth?** If this cannot be named clearly, implementation does not start
   — the same admission requirement the platform-wide Single Source of Truth rule
   (`backend/architecture.md` §9) already applies, at proposal time rather than discovered after
   the fact.
5. **How will the client — not the developer — measure whether it succeeded?** A technical
   definition of done is not sufficient on its own.

If these five cannot be answered, the Capability is not ready, regardless of how good the idea is
otherwise. This is the concrete content of the Capability Lifecycle's "Idea" stage
(`Idea → Contract → Implementation → Interface → Governance → AI Access → Review`, see
`TENANT_OS.md`): an Idea only becomes eligible to move to "Contract" once all five are answered.

### 4.2 Applying the gate retroactively — Catalog as the sanity check

| Question | Catalog's answer |
|---|---|
| Problem, for whom? | Tenants need to list distinct sellable items with prices and photos, for their own customers to browse and order |
| New or extension? | Was genuinely new (the Phase 54 unification that replaced separate Menu/Store models) |
| More than one Interface? | Yes — Dashboard is real today; AI and a tenant-authoring API are named, reserved future consumers |
| Source of Truth? | `CatalogItem`/`CatalogCategory` — unambiguous |
| Client's own success measure? | "I can list a real product, and a real customer can find and buy it" — non-technical, checkable |

Catalog passes cleanly — real confirmation the gate isn't purely theoretical.

### 4.3 The Capability Contract Model

Disambiguating a third, different sense of "Capability"/"Service" in this codebase: a **Tenant OS
Capability** is a named, interface-agnostic unit of what a tenant can do (Catalog, Category, Media,
Site Configuration, Content, Orders, Customers). The word "Service" is reserved for the one
canonical write-path module each Capability owns internally (`TOS-001`'s tree: Contract → **Service**
→ Repository → Database) — never used loosely for the Capability itself, to avoid colliding with
the Service Execution Constitution's autonomous-agent "Service" or `service-system.md`'s
feature-flag "Service."

Every Capability Contract, once written, must document, per the Capability/projection framing
confirmed by Salman while reviewing this exact design: **the Capability Contract is the parent;
Admin behavior and Public behavior are two projections of it, not independent contracts.**
Concretely, each Capability file must contain:

- **Ownership** — which real fields/models it owns, and (where relevant, e.g. Site Configuration)
  an explicit Ownership Matrix disambiguating it from neighboring Capabilities.
- **Contract** — its real sub-capabilities (create/edit/delete/reorder/etc.), each marked against
  what was actually verified, not proposed — a **Gap** means a real, intended piece with no
  mechanism yet, not a suggestion to build it now.
- **Operations** — which Editing Engine Operation types (`UpdateField`, `ReplaceMedia`,
  `ReorderList`, `ToggleVisibility`, per `TOS-002`) apply to which of its fields.
- **Schema** — what a generic Dashboard/AI/Mobile renderer draws from for this Capability.
- **Admin projection** — the write-side Contract (`backend/architecture.md` §10).
- **Public projection** — the read-side Contract (`backend/architecture.md` §10).
- **Maturity** — a real, current status, not aspirational.
- **Open Findings** — any live Architecture Integrity finding specific to this Capability.

This structure is what makes each `capabilities/*.md` file self-sufficient — a reader should never
need to cross-reference a retired planning document for a Capability's real, current facts.

## 5. Single Source of Truth

This ADR for the Capability Proposal gate and the Contract model's required shape. Each individual
Capability's own real Contract content lives in exactly one place: `capabilities/<name>.md`
(Phase 5) — never duplicated here or anywhere else.

## 6. Scope / Non-Goals

The actual per-Capability tables (Catalog's real sub-capability statuses, Site Configuration's
Ownership Matrix and Known Boundary Debt, Media's real Gaps, etc.) are explicitly out of scope for
this ADR — they are live, Sprint-by-Sprint data, not a one-time decision, and belong in
`capabilities/*.md`.

## 7. Consequences

- No future Capability gets a Contract written before its five-question Proposal is answered.
- "Service" is never used loosely for a Tenant OS Capability going forward — only for the one
  canonical write-path module inside it.
- Every Capability file inherits the same required shape (Ownership, Contract, Operations, Schema,
  Admin/Public projections, Maturity, Open Findings) — no Capability invents its own document
  structure.
