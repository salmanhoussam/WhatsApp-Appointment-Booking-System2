# ADR-0002 — Verification: Final Closure (First Slice)

Summarizes Phases 1–4 (see `ADR-0002_PHASE_1.md` through `ADR-0002_PHASE_4.md`) and the Post-Implementation Review (`.claudedocs/reviews/ADR-0002_POST_IMPLEMENTATION_REVIEW.md`).

## What was built
`Client.lifecycle_state` (schema), Hard Block (`suspended`, unchanged) / Soft Block (`expired`, new, allowlist-based via `Depends(allow_during_soft_block)`) split in `app/core/tenant.py`, the `super/clients.py` PATCH split into independent `status`/`lifecycle` endpoints, Settings as the first live Soft Block consumer, unified 14-day trial creation across both onboarding paths, and a one-time migration script — run for real against the live database.

## Final status, unlike ADR-0001's closure narrative
ADR-0001 declared closure once, found a real implementation gap via its Post-Implementation Review, fixed it, then closed again. ADR-0002's first slice went straight to the Post-Implementation Review before any closure claim — that review still found and closed 2 real gaps (cache correctness via the actual PATCH endpoints, end-to-end onboarding regression) that hadn't been exercised during the original implementation passes, and surfaced one gap that could not be closed after the fact: the live migration ran without a staging rehearsal or an explicit pre-migration snapshot, both required by the Implementation Contract. That gap is carried forward as an explicit process lesson, not resolved by this document — see the review's §3.

## Result
Ready to Archive, per the Post-Implementation Review's final recommendation. Remaining domain work (Subscription/Plan, Payment/Invoice, Usage) is future, separately-scoped work under `TENANT_LIFECYCLE_PLAN.md` / future ADRs — not part of this slice's closure.
