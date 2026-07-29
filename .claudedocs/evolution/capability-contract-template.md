# Capability Contract Template (from ADR-0004) — Evolution Log

Accumulating understanding of whether ADR-0004's Owner → Capability → Persistence vocabulary gets
adopted naturally across Capability Contracts, Reviews, and Evolution Logs, or stays confined to
the ADR itself. See `.claude/rules/documentation-policy.md`'s "Architecture Evolution Log" section
for what this file is and isn't.

## 2026-07-29

### Context

Salman's reflection right after ADR-0004 (Information Ownership Model) was published — praising the
shift from "where is this stored?" to "who owns this?" as the ADR's real contribution.

### Discovery

Not a new discovery yet — a named watch-point. Salman: the next thing worth tracking isn't a new
ADR, it's whether Capability Contracts (`architecture/capabilities/*.md`), Reviews, and Evolution
entries start *naturally* describing new concepts using ADR-0004's own vocabulary — e.g., a new
Capability's documentation opening with `Owner: Experience Definition` → `Capability: Content` →
`Persistence: client.config.content`, instead of jumping straight to "writes to `client.config`."

### Current Understanding

If this pattern repeats on its own across 2-3 real Capability write-ups (not forced), it becomes a
real candidate for a unified `Capability Contract Template` — a standard opening block every
`capabilities/*.md` file states explicitly, referencing ADR-0004 directly instead of each file
re-deriving its own ownership framing informally. Not decided now — per Salman's own explicit
instruction, this is something to watch for, not build.

### Open Questions

- Does the Owner → Capability → Persistence framing actually get used the next time a Capability
  file is written or substantially revised, without being told to?
- If it does repeat, does the same 3-line template (`Owner:` / `Capability:` / `Persistence:`) fit
  every real case, or does it need adjustment once a second/third real Capability tries it?

### Promoted?

No — explicitly a watch-point, not yet a pattern with evidence. Revisit this entry the next time a
Capability Contract is written or substantially revised, and record whether ADR-0004's vocabulary
showed up on its own.

## Related

- `.claudedocs/adr/ADR-0004.md` — the decision this watch-point tracks adoption of.
- `.claudedocs/architecture/capabilities/*.md` — where the pattern, if it repeats, would actually
  show up.
