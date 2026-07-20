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

## Runtime Before Assumption

Established 2026-07-21, same beit-al-fakhar `/store` investigation, second real lesson from it —
a real earlier report proved the backend/API returned correct data, and was rightly rejected for
stopping there. **Backend success ≠ Feature success.** For any user-facing bug, verification is
only complete once the full chain has been traced and confirmed, not assumed from an earlier link:

```
Data → Transformation → State update → Render → Visible UI
```

An investigation that stops at "the API returns the right data" has verified one link, not the
feature. If no real browser/runtime access exists to verify the remaining links, that gap is an
**Unknown** (per the Report Structure above) — never treated as closed just because the earlier
links checked out. When runtime access genuinely isn't available, the investigation should say so
explicitly rather than stop; if it becomes available (e.g., a real browser binary + its DevTools
Protocol, even without a pre-installed automation framework), use it rather than asking the human
to relay console output by hand.

## Independent Causes Are Allowed

A single symptom does not imply a single root cause. When an investigation finds one real bug,
that doesn't mean it found *the* bug — report it as *a* confirmed cause and keep tracing the rest
of the chain above; a second, independent, equally real cause can be sitting further down it. The
same beit-al-fakhar investigation found two: intermittent Supabase pooler connectivity (affecting
whether the config request succeeds at all) and a React 18 StrictMode `mountedRef` bug (affecting
whether a *successful* response ever reaches state/render). Neither explained the other. Don't
collapse two real, independently-verified causes into one narrative for tidiness — report both,
distinctly, each with its own evidence.
