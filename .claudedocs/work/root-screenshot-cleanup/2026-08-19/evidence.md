# Repository Hygiene — Root Screenshot Cleanup — 2026-08-19

Follows: Repository Hygiene rules (`.claude/rules/repository-hygiene.md`), executed as Phase 0's
CMS Readiness Gate Track 3 closure, per Salman's explicit go-ahead ("نعم، نفّذ كل هذه الفئات الآن").

## What this is

160 real browser-verification screenshots (`.png`) that had accumulated loose at the repository
root instead of under `.claudedocs/work/{investigation-slug}/{date}/`, in violation of this
project's own evidence convention (`service-execution-constitution.md` rule 4,
`investigation-protocol.md`'s Evidence section). Confirmed real, not noise: filenames match named
real investigations already on record in session logs/memory — e.g. `admin1-login.png` through
`admin13-overview.png` (a generic-admin walkthrough), `rk-*.png` (RK regression checks),
`fresha-*.png`/`booksy-*.png`/`fellowbarber-home.png` (the Track 2A public-barber competitor
research pass), `alzabt-demo-*.png` (demo tenant checks), `staff*.png` (Staff role verification),
`week-*.png`/`today-*.png` (Calendar redesign verification), `v2-step*.png` (a booking-flow V2
walkthrough), among others. Date range: 2026-08-09 → 2026-08-16 (per file mtime).

## What was done

All 160 files moved as-is, filenames unchanged, from repo root into this single consolidated
folder — **not** split back out into per-investigation subfolders.

## Honest limitation, stated explicitly (not hidden)

This is a repository-hygiene consolidation move, not a re-run investigation. No attempt was made
to re-attribute each of the 160 files to its exact original investigation/date folder — doing that
correctly would require re-deriving context this pass does not have with certainty for every single
filename cluster. Filename prefixes strongly suggest logical groupings (see above), but this file
does not claim precise per-investigation placement. If a specific screenshot is needed for a
specific historical investigation's own evidence trail later, it can be found here by filename
pattern; a future pass may re-split by investigation if that ever becomes load-bearing.

## Why this location

New folder, not an existing investigation's folder — this move itself isn't the evidence of any
one investigation; it's the record of the hygiene action taken on all of them collectively.

## Verification

- Real command run: `mv *.png *.jpeg .claudedocs/work/root-screenshot-cleanup/2026-08-19/`
- Confirmed after: `ls *.png *.jpeg 2>/dev/null | wc -l` → `0` at repo root.
- Confirmed count landed: `ls .claudedocs/work/root-screenshot-cleanup/2026-08-19/ | wc -l` → `160`.
