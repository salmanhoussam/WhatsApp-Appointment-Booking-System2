# TENANT_LIFECYCLE_PLAN.md — Tenant Lifecycle & Subscription Domain Architecture

**Status:** Design only. No code, schema, or migration in this document. This is a Domain-Driven design reference — the basis for a future ADR-0002 and its own Implementation Contract, per `.claude/rules/documentation-policy.md`.

**Relationship to ADR-0001:** ADR-0001 (`.claudedocs/adr/ADR-0001.md`) answers *"is this tenant allowed to use the platform right now?"* — pure security enforcement on `Client.status`, already implemented and archived. This document answers a different question: *"what happens to a tenant's account over time — from discovery to long-term subscription management?"* Security and Domain/Business concerns are deliberately kept separate; ADR-0001's enforcement mechanism is not modified by anything below.

---

## Introduction — Four Independent Concepts, Not One `status` Field

The single biggest risk in this domain is letting one `status` field carry more than one meaning — exactly what happened accidentally with `Client.status` today, which mixes an administrative concept (suspended) with a lifecycle concept (trial). This design enforces a hard separation into four independent concepts, each owned by its own field/entity, never merged:

- **Tenant Status** — is the account itself technically usable? (`active` / `suspended`). Purely administrative, Super Admin-controlled. This is the *only* thing ADR-0001 enforces today, and the only concept `Client.status` should represent going forward.
- **Account Lifecycle State** *(not "Subscription Status" — see rationale below)* — where is the account in its lifecycle journey? (`trial` / `paid` / `grace_period` / `expired` / `cancelled` / `archived`). `trial` is a lifecycle stage, not a subscription — a tenant in `trial` has no paid subscription yet, so calling this field "Subscription Status" would itself repeat the status-mixing mistake this design is trying to avoid.
- **Payment Status** — the state of the most recent payment transaction (`pending` / `paid` / `failed` / `refunded`). Independent because a single failed payment does not necessarily end the account lifecycle immediately (see `grace_period`).
- **Onboarding Status** — how far along initial setup is (`not_started` / `in_progress` / `completed`). Independent because a tenant can be `trial` (lifecycle) while still `in_progress` on onboarding — these are not the same axis.

`Client.status` today is reinterpreted as **Tenant Status only** going forward. The `trial`/`demo` values currently stored in that same field are, in reality, Account Lifecycle State values that were mixed into the wrong field — separating them is the first real implementation decision ADR-0002 will need to make (not decided here).

---

## Phase 0 — Business Principles

Principles that govern every future decision in this domain, meant to remain a durable reference:

1. **Single Source of Truth** — each concept (Tenant Status / Lifecycle State / Payment Status / Onboarding Status) has exactly one owning field, never duplicated.
2. **Event-Driven** — transitions are triggered by documented events (see Phase 1), not by scattered direct status writes across the codebase.
3. **Configuration over Hardcoding** — any duration or threshold (trial length, grace period, reminder timing) is configurable, never hardcoded. This directly addresses today's real inconsistency: 14 days in `registration_service.py` vs. 7 days in `demo_service.py`, with no shared source of truth.
4. **Immutable Audit Trail** — every status change is recorded in a way that cannot be edited after the fact, building on the existing `SecurityAuditLog` pattern.
5. **No Status Mixing** — no single status field ever carries more than one meaning (the core rule this whole document exists to protect).
6. **Business Rules Live in Domain Services** — transition logic lives in one owning service (see Domain Ownership below), not scattered across routes or duplicated between `registration_service.py`/`demo_service.py`/`onboarding.py` as it is today.
7. **Automation Must Be Deterministic** — any automated job (trial sweep, reminders) must be idempotent — re-running it must never produce duplicate side effects.

---

## Phase 1 — Domain Discovery

### Entity chain

```
Tenant → Subscription → Plan → Payment → Invoice
              ↓
         Usage Records
```

- **Tenant** (= today's `Client`): the root entity. Owns Tenant Status only.
- **Plan**: an independent definition of what's being sold (Basic / Professional / Enterprise) — price, usage limits, enabled features. Partially foreshadowed by the existing `PlatformService.monthlyPrice`, but as an independent, assignable entity — not a free-text field like today's `Client.tier`.
- **Subscription**: the actual time-bound relationship between a Tenant and a Plan — carries Account Lifecycle State, start/end dates, whether it's currently trial or paid. A separate entity from Tenant itself (allows a future history of subscriptions/plan changes over time, not just a single current value).
- **Payment**: a single payment transaction tied to a subscription — status, amount, method, date.
- **Invoice**: a financial document tied to a transaction/billing period — separate from Payment because one invoice may be covered by more than one payment attempt.
- **Usage Records** *(new concept, not present anywhere in the codebase today)*: consumption measurements tied to the subscription, not directly to billing — Storage Used, AI Tokens, WhatsApp Messages, Bookings Count, Employees, Branches. Documented here as a Domain concept even without immediate implementation, because future subscription decisions (plan limits, automatic upgrade prompts, overage warnings) depend on it existing.

### Events

`TenantRegistered`, `OnboardingCompleted`, `TrialStarted`, `TrialReminderDue`, `TrialExpired`, `PlanSelected`, `SubscriptionCreated`, `PaymentReceived`, `PaymentFailed`, `SubscriptionRenewed`, `SubscriptionCancelled`, `UsageThresholdReached`, `TenantSuspended`, `TenantReactivated`.

---

## Phase 2 — State Machine

### Account Lifecycle State
`trial → paid → grace_period → expired → cancelled → archived`

### Tenant Status (fully independent)
`active ↔ suspended`

For each transition (to be tabulated in full at ADR-0002 implementation time): allowed/forbidden, automatic (event/cron) vs. manual (Super Admin), and who has authority. Representative examples already implied by existing code and business intent:
- `trial → expired`: automatic, triggered by `trial_ends_at` passing (no such automation exists today — see Phase 3).
- `suspended → active`: manual only, Super Admin exclusively — matches today's actual `PATCH /clients/{id}/status` behavior.
- `expired → cancelled`: automatic after an unactivated grace period (grace period itself not yet enabled anywhere today).

Payment Status and Onboarding Status each have their own small, independent state machines — neither intersects with the two above.

---

## Phase 3 — Automation

- **Reminder Engine** (trial reminders, e.g. 3 days before expiry and on the expiry day) — via the notification channels that already exist: `app/services/whatsapp_service.py` (`send_text`/`send_interactive_buttons`) and `app/services/email_service.py` (same pattern as the existing `send_welcome_email`).
- **Trial/Grace Expiration Sweep** — designed on the existing `app/api/v1/super/maintenance.py` pattern (external Railway cron hitting a `require_super_admin`-protected endpoint), rather than introducing a new in-process scheduler. **Must be idempotent** per Business Principle 7.
- **Renewal Reminders, Billing Events** — future, tied to a payment provider not yet chosen (see Phase 5).
- Explicitly documented: no internal scheduler exists today (no APScheduler, no Celery) — any new automation follows the existing external-cron-plus-protected-endpoint pattern unless a separate, explicit business decision says otherwise.

---

## Phase 4 — Super Admin Operations *(conceptual only — full detail in the upcoming `SUPER_ADMIN_DASHBOARD_PLAN.md`)*

Subscription Dashboard, Billing Dashboard, Tenant Timeline (built on `SecurityAuditLog` once a read path is added — it is write-only today), Payment History, Manual Override, Trial Extension, Suspend/Reactivate. Each operation maps to an existing endpoint where one already exists (e.g. Suspend/Reactivate today already works via the existing `PATCH /clients/{id}/status`) or is flagged as a gap requiring a new endpoint.

---

## Phase 5 — Future Architecture

Stripe / MyFatoorah / HyperPay / PayPal, VAT, Coupons, Multi-Plans, Annual Billing, Enterprise Contracts, **+ Usage-Based Billing** (built on the Usage Records concept from Phase 1). All conceptual only — no payment provider is chosen in the codebase today, and this phase explicitly requires a separate human business decision before any detailed design, matching the discipline already used for ADR-0001 §8.

---

## Domain Ownership

Maps each concept to a single owning service — a service, not a person — so future changes to subscription logic go to one known place instead of repeating today's spread across three onboarding files.

| Concept | Future owning service | Today's actual state |
|---|---|---|
| Trial / Lifecycle State | `subscription_service` (new) | Scattered across `registration_service.py`/`demo_service.py` |
| Subscription / Plan | `subscription_service` (new) | Does not exist today |
| Payment / Invoice | `billing_service` (new, Phase 5) | Does not exist today |
| Onboarding | `registration_service.py` + `onboarding.py` (to be unified) | Exists, split across two paths |
| Notifications (Trial/Renewal) | Built on existing `whatsapp_service.py`/`email_service.py` | Channels exist; scheduling logic does not |
| Automation (sweep jobs) | New endpoints under `super/`, following the `maintenance.py` pattern | Pattern exists for one other module (Dating) only |
| Tenant Status (Security) | `app/core/tenant.py` (ADR-0001, unchanged) | Complete, fully separate from this domain |
| Usage Tracking | Not yet assigned (Future) | Does not exist today |

---

## Backend Modules Expected to Change (future work, not this document)

`prisma/schema.prisma`; `app/services/registration_service.py`, `demo_service.py`, `onboarding.py` (unification); `app/api/v1/super/clients.py` (splitting today's single `PATCH status` into the separated fields); `app/core/tenant.py` (unchanged — keeps reading Tenant Status only); new files likely: `subscription_service.py`, later `billing_service.py`; `app/services/security_audit_service.py` (adding a read path).

## DB Fields/Models Expected to Evolve

`Client.status` → becomes Tenant-Status-only; new models: `Subscription`, `Plan`, `Payment`, `Invoice`, `UsageRecord` (future); `Client.tier` → likely becomes a relation to `Plan` instead of a free-text field; a new Onboarding Status field/model.

## Values That Must Stay Configurable

Trial duration (today inconsistent: 14 days in one path, 7 in another), reminder timing, grace period length, usage thresholds, plan pricing.

---

## Non-Goals

This document does **not** design or decide:
- Specific payment gateway integration details (Stripe / MyFatoorah / HyperPay / PayPal) — conceptual only, per Phase 5.
- Any actual Dashboard frontend/UI.
- Pricing strategy or discount mechanics.
- VAT/tax rules or calculation.
- Any code implementation or actual schema change — all of that waits for a separate Implementation Contract after this design is approved, per the workflow in `.claude/rules/documentation-policy.md`.

---

## Grounding — everything above matches the codebase as of 2026-07-18

`Client.status`/`tier`/`trial_ends_at` (`prisma/schema.prisma`), `ClientService`, `app/services/registration_service.py` (14-day trial), `app/services/demo_service.py` (7-day trial), `app/api/v1/onboarding.py` (WhatsApp/n8n onboarding path), `app/api/v1/super/clients.py` (manual status PATCH), `app/api/v1/super/maintenance.py` (existing cron pattern), `app/services/whatsapp_service.py`, `app/services/email_service.py`, `app/services/security_audit_service.py` (write-only today).
