# Phase 0 — Channel Proof · Evidence
**Date:** 2026-09-10 · **Tenant:** `barberlab-test` (RK explicitly excluded by Salman) · **Commits:** `7910d8a`, `d49ec06`

## Confirmed Findings

### C1 — A real inbound booking completed end-to-end through the bot
Read from production (`_db_target.resolve(direct=True)`), compared against a baseline snapshot
taken before the run (`scratchpad/barberlab-test.baseline.json`).

| table | before | after |
|---|---|---|
| `reservations` | 2 (both `cancelled`, Aug) | **3** |
| `customers` | 0 | **1** |
| `whatsapp_sessions` | 0 | 0 — see C3 |

```
id             0b803353-dd18-489e-a279-fcf348697679
customer_name  Houssam          customer_phone  96178727986
reserved_at    2026-09-10 12:00:00+00:00        duration_min 30
status         pending          barber Rami      service قص شعر
created_at     2026-09-10 05:31:29.935000+00:00
```
The reference shown in the chat (`0B803353`) equals `id[:8].upper()` — the same row, not a
similar one. The bot is the only path that reaches `create_reservation` from WhatsApp, so this
row is itself proof the inbound webhook was received and dispatched.

### C2 — Deploy verified by behaviour, not elapsed time
`index-OWYQJNkp.js → index-C4Y7Rx4i.js`, `GenericAdminDashboard-CDVift63.js → 4hXAF8Kc.js`,
and the new banner string present in the deployed chunk at +90s. `/health` `{"status":"ok","db":"ok"}`.
Webhook GET with a wrong verify token → 403; POST with no signature → 403.

### C3 — `whatsapp_sessions` is deleted on success; my predicted artifact was wrong
I stated before the run that a session row would appear and prove the webhook arrived. It does not.
`_step_confirming` calls `clear_session_fn` on a successful booking
(`whatsapp_reservation_flow.py:419`), and the repo's `delete()` removes the row. Zero rows is
therefore the *correct* outcome for a completed booking, not a failure. Recorded because the
prediction was wrong, not because the system was.

### C4 — R2 (timezone) confirmed on live data, not just read in code
`reserved_at` stored `12:00:00+00:00`. The customer picked **12:00 Beirut**, which is 09:00 UTC
(EEST, UTC+3). The offset is proven independently by the same row: `created_at 05:31:29 UTC`
against the chat's own `08:31` timestamp.

So Beirut wall-clock is being labelled UTC (`reservation_service.py:555-563`). It is *self-
consistent* today — generation, storage and `strftime` display all skip conversion — and becomes
wrong the moment anything genuinely converts or compares against a real UTC `now()`. This is the
bug class Phase 1's gate is written to guard against; it is now evidenced, not predicted.

### C5 — `WHATSAPP_CENTRAL_NUMBER` is configured on production
`GET /api/v1/public/reservations/whatsapp-link?client_slug=barberlab-test` →
`https://wa.me/96179022398?text=حجز barberlab-test`, `available: true`. Audited behaviourally;
no secret value was read.

## Side Findings

- **G1 reproduced structurally.** Rami works 10:00–20:00; a 30-minute service yields 20 slots and
  `slots[:10]` shows 10. Everything from 15:00 onward was invisible during this run. The customer
  chose 12:00, inside the visible window, so the cut was silent — which is exactly the complaint.
- **G2 exercised.** The date had to be typed; there is no picker.
- `barberlab-test` has `barber_services = 0`, and the booking still worked — the soft-filter
  fallback (`whatsapp_reservation_flow.py:204-217`) shows the full barber list when a service has
  no assignments.

## Unknowns

- **The Meta error code is not observed.** No Railway CLI and no `RAILWAY_*` token exist in this
  environment, so server logs cannot be read from here. The merchant alert for this booking went to
  `barberlab-test`'s owner number `+9613300771122`, which is not a real WhatsApp number, so a
  rejection is expected and its code would exercise the new capture path — unverified.
- **No `statuses[]` payload observed** (Step 7), and **no outbound test outside the 24-hour window**
  (Step 8). Both held at Salman's explicit instruction pending his reading of the logs.
- Therefore **Gate 0 remains OPEN**: 3 of its 5 conditions are closed.

---

## Update — real Railway output for booking `0B803353`

```
22:17:44Z  ⚠️  No client resolved for display_phone=96179022398 (session bound=False)
05:31:39Z  📵 WhatsApp delivery FAILED — wamid=wamid.HBgNOTYxMzMwMDc3MTEyMhUCABEYEkRCMTUwNDE0RjEwMDJBNzhGQgA=
           status=failed recipient=9613300771122 ts=1789018292
           meta_code=131026 title=Message undeliverable detail=Message Undeliverable.
```

### C6 — Backend deploy confirmed by behaviour
The `📵` line is `webhook.py::_log_statuses`, which did not exist before `d49ec06`. Its presence in
production output is the behavioural proof that the backend half shipped — the check I had said
was unavailable because there is no version endpoint.

### C7 — Gate 0 condition "one real statuses[] payload observed" is CLOSED
A genuine Meta receipt, parsed correctly, carrying the wamid and the numeric error code.

### C8 — Q5 answered: the access token is VALID
Meta issued a `wamid` for this message, which means the send was accepted. A dead token fails
synchronously with HTTP 401 / code 190 and never reaches a delivery receipt. **The access token is
not the cause of anything we have seen.**

### C9 — `131026` does NOT settle the 24-hour-window hypothesis
`131026` is "Message undeliverable" — `9613300771122` is not a WhatsApp user. The send was
business-initiated to a number that had never messaged this WABA, so under the window rule a
synchronous `131047` was possible; instead Meta returned 200 and failed asynchronously on the
recipient. Two explanations remain and this evidence cannot separate them:

1. Meta validates the recipient before enforcing the window, so `131026` pre-empts `131047`.
2. The window is not what blocked the earlier sends at all.

**Step 8 — one free-form send to a real WhatsApp number that has not messaged the business in 24
hours — is the only test that separates them.** It is now the single open question in Gate 0.

### C10 — Production was discarding every INFO log *(fixed, `da91be2`)*
In the output above, ERROR (`📵`) and WARNING (`⚠️`) appear; the `✅ accepted by Meta (wamid=…)`
line for that same message and any `📬 delivered` receipt do not — although the grep pattern
`wamid=` would have matched the first. There is no `logging.basicConfig` anywhere in `app/`, so the
root logger sat at WARNING.

Consequence: **only failures were observable.** This also made Gate 0's own statuses condition
unreachable in the success direction, since a `delivered` receipt is logged at INFO. Fixed in
`app/main.py`; level overridable via `LOG_LEVEL`; noisy third-party loggers pinned to WARNING.

## Side Findings (added)

- **G3 observed live, and it is worse than "no tenant".** At 22:17:44Z an inbound message resolved
  to no client. `whatsapp_flow.py:311-316` logs a warning and `return`s — **the customer receives no
  reply at all.** Anyone who messages the shared business number without a tenant deep link
  (a saved contact, a forwarded number, an old thread) gets silence. This is the shared-number
  anomaly D-B is meant to remove, and it is a live customer-experience hole today, not only an
  architectural one.

## Gate 0 — status after this update

| Condition | State |
|---|---|
| No unconditional `✅` remains | ✅ |
| A rejection logs Meta's error code and body | ✅ evidenced (`meta_code=131026`) |
| One real inbound booking completes | ✅ `0B803353` |
| One real `statuses[]` payload observed | ✅ |
| **24-hour-window hypothesis confirmed or refuted** | ⬜ **the only item left — Step 8** |

---

## Decision — how RC1 gets closed without Railway access (Salman, 2026-09-10)

### The tooling limit, stated once
This environment has no Railway CLI, no `~/.railway`, no `~/.config/railway`, no `RAILWAY_*` variable
and no token in either `railway.json` (both are build config only). **Server logs are readable by
Salman alone.** Four exchanges were spent rediscovering this; it is recorded here so a future session
does not spend a fifth.

### Rejected, deliberately
- **A Railway read token** — refused: it grows the secret surface to fix an *agent's* blindness, not
  a product defect.
- **Persisting each send outcome to the DB** — refused *for now*: it is schema-adjacent, sits close to
  the outbox table §5 of the plan explicitly excludes, and Phase A's scope is deliberately narrow
  (logging + `wamid` + Meta error body, without letting a notification fail a booking).

Salman's framing, adopted: the observability gap is **an independent tooling problem**, not a reason
to reshape the WhatsApp architecture. A category error on my part — I proposed a schema-adjacent
change to solve my own blindness — and it is named here rather than quietly dropped.

### The approved experiment
**One invite, from the Team tab of `barberlab-test`, to a real WhatsApp number Salman owns that has
never messaged the business number.** No code, no DB, no Railway, no secrets, no Phase R, no G3,
no RK, no Jafar.

The Team banner is a faithful projection of the same value the gate turns on:

```
invite_sent  ←  send_staff_setup_link  ←  _report(result)  ←  result.ok  ←  HTTP 200 from Meta
```

`invite_sent: true` therefore means Meta returned 200 and issued a `wamid` — **exactly the plan's
definition of `accepted`**.

**The banner proves the accepted path only, never delivery.** `delivered` is a separate
`statuses[]` callback and cannot be read from a screen. This distinction is the plan's own and is
not to be blurred.

Two possibilities are already ruled out by C8/C9 above: `190` (the token issued a wamid today) and
`131026` (phone B is a real WhatsApp number).

### Interpretation rules, agreed in advance

| Banner | Verdict |
|---|---|
| «أُرسل طلب التفعيل» — accepted, wamid issued | **RC1 REFUTED, conclusively.** The 24-hour window did not block a business-initiated free-form message to a cold number. Gate 0 closes on RC1, and the real cause of the 2026-09-09 non-delivery becomes a **new investigation** rather than a standing assumption. |
| «ميتا رفضت الإرسال» | **RC1 stays a STRONG HYPOTHESIS — not CONFIRMED.** Rejection at send time with 190 and 131026 excluded makes the window the nearest explanation, but the rejection family also contains rate limits and phone-number quality. The exact `meta_code` is recorded as a **missing piece of evidence**. No cause is invented. |

Recommended preset for the temporary account: **`reservations_manager`** — the narrowest of the
presets whose `requires_barber` is `False` (`permissions.py`), so no barber link is needed and no
unnecessary privilege is granted. Deactivate it afterwards; restoration is verified from the DB
(`users` 2 → 3 → 2).

---

## Side Findings (added later the same day)

### S1 — Phone login is broken for every account stored in the mandated format
`user_repo.find_user_by_phone` normalises the **typed** input (`normalize_local_phone` strips `961`)
and then compares it **literally** against the stored column. `.claude/rules/phone-numbers.md`
mandates storing **with** the country code, so the two can never meet:

```
typed 96176985477 → normalised 76985477 → compared to stored "96176985477" → no match
```

Measured across all rows with a phone: every `rk` account fails this — `salman.houssam@gmail.com`,
`jaafar@rk.salmansaas.com`, and `rkbarber@dev.invalid`, **حسين, the real owner of a live tenant.**
Every other tenant stores the local form and matches. Nobody has reported it because email login
works.

`.claude/rules/phone-numbers.md` asserts the opposite — *"Live proof: `rkbarber@dev.invalid` is
stored with `961` and logs in successfully (`last_login_at`)"*. That login was by **email**; the rule
conflated the two paths. The rule needs correcting, not just the code.

Storing the local form is not the fix either: `78727986` is already on `cafe` and twice on `smar`,
and `find_first` has no ordering — a phone login could resolve to the wrong tenant.

Planned in `.claudedocs/plans/tenant-identity-and-seeding.md` §2, Phase B. **Not fixed** — out of
Phase 0's scope.

### S2 — The login form burns the lockout budget at 2×
Salman was locked out of `barberlab-test` at 13:58 after roughly three attempts. The audit log shows
each attempt producing **two** failure rows — `admin_login_failed` *and* `client_login_failed` — as
the form tries both endpoints with the same identifier. `MAX_FAILURES = 5` in a 15-minute window, so
the real budget is two and a half attempts, not five. Recorded, not fixed.

### S3 — Production drifted mid-session
`smar.phone` and `barberlab-test.phone` both changed between two reads (Salman, editing directly).
`barberlab-test.phone` is now `96178727986`, so its merchant alert resolves to a real number instead
of the `+9613300771122` that returned `131026`. Noted because the earlier snapshot in this file is
no longer the current state of those two columns.

---

# GATE 0 — CLOSED 2026-09-11 · RC1 **CONFIRMED**

## The decisive observation

```
✅ WhatsApp message accepted by Meta (wamid=wamid.HBgLOTYxNzA5ODUyMTIVAgARGBIwMDY0Q0M4MDVDNTIyRkQwM0EA)
✅ Staff setup link (hussein) … 96170985212 — wamid=<same>
📵 WhatsApp delivery FAILED — wamid=<same> status=failed recipient=96170985212 ts=1789117196
   meta_code=131047 title=Re-engagement message
   detail=Message failed to send because more than 24 hours have passed since the customer
          last replied to this number.
```

**The 24-hour customer-service window is confirmed as the cause.** Not inferred — Meta's own code
and text, on a real send, to a real working WhatsApp number that had never messaged the business.

### Why this test is valid where every earlier one was not

| Condition | Evidence |
|---|---|
| Recipient had **never** messaged the business | `whatsapp_sessions` for `96170985212` = **0** before the send |
| Recipient is a **real, working** WhatsApp number | Confirmed by Salman — it is his father's number, in daily use. `131026` is therefore excluded |
| The send was **business-initiated free-form** | `send_staff_setup_link` → `send_text`, the exact path that failed for جعفر |
| The access token is valid | Meta issued a `wamid`; a dead token fails synchronously with 401/190 |

Every previous success (Tunisia, Yemen, Salman's own number) was a **reply inside an open window** —
the customer had messaged first. Those could never test the hypothesis, and were not treated as if
they had.

### The surprise worth recording

**Meta accepted the message (HTTP 200 + wamid) and only rejected it asynchronously.** The window
rejection did **not** arrive as a synchronous 400. So a system that checks only the send response
would have reported success — which is exactly what this codebase did before 2026-09-10, and exactly
why the `statuses[]` handling added in `d49ec06` was made part of Phase 0 rather than deferred.

**Without the log-only statuses[] change, Gate 0 could not have been closed at all.**

### Correlation proved end to end
The same `wamid` appears in all three lines — outbound acceptance, the helper's own report, and the
delivery receipt. That linkage did not exist before `7910d8a`.

## Self-inflicted defect found in the same log *(fixed)*

```
✅ Staff setup link (hussein) delivered to 96170985212
```

`_report()` said **"delivered"** for a message that was merely **accepted** and then failed. The
helper written on 2026-09-10 to remove "silent success" reintroduced it one level up, in its own
wording. Corrected to `accepted by Meta for …` / `REJECTED for …`. Delivery is knowable only from
the `statuses[]` callback, never from the send response.

## What this unlocks, and what it costs

`131047` applies to **every business-initiated free-form message** — staff invites, merchant alerts,
and any customer notification sent outside an open window. The only remedy Meta offers is an
**approved message template**.

**Phase 3 (Templates) is therefore no longer optional or deferrable** — it is the gating path for
every outbound notification in this product. It carries a hard external dependency: Meta template
approval, manual, days to weeks.

### Gate 0 — final

| Condition | |
|---|---|
| No unconditional `✅` remains | ✅ |
| A rejection logs Meta's error code and body | ✅ `131026`, then `131047` |
| One real inbound booking completes | ✅ `0B803353` |
| One real `statuses[]` payload observed | ✅ failure **and** success (`sent`/`delivered`/`read`) |
| **24-hour-window hypothesis confirmed or refuted** | ✅ **CONFIRMED — `131047`** |

**PHASE 0 — CHANNEL PROOF: COMPLETE.**
