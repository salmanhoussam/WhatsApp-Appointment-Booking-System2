# ADR-0001 — Post-Implementation Review

Extracted from `.claudedocs/sessions/2026-07-17.md` ("Post-Implementation Review"), reformatted for permanent reference. Kept permanently per the documentation policy — this file explains why ADR-0001 was ultimately trusted enough to archive, including the gap found and closed along the way.

## Request

A final, read-only compliance review against the original ADR before archiving — no code changes during the review itself.

## Finding

The earlier closure statement (see `ADR-0001_FINAL.md`) was **premature**. §8.3 ("AI Endpoints: full stop for suspended/expired") was a decision the ADR had genuinely made, but **had no implementation in code at all** — `ai_settings_agent.py` had zero status checks. Root cause: the file was excluded from the original implementation pass pending §8.4a's resolution; once §8.4a closed (see `ADR-0001_PHASE_5.md`), circling back to implement the still-pending §8.3 for that file fell through. This was documented plainly as a real error on the implementer's part, not framed as a new discovery unearthed by luck.

## Fix (after explicit approval, following the same pattern already used across the rest of the system)

- `app/core/tenant.py` — added `assert_client_active()`: a public, exception-raising variant of `_assert_client_active()`, for synchronous request handlers (not background tasks) that already hold a fetched `Client` object.
- `app/api/v1/ai_settings_agent.py` — calls `assert_client_active()` immediately after fetching the client, before `_run_claude_agent` and before any database write.

## Direct evidence
- Active tenant → `_run_claude_agent` called normally (unaffected behavior), 0 audit rows.
- Suspended tenant → `_run_claude_agent` **never called**, real `403` with the correct message, exactly one audit row (`tenant_suspended`, correct endpoint).
- Full cleanup afterward (`clients` back to 15, `security_audit_log` back to 0).

## Documentation corrected accordingly
`ADR-0001.md` (header, §6, §8.3, §9) and `ADR-0001_IMPLEMENTATION_CONTRACT.md` were updated to remove all stale phrasing ("excluded pending resolution," "unresolved tension") and replaced with what actually happened — including recording the miss itself plainly, not hiding it.

## Final result

ADR-0001 was, at this point, genuinely **Ready to Archive** — every decision has a documented implementation backed by real evidence, with no remaining gap.
