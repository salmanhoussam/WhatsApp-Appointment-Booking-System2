# WhatsApp Customer Experience Architecture — Alzabt

**Status:** APPROVED PLAN — ready to execute from Phase 0.
**Written:** 2026-09-09 · **Owner:** Salman · **Supersedes nothing; absorbs one plan (below).**

> **Read this file first in the next session.** It is written to be executable from a cold start:
> §0 gives the tooling, §1 the current reality, §2 the decisions already made, §3 the phases.

---

## §0 — Context and tooling (read before touching anything)

### Companion documents — read in this order

| Document | Why |
|---|---|
| `.claudedocs/plans/whatsapp-outbound-reliability-and-templates.md` | The 384-line Phase A/B plan. **Absorbed** here as Phase 0 and Phase 3 — do not duplicate or re-derive it |
| `.claudedocs/plans/reservation-whatsapp-handoff-and-customer-identity.md` | **Added 2026-09-10 — a hard
dependency, see §3 Phase 1 and Phase 2.** The website hands a booking to WhatsApp with no correlation and
persists a placeholder customer identity; 16 real reservations on `rk` and `mr-h` are affected |
| `.claudedocs/sessions/2026-09-09.md` | How we got here, and the four defects fixed and shipped today |
| `.claudedocs/work/team-staff-manager/2026-09-09/report.md` | Team/Manager/owner-protection work that this builds on |
| `.claude/rules/phone-numbers.md` | Storage with country code — load-bearing for every WhatsApp recipient |
| `.claude/rules/frontend/browser-verification-protocol.md` | Real-browser evidence is required before any frontend conclusion |
| `.claude/rules/investigation-protocol.md` | Confirmed / Side Findings / Unknowns; Recommendation ≠ Decision ≠ Execution |

### Tooling actually used in this work

```bash
# DB access — ALWAYS through the guard, never a raw DIRECT_URL
venv/bin/python -c "
import sys; sys.path.insert(0,'.'); sys.path.insert(0,'scripts')
import psycopg2
from _db_target import resolve
c = psycopg2.connect(resolve(direct=True, quiet=True))"
```

- **`scripts/_db_target.py`** — validates the target by ROLE not geography; refuses the retired
  Sydney database. Production is Frankfurt; `SY_*` in `.env` are the legacy values.
- **Local API against the production DB:** `venv/bin/python -m uvicorn app.main:app --host 127.0.0.1
  --port 8000`. ⚠️ **uvicorn has no `--reload` here — a code edit needs a restart, and a stale
  process silently serves the old code.** This cost a full false negative today. Kill with
  `pgrep -f "uvicorn app.main:app"` then `kill -TERM <pid>` — **`pkill` kills this session's own
  shell** (exit 144), so never chain it with other work.
- **Frontend:** `cd frontend && npx vite --port 5173 --strictPort`; build check
  `npx vite build --logLevel error`.
- **Admin JWT for local testing:** mint with `app.core.security.create_access_token` using the local
  `SECRET_KEY`. ⚠️ **Production's `SECRET_KEY` differs** — a locally minted token is rejected `401`
  by `api.salmansaas.com`. That is correct hygiene, not a bug.
- **Browser:** Playwright MCP is available in-session (`mcp__playwright__browser_*`). Read the DOM
  with `browser_evaluate`; a snapshot alone is not evidence.
- **Deploy watch:** push → Railway. The **frontend and backend deploy at different speeds** (backend
  lagged ~90s today). Verify by **behaviour** — a new route returning `401` instead of `404`, or a
  string present in the deployed chunk — never by elapsed time. `openapi.json` is **disabled in
  production**, so it cannot be used to check whether a route shipped.

### Hosts — which is which (measured 2026-09-09)

| Host | Serves | Note |
|---|---|---|
| `api.salmansaas.com` / `dashboard.salmansaas.com` | **Backend API only** | `/setup` and `/rk/dashboard` both **404** here; no frontend bundle |
| `demo.salmansaas.com` | Frontend, **trial** tenants | current build |
| `alzabt.salmansaas.com` | Frontend, **subscribed** tenants | same build |
| `salmansaas.com` (apex) | Frontend, **stale build** | 🟡 separate deployment defect, recorded, untouched |

### Test discipline

- **Test tenant is `barberlab-test`** (2 users, 2 barbers). Return it to that exact state after every
  run — today's runs did.
- **`rk` and `mr-h` are live.** **جعفر is never a test subject** — his invite has been disturbed
  twice already.
- No test may consume a live setup token belonging to someone who has not used it.
- There is **no staging**. Every gate is a real observation on production, and a snapshot is the only
  rollback.

---

## §1 — Current reality (verified this session, not assumed)

**Most of the vision already exists.** `app/services/whatsapp_reservation_flow.py` (436 lines) is a
complete booking machine:

```
RES_AWAITING_SERVICE → RES_AWAITING_BARBER → RES_AWAITING_DATE
                     → RES_AWAITING_SLOT → RES_AWAITING_NAME → RES_CONFIRMING
```

- Selections are **WhatsApp interactive lists**; row ids **are** domain ids (`CatalogService.id`,
  `Barber.id`, slot ISO datetime). Confirmation is buttons (`confirm` / `cancel`).
- `whatsapp_flow._extract_message()` (line 226) reads `button_reply`/`list_reply` ids —
  **ids drive the machine, never Arabic text parsing.**
- It reuses the **same functions as the website**: `public_list_services`, `list_barbers`,
  `get_available_slots`, `create_reservation`. **Zero business logic in this flow.**
- `app/api/v1/public/ai_chat.py` already ships a live Anthropic route
  (`claude-haiku-4-5-20251001`); `ANTHROPIC_API_KEY` is in config. **The AI phase needs no new
  vendor, key or dependency.**

> **Correction on the record:** I told Salman there was no AI capability. Wrong — commit `d9bff2b`
> retired the AI *settings webhook* (a cross-tenant write path), not an intent layer.

So "categories from WhatsApp" is **already built and shipping.**

### The real gaps

| # | Gap | Evidence |
|---|---|---|
| **G1** | **Afternoon and evening silently unbookable** | `whatsapp_reservation_flow.py:297` `slots[:10]`. حسين works 09:00–21:00 ⇒ ~24 slots ⇒ customer sees 10 ⇒ **nothing after ~14:00**. جعفر 09:00–18:00, same cut. **A revenue bug with a reproduction.** |
| **G2** | Dates must be typed `YYYY-MM-DD` | `_step_awaiting_date` (line 258) accepts `text` only |
| **G3** | One shared WABA number for every tenant | Session key `(phoneNumberId, customerPhone)` has **no `clientId`**, patched by a "حجز <slug>" deep link that outranks the session |
| **G4** | No images ever sent | Only `send_text` / `send_interactive_buttons` / `send_list_message`; `CatalogService.imageUrl` and `Barber.imageUrl` exist and the website shows them |
| **G5** | No templates | `grep template` = 0. Cause of the staff-invite and merchant-alert failures |
| **G6** | Delivery status discarded | `webhook.py:69-72` drops `statuses[]` on purpose ⇒ "delivered" is unprovable |
| **G7** | No AI intent layer wired to WhatsApp | — |
| **G8** | `_extract_message` returns `("unknown","","")` for template buttons, Flow `nfm_reply`, media | One function blocks three phases |
| **G9** | `settings.WHATSAPP_API_VERSION` exists and is **never read** — `BASE_URL` hardcodes `v18.0` | A version bump will look done and not be |
| **G10** | **No price on a reservation** | `Reservation` has no price column — blocks حسين's request |

---

## §2 — Decisions already made (do not reopen)

- **D-A.** The slot bug (G1) is handled **inside Phase R**, by Salman's decision — recorded first in
  the research so it is not lost among UX questions. It remains a correctness bug, not a preference.
- **D-B. Per-tenant WhatsApp numbers, via Embedded Signup.** Each merchant connects their own
  WhatsApp Business; Alzabt stores WABA + Phone Number ID + token; replies go out **from the
  merchant's own number**; the inbound `phone_number_id` identifies the tenant.
  **This makes the existing session key correct** — `(phoneNumberId, customerPhone)` is sound the
  moment `phoneNumberId` is per-tenant. The shared number is the anomaly, not the key.
- **D-C. Merchants act from WhatsApp.** From the real RK owner (حسين): confirm and cancel buttons,
  **and setting the price per booking** — *"الأسعار مش ثابتة، كل إنسان إلو سعره"*. A data-model
  requirement (G10), not message formatting.

---

## §3 — Phases

Each phase has a gate. Nothing starts before its gate passes.

### Phase 0 — Channel Proof *(gates everything · START HERE)*

Absorbs the companion plan's **Phase A** unchanged, plus one addition it excluded: **log-only
handling of `statuses[]`** at `webhook.py:69-72`. Justification for overriding that scope call:
every item in this vision is business-initiated, so "did it arrive" is a Phase-0 question. Log-only,
no behaviour change.

**Files:** `app/services/whatsapp_service.py` (`_send_request` returns a structured result, captures
`wamid` and the error body) · `app/services/whatsapp_notifications.py` (7 helpers stop logging
unconditional `✅`) · `app/services/public_service.py:633` · `app/api/v1/webhook.py` ·
`frontend/src/pages/generic-admin/tabs/TeamTab.jsx` (banner: "أُرسل الطلب", not "تم الإرسال").

**Gate 0:** no unconditional `✅` remains · a rejection logs Meta's error code and body ·
**the 24-hour-window hypothesis is confirmed or refuted by an observed error code** (`401` = the
token, `131047` = the window — today indistinguishable) · one real inbound booking completes on `rk`
with captured payloads · one real `statuses[]` payload observed.

### Phase R — Architecture Research *(no code)*

Three deliverables, under `.claudedocs/work/whatsapp-architecture/<date>/`:

1. **Capability matrix** (Meta docs): interactive list limits — is 10 the total cap or per section? ·
   can a list row carry an image? · button-message header types · **can a Flow render dynamic slots
   and dynamic unavailable dates WITHOUT a data-exchange endpoint?** (pivotal — if yes, Flows is
   ~10× cheaper) · template button types and their webhook payload · what `v18.0` lacks ·
   `statuses[]` shape · **Embedded Signup: steps, permissions, and what Alzabt must store per
   tenant**.
2. **Spike log** (only answerable by doing): is the access token still valid · does an inbound
   booking complete today · real `list_reply` payload for a UUID and an ISO datetime row id · does an
   image header render for a real Supabase URL · Haiku latency from Railway · AI extraction accuracy
   on **30 real Lebanese-Arabic utterances supplied by Salman**, measuring hit rate **and
   false-confidence rate**.
3. **Decision sheet**: **G1's shape** (period buttons صباحاً/بعد الظهر/مساءً partitioning the same
   `get_available_slots` output, vs paging, vs a Flow) · how per-booking price (G10) is modelled.

### Phase 1 — Funnel Correctness *(no external dependency)*

**G1**, **G2**, **G9**. G2 is nearly free: send a list of the next N days whose **row ids are
`YYYY-MM-DD` strings** and the existing `_parse_date_text` accepts them unchanged — the only edit is
accepting `list_reply` alongside `text`, with a "تاريخ آخر ✍️" row preserving the typed path.

> 🔗 **Dependency added 2026-09-10 — booking completion is not only a WhatsApp-funnel problem.**
> The **website** is the other entry point into the same reservation, and it hands off to WhatsApp
> with no correlation at all: it creates the row with `customer_name='زبون واتساب'` /
> `customer_phone='عبر واتساب'`, throws away the reservation id it is holding, and opens
> `wa.me/{Client.whatsapp_number}` with a prose message. **16 real reservations on `rk` and `mr-h`
> are already in that state.** If "funnel correctness" means a customer can complete a booking, this
> path has to be corrected too — a customer who arrives from the website is inside the same funnel.
> Lifecycle, correlation and identity are designed in the companion plan; **that design is a
> prerequisite for calling Gate 1 closed, not a parallel track.**

**Gate 1:** a booking for an **evening** slot completed with zero typed characters except the
customer's name, verified against the stored `reservations.reservedAt` — **not the chat transcript**.
`get_available_slots` uses naive-local-wall-clock labelled UTC (`reservation_service.py:555-563`);
that is the bug class not to re-introduce.

### Phase 2 — Per-tenant WABA (D-B) — ❌ **ملغاة 2026-09-11 بقرار سلمان**

> **لا تنفَّذ.** سلمان: *"موضوع كل تينانت WABA ما بتزبط لأنه الناس بيهمها أرقامها تضل على
> واتساب. أكثر شي فيني خليه يعمل حسابو بزنس."* والسبب تقني وقاطع: أي رقم بيدخل على Cloud API
> بيخرج من تطبيق واتساب — فصاحب المحل بيخسر رسائلو على تلفونه.
>
> **البديل المصادق عليه:** رقم سنترال واحد للحجز والطلب · رقم صاحب المحل بيضل على واتسابو كزر
> تواصل · الهوية بتنحمل بنصّ الرسالة. التفاصيل والفجوات بـ
> `.claudedocs/plans/central-number-wiring-and-dashboard-notifications.md`.
>
> **WABA لكل vertical** ممكن تنُدرس لاحقاً — بس هي **أرقام منصّة جديدة لكل فئة، مش أرقام
> أصحاب المحلات**، فما بتحقق الرغبة يلي كانت دافعة للفكرة.
>
> **الأثر على الترتيب:** بإلغائها، **Phase 3 صارت البوابة الجاية** — لا شي قبلها.

<details><summary>النصّ الأصلي، محفوظ للسجل</summary>

Embedded Signup · per-tenant WABA/Phone Number ID/token on `Client` · tenant resolution from the
inbound `phone_number_id` · retire the deep-link workaround once it is no longer load-bearing.

> 🔗 **2026-09-10 — this phase is what makes the website handoff possible at all.** The handoff
> targets `Client.whatsapp_number`, but the inbound bot resolves a tenant by matching Meta's
> `display_phone_number` against **`Client.phone`** (`whatsapp_flow.py:756-762`). So today a
> handoff lands on a number **no bot is listening on** — it reaches a human inbox, and a correlation
> token would have nothing to correlate against. Per-tenant WABA closes that gap.

**Gate 2:** two tenants send and receive on their own numbers · a customer messaging tenant A never
sees tenant B's state · the deep-link path still works mid-migration.

</details>

### Phase 3 — Templates + `_extract_message` (G5, G8)

The companion plan's Phase B, unchanged.
**Hard dependency: Meta template approval — Salman, manual, days to weeks.**
**Gate 3:** an invite to a number outside the 24h window arrives · a template quick-reply
round-trips into the state machine.

### Phase 4 — Merchant actions (D-C)

Confirm / cancel buttons **and per-booking price**. Needs an explicit auth model: sender phone →
`User`/`Barber` scoped by `client.id`, every action through `log_security_event`. Needs G10 resolved
— a schema decision requiring its own approval.

### Phase 5 — AI intent layer (G7)

May run parallel to 3/4, **not before Gate 1** — otherwise AI papers over a broken funnel.

**Governing rule: the AI never returns an action. It returns a partially-filled draft of the existing
session's fields, using only ids the backend handed it.**

New `app/services/whatsapp_intent.py`, called from **exactly one place** —
`whatsapp_flow._step_idle` (line 409), *before* `whatsapp_reservation_flow.start()`. A pre-parser in
front of the machine, never a participant in it.

Five structural guarantees, not prompt instructions:
1. **Closed output space** — given the tenant's real service/barber ids, must return one or null;
   anything else is dropped by the membership check `_step_awaiting_service` already performs.
2. **Never touches availability** — may emit a date and a period word, **never a slot**.
3. **Never confirms** — `create_reservation` is reachable only from `_step_confirming` on a
   `button_reply` of `"confirm"`. **No AI path reaches it.** Assert as a test.
4. **Never influences tenant resolution** — not given `client_id`, not given a slug.
5. **Failure is a no-op** — no key, timeout, malformed JSON, low confidence → today's behaviour.

Do **not** copy `ai_chat.py`'s `_rate_store` — a per-gunicorn-worker dict, the same defect that
killed the old in-memory session store.

### Phase 6 — WhatsApp Flows *(deliberately last, possibly never)*

Entry condition: the Phase R spike says Flows can render dynamic data **without** a data-exchange
endpoint, **and** Gate 1 was measured insufficient.

**Kill criterion, written in advance: if the tap-only funnel from Phase 1 converts acceptably, Flows
is deferred indefinitely and that is a success, not a shortfall.**

Reasoning: the engine is already id-driven, so Flows replaces the *transport* of ids the machine
already consumes — the cheap part. The expensive, correct part (zero business logic, full reuse of
the website's services) is already built. A `data_exchange` Flow adds RSA key management, per-request
AES-GCM, a health check and a `flow_token` lifecycle to a codebase whose entire inbound surface is
one HMAC check.

---

## §4 — Risks

- **R1 — Session key.** `(phoneNumberId, customerPhone)` omits `clientId`; every phase that adds
  state makes a tenant switch destroy more. **Phase 2 fixes it; nothing stateful lands before it.**
- **R2 — Timezone.** Naive-local-wall-clock labelled UTC. Verify every date/slot change against the
  stored `reservedAt`.
- **R3 — Business-logic asymmetry.** `whatsapp_flow.py` contains `_estimate_price`; the reservation
  flow contains none. **Shared code for rendering and parsing only, never for domain decisions.**
- **R4 — No test suite.** `tests/` holds three fixtures; no pytest. The date-list builder, period
  splitter and intent validator are the first genuinely unit-testable pieces.
- **R5 — Shared number quality rating** — until Phase 2, one tenant's spam degrades delivery for all.

## §5 — Explicitly out of scope

No queue, Redis, Celery, outbox table or event bus. No Commerce catalog just to get images. No merge
of the two flow modules. No rewrite of the ~45 conversational call sites (replies inside an open
session, correct as free-form). No AI prose to customers, no AI tool-calling, no AI on the merchant
side in v1. No paging before research confirms a real tenant exceeds 10 rows — `rk` has 6 services.

## §6 — Open questions

**Q1.** Does a Flow render dynamic data without an endpoint? (decides Phase 6's cost)
**Q2.** Exact template name/language/variable order; URL-in-body vs URL button.
**Q3.** How is per-booking price modelled (G10) — a column, or `metadata`?
**Q4.** Embedded Signup: what must Alzabt store per tenant, and who owns the Meta app review?
**Q5.** Is the access token currently valid? Phase 0 answers this.
