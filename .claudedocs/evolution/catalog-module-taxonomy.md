# Catalog Module Taxonomy — Evolution Log

Accumulating understanding of whether `CatalogCategory.moduleKey` (a plain `String`) stays
sufficient as a classification mechanism, or eventually needs to become a real Capability
Registry. See `.claude/rules/documentation-policy.md`'s "Architecture Evolution Log" section for
what this file is and isn't.

## 2026-07-28

### Current Status
`moduleKey` (`prisma/schema.prisma:402`) is currently a plain `String` with 4 known values today
(`catalog`, `store`, `booking`, `restaurant`), agreement maintained only by convention across
`catalog_service.py`, `store_repo.py`'s filters, and `CatalogTab.jsx`'s `MODULE_KEY_META` map. This
surfaced while shipping a fix that exposed `moduleKey` in the Generic Admin Dashboard's
`CatalogTab.jsx` (see `.claudedocs/reviews/rk-barber-store-products-verification.md`) — the field
itself already existed and worked; the Admin UI simply never let a tenant admin set it.

### Observation
No production issue has resulted from this yet — all current consumers agree on the same 4 values,
confirmed real and working end-to-end (the `store`-moduleKey filter path was verified live for RK
Barber the same session this was noticed).

### Watch Point
If additional capability types continue to appear (e.g. `membership`, `giftcard`), evaluate whether
a typed registry or Capability Contract should become the canonical source, rather than a plain
string agreed upon only by convention across three independent files. Related but distinct from
`platform-services-catalog.md`'s `PlatformService` SSOT problem — that entity classifies which SaaS
module a *tenant* subscribes to; this one classifies a *CatalogCategory* within one tenant. Worth
comparing notes if either is ever promoted. No concrete second/third real drift case exists yet
(unlike `platform-services-catalog.md`, which already has 4 independently-drifting copies as real
evidence) — this entry is a watch-point, not a proposal.

### Decision
No action.

### Promoted?
No — explicitly a "not now" watch-point, not a proposed change.
