# Phase B, Stage 1 — WhatsApp Infrastructure (Central Platform WABA)

Implements Phase B / Stage 1 of `.claude/plans/we-moved-on-new-hazy-barto.md`'s Phase B
Architecture Addendum, approved by Salman 2026-08-24 ("SYSTEM ARCHITECTURE APPROVED - EXECUTE
PHASE B (STAGE 1: CENTRAL WABA)"). Scope was explicit: tenant-resolution-from-message-body +
wa.me deep-link generator only. No credentials touched (global env vars used as-is, no
`SECRET_ENCRYPTION_KEY`, no per-tenant `ClientService.config` — Stage 2, deferred). No Phase C
Reservation conversation branch built.

## What changed

### 1. Tenant resolution from message body — `app/services/whatsapp_flow.py`

`_resolve_client()` rewritten with a real, ordered resolution chain (was previously a single
`display_phone_number → Client.phone` match with a blind `return clients[0]` fallback for
anything unmatched):

1. **Existing session already bound to a client** (mid-conversation) → reuse it directly by
   `client_id`, no re-parsing. Re-fetched by id (not cached) so a status change mid-conversation
   is picked up.
2. **`display_phone_number → Client.phone`, only when it identifies exactly one Client** — Stage
   2 prep: kept unmodified in behavior, now correctly requires a unique match rather than
   accepting any match count.
3. **Otherwise (0 or >1 matches — the shared central number, or no dedicated number configured)**
   → new `_resolve_client_from_text()`: tokenizes the inbound message body and matches a
   `Client.slug` token against it.

The old `return clients[0] if clients else None` fallback was **removed**, not left in parallel —
it was a real single-tenant-dev-environment placeholder (confirmed: it always "succeeded" first,
which would have made the new message-text path unreachable in practice). Documented inline in
the function's own docstring.

A real, pre-existing multi-tenant hazard this exposed: **two live `Client` rows already normalize
to the same phone digits** (`sneakers-lb` and `bohussein-redirecttest-*` both → `96170000000`;
`cafe` and `smar` both → `96178727986`; `sneakers-beirut` and `bohussein-test-*` both →
`96170123456` — confirmed via a real DB read, see Verification). Under the old code, whichever
came first in `find_many()`'s return order silently won. The new `len(matches) == 1` check turns
this into "fall through to text resolution" instead of a silent wrong-tenant match — a real
side-effect fix, not the primary goal of this phase, noted here rather than silently absorbed.

### 2. Session creation deferred until a tenant is actually known

Real bug found by this phase's own verification script (Step 6, below), fixed in the same pass:
`_get_session()` unconditionally created and stored a `ConversationSession` in the in-memory
`_sessions` dict on first lookup, even when tenant resolution then failed — meaning an
unresolvable message (garbage text, no slug, no dedicated-number match) still left a phantom
empty session sitting in the store. Added `_peek_session()` (non-vivifying lookup — returns an
existing session or `None`, never creates one) and restructured `_dispatch()` to peek first,
resolve the tenant, and only call the vivifying `_get_session()` once a real `Client` is known.
Functionally harmless either way (an empty session's `client_id` is falsy, so it would have
re-attempted resolution on the next message regardless), but a real resource-accumulation wart
under a shared central number worth closing rather than leaving.

### 3. wa.me deep-link generator — `app/services/whatsapp_service.py`

New module-level `build_central_booking_link(client_slug: str) -> Optional[str]`:
`https://wa.me/{WHATSAPP_CENTRAL_NUMBER}?text=حجز {slug}` (URL-encoded), or `None` if
`WHATSAPP_CENTRAL_NUMBER` isn't configured. Checked against Touchpoint 1
(`useReservationBooking.js`'s existing `wa.me` link, Study 8) before building a new mechanism —
confirmed these are genuinely different use cases, not a duplicate to reuse: Touchpoint 1 messages
the **tenant's own number** to notify the shop of an already-created reservation (one-way,
no bot); this one starts a conversation with the **shared platform bot** number. Documented inline
in the new function's own docstring.

### 4. New config value — `app/core/config.py`, `.env.example`

`WHATSAPP_CENTRAL_NUMBER: Optional[str]` — the shared bot's own dialable E.164 number. **Not a
credential** (it's the number shown in every customer's chat header — public by nature, same
class of value as a tenant's existing `config.whatsapp_number`), distinct from
`WHATSAPP_PHONE_NUMBER_ID` (Meta's internal API id, never dialable). Not set in this dev
environment — the new `/whatsapp-link` endpoint correctly returns `available: false` until it is
(see Verification). No `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`/any credential value was
read, printed, or modified.

### 5. New public endpoint — `app/api/v1/public/reservations.py`

`GET /api/v1/public/reservations/whatsapp-link` — `require_service("reservations")` gated, same
pattern as every sibling route in this file. Returns
`{"success": true, "data": {"url": <link-or-null>, "available": <bool>}}`. Registered **before**
`/{reservation_id}` deliberately — this file's own existing `/catalog-services` comment already
documents the Starlette route-registration-order hazard; the same rule applied here and confirmed
live (see Verification).

## What was NOT changed (per explicit constraint)

- `WhatsAppService` — zero code change. Still called with zero args at all 4 real sites, still
  sends via the global `WHATSAPP_PHONE_NUMBER_ID`/`WHATSAPP_ACCESS_TOKEN` env vars.
- No `SECRET_ENCRYPTION_KEY`, no `ClientService.config.whatsapp`, no per-tenant credential
  storage — Stage 2, explicitly deferred.
- No Phase C conversation branch (service → barber → slot → `create_reservation()`) — the
  resolved `client` from this phase's new logic still flows into the **existing** Booking-engine
  state machine (`_step_idle` → property list), unchanged. A resolved tenant is infrastructure;
  what the bot does with it next is Phase C's job, not this one's.
- No real Meta credentials were read, logged, or persisted at any point in this phase's work.

## Verification (real execution, not code-inspection-only)

### A. Real DB read — confirmed the phone-collision hazard named above
```
$ python3 -c "... prisma_client.client.find_many() ..."
sneakers-lb            | +96170000000
bohussein-redirecttest-1786113608 | 96170000000     ← same normalized digits
cafe                    | +96178727986
smar                    | 96178727986                ← same normalized digits
sneakers-beirut         | +96170123456
bohussein-test-1786114296 | 96170123456              ← same normalized digits
rk                      | 96176985477                 (unique)
mr-h                    | +9613300778899              (unique)
```

### B. Standalone verification script — `/tmp/.../scratchpad/phase_b_stage1_verify.py`
Ran against the real DB (`rk`, `mr-h` — real tenants), with `WHATSAPP_CENTRAL_NUMBER` set only in
the script's own process env (never written to the real `.env`). All 7 real assertions passed on
the second run (the first run caught the phantom-session bug above, fixed, re-run clean):

```
Precondition: fake central number 96199999999 matches ZERO real Client.phone rows — confirmed
Step 1: build_central_booking_link('rk')/('mr-h') → real https://wa.me/... URLs, correct slug embedded
Step 2: _resolve_client_from_text() on the decoded pre-filled text → resolves 'rk' and 'mr-h' correctly
Step 3: full handle_incoming_message() pipeline, customer_a via rk's link → session bound to 'rk', state=IDLE
Step 4: customer_a's 2nd message, no slug in text → session STAYS bound to 'rk' (session-reuse path proven)
Step 5: customer_b (different phone) via mr-h's link → resolves independently to 'mr-h', customer_a's session untouched (no cross-tenant contamination)
Step 6: customer_c, garbage text, brand-new session → resolves to NO client, NO session created at all (phantom-session bug fix proven)
Step 7: rk's own real (unique) phone as display_phone_number, generic text "hi" → resolves via the DEDICATED-NUMBER path with zero code change (Stage 2 prep proven, not just claimed)

✅ ALL ASSERTIONS PASSED
```

### C. Real HTTP calls against the live dev server (not just the isolated script)
Backend restarted (`uvicorn app.main:app --host 0.0.0.0 --port 8000`, no `--reload` in this
environment, so a restart was required to load the new code — the same LAN-testing dev server
used earlier this project) to prove the actual wired routes, not just the importable functions:

```
$ curl .../reservations/whatsapp-link?client_slug=rk  -H "X-Tenant-Slug: rk"
{"success":true,"data":{"url":null,"available":false}}      ← correct: WHATSAPP_CENTRAL_NUMBER unset in this env

$ curl .../reservations/catalog-services -H "X-Tenant-Slug: rk"   → 200 (sibling route unaffected)
$ curl .../reservations/barbers          -H "X-Tenant-Slug: rk"   → 200 (sibling route unaffected, no route-order regression)

$ curl -X POST .../webhook/whatsapp  -d '{"entry":[...no messages...]}'
{"status":"ok"}                                               ← webhook route live, early-return path intact

$ curl -X POST .../webhook/whatsapp  -d '{"entry":[...{"from":"961700000199","type":"text","text":{"body":"حجز rk"}}...]}'
{"status":"received"}
  → server log confirms real dispatch reached _step_idle()'s send attempt for the resolved
    tenant ("⚠️ WhatsApp credentials missing. Messages will not be sent." / "❌ Missing WhatsApp
    credentials. Cannot send message.") — proof the real HTTP path (not just the in-process
    script) resolved 'rk' from the message body and routed into the existing state machine.
    No real Meta call occurred (credentials genuinely unset in this dev env) — safe by
    construction, not by restraint.
```

### D. Compile/syntax
`python3 -m py_compile` clean on all 4 touched `.py` files.

## Unknowns / not verified

- **No real WABA sandbox number exists in this environment** — every check above proves the
  routing/resolution logic against real DB data and a real running server, but never a real
  inbound Meta webhook call from an actual WhatsApp client tapping a real deep link. That remains
  a real Unknown until Stage 1 goes live with a real `WHATSAPP_CENTRAL_NUMBER` +
  `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` — flagged here rather than silently assumed
  covered by the simulated payloads above (Investigation Protocol's Runtime-Before-Assumption
  discipline).
- **Frontend consumption of the new `/whatsapp-link` endpoint was not built** — the task scope
  was "expose it cleanly for the frontend to consume," which this phase satisfies on the backend
  side only. No public-page button/QR code was added. Left for whichever phase actually surfaces
  the WhatsApp entry point in the UI (not named in the current plan's Phase C-F breakdown —
  worth a small explicit decision next time the frontend side of Stage 1 is picked up).
- **Session-TTL behavior for a returning customer across a lapsed 30-min window** was not
  separately re-verified here — this phase didn't change `SESSION_TTL`/`is_expired`, and the
  Addendum's own v1 answer (re-parse tenant identity fresh, no cross-session memory) was already
  a design decision, not a new claim needing its own proof.

## Cleanup

No test data was created in the real `Reservation`/`Booking`/`Customer` tables — every simulated
message stopped at the `IDLE` state's property-list greet (or failed to resolve before reaching
any DB write). The only "state" created was in-memory WhatsApp session dict entries, which live
only inside the script's own process (exited, gone) or the dev server's own process memory (real
30-minute TTL, self-expiring, no persistent row). Nothing to soft-cancel or delete.
