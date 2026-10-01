# Caracas menu update — the draft, before anything is written

**2026-10-01 · READ-ONLY.** Nothing in the catalog was changed. `draft.txt` beside this file is the
full output of `scripts/plan_menu_update.py` against production, reproducible with:

```
venv/bin/python scripts/plan_menu_update.py caracas scripts/data/caracas/menu-2026-10.json
```

## What this is

Track A step **A2** — the half of Track A that was never built. Track A was logged CLOSED on
2026-10-01 having shipped the *safety* (soft delete, the `sku` key, the 125-item backfill), and
measured again the same day: `scripts/seed_catalog.py` contains **zero** references to `sku`, and no
upsert path existed anywhere. The catalog could survive a menu update and nothing could perform one.

## The numbers

```
live today 97   ·   new menu 65 items in 7 categories   ·   after: 112

🟢 UPDATE   24   exact matches — 23 price changes, 13 also move category
🔵 NEW      32   no match (6 of them are DERIVED rows, see below)
🟡 MISSING  14   live items the new menu does not mention
🔴 UNSURE    9   never written without a human decision
⚫ RETIRE    3   explicit, by Salman's instruction
```

## Three errors the planner found in our own input

Recorded because each would have destroyed real data, and each was caught by running the tool
rather than by reading it.

1. **All 17 ترويقة items landed in MISSING.** Salman's instruction was "ترويقة stays, minus الفول";
   the category was never added to `keep_untouched`, only its one retirement was recorded. The tool
   proposed deleting an entire breakfast menu.
2. **«الفول» is not one row.** Production holds **three** — `FOUL-PLATE-01`, `FOUL-SMALL-BOX-01`,
   `FOUL-LARGE-BOX-01`. All three are now listed explicitly; nothing matches on the word, because a
   substring match on a dish name is how the wrong dish gets retired.
3. **Size variants matched each other at 94%.** «وجبة كرسبي (3 قطع)» scored 94% against
   «وجبة كرسبي (5 قطع)» — one digit apart — so every new size landed in UNSURE pointing at its own
   siblings, burying the matches a human actually needs to judge. Numbers in a dish name are now
   part of its identity.

The matching threshold was also widened from 0.86 to 0.78, after «توستير» (83% against the live
«تويستر») landed in NEW. UNSURE costs a human one glance; a NEW that should have been an UPDATE
costs a duplicate row and an item whose order history stops.

## What still needs Salman

```
🔴 nine UNSURE pairs — same dish or not
🟡 fourteen MISSING — retire or keep
⚠️ six DERIVED meal rows (3 قطع / 7 قطع) — our reading of his variant line, not his words
❓ the sandwich list arrived twice; the longer one is used
❓ الفول resolved to three rows
```

**No write path exists in this tool, deliberately.** Matching is on Arabic names because the
incoming menu is Arabic-only and our SKUs are English-derived; «تشكن برغر» and «تشيكن برغر» are the
same dish and two different strings. A tool that resolved that silently would retire real dishes and
duplicate others — the exact damage the soft-delete work closed.
