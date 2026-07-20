# Decision — Billing method is manual/cash only, no payment gateway

**Date:** 2026-07-20 · **Owner:** Salman

## Decision

The platform's only billing method, for now, is manual/cash tracking — Salman updates each
tenant's payment status himself. No integration with an external payment gateway (Stripe,
PayPal, local providers) is being built.

## Why this fits `decisions/`, not a new ADR

It changes no files' behavior and creates no new enforcement mechanism — the Domain Layer
(`TENANT_LIFECYCLE_PLAN.md`'s Subscription/Plan/Payment entities) already treats payment as
state tracked on the tenant record, not as something requiring a live gateway integration to
function. This decision confirms that stays true; it doesn't change it. If a gateway integration
is decided later, that gets its own ADR — this note explicitly does not pre-approve one.

## Consequence

Per this decision, the Domain Layer is considered stable enough to build against. This removes
the blocker noted in `.claudedocs/architecture/SUPER_ADMIN_DASHBOARD_PLAN.md` and
`TENANT_LIFECYCLE_PLAN.md` for starting Super Admin Dashboard work — but building it is not
scheduled yet. Per Salman's own explicit sequencing (2026-07-20): finish the Restaurant template
(current work) first, then Store, then Clinic, then the Dashboard. This note only removes the
gate; it does not move the Dashboard up the queue.
