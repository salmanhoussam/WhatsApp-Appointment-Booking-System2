# Phase 3 — Final Contract (Option C, Minimal Extension)

**Status:** Final design, for review. **No code, no migration.** Closes the 4 open decisions left
by `ALZABT_PHASE3_SELF_REGISTRATION_EXTENSION_PROPOSAL.md`, in the direction that document already
leaned, then states the complete request/response, validation, partial/retry behavior,
`provisioning_status` transitions, and the vertical-neutral metadata boundary. Includes the
requested impact map, run before finalizing anything below.

---

## Impact map — run before closing any decision

**`POST /catalog/seed-from-template`**: exactly **one** real caller anywhere in the frontend —
`TenantRegisterPage.jsx`. Confirmed by a full-repo grep. **Skipping it for Reservations-vertical
tenants (Decision 4, below) is fully safe** — no other flow, Dashboard tab, or admin tool depends
on it running for any tenant.

**`POST /auth/register`**: exactly one real caller, same file. No other registration path exists
in the frontend (the WhatsApp/n8n webhook calls the backend service directly, not this route).

**`PATCH /admin/settings`**: **five** real callers (`TenantRegisterPage.jsx`,
`SettingsTab.jsx` ×2, `DemoPublicPage.jsx`, `VisualBuilder.jsx`) — correctly **unchanged** by this
contract; Step 2 keeps running for every registration exactly as it does today, vertical or not.

**Backend**: `admin_seed_from_template()` has exactly one real caller, `catalog.py`'s own route —
confirms the skip in Decision 4 removes a call site, not a shared function used elsewhere.

---

## The 4 decisions, closed

**1. `duration_min` — required, not defaulted.** Matches `price`'s own already-decided treatment.
The entire premise of Option C is that a real business supplies its own real facts instead of the
system inventing them — allowing duration to silently default to 30 while requiring price would be
an inconsistent, unexplained exception to that same rule.

**2. Partial-retry handling — delete-then-recreate, reusing an already-proven pattern.** Before
re-running provisioning on a retry, delete any of this client's existing barber-vertical domain
rows (Barber, its CatalogServices, BarberService links), then create fresh ones from the retry's
current form submission. This is not new design — it's the exact same "full replace" idempotency
`barber_service_repo.set_services_for_barber()` already uses today (confirmed in Phase 1's own
impact map), applied one level up, at the whole-batch scope instead of just the assignment table.
Simpler and more honest than diffing "what's missing" — a retry naturally carries the customer's
current, intended data; stale partial rows from a failed first attempt should not survive to mix
with it.

**3. Label storage — `template-registry.js`, not the backend `VERTICAL_REGISTRY`.** Keeps the
Registry's own existing rule ("never vertical-facing copy/labels") fully intact, zero exception
needed. `template-registry.js`'s `beauty-barber` entry already carries `vertical: 'barber'`
per-template — the natural, already-established home for one more piece of per-template
presentational data, not a new mechanism. Concretely: `beauty-barber` gains one new key,
`staff_label: { ar: 'الحلاق', en: 'Barber' }`; `TenantRegisterPage.jsx` reads it the same way it
already reads `template.vertical`.

**4. `seed-from-template` — skipped for any tenant with a resolved `vertical`.** Confirmed safe by
the impact map above (its one caller is the exact file being changed). Retail/restaurant templates
(`vertical: null`) keep it exactly as today, unaffected.

---

## Request / Response contract

```
Step 1 (unchanged):
POST /api/v1/auth/register
Body: { business_name_ar, slug, email, password, whatsapp_number, owner_name,
        primary_color, venue_type, vertical }
→ 200 { success: true, data: { token, slug, role, status, trial_ends_at, dashboard_url } }
   Client created with provisioning_status = 'pending'.

Step 1.5 (NEW — only called when Step 1's response included a real `vertical`):
POST /api/v1/admin/provisioning/domain-objects
Auth: Bearer <token from Step 1>
Body: {
  staff_name: string,
  services: [
    { name_ar: string, price: number, duration_min: number },
    ...  (minimum 1)
  ]
}
→ 201 { success: true, data: { provisioning_status: "complete", barber_id, service_ids: [...] } }
→ 4xx on validation failure (see below) -- provisioning_status stays whatever it already was,
   never advanced.
→ 5xx on an unexpected failure -- provisioning_status set to "failed" before the error returns.

Step 2 (unchanged): PATCH /admin/settings  { name_ar, primary_color, template_key, page_type }

Step 3 (CONDITIONAL, per Decision 4):
  IF vertical is null  → POST /catalog/seed-from-template  (unchanged, today's exact behavior)
  IF vertical resolved → skipped entirely (Step 1.5 already provided real domain data)

Step 4: redirect to dashboard ONLY if the relevant provisioning path reports
  provisioning_status == 'complete' (see Transitions, below) -- never an unconditional redirect.
```

**New backend file**: `app/api/v1/admin/provisioning.py`, matching this project's existing
per-domain admin-route convention (`barbers.py`, `catalog.py`, `settings.py`, ...) — not folded
into an existing file, since this is a genuinely new capability (vertical-dispatched domain-object
provisioning), not an extension of Barbers or Catalog specifically.

---

## Validation

| Field | Rule |
|---|---|
| `staff_name` | required, 2–100 chars (same bound as `business_name`) |
| `services` | required array, **minimum length 1** |
| `services[].name_ar` | required, non-empty (matches `CatalogService.nameAr`'s own real schema constraint) |
| `services[].price` | required, positive number (`> 0`) |
| `services[].duration_min` | required, positive integer (`> 0`) — Decision 1 |

A request failing validation never reaches the provisioning step at all — `provisioning_status`
stays exactly what it was (still `'pending'` on a first attempt), so a corrected resubmission is a
completely clean retry, not a special case.

---

## Partial / retry behavior — full sequence

```
POST /admin/provisioning/domain-objects (any attempt, first or retry):

1. IF Client.provisioning_status == 'complete':
     return 200 immediately, no-op -- already done, never re-provisioned.
2. ELSE (status is 'pending' or 'failed'):
     a. Delete any existing barber-vertical rows for this client_id (Barber, CatalogService,
        BarberService) -- defensive, covers a prior attempt that partially wrote rows before
        failing (no DB transaction exists, per the Unified Provisioning Contract's own Decision 2
        reasoning -- this delete-then-recreate step is what makes that safe without one).
     b. Call provision_barber_domain(client_id, staff_name, services) with THIS request's data
        (Decision 2 -- never the stale data from a failed prior attempt).
     c. On success: provisioning_status = 'complete'. Return 201.
     d. On failure: provisioning_status = 'failed'. Return 5xx. Rows from THIS attempt may be
        partial -- correctly cleaned up by step (a) on the next retry, not left to accumulate.
```

---

## `provisioning_status` transitions

```
(created)   →  'pending'    Client creation, Step 1
'pending'   →  'complete'   Step 1.5 succeeds
'pending'   →  'failed'     Step 1.5 throws
'failed'    →  'complete'   a retry of Step 1.5 succeeds
'failed'    →  'failed'     a retry fails again
'complete'  →  (immutable -- never transitions again, matching this project's own settled-fact
                discipline elsewhere: evolution/review entries are never revised in place either)
```

Tenants with `vertical = null` (retail/restaurant) are **not gated by this state machine at all**
in this contract — Decision 4 already scopes Step 1.5 to Reservations-vertical tenants only; a
retail tenant's `provisioning_status` stays `'pending'` forever under this design, which is
correct and not a gap — its own "ready" definition doesn't include a domain-objects step to
complete. (Whether retail/restaurant tenants deserve their own, different completion signal is a
real, separate question, explicitly out of this contract's scope.)

---

## Vertical-neutral metadata boundary — final statement

| What | Lives where | Why |
|---|---|---|
| `staff_backing_model` (which repo/model a vertical uses) | `VERTICAL_REGISTRY` (backend) | Structural fact, drives real dispatch code — exactly what the Registry exists for |
| `default_services` | `VERTICAL_REGISTRY` (backend) | Same — already real, unchanged |
| `page_template` | `VERTICAL_REGISTRY` (backend) | Same — still `None` for `barber`, unchanged by this contract |
| **`staff_label`** (UI copy: "الحلاق"/"Barber") | **`template-registry.js`** (frontend) | Decision 3 — a registration-form UI concern, not a structural provisioning fact; keeps the Registry's existing "no labels" rule intact with zero exception |

`provision_barber_domain()` and the new `/admin/provisioning/domain-objects` route both dispatch
purely on `staff_backing_model` — no vertical name ever appears as a literal string comparison in
either. Adding Clinic later means: one new `VERTICAL_REGISTRY` entry
(`staff_backing_model: "Resource"`), one new `provision_resource_domain()` function (Phase 2's own
extensibility design, unchanged by this contract), and one new `staff_label` in
`template-registry.js` — never a new `if` branch in the shared route or service.

---

Stopping here, per instruction. No code, no migration written. Waiting for review before any
implementation.
