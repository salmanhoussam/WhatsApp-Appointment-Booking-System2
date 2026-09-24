# Capability — Lia (Owner Data Entry via WhatsApp)

**Kind:** Platform Service · **Not** a development Agent.
**Established:** 2026-09-13 · **Live since:** `4196e8f` · **Contract:** this document.

> **Lia is a Platform Service, and that classification is load-bearing** (Salman, 2026-09-13).
> Every file in `.claude/agent/` is a DEVELOPMENT agent: each carries a `tools:` frontmatter and
> exists to help BUILD this project. Lia does not build anything — she talks to shop owners in
> production. Filing her with the dev agents would have conflated two different kinds of thing,
> so she is documented here, beside `catalog` / `content` / `media`, as the platform capability
> she is.

---

## Ownership

| | |
|---|---|
| **Owns which data?** | 🔴 **None.** Lia owns no table and creates none. |
| **Writes through** | `catalog_service_service.admin_create_service()` — the same function `POST /api/v1/admin/catalog-services` calls — since 2026-09-17 `catalog_service.admin_create_item()`, the same function `POST /api/v1/admin/store/products` calls — and since 2026-09-19 `reservation_service.create_reservation()`, the same function the public booking route calls. The functions themselves, not copies of their bodies. **Three operations, zero new write paths.** |
| **Owned by** | Two domains, and the split is the point: `create_service` / `create_product` are an INTERFACE onto `catalog` (`capabilities/catalog.md`); `create_reservation` is an INTERFACE onto the Reservation capability. Lia owns neither — she is a third caller of write paths that already existed. |
| **Prompt** | `app/prompts/lia.md` — governed by `repository-hygiene.md`'s Persona & Prompt Drift rule. Four prompt blocks, sentinel-delimited: service · product · reservation · reservation-edit. |
| **Contracts** | `app/schemas/lia_drafts.py` — `LiaExtraction`, `LiaServiceDraft`, `LiaProductDraft`, `LiaReservationExtraction`, `LiaReservationDraft`, `LiaReservationChanges`, `LiaReservationEditPatch`. |
| **Service** | `app/services/lia_owner_entry.py`. |

---

## Capability Proposal Gate (`TOS-003` §4.2, applied prospectively)

| Question | Answer |
|---|---|
| Does it own data no existing capability owns? | **No** — and that is why it is an interface, not a new owner. |
| Does it introduce a second write path? | **No.** Explicitly forbidden; §Single Source of Truth. |
| Does it need schema? | **No.** Zero new tables, zero new columns. |
| Could an existing capability absorb it? | **No.** `catalog` owns services; Lia owns the WhatsApp-owner *interface*, which `catalog` has no business knowing about. |
| Is it earned by a real case? | **Yes.** A live owner created a real service by message on 2026-09-13. |

---

## Contract

```
Owner (WhatsApp)
  ↓  text
Lia                       intent + candidate draft          ← the AI's ONLY job
  ↓
Pydantic                  LiaExtraction / LiaServiceDraft   ← the AUTHORITY
  ↓
Backend                   tenant · authorisation · category resolution
  ↓
Preview                   every value quoted verbatim
  ↓
Owner taps ✅             explicit confirmation, never implied
  ↓
admin_create_service()    the EXISTING authorised write path
  ↓
DB
```

**What the AI replaces:** understanding.
**What it does not replace:** tenant resolution · authorisation · entity resolution · schema
validation · business validation · confirmation · the write path.

### Required fields, and why they differ from the API's

`CatalogServiceCreate` treats `price` as optional and defaults `duration_min` to 30. Correct for a
dashboard form, where a human sees the empty box. **Through a chat they are silent data loss** —
"ضيف كيراتين" alone would create a free 30-minute keratin treatment. Measured the same day: 13 of
13 services carried no description and no image; 4 of 4 barbers no photo, phone or description.
**So `price` and `duration_min` are MANDATORY in Lia's contract**, and their absence becomes a
question. Lia does not add to the empty-column pile.

---

## Operations

| Operation | Phase | State |
|---|---|---|
| `create_service` from text | **1** | ✅ **Live** |
| Edit the draft before saving | **1.1** | ✅ **Live** — shipped 2026-09-13 |
| `create_product` from text | **S3** | ✅ **Live** — verified on production 2026-09-18 |
| `create_reservation` from text | **T4** | ✅ **Live 2026-09-19** — first real row `86efa834` on `barberlab-test` |
| Default service + default barber, marked «(تلقائي)» | T4.1 | ✅ **Live** — service «شعر ودقن»; barber from the TALKING account's `User.barberId`, matched by id, never by name |
| Edit a reservation from its preview | T4.2 | ✅ **Live** — its own prompt + `LiaReservationEditPatch`; the service editor did not know reservation fields |
| The barbers as WhatsApp buttons + a greeting by name | T4.3 | ✅ **Live** — ≤3 barbers become buttons (`lia_barber:<id>`), more become a list; greeting said once per draft |
| `log_daily_visits` — the day's completed, paid work («علي 10، محمد 7») | **DL** | 🟢 **Live `4a96754`; first real round 2026-09-22 23:56–23:58 reached the preview, and no owner has pressed ✅ on production yet** — its own operation, not a reservation branch. No phone, no hour, no working hours, no merchant alert; `status='arrived'`; max 15 per message, server-enforced; the amount must appear in his text. Plan → `plans/lia-daily-cash-log-and-mobile-landing.md` |
| `daily_report` — «تقرير اليوم» | **DL** | 🟢 **Live `4a96754`, not yet exercised by a real owner** — a READ with the GET route's permission and scoping; counts only `source=lia` + `daily_log.v=1` + `arrived` |
| `create_product_batch` (up to 10) | **S4** | 🔵 Next — B1/B3/B4 in `plans/lia-product-entry.md` |
| More than one customer in one message (a day's visit log · two full appointments) | **T5** | 🔴 **Open defect, decided 2026-09-20** — the prompt answers `low` for a second appointment (`lia.md:273`) and R1 made the server ignore `low` for reservations, so the second one is **silently dropped**. Salman's decision (2026-09-20): **one draft holding them all, in order**, and the real need is a DAY'S VISIT LOG («اليوم الصبح حلقت لعلي ومحمد وأحمد») for accounting — the same shape a photographed page of names will arrive in later. Measured the same day: that exact sentence does not even reach Lia (`_entry_family` → `None` → dropped in silence). Plan → `plans/lia-two-appointments.md` |
| `create_service` from image + caption | 2 | 🔵 Planned |
| `create_service` from voice | 3 | 🔵 Planned — needs a second provider (Anthropic has no STT) |
| Read / analyse (the Analyst role) | **2** | 🔵 **Vision — §Maturity & Future** |
| update / delete · barber · category | later | 🔵 Not started |

**One operation per conversation turn.** `create`, `update` and `delete` are three contracts with
three validation rules, and a mistaken `delete` has no undo — `CatalogService` carries `isActive`,
which is a different thing from a soft delete.

---

## Schema

🔴 **Zero new tables. Zero new columns.**

| What | Where | Note |
|---|---|---|
| The in-flight draft | `whatsapp_sessions.stateData` → key `lia` | A Prisma table. 10-minute window, inside the session's own 30. |
| The created service | `catalog_services` | Written by the existing service layer. |
| The created product | `catalog_items` | Written by `catalog_service.admin_create_item()`. |
| The created appointment | `reservations` (+ a find-or-create `customers` row) | Written by `reservation_service.create_reservation()`. `source='lia'`, `status='pending'`. `reservedAt` is a **naive local wall clock** — never converted. A customer with no number becomes `WALK_IN`, and every walk-in merges into one row (an accepted product risk, Salman 2026-09-18). **The customer's phone is normalised to the stored form at the point it enters the draft** (2026-09-20) so a dictated number and a typed one cannot produce two rows for one person. |
| The audit trail | `SecurityAuditLog` | `lia_draft_opened` · `lia_{actor}_{operation}` (so `lia_owner_create_service` is unchanged and `lia_owner_create_product` is new) · `lia_draft_cancelled` · `lia_entry_refused` · `lia_write_refused`. Every write event carries `operation`, `permission` and `service_key`, so the audit row says which authorisation was actually evaluated rather than leaving it to be inferred. |

---

## Admin Projection

The owner's WhatsApp conversation IS the admin projection. It is a second Interface onto the same
Admin Contract the dashboard uses — not a second contract (`rules/backend/architecture.md` §10).

**The route's three gates, replicated explicitly because the call is internal** (Salman's
decision — an HTTP call to our own API would need a token minted for a phone number, a second
authentication surface for no gain):

| Route gate | Lia's equivalent |
|---|---|
| `get_current_tenant` | tenant resolved from the SENDER's phone; **ambiguity is refused, not resolved** |
| `require_service("reservations")` | `_tenant_has_reservations()` |
| `require_permission("services.write", "SUPER_ADMIN", "TENANT_ADMIN")` | `is_authorized(user, "services.write", ...)` — **the same predicate, not a Lia-specific permission** |

**The standing cost of the internal call:** anything the route gains later must be added here too.
`whatsapp_merchant_actions` already pays this for reservations; Lia follows its shape rather than
inventing a second one.

---

## Public Projection

**None, by design.** Lia is owner-facing only. A customer's message never reaches her: the
keyword gate requires a data-entry verb AND an object before a model is even called, and the
sender must resolve to an authorised owner of exactly one tenant.

The *effect* is public — a created service appears immediately in the customer booking flow,
because the write went through the existing path. That is the capability's acceptance test.

---

## Single Source of Truth

> **`catalog_service_service` is the single writer of `CatalogService`. Lia is a caller.**

🔴 **Lia must never become a second implementation of `create_service()` / `create_barber()` /
`create_product()`.** The AI is an interface layer, not a database layer.

**Pre-existing violation, recorded rather than caused here:** three separate write paths for a
"service" already exist — `admin/catalog_services.py` (`CatalogService`, what the booking flow
reads), `admin/services.py` (a different model, `base_price`), and `admin/provisioning.py`
(three fields). **Lia targets `catalog_services.py` alone and does not add a fourth.** Their
consolidation is a separate, recorded item.

---

## Governance

| Rule | Enforced by |
|---|---|
| The AI never emits a database id | `LiaExtraction` has `extra="forbid"`; ids are resolved by the backend |
| Tenant from the sender, never from the channel | `phone_number_id` is channel identity, never tenant identity |
| One tenant or a question | two published-number matches → refuse |
| Silence for an unauthorised sender | A2-c precedent: no reply, a `SecurityAuditLog` row |
| The draft is consumed before the write | a human double-tap cannot create two services |
| Re-validated AND re-authorised at commit | the owner answered questions in between; accounts change inside 10 minutes |
| Prompt changes need a stated reason | `repository-hygiene.md` → `app/prompts/**` |
| Missing prompt file → refuse to start | `_load_prompt()` raises at import |

---

## Acceptance

```
✅  An owner's text creates a real service through the existing path
✅  🔑 It appears in the customer booking flow immediately     ← the capability's real test
✅  A missing price or duration is ASKED, never defaulted
✅  An unauthorised sender gets silence and zero writes
✅  A second confirm tap writes nothing
✅  Cancel writes nothing
✅  An expired draft answers instead of vanishing
✅  An ordinary message falls through untouched to the customer flow
✅  The prompt is byte-identical across the code→file move (sha256 verified)
```

**Live evidence, 2026-09-13:** "البروتين للشعر" · 30 USD · 45 min created on `barberlab-test`
from a WhatsApp message, and returned by `public_list_services()` — the same function the bot
itself calls.

---

## Maturity & Future

**Maturity, updated 2026-09-20: three operations live on one real tenant (`barberlab-test`), each
verified on production, not locally.** `create_service` (09-13) · `create_product` (09-18) ·
`create_reservation` (09-19). The deployment reaches `rk` and `mr-h` too, and their emptiness
during every test window is **measured, not assumed** (`scripts/lia_live_evidence.py`).

**Due for its first Maturity Review — and the trigger is contradictory, which is itself recorded
rather than resolved by whoever reads it next.** The paragraph this replaced set the trigger at
"a second operation ships", and the third has now shipped. But `architecture-review-loop.md`'s
mechanical gate admits a `maturity/<topic>.md` file only for a topic that already has a real
`verification/*.md`, `reviews/*.md` or a ratified ADR, and **Lia has none of the three** — her
evidence lives in `work/lia-live/*` and `work/lia-s7-preflight/*`, which that gate does not
count. So: **DUE by this document's own words, NOT DUE by the standing rule.** Opening the
ledger, or writing Lia's first Verification document so the gate is satisfied honestly, is
Salman's call — not something to settle by picking the more convenient reading.

### 🔑 Vision 1 — Memory is the Database. Only.

> *Salman, 2026-09-13: «ذاكرة Lia ومصدر الحقيقة الخاص بها هو جداول الـDatabase الفعلية. لا أريد
> الاعتماد على ملفات ذاكرة خاصة بالـLLM أو Vector Databases خارجية.»*

```
🔴 NOT allowed     LLM memory files · external vector DBs · embeddings stores · a private
                   "Lia knowledge base" of any shape
✅ Required        every context Lia needs is READ from the tables
                   everything Lia keeps is WRITTEN to the tables
```

**This is descriptive, not aspirational — and that matters.** Measured against today's code: Lia
stores nothing anywhere except `whatsapp_sessions.stateData` (a Prisma table) and writes nothing
except through `admin_create_service`. **So the principle is already true**, and is fixed here as
a constraint she must not drift from rather than a goal to reach.

**And the reason it is the right constraint, not merely a preference:** a second memory store
becomes a second source of truth the moment the two disagree — and this platform's first rule is
that every read and write is scoped by `clientId`. A vector store has no tenant column.

### 🔑 Vision 2 — The dual role: Data Entry **and** Data Analyst

> *Salman, 2026-09-13: «رؤيتي لها أن تكون أيضاً محلل بيانات — تستخرج البيانات من الـDatabase،
> تحللها، وتعرضها للمالك.»* Examples: «كم حجز عندي اليوم؟» · «شو أكتر خدمة مطلوبة هالأسبوع؟»

**Phase 2 = Read / Analyse.** And it carries a security derivation that must be settled in this
document BEFORE a line of it is written:

```
🔴 STRUCTURALLY FORBIDDEN    Lia generating SQL, Prisma queries, or raw filters
✅ THE ONLY ACCEPTABLE SHAPE  a NAMED, AUDITED, tenant-scoped set of read functions.
                              Lia SELECTS from that set with validated parameters
                              and phrases the answer.
```

**Why forbidden and not merely discouraged:** this platform's first rule is *"every DB query
filters by clientId — no exception"*. **A model-generated query cannot be trusted to**, and one
mistake is a cross-tenant leak. So the read role is *"choose from a reviewed menu and phrase the
result"*, never *"write a query"* — the same principle as the write side, applied to reads:
**the AI is an interface layer, not a database layer.**

**A measured trap for whoever builds Phase 2.** The obvious reuse candidate is the wrong domain:

| | |
|---|---|
| `dashboard_repo` + `GET /admin/dashboard/stats` | tenant-scoped ✅ but **real-estate shaped**: properties · units · check-ins · occupancy · `available_units`, via `_booking_repo` (`Booking`, not `Reservation`) |
| «كم حجز عندي اليوم؟» | belongs to `Reservation` — `reservation_repo` holds the correctly-scoped reads (`list_by_client`, `find_overlapping_by_barber`, …) |

**So Phase 2 is not built on `dashboard_repo`.** It is built on a curated set of `Reservation`
reads — curated by review, never generated.

### Later phases

| | |
|---|---|
| 1.1 | Edit the draft before saving — **Backlog P1** |
| 2 | Image + caption → `create_service`; and the Analyst role above |
| 3 | Voice — needs a second provider; **Anthropic has no speech-to-text** |
| 4 | Menu-image extraction (multi-row) |
| 5 | Barber · product |
| 6 | Media asset promotion · update/delete · multi-operation turns |

---

## Activation Key, Operation Contract, and the Migration Debt

Added 2026-09-16 with Lia Foundation (F0.1–F0.9). The decisions behind every line here are in
`.claudedocs/plans/lia-expansion-master-plan.md`'s decision record (D0, I-1…I-7, D3-a/b/c,
a-1…a-4, D9, R1–R6); this section states what is now true of the capability, not why.

### ① Lia access — her own key, at last

`serviceKey = "lia"`, accepted by `POST /api/v1/admin/client-services/activate` and listed in
`platform_services`. Until this, Lia was gated on `serviceKey = "reservations"` — a key that is
not hers — so "does this tenant have Lia" had no answer and she could not be switched off without
switching off Reservations.

```
_tenant_has_lia(client_id)   →  client_services{ serviceKey ∈ ("lia","reservations"), isActive }
```

**🔴 THE `OR reservations` HALF IS A MIGRATION DEBT, with a stated payoff condition.**

Pinning Lia straight onto her own key would switch her off for every live tenant until the
activation rows exist — a real outage window for a sold capability, and one that depends on
whether code or rows land first. The tolerant form removes that ordering dependence entirely.

| | |
|---|---|
| **Population** | `rk` · `barberlab-test` · `mr-h`. `alzabt-demo` is **excluded permanently** (decision D0) — and `status` does not distinguish it, so any compliance query must exclude it **by slug** or it silently returns |
| **Measured 2026-09-16** | `N₁ = 3` in population · `N₂ = 0` carrying a `lia` row · `N₃ = 0` |
| **Payoff condition** | every in-population tenant carries an active `lia` row, **and** a fixture/test proves the two keys are independent — a `lia`-only tenant passes ① and is refused at ② by name, and a `reservations`-only tenant is refused once the `OR` is gone |
| **NOT the condition** | a live tenant running on `lia` alone. Such a tenant passes ① and then fails every registered operation, because no operation's `service_key` is `lia`. It would greet and refuse everything — that is a broken tenant, not evidence (decision R6) |
| **Blocked on** | `F4-B`: the four provisioning maps do not contain `lia`, so a newly seeded tenant is born non-compliant **after** compliance is declared. Re-measure at the moment of removal, not before |

### ② Operation capability, and the two checks that must never merge

```
①  access to Lia        serviceKey ∈ ("lia","reservations")     _tenant_has_lia
②  the OPERATION's own  OP.service_key                          _authorise_operation
③  the customer flow's  "reservations"                          _tenant_has_reservations  ← the
                                                                   escape hatch, a THIRD gate
```

Merging ① and ② re-pins Lia to `reservations` through the other door. Merging ② and ③ hands an
owner into a booking flow on a tenant with no Reservations surface. All three are checked
separately, and `scripts/test_lia_foundation.py` asserts the separation against the parsed source,
not against its prose.

### The operation contract

`app/services/lia_operations.py` — `OperationDefinition(permission, legacy_roles, service_key,
write_fn)`. The operation supplies the question; the human actor supplies the answer; **Lia holds
no permission of her own** (invariant I-7, and the reason no `lia.write` string exists anywhere).

| operation | permission | legacy_roles | service_key | mirrors |
|---|---|---|---|---|
| `create_service` | `services.write` | 2 roles | `reservations` | `admin/catalog_services.py:81` |
| `create_reservation` | `reservations.write` | 4 roles | `reservations` | `admin/reservations.py:220` |
| `create_catalog_item` | `catalog.write` | 4 roles incl. `MANAGER_UNITS` | `catalog` | `admin/catalog.py:142` |
| `create_product` | `store.write` | 3 roles, **no** `MANAGER_UNITS` | **`store`** | `admin/store.py:175-176` |
| `log_daily_visits` (2026-09-21) | `reservations.write` | 4 roles | `reservations` | `admin/reservations.py:302` — same write function as `create_reservation` |
| ↳ its edit contract (2026-09-23) | — | — | — | A typed message at the preview is a **correction of one name**, matched by a shared folded word or a one-character miss. Zero or two matches ⇒ the approved question and its buttons, never a guess. Carries a digit ⇒ out of scope, buttons. Nothing is written: the correction re-shows the whole list and ✅ still decides |
| `daily_report` (2026-09-21) | `reservations.read` | 4 roles | `reservations` | `admin/reservations.py:99-108` — a read; `write_fn` holds the reader |

`legacy_roles` is the fourth field and not a convenience: invariant I1 judges an account with
`permissions IS NULL` against **that route's own tuple**, the four real tuples differ, and all
three live tenant owners are legacy accounts. Carrying only the permission would have silently
changed what every real owner may do.

**`create_barber` is absent, not disabled** (decision a-2): it has no service-layer write
function, so reusing `barber_repo.create_barber` from here would bypass `clientId` and
`normalize_for_storage` — the latter being the جعفر defect. It enters the registry when a shared
service-layer write path is extracted.

**`create_product` was in that same sentence until 2026-09-17, and the sentence was wrong.** a-2
excluded it on the stated ground that the store product path had no service-layer function. It
has one: `catalog_service.admin_create_item`, which is what `admin/store.py` itself calls.
`scripts/test_lia_product_s1.py` runs that real function against a faked repository and asserts
the row is a correct product — `clientId` carried, the store partition, `isActive` set by the
service, and no duration field. So the operation qualifies under a-1 on the same terms as the
others; no exception was made for it, and a-2's exclusion list is now `create_barber` alone.

**Two definitions over one write function, deliberately.** `create_product` and
`create_catalog_item` both call `admin_create_item`, and they must stay separate because the
SURFACE decides the gate: `catalog` is inactive on all three live tenants while `store` is active
on rk and barberlab-test, and `admin/store.py` admits no `MANAGER_UNITS` where
`admin/catalog.py` does. Reusing one definition for the other would either refuse every real
owner or widen what a legacy `MANAGER_UNITS` account may do from WhatsApp. **The table decides
what is written; the route decides who may ask.**

### Authorisation, in the decided order

```
C   identity   Resolver Lia — tenant + ONE active actor, ambiguity refused by count (I-3, Lia-scoped)
①   access     _tenant_has_lia                     ← and this alone gates the welcome (R1)
[   the operation becomes known   ]
A   capability client_services{ OP.service_key }
B   permission is_authorized(actor, OP.permission, *OP.legacy_roles)
    → re-run C · ① · A · B before the write, with the SAME OperationDefinition
```

Named refusals: `identity_unresolved` · `identity_ambiguous` · `tenant_changed` ·
`lia_access_inactive` · `capability_inactive` · `missing_permission`. A `C` failure is **silent**
plus an audit record — an unresolved sender must not learn what this number accepts; `①`, `A` and
`B` are told plainly, without naming the permission.

**`user_repo.find_user_by_phone` is deliberately untouched.** It is the login path, it is
cross-tenant by necessity, and it resolves ambiguity by signing in the oldest account — changing
it would stop a person who owns two shops from logging in at all. I-3's scope is Lia's own
resolution (decision R4).

### Behaviour change on record

The welcome is now gated on ① . Before, it went out on identity alone, so an owner whose tenant
had no Lia access was greeted by an assistant that would refuse his first instruction. He now
falls through to the customer flow, and **no new wording was invented** to say it. Zero effect on
the three live tenants, all of which pass ① today.

### The provisioning invariant (a3-PR)

> A tenant Lia operates on must have an active `User` reachable from its published shop number.

### ✅ G3 decided, 2026-09-16 — `G3-a + G3-d`

**`G3-a` — Foundation closes WITHOUT a hard provisioning block, and the reason is measured:**

```
the invariant fails CLOSED           a violation yields a refusal, never a wrong actor and never
                                     a write.  ⇒ the security gain of PREVENTION is zero;
                                     the invariant is an availability precondition, not a guard
a blanket block fires ONLY on demo   registration_service already satisfies it (never fires),
                                     demo_service structurally cannot (always fires)
                                     ⇒ 100% false-positive rate on the only path it would trip
a block scoped to the `lia` key      `lia` is in ZERO provisioning maps today, so it would never
                                     fire on anything — costless AND useless until F4-B adds it
```

⇒ **the hard-block half is DEFERRED to `F4-B`, not cancelled.** When `lia` enters the provisioning
maps, a block scoped to that key becomes both meaningful and harmless, and is decided then.

**`G3-d` — what was actually broken, and is now fixed.** The analysis found a gap that a
provisioning block would NOT have closed: an unresolved identity at the welcome returned `None`
with **no audit record at all**. So a legitimate owner on a violating tenant got silence, and *we*
got nothing either — the same shape as the جعفر incident, a failure invisible on both sides.

The fix is a distinction, not a message:

```
identity_unresolved     nobody we know wrote in — a customer said hello.  NOT audited: it is the
                        overwhelming majority, and recording it would drown the log.
owner_number_unlinked   a tenant's OWN published number wrote in and no active account carries it.
                        Rare, always a misconfiguration, always audited.
identity_ambiguous      resolves to two accounts.  Audited.
```

`lia_owner_greeting_unresolved` is recorded for the latter two. **The sender is still told nothing**
— that silence is deliberate (A2-c) and unchanged — and **no new wording was invented**.

### The invariant's two halves today

Runtime half: `identity_unresolved` / `owner_number_unlinked`, enforced and now audited.
Provisioning half:
`scripts/audit_lia_owner_actor_invariant.py` (read-only; 3/3 in-population tenants pass as of
2026-09-16). **A hard block was NOT inserted into the shared provisioning paths** — measured,
`registration_service` already satisfies the invariant and `demo_service` structurally cannot
(placeholder `demo-<slug>` phone, no user phone), so a raise would break demo creation for tenants
D0 excludes anyway. That reduction is deliberate and is recorded as an open item, not closed.

## Open Findings

| # | Finding | Severity |
|---|---|---|
| 1 | `ANTHROPIC_API_KEY` was invalid/unset until 2026-09-13; `ai_chat.py` and `onboarding.py` were silently non-functional with it. Fixed by Salman adding a valid key. | 🟡 Resolved, recorded |
| 2 | LLM provider coupling is **triplicated** (`lia_owner_entry`, `onboarding`, `ai_chat`). An adapter is deliberately NOT built — one provider does not meet this project's Abstraction Rule. | 🟡 Backlog |
| 3 | Three write paths for "service" exist pre-Lia. Lia targets one; consolidation is separate. | 🟡 Recorded |
| 4 | 🟠 **DECIDED 2026-09-24 — to be recorded** (Salman); NOT built yet: it opens a write path for owner data and needs its own contract. Today: owner-entry messages are **not recorded** in `whatsapp_messages` — Lia runs before tenant resolution, so no conversation exists yet. History gap, not a correctness gap. | 🟡 Named follow-up |
| 5 | An English input filled `name_ar` by translating and left `name_en` null — a fillable column left empty, the very class of gap this contract argues against. | 🟢 Small, backlog |
| 6 | No retention policy exists for any media, which Phase 2/3 will need. | 🔴 Decision required |
| 7 | **A second appointment in one message is silently dropped.** The prompt answers `low` for it (`app/prompts/lia.md:273`); R1 (2026-09-19) made the server stop obeying `low` for reservations, and nothing replaced that signal. Named as a risk when R1 was decided; now a live defect. | 🔴 Decided 2026-09-20 → one draft holding both |
| 8 | **A dictated customer phone was stored raw.** `_parse_field_answer` normalised a phone the owner TYPED as an answer; nothing normalised one he DICTATED in the sentence, so one person could become two `customers` rows and the first was unreachable by any outbound send. **Fixed 2026-09-20** at the point the value enters the draft (not at validation — the preview must quote what will actually be stored). No production row had carried the defect yet. | 🟢 Fixed, before any bad row |
| 9 | 🟠 **DECIDED 2026-09-24 — show the selector for every preset** (Salman); NOT built yet (frontend + real browser verification). Today: **the account↔barber link is unreachable from the dashboard for an owner.** `TeamTab.jsx:632` shows the selector only when `requiresBarber`, true for the `staff` preset alone; the backend accepts `barber_id` for any preset (`team.py:466`). rk's owner was linked by an approved one-off write on 2026-09-20 instead. Showing the control for every preset is **not decided**. | 🟡 Decision required |
| 10 | ✅ **CLOSED 2026-09-24** (Salman's word, closing the vertical): it is recognised now, in `_WALKIN_WORDS`. Was: **«ما معي رقمه» is not recognised as walk-in** — only «ما عندي رقمه» and its siblings are (`_WALKIN_WORDS`). Safe (it falls through to the question) but repetitive for an owner who says it the other way. Widening the list changes what Lia recognises, so it waits for a word. | 🟢 Small, decision required |
| 11 | **Lia has no `verification/*.md` of her own**, so the Maturity Review gate above cannot be satisfied without one. See §Maturity. | 🟡 Decision required |
| 12 | **`WALK_IN` is not a customer identity, but the implementation uses a SHARED `Customer` placeholder row.** Verified today: it never collides with a real customer (the sentinel matches no phone), the real name is kept on the `Reservation` itself, and no notification is sent. Not satisfied: every walk-in of every day shares one row. **Accepted as a documented temporary trade-off (Salman, 2026-09-20) and must be re-evaluated before reporting / customer-history / CRM is taken seriously.** No `customerId=null` path and no write-path change is opened now. | 🟡 Product/domain debt, dated |
| 14 | **`metadata.daily_log` is a TEMPORARY BRIDGE for cash amounts** (Salman, D-B, 2026-09-21): `{v: 1, amount, currency, service_said}` on a `Reservation` written by `log_daily_visits`. No payment column or table exists, and none is opened now. Safe by measurement: `create` writes metadata verbatim, the only update path MERGES (`reservation_service.py:1083`), and no reader iterates it. The public/admin routes accept any metadata dict, so the key can be forged there — but `source` is set by the server per caller, and `daily_report`, its **only** consumer, counts `source=lia` + `v=1` + `arrived` only. **Not to be generalised into metadata-as-domain-storage.** | 🟡 Temporary bridge, dated |
| 13 | **`arrived` has no correction path.** Terminal in `TRANSITIONS` (both directions), excluded from the customer-cancel query, and the repository has **no delete path for a reservation at all** — only `edit_reservation` (which carries no status guard) can still touch such a row. So a visit logged in error stays. **Explicitly NOT a blocker for D-2 (Salman, 2026-09-20): it is separate data-governance debt.** | 🟡 Data-governance debt, dated |

---

## Related

`.claudedocs/plans/lia-owner-data-entry.md` (the architecture study, 21 sections) ·
`capabilities/catalog.md` (the owner of what Lia writes) ·
`.claude/rules/repository-hygiene.md` (Persona & Prompt Drift → `app/prompts/**`) ·
`.claude/rules/backend/architecture.md` §9–§10 (one write path; Admin/Public projections) ·
`.claude/rules/backend/security.md` §4 (owner / admin / barber vocabulary) ·
`.claudedocs/plans/reservation-whatsapp-domain-alignment.md` (the channel this runs on)
