# WhatsApp Outbound Reliability + Template Support Plan

## Status

**PLANNING ONLY.** No code changed, no DB touched, no Meta change, no message sent, no commit, no
push. Written 2026-09-09.

Trigger: a staff invite reported as sent (green banner in the Team tab) never arrived on the
recipient's phone, and a merchant alert for a real reservation (`17:48:55`, `rk`) likewise never
arrived — while the reservation itself was recorded correctly.

---

## Scope

Two separate problems that share one file, kept apart on purpose:

- **A — Outbound result reliability.** What the platform is entitled to claim after calling Meta.
- **B — Template support.** Being able to start a conversation at all.

A is a correctness fix with no external dependency. B cannot ship without a manual Meta action.
A must land and be verified first, because until it does we cannot tell whether B worked.

---

## Current Architecture

### The client — `app/services/whatsapp_service.py` (100 lines)

| Element | Line | Reality |
|---|---|---|
| `WhatsAppService.__init__` | 12-18 | Reads `settings.WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN`; logs a warning when absent but **constructs anyway** |
| `_send_request(data)` | 20-41 | POSTs to `graph.facebook.com/v18.0/{phone_number_id}/messages` |
| `send_text(to, text)` | 43-50 | `{"type": "text", "text": {"body": …}}` |
| `send_interactive_buttons` | 52-64 | interactive buttons |
| `send_list_message` | 66-80 | interactive list |
| `build_central_booking_link(slug)` | 82 | builds a `wa.me` deep link — no API call |

**`_send_request` never raises.** Three exits, all silent:

```
missing credentials  -> logs error, returns None          (line 21-23)
non-200 response     -> logs error, returns the response  (line 34-38)
any exception        -> logs error, returns None          (line 39-41)
```

It also **never reads the response body**, so the `wamid` (Meta's message id) that a 200 carries is
discarded at the only point it is available.

### Delivery status — not processed

`app/api/v1/webhook.py:69-72`:

```python
# Meta sends status updates (delivered, read) alongside messages —
# skip them early to avoid unnecessary processing.
if not _has_messages(payload):
    return {"status": "ok"}
```

**Delivery, read and failure callbacks are received and deliberately discarded.** Nothing anywhere
records or reacts to them. There is therefore **no evidence of delivery available in the system
today** — a fact that constrains every claim Phase A is allowed to make.

### Template capability — none

`grep -n "template" app/services/whatsapp_service.py` → **zero matches.** No `type: "template"`
payload, no template name, language, components or namespace anywhere in the codebase.

---

## Findings

### F1 — Two classes of outbound send, and only one is at risk

Inventory of every call site (`grep -rn "send_text(\|send_interactive_buttons(\|send_list_message("`):

| Class | Files | Sites | Session window | Risk |
|---|---|---|---|---|
| **Conversational replies** | `whatsapp_flow.py`, `whatsapp_reservation_flow.py` | **~45** | **Open** — each is a reply to a message the user just sent | ✅ free-form is correct and must stay |
| **Business-initiated** | `whatsapp_notifications.py`, `public_service.py:633` | **8** | **Closed unless the recipient happened to message us in the last 24h** | 🔴 the failing ones |

This is the load-bearing distinction of the whole plan: **~45 sites need no change at all.** Only
the 8 business-initiated ones are candidates for templates, and only they can silently fail.

### F2 — `send_new_reservation_to_merchant` reports success it cannot know

`app/services/whatsapp_notifications.py:291`:

```python
await wa.send_text(to=recipient_phone, text="\n".join(lines))
logger.info("✅ ...")          # unconditional
except Exception as exc:      # _send_request never raises, so this never fires
```

The `✅` is logged whether Meta accepted, rejected, or was never called. Same shape for
`send_booking_confirmation` (:56), `send_booking_cancellation` (:82),
`send_reservation_confirmation` (:119), `send_reservation_cancellation` (:145),
`send_reservation_reschedule` (:175), and `public_service.py:633`.

**`send_staff_setup_link` (:214) is the one exception** — corrected 2026-09-09 to inspect the
result and return a bool. This plan generalises that correction; it does not invent it.

### F3 — Even the corrected path overstates the outcome

`send_staff_setup_link` returns `True` on HTTP 200, and `TeamTab.jsx` renders that as
**"تم إرسال رابط التفعيل … على الواتساب"**. But a 200 from Meta means **accepted for delivery**,
not delivered. The green banner Salman saw was true about the API call and false about his phone.
**This wording is a defect introduced by this project, not by Meta.**

### F4 — No inbound WhatsApp traffic since 2026-09-05

`whatsapp_sessions` holds exactly **one** row: `96171325620`, last updated `2026-09-05 13:29`. No
session exists for `96178727986` (the invite recipient) or `96170764479` (جعفر).

### F5 — The reservation at 17:48:55 came from the website, not WhatsApp

`reservations.notes` = `"Booked via WhatsApp by houssam salman"`, but that string is written by the
**website** flow (`useReservationBooking.js:269-294`), which creates the reservation server-side and
then opens `https://wa.me/<merchant>?text=…` for the user to press Send themselves. Combined with F4
(no new session), **inbound WhatsApp booking is unproven, and this row is not evidence of it.**

---

## Root Causes

**RC1 — The 24-hour session window.** WhatsApp Cloud API permits free-form (`type: "text"`) messages
only to a user who messaged the business within 24 hours. Every business-initiated notification is
free-form. F4 shows the window was closed for both failing recipients.
⚠️ **This is the most probable cause, consistent with all observed evidence, but it is INFERRED.**
The response body was not captured (F1/`_send_request` discards it), so Meta's own error code —
`131047` would confirm it — has not been observed. Recorded as the leading hypothesis, not a
verified fact. **Phase A is what makes it verifiable.**

**RC2 — Result handling asserts more than the response supports.** Two layers: `_send_request`
returns `None`/response with no distinction the callers use, and the callers log `✅`
unconditionally. So a failure is indistinguishable from a success in the logs — which is why RC1
went undetected for two days.

---

## Phase A — Outbound Reliability

### Objective

Make the truth of an outbound send observable. No behaviour change other than what is logged and
returned. **Explicitly NOT a fix for delivery** — it is what makes delivery failures visible.

### Files / Areas

| File | Change |
|---|---|
| `app/services/whatsapp_service.py` | `_send_request` returns a small structured result instead of `response`/`None`; capture `wamid` and the error body |
| `app/services/whatsapp_notifications.py` | 7 helpers stop logging unconditional `✅`; log the real outcome and return it |
| `app/services/public_service.py:633` | same treatment for the one send outside the notifications module |
| `app/api/v1/admin/team.py` | already consumes a bool — adjust only if the result shape changes |
| `frontend/.../TeamTab.jsx` | banner wording: "أُرسل الطلب" not "تم الإرسال" |

**Deliberately NOT touched:** the ~45 conversational call sites. They are replies inside an open
session, their failures are visible to the user immediately, and changing them widens the blast
radius for no gain.

### A1 — How the outcome is determined

From the HTTP response only: presence of a response, its status code, and — on 200 — the `wamid`
in `messages[0].id`. Nothing else is available today.

### A2 — The vocabulary (and its honest ceiling)

| Term | Meaning | Available now? |
|---|---|---|
| `not_configured` | credentials absent; no call attempted | ✅ |
| `accepted` | HTTP 200 **and** a `wamid` returned | ✅ |
| `rejected` | non-200; carries Meta's error code and body | ✅ |
| `error` | exception or no response (network/timeout) | ✅ |
| `delivered` | Meta's delivery callback confirmed it | ❌ **NOT AVAILABLE** — webhook discards statuses |

**`delivered` must not be claimed by Phase A.** The highest truthful claim is `accepted`.
Delivery tracking would require processing the status callbacks the webhook currently drops — a
separate, larger change, explicitly out of scope here.

### A3 — Logging

One line per send, carrying: outcome from A2, the recipient (already logged today), the purpose, and
on `rejected` **Meta's error code and message body** — the single piece of evidence that would have
turned RC1 from a hypothesis into a fact on day one. On `accepted`, the `wamid`, so a message can be
traced if delivery tracking is ever added.

`✅` is reserved for `accepted` and must never appear for `not_configured` or `rejected`.

### A4 — Smallest safe scope

**Client + notification helpers.** The client must change because the outcome is only knowable
there; the helpers must change because they are where the false `✅` is written. Route callers
change only where they already read a result (`team.py`). Conversational flows: untouched.

### A5 — Preserving current behaviour

The existing contract — **"never raises; a failed notification must never roll back a real
booking"** — is preserved exactly. `_fire_and_forget` in `reservation_service.py:91-95` stays.
Helpers keep swallowing exceptions; they change only what they *report*. A caller that ignores the
return value behaves identically to today.

### A6 — Tests

| # | Case | Expected |
|---|---|---|
| 1 | Credentials absent | `not_configured`; no HTTP call; no `✅` |
| 2 | Meta returns 200 + `wamid` | `accepted`; `wamid` logged |
| 3 | Meta returns 4xx | `rejected` + error code + body logged |
| 4 | Network exception | `error`; caller unaffected |
| 5 | Malformed 200 (no `messages[]`) | `accepted` **without** a `wamid`, or `error` — **decide, do not guess** (Open Question Q1) |
| 6 | No recipient phone | skipped before any call; warning logged |
| 7 | Owner phone == staff phone | one send (dedup already exists, `reservation_service.py:131-133`) |
| 8 | Reservation created + send fails | reservation still returned successfully |
| 9 | Recipients resolved cross-tenant | impossible — `find_barber(clientId, …)` is tenant-scoped |

Cases 1-6 are unit-testable against a stubbed client with **no real send**.

### A7 — Production verification

After deploy, one real staff invite from the Team tab to **a number that has messaged the business
number within the last 24 hours** (so the window is open and the variable under test is the
reporting, not the window). Expected: `accepted` + a `wamid` in the logs, and the message actually
arrives. Then one send to a number outside the window: expected `rejected` with Meta's error code —
**which is what would confirm or refute RC1.**

---

## Verification Gate A

Phase B does not begin until **all** hold:

1. All seven notification helpers report a real outcome; no unconditional `✅` remains.
2. A rejection logs Meta's error code and body.
3. A `wamid` is captured on success.
4. A failed notification still does not fail its reservation or account creation.
5. **RC1 is confirmed or refuted by an observed Meta error code** — the whole point of Phase A.
6. The UI no longer claims delivery.

---

## Phase B — Template Support

### Objective

Let the platform start a conversation, which free-form text cannot do outside the window.

### B1 — Payload

```
{"messaging_product": "whatsapp", "to": <e164>, "type": "template",
 "template": {"name": <name>, "language": {"code": <lang>},
              "components": [{"type": "body", "parameters": [{"type": "text", "text": …}]}]}}
```

### B2 — Template name — **UNDECIDED**

Working name `staff_invite`. Must match the approved Meta template exactly. **Not settled until the
template exists** (Open Question Q2).

### B3 — Language code

`ar` for the Arabic body currently sent. A template is approved **per language**; adding English
later is a second Meta submission, not a code change.

### B4 — Parameters

`send_staff_setup_link` needs three: `staff_name`, `client_name`, `setup_url`.
⚠️ **A URL inside a template body is a Meta policy question, not a code question.** A button
component of type `URL` with a dynamic suffix is the usual shape. **This must be settled at template
design time** (Q3) — designing the code around the wrong shape would waste the approval cycle.

### B5 — Distinguishing text from template

At the **call site**, not inside the client. Whether a message is business-initiated is a property
of the use case, known statically — not something to detect at runtime.

### B6 — Abstraction

Add `send_template(to, name, language, parameters)` beside `send_text`. **Do not** make `send_text`
fall back to a template on failure: that hides which path ran and doubles the sends. Both go through
the same `_send_request`, so Phase A's result handling applies unchanged.

### B7 — `staff_invite` — the only use case that must change

Business-initiated by definition: the invitee has no reason to have messaged us. **Template-only.**
Recommended shape: attempt the template; on `rejected`, surface the failure (Phase A already does)
and keep offering the manual link, which works today.

### B8 — Merchant reservation notification

Also business-initiated. **But it is sent to the shop owner's own number**, and a shop that uses the
platform plausibly messages it. Needs its own template eventually; **lower priority than B7** and
decided after Phase A shows how often it is actually rejected. **Do not template it speculatively.**

### B9 — Customer notifications

`send_reservation_confirmation`/`cancellation`/`reschedule` and `public_service.py:633`. Sent after a
customer action, so the window is **often** open — F5's booking came from the website, where it may
not be. **Data first:** Phase A's rejection counts decide this. **No template proposed now.**

### B10 — Meta dependency

| Task | Owner |
|---|---|
| Create the `staff_invite` template in Meta Business Manager | **META MANUAL — Salman** |
| Choose the exact name, language, body text, variable order | **META MANUAL — Salman** |
| Decide URL-in-body vs URL button (B4/Q3) | **META MANUAL — Salman** |
| Submit and obtain approval | **META MANUAL — Salman** |
| Confirm whether the WABA needs a namespace on this API version | **META MANUAL — Salman** |
| `send_template()` in the client | CODE |
| Switch `send_staff_setup_link` to the template | CODE |
| Map parameters to the approved variable order | CODE — **blocked until the template exists** |

**Phase B cannot start meaningfully before the template is approved.** Writing `send_template()`
against a guessed shape is exactly the kind of speculative work this plan avoids.

---

## Verification Gate B

1. A real invite to a number **outside** the 24h window arrives.
2. The template send reports `accepted` with a `wamid`.
3. A wrong parameter count is rejected by Meta and reported as `rejected`, not `✅`.
4. Free-form conversational replies are unchanged (~45 sites still work).
5. The manual-link fallback still works when the template is rejected.

---

## Production Verification Plan

Real sends only after Gate A, and only to **Salman's own number** for Phase A's in-window case.
**No production employee is used as a test subject** — جعفر specifically is excluded: he is a real
person whose invite has already been disturbed twice.

No test may consume a live setup token belonging to someone who has not yet used it.

---

## Rollback / Safety

Phase A is behaviour-preserving apart from log text and return values; rollback is a revert.
Phase B is additive — `send_template` is a new method and `send_text` is untouched, so reverting the
one call site in `send_staff_setup_link` restores today's behaviour exactly.
No schema change, no data migration, no destructive operation in either phase.

---

## Explicitly Out of Scope

- Delivery-status webhook processing (`webhook.py:69-72`) — the change that would make `delivered`
  claimable. Larger, and not required to fix the reported problem.
- Any queue, Celery, Redis, message table, notification service or event bus. The existing
  `_fire_and_forget` + "never raises" contract is adequate; the investigation found no evidence
  otherwise.
- Rewriting the ~45 conversational call sites.
- Inbound WhatsApp booking (F5) — unproven, separate question.
- The apex domain serving a stale build — a real but unrelated deployment defect.

---

## Open Questions

**Q1.** A 200 with no parseable `messages[0].id` — `accepted` or `error`? Needs one observed
response to answer honestly.
**Q2.** Exact template name.
**Q3.** URL in the body vs a URL button component (B4).
**Q4.** Does B8 (merchant alert) need a template at all? Answered by Phase A's rejection counts.
**Q5.** Is the WhatsApp access token itself still valid? F4 shows no successful outbound since
09-05, and an expired token would also produce silent failure. **Phase A distinguishes this from
RC1** — a 401 means the token, a 131047 means the window.

---

## Decisions Required Before Implementation

| # | Decision | Blocks |
|---|---|---|
| D1 | Approve Phase A as scoped (client + 7 helpers + 1 service + banner wording) | Phase A |
| D2 | Confirm `delivered` stays unclaimable until status webhooks are processed | Phase A |
| D3 | Create and approve the Meta template, and answer Q2/Q3 | Phase B |
| D4 | Whether B8/B9 get templates, after Phase A's data | Phase B scope |
| D5 | Which number is used for the in-window production test | Gate A |
