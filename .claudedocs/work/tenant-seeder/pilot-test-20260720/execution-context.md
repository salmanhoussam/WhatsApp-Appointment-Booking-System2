# Execution Context — tenant-seeder / pilot-test-20260720

Written before Step 1, per the Service Contract's Context Investigation requirement.

## Input

`scripts/data/pilot-test-20260720.json` — a **synthetic test fixture**, not a real business.
No real pending onboarding case existed to use instead (checked: every other `.json` file
under `scripts/data/` either has no `_schema_version` at all, or — for
`tenant_onboarding_template.json` — schema `"2.0"`, not a filled real request; and
`sneakers-lb`/`sneakers-beirut`, the only "unverified" registry entries, are already-registered
DB rows, not queued onboarding JSON). Per the Contract's fallback rule, a real file was
authored and saved rather than assuming one existed.

## Schema source used

`.claude/skills/seeding/demo/01-parse-tenant-json.md` — the actual file Step 1 runs, not either
of the two stale reference files (see tech debt entry in `todo_list.md`, 2026-07-20). Confirmed
required fields present in the fixture: `client.slug`, `client.name_ar`, `client.service_type`,
`owner.email`, `owner.password_temp`, `owner.whatsapp`, `design.template_key`,
`design.page_type`, `design.module_key` (v2.1).

## Registry check

`frontend/src/config/template-registry.js` line 115 — `food-restaurant` confirmed real:
`module_key: 'restaurant'`, `page_type: 'normal'`, `primary_color: '#D4A017'`,
`services: ['restaurant', 'reservations']`, 5 real `seedCategories` (مقبلات/أطباق رئيسية/مشاوي/حلويات/مشروبات).
The fixture's `design.module_key`/`design.template_key`/`services_config.active_services` were
set to match this real registry entry exactly, not guessed.

## Prior evidence for this slug

None — `.claudedocs/work/tenant-seeder/pilot-test-20260720/` did not exist before this run.
First attempt.

## Gates checked

- `meta.needs_review`: empty array → no stop condition
- `meta.confidence`: `"high"` → not forced to Demo-only by the confidence gate (still Demo Flow
  by default per the Contract; Production requires separate explicit approval regardless)

## What this means for the run

This is the Contract's **first real execution** — proceeding through the actual Demo Flow API
calls (Steps 2-6) creates a real row in the shared dev database
(`http://localhost:8080`) under slug `pilot-test-20260720`. Not yet run — awaiting explicit
go-ahead before Step 2 (the first state-changing call).
