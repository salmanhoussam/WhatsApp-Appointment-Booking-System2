# Restaurant Visual Report — implementation plan

**Ratifies:** `ADR-0008-visual-report.md` · **Evidence:** `.claudedocs/research/whatsapp-visual-report-journey.md`
**Status:** Phases 1–2 shipped (`dcc1bc3`) · Phase 3 **BLOCKED** · **Production gate:** 🔴 CLOSED
**Umbrella plan:** this is **Track C** of `.claudedocs/plans/restaurant-vertical-product.md`

> 🔴 **Phase 3 does not start yet (Salman, 2026-09-30).** It is blocked behind that plan's
> Track A: `reseed_caracas_direct.py` deletes every `CatalogItem`, and `StoreOrderItem`
> cascades from it — so the order lines this report reads can be erased by a seeder run.
> A report whose history a seeder can empty is a report nobody should trust.

> Executable from a cold start. Everything below was measured against `HEAD=3ade90a` on
> 2026-09-30; re-measure before trusting a number here.

---

## The dependency order, and why the stated order could not be executed

The decisions were handed over as *"expand Lia, fix the timezone, establish the data contract and
the interactive page."* Two of those could not be executed in that order:

```
✗ "fix the timezone"    there is no defect — ADR-0008 D-3. Doing it re-introduces 044aafe
✗ "expand Lia" first    opening restaurant to Lia before a restaurant report EXISTS grants access
                        to daily_report, which reads the barber cash log and returns empty for a
                        restaurant. A feature that does nothing, plus five write operations opened
                        by the obvious implementation (D-5)
```

The real order is bottom-up — every phase is useful on its own and none depends on a phase above it:

```
P1  Report Data Contract + restaurant reader     ← backend read only. No Lia, no page, no link
P2  Per-vertical operation allowlist              ← makes "read-only" real before granting anything
P3  Register the restaurant report operations     ← Lia can now answer, in text
P4  Report link: mint · resolve · expire          ← reuses tenant_urls.py wholesale
P5  The interactive page                          ← the product
P6  cta_url send                                  ← replaces the raw URL in the message
```

---

## Phase 1 — Report Data Contract + restaurant reader

**Goal.** One shape that any renderer can consume and no renderer can bypass.

**Files.**

```
app/services/report_contract.py       new — the shape, and nothing that touches a database
app/repositories/store_report_repo.py new — the restaurant reader. Prisma only, clientId always
scripts/test_report_contract.py       new — the suite
```

**The shape (proposed, vertical-agnostic — no restaurant field names).**

```python
ReportPeriod  = (kind: "day" | "week", starts_at, ends_at, label_ar)
ReportMetric  = (key, label_ar, value, unit, previous, delta_pct)
ReportSeries  = (key, label_ar, points: [(bucket_label, value)])
ReportTable   = (key, label_ar, rows: [(label, value, secondary)])
Report        = (tenant_slug, vertical, period, headline, metrics[], series[], tables[], generated_at)
```

`headline` is the one line screen 1 shows. It is **selected**, never written by a model.

**Invariants this phase must establish, each with its own assertion:**

| # | invariant |
|---|---|
| RC-1 | every query carries `clientId` — no reader can be called without one |
| RC-2 | `now` comes from `availability_engine.wall_clock_now()`, never from a local `datetime.now()` — F-TZ-1 inherited, not re-derived (ADR-0008 D-3) |
| RC-3 | the day boundary is the shop's midnight, and the week's is the shop's week start |
| RC-4 | a period with zero rows returns a **valid** `Report` with zero values — never `None`, never a fabricated figure |
| RC-5 | the contract carries no vertical-specific field name |
| RC-6 | no module under `app/services/report_*` imports an LLM client — asserted structurally, per the `assert_on_code_not_text` discipline |

**Measured facts this phase must not re-derive:**

```
StoreOrder.createdAt        Timestamptz, present          ← the time axis exists
StoreOrderItem              catalogItemId · quantity · unitPrice · totalPrice   ← "top items" is derivable
StoreOrder.status           default "pending"; ORDER_STATUSES in admin/store.py
StoreOrder.metadata         carries table_number for restaurant orders
🔴 no index on createdAt     @@index([clientId]) · ([status]) · ([clientId, customerId]) only
🔴 caracas = 0 orders · arizona = 0 orders · beit-al-fakhar = 4 orders, 34 items
```

**Verification.** The suite runs with **no database**: readers are called against a fake that
returns known rows, and the assertions are on the contract, not on prose. Then one real read
against `beit-al-fakhar` — the only tenant with real orders — through the sealed read-only
reader, with a positive control proving the zero is not blindness.

**Out of scope.** The `createdAt` index (a production DDL change, its own decision). Any endpoint.
Any page.

---

## Phase 2 — Per-vertical operation allowlist

**Goal.** Make "read-only" enforceable before anything is granted (ADR-0008 D-5).

**The change.** `_LIA_VERTICALS = frozenset({"barber"})` becomes a mapping from vertical to the
set of operation names that vertical may reach. `_vertical_allows_lia` keeps its signature and its
meaning ("may this tenant reach Lia at all") and gains a sibling that answers "may this tenant
reach *this operation*". `_assert_lia_vertical`'s structural backstop is kept.

**Invariants:**

| # | invariant |
|---|---|
| LV-1 | `barber` reaches exactly the six operations it reaches today — byte-for-byte regression guard |
| LV-2 | `restaurant` reaches the report readers and **no** operation whose `write_fn` writes |
| LV-3 | a vertical absent from the mapping reaches nothing — fails closed, as `vertical IS NULL` does today |
| LV-4 | the mapping is source; no tenant row and no runtime value can widen it |
| LV-5 | a refused operation writes a `SecurityAuditLog` row naming the operation and the vertical |
| LV-6 | `_tenant_has_lia`'s `lia OR reservations` bridge is untouched — asserted, not assumed |

**TRANSITION to declare** (`feedback_invariant_vs_transition_tests`): any existing assertion that
`_LIA_VERTICALS` is a flat set of strings flips here. Whoever flips it names the old value.

---

## Phase 3 — Register the restaurant report operations

One `OperationDefinition` per report, mirroring the route that would serve it, exactly as
`daily_report` mirrors `admin/reservations.py:99-108`. Permission and legacy tuple are **read off
the real route**, never chosen.

Lia answers in **text** at the end of this phase. That is deliberate: it proves the whole chain —
intent → authorization → reader → real numbers — before a single pixel exists, and it is
independently useful if the page is never built.

Also in scope: Lia's prompt gains the concept of a **week**, which it does not have
(`grep -c "الأسبوع" app/prompts/lia.md` → **0**). Per `rules/text-context-rule.md`, **the text is
ratified before the code**, and every new branch is asked "what reaches the user here?"

---

## Phase 4 — The report link

Reuses `app/core/tenant_urls.py` wholesale (ADR-0008 D-8). Inherits, verbatim: token shape,
host derivation from the tenant row, expiry, single use, rate limit, and *"CONTEXT, never
AUTHORITY."*

**The router that serves it resolves no tenant from the URL**, so under
`rules/backend/service-system.md` §9 it must declare itself with a header naming its owner, why it
has no tenant, its substitute guard, its retention policy **and who executes that policy**.

🔴 **Latent trap, recorded before someone trips it:** `send_text` does not set `preview_url`, so no
preview is fetched today. If a single-use token ever meets an enabled link preview, **the preview
fetch consumes the token before the owner taps it.** The `cta_url` button (Phase 6) avoids link
previews entirely.

---

## Phase 5 — The interactive page

Mobile-first, one answer on the first screen, scroll for detail, one link to the dashboard.
`primary_color` supplies branding. The repo's `mobile-viewport-quirks` skill already holds the
svh/dvh and iOS safe-area knowledge — read it rather than rediscover it.

🔴 **Unknown blocking the design, cheap to close:** no official Meta statement was found about
WhatsApp's in-app browser behaviour after a link is tapped. What is official is only the `cta_url`
spec. **Resolve it on a real phone before designing the handoff** — see "Open questions".

---

## Phase 6 — `cta_url`

One new method on `whatsapp_service`. Our `send_interactive_buttons` sends
`interactive.type = "button"` (reply buttons); `cta_url` is a different type we do not have.

Official limits: `display_text` ≤ **20 characters** · `body.text` ≤ 1024 · `footer.text` ≤ 60 ·
`header.text` ≤ 60. Meta's own rationale: *"WhatsApp users may be hesitant to tap raw URLs
containing lengthy or obscure strings in text messages."* («شوف تقريرك» = 11 characters.)

---

## Open questions — answers needed from Salman, not from code

```
Q1  🔴 D-1 correction: daily becomes PULL. Confirm, or authorise the template that makes push work
Q2  🔴 D-3 correction: no timezone change will be made. Confirm the withdrawal
Q3  Which figures belong on screen 1 for a restaurant owner — and was a report ever asked for?
    He asked for PRICE EDITING when you met him. Nobody has asked for a report yet
Q4  Report link lifetime: single-use like a setup token, or valid for a period?
Q5  The StoreOrder.createdAt index — a production DDL change, deliberately not bundled here
```

---

## Execution log

### Phase 1 — 🟢 complete, 2026-09-30 · `56 PASS / 0 FAIL`

```
app/services/report_contract.py          new — the shape + period arithmetic. Zero I/O
app/repositories/store_report_repo.py    new — one windowed read + the all-time positive control
app/services/restaurant_report_service.py new — pure build_report() + impure load_report()
scripts/test_report_contract.py          new — 56 checks, NO database
```

**Every Phase-1 invariant is asserted, and each absence carries a positive control:**

| invariant | how it is proven |
|---|---|
| RC-1 | every repository function's first argument is `client_id`, parsed from the AST; Prisma call count equals `clientId` mention count |
| RC-2 | `report_contract` imports `wall_clock_now` and contains **zero** `datetime.now(` after docstrings are stripped — plus a control proving the detector sees a planted one |
| RC-3 | day = shop midnight, half-open at both ends; week starts Monday; previous window abuts exactly and never overlaps |
| RC-4 | an empty period returns a valid `Report`, flagged empty, carrying **zero** metrics and still a headline |
| RC-5 | no contract field name contains a vertical word — plus a control proving the word list would catch `orders_count` |
| RC-6 | zero LLM-client references in either module — plus a control proving the detector sees a planted `anthropic` import |

**Beyond the required invariants, three real traps are pinned by assertion:**

- **Two zeros are told apart** (PC-1). "A quiet day" and "this tenant has never sold anything"
  produce different headlines, because a reader aimed at the wrong tenant returns zero and looks
  exactly like a quiet day. `count_orders_all_time` exists for this and is only queried when the
  window is empty.
- **Top items group by `catalogItemId`, never by name** (T-1a). Production already holds five
  duplicate item names; grouping by name would silently merge two different items into one row.
- **A delta from zero is `None`, not 100%** (D-1a). The renderer is forced to say something
  honest instead of printing a number nobody can defend.

**Not done, deliberately:** no endpoint, no real production read — the only tenant with orders is
`beit-al-fakhar` (4), and `caracas`/`arizona` carry zero, so a live read proves reachability rather
than arithmetic. Nothing was committed.

### Phase 2 — 🟢 complete, 2026-09-30 · `31 PASS / 0 FAIL`

```
app/services/lia_owner_entry.py           _LIA_VERTICALS → _LIA_VERTICAL_OPERATIONS (+ derived set)
                                          + _vertical_allows_operation()
scripts/test_lia_vertical_allowlist.py    new — 31 checks
```

🔴 **TRANSITION, declared.** `_LIA_VERTICALS = frozenset({"barber"})` was a flat set of vertical
names; it is now **derived** from a vertical → allowed-operation-names mapping. Its **value is
unchanged** — `{"barber"}` before and after — and LV-1a asserts exactly that, because a refactor
that quietly changes who may reach Lia is the one outcome this phase must not produce. The two
existing call sites that log `sorted(_LIA_VERTICALS)` were not touched and still tell the truth.

**A correction found while doing this:** the registry holds **seven** operations, not six —
**six writes and one read** (`daily_report`, the only `.read` permission). The earlier figure was
wrong in the research artifact and in ADR-0008 D-5; both are corrected, and LV-0 now asserts the
count so it cannot drift again.

| invariant | how it is proven |
|---|---|
| LV-0 | seven operations · exactly one read · six writes · and "read" is derivable from the permission suffix, so no new registry field was needed |
| LV-1 | `_LIA_VERTICALS` is still exactly `{"barber"}`; barber reaches all seven, listed **by name** — a derived `frozenset(REGISTRY)` would silently grant it whatever a future phase registers |
| LV-2 | `restaurant` reaches **zero** writes, only `.read` permissions are admissible, and it is **empty today** — so it is still fenced out entirely: **zero behaviour change** |
| LV-3 | unknown vertical · `None` · `""` · unlisted operation all refused — and two positive controls prove the gate is not simply always-false |
| LV-4 | the mapping is a module-level literal (checked on the AST), never mutated, and every set is a `frozenset` |
| LV-5 | a vertical with an empty set is not in `_LIA_VERTICALS` — "a greeting that cannot be honoured is a promise not kept" |
| LV-6 | `_tenant_has_lia`'s `lia OR reservations` bridge is untouched — asserted, not assumed |

🔴 **LV-1c failed on its first run, and it was right to.** It searched the raw source for
`frozenset(OPERATIONS)`; the **comment explaining why that form was deliberately avoided** matched
the search. This is `feedback_assert_on_code_not_text` reproduced a **fourth** time, by the very
check written to prevent it. Fixed by asserting against `ast.unparse` output (comments never enter
the tree, docstrings are blanked), and both directions now carry a control: the detector still sees
a real derived set, and no longer fires on a comment mentioning one.

**Regression, measured after the change:** `test_report_contract` 56/0 ·
`test_restaurant_vertical_registration` 22/0 · `test_clinic_booking_module_contract` ALL GREEN ·
`app.main` imports. Nothing committed.

### 🔴 LV-7 — a gap found by reviewing this phase's own diff, and pinned

`_vertical_allows_operation` has **zero production call sites**. Only the suite calls it. What
actually keeps `restaurant` out today is the **derived** `_LIA_VERTICALS` being empty for it — not
the new gate.

That is safe now and unsafe the moment someone adds an operation name to `restaurant` without
wiring the call: the vertical becomes served while its per-operation fence is never consulted —
the exact silent-open failure the allow-list exists to prevent. An earlier draft of the code
comment called Phase 3 *"a one-line data edit"*, which was wrong in the dangerous direction; it is
corrected, and **LV-7 pins the gap as a failing-state guard**, the same shape as R-7 in
`test_restaurant_vertical_registration`.

**Phase 3 is therefore TWO things, not one:**

```
1  register the restaurant read operation + add its name to _LIA_VERTICAL_OPERATIONS["restaurant"]
2  CALL _vertical_allows_operation(vertical, operation) at the operation dispatch,
   refusing with its own text (rules/text-context-rule.md) and a SecurityAuditLog row
```

Suite after adding the guard: **35 PASS / 0 FAIL**.
