# Post-Migration Re-measurement — the number that decides the frontend track

**Mandate (Salman, 2026-09-07):** the 2026-09-05 audit measured the customer journey at
**20,001 ms** — *before* the Frankfurt migration. It was never re-measured after. "سواء كانت ثانيتين
أو 8 ثوانٍ ستحسم مصير مشاريع الواجهة الأمامية بالكامل."

**Method:** same page and same metric as Audit A (`/rk`, production build, real browser via
Playwright MCP, Navigation + Resource Timing API). Three runs.

---

## The answer: **~1.6 s warm** — down from 20.0 s

| run | TTFB | DOM interactive | **last resource** | API window |
|---|---:|---:|---:|---:|
| 1 — cold | 2,933 ms | 3,022 ms | **5,546 ms** | 1,300 ms |
| 2 — warm | 164 ms | 225 ms | **1,673 ms** | 784 ms |
| 3 — warm | 130 ms | 169 ms | **1,561 ms** | 740 ms |

**20,001 ms → ~1,600 ms warm ≈ 12.5× faster.** Content confirmed rendered (`خدماتنا` + `احجز`
present in the DOM), so this is a real completed journey, not a fast blank page.

Run 1's 2,933 ms TTFB is a **cold start**, not a regression: the next two runs came in at 164 ms and
130 ms on the same URL pattern. Disclosed rather than averaged away.

---

## The 3-level cascade survived — and stopped mattering

The 2026-09-05 audit's core structural finding was a *sequential* waterfall. **It is still there,
unchanged in shape** (run 3):

```
level 1   rk/config                    493 →  737
level 2   reservations/catalog-services 835 → 1020   ┐ both wait for config
          store/categories              837 → 1046   ┘
level 3   store/products               1048 → 1233     waits for categories
```

`config` still gates everything; `categories` still gates `products`. **But the whole cascade now
costs ~740 ms instead of ~17 s**, because each level pays ~200 ms of round trip instead of ~1.4 s.

The audit's own formula predicted this exactly: `time ≈ 0.15s + (round trips × RTT)`. The RTT
collapsed; the structure did not have to.

---

## Confirmed

1. **The frontend performance crisis is over.** ~1.6 s warm, ~5.5 s worst-case cold.
2. **The bundle was never the problem and still isn't** — DOM interactive 169-225 ms.
3. **The waterfall persists structurally but is no longer worth restructuring** — 740 ms across
   three levels. Flattening it would win a few hundred milliseconds for real architectural churn.
4. **Cold start is now the single largest cost** — 2,933 ms TTFB on run 1, **larger than the entire
   API cascade**. That is Railway container spin-up, i.e. infrastructure, not frontend.

## Side finding

Run 1 transferred 49 KB against the audit's original 718 KB — a warm HTTP cache. It does not affect
the headline (runs 2 and 3 agree with run 1's *shape*), but it means these numbers are **repeat-visit
numbers**. A true first-visit measurement needs a cleared cache and was not performed.

## Unknowns

- **First-visit (cold cache) timing was not measured** — see above.
- **Only `/rk` was measured**, matching the original audit's scope. `smar` (16 units, heavier) and
  `caracas` (97 items) were not.
- **The booking journey (Audit B: homepage → احجز الآن → booking ready) was not re-measured** — only
  initial load. Audit B's original number therefore still has no post-migration counterpart.

## Recommendation (not a decision, not executed)

**Close the frontend-performance track.** It was a real crisis and it was solved — by the database
topology fix, not by frontend work. The remaining ~740 ms cascade does not justify a project.

If a next performance question is wanted, it is **cold start (~2.9 s TTFB)**, and it belongs to
infrastructure, not to the frontend.
