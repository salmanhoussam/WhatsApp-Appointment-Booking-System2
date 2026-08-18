# Homepage Phase 2.6 — Section list + generic field-update route — Evidence

Contract: `ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md`. Backend piece: the two real gaps the
Contract named — no route existed to list all sections, and no generic way existed to update an
arbitrary section's text/settings fields (only `hero-title`/`story-heading` had named routes).

## Real architectural decision, named explicitly (not a silent reversal)

`content.py`'s own header previously stated routes are direct call sites, "not a generic Dispatcher
endpoint... deferred until a second real Capability/Operation proves the routing shape actually
repeats." The Section Settings Contract names **9 real sections** needing the identical shape —
the deferred threshold is met for real now, not predicted. Writing 9 near-identical
`hero-title`-style routes would itself be the real duplication this project's Abstraction Rule
warns against once evidence shows the shape repeats. The module's own docstring was updated to
record this decision, not silently contradict itself.

## What changed

- `app/repositories/content_sections_repo.py` — `list_sections(client_id)`, raw read.
- `app/services/content_service.py` — `list_sections`, `update_section_fields` (thin wrapper over
  the already-generic `update_section_field(client_id, section_type, **fields)`).
- `app/api/v1/admin/content.py` — `GET /admin/content/sections` (list),
  `PATCH /admin/content/sections/{type}/fields` (generic multi-field update).

## Live verification (real API calls)

| Check | Result |
|---|---|
| `GET /sections` | Real list, correctly ordered, all 9 of Mister H's live sections with real headings (e.g. `featured_items: "خدماتنا"`, `why_choose_us: "ليش تختارنا"`) |
| `PATCH .../story/fields` — real change | Set `heading_ar` to a deliberately fake test string, confirmed via public config it changed |
| Revert | Set back to the real value `"قصتنا"`, confirmed via public config |
| `rk` regression | `rk`'s own story heading (`"من نحن"`) confirmed completely unaffected throughout |
| Python syntax | Clean on all 3 changed files |
| Backend restart | Clean (one transient Supabase pooler retry, same already-documented recurring flakiness, self-resolved) |

## Next

Dashboard UI (Section Settings view: list, enable/disable, reorder, per-section field editing) —
not built yet, this evidence covers the backend contract only. `working_hours` editor also not
built yet (confirmed reusable via the existing generic `/admin/settings` route, no new backend
needed there per the Contract's §3/§5).
