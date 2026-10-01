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

---

## CLOSED — executed the same day

Salman answered the open questions with one rule — *«لازم تكون المنيو مثل لي رسلتهم»* — and that
resolved every list:

- The nine UNSURE pairs were **never contradictions**. They were one dish spelled two ways, his
  message against our database: فلادلفيا/فيلادلفيا, أسكلوب/اسكالوب, علبة بربكيو/علبة باربيكيو,
  توستير/تويستر, ماكسيكن/مكسيكانو, and «سودة» which exists on two rows (the sandwich one is the
  match). Recorded as **aliases by SKU**, not left to a similarity threshold, with the three
  genuinely different pairs named so nothing can ever merge them. **UNSURE went to 0.**
- Inside a category he sent, his list **is** the category: unlisted rows there are retired.
- «الفول» = all three rows; ترويقة itself stays.

```
EXECUTED   86 rows + 5 for ordering, one transaction
           97 items → 115 · 10 categories → 12
           platform-wide order lines 18 → 18   ✅ nothing cascaded
           0 live items without a normalised SKU
RE-RUN     90 operations → 5, all ordering — idempotence demonstrated, not claimed
```

Verified against the live API and in a real browser: twelve categories in Mahmoud's own order,
115 items under «الكل», every spot-checked price matching his message, no retired item visible.

**Current live count reads 107 items / 11 categories** — Salman hid «كوشينيا (دزينة)» (8 items)
from the dashboard afterwards, at Mahmoud's request. Deliberate, and the arithmetic matches.

`draft.txt` is the pre-execution plan; `after.txt` is the same planner re-run afterwards. Its
summary line still counts the 3 explicit retires because that list is read from the menu file, not
from the database — a display artefact. The executor is the authority and reports zero pending work.
