# RC1 Dogfooding Checklist

See `.claudelocaldocs/rc1-release-notes.md` for the Definition of RC1, Exit Criteria, Success Metrics, and Backlog Policy this checklist operationalizes. **Boundary for this whole period: no new features, no architecture changes.** Only prompt wording tweaks and clearly-isolated bug fixes are in scope, and each one gets a Decision Log entry below — everything bigger goes on the post-RC1 backlog, not into RC1 itself.

---

## One-Time Setup

1. Install [Ollama](https://ollama.com), then `ollama serve`
2. `ollama pull qwen2.5:7b` (or `llama3.1:8b` — set `OLLAMA_MODEL` if different)
3. `cd local-agent && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
4. `python main.py` (serves on `http://127.0.0.1:8010`)
5. `curl -X POST localhost:8010/agent/setup -H "Content-Type: application/json" -d '{}'`

## Daily-Use Checklist (repeat each session)

- [ ] Import at least one real catalog file (`"import the product catalog from <path>"`)
- [ ] Search product prices (`"search the catalog for <product>"`)
- [ ] Add new data via natural language (a customer, a product, an invoice)
- [ ] Deliberately try awkward/varied phrasings — not just the clean README examples (misspellings, indirect requests, mixed Arabic/English, incomplete info)
- [ ] Read through `logs/events.log` for anything from this session — look for `status="error"` or `status="llm_error"`, and for tool choices that don't match what was actually meant
- [ ] Note anything the model got wrong or misunderstood, even if it recovered

## Running Log

One row per session. `Job #` references the corresponding entry in `logs/events.log`.

| Date | Input tried | Expected | Actual | Job # | Prompt tweak needed? |
|------|-------------|----------|--------|-------|----------------------|
|      |             |          |        |       |                       |

## Decision Log

One entry per real change made during RC1 (prompt tweak or isolated bug fix only, per the Backlog Policy). This is the evidence trail for the "all discovered issues triaged" exit criterion.

```
### YYYY-MM-DD
**Observation:** <what was actually seen>
**Decision:** <what was changed>
**Reason:** <why>
**Status:** <Open | Completed>
```

*(no entries yet)*

## RC1 Success Metrics — running tally

Update as you go; final numbers get copied into `rc1-release-notes.md` when RC1 exit criteria are evaluated.

| Metric | Count |
|---|---|
| Total natural-language requests | |
| Successful requests | |
| Failed requests | |
| Clarification requests | |
| Prompt adjustments made | |
| Average response time | |
| Import jobs completed | |
| Rollbacks executed | |
| Duplicate reports generated | |
