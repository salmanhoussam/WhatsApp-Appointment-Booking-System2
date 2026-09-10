# Tenant Identity & Seeding — the `clients` table

**Status:** PLAN — not started. **Written:** 2026-09-10 · **Owner:** Salman
**Trigger:** Salman, 2026-09-10, after failing to log into `barberlab-test`: *"فتت نظرة ع الجدول
ويتناسب مع كل setup، فيه رقمين — صاحب المحل والمحل — وفيه كتير خانات فاضية، بدنا plan."*

> Executable from a cold start. §1 is the measured reality, §2 the one defect everything else grows
> from, §3 the column verdicts, §4 the seeding contract, §5 the phases. Nothing here is started.

---

## §0 — Tooling and traps

```bash
# production read (guard validates by ROLE, refuses the retired Sydney DB)
venv/bin/python -c "
import sys; sys.path.insert(0,'.'); sys.path.insert(0,'scripts')
import psycopg2; from _db_target import resolve
c = psycopg2.connect(resolve(direct=True, quiet=True))"
```

- **`clients.phone` is `NOT NULL` + `UNIQUE`** (`clients_phone_key`). Both halves matter — see §2.
- Column names in Postgres are **snake_case** (`client_id`, `is_active`), Prisma's are camelCase.
  A query written from the Prisma schema fails with `UndefinedColumn`.
- **Salman edits production directly.** On 2026-09-10 `smar.phone` and `barberlab-test.phone` both
  changed mid-session. **Re-read before acting on any earlier snapshot.**
- `.claude/rules/phone-numbers.md` is the governing rule: **stored WITH the country code, digits
  only; entered WITHOUT it.** It is currently violated by 16 of 22 rows.

---

## §1 — Measured reality (2026-09-10, 22 rows, 32 columns)

### Phone: 6 of 22 rows are correct

| Class | Count | Examples |
|---|---|---|
| Correct (`digits`, with country code) | **6** | `96176985477` · `96178727986` · `76086128` |
| Junk placeholder in a `NOT NULL` column | **8** | `placeholder_caracas` · `TODO_PHONE_anas` · `+961-arizona-00` · `demo-demo-barber-6efb` |
| Real number, wrong format | **8** | `+96178727986` · `+9613300779911` |

### Fill rates

| Column | Filled | Note |
|---|---|---|
| `hero_video_url` | **0/22** | dead |
| `provisioning_status` | **0/22** | dead |
| `password_hash` | 1/22 | legacy client-login path |
| `maps_url` · `notes` | 1/22 | |
| `instagram_url` | 2/22 | |
| `vertical` | 5/22 | deliberate — only the barber tenants |
| `template_key` | 7/22 | |
| **`email`** | **12/22** | Salman's own observation: ten tenants have none, including `mr-h`, `alzabt-demo`, `barberlab-test` |
| `whatsapp_number` | 18/22 | |

### Defaults that are wrong for this platform

- `currency` defaults to **`'SAR'`** — a Lebanon platform defaulting to Saudi Riyal.
- `service_type` defaults to **`'real_estate'`** — the platform's business is barbershops now.
- Two barbershops disagree with each other: `rk` is `service_type='barbershop'`, `mr-h` is
  `'services'`. Same business, two classifications.

---

## §2 — The one defect everything else grows from

> **`clients.phone` is being asked to be two different things at once, and a `UNIQUE` constraint
> makes that contradiction fatal.**

It is simultaneously:

1. **The shop's contact number** — the outbound WhatsApp target for merchant alerts
   (`reservation_service.py:118`, `client.whatsapp_number or client.phone`), and
2. **The owner's identity** — the number a person types to log in.

An owner may own more than one shop. `UNIQUE` says they may not. This is not theoretical: on
2026-09-10 Salman's number sat on `smar`, which **blocked** putting it on `barberlab-test`, and the
only way through was to strip it off `smar` — a live tenant — by hand.

And because the column is `NOT NULL`, every seeding path that has no real number **must invent
one**. That is the direct, mechanical cause of all 8 junk placeholders. The junk is not sloppiness;
it is the schema demanding a value nobody had.

### The related login defect (found the same day, recorded, not yet fixed)

`user_repo.find_user_by_phone` normalises the **typed** input (strips `961`) and then compares it
**literally** against the stored column. A row stored with the country code — which
`phone-numbers.md` **mandates** — can therefore never match.

```
typed 96176985477 → normalised 76985477 → compared to stored "96176985477" → no match
```

**Every `rk` account, including حسين the real owner, cannot log in by phone.** Nobody noticed
because email login works. `.claude/rules/phone-numbers.md` asserts the opposite ("live proof … logs
in successfully") — that login was by **email**; the rule conflated the two paths and must be
corrected.

Storing the local form instead is not the fix: `78727986` already exists on `cafe` and twice on
`smar`, and `find_first` has no ordering — a phone login could land on the wrong tenant.

---

## §3 — Column verdicts (proposed; each needs Salman's yes)

| Column | Verdict |
|---|---|
| `phone` | **Split.** Becomes the *shop's* number only. Drop `UNIQUE`; keep `NOT NULL` only once every row has a real value |
| owner identity | Already lives on `users.phone` + `users.email`. Stop duplicating it on `clients` |
| `whatsapp_number` | **Keep, promote.** It is what the alert path actually reads first. Make its relationship to `phone` explicit instead of incidental |
| `email` | **Decide what it means** — the shop's public email, or the owner's login? Today it is neither consistently. 10 rows have none and nothing breaks, which suggests nothing reads it |
| `password_hash` | **Retire.** 1/22. The legacy client-login path; `users` is the real auth table |
| `hero_video_url` | **Retire.** 0/22 |
| `provisioning_status` | **Retire or implement.** 0/22 — a column that was designed and never wired |
| `currency` | Change the default to the real one |
| `service_type` vs `vertical` | **Two columns for one question.** `vertical` is the newer, deliberate one (5 rows). Decide which survives — do not keep both |
| `template_key` · `instagram_url` · `maps_url` · `notes` | Optional-by-design. Leave nullable, no action |

---

## §4 — The seeding agent's contract

A `demo-tenant-seeder` produces a tenant that satisfies **`.claude/rules/tenant-onboarding.md`'s
Completion Gate** — Client → User → Services → Settings → Page Content → public page renders →
dashboard renders — and nothing less counts as seeded.

**It must never invent a phone number.** If no real number is supplied it stops and asks
(`service-execution-constitution.md`, principle 6: *upstream first*). Every junk row in §1 exists
because the previous generation of this code did the opposite.

**Every number it writes passes `app/core/phone.normalize_for_storage()`** — the single conversion
point the phone rule names. No seeding path formats a number by hand.

**It writes an owner `User` with a real email**, because email is the login path that actually
works today (§2).

It follows `SERVICE_CONTRACT_TEMPLATE.md` and leaves `execution-context.md` + `evidence.md` under
`.claudedocs/work/demo-tenant-seeder/<run-id>/`, per the Service Execution Constitution.

---

## §5 — Phases

Each phase has a gate. **Phase 0 of the WhatsApp plan takes priority over all of this** — this work
starts only once RC1 is resolved, or Salman explicitly re-orders.

### Phase A — Decision pass *(no code, no DB)*
Answer §3's verdicts and the two open questions in §7. Output: a decision sheet.
**Gate A:** every column in §3 has a yes/no with a reason. No migration is designed before this.

### Phase B — Fix the login defect *(code only)*
The `find_user_by_phone` mismatch, and the correction to `.claude/rules/phone-numbers.md`.
**Gate B:** حسين's real number logs into `rk` on production, verified by a real `admin_login_success`
row in `security_audit_log` — not by reading the code. Also: no phone resolves to a tenant other
than its own (the `78727986` collision).

### Phase C — The seeder *(new code, test tenants only)*
Build `demo-tenant-seeder` to §4. Prove it on a fresh throwaway slug.
**Gate C:** a brand-new tenant reaches the Completion Gate with **zero** placeholder values, and its
`clients` row passes a validator that rejects every pattern in §1's junk column.

### Phase D — Backfill *(production writes, one shot, snapshot first)*
The 8 junk rows and the 8 wrong-format rows.
**Gate D:** 22/22 rows pass the Phase-C validator. `smar`, `rk` and `mr-h` are verified individually
by hand — they are live.

### Phase E — Schema change *(migration)*
Whatever Phase A ratified: dropping `UNIQUE`, retiring dead columns, fixing defaults.
**Gate E:** taken last **on purpose** — a migration before the data is clean would freeze the mess
into a new shape. `feedback_migration_staging_discipline` applies: there is no staging, so a
snapshot is the only rollback.

---

## §6 — Explicitly out of scope

The `Barber → Staff` migration (deferred by its own decision). The permission model. Anything in the
WhatsApp plan. Deleting a tenant — `project_verticals_settled` requires grepping a slug before
removing it, and the two `demo-barber-*` rows are exactly the kind of thing that looks disposable
and is not, until checked.

---

## §7 — Open questions

**Q1.** What is `clients.email` *for* — the shop's public address, or the owner's login? Ten tenants
have none and nothing breaks, which is itself an answer worth confirming.
**Q2.** `service_type` or `vertical` — which one survives?
**Q3.** Should one owner be able to own several shops? The answer decides whether `UNIQUE` comes off
`phone`, and it is a product question, not a schema one.
**Q4.** The two `demo-barber-*` tenants with `demo-demo-barber-<hash>` phones — generated by what,
and is that generator still running?
