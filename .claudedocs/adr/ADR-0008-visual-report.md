# ADR-0008 — The Visual Report: a tenant's own numbers, asked for over WhatsApp

**Status:** **Accepted** — ratified by Salman, 2026-09-30
**Date:** 2026-09-30
**Decision owner:** Salman
**Evidence base:**
`.claudedocs/research/whatsapp-visual-report-journey.md` (the journey, measured end to end)
`.claudedocs/research/motion-visualization-landscape.md` (the rendering landscape, and what was excluded)

**Relates to:** `TOS-003` (Capability Contract model) · `rules/backend/architecture.md` §9, §10 ·
`rules/text-context-rule.md` · `.claudedocs/architecture/capabilities/lia.md`

---

## Context

A tenant's numbers exist in the database and reach nobody. The one report that exists —
Lia's `daily_report` — serves one vertical (`barber`), one period (today), and one source
(the manually-typed cash log), as text. `caracas`, the platform's first real restaurant,
went live on 2026-09-30 with 97 catalog items and has no way to be told anything about itself.

The investigation that produced this ADR began as "can Opus 5.5 turn statistics into video?"
and was reframed by Salman mid-investigation into the question that actually matters:

> **Lia does not send a statistics video. Lia sends a Visual Report built from the data the
> owner asked for, and motion is one way of presenting it.**

That reframing is the decision this ADR ratifies. Everything below follows from it.

---

## Decision

### D-1 · Two reports, both **pull**, never push

| report | period | trigger |
|---|---|---|
| **daily** | the shop's day | the owner asks |
| **weekly** | the shop's week | the owner asks |

🔴 **Corrected from the decision as first stated, on measured evidence.** The original decision
read: *"a daily report keeps the 24-hour window open, so we can always message him without
templates."* The causality is inverted, and this project has already paid for that fact:

- Meta, official: *"When a WhatsApp user messages you or calls you, a 24-hour timer called a
  customer service window starts… If the user messages or calls you again before the timer
  expires, the timer resets."* The window is opened by the **user's** inbound message.
- This repository, `app/services/whatsapp_service.py:146-149`: *"Everything above this line is a
  FREE-FORM send, which Meta accepts only inside the 24-hour customer-service window. Outside it,
  every one of them comes back **131047 (proven on production, Gate 0)**."*

A report **we** send therefore keeps nothing open. A pushed daily report fails — silently, because
`whatsapp_notifications`' senders never raise by contract — on the first day the owner does not
happen to message us first.

**Pull satisfies the original intent completely and costs nothing:** the owner's request *is* the
event that opens the window, so the reply is free-form and needs no template. This is exactly how
`daily_report` works for barbers today.

**Push is not rejected, it is sequenced:** it requires one approved template, and templates are
deferred by D-6. When that template exists, push becomes an addition, not a rewrite.

### D-2 · Restaurant first; the contract is vertical-agnostic

Implementation targets `restaurant` only. The Report Data Contract (D-4) carries no restaurant
field names and no barber field names — a vertical supplies a **reader**, not a shape. `barber`
and `clinic` are added later by registering a reader, not by editing the contract.

Measured asymmetry, recorded because it makes the first build harder than it looks:

```
🟢 Reservation  @@index([clientId, moduleKey, reservedAt]) · ([clientId, barberId, reservedAt])
                the barber vertical is already indexed for exactly this question
🔴 StoreOrder   @@index([clientId]) · ([status]) · ([clientId, customerId])
                no index on createdAt — the restaurant vertical is not
```

### D-3 · The time convention is **not changed** — F-TZ-1 stays closed

🔴 **Corrected from the decision as first stated, and this correction prevents a regression.**
The original decision read: *"fix the day-limit offset in the code to use Beirut time."* There is
no offset defect to fix. Measured at three independent sites:

- `app/services/availability_engine.py:25-45` — the convention is named **F-TZ-1** and documented
  as deliberate: *"`reservedAt` is stored throughout this system as a naive LOCAL wall-clock value
  LABELLED UTC, with no conversion. The container runs `TZ=Asia/Beirut`, so `datetime.now()` is the
  shop's wall clock, and `.replace(tzinfo=timezone.utc)` labels it without moving the instant."*
- The same file records that using a true UTC instant instead **was a real, browser-verified
  production defect**: commit `044aafe` (2026-08-05), the availability endpoint returning slots
  from 15:00 while local time was 17:37 — wrong by exactly the tenant's UTC offset. `d77ddce`
  carried the fix to three more guards.
- `app/services/reservation_service.py:567-572` — *"Writing a 'more correct' comparison here with
  a real UTC instant would put this guard three hours away from the two in the routes, and two
  guards that everyone assumes agree are worse than one."*

`daily_report`'s `day0.replace(tzinfo=timezone.utc)` is therefore **consistent, not defective**:
reader and writer use the same representation, so the day boundary really is Beirut midnight.

The genuine debt is F-TZ-1 itself — a tenant timezone column, converting the stored values, six
call sites, Lia and the barber path — and Salman already placed it **out of scope on 2026-09-26
(option أ)**. This ADR does not reopen it. **A new reader added under D-4 inherits the convention
from `availability_engine.wall_clock_now()` rather than inventing a definition of "now".**

*How this error was caught is itself the reason the rule exists: it was raised as an* `UNKNOWN`
*with an* `INFERENCE` *attached, decided upon as if it were a fact, and measured before execution.
The* `INFERENCE`/`UNKNOWN` *tags in the research artifacts exist so this stays visible.*

### D-4 · One Report Data Contract, four possible renderers

```
                        ┌── Live Dashboard        (recharts ^2.15.3, already installed)
Report Data Contract ───┼── Visual Report Page    ← THE PRODUCT (D-7)
                        ├── Static Image          (later)
                        └── MP4                   (later, exported from the same page)
```

One capability, one contract, one service, many interfaces —
`rules/backend/architecture.md` §9 applied directly. The contract is the single source of truth
for what a report *is*; a renderer never queries the database.

**The invariant that must survive into the visual layer**, inherited from
`lia_operations.py`'s own words — *"nothing the model produces except the operation NAME"* — and
from invariant **I-7**, *"Lia holds no permission of her own"*:

> 🔴 **No number in a Visual Report is ever produced by a model.** The model resolves an intent to
> an operation name; a registered reader produces every figure from the database. A beautiful page
> carrying an invented number is worse than no page.

### D-5 · Lia reaches `restaurant` **read-only**, enforced per operation

🔴 **The obvious implementation would violate this decision.** `_LIA_VERTICALS` is a single gate
over all of Lia, not over writes alone — `_vertical_allows_lia` is *"the primary gate at the three
entry points"* (`lia_owner_entry.py:586-602`). Adding `"restaurant"` to that frozenset would open
all **seven** registered operations, **six** of which write — counted from
`lia_operations._REGISTRY`, where only `daily_report` carries a `.read` permission.

**Therefore:** a per-vertical **operation allowlist**, so a vertical declares *which operations*
it may reach, not merely *that* it may reach Lia. `barber` keeps every operation it has today;
`restaurant` receives the report readers and nothing else. A write operation attempted from a
restaurant tenant is refused by the registry, not by a comment.

The existing fence's own reasoning is preserved: the allowlist is **source, not a tenant-side
toggle and not a runtime value** (`rules/repository-hygiene.md`, Persona & Prompt Drift), and it
does not touch `_tenant_has_lia`'s live `lia OR reservations` migration bridge.

### D-6 · On-demand free-form text now; templates deferred

No template work in this ADR's scope. Consequence, stated so it is not discovered later: **there
is no scheduled report and cannot be one** until a template is approved (D-1).

### D-7 · The product is an interactive page

Not a video, not an image. The page is the renderer: shareable by link, zero render cost, zero
storage, no WhatsApp media capability required — and `whatsapp_service` has **no media send at
all** today (`send_text` · `send_template` · `send_interactive_buttons` · `send_list_message`).
It can animate natively, and can later export itself to MP4 in-browser, which makes video a
**later export of the same page** rather than a parallel product.

Shape (from `.claudedocs/research/whatsapp-visual-report-journey.md` §4):

```
screen 1    one answer, one line      "هالأسبوع أحسن من اللي قبلو بـ٢٣٪"
screen 2+   scroll for detail         top items · peak hours · comparison
last        one link to the dashboard  ← the handoff
```

### D-8 · The link reuses the proven mechanism, unchanged

`app/core/tenant_urls.py` already solves this and is proven in production:
`mint_setup_token(slug)` → `<slug>_<token_urlsafe(32)>` · `admin_base_url(lifecycle_state)` derives
the host from the tenant row, never from an env var · `setupTokenExp` (expiry) ·
`invalidate_setup_token` (single use) · `@limiter.limit("5/minute")` (brute force).

🔴 **Its ratified invariant is inherited verbatim and is not negotiable:**

> *"It is **CONTEXT, never AUTHORITY** — the page must keep taking the slug it routes to from the
> API response, because a URL parameter is client-supplied: trusting it would let anyone holding a
> valid token land themselves on another tenant's dashboard path."*

A report token is matched **whole**, and the tenant comes from the **matched row**.

---

## Operating decisions — Q1–Q5, ratified 2026-09-30

Five questions were left open when D-1…D-8 were written. All five are now answered.

### Q1 · Pull, for both reports — **confirms the D-1 correction**

Ratified: *"Adopting pull for both the daily and weekly report is the sound engineering decision.
It keeps the 24-hour window open from the user's side, spares us the silent failure (131047), and
removes any need for Meta templates at this stage."*

### Q2 · The timezone decision is **withdrawn** — confirms D-3

Ratified: *"No touching a stable, proven timing system that currently serves production. Replacing
it would revive defect 044aafe."* No code change is made. F-TZ-1 stays as it is, out of scope.

### Q3 · The MVP first screen is **two numbers**

> **Today's total sales, and the order count. Nothing deeper.**

Because the owner *"did not ask for a report — he asked to edit prices."* Anything further waits
until he is asked directly, in person, on the next visit.

**Consequence, stated so it is not read as an accident:** the Phase 1 reader already produces more
than this — an hourly/daily series and a ranked item list. That is **deliberate and allowed**: the
contract may be richer than its first renderer. The MVP page renders two metrics; the extra parts
are computed, tested, and simply not shown. **What is forbidden is the reverse** — a page showing a
figure the contract does not produce.

### Q4 · The link is **time-limited, not single-use** — this AMENDS D-8

> **Valid for a fixed period (24 hours), not burned on first open.**

Ratified: *"The user may close the browser by accident or switch between apps, and frustrating him
with a link that burns on the first tap defeats the purpose of the report."*

This is a **deliberate divergence** from the setup-token precedent D-8 inherits: `setupToken` is
single-use because it grants a password change, which must happen exactly once. A report grants a
**read of the owner's own numbers**, which he may reasonably want twice. So D-8's token *shape*,
host derivation, rate limit and `CONTEXT-never-AUTHORITY` invariant are inherited unchanged, and
only `invalidate_on_use` is dropped in favour of an expiry.

🟢 **A risk removed as a side effect:** the latent trap recorded in
`.claudedocs/research/whatsapp-visual-report-journey.md` §3 — a link preview fetch consuming a
single-use token before the owner taps it — **cannot occur against a time-limited token.** Q4 makes
the system safer, not only kinder.

⚠️ **A risk accepted in exchange:** a valid link is replayable for 24 hours by anyone who obtains
it. Mitigated by expiry, scope and rate limit, and bounded by what it exposes — one tenant's own
aggregate figures, no customer records, no write path. Recorded rather than glossed.

### Q5 · The `createdAt` index is prepared, **not executed** — new decision D-9

Ratified: *"Adding the `StoreOrder.createdAt` index is essential to avoid a performance collapse on
report queries. Prepare it as a completely standalone migration, to be executed carefully later."*

Prepared at `prisma/migrations/add_store_order_created_at_index.sql`, `CREATE INDEX CONCURRENTLY`,
with its verification query and the interrupted-build recovery path. **It has not run.** The file
carries the pairing requirement: `@@index([clientId, createdAt])` must be added to `schema.prisma`
**in the same operation**, because this repository has already had a real production index proposed
for deletion by `prisma db push` after reaching the database but not the schema file.

---

## Consequences

**Accepted:**

- No scheduled reports exist until a template is approved (D-1, D-6).
- `caracas` and `arizona` carry **zero orders** today, so the first real restaurant report will
  honestly read zero. Building the pipeline before the data arrives is deliberate; presenting a
  fabricated number to make a demo look alive is forbidden
  (`feedback_no_fabrication_design_briefs`).
- `StoreOrder` has no `createdAt` index. A date-ranged read is unindexed until that is decided
  separately — measured, not assumed, and **not** silently added by this ADR.
- The time convention stays as it is, with its known debt (D-3).

**Rejected, with the reason recorded so it is not re-litigated:**

| rejected | why |
|---|---|
| Pushed daily report | opens no window; fails 131047 the first silent day (D-1) |
| "Fix" the UTC labelling | it is the convention; the fix is a known production regression (D-3) |
| `_LIA_VERTICALS += "restaurant"` | grants five write operations against an explicit read-only decision (D-5) |
| Remotion | company licence ≥4 employees; SaaS = $0.01/render, $100/month floor |
| Per-tenant model call at render time | privacy, unbounded cost, no reproducibility — and D-4 forbids model-produced numbers |
| MP4 as the first product | needs a media-send capability that does not exist, plus storage and expiry |

---

## Verification

This ADR is not closed by shipping code. It is closed when, for one real tenant with real orders:

1. The owner asks Lia for a report over WhatsApp and receives a link.
2. Every figure on the page is reproducible by querying the database directly.
3. A token belonging to tenant A cannot render tenant B's numbers — proven by a real refused
   attempt, not by reading the code.
4. A write operation attempted from a restaurant tenant is refused, with the refusal recorded in
   `SecurityAuditLog`.
5. The local suites stay green.

Per `rules/documentation-policy.md`, each phase carries its own evidence before the next begins.
The implementation sequence is `.claudedocs/plans/restaurant-visual-report.md`.
