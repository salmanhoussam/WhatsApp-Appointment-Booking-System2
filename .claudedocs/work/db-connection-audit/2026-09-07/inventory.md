# Database connection reference audit — full inventory

**Date:** 2026-09-07 · **Mode:** INVESTIGATION ONLY. Nothing changed, nothing run, nothing committed
beyond this document. Ordered by Salman: *"اعمل أولًا DB connection reference audit شامل… ثم أعطني
قائمة كل consumer لمسار قاعدة البيانات قبل أي تعديل. لا تغيّر historical/rollback references ولا تعمل
global replacement."*

**Trigger:** while closing the super-admin boundary, `scripts/create_super_admin.py` — now the only
break-glass account-recovery path after `POST /auth/create-user` was deleted — was found to promote
`DIRECT_URL` to `DATABASE_URL`, and local `.env`'s `DIRECT_URL` still points at **Sydney**. Salman's
correction was that fixing that one file would be treating a symptom.

**Not a duplicate of** `.claudedocs/work/supabase-eu-migration/2026-09-06/code-reference-classification.md`
— that inventory covers **Supabase storage asset URLs** (`wefjghagwpkotrrdiqyi` in `<img>`/seed data).
This one covers **database connection variables**, a different axis it did not examine.

---

## The one-line finding

> The two variable names every standard tool reads — `DATABASE_URL` and `DIRECT_URL` — point at the
> **retired Sydney** database in local `.env`. Frankfurt, the real production database, is reachable
> only through `EU_*` names that **no application code reads at all**.

So locally the default is wrong and the correct target is the exception. Production is unaffected:
Railway sets the standard names to Frankfurt, which is why the live system is healthy.

---

## A. `.env` — the root of it 🔴

| line | variable | points at | |
|---|---|---|---|
| 9 | `DATABASE_URL` | `aws-1-ap-southeast-2` | 🔴 **Sydney** |
| 10 | `DIRECT_URL` | `aws-1-ap-southeast-2` | 🔴 **Sydney** |
| 12 | `SUPABASE_URL` | `wefjghagwpkotrrdiqyi` | 🔴 **Sydney** storage |
| 14 | `SUPABASE_KEY` | (Sydney service key) | 🔴 |
| 35 | `EU_DATABASE_URL` | `aws-0-eu-central-1` | ✅ Frankfurt |
| 36 | `EU_DIRECT_URL` | `aws-0-eu-central-1` | ✅ Frankfurt |
| 37 | `EU_SUPABASE_URL` | `qjocpqokwmlpzaftltiy` | ✅ Frankfurt |
| 38 | `EU_SUPABASE_SERVICE_KEY` | — | ✅ |

**This is a Gate 6 residue, not a deliberate rollback provision.** Evidence: that migration's own
plan (`code-reference-classification.md` §B) lists exactly lines 9, 10 and 12 and says *"These are
Gate 6 itself."* Railway's copies were changed; the local file was not. ADR-0007's rollback window
was **30 minutes** and closed on 2026-09-06, so nothing about keeping the local file on Sydney is
protective. ADR-0007's separate instruction — *do not delete the Sydney database until Gate 8 plus an
observation period* — is about the database continuing to exist, not about local defaults aiming at it.

## B. `EU_*` are not application variables 🔴

Grepped across `app/` and `scripts/`: **nothing in `app/` reads any `EU_*` name.** The only readers
are `scripts/cleanup/clean_rk_team.py:41` and `scripts/cleanup/delete_demo_test_tenants.py:60`, and
both get them by **opening `.env` and regex-parsing the line** rather than `os.getenv` — because the
process environment has the Sydney values under the standard names.

That confirms Salman's naming objection from the other direction: `EU_DIRECT_URL` is not a production
variable with a geographic name, it is a **local workaround** that never entered the application's
configuration surface. `app/core/config.py:15-16` declares only `DATABASE_URL` and `DIRECT_URL`.

---

## C. Consumers, classified

### 🔴 Runtime production DB — verified CLEAN, no change needed
| file | how |
|---|---|
| `app/core/config.py:15-16` | declares `DATABASE_URL`, `DIRECT_URL` as required settings |
| `app/db/client.py:13` | `os.getenv("DATABASE_URL")` |
| `prisma/schema.prisma:10-11` | `env("DATABASE_URL")` / `env("DIRECT_URL")` |
| `app/services/public_service.py:13-14`, `storage_service.py:15-16`, `registration_service.py:63` | `os.getenv("SUPABASE_URL"/"SUPABASE_SERVICE_KEY")` |

**No hardcoded URL anywhere in `app/`.** The pattern is already what Salman asked for — environment
variable, not literal. What is missing is the **validation step**: nothing asserts the resolved target
is the intended database.

### 🔴 Admin / repair scripts — 24 files, same unguarded pattern
Three lines, copy-pasted across the tree:
```python
_direct = os.environ.get("DIRECT_URL")
if _direct:
    os.environ["DATABASE_URL"] = _direct        # "Bypass pgbouncer -- direct connection for writes"
```
or, equivalently, `Prisma(datasource={"url": os.environ["DIRECT_URL"]})`.

Every one of these resolves to **Sydney** when run from this working copy, and **succeeds silently** —
the 2026-09-06 failure mode exactly: *command succeeds, writes to the wrong database.*

`activate_hr_store_service` · `add_products_section_rk` · `add_why_choose_us_mrh` · `backfill_smar` ·
`create_admin_user` · **`create_super_admin`** · `fix_cta_mrh` · `fix_passwords` · `migrate_catalog` ·
`migrate_images` · `migrate_smar_config` · `onboard_anas` · `reseed_caracas_direct` ·
`reset_hr_admin_password` · `seed_authz_hardening_test_users` · `seed_barber_arch_test` ·
`seed_client_services` · `seed_page_content` · `seed_platform_services` · `seed_unified_clients` ·
`set_hassan_barber_hours` · `set_hr_working_hours` · `set_mrh_social_contact` · `unify_database`

**Highest priority within this group:** `create_super_admin.py` (the only break-glass now),
`fix_passwords.py`, `reset_hr_admin_password.py`, `create_admin_user.py` — all four write credentials.

### 🔴 Hardcoded connection string with a plaintext password — 1 file
`scripts/migrate_images.py:54` embeds a full Sydney `postgresql://` URL including the password, and
`:48` uses the old project ref as a **runtime default** (`os.getenv("SUPABASE_URL", "https://wefjgh…")`).
This is the literal case of Salman's *"ما فيه ياخده من variable"*.
⚠️ Per memory, the Sydney DB password was **rotated 2026-09-06**, so this value is probably already
invalid — **verify before assuming it is live**, then remove it regardless. ADR-0007 §Gate 6 also
records that the Sydney password was once printed in cleartext into a working transcript.

### 🟢 Already correct — the reference pattern, written this week
`scripts/cleanup/delete_demo_test_tenants.py:68-69` and `scripts/cleanup/clean_rk_team.py:48-49`:
```python
assert "eu-central-1" in host, f"ABORT: not the Frankfurt host ({host})"
assert "ap-southeast-2" not in host, "ABORT: this is Sydney — never touch it"
```
Validate-then-connect, exactly the shape Salman described. Both ran successfully against production.
**Note the coupling to be removed later:** they hardcode region strings, which becomes wrong the day
production moves off Frankfurt — the same trap as the `EU_` name itself.

### 🟠 Migration tooling — 8 files, instructions to a human
`prisma/migrations/*.sql` headers say `psql $DIRECT_URL -f …` (`add_client_vertical`,
`add_barbers_table`, `add_barber_photo_description`, `add_resources_table`,
`add_gallery_image_media_type`, `add_tenant_config`, `add_unit_type`,
`add_client_provisioning_status`, `add_whatsapp_sessions`). Copy-pasting one of those commands today
applies DDL to Sydney. No code executes them; the risk is a human following the comment.

### 🟡 `.env.example` — teaches an incomplete truth
Uses a neutral `aws-0-[region].pooler.supabase.com` placeholder (good — it does not teach Sydney), but
**never mentions `EU_*` at all**. A new developer would set `DATABASE_URL` and have no way to learn
that the working copy's convention differs.

### ✅ CI / deploy — clean
`railway.json`, `frontend/railway.json`, `Dockerfile`: **zero** database references. All configuration
is injected by Railway. No GitHub Actions workflows exist.

### 📝 Historical — do not edit
- `.claudedocs/**` — 26 files contain `ap-southeast-2`, 38 contain `DATABASE_URL`. These are session
  logs, ADRs and evidence files. `documentation-policy.md` rules 1/7 make them immutable; rewriting
  them would falsify the record of a migration that really happened.
- `.claude/memory.md` — lines 2558, 2701, 3489 quote old URLs inside historical findings.
- `prisma/migrations/add_tenant_config.sql:29` — an **already-applied** migration; editing applied
  history changes nothing and misleads (this call was already made in the Gate 6 classification).

### 📝 Incidental — no action
`.claude/settings.local.json` lines 117/199/247/248/281/379/388: six Sydney hostnames inside a Bash
**permission allowlist**. They authorise commands that were run during the migration; they do not
cause any connection.

---

## D. Naming — Salman's point, with the evidence for it

`EU_DIRECT_URL` names a **region**, not a **role**. Two independent reasons it is the wrong shape:

1. It is not read by the application at all (§B) — so it does not currently mean "production", it
   means "the value the standard name should have had".
2. The moment production moves off Frankfurt, the name is actively false — and the same defect is
   already reproduced inside the two guard scripts, which assert on `eu-central-1` as a literal.

Purpose-based naming (`PRODUCTION_DIRECT_URL`, or simply restoring `DATABASE_URL`/`DIRECT_URL` to
mean production and giving Sydney a `LEGACY_*` prefix) survives the next move. **No decision taken
here** — this is the inventory only.

---

## Confirmed / Side / Unknowns

### Confirmed
1. `.env`'s `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_KEY` all resolve to Sydney.
2. 24 scripts blindly promote `DIRECT_URL` → `DATABASE_URL`, unguarded; 4 of them write credentials.
3. `app/`, `prisma/schema.prisma` and all deploy config are already environment-driven and clean.
4. `EU_*` is read by nothing in `app/`; its only two readers parse `.env` as text.
5. Exactly one hardcoded connection string with an embedded password: `scripts/migrate_images.py:54`.
6. A correct validate-then-connect pattern already exists in two scripts and has run in production.

### Side findings
- The `# Bypass pgbouncer -- direct connection for writes` comment is duplicated verbatim across many
  scripts — the same copy-paste propagation that made one defect into twenty-four, and the same shape
  as the duplicated `_verify_secret` found earlier today.
- `prisma/migrations/add_reservation_barber_slot_unique_index.sql:12` documents `?pgbouncer=true` as
  load-bearing — consistent with the 2026-09-06 latency finding; any rewrite must preserve it.

### Unknowns
1. **Whether any of the 24 scripts has been run against Sydney since cutover was NOT established.**
   No shell-history review, no Sydney-side row-count comparison. If one was, its writes are sitting in
   the retired database and are absent from Frankfurt.
2. Whether `scripts/migrate_images.py:54`'s embedded password is still valid after the 2026-09-06
   rotation — not tested, deliberately.
3. Whether Railway's variables carry any other Sydney value beyond `FRONTEND_URL` (corrected earlier
   today) — only the visible portion of the variable list has been seen.

---

## Recommendation / Decision / Execution
- **Recommendation:** to follow, once Salman has reviewed this inventory. It will separate what must
  change (§C 🔴), what needs a naming decision (§D), and what must be left alone (📝).
- **Decision:** none taken.
- **Execution:** none. No file outside this document was modified.

---

# ADDENDUM — 2026-09-07, after Salman's `.env` rewrite

Appended, not rewritten: the sections above are what was true when the inventory was taken.

## 1. The naming decision was taken and applied — by Salman, in `.env`

`EU_*` → the **standard** names (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_KEY`) now resolving to **Frankfurt**; the previous bare names → **`SY_*`**
(Sydney). §D's concern is closed by role-based naming rather than a new geographic prefix.

Verified after the rewrite, all four connection strings opened successfully with the new passwords:

| variable | host | |
|---|---|---|
| `DATABASE_URL` | `aws-0-eu-central-1` | ✅ 20 clients · **`?pgbouncer=true` preserved** |
| `DIRECT_URL` | `aws-0-eu-central-1` | ✅ no pgbouncer flag — correct for a direct connection |
| `SY_DATABASE_URL` / `SY_DIRECT_URL` | `aws-1-ap-southeast-2` | ✅ reachable, 37 clients |

The app boots and `settings.DATABASE_URL` / `settings.DIRECT_URL` both resolve to Frankfurt.

**No production restart risk.** Frankfurt's password was rotated on Railway *before* Gate 6, and
today's edit was local-only renaming — so the local value equals Railway's, and a local connection
succeeding proves Railway's credential is valid. This was checked deliberately because rotating a
password while updating only `.env` is exactly what took production down for ~40 minutes on
2026-09-06 ([[credential-rotation-reaches-all-consumers]]).

## 2. 🟢 CLOSED — Unknown #1: nothing has written to Sydney since cutover

Salman made real reservations at `rk` on 2026-09-07 and asked whether they landed in one database
or both. Measured on both sides, read-only:

| | Frankfurt | Sydney |
|---|---|---|
| `rk` reservations | **28**, of which **2 created today** | 24, **0 today** |
| `rk` customers | **23**, **2 today** | 20, **0 today** |

Platform-wide newest row, every table:

```
                  Frankfurt              Sydney
reservations      2026-09-07 07:29   ←   2026-09-05 14:36
customers         2026-09-07 07:29   ←   2026-09-05 14:36
users             2026-09-07 08:26   ←   2026-08-26 20:42
store_orders      2026-09-07 07:19   ←   2026-09-04 07:52
bookings / catalog_items / barbers / gallery_images —— identical timestamps on both sides
```

**Sydney has been frozen since 2026-09-05, before cutover.** Not one row was written there
afterwards — no script, no application traffic, no WhatsApp flow. **There is no data divergence and
nothing to reconcile.** The identical timestamps on the static tables also confirm the copy was
faithful, so the whole difference is genuinely post-cutover writes.

Corroborating, from a different angle: Sydney still holds 37 clients, 8 `rk` users and 3 `rk`
barbers — the exact pre-cleanup state — while Frankfurt holds 20, 2 and 2. Every deletion performed
this week landed only on Frankfurt, and Sydney was never touched.

## 3. `SUPABASE_KEY` vs `SUPABASE_SERVICE_KEY` — resolved, and not the hazard it looked like

Three readers, and they do not agree:

| file | reads | live? |
|---|---|---|
| `storage_service.py:16` (uploads) | `SUPABASE_SERVICE_KEY` **or** `SUPABASE_KEY` | ✅ live — tolerates both |
| `registration_service.py:64` | `SUPABASE_SERVICE_KEY` **or** `SUPABASE_KEY` | ✅ live — tolerates both |
| `public_service.py:14` | `SUPABASE_SERVICE_KEY` **only** | ⚫ **dead** |

The strict one is the only risk, and its sole consumer — `get_tenant_gallery_images`
(`public_service.py:45`) — **is called from nowhere in the repository**; the route it would serve
returns 404 on production. So Salman's "they're the same thing" holds for every path that actually
runs. Had the strict path been live, a wrong name would have made the gallery return `[]` silently
(`public_service.py:51`), with no error.

Production confirmed serving from the correct project independently: `GET /public/rk/config` returns
4 asset URLs, all `qjocpqokwmlpzaftltiy` (Frankfurt).

**New finding for the ledger:** `public_service.get_tenant_gallery_images` is ⚫ **dead code** — no
refactor now, per the classification.

## 4. Applied — the guard, by role rather than region

`scripts/_db_target.py` (new, commit `800b821`) implements *environment variable → validate target →
connect*: it resolves `DIRECT_URL`/`DATABASE_URL` and **exits** if the host matches any `SY_*` legacy
value `.env` declares, printing the resolved host either way.

Deliberately **not** a region check. The two pre-existing guards asserted `"eu-central-1" in host`,
which is right today and wrong the day production moves — structurally the same defect as the `EU_`
prefix that was just removed. "Is not a declared legacy database" survives that move, and extends to
a second retired database by adding one variable.

Both existing guarded scripts migrated onto it, dropping their `.env` text-parsing workaround.
`clean_rk_team.py`'s keep-list also gained جعفر: its rule is "delete everything not kept", so after
his invite a re-run would have deleted a real staff account — `--dry-run` now reports 0 and 0.

## 5. Still open — the remaining 24 scripts

Unchanged, and now the only consumers left on the unguarded pattern. Priority order for the
execution contract, by what each can destroy:

1. **Credential writers (4)** — `create_super_admin` (the only break-glass since
   `POST /auth/create-user` was deleted), `fix_passwords`, `reset_hr_admin_password`,
   `create_admin_user`.
2. **`migrate_images.py`** — the one hardcoded connection string with an embedded plaintext
   password (`:54`), plus the old project ref as a runtime default (`:48`). Per memory the Sydney
   password was rotated 2026-09-06, so the embedded value is probably already dead — verify, then
   remove regardless.
3. **Seeders that write live tenant content** — `seed_page_content`, `seed_unified_clients`,
   `seed_client_services`, `seed_catalog`, and the per-tenant one-offs.
4. **Historical migrations** — `unify_database`, `migrate_catalog`, `migrate_smar_config`,
   `backfill_smar`. Lowest urgency; several are already superseded.

Also unaddressed: the 8 `prisma/migrations/*.sql` headers telling a human to run
`psql $DIRECT_URL` (🟠 now correct, since `DIRECT_URL` is production again — but they gained that
correctness by accident, not by design), and `.env.example` still not mentioning `SY_*`.

## Unknowns — updated

1. ~~Whether any script wrote to Sydney after cutover~~ → **CLOSED, §2. Nothing did.**
2. Whether `migrate_images.py:54`'s embedded password is still valid — still untested, deliberately.
3. Whether Railway holds any other Sydney value — only the visible part of the variable list has
   been seen. `FRONTEND_URL` (fixed today) and `ONBOARDING_SECRET` (added today) were both found
   this way; a full read of that list is still outstanding.
