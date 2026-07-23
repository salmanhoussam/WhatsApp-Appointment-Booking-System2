# Tenant Verification Template

Generalizes the pattern first proven by `store-experience-review.md` (beit-al-fakhar) — copy this
file to `reviews/{tenant-slug}-verification.md` for each new real tenant build. A real tenant is
not just a client delivery; per ADR-0003, it is also a live Verification of the Architecture
Documentation System and the Tenant OS itself. Follows `investigation-protocol.md`'s evidence
discipline — Confirmed/Side Findings/Unknowns, real evidence, no claim stronger than what was
actually checked.

**Tenant:** `{slug}` — **Date:** `{date}` — **First tenant to use this template:** the barber
tenant (RK Barbar), 2026-07-23 onward.

---

## 1. What Made This Tenant Different

What's genuinely new about this build compared to prior tenants (e.g. beit-al-fakhar was a pure
showroom/store; this section exists so the *reason* a tenant is a good test is on record, not just
the fact that it happened).

## 2. Architecture Questions Raised During the Build

Log every real moment a "where does this go?" question came up — not as a project note, as
Architecture Verification. One row per real question:

| Question asked | Answer found | Where it's recorded |
|---|---|---|
| e.g. "Is a 3-video Hero still `ReplaceMedia`, or a new shape?" | | |
| Did we need a new Capability? | | |
| Did we need to modify an existing ADR? | | |
| Was a file's planned location wrong? | | |
| Was the Implementation Contract incomplete for this case? | | |
| Did we need a new Principle, or an existing one clarified? | | |

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

What remains unverified and why — never silently omitted.

## 7. Verdict — Does the Architecture Need to Change?

- [ ] No — the architecture held, as-is, for this real case.
- [ ] Yes — Capability Contract(s) affected: ___
- [ ] Yes — ADR(s) affected: ___
- [ ] Yes — Principle(s) affected: ___
- [ ] Yes — the Implementation Contract's own template/structure needs a change: ___

If any "Yes" is checked, the actual edit happens as its own follow-up, referencing this Review as
the evidence — this document itself is never edited afterward to reflect the fix (same immutability
rule as every other Review).
