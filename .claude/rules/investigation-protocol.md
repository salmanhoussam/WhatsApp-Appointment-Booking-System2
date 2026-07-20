# Investigation Protocol — Always Active

Governs how any real technical investigation (a bug report, a "why did X fail," a root-cause
analysis) gets conducted and reported. Established 2026-07-21 from real feedback on the
beit-al-fakhar `/store` bug investigation (`.claudedocs/work/store-investigation/2026-07-21/`),
the third real case of this project's evidence discipline after Services
(`service-execution-constitution.md`) and repository audits (`repository-hygiene.md`) — proven
across three independent real cases now, not predicted in advance, which is exactly when this
project's Abstraction Rule says generalizing is earned.

## Evidence

A real investigation writes its raw evidence under `.claudedocs/work/{investigation-slug}/{date}/`
— actual command outputs (curl responses with real headers, grep results, file excerpts), plus a
`summary.md`. Same "reproducible from logs alone" principle already established for Services and
repo audits, applied here rather than restated — a chat reply alone is not the record; the files
are.

## Report Structure — Confirmed / Side Findings / Unknowns

Every investigation report ends in exactly these three sections, in this order:

- **Confirmed Findings** — things verified with real evidence, citing what was actually checked
  and how (not "it should work" — "checked via curl with a real Origin header, got X").
- **Side Findings** — real things noticed along the way that aren't the reported issue (dead code,
  naming collisions, tech debt). Named as side findings explicitly, not folded into the main
  narrative as if they were the point.
- **Unknowns** — what remains unverified and why (e.g., no browser tool available, no server
  traceback captured). Never silently omitted — an investigation that can't fully close says so.

## Claim Precision

Never state a stronger conclusion than the evidence actually supports. If part of the system
remains unverified, say exactly that: "all backend-side checks passed; visual browser confirmation
is still required to close this" — not "the backend is 100% fine." A claim and its own stated gap
must not contradict each other in the same report.

## Separate Investigation → Recommendation → Decision → Execution

Findings, the recommended fix, the decision to proceed, and the actual execution are four distinct
things and stay labeled as such, even when done in the same turn by the same person:

- **Recommendation** — what to change, why, what risk it carries.
- **Decision** — approved / rejected / deferred, and on what basis (explicit approval, or
  established standing authorization for this class of low-risk change — say which).
- **Execution** — what was actually done, with a commit reference.

Never fuse "I found X" and "I fixed X" into one sentence. A reader auditing this weeks later needs
to see the seam between diagnosis and action, not just the outcome.
