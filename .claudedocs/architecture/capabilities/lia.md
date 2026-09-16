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
| **Writes through** | `catalog_service_service.admin_create_service()` — the same function `POST /api/v1/admin/catalog-services` calls — and, since 2026-09-17, `catalog_service.admin_create_item()`, the same function `POST /api/v1/admin/store/products` calls. The functions themselves, not copies of their bodies. **Two operations, zero new write paths.** |
| **Owned by** | The Reservations domain. Lia is an INTERFACE onto `catalog` (see `capabilities/catalog.md`). |
| **Prompt** | `app/prompts/lia.md` — governed by `repository-hygiene.md`'s Persona & Prompt Drift rule. |
| **Contracts** | `app/schemas/lia_drafts.py` — `LiaExtraction`, `LiaServiceDraft`. |
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
| `create_product` from text | **S3** | ✅ **Built 2026-09-17** — 99 checks, awaiting live verification (S5) |
| `create_product_batch` (up to 10) | **S4** | 🔵 Next — B1/B3/B4 in `plans/lia-product-entry.md` |
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

**Maturity: Phase 1 live, one real tenant, one real operation, one day old.** Not yet reviewed
under `architecture-review-loop.md`; due for its first Maturity Review once a second operation
ships.

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
| 4 | Owner-entry messages are **not recorded** in `whatsapp_messages` — Lia runs before tenant resolution, so no conversation exists yet. History gap, not a correctness gap. | 🟡 Named follow-up |
| 5 | An English input filled `name_ar` by translating and left `name_en` null — a fillable column left empty, the very class of gap this contract argues against. | 🟢 Small, backlog |
| 6 | No retention policy exists for any media, which Phase 2/3 will need. | 🔴 Decision required |

---

## Related

`.claudedocs/plans/lia-owner-data-entry.md` (the architecture study, 21 sections) ·
`capabilities/catalog.md` (the owner of what Lia writes) ·
`.claude/rules/repository-hygiene.md` (Persona & Prompt Drift → `app/prompts/**`) ·
`.claude/rules/backend/architecture.md` §9–§10 (one write path; Admin/Public projections) ·
`.claude/rules/backend/security.md` §4 (owner / admin / barber vocabulary) ·
`.claudedocs/plans/reservation-whatsapp-domain-alignment.md` (the channel this runs on)
