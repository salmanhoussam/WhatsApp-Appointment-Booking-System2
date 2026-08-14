# Unified Provisioning Contract — Final Decisions + Implementation Sequence

**Status:** Decision + sequencing round. **Still no code.** Resolves the two named open points from
`ALZABT_UNIFIED_PROVISIONING_CONTRACT_DISCOVERY.md`, then presents one final contract shape and a
phased implementation sequence for review. Nothing below executes until Salman gives Go.

---

## Decision 1 — Page Repertoire: deferred, with a real, named extension point (not faked, not silently dropped)

**Resolved: Page Repertoire does NOT enter the Provisioning Contract's actual execution now.**

**Why**: `VERTICAL_REGISTRY["barber"]["page_template"]` is honestly `None` today — no real
`page_templates/barber.json` exists, and building one is Section System P3's own job (its own
Design/Capability Contract, visual-quality-bar work from P2, real content decisions) — none of
which has happened yet. Writing a provisioning step that "applies the page repertoire" while the
only real vertical has no template would be exactly the fake step Salman named directly: it would
either no-op silently (the contract *claims* a guarantee it doesn't deliver) or force a rushed,
undesigned template into existence just to satisfy the contract's own shape — both are worse than
naming the gap honestly.

**What this means concretely**: the Provisioning Contract's own definition of "Ready Tenant" is
scoped, explicitly, to **4 of the 5 parts named in the Discovery round**: Client + Vertical +
Capabilities + Domain Data. Page Repertoire is named as a **known, declared, out-of-scope
guarantee** — not silently absent, not implied as covered. This is a direct extension of this
project's own Investigation Protocol discipline (name Unknowns, never quietly omit them) applied to
a contract's own guarantees, not just to an investigation's findings.

**The extension point, so this isn't a wall to knock down later**: the contract's step sequence
(below) keeps a **named, documented no-op step** — `apply_page_repertoire()` — that today does
nothing and says so explicitly in its own log/return value ("no `page_template` registered for this
vertical yet"), rather than being absent from the sequence entirely. When Section System P3
produces a real `barber.json`, wiring it in is a one-line change to an existing, already-tested
step — additive, not a contract redesign. This is the same "declare the shape, fill it in only when
real" discipline the Registry itself already follows for `staff_backing_model`.

---

## Decision 2 — Failure model: idempotent steps + a real `provisioning_status` gate

**Resolved: Option C from the Discovery round** (idempotent, re-runnable provisioning steps, gated
by a real `Client.provisioning_status` field) — **not** a database transaction, **not** compensating
cleanup. Reasoned, not defaulted to:

**Why not a transaction (Option A)**: this exact session produced **two separate, real, live
Supabase pooler connection failures** — not hypothetical, not read from documentation, directly
observed while executing this session's own work (the Vertical Registry verification round, and
again during the 3-tenant backfill attempt, both requiring real retries or Salman's own manual
SQL-editor execution). A long-lived transaction spanning `Client` → `User` → `client_services` →
`Barber` → `CatalogService` → `BarberService` writes is **more** exposed to exactly this failure
mode, not less — a connection drop mid-transaction loses every already-completed write and forces a
full restart, where a step-based approach only needs to resume the one step that failed. Choosing a
transaction here would be optimizing for a failure mode (mid-write corruption) this codebase hasn't
actually observed, while making the failure mode it *has* actually observed twice this session
strictly worse.

**Why not compensating cleanup (Option B)**: the cleanup path makes the same kind of DB calls
(`DELETE`) that the original failure may have been caused by — a connection problem doesn't
discriminate between a `CREATE` and a `DELETE`. This adds a second failure-prone layer without a
real guarantee it succeeds when the first layer didn't.

**Proof Option C actually prevents a half-provisioned tenant from reaching a real user**:

1. **A new `Client.provisioning_status` column** (`pending | complete | failed`) — additive,
   nullable/defaulted, same promotion-to-a-real-column precedent already used twice this session
   (`vertical`, and earlier `CatalogService.durationMin`'s own documented reasoning).
2. **Every provisioning step becomes idempotent** — safe to call again without duplicating side
   effects:
   - `Client`/`User` creation: already naturally guarded (slug/email/phone uniqueness checks
     already exist and correctly reject a second attempt).
   - `client_services` seeding: **already idempotent today**, confirmed by reading the code —
     `seed_default_services`/`seed_services_for_client` both use Prisma `upsert`, not `create`.
   - Domain-object creation (`Barber`/`CatalogService`/`BarberService`): **not idempotent today** —
     real, scoped implementation work needed (check-then-create or upsert keyed on a natural
     identifier), named here as a real requirement of this decision, not assumed already true.
3. **The status field is the actual gate**, not "the function returned without throwing." Nothing
   downstream (a future Dashboard "your store isn't ready yet" banner, a future admin tenant-health
   view, or simply a human checking before telling a customer their tenant is live) trusts
   provisioning succeeded until `provisioning_status == 'complete'`. This is the exact same
   Completion Gate pattern `.claude/rules/tenant-onboarding.md` already established for RK's own
   real onboarding gap (*"لا يُعتبر أي Tenant onboarding مكتملًا حتى تتحقق كل هذه الشروط، بالدليل
   الحقيقي لا بافتراضه"*) and the same posture `ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md`'s own
   hard-gate decision already took for an unsupported `vertical` string — extended here to the full
   provisioning sequence rather than invented fresh.
4. **On any exception**, `provisioning_status` is set to `failed` (never silently left as
   `pending` forever, never advanced to `complete`) — and because every step is idempotent, calling
   the exact same provisioning function again safely completes whatever didn't finish, without
   re-creating what already succeeded. This is the concrete, checkable proof: a half-provisioned
   tenant is always **visibly** half-provisioned (`status != 'complete'`), and always **safely
   recoverable** (re-run, don't manually reconcile).

---

## Final Provisioning Contract

```
ProvisioningInput (door-specific: Pydantic schema per door, already legitimately different)
        │
        ▼
1. Validate identity uniqueness (slug, email, phone) — existing logic, unchanged
        │
        ▼
2. Create Client (provisioning_status = 'pending') + User
        │
        ▼
3. Resolve vertical → VERTICAL_REGISTRY entry (or None — legitimate, unassigned; skip to step 6)
        │
        ▼
4. Seed client_services from the Registry entry (idempotent today, unchanged)
        │
        ▼
5. provision_vertical_domain_objects(client_id, vertical)
     — dispatched by entry["staff_backing_model"], NOT by vertical name
     — "Barber" → create 1 Barber + N CatalogService + full BarberService cross-assignment
       (idempotent — new implementation work, per Decision 2)
     — future "Resource" branch: not built now, additive when Clinic is real
        │
        ▼
5b. apply_page_repertoire(client_id, vertical)
     — TODAY: named, documented no-op — logs "no page_template registered for '{vertical}' yet"
     — FUTURE (Section System P3): reads entry["page_template"], seeds config.content.sections[]
       the same way scripts/seed_page_content.py already proves works, just automated
        │
        ▼
6. Set provisioning_status = 'complete' (only reached if every prior step succeeded)
   On any exception in 2-5b: provisioning_status = 'failed', re-raise
        │
        ▼
7. Return door-specific response (JWT+cookie / temp_password+admin_url — unchanged per door)
```

**"Ready Tenant" (v1), as this contract actually guarantees today**: Client + Vertical +
Capabilities + Domain Data, verifiably complete via `provisioning_status`. Page Repertoire is named,
not guaranteed, until Section System P3 lands — at which point `provisioning_status='complete'`'s
real meaning strengthens automatically, with zero contract redesign.

---

## Implementation sequence (for review — not yet Go)

Phased so each step is independently low-risk and independently verifiable, matching this whole
arc's own discipline:

**Phase 1 — `provisioning_status` + idempotent domain-object creation**
- Add `Client.provisioning_status` column (additive migration, same pattern as `vertical`).
- Make `barber_repo.create_barber`/`catalog_service_repo.create_catalog_service`/
  `barber_service_repo.set_services_for_barber` idempotent (check-then-create or upsert).
- No door wired yet — pure infrastructure, testable in isolation (same style of live, real
  before/after verification already used for the Vertical Registry itself).

**Phase 2 — Extract `provision_vertical_domain_objects()` from `demo_service.py`**
- Move `_seed_demo_barbershop()`'s real logic into the shared function, dispatched by
  `staff_backing_model`.
- Re-point `demo_service.py` at it — Demo Builder's own behavior must stay byte-identical
  (verified the same way this session already proved the Vertical Registry wiring: real live test,
  before/after DB check).

**Phase 3 — Wire Self-Registration to the same shared step**
- `registration_service.py` calls `provision_vertical_domain_objects()` when `vertical` resolves —
  this is the actual fix that finally closes the gap named in the classification round (a
  self-registered Barber tenant gets a real Barber + real Services, not just the capability flag).
- Real live test required (same browser-driven method already used this session) — confirm a fresh
  self-registered `beauty-barber` tenant now has a real bookable barber, not just `reservations`
  active.

**Phase 4 — `apply_page_repertoire()` as a real, tested no-op**
- Add the step, wired into both doors, confirmed to log its own "not yet built" state clearly and
  touch nothing — proves the extension point is real and safe before Section System P3 ever needs
  it.

**Phase 5 — WhatsApp/n8n webhook's own small, separate fix**
- Add `vertical` to `ClientExtract`'s schema (named in the Discovery round as a separate, small
  gap) — lowest priority of the five, since this door already funnels into the same shared
  `register_new_tenant()`, so Phases 1-4 benefit it automatically once its own input can supply a
  real `vertical` value.

**Only after Phase 5, real, live tests across all three doors** (the same evidence discipline
already used for the onboarding-contract fix this session) — then, and only then, P0.1.

---

## What is still explicitly not decided by this document

- The exact idempotency mechanism for domain-object creation (check-then-create vs. a natural-key
  upsert) — an implementation-time call, not an architecture one.
- Whether `provisioning_status` should ever be surfaced to the tenant themselves (a Dashboard
  banner) — a product decision, out of this contract's scope.
- Anything about Clinic/Beauty's own real `page_template` or `Resource`-branch content — correctly
  still deferred to when those verticals are real.

---

Stopping here, per instruction. Waiting for Salman's review of this contract and sequence before
Phase 1 starts.

---

## Phase 1 execution — correction found during the mandatory impact map, before any edit

Per instruction, a real impact map was run before touching anything. It found this document's own
Phase 1 wording was imprecise in one real, load-bearing way — corrected here, not silently, before
executing anything else.

**What was checked**: every real caller of `barber_repo.create_barber` and
`catalog_service_repo.create_catalog_service` (`barber_service_repo.set_services_for_barber` was
also checked and needs no change — it already does a full delete-then-recreate, which is
idempotent by construction: calling it twice with the same `service_ids` produces the identical end
state).

**What was found**: each of `create_barber`/`create_catalog_service` has **two independent, real
callers**, not one:

| Function | Provisioning caller | **Real, live, unrelated Dashboard caller** |
|---|---|---|
| `barber_repo.create_barber` | `demo_service.py`'s `_seed_demo_barbershop()` | `app/api/v1/admin/barbers.py`'s `POST /barbers` — the real "Add Staff" button, used by any tenant admin, any time, expecting an unconditional new row |
| `catalog_service_repo.create_catalog_service` | same | `catalog_service_service.admin_create_service()` — the real "Add Service" flow, same expectation |

**Why this matters**: making these two repository functions "idempotent" (skip-if-already-exists,
as this document's Phase 1 originally worded it) would be a real, breaking change to two live,
unrelated Dashboard features that must always insert a genuinely new row — an admin adding a second
barber or a second service must never be silently no-op'd because *something* with a similar shape
already exists. Idempotency belongs to the *provisioning batch* ("has this client already been
seeded once"), never to the shared, general-purpose repository functions those Dashboard endpoints
also depend on.

**Corrected Phase 1 scope, executed**: only the additive, unambiguous, zero-risk part —
`Client.provisioning_status` (nullable, every existing row correctly stays `NULL`). **No repository
function was modified.** The idempotency mechanism itself is deferred to Phase 2 (where it belongs,
since it can only be expressed once the provisioning orchestration is extracted anyway) and will
take the shape of a **batch-level guard**, not a per-row upsert: before calling the domain-object
creation sequence, check whether this client already has any real domain objects for its vertical
(reusing the already-existing, already-correct `barber_repo.list_barbers(client_id)` /
`catalog_service_repo.list_catalog_services(client_id)` — no new repository code needed for the
check itself) and skip the whole batch if so. This is smaller, safer, and closer to the real shape
of the problem (one seed batch either happened or it didn't) than a per-function upsert would have
been.

### Live evidence, this round

- Schema: `Client.provisioningStatus` (`provisioning_status` column) added, additive, nullable.
- Migration applied (`prisma/migrations/add_client_provisioning_status.sql`) — real, live, before/
  after query: **31 rows before, 31 after, 0 with a non-NULL `provisioning_status`** — every
  existing tenant, RK/Ali/alzabt-demo included, correctly untouched.
- Prisma client regenerated, backend restarted, typed attribute access confirmed live:
  `rk.provisioningStatus=None`, `ali.provisioningStatus=None`, `alzabt-demo.provisioningStatus=None`
  — alongside their already-correct `vertical='barber'` from the prior round, untouched.
- **Zero application code changed** — `git status` confirms only `prisma/schema.prisma` (modified)
  and the new migration file (added). `create_barber`/`create_catalog_service`/
  `set_services_for_barber`/`demo_service.py`/`registration_service.py` all byte-identical to
  before this round — nothing wired, nothing extracted, exactly as instructed.

Phase 1 stops here. Waiting for review before Phase 2 (extracting `_seed_demo_barbershop()` into
the shared `provision_vertical_domain_objects()`, where the real batch-level idempotency guard
described above actually gets built).
