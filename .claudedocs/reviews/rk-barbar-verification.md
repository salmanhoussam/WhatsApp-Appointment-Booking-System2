# RK Barbar — Tenant Verification

Copied from `tenant-verification-template.md`, this project's first real use. **Slug provisional
as `rk-barbar`** pending confirmation — the only real artifact found so far is a Supabase storage
folder named "RK Barbar" holding 3 real uploaded videos; no `Client` DB row exists yet.

**Tenant:** `rk-barbar` (provisional) — **Date:** 2026-07-23 — **Status:** Pre-onboarding
investigation in progress, no code/DB changes made yet.

---

## 1. What Made This Tenant Different

A real combination not previously exercised in this codebase: simple appointment **Booking** +
a service/product **Catalog** display + **WhatsApp** contact, all in one tenant, with a 3-video
Hero (storefront intro, 2 product/merchandise showcase clips, one described as "professional
style"). beit-al-fakhar was a pure showroom/store (Catalog + WhatsApp, no Booking); this is the
first tenant needing Booking and Catalog together.

## 2. Architecture Questions Raised During the Build

| Question asked | Answer found | Where it's recorded |
|---|---|---|
| Does `SERVICE_TYPE_MAP` (`app/core/services.py`) have a preset combining `booking` + `catalog`? | **No — confirmed by reading the map directly.** `"real_estate"`/`"hotel"` → `booking` only (no catalog). `"restaurant"`/`"ecommerce"` → catalog-ish only (no booking). `"services"` → `["catalog"]` only, no booking. No existing `service_type` seeds both together. | This file, pending a decision on how to seed this tenant (see Unknowns) |
| Is a 3-video Hero still Sprint 2's `ReplaceMedia` (`hero.bg_image`), or does it need the frame-sequence/chaptered-video shape named as a Known Requirement in `TOS-002`/`TENANT_OS_PLAN.md` §14? | Not yet answered — real investigation pending once the videos' actual content/roles are confirmed | To be filled in once the Hero is actually built |
| Did we need a new Capability? | Not yet — open | |
| Did we need to modify an existing ADR? | Not yet — open | |
| Was a file's planned location wrong? | Not yet — open | |
| Was the Implementation Contract incomplete for this case? | Not yet — open | |
| Did we need a new Principle, or an existing one clarified? | Not yet — open | |

## 3. Navigation Check (real, timed)

Per the same discipline added to every ADR-0003 migration phase — not "was the right file
technically reachable," but "how long did it actually take, for real, during this build":

- Time to find the relevant Capability's Contract: ___
- Time to find the relevant Principle (if any applied): ___
- Any point where you gave up searching and re-read the whole old plan/mega-doc out of habit
  instead of the new structure? (If yes, that's a real finding, not a personal failure — name it.)

## 4. Confirmed Findings

Real, evidenced things this build proved or disproved about the architecture — grounded in what
actually happened, not what should have happened.

## 5. Side Findings

Real things noticed along the way that aren't the point of this review (dead code, a naming
collision, tech debt) — named as side findings explicitly, not folded into the main narrative.

## 6. Unknowns

Real facts needed from Salman before Step 1 of `tenant-onboarding.md`'s mandatory checklist
(Create Client + User) can run — none of these are guessed or assumed:
- Real business name (Arabic + English), real slug (is "RK Barbar" the actual business name, or
  a placeholder?).
- Real WhatsApp/contact phone number (`Client.phone` is a required, unique field).
- Real service list + prices, if any are set (haircut/beard/skincare/groom-package style, per the
  existing `beauty-barber` generic template's seed categories — real or just illustrative?).
- Confirmation of each of the 3 uploaded videos' real role (storefront intro / product showcase ×2
  / "professional" one) and their actual Supabase filenames/URLs.
- Whether booking should be genuinely simple (a single service type, no staff selection) or needs
  per-service duration/pricing from day one.

## 7. Verdict — Does the Architecture Need to Change?

- [ ] No — the architecture held, as-is, for this real case.
- [ ] Yes — Capability Contract(s) affected: ___
- [ ] Yes — ADR(s) affected: ___
- [ ] Yes — Principle(s) affected: ___
- [ ] Yes — the Implementation Contract's own template/structure needs a change: ___

If any "Yes" is checked, the actual edit happens as its own follow-up, referencing this Review as
the evidence — this document itself is never edited afterward to reflect the fix (same immutability
rule as every other Review).
