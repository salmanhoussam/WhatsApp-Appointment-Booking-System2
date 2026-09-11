# CLIENT + TENANT DATA DECISION GATE

**Date:** 2026-09-10 · **Decided by:** Salman · **Status:** RATIFIED — documentation only
**Investigation:** `.claudedocs/plans/client-tenant-data-audit.md`
**No code, schema, migration, seed or DB write follows from this document.**

> **Governing principle, adopted now, implemented later:**
> **User / Owner ≠ Tenant / Business ≠ WhatsApp Business Identity.**
> Treat these as three separate concepts in all analysis. Do **not** begin separating them in the
> schema.

---

## Q1 — May one owner own more than one tenant? → **YES**

Owner identity is independent of tenant identity. `clients.phone UNIQUE` must not block this when
the number belongs to the same owner. No schema change now.

### Impact — this is already the live state, not a future scenario

| Fact (measured on production) | Consequence |
|---|---|
| `78727986` → `cafe` + `smar` · `71234567` → `roz` + `tastybites` | **One owner across several tenants already exists.** The decision ratifies reality |
| `public.users` UNIQUE = `id`, `email`, `setup_token`, `barber_id` — **`phone` is NOT unique** | The duplicate rows above are legal. Nothing has to change for phone |
| **`users.email` IS globally unique** | 🔴 **The real blocker.** One owner cannot reuse one email across tenants. Today each tenant needs a separate email for the same person |
| `users.client_id` is **NOT NULL** | One `User` row belongs to exactly one tenant. "One owner, many tenants" therefore means **duplicated identity rows**, not one identity linked to many. A shared owner identity needs a link table — a schema question, deferred |
| `find_user_by_phone` uses `find_first` with **no ordering** | 🔴 With `78727986` on three rows, phone login is **non-deterministic about which tenant you land in**. Live, not hypothetical |
| `clients.phone UNIQUE` | Fired once already: Salman's number on `smar` blocked `barberlab-test` until it was stripped off a live tenant by hand |

**Later work this decision creates:** separating Owner identity from Tenant/business identity from
WhatsApp business identity — three concepts currently sharing two columns.

---

## Q2 — `vertical` or `service_type`? → **`vertical` is canonical**

`service_type` is **LEGACY / non-canonical**. Do not delete the column, migrate, refactor, or change
seeders. Document only.

### Impact — where `service_type` is still relied on

| Layer | Site |
|---|---|
| **Written** | `registration_service.py:142` · `demo_service.py:339` |
| **Published** | `public_service.py:231` → the public `/config` payload · `super_service.py:31` |
| **Frontend** | `ConfigurableHero.jsx:57,258,330` — hero subtitle and badge text · `ClientsManager.jsx:437` |
| **Maps keyed on it** | `SERVICE_TYPE_MAP` (`core/services.py:25-31`) · `_SERVICE_SEED_MAP` (`registration_service.py:54`) |
| **Dead already** | `seed_services_for_client()` — the only function that branches on it **has no caller** |

🔴 **17 of 22 tenants have `vertical = NULL`.** Making it canonical leaves them unclassified —
`vertical` is a hard gate (`registration_service.py:111-114` raises; `admin/provisioning.py:58-64`
400s), so backfilling it is a prerequisite for anything that reads it, not an afterthought.

---

## Q3 — `clients.phone` is **not** Owner Login Identity

Owner identity lives on `User`. Keep `clients.phone`; keep `NOT NULL`; keep `UNIQUE`; do not move
WhatsApp resolution. Design the separation before touching any of it.

### Its three current roles

| # | Role | Consumer |
|---|---|---|
| 1 | **Inbound WhatsApp tenant resolution** — digit-normalised match against Meta's `display_phone_number`, must match exactly one row | `whatsapp_flow.py:756-762` |
| 2 | **Outbound merchant-alert fallback** — `whatsapp_number or phone` | `reservation_service.py:119` |
| 3 | **Uniqueness key** | `clients_phone_key` |

Role 1 is what **Phase 2 of the WhatsApp plan (per-tenant WABA)** depends on. Any future change to
this column is also a Phase-2 decision.

### Consequence of this decision, effective immediately in analysis
Because owner identity is `users.phone`, the **phone-login defect becomes load-bearing rather than
cosmetic**: `find_user_by_phone` normalises the typed input and compares it literally to the stored
column, so every account stored in the format `phone-numbers.md` mandates — including حسين, the real
owner of `rk` — cannot log in by phone. See the audit §10. **Not fixed; not in scope.**

🟡 **Noted, not acted on:** `barberlab-test.phone` currently holds Salman's personal number. Under
this decision that column is *tenant/business contact*, not owner identity — a semantic mismatch on
a test tenant, and it is also role 1's key.

---

## Q4 — Demo tenant creation → **controlled / admin-driven**

Public **self-registration** is not part of the final product. Public **access** to an existing demo
tenant is fine for QA and browsing.

> **PUBLIC ACCESS ≠ PUBLIC TENANT CREATION.**

### Impact
Production already matches this: `POST /api/v1/public/demo/create` returns **`403`**
(`SELF_REGISTRATION_ENABLED=false`). **No change is required now** — the decision ratifies the
current gate rather than asking for work. Public read access is likewise already true and stays:
`demo.salmansaas.com/demo-barber-6efb` renders to an anonymous visitor.

---

## Q5 — Currency → **tenant-level business configuration**

No global `SAR` default; no new global `USD` hardcode. Lebanese demo/test tenants are `USD` **when
explicitly configured**. A Seeder must never invent a currency for a real tenant. No schema change,
no default migration.

### Impact
🔴 `app/api/v1/public/store.py:328` **hardcodes `"currency": "USD"` on every order**, ignoring
`Client.currency`. That contradicts "tenant-level" directly and would mislabel a non-USD tenant's
stored orders. **Recorded as a conflict with this decision; not fixed.**

Also note the schema default `'SAR'` is **unreachable** — both real creation paths
(`registration_service.py:131`, `demo_service.py:329`) write `"USD"` explicitly.

---

## Q6 — `smar`'s phone → **UNRESOLVED**

`96176317947` is **not** accepted as Bait Smar's real number until confirmed in the real world.
Do not change it, move it, delete it, or use it in any other test. **No DB write on an assumption.**

---

## Consequences for the Seeder *(derived from Q1–Q6 only — the Seeder is not being built)*

### MUST NOT
- Invent a phone number for `clients.phone`, `clients.whatsapp_number` or `users.phone` — **Q3, Q5**
- Use a placeholder tenant phone. This retires the three existing patterns:
  `demo-{slug}` (`demo_service.py:320`), `placeholder_{slug}` (`seed_unified_clients.py:83`),
  `TODO_PHONE_{slug}` (`onboard_anas.py:79`)
- Invent WhatsApp identities, external IDs, WABA credentials or production URLs
- Assume one owner ⇒ one tenant — **Q1**
- Invent a currency for a real tenant — **Q5**
- Treat `service_type` as the tenant's classification — **Q2**
- Write anything to `smar` — **Q6**
- **Stop and report missing input** rather than substitute a value, whenever a required identity
  field is absent

### MAY
- Generate a slug (already collision-checked with retries)
- Generate a synthetic **`users.email`** where explicitly allowed — `{slug}@demo.salmansaas.com`.
  This is the working login path and is not a real-world identity claim
- Generate a password (`secrets.token_urlsafe`)
- Generate structural demo data — default working hours, the generic category name, a demo colour
  (already judged universal at `provisioning_service.py:18-24`)
- Create **several tenants for one owner identity** — **Q1**
- Set `currency` from an explicit demo profile/preset — **Q5**

### The rule underneath all of it
**Synthetic is allowed only where the value is not a claim about the real world.** A slug is a
handle. A phone number is an identity.

---

## Still open — not decided in this gate

**`clients.email` — keep or retire?** This was Q1 in the audit's own numbering and was not carried
into this gate. The evidence points to retiring it: it duplicates the owner's `users.email`
**verbatim** on 5+ tenants, has **no unique constraint**, and its only consumer is the client-login
path — which is dead, since only 1 of 22 tenants has a `password_hash` and no application code ever
writes one. **Flagged as an omission, not answered.**
