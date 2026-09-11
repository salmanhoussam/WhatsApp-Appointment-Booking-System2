# CLIENT + TENANT DATA AUDIT

> **Investigation report — nothing was changed.** No code, DB, migration, commit or push.
> On approval this is written to `.claudedocs/plans/client-tenant-data-audit.md`
> (standing rule: plans live in `.claudedocs/plans/`).

## Context

Salman could not log into `barberlab-test`, looked at the `clients` table, and found two phone
numbers, many empty columns, and no email on most rows. He asked, before phases B–E of
`tenant-identity-and-seeding.md`: what does the system actually consider a valid tenant, and what
must a Seeder produce?

**Two findings reshape the request.**

> **1. The Seeder already exists.** `app/services/demo_service.py` + `provisioning_service.py`,
> behind `POST /api/v1/public/demo/create`, gated by `require_self_registration_enabled`
> — **verified live: `403`**. `provisioning_service.py` already separates *mechanism* from
> *content* by an explicit 2026-08-15 decision. That is exactly the boundary a Seeder needs.
>
> **2. It produces a tenant that fails this project's own Completion Gate.** Verified in a real
> browser on `demo.salmansaas.com/demo-barber-6efb`:
> **"الصفحة قيد الإعداد. استخدم بناء الصفحة في لوحة التحكم لإضافة الأقسام."**
> — the exact empty state `.claude/rules/tenant-onboarding.md` §7 forbids.

So this is not "build a Seeder." It is **"finish the one that exists, and remove the constraint
that forces it to lie."**

---

## 1. `clients` — 22 rows, 32 columns

`UNIQUE`: `slug`, `phone` only. `NOT NULL`: `id, name, slug, phone, is_active, created_at,
updated_at, currency, config, status, page_type, tier, lifecycle_state`.

| Filled | Columns |
|---|---|
| 0/22 | `hero_video_url` · `provisioning_status`* |
| 1–2/22 | `password_hash` · `maps_url` · `notes` · `instagram_url` |
| 5–12/22 | `vertical` 5 · `template_key` 7 · **`email` 12** |
| 18–22/22 | everything else |

\* `provisioning_status` is 0/22 **by design** — see §2.

---

## 2. Runtime consumers — what actually reads each column

### Zero consumers anywhere in `app/` **or** `frontend/src/`
| Column | Evidence |
|---|---|
| **`tier`** | Only `schema.prisma:41` + one script. The schema's own claim that `ultra` unlocks `immersive_3d` **is not implemented anywhere** |
| **`hero_video_url`** | Repo-wide grep: zero. Not in the settings schema, not in `/config` |
| **`notes`** | Every `notes` hit in `app/` is `Booking`/`Reservation`/`StoreOrder`/`Price`, never `Client` |

### Write-only — written, never read back
**`selected_services`** — rebuilt by `core/services.py:119-126`; **no reader**. `/config` publishes
the live `clientServices` JOIN instead (`public_service.py:232`) — the exact JOIN the schema comment
says this column exists to avoid. Pure write amplification.

### Read-only — read, but no application code writes it
**`password_hash`** — `auth.py:119` verifies against it, but every `get_password_hash()` write in
`app/` targets **`User`**. **Confirmed on production: only `smar` has one, 1 of 22.** So
`POST /api/v1/auth/login` (the `type:"client"` token) can never succeed for any tenant this
application created. A whole dead authentication path.

### ⚠️ Correction to my own earlier draft — `provisioning_status` is **not** dead
`provisioning_service.py:175-189` uses it as a **P0 wipe-guard**: only `pending`/`failed` may be
claimed for re-provisioning, and `admin_client_repo.py:62-68` flips it atomically as a concurrency
claim. **NULL is the deliberate resting state that refuses a destructive re-provision.** I had it
listed as a dead column; it is the opposite of dead.

### Gating columns fail **open**
`status` (Hard Block) and `lifecycle_state` (Soft Block) are checked with `in _BLOCKED_STATUSES` —
**a NULL is not in the set, so it silently allows the tenant.** *(Latent only: 0 rows are NULL today.)*
`trial_ends_at` is **display-only** — no runtime code blocks an expired trial. **11 tenants are past
their end date and none are blocked.**

### The frontend's blast radius
| Field | If missing |
|---|---|
| **`active_services`** | **The highest-blast-radius field.** Cart bails out (`CartPage.jsx:476`), catalog/reserve routes redirect away, the whole admin nav collapses (`GenericAdminDashboard.jsx:576`) |
| **`config.content.sections`** | 0 sections ⇒ `DefaultFallback` ⇒ "الصفحة قيد الإعداد" (`DynamicPage.jsx:294-296, 143-172`) |
| **`whatsapp_number`** | Hero CTA, footer link and the entire WhatsApp checkout path silently disappear |
| `primary_color`, `currency`, `name_ar/en`, `payment_methods`, `instagram_url`, `maps_url` | All have fallbacks. Cosmetic |

### Two live hazards found in passing *(not this plan's scope, recorded)*
- `public_service.py:343` performs a **DB WRITE inside an unauthenticated, cached `GET`** — the
  smar auto-styling sentinel, reachable from `GET /smar/config`.
- `whatsapp_flow.py:735,752` runs **`find_many()` over the entire `clients` table on every inbound
  WhatsApp message** to match a slug or phone in Python.
- `reservation_service.py:369,378` — a NULL `config.working_hours` **silently disables**
  working-hours validation rather than failing. Bookings at 3 AM are accepted.

---

## 3. Tenant completion contract

**A. Absolutely required** — `id`, `slug`, `name`, `is_active=true`, `status`, `lifecycle_state`,
`currency`, `config` (non-empty `content.sections`), plus ≥1 `client_services` row.

**B. Required only for a capability**
| Capability | Needs |
|---|---|
| Reservations | `client_services['reservations']` · ≥1 `catalog_category` · ≥1 active `catalog_service` · ≥1 active `barber` **with `working_hours.open_time`+`close_time`** |
| Merchant WhatsApp alerts | `whatsapp_number` **or** `phone` — a real, country-coded number |
| Per-tenant inbound WhatsApp | `phone` matching Meta's `display_phone_number` (§9) |
| Catalog / store | `client_services['catalog'\|'store']` · ≥1 category · ≥1 item |
| Public page renders | `config.content.sections` non-empty |

**C. Optional** — `instagram_url`, `maps_url`, `template_key`, `payment_methods`, `unit_types`,
`name_ar`/`name_en` (backend coalesces both to `name`), `email`.

**D. Derived — a Seeder must never invent these** — `id`, `created_at`, `updated_at`,
`selected_services` (rebuilt from `client_services`), `provisioning_status` (owned by the
provisioning claim), `active_services` (a JOIN, not a column).

**E. Legacy / suspicious** — `tier`, `hero_video_url`, `notes`, `password_hash`,
`selected_services`, `service_type`, `page_type` (ignored whenever sections exist),
`unit_types` (returned by `/config`, read by no component).

**§2 already answers Q2 from the code:** `vertical` is a **hard gate**
(`registration_service.py:111-114` raises; `admin/provisioning.py:58-64` 400s), while
`service_type` **gates nothing** — it is echoed by `/config` and used for a hero subtitle. The one
function that branches on it, `seed_services_for_client()`, **has no caller.**

---

## 4. Cross-table dependency graph

**26 tables carry `client_id`. 24 have a real FK. Two do not** — verified against production:

```
Client (clients)  ── UNIQUE slug, UNIQUE phone
├─ ClientService ......... CASCADE  UNIQUE(clientId, serviceKey)   ← the capability gate
├─ User .................. CASCADE  (email UNIQUE globally, not per tenant)
│     └─ barberId → Barber (optional 1-1, SetNull)
├─ Barber ................ CASCADE
│     └─ BarberService .... 🔴 client_id column, NO FK        UNIQUE(barberId, serviceId)
├─ CatalogCategory ....... CASCADE
│     ├─ CatalogItem ..... CASCADE
│     └─ CatalogService ... CASCADE  (categoryId NOT NULL — no service without a category)
├─ Customer .............. RESTRICT  UNIQUE(clientId, phone)
├─ Property → Unit → Price/Booking .... Unit & Price are RESTRICT
├─ Reservation ........... CASCADE  + a raw partial unique index on (client_id, barber_id, reserved_at)
├─ Resource / GalleryImage / StoreCart / StoreOrder / Subscription / Fleet×6 ... CASCADE
├─ SecurityAuditLog ...... SET NULL (deliberate — denial history outlives the tenant)
└─ WhatsAppSession ....... 🔴 client_id column, NO FK (documented as deliberate)
```

**Checked on production, not inferred:** zero `barber_services` rows whose `client_id` disagrees
with their barber's. The missing FK is a **real hazard with zero current instances** — the
`rk-template-blueprint` calls it *"the single most dangerous column in the clone."*

---

## 5. Minimum Valid Tenant

The levels are real — each is a state the system genuinely distinguishes.

| Level | Rows | Proven by |
|---|---|---|
| **0 — Identity** | `clients` ×1 | `_verify_tenant` resolves `slug`; a 404 kills every route |
| **1 — Admin ready** | + `users` ×1 (TENANT_ADMIN, real email) | dashboard login; **email, not phone — see §10** |
| **2 — Reservation ready** | + `client_services['reservations']` · `catalog_categories` ×1 · `catalog_services` ×1 · `barbers` ×1 **with working hours** | 0 services ⇒ "لا توجد خدمات متاحة"; 0 barbers ⇒ "لا يوجد حلاقين"; no `open_time`/`close_time` ⇒ `get_available_slots` returns `[]` **forever, silently** |
| **3 — Store ready** | + `client_services['catalog','store']` · `catalog_categories` ×1 · `catalog_items` ×1 | `CatalogItem.categoryId` is NOT NULL |
| **4 — Full demo** | + **`config.content.sections` non-empty** · a real `whatsapp_number` | the Completion Gate, and the browser proof above |

**`barber_services` is NOT required.** `barberlab-test` books successfully with 0 links — the soft
filter (`whatsapp_reservation_flow.py:204-217`) falls back to the full barber list. **But partial
population is worse than none:** RK has 7 links across 2 barbers, and the blueprint measured
**1 bookable combination out of 21** when some belong to an inactive barber.

**The gap in every automated path:** `apply_page_repertoire()` (`provisioning_service.py:234-262`)
is a deliberate **no-op** — no vertical has a `page_template`. So **Level 4 is unreachable by any
code path today.** `provisioning_service.py:128-130` says so itself: `provisioning_status='complete'`
*"certifies only a subset of that chain, never Page Content, Media, or rendering."*

---

## 6. Seeder Agent design *(design only — not built)*

Do **not** write a new one. Extend the existing `demo_service` → `provisioning_service` chain, which
already has the right mechanism/content boundary, an atomic provisioning claim, and a wipe-guard.

```
INPUT   TenantProfile { name_ar, name_en, slug?, vertical, capabilities[],
                        owner{ full_name, phone, email }, shop{ phone } }
   │
   ├─ VALIDATE   slug free · phone free · owner email free
   │             every phone through app.core.phone.normalize_for_storage()
   │             ✋ any required identity field missing → STOP, report, write nothing
   │
   ├─ PLAN       capabilities → client_services keys (VERTICAL_REGISTRY)
   │             → dependency order (below)
   │
   ├─ INSERT     Client → ClientService → User → [provision_vertical_domain_objects:
   │             Barber(+working_hours) → CatalogCategory → CatalogService → BarberService]
   │             → 🆕 page content (the gap: apply_page_repertoire is a no-op today)
   │
   ├─ VERIFY     re-read every level of §5 from the DB, then fetch /{slug}/config
   │             and assert content.sections is non-empty  ← the Completion Gate, automated
   │
   ├─ ROLLBACK   delete the Client; 20 of 24 relations CASCADE.
   │             ⚠️ units, prices, customers are RESTRICT and barber_services has NO FK —
   │             they must be deleted explicitly, in order, or the delete fails / orphans
   │
   └─ REPORT     per-level pass/fail + the row counts that prove it
```

**Insert order is not stylistic.** `ClientService` must precede anything gated by
`require_service()`; `CatalogCategory` must precede `CatalogService` (`categoryId` NOT NULL);
`User` third so an email collision surfaces before domain rows exist.

---

## 7. Synthetic vs real data policy

| Field | Synthetic OK? | Why |
|---|---|---|
| `slug` | ✅ generated | Already collision-checked with 5 retries |
| `name`, `name_ar/en` | ✅ from input | Supplied, never invented |
| **`clients.phone`** | ❌ **real required** | It is an outbound WhatsApp target **and** the inbound tenant-resolution key (§9). A fake value guarantees `131026` and breaks per-tenant routing |
| **`whatsapp_number`** | ❌ **real required** | The primary merchant-alert target |
| **`users.phone`** | ❌ **real required** | Owner identity |
| `users.email` | ⚠️ **synthetic allowed** | `{slug}@demo.salmansaas.com` — this is the working login path and is not a real-world identity claim. Already the convention in 3 seed paths |
| `clients.email` | ✅ or omit | It duplicates the owner's `users.email` verbatim on 5+ tenants, has no unique constraint, and feeds only the dead client-login path |
| `password` | ✅ generated | `secrets.token_urlsafe` |
| `currency` | ❌ **decide, don't default** | Schema says `SAR`, both real paths hardcode `USD`, the platform is Lebanon. **The schema default is unreachable** |
| `primary_color`, `working_hours`, category name | ✅ structural defaults | Already judged universal, documented at `provisioning_service.py:18-24` |
| WhatsApp credentials, external IDs, production URLs | ❌ never | — |

**The rule:** synthetic is allowed only where the value **is not a claim about the real world**. A
slug is a handle; a phone number is an identity.

---

## 8. The 22 current rows

Only **6 of 22** carry a phone that is digits-with-country-code.

| Class | n | Rows | Treatment |
|---|---|---|---|
| **INVALID IDENTITY — machine-generated** | 2 | `demo-barber-d61e` `demo-barber-6efb` | **Do not hand-fix.** Identical shape, produced by `demo_service.py:320`. The generator regenerates them. Delete after §12, or leave until the generator is fixed |
| **INVALID IDENTITY — real business** | 5 | `caracas` `footlab` `olivello` `arizona` `beit-al-fakhar` | Need **real values from Salman**. No script can fix these |
| **INVALID IDENTITY — abandoned test** | 1 | `test-fashion` | Candidate for deletion |
| **INVALID FORMAT** | 8 | `cafe` `tastybites` `sneakers-lb` `sneakers-beirut` `alzabt-demo` + 3 `*-pilot-*` | Mechanical `normalize_for_storage()` pass. The 3 pilots are dated artifacts — delete instead |
| **VALID** | 6 | `smar` `roz` `assi` `rk` `barberlab-test` `mr-h` | Leave. `smar`/`rk`/`mr-h` are live — verify individually, by hand |

**Blocks a correct Seeder:** the `UNIQUE NOT NULL` on `phone` (§9).
**Blocks a later schema change:** the 8 junk values — any `CHECK` or normalisation constraint fails
until they are gone. This is why backfill must precede migration.

⚠️ **Three seed scripts are provably broken or stale** and would corrupt a rebuild:
`seed_barber_arch_test.py` references the dropped `Service` model (`AttributeError` before it
reaches the user step); `seed_all_json.py` imports a file that does not exist; `seed_ali_tenant.py`
uses the dead `CatalogItem + requires_booking` model, so `mr-h`'s services are invisible to
`/reservations/catalog-services`.

---

## 9. `clients.phone` — semantics and conflict

**It is three things at once**, and this is the correction to my earlier reading — `phone` and
`whatsapp_number` are **not** a simple fallback pair:

| Role | Consumer | Direction |
|---|---|---|
| **Inbound tenant-resolution key** | `whatsapp_flow.py:756-762` — digit-normalised match against Meta's `metadata.display_phone_number`, must match **exactly one** row | inbound |
| **Outbound merchant-alert target** | `reservation_service.py:119` — `whatsapp_number or phone` | outbound |
| **Uniqueness key** | `clients_phone_key` | neither |

`whatsapp_number` is **never** read by the inbound bot; `phone` is **never** the primary alert
target. They are two roles wearing one name.

**Why this matters beyond tidiness:** role 1 is exactly what **Phase 2 of the WhatsApp plan
(per-tenant WABA) depends on.** Any decision about `clients.phone` is a decision about that phase.

**The conflict, demonstrated 2026-09-10:** one person can own more than one shop; `UNIQUE` says
otherwise. Salman's number sat on `smar` and **blocked** putting it on `barberlab-test`; the only
way through was stripping it off a live tenant by hand.

**And `NOT NULL` is what manufactures the junk** — admitted in the code:
```python
# demo_service.py:318-320
# Client.phone is UNIQUE NOT NULL — use a placeholder unique value.
placeholder_phone = f"demo-{slug}"        # → demo-demo-barber-6efb
```
Same pattern in `seed_unified_clients.py:83` (`placeholder_{slug}`) and `onboard_anas.py:79`
(`TODO_PHONE_{slug}`). **Three independent authors reached the same workaround** — that is a schema
problem, not a discipline problem.

*No change is proposed here. Q3 below is the decision.*

---

## 10. Phone normalization audit

`find_user_by_phone` normalises the **typed** input to the local form, then compares it
**literally** against the stored column. `.claude/rules/phone-numbers.md` **mandates** storing with
the country code. The two never meet:

| typed | `normalize_for_storage` | `normalize_local_phone` | |
|---|---|---|---|
| `96170764479` | `96170764479` | `70764479` | ✗ |
| `070764479` | `96170764479` | `070764479` | ✗ |
| `0096170764479` | `96170764479` | `0096170764479` | ✗ |
| `3300771122` | `3300771122` | `3300771122` | ✓ |

**Measured on production — accounts unreachable by phone login:** all three `rk` accounts, including
**حسين, the real owner of a live tenant**. Every other tenant stores the local form and matches.
Nobody reported it because email login works.

Two further defects in the same helper:
- `normalize_local_phone` strips only `961` — **not** a leading `0`, **not** `00`. So `070764479`,
  the form a Lebanese merchant naturally types, matches nothing even on a locally-stored row.
- `split_for_display("3300771122")` → `('961', '3300771122')` — it **assumes** the country code.
  Editing and saving a legacy row would store `9613300771122`. **A data-corruption path on edit.**

`.claude/rules/phone-numbers.md` asserts the opposite — *"Live proof: `rkbarber@dev.invalid` is
stored with `961` and logs in successfully."* That login was by **email**. **The rule is wrong and
must be corrected alongside the code.**

*(Related, found while diagnosing the lockout: the login form fires **both** the admin and client
endpoints per attempt, so each attempt writes **two** failure rows. `MAX_FAILURES=5` therefore means
two and a half real attempts. Recorded, not this plan's scope.)*

---

## 11. Open decisions — cannot be settled from code or DB

**Q1. `clients.email` — keep or retire?** Evidence says retire: it duplicates the owner's
`users.email` verbatim on 5+ tenants, has no unique constraint, and its only consumer is the dead
client-login path.
**Q2. `service_type` vs `vertical`** — the code already answers it (§3). Confirm and retire the loser.
**Q3. May one owner own several shops?** This, not the schema, decides whether `UNIQUE` comes off
`phone`. **It is also a Phase-2 WhatsApp decision (§9).**
**Q4. Do demo tenants stay reachable from a public endpoint,** or become admin-only? The gate is
currently `false`.
**Q5. What is the real default currency?** `SAR` (schema) and `USD` (both code paths) are both wrong
for Lebanon.
**Q6. `smar`'s phone was changed to `96176317947` today.** Is that Bait Smar's real number, or a
side effect of freeing Salman's number? A live tenant's contact number.

---

## 12. Recommendation — one next step

**Answer Q1–Q6 in a short decision pass. Nothing else starts first.**

Everything downstream forks on Q3: if one owner may own several shops, `UNIQUE` comes off `phone`
and the Seeder can stop inventing values — which removes the *cause* of 8 of the 16 bad rows rather
than mopping them up. Backfilling first would mean redoing it after the decision.

Then, in this order — **and only after Phase 0 of the WhatsApp plan closes**, since RC1 is still
open and holds the higher priority:

1. **Fix `find_user_by_phone` + correct `phone-numbers.md`** (§10). Smallest, highest-value, and
   independent of every decision above. Gate: حسين logs into `rk` with his number, proven by a real
   `admin_login_success` row.
2. **Close the Seeder's page-content gap** (§5) so `apply_page_repertoire` stops being a no-op and a
   demo tenant reaches Level 4. Gate: a fresh demo tenant's public page renders real sections in a
   real browser — the same check that failed today.
3. **Backfill**, then **migrate**. In that order, for the reason in §8.

**Not now:** deleting any tenant (`project_verticals_settled` requires grepping a slug first), the
three broken seed scripts, and the two live hazards in §2 — each needs its own decision.
