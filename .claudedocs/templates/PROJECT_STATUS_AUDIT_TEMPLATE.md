# Project Status Audit — Template

Standing template for any future `/bo-hussein` "Project Status Audit" request. Established 2026-07-18 after the first audit was reviewed and its format (not its content) was revised. Reuse this structure every time — do not improvise a new shape per audit.

## Rules governing this template

1. **Separate Facts from Opinions.** A fact is something directly observed (a file exists, a build succeeded, an endpoint count). An opinion is an interpretation of that fact (this is a problem, this is fine). Never blend them in one sentence. Use this shape for anything non-trivial:
   - **Finding:** the fact, stated plainly.
   - **Evidence:** file:line, command output, or doc reference.
   - **Impact:** what this means for the project, if anything.
   - **Recommendation:** what to do about it, if anything (may be "none — informational only").
2. **Every number gets a timestamp.** Counts (endpoints, models, tenants, lines) are a snapshot, not a permanent fact — they will drift. State the audit date once at the top ("Snapshot: YYYY-MM-DD") and treat every count in the report as implicitly dated to that snapshot.
3. **Recommendations explain ordering.** When more than one next step is proposed, say *why* that priority order was chosen, not just what the steps are.
4. **Technical Debt and Next Decision are not the same thing.** Technical Debt = known bugs/backlog items that are pure execution (someone just needs to do them). Next Decision = items that require human judgment or a business/architectural call before any execution can start. Keep them in separate sections — don't let backlog tasks and open decisions blend into one list.
5. **Don't editorialize away real gaps.** If something is stale, broken, or missing, say so plainly (this was explicitly praised in the first audit — preserve it, don't regress toward diplomatic vagueness).

## Section order (fixed)

1. **Snapshot** — one line: `Snapshot: YYYY-MM-DD` — everything below is dated to this.
2. **Executive Summary** — 3-5 sentences, readable in under a minute, states the real overall state plainly (good and bad).
3. **Current State** — factual only (Frontend / Backend / Database / AI & Automation), each item as Finding + Evidence, no embedded opinions.
4. **Architecture Health** — a small table, one row per architecture layer/domain established so far:

   | Layer | Status | Note |
   |---|---|---|
   | Security Architecture | ✅ Stable | ADR-0001 archived |
   | Business Domain | 🟡 Under Design | TENANT_LIFECYCLE_PLAN.md approved, no Implementation Contract yet |
   | Operations | 🟡 Design Complete | SUPER_ADMIN_DASHBOARD_PLAN.md approved, no implementation yet |

   Status legend: 🟢 Research/Not started · 🟡 Under Design / Design Complete (not yet implemented) · ✅ Stable (implemented + verified) · 🔴 Needs Refactor.
5. **Infrastructure** — facts only (Railway/Supabase/Cloudflare/etc.), each as Finding + Evidence.
6. **Documentation** — facts only (what exists, what's stale, with evidence — e.g. "CLAUDE.md's Active Clients table lists 3 tenants; registry has 9 as of this snapshot").
7. **Technical Debt** — known bugs/backlog, pure execution items, no judgment calls buried in this list.
8. **Risks** — a table, not prose:

   | Risk | Impact | Mitigation |
   |---|---|---|
   | Railway cron not configured | Trial/date-cleanup automation won't run | Configure the cron in Railway's dashboard |

9. **Recommendations** — the Finding/Evidence/Impact/Recommendation structure applied to the report's most important findings (not every minor item needs this treatment — reserve it for things that matter).
10. **Next Decision** — items requiring human/architectural judgment before execution can start, each with a one-line "why this matters now" — explicitly not a task list (that's Technical Debt's job). If there's a genuine ranked recommendation among them, state the ranking and the reasoning for it.

## Where this is used

Referenced from `.claude/agent/bo-hussein.md` — any future "Project Status Audit" request follows this template rather than reinventing the report shape each time.
