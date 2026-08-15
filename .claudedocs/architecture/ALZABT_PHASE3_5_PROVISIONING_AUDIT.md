# Phase 3.5 — Provisioning Foundation Audit (Read-Only)

**Status:** Audit only. **No code, no DB, no migrations, no fixes.** Answers all 10 questions with
real evidence, re-checked against the actual code and against `TENANT_LIFECYCLE_PLAN.md` /
`.claude/rules/tenant-onboarding.md`, not just this arc's own prior documents. Several real findings
below are not clean — reported honestly, not softened.

---

## 1. Is `provisioning_status` actually compatible with TENANT_LIFECYCLE and the Completion Gate?

**Not fully reconciled — a real, named overlap, not previously checked against this document.**

`TENANT_LIFECYCLE_PLAN.md` (2026-07-18, design-only, never implemented) already names **four**
independent concepts a tenant's state should be split into, one of them being:

> **Onboarding Status** — how far along initial setup is (`not_started` / `in_progress` /
> `completed`). Independent because a tenant can be `trial` (lifecycle) while still `in_progress`
> on onboarding.

`provisioning_status` (`pending`/`complete`/`failed`) is the **same conceptual axis** — "how far
along is this tenant's setup" — implemented independently, in a different field, with a different
vocabulary (`failed` has no equivalent in the planned Onboarding Status at all), without ever
checking against this already-designed concept. Nothing is *broken* — `TENANT_LIFECYCLE_PLAN.md`
was never built — but this is exactly the kind of drift this project's own documentation discipline
exists to prevent: a second status concept invented without reconciling it against an
already-designed one covering the same ground. Named here as a real, standing question, not
resolved.

**Completion Gate compatibility** — checked directly against `tenant-onboarding.md`'s own, already-
ratified definition of "Onboarding Completed":

```
Client → User → Services → Settings → Page Content → Media → Public Page renders → Dashboard renders
```

`provisioning_status = 'complete'` certifies only **Client → User → Services → Domain Data**. It
does **not** certify Page Content, Media, Public Page rendering, or Dashboard rendering — a strictly
narrower claim than "Onboarding Completed." **This is a real naming risk**: `provisioning_status`
sounds like it should mean the same thing `tenant-onboarding.md`'s Completion Gate means, and it
does not. Anyone reading `provisioning_status='complete'` as "this tenant's onboarding is done" per
the existing rule would be wrong.

---

## 2. Can a tenant become "complete" while its Tenant Home page is still empty?

**Yes, confirmed, by design (deliberately deferred, but real).** `provision_vertical_domain_objects()`
never touches `Client.config.content.sections[]`. A self-registered Barber tenant reaching
`provisioning_status='complete'` today has real bookable staff/services and **zero page sections** —
structurally identical to `alzabt-demo`'s own already-documented bare state from earlier this
session. This was named explicitly as an accepted, scoped gap (Page Repertoire deferred to Section
System P3) — re-confirmed real here, not new, but this audit's own Q1/Q2 together sharpen the risk:
**`provisioning_status='complete'` must never be read as "this tenant is ready to show a customer."**
It means "this tenant can be booked," nothing about what a visitor sees.

---

## 3. Is domain provisioning genuinely vertical-neutral, or are Barber assumptions hidden?

**The dispatch mechanism is clean — confirmed by direct search: zero occurrences of the string
`"barber"` anywhere in `app/api/v1/admin/provisioning.py`.** Dispatch is purely by
`staff_backing_model`; an unsupported model raises a clear, honest error rather than guessing.

**One real, not-yet-tested assumption found in the request *shape* itself, not the dispatch code**:
`DomainObjectsProvisionRequest` hardcodes "exactly one `staff_name`" — a single staff member per
registration. This matches Barber's own real shape (Demo Builder, RK, Ali all start with 1-2
barbers) and was a deliberate minimality choice (Salman's own "least amount of data" instruction).
But it has never been checked against Clinic's real shape — a self-registering clinic might
reasonably want to name more than one doctor at once. **Not a bug** (Barber is the only real
vertical today, so nothing is wrong yet) — named because "vertical-neutral" was checked at the
dispatch-code level and confirmed, but the *request schema's* own single-staff-member shape has not
been independently verified as vertical-neutral, only as Barber-correct.

---

## 4. Is delete-then-recreate safe if it fails mid-retry?

**Sequential retries: yes, confirmed safe by direct trace.** Any partial state left by a failed
attempt (a Barber created, services not yet) is fully cleaned by the next attempt's
`delete_barbers_by_client()` + `delete_categories_by_client()` before recreating — traced through
every failure point in the sequence, including a failure in the final status-write itself (leaves
real rows correctly created but status not yet `'complete'`; a subsequent retry safely rebuilds them
rather than leaving anything inconsistent — redundant work in that one edge case, not incorrect
work).

**A real gap found, not covered by the design: concurrent retries.** Nothing in
`provision_vertical_domain_objects()` locks or checks-then-acts atomically — two simultaneous calls
for the same `client_id` (a genuine double-submit, not sequential) could both pass the
`status != 'complete'` check before either finishes, both delete, both create, producing duplicate
Barber/Service rows. The frontend's own submit button is disabled during submission
(`disabled={isSubmitting}`), which prevents an accidental double-click from the same browser tab —
but nothing server-side prevents a genuine concurrent call (a second tab, a retried network request
racing the first, a deliberate duplicate call). **A real, unaddressed risk**, not previously named.

---

## 5. Is Self-Registration genuinely a "Ready Tenant" per the Contract's own definition?

**Yes — the 4-of-5 definition the Contract itself scoped is met, confirmed by this session's own
live evidence**: Client ✅, Vertical ✅, Capabilities ✅, Domain Data ✅ (real Barber, real priced
services, real bookable link, verified live). Page Repertoire (the 5th) is the one deliberately
deferred part — "Ready Tenant (v1)," exactly as named, not the full bar. Consistent, no gap here
beyond what was already, explicitly scoped.

---

## 6. Any inconsistency between `vertical`, `client_services`, `service_type`, `templateKey`?

**One real, already-known, deliberately-unfixed inconsistency remains**: `service_type` for a
self-registered Barber tenant is still `'services'` — the original Break-A bug
(`MODULE_TO_VENUE.catalog → 'services'`) was never fixed, only worked around by adding `vertical` as
a parallel, correct field. This was an explicit, named decision (`ALZABT_VERTICAL_IMPACT_AND_MIGRATION_ANALYSIS.md`'s
Migration Plan Step 6 — retirement is "a separate, later decision"), re-confirmed still true, not a
new finding. `templateKey` is set correctly (`'beauty-barber'`, via Step 2's unconditional
`PATCH /admin/settings` call) and `client_services` is correctly Registry-driven — both consistent
with `vertical`. The one live inconsistency is `service_type` alone, already known, already
deliberately deferred.

---

## 7. Can the frontend get stuck in a pending/idle state if provisioning fails?

**Step 1.5 itself: no** — a failure there is caught, the UI resets to `'idle'` with a real error,
and resubmitting genuinely retries safely (confirmed live this session).

**A real, confirmed gap for failures *after* Step 1.5 succeeded**: `TenantRegisterPage.jsx` wraps
Steps 1, 1.5, 2, and 3 in one shared `try`/`catch`. If Step 1.5 succeeds but Step 2
(`PATCH /settings`) or Step 3 throws, the catch block resets to `'idle'` — but resubmitting the
form re-runs **Step 1 first**, which now fails on the slug/email/phone uniqueness guards (the
Client already exists). This is the **exact same pre-existing bug found in the Phase 3 Discovery
round, before any of this was built** — Phase 3 made Step 1.5 itself safely retryable in isolation,
but did not give the frontend's own multi-step flow a way to resume partway through. A real visitor
who hits a failure at Step 2/3 today is left with no path forward through the UI, identical to the
gap that already existed before this whole arc started. **Not a regression — a pre-existing gap
Phase 3 did not close**, worth naming precisely rather than assuming it was fixed as a side effect.

One small, correctness-neutral detail found alongside this: the frontend's own
`if (!provisioningComplete) { ... }` branch (added this round) is effectively unreachable in
practice — the backend only ever returns success with `provisioning_status: "complete"` hardcoded in
that response; a real failure always throws instead. Harmless dead defensive code, not a bug.

---

## 8. Security / auth — ownership via `client_id` and JWT

**Clean, checked directly.** `tenant["id"]` is resolved entirely from the verified JWT
(`get_current_tenant()`, Bearer-token path) — the request body has no `client_id` field at all, so
there is no way for a caller to name a different tenant to provision. Matches the exact same
pattern every other admin route in this codebase already uses (`barbers.py`'s own `create_barber`,
read side by side). `require_roles("SUPER_ADMIN", "TENANT_ADMIN")` matches the existing convention.
The JWT `/auth/register` returns already carries the correct `role="TENANT_ADMIN"` and `slug`,
confirmed both by direct code trace and by this session's own successful live call. No rate limit
on the new endpoint — consistent with this project's own documented convention (admin routes are
not rate-limited today), not a new gap introduced by this endpoint specifically.

---

## 9. What's left in the Unified Provisioning Contract besides Page Repertoire?

Two real, confirmed items, not previously checked against the actual shipped code:

- **The "named no-op extension point" for Page Repertoire was never actually built.** A direct
  search confirms zero occurrences of `apply_page_repertoire` anywhere in the codebase. The Final
  Contract's own diagram described this as a real, present, documented no-op step — in the actual
  Phase 1-3 implementation, it does not exist as code at all, only as a paragraph in a planning
  document. Not wrong to have skipped it (Phase 3's own scope, correctly, did not include it) — but
  worth naming precisely: the extension point is a documented intention, not yet a real hook.
- **Demo Builder never writes `provisioning_status`** — confirmed, consistent with Phase 1's own
  reasoning (no retry path to protect) but a real, standing asymmetry: every Demo Builder tenant has
  `provisioning_status = NULL` forever, while every vertical-resolved Self-Registration tenant gets
  the full `pending → complete/failed` lifecycle. Intentional, not previously stated this plainly.
- The WhatsApp/n8n webhook's own missing `vertical` field in `ClientExtract` — already named in
  earlier rounds as the lowest-priority, still-open item; re-confirmed still open, unchanged.

---

## 10. Is it time for P0.1, or is there a gap to close first?

**P0.1 itself is untouched and unrelated** — `FeaturedItemsSection.jsx`'s wrong-endpoint bug is
fully independent of everything built in Phases 1-3; nothing here blocks it technically.

**But the foundation is not fully closed, honestly** — one real, live-customer-facing gap was
found this round that predates this whole arc and was not closed by it: **Q7's stuck-frontend risk
for a failure at Step 2/3 after successful registration+provisioning.** This is a real risk for an
actual self-registering business between now and 2026-08-31, not a documentation nicety. The
concurrency gap (Q4) and the `provisioning_status`/TENANT_LIFECYCLE overlap (Q1) are real but lower-
urgency — one is a narrow race window, the other is a naming/documentation reconciliation, not a
live bug.

**Recommendation, not a decision**: P0.1 can proceed in parallel without conflict — it touches a
completely different file and capability. Whether to close Q7's gap *before* declaring the
provisioning foundation "locked" is a real, separate call — the honest answer to "is there a gap"
is yes, one real one, already scoped precisely enough to fix quickly if Salman wants it closed now
rather than carried forward as a named, accepted risk.
