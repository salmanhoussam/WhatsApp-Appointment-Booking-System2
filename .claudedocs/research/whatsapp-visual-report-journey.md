# Research — WhatsApp → Secure Visual Report → Mobile → Dashboard

**Status:** Research only. **No decision is made by this document.** Captured 2026-09-30 after
Salman reframed an investigation about video generation into the question that mattered:

> **Lia does not send a statistics video. Lia sends a Visual Report built from the data the owner
> asked for, and motion is one way of presenting it.**

**Measured against:** `HEAD = 3ade90a`, 2026-09-30. Every `REPO` figure is perishable.
**Consumed by:** `.claudedocs/adr/ADR-0008-visual-report.md` · **Sibling:**
`.claudedocs/research/motion-visualization-landscape.md` (the outside landscape; this is our own
system's journey).

> Evidence tags as defined in the sibling document: `SOURCE` · `REPO` · `INFER` · `PROP` ·
> `DECISION` · `UNKNOWN`. This document contains **zero** `DECISION`.

---

## 1. Layer 1 — Report Intelligence

### What exists

`REPO` Lia holds **seven** registered operations. **Exactly one is a read:**

```
create_service · create_reservation · log_daily_visits
create_catalog_item · create_product · update_product     ← six writes
daily_report                                               ← the only read
```

*Corrected 2026-09-30: this first read "six operations". Counted from `lia_operations._REGISTRY`
rather than from the earlier reading, the total is **seven**, and only `daily_report` carries a
`.read` permission — which is also the signal Phase 2's allowlist uses to enforce read-only.*

`REPO` And `daily_report` is narrower than its name, in three layers
(`lia_owner_entry.py:3941-3946`):

```python
now  = datetime.now()                                 # the shop's clock — container TZ=Asia/Beirut
day0 = datetime(now.year, now.month, now.day)         # 🔴 today, hardcoded
rows = ...list_by_client(client_id, None, "arrived",  # 🔴 "arrived" only
                         day0.replace(tzinfo=utc), ...)
mine = [r for r in rows if _is_daily_log_row(r)]      # 🔴 the cash log only
```

`INFER` ⇒ It is not "today's report". It is **"what the owner typed into the cash log today"** — no
bookings, no orders, no cancellations.

`REPO` **"Week" does not exist:** `grep -c "الأسبوع" app/prompts/lia.md` → **0**.
`REPO` **Lia is fenced to barbers:** `_LIA_VERTICALS = frozenset({"barber"})`.

### 🟢 What we hold is worth more than what is missing

`REPO` The operation registry is a clean four-field contract, so a new report is **one entry**:

```python
OperationDefinition(permission, legacy_roles, service_key, write_fn, mirrors_route)
```

🔴 `REPO` **The invariant that matters most**, from the file's own words:

> *"No message text, no Arabic wording, no Meta identifiers… **and nothing the model produces
> except the operation NAME.**"* — and **I-7**: *"Lia holds no permission of her own."*

`INFER` ⇒ The question *"how do we guarantee every number comes from the DB?"* is **already
answered by construction: the model never produces a number.** It produces an operation name; the
registered reader fetches the figure. **This invariant must survive into the visual layer** — a
beautiful page carrying an invented number is worse than nothing.

`REPO` Scope is solved too: `scope_barber_id(user, "reservations")` means a self-scoped account
sees only its own rows. And every call already writes a `SecurityAuditLog` row (`lia_daily_report`)
— **an audit trail per report, free.**

### 🔴 The timezone question — asked, and answered against the first guess

`REPO` No `timezone` column on any model; the container runs `TZ=Asia/Beirut` (documented in three
files).

`INFER` The first reading of `day0.replace(tzinfo=timezone.utc)` was *"this labels a Beirut
midnight as UTC, so the window is shifted."* **That inference was wrong, and measuring it before
acting is the only reason it did not become a change.**

`REPO` `availability_engine.py:25-45` names the convention **F-TZ-1** and states it is deliberate:

> *"`reservedAt` is stored throughout this system as a naive LOCAL wall-clock value LABELLED UTC,
> with no conversion. The container runs `TZ=Asia/Beirut`, so `datetime.now()` is the shop's wall
> clock, and `.replace(tzinfo=timezone.utc)` labels it without moving the instant."*

`REPO` And using a true UTC instant instead **was a real, browser-verified production defect**:
`044aafe` (2026-08-05) — slots from 15:00 while local time was 17:37, wrong by exactly the tenant's
UTC offset; `d77ddce` carried the fix to three more guards. `reservation_service.py:567-572` adds:
*"two guards that everyone assumes agree are worse than one."*

⇒ **Reader and writer use the same representation, so the day boundary really is Beirut midnight.**
The genuine debt is F-TZ-1 itself (a tenant timezone column, converting stored values, six call
sites), already placed out of scope by Salman on 2026-09-26.

*This is the clearest case in this document of why the tags exist: it was raised as `UNKNOWN` with
an `INFER`, treated as fact, and caught by measurement.*

---

## 2. Layer 2 — Visual Report

`PROP` The decoupling, testable by one criterion: can the same contract feed four renderers
unchanged?

```
                        ┌── Live Dashboard    (recharts ^2.15.3 — already installed)
Report Data Contract ───┼── Visual Report Page ← the first product
                        ├── Static Image
                        └── MP4                (a later export of the same page)
```

`REPO` One barrier, shared by all four: **no time-series endpoint exists.** The three statistics
surfaces are snapshots, and the only order-shaped one is today-only:

```
/admin/dashboard         dashboard.py:56   one month · 🔴 chalet-shaped (units · occupancy · checkIn)
/admin/dashboard/stats   dashboard.py:152  four scalars · chalet-shaped again (available_units)
/admin/store/orders/stats store.py:408     🔴 TODAY only (list_today_orders)
```

`INFER` The first two return honest zeros for a restaurant because their columns ask about `units`.
**This is the second independent sighting of the same column-blindness** — the first was the tenant
table in `CLAUDE.md` (finding س-١, caracas investigation). By `architecture-review-loop`'s
pattern-escalation rule that makes it a **candidate**, recorded here and not opened.

`REPO` **A decisive asymmetry:**

```
🟢 Reservation  @@index([clientId, moduleKey, reservedAt]) · ([clientId, barberId, reservedAt])
                indexed for exactly this question — the barber vertical is ready
🔴 StoreOrder   @@index([clientId]) · ([status]) · ([clientId, customerId])  — none on createdAt
                the restaurant vertical, which is the priority, is not
```

`INFER` In the link-opened framing, **the first product is an HTML page, not a video**: shareable by
link, no render cost, no storage, and no WhatsApp media capability — which we do not have. It can
animate natively and can later export itself to MP4 in-browser, making video **a later export of the
same page** rather than a parallel product.

---

## 3. Layer 3 — WhatsApp Delivery

### 🟢 The security precedent is complete and production-proven

`REPO` `app/core/tenant_urls.py` already solves four of the five questions:

| needed | already exists |
|---|---|
| unguessable link | `mint_setup_token(slug)` → `<slug>_<token_urlsafe(32)>` |
| tenant-scoped host | `admin_base_url(lifecycle_state)` — **derived from the tenant row, not an env var** |
| expiry | `users.setupTokenExp` |
| single use | `invalidate_setup_token(user.id)` |
| brute-force resistance | `@limiter.limit("5/minute")` on both token routes |

🔴 `REPO` **Its ratified invariant, verbatim:**

> *"It is **CONTEXT, never AUTHORITY** — the page must keep taking the slug it routes to from the
> API response, because a URL parameter is client-supplied: trusting it would let anyone holding a
> valid token land themselves on another tenant's dashboard path."*

`INFER` A report token inherits this exactly: matched **whole**, tenant from the **matched row**.

### 🔴 The constraint that decides pull versus push

`REPO` Our own code comment (`whatsapp_service.py:146-149`):

> *"Everything above this line is a FREE-FORM send, which Meta accepts only inside the 24-hour
> customer-service window. Outside it, every one of them comes back **131047 (proven on production,
> Gate 0)**."*

`SOURCE` Meta, official: *"When a WhatsApp user messages you or calls you, a 24-hour timer called a
customer service window starts… If the user messages or calls you again before the timer expires,
the timer resets."* Outside it, **pre-approved templates only**.

```
🟢 "ليا، ورجيني تقرير الأسبوع"   the owner messaged ⇒ window open ⇒ free-form + link ✅
🔴 an unprompted weekly push     window closed ⇒ an approved template is mandatory
```

`INFER` ⇒ **Pull is not an architectural preference. It is the only thing that works today without
Meta's approval.** And the window is opened by the **user**, so a report *we* send keeps nothing
open — the premise that a daily push sustains the window is inverted.

### 🟡 The message itself

`REPO` `send_text` does **not** set `preview_url` ⇒ no preview is fetched, and the link renders as
**raw text**.
`REPO` `send_interactive_buttons` sends `interactive.type = "button"` = **reply buttons**. ⇒ **We
have no `cta_url` capability at all.**

`SOURCE` Meta defines the needed type officially, and gives its own rationale:

> *"WhatsApp users may be **hesitant to tap raw URLs** containing lengthy or obscure strings in text
> messages."*

```json
"interactive": { "type": "cta_url",
  "body":   { "text": "≤ 1024 chars" },
  "action": { "name": "cta_url",
              "parameters": { "display_text": "≤ 20 chars", "url": "…" } },
  "footer": { "text": "≤ 60 chars" } }
```

`INFER` «شوف تقريرك» = 11 characters — comfortable inside 20.

### 🔴 A latent trap, recorded before it is sprung

`SOURCE` Published security research: *private links are no longer private* — threat-intelligence
feeds and link scanners discover unguessable URLs. ⇒ randomness alone is insufficient: **expiry +
limited use + rate limit + scope.**

`INFER` **And one specific to us:** if a report token were single-use **and** someone later enabled
`preview_url` "to make it look nicer", **the preview fetch would burn the token before the owner
tapped it.** Preview is off today, so the trap is latent, not active — and a `cta_url` button avoids
link previews entirely.

### `UNKNOWN`

**No official Meta statement was found** about the in-app browser's behaviour after a link is
tapped (in-app WebView vs system browser, session persistence). Only the `cta_url` spec is official.
**Nothing is asserted about the WebView.** It is resolvable on a real phone in two minutes.

---

## 4. Layer 4 — Visual Experience

`SOURCE` The Spotify Wrapped pattern: **9:16 vertical** slides · bite-sized and scrollable ·
**controlled pacing that builds suspense** · a deliberate avoidance of *"corporate dashboard
aesthetics"* · a prominent share button.

`INFER` **It transfers partially, not wholly.** The identity/virality motive is weak for a
restaurant owner; pride and sharing with a partner are real. But the primary job is **decision
support**: *which item do I stop making? which hour needs another person?*

`SOURCE` The counter-evidence stands: Revid measured twelve craft variables and **none** predicted
engagement — *"distribution decided, not the edit."*

`PROP` The shape that matches the described journey:

```
screen 1    one answer, one line     "هالأسبوع أحسن من اللي قبلو بـ٢٣٪"     ← the wow
screen 2+   scroll for detail        top items · peak hours · comparison
last        one link to the dashboard                                        ← the handoff
```

`REPO` Branding is one field away (`primary_color`), and the repo already holds the
`mobile-viewport-quirks` skill (svh/dvh, iOS safe areas) — that knowledge is already paid for.

---

## 5. The journey, step by step

| # | step | state | evidence |
|---|---|---|---|
| 1 | owner asks for "the week's report" | 🔴 | `"الأسبوع"` = **zero** occurrences in `lia.md` |
| 2 | …and he owns a restaurant | 🔴 | `_LIA_VERTICALS = {"barber"}` |
| 3 | tenant resolved from sender's number | 🟢 | built and working |
| 4 | authorization and visibility scope | 🟢🟢 | operation registry + `scope_barber_id` + automatic audit |
| 5 | figures computed from the DB | 🟡 | today + cash log only; no series anywhere |
| 6 | report data contract | 🔴 | did not exist |
| 7 | visual output | 🔴 | did not exist |
| 8 | mint a secure, scoped link | 🟢🟢 | `tenant_urls.py` — **complete, proven precedent** |
| 9 | send over WhatsApp | 🟡 | text ✅ · `cta_url` ❌ · window forces pull |
| 10 | open on mobile | 🔴 + `UNKNOWN` | page does not exist; WebView behaviour unproven |
| 11 | hand off to the dashboard | 🟢 | `/{slug}/dashboard` is canonical |

`INFER` **The two hardest layers — authorization and security — are already built. What is missing
is the middle: the data contract and the page.**

---

## 6. Risks

| # | risk | tag |
|---|---|---|
| 🔴 1 | a model-produced number looks *more* credible inside a polished page than inside text | `INFER` |
| 🔴 2 | a wrong period boundary — and a week inherits a day's error multiplied | `REPO` |
| 🔴 3 | no restaurant data at all: `caracas` and `arizona` hold zero orders, because order creation notifies nobody | `REPO` |
| 🔴 4 | a link preview burning a single-use token | `INFER` |
| 🔴 5 | "private" links discovered by scanners | `SOURCE` |
| 🟡 6 | a scheduled push needs an approved template, and fails silently at 131047 without one | `REPO`+`SOURCE` |
| 🟡 7 | a link lives in a phone; a wrong figure cannot be withdrawn | `INFER` |
| 🟡 8 | the WOW trap | `SOURCE` |
| 🟡 9 | Lia becoming a general read surface — the registry supports it **only if it is not short-circuited** | `INFER` |

---

## 7. Open questions

```
Q  how many reports, which periods, which metrics in each?
Q  which vertical first — barber is indexed and has data; restaurant is the priority and has none
Q  🔴 is the UTC labelling deliberate? — ANSWERED during this research: yes. See §1
Q  unfence Lia for reads only? (a read is less dangerous than a write — a separate decision)
Q  link lifetime: single-use, or valid for a period?
Q  pull first; a push needs a template. Request it now or defer?
Q  interactive page or animation? — not settled before seeing what the owner actually wants
```

---

## 8. What this research concluded

`INFER` **The blocker was never the rendering.** It is that the middle of the journey does not
exist, while both ends — authorization and secure delivery — are already built and proven.

`INFER` And the question no source can answer: **the owner of `caracas` asked for price editing. He
has never asked for a report.** Building a report before asking him what he wants to know is
building the wrong thing well.

🔴 **No decision is made here.** ADR-0008 took the decisions that followed.
