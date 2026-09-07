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

---

# Addendum — host challenge, and what it exposed

**Salman asked why the measurement used `demo.salmansaas.com/rk` and not
`alzabt.salmansaas.com/rk`.** Fair challenge: `demo.` was chosen out of session habit, not
verified beforehand. Two things were then checked properly.

## 1. Which host is correct for `rk` — and does it matter

**Correct: `demo.`** — `rk` carries `lifecycle_state = 'trial'` (measured), and
`rules/frontend/routing.md` assigns trial tenants to `demo.` and subscribed tenants to `alzabt.`.

**But it makes no measurable difference**, verified rather than argued:

```
demo.salmansaas.com/rk    HTTP 200   bundle index-PnxR8Gfi.js
alzabt.salmansaas.com/rk  HTTP 200   bundle index-PnxR8Gfi.js
HTML byte-identical:      YES
API host used by both:    api.salmansaas.com
```

`alzabt` re-measured directly, and its warm number matches:

| host | run | TTFB | last resource | API window |
|---|---|---:|---:|---:|
| demo | warm-2 | 164 ms | 1,673 ms | 784 ms |
| demo | warm-3 | 130 ms | 1,561 ms | 740 ms |
| **alzabt** | **warm-2** | **178 ms** | **1,762 ms** | **877 ms** |

The original 2026-09-05 audit does **not name** the frontend host it browsed — only
`api.salmansaas.com/health` appears in it. So the earlier claim of "same methodology" held for the
page and metric, **not** for the host. Corrected here rather than left implied.

## 2. What the extra runs actually exposed — and it corrects this document's own recommendation

`alzabt` run 1 came in at **7,142 ms**, and the cause was visible in the timings:

```
alzabt run 1 (cold)   rk/config  started 3,667  ended 5,718   (2,051 ms)
alzabt run 2 (warm)   rk/config  started   561  ended   860   (  300 ms)
```

Not a host difference — **a second cold start**.

**That is the finding.** Across five runs in roughly twenty minutes, **two were cold**
(demo run 1: 5,546 ms; alzabt run 1: 7,142 ms). Cold start was filed above as a disclosed artifact.
At 2-in-5 it is not an artifact.

`rk` is a trial tenant with near-zero organic traffic, so an idle container is its **normal**
state — meaning a real first visitor plausibly meets 5.5-7.1 s more often than they meet 1.6 s.

### Corrected recommendation

The waterfall conclusion stands: ~740-877 ms across three levels, not worth restructuring.

**The cold-start conclusion is upgraded from footnote to headline.** It is the dominant cost of a
real visit to a low-traffic tenant, it is 3-4× the entire API cascade, and it is infrastructure
(container spin-up), not frontend.

### Still unknown

- **Cold-start frequency was not measured deliberately** — 2-in-5 is an observation from runs taken
  for another purpose, not a controlled sample. A real answer needs timed probes after known idle
  gaps.
- Whether Railway's plan for this service supports always-on / min-instances was not checked.
