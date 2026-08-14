# Phase 3 — Minimal Self-Registration Extension (Option C) — Design Proposal

**Status:** Design/proposal only. **No code, no schema/DB change.** Answers Salman's decision for
Option C: collect the real minimum vertical-specific data at registration (staff name + real,
priced services), never assume `owner_name` is the staff member, never reuse Demo Builder's
content. Covers UX, request contract, validation, provisioning sequence, retry/idempotency,
`provisioning_status` transitions, and a vertical-neutral design check — every axis Salman named.
Ends with a real open question, not a silent decision, on the one place this design brushes
against the Registry's own existing boundary rule.

---

## 1. UX

**One additional, conditional section on the existing single-page form** — not a wizard, not a
new page. Shown only when `template.vertical` resolves to a real value (today, only
`beauty-barber`); every retail/restaurant template's form stays byte-identical to today.

```
[ existing fields: اسم المتجر, رابط المتجر, البريد, كلمة المرور, واتساب, اسم صاحب العمل ]

── يظهر فقط إذا كان القالب Reservations-shaped ──

  اسم [مقدّم الخدمة]:  [________________]     ← label is vertical-driven, see §7
                                                  ("الحلاق" for barber; NOT hardcoded "Barber")

  الخدمات التي تقدّمها:
    [ + أضف خدمة ]
    ┌─────────────────────────────────────────┐
    │ اسم الخدمة *      [__________]            │
    │ السعر *          [______] $               │
    │ المدة (دقيقة) *   [______]                 │
    │                                  [حذف]     │
    └─────────────────────────────────────────┘
    (repeat, minimum 1 required to submit)
```

**Minimality, stated explicitly**: exactly two new inputs (a name field, a repeatable
name/price/duration group) — no bios, no photos, no working-hours picker, no second staff member.
Everything beyond this minimum stays exactly where it already, correctly, lives: the Dashboard's
real, already-working Add Staff / Add Service flows (confirmed reachable in Phase 1's own impact
map) — this design does not compete with them, it only closes the gap between "account created"
and "one real, bookable thing exists."

---

## 2. Request contract

**Two separate calls, not one bigger `/auth/register` payload** — this split is what makes the
retry/idempotency section below possible at all (see §5):

```
Step 1 (unchanged): POST /auth/register
  { business_name_ar, slug, email, password, whatsapp_number, owner_name,
    primary_color, venue_type, vertical }
  → Client (provisioning_status='pending') + User + client_services + vertical. Same as today.

Step 1.5 (NEW, only when `vertical` resolved in Step 1):
  POST /admin/provisioning/domain-objects        (JWT-authenticated -- Step 1's own token)
  {
    staff_name: string,
    services: [
      { name_ar: string, price: number, duration_min: number },
      ...  (min 1)
    ]
  }
  → dispatches by VERTICAL_REGISTRY[vertical]["staff_backing_model"]; for "Barber", calls
    provision_barber_domain(client_id, staff_name, [(name_ar, None, duration_min, price), ...])
    (Phase 2's own function, unchanged signature -- this is its second real caller)
  → on success: provisioning_status = 'complete'
  → on failure: provisioning_status = 'failed', real error returned, safe to retry (§5)
```

**Field name deliberately `staff_name`, not `barber_name`** — vertical-neutral from the start, per
instruction (§7 confirms this holds structurally, not just by naming).

---

## 3. Validation

| Field | Rule | Why |
|---|---|---|
| `staff_name` | required, non-empty, same length bound as `business_name` today (2–100 chars) | Matches existing pattern, no new convention invented |
| `services` | required, **minimum 1 entry** | The whole point of Option C — a Barber-vertical tenant with zero services is exactly the gap being closed |
| `services[].name_ar` | required, non-empty | `CatalogService.nameAr` is a real, required, non-defaultable schema field — the form's own validation should match the schema's real constraint, not be looser than it |
| `services[].price` | required, positive number | **Deliberately stricter than the schema** (`CatalogService.price` is nullable at the DB level) — Option C's entire premise is collecting real prices, not leaving them blank just because the column technically allows it |
| `services[].duration_min` | **open question, not decided** — required positive integer, or optional with the schema's own `@default(30)` | Real UX trade-off: requiring it is more accurate, defaulting is less friction. Named here rather than picked — a small, low-stakes call Salman may want to make himself, unlike the two structural ones already accepted in Phase 2 |

---

## 4. Provisioning sequence — including a real overlap this design surfaces

```
1. Client-side: single form, all fields (including the new conditional section) collected before
   any submission.
2. POST /auth/register → Client(pending) + User + client_services + vertical.
3. IF vertical resolved:
     POST /admin/provisioning/domain-objects → real Barber + real CatalogService(s) +
       BarberService cross-assignment (Phase 2's own function). → status: complete/failed.
   ELSE (retail/restaurant, unchanged):
     PATCH /admin/settings (template_key, primary_color) →
     POST /catalog/seed-from-template (generic CatalogCategory rows) -- exactly today's flow.
4. Redirect to dashboard ONLY if the relevant provisioning step actually succeeded (§6) --
   never the current unconditional redirect.
```

**Real overlap found, not previously named**: today's Step 3 (`/catalog/seed-from-template`)
creates generic `CatalogCategory` rows (e.g., a category literally named "Haircut") from
`seedCategories` — **for a Reservations-vertical template, running this alongside the new Step
1.5 would create a second, redundant, generic-labeled category next to the real one**
`provision_barber_domain()` already creates ("الخدمات," containing the real, priced services). This
is a genuine design conflict, not just extra data: two competing "your services" structures on the
same tenant. **Recommendation, not yet decided**: for any tenant with a resolved `vertical`, skip
Step 3 (`seed-from-template`) entirely — Step 1.5 supersedes it with real data instead of generic
labels. Retail/restaurant templates (no `vertical`) keep Step 3 exactly as-is, unaffected.

---

## 5. Retry / idempotency behavior

Directly answers the risk confirmed live in the Discovery round (`TenantRegisterPage.jsx`'s shared
`try`/`catch` already leaves a real half-provisioned `Client` today if any step after registration
fails).

**The split in §2 is what makes this safe**: Step 1 (`/auth/register`) keeps its own existing
uniqueness guards (slug/email/phone) — those are correctly one-time, never meant to be retried
past a first success. Step 1.5 (the new domain-objects call) is **keyed by the already-created
`client_id`** (from the JWT Step 1 already returned), not by any of those uniqueness fields — so
retrying *only* Step 1.5 after a failure never touches Step 1's guards at all.

**Step 1.5's own idempotency, concretely**:
```
On entry:
  IF Client.provisioning_status == 'complete': return success immediately (no-op, already done)
  IF Barber rows already exist for this client_id (defensive check, in case a prior attempt
     partially wrote rows before failing -- no transaction exists per Decision 2's own reasoning):
       do NOT create a second batch; either treat as already-done (return success) or surface a
       real, distinct error asking the tenant to fix it via the Dashboard rather than silently
       double-provisioning -- a real choice, not decided here, since neither option invents data,
       only differs in how an already-partial state is handled.
  ELSE: proceed to provision_barber_domain(), then set status accordingly.
```

This is the moment Phase 1's deferred idempotency guard (§H of the Final Contract, "build it once
a second real caller with a real retry path exists") becomes real, load-bearing design, not
speculative — confirmed directly by this round's own Discovery finding.

---

## 6. `provisioning_status` transitions

```
(created)  →  'pending'    at Client creation (Step 1)
'pending'  →  'complete'   Step 1.5 succeeds
'pending'  →  'failed'     Step 1.5 throws
'failed'   →  'complete'   a retry of Step 1.5 succeeds
'failed'   →  'failed'     a retry fails again -- stays failed, never silently reverts to pending
'complete' →  (never changes again)  -- immutable once true, same discipline this project already
                                          applies to settled facts elsewhere (evolution/review entries)
```

The frontend's own redirect (§4, step 4) reads this status as the real gate — "success" in the UI
means `status == 'complete'`, never "the HTTP call returned 200," closing the exact gap the current
unconditional `setTimeout(...) navigate(...)` leaves open today.

---

## 7. Is this vertical-neutral from the start? — checked, one real open question found

**The mechanism is**: `/admin/provisioning/domain-objects` dispatches by
`VERTICAL_REGISTRY[vertical]["staff_backing_model"]`, exactly as the Unified Provisioning
Contract's own §G already established (`"Barber"` → `provision_barber_domain()`; a future
`"Resource"` → its own not-yet-built function) — no `if vertical == "barber"` anywhere in this
design. `staff_name`/`services` as field names are already vertical-neutral, not
`barber_name`/`barber_services`.

**The one real thing that is NOT yet vertical-neutral, found while designing the UX**: the form's
own **label** ("اسم الحلاق" vs. a future "اسم الطبيب" for Clinic) needs to come from *somewhere*
per-vertical — and this brushes directly against `ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md`'s own
existing rule: *the Registry must never define vertical-facing copy/labels — those stay inside the
vertical's own `page_templates/{vertical}.json`*, precisely to avoid the Hero-fragmentation-style
mistake of one label living in two storage locations.

**But `page_templates/{vertical}.json` doesn't exist yet either** (still deferred to Section
System P3, per the earlier, already-ratified decision) — and even once it does, it's meant for
*public page* content, not *registration form* UI copy, a genuinely different consumer. Applying
the Registry's existing rule literally would mean this label has nowhere correct to live yet.
**Not resolved here** — three real options, named, not chosen:

- Add a narrow `staff_label` to `VERTICAL_REGISTRY` anyway, as an explicit, acknowledged exception
  (registration-form UI copy is a different consumer than the public page the original rule was
  protecting).
- Keep the Registry untouched; add the label to `template-registry.js` instead (frontend-only,
  already carries `vertical: 'barber'` per-template — no backend involvement, no rule violated).
- A small, temporary, frontend-only hardcoded map (`{barber: 'الحلاق'}`), explicitly named as a
  placeholder until Clinic/Beauty make the real pattern worth generalizing — same "prove before
  generalizing" posture this whole arc has held throughout.

---

## What this proposal does not do

- Does not pick the `duration_min` validation strictness (§3).
- Does not pick how Step 1.5 handles a defensively-detected partial-prior-attempt (§5).
- Does not resolve the label-storage question (§7).
- Does not decide whether skipping Step 3 for Reservations-vertical tenants (§4) is correct, though
  it's presented as a clear, evidenced recommendation.
- Builds no code, touches no schema.

Waiting for Salman's read — specifically whether this design is worth its real size (a new backend
endpoint, a new frontend form section, a real idempotency guard) before anything is implemented.
