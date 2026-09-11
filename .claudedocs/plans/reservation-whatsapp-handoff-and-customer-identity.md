# Reservation → WhatsApp Handoff & Customer Identity

**Status:** PLAN — investigation complete, nothing implemented.
**Written:** 2026-09-10 · **Owner:** Salman
**Trigger:** Salman received a real merchant alert with `الزبون: زبون واتساب` / `الرقم: عبر واتساب`
and said the message carries no information. It does not — and the cause is a lifecycle bug, not a
formatting one.

> **Governing instruction (Salman, 2026-09-10):** the affected reservations are **evidence of a
> lifecycle bug in production**, not dirty data. **Fix the lifecycle first, then decide how to
> recover the past.** No cleanup precedes the design.

### Ratified ordering (Salman, 2026-09-10) — this reverses the phase numbering below

The Phase 5 finding is what forces it: the website hands off to `Client.whatsapp_number`, but the
bot listens on `Client.phone`. **A correlation token has nothing to correlate against until the
tenant's own number is a WABA the bot answers on.**

```
Tenant WhatsApp Identity  →  Website↔WhatsApp Handoff  →  Customer Identity
                          →  Merchant Confirmation     →  Final Reservation
```

Channel identity comes **first**, not last. The phases below keep their original numbers so that
existing references stay valid; the sequence above is the one that governs execution.

---

## Phase 0 — Current reality *(read-only, measured 2026-09-10)*

18 reservations carry a non-numeric `customer_phone`. They are **two different defects**, and my
first framing of them as one was wrong:

### Class A — placeholder identity · **16 rows** · the lifecycle bug

| Tenant | Rows | Span | Statuses |
|---|---|---|---|
| **`rk`** | **9** | 2026-08-03 → 09-06 | pending ×6, cancelled ×3 |
| **`mr-h`** | **6** | 2026-08-19 → 08-29 | pending ×6 |
| `barberlab-test` | 1 | 2026-09-10 | pending |

Every one stores the literal strings `customer_name = 'زبون واتساب'`,
`customer_phone = 'عبر واتساب'`. **These are real customers of live shops who cannot be called
back.** `rk` has 29 reservations total, 11 affected; `mr-h` has 11 total, 6 affected.

Only `barberlab-test`'s row has a `customer_id` — the other 15 predate the Customer registry, so at
least the placeholder identity was not written into `customers` for them. The one that was creates
a `customers` row whose `phone` is `عبر واتساب`.

### Class B — Arabic-Indic digits · **2 rows** · a separate, unrelated defect

| Ref | Tenant | Name | Stored phone | Real value |
|---|---|---|---|---|
| `C851A996` | `rk` | عواطف الحب | `٨٠٩٩٩٩٩٩٩` | 809999999 |
| `AC8748A2` | `rk` | حسام | `٧٨٧٢٧٩٨٦` | 78727986 |

These came through the **local form** — the secondary path that *does* collect real identity. The
name and number are genuine; they are stored in Arabic-Indic numerals, which Meta cannot dial.

🔴 **And `normalize_for_storage()` makes it worse, not better:**
```
'٧٨٧٢٧٩٨٦'  →  '961٧٨٧٢٧٩٨٦'
```
Python's `\d` matches Arabic-Indic digits, so `re.sub(r"\D", "", …)` strips nothing and the country
code is prepended to a string that is still un-dialable. **Class B is out of this plan's scope** —
it needs its own fix in `app/core/phone.py` — but it must not be swept into a Class-A backfill.

### Neither class carries any WhatsApp correlation
`notes` is NULL on all 18. `metadata` holds only `{barber_id, service_id}`. No session row, no
audit row, no reference of any kind links a single one of them to a WhatsApp conversation.

---

## Phase 1 — The correct reservation lifecycle *(decision required, §5)*

### The mechanical cause

```
reservations.customer_name   NOT NULL
reservations.customer_phone  NOT NULL
```

`useReservationBooking.js:70-76` states it plainly: the columns are non-nullable, no identity is
collected on the WhatsApp path, therefore a placeholder is stored. **The schema forces the lie.**

> **This is the second independent instance of the same pattern.** `clients.phone` being
> `UNIQUE NOT NULL` manufactured `demo-{slug}`, `placeholder_{slug}` and `TODO_PHONE_{slug}` across
> three independent authors (see `client-tenant-data-audit.md` §9). Now
> `reservations.customer_phone` being `NOT NULL` manufactures `عبر واتساب`. By this project's own
> Abstraction Rule (`rules/team-roles.md`, two independent confirmed cases) this is now a **named
> pattern**: *a NOT NULL constraint on an identity field, in a flow that legitimately does not yet
> know the identity, does not prevent bad data — it mandates it.*

### The decision — A or B, not chosen here

**A. The website creates a FINAL reservation.**
The slot is genuinely held the moment the customer taps confirm, which is what the current design
optimises for and why it was chosen on 2026-08-02. Identity is completed later, in place.
*Consequences:* the row is queryable, countable and confirmable from the first second; the merchant
alert fires immediately — but fires **without identity**, which is exactly today's failure. Every
downstream consumer must tolerate a reservation whose customer is not yet known. No schema change
is strictly required if a placeholder is kept, which means the defect can silently persist.

**B. The website creates a DRAFT / pending-identity reservation.**
The row exists and holds the slot, but is explicitly marked as not yet claimed, and is not treated
as a real booking until identity arrives.
*Consequences:* requires either a new `status` value (`draft`) or nullable identity columns — a
schema change either way. The merchant alert must be **deferred** until identity completes, or the
merchant gets a notification for something that may never be claimed. Abandoned drafts need an
expiry, or the calendar fills with slots nobody claimed. In exchange, **no fake identity is ever
persisted**, and "did this booking complete?" becomes answerable.

### Salman's framing, 2026-09-10 — recorded because it is sharper than the above

**A means, commercially:** *"the slot is booked the moment the customer picks it,"* and WhatsApp is
only a confirmation channel afterwards. Cheap — no new lifecycle. But choosing A still requires,
explicitly:

- **no reservation may remain with a placeholder identity** — A is not a ratification of today's
  design, it only settles *when the row becomes real*;
- the handoff must work;
- if the customer never completes on WhatsApp, the system must **know** the reservation is
  unconfirmed;
- and **what happens to the held slot when the customer disappears** must be defined.

**B means, commercially:** *"picking a slot is not yet a booking."* Cleaner on identity, but it is
**not** `nullable=True` — it is a change to reservation *semantics*, and it opens real work: draft
lifecycle, expiry, slot holding, conflict handling, the promotion rule to final, whether the
merchant sees drafts at all, and whether WhatsApp confirmation is mandatory.

> ⚠️ **The caveat that must not be lost: choosing A does NOT approve the current implementation.**
> Under A the reservation becomes Final at the tap, **and** the customer identity must still be
> completed over WhatsApp and linked to that reservation before or together with confirmation.
> Under B, the lifecycle and the schema genuinely change. Either way, the placeholder goes.

**The question that decides it:** *is a tapped-but-unclaimed slot a booking?* That is a product
question about how a real shop runs, not a technical one.

### ✅ D1 — DECIDED 2026-09-11 by Salman: **B — Draft / Hold**

> *"الحجز اللي فيه كل المعلومات المطلوبة ما بيتسجّل بالداتابيز وما بينأخد الموعد من الكالندر —
> بتعمله hold لَيجيك تأكيد من الحلاق، لَما يصير تداخل. probably خلّيها محجوزة لـ15 min، إذا ما
> تأكّد بتروح."*

Four things are settled by this:

1. **A reservation is not written as a booking until its information is complete.** The placeholder
   identity path is retired outright — it is not deferred, softened, or made conditional.
2. **The slot is HELD, not booked.** The hold's job is stated explicitly: prevent a second customer
   taking the same slot during the window (*"لَما يصير تداخل"*).
3. **The hold expires after ~15 minutes** if no confirmation arrives.
4. **Confirmation comes from the shop side** (*"تأكيد من الحلاق"*), not from the customer alone.

This resolves **D1** and **D4**. It does not resolve D2 or D3, and it opens the questions in
"What B now requires" below.

**Role note (Salman, 2026-09-11):** this is Salman's decision to make. An earlier draft of this plan
deferred it to "the shop owner (حسين)" — that framing was wrong and is corrected here.

---

### ✅ D7 / D9 / D4-revised — DECIDED 2026-09-11 by Salman

> *"خلينا state جديدة `hold`، ومنخليه ساعة. بس تخلص هاي الساعة نبعت إشعار للزبون إنه ما مشي حاله،
> ومنقلّه إنه حسين حيتواصل معك شخصياً. وحسين فيه يأكد الحجز — بيرجع manual يعني بيأكده."*

| | |
|---|---|
| **D9 — what a hold is** | A **NEW state**, `hold`. Not a redefinition of `pending`. `status` gains a fourth value alongside `pending / confirmed / cancelled` |
| **D4 — duration** | **One hour** (supersedes the earlier "probably 15 min") |
| **D7 — what the clock measures** | The whole window: from the tap until the shop confirms. One clock, not two |
| **On expiry** | The customer is **notified** that it did not go through, and told the owner will contact them personally |
| **Merchant confirmation** | **Manual, and always available** — including after the hold has expired. The owner phones the customer and confirms by hand |

The expiry is therefore **not** a silent drop. It is a real, customer-facing outcome with a human
fallback — which is why one hour is generous enough to be honest and short enough to free the slot.

### ✅ CORRECTED 2026-09-11 by Salman — the hold starts at the MESSAGE, not at the tap

> *"أنا الهول مش قصدي لما زبون يفوت ويوصل للواتساب وما يبعت رسالة. قصدي من لما توصل الرسالة لعند
> حسام، لما حسام يأكد. إذا ما أكد خلال ساعة ما في حدا يحجز هيدا المحل. يعني بعد ما توصل الرسالة
> نحنا معنا الرقم.*
> *اللي عم بيصير هلأ هو مش مقبول. أنا بفتح من البراوزر، بفتح صفحة الواتساب، بدون ما أبعت الرسالة
> بيتسجل بالداتابيز. هذا الغلط. ما بدنا يتسجل شي هون، ولا ينعمل on hold، ولا كأنه صار شي."*

**The website writes NOTHING.** No reservation, no hold, no customer row, no trace. Opening the
WhatsApp tab is not an event the database hears about.

```
Website   pick service + barber + date + slot        → writes NOTHING
             ↓ handoff carries the SELECTION
Customer  actually sends the message                  → the phone number arrives with it
             ↓
HOLD      created here, for one hour — the slot is blocked from this moment
             ↓
Shop      confirms within the hour                    → Final reservation
          no confirmation within the hour             → hold released + customer notified
```

**This resolves D11 by removing it.** A hold cannot exist without a phone number, because the
message is what creates the hold, and the message carries the number. The case of "expired hold,
unknown customer" does not exist.

**It also settles what the slot is worth during the browser→WhatsApp gap: nothing.** The slot is not
reserved while the customer is deciding whether to send. Someone else may take it in those seconds.
That is accepted and correct — a hold means someone committed, and opening a tab is not a commitment.

### 🔴 What this changes in Phase 2 — the correlation key is NOT a reservation id

The Phase 2 analysis below was written against the current (wrong) behaviour, where a reservation
already existed at handoff time and its id was simply thrown away. **Under this correction there is
no reservation to point at.** The handoff must therefore carry the **selection**, not a reference:

```
tenant + service_id + barber_id + slot datetime
```

Which raises its own question — **D12** — since these must survive a round trip through a
`wa.me?text=` message the customer can see and edit: an opaque signed token (nothing legible, cannot
be tampered with, expires) versus legible ids (debuggable, but a customer could alter them and the
server must re-validate every field anyway). `tenant_urls.mint_setup_token()` remains the working
precedent for the first shape.

Note that re-validation is required either way: by the time the message arrives, the slot may have
been taken by someone else. **The bot must re-check availability before creating the hold**, using
`get_available_slots` — the same function the website used — and tell the customer if it is gone.

### Analytics belong in logs, not in phantom rows

Salman: *"بالمستقبل أنا بنزل برامج بتتبع وين العالم عم بتكبس بالسايت، وهالإشياء بقدر أجيبها
باللوغز."* Interest — a tap that never became a booking — is **observability**, and it is answered
by request logs or analytics. It is never answered by writing a reservation nobody made. This is
the principle that makes "the website writes nothing" safe rather than lossy.

### The original contradiction, kept for the record *(now void)*

**To notify the customer when the hold expires, we need the customer's phone number. That is exactly
what an unclaimed hold does not have.**

The hold exists *because* identity is incomplete. So expiry has **two different outcomes**, and the
design must name both:

| At expiry | Do we have a phone? | What can happen |
|---|---|---|
| Customer reached WhatsApp, identity captured, shop never confirmed | ✅ yes | The notification works exactly as decided. The owner can also still call and confirm manually |
| Customer tapped and never reached WhatsApp at all | ❌ **no** | **Nobody can be notified, and nobody can be called.** The slot is simply released |

The second row is not a defect in the decision — it is the honest limit of a flow whose whole
purpose is to obtain the identity. But it means **the expiry notification cannot be described as
unconditional**, and the merchant-facing view must distinguish "expired, customer known" from
"expired, customer unknown" or the owner will be told to call someone whose number we never had.

**Open:** does an unclaimed-identity hold produce a merchant notification at all, so the owner at
least knows a slot was reached for and lost?

---

## Phase 1b — What B now requires *(opened by the D1 decision, 2026-09-11)*

The decision settles the semantics and immediately raises four questions that only it could raise:

> ✅ **Q-B1, Q-B3 and Q-B4's premise are answered above** (one hour, one clock, a new `hold` state).
> The analysis below is kept because it is the reasoning the decision was made against, and because
> Q-B2 and the expiry mechanism remain open.

**Q-B1 — What does the 15 minutes measure, and when does it start?** *(ANSWERED: one hour, one
clock — tap to shop confirmation.)*
Two readings, with very different consequences:
- *from the tap, for the CUSTOMER to complete identity on WhatsApp* — reasonable; a customer who
  opened WhatsApp finishes in a minute or two.
- *from the tap, for the BARBER to confirm* — **harsh.** A barber mid-haircut does not look at his
  phone for 15 minutes, and every one of those holds would evaporate.

The wording (*"لَيجيك تأكيد من الحلاق"*) points at the second, but the first is what 15 minutes
actually fits. **Most likely two different clocks are needed**, and that must be stated, not
assumed.

**Q-B2 — Is the hold visible on the merchant's calendar?**
It must block the slot (that is its purpose), but a hold and a booking are not the same thing to a
person reading a calendar. If they render identically, the barber cannot tell what is real.

**Q-B3 — What is a hold, mechanically?**
`reservations.status` currently holds exactly `pending | confirmed | cancelled`. Either a new value
(`draft`/`hold`) joins it, or holds live in their own concept. `status` is `NOT NULL` with no DB
constraint, so a new value is cheap to add and cheap to get wrong — every consumer that branches on
status must be found first. **Note that `pending` already means "created, not confirmed"**, which is
close enough to a hold to be dangerous: whether B is a *new* state or a *redefinition* of `pending`
is itself the decision.

**Q-B4 — Does releasing an expired hold need a scheduler?**
There is no queue, no cron, no background worker in this codebase, and §5 of the WhatsApp plan
forbids adding one. A hold can expire *lazily* — treated as free by availability checks once its
window has passed — which needs no infrastructure. That is likely the right shape, but it must be a
decision, not an accident.

---

## Decisions 2026-09-11 (second pass) — D3 · D8 · D10 · D12 · profile name

### ✅ The customer's NAME also arrives free — use it as a confirmation, never as a question

Meta sends `contacts[0].profile.name` alongside every inbound message.
`whatsapp_flow._extract_message` (line 226) reads only `messages[]`, so the name is discarded — and
then `RES_AWAITING_NAME` asks *"ما اسمك الكريم؟"* as a full state.

**Decided:** read it, and turn that state from a question into a confirmation — *"اسمك سلمان، صح؟"*
with an edit path. The profile name is user-set and may be a nickname or an emoji, so it is a strong
**default**, never an authority. Salman: *"حلو كتير تعديلك على رسالة إنه يؤكد الاسم، يصير مش يكذبه."*

### ✅ D12 — the slug stays legible, the token carries the selection

Salman: *"فينا نحن السلوغ نعتبره هيدا الرمز المشفر."* Taken as: one compact message, not two
mechanisms bolted together.

```
حجز rk a7Kd92pQ
```

- **The slug stays human-legible.** It is what makes the message look intentional rather than
  corrupted, and `_resolve_client_from_text` already resolves it with no change.
- **The token carries the selection** — tenant + service + barber + slot — **self-contained and
  signed**, because a `handoffs` row would be a write, and the website writes nothing (Phase 1).
- **A full JWT is unusable here** (~250 chars in a message the customer reads before sending). This
  needs a short signed payload, ~40–60 chars, not `create_access_token` as-is.

**Why keeping the slug matters beyond aesthetics:** it is the graceful-degradation path. If the
token is expired, edited or dropped, the bot still resolves the tenant and starts a clean booking
flow instead of failing — the customer loses their pre-selection, not their booking.

### ✅ D3 — the merchant alert fires when the hold is created

By then the phone (and now the name) have both arrived, so the alert carries real identity from the
first message. It also **must** fire then: the shop is what confirms, within the hour.

### ✅ D8 — the merchant acts from WhatsApp, not from a calendar UI

Salban asked: *"D8 can be a message WhatsApp?"* — yes. The hold needs **no calendar UI in v1**. The
owner receives the booking as a WhatsApp message and confirms from there. This is exactly **D-C** in
`whatsapp-customer-experience-architecture.md` (merchant confirm/cancel buttons), so the two plans
converge rather than duplicating.

**Unchanged by this:** the hold still blocks the slot in **availability** — that is backend
behaviour, not UI, and it is the hold's entire purpose.

> ⚠️ **One consequence to keep in view:** if a hold is invisible in the dashboard calendar, the
> barber looking at his own screen does not see the blocked slot and could book a walk-in customer
> into it by hand. The hold blocks *online* booking while leaving the barber blind to it. Not a
> blocker for v1 — the hour is short and the WhatsApp message is immediate — but it must be a known
> limitation, not a surprise.

### ✅ D10 — the expiry notification is REMOVED; expiry is lazy

Salman: *"و نشيل الإشعار."* This resolves the conflict cleanly: **the notification was the only
thing that required a timer**, and §5 of the WhatsApp plan forbids a queue, cron or event bus.

- **Expiry is lazy.** Availability treats a hold past its window as free. **No scheduler, no
  background worker, no exception to §5.**
- **The customer is not left stranded**, which is why this is safe: the merchant's WhatsApp alert
  already contains the customer's real number. An owner who wants the booking simply calls them —
  the manual path Salman described from the start, now the only path at expiry.

**Supersedes** the 2026-09-11 first-pass decision to notify the customer at expiry.

---

## Phase 2 — Website → WhatsApp handoff *(the correlation mechanism)*

### The finding that makes this cheap

> ⚠️ **Superseded 2026-09-11 — read the correction in Phase 1 first.** Under Salman's correction the
> website writes nothing, so there is no reservation id at handoff time to carry. What follows
> describes the *current* (wrong) behaviour and is kept because it is the evidence of the defect.

**The reservation id already exists in the browser at handoff time and is thrown away.**

```js
// useReservationBooking.js:282-295
const id = await createReservation(PLACEHOLDER_NAME, PLACEHOLDER_PHONE)
setReservationId(id)                       // ← the correlation key, in hand
const message = ['مرحباً، أريد تأكيد الحجز.', `الخدمة: …`, `الحلاق: …`, `الموعد: …`].join('\n')
const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
```

The message is human prose. Nothing in it identifies the reservation. Correlation is not *hard* —
it was simply never attempted.

### What the transport already supports

`whatsapp_flow._resolve_client_from_text` already tokenises the inbound body with
`re.findall(r"[a-zA-Z0-9؀-ۿ_-]+", …)` and matches a token against every tenant slug. **A correlation
token in the message body is extracted by machinery that already exists** — the same way the
`حجز {slug}` deep link already works.

### Options to evaluate (none chosen)

| Mechanism | Note |
|---|---|
| Raw reservation UUID in the text | Simplest. But it is a guessable-by-listing identifier printed into a message the customer can forward. Any lookup **must** be tenant-scoped and paired with the sender's number |
| **Short-lived signed handoff token** | Opaque, expiring, single-use, resolvable only server-side. `app/core/tenant_urls.mint_setup_token()` is a working precedent for exactly this shape |
| Short opaque handoff id (a `handoffs` row) | Explicit lifecycle and expiry, at the cost of a table |

**Constraint (Salman):** no customer PII in the link, and `"مرحباً، أريد تأكيد الحجز"` alone is not
a correlation mechanism.

---

## Phase 3 — Customer identity completion

**The insight the current design throws away: when the customer messages from WhatsApp, their real
phone number arrives for free.** It is the `from` field. The flow creates the reservation *before*
the conversation and never returns to it.

### Everything needed already exists — nothing new in the domain layer

| Need | Exists |
|---|---|
| Tenant-scoped lookup | `reservation_repo.find_by_id(reservation_id, client_id)` |
| Customer-verified lookup | `reservation_repo.find_by_id_and_phone(...)` — the pattern is already established |
| **Write identity onto an existing reservation** | `reservation_service.edit_reservation(client_id, reservation_id, …, new_customer_name, new_customer_phone)` — **already accepts exactly these two fields** |
| Customer find-or-create | already inside `create_reservation` (`reservation_service.py:435`) |

### The one real gap

`whatsapp_reservation_flow.py` **only ever creates.** `create_reservation()` at line 393 is its
single write; there is no path that updates an existing row. Confirmed by reading every write in
the module.

Open question for the design: on resume, does the bot call `edit_reservation`, or does the
find-or-create inside `create_reservation` need an equivalent? **Do not answer by writing code.**

---

## Phase 4 — Merchant confirmation

Reuse `_notify_merchant_new_reservation` (`reservation_service.py:105-158`) unchanged — it already
resolves owner + linked staff, dedupes on the number, and never raises. Its **content** is correct;
it renders exactly what the row holds. Fixing Phases 1–3 fixes this message with no edit to it.

The one thing to decide alongside Phase 1: **when** it fires. Under lifecycle B it must be deferred
until identity completes, or the merchant is alerted about an unclaimed slot.

---

## Phase 5 — Per-tenant WhatsApp

Today the handoff targets `config.whatsapp_number` — **the tenant's own number**, so tenant
isolation on this path is already correct, and there is no central-number ambiguity to fix here.

But `whatsapp_number` is **not** the number the inbound bot listens on. The bot resolves an inbound
message by matching Meta's `display_phone_number` against **`Client.phone`**
(`whatsapp_flow.py:756-762`). So a handoff sent to `whatsapp_number` reaches a number that, today,
**no bot is listening on** — the customer's message lands in a human inbox.

**This is the dependency on Phase 2 of `whatsapp-customer-experience-architecture.md`
(per-tenant WABA).** Until each tenant's own number is a real WABA the bot answers on, a handoff
carrying a correlation token has nowhere to be correlated. **Do not implement Phase 2 here.**

⚠️ Recorded, not acted on: `alzabt-demo.phone` currently equals the central number `96179022398`,
so every inbound message that carries no slug resolves to that tenant. Salman: deliberate, not a
priority now.

---

## Phase 6 — The 18 historical reservations

**No mutation until the lifecycle above is ratified.** Analysis categories only:

| Category | Rows | Note |
|---|---|---|
| Recoverable in principle | Class A, 16 | The slot, service, barber and time are all real and intact. Only identity is missing |
| Requires customer re-contact | Class A on `rk`/`mr-h`, 15 | There is no stored channel to reach them — that is the whole defect |
| Historical incomplete | the cancelled ones (4) | Already resolved by cancellation; nothing to recover |
| Test/demo | `barberlab-test`, 1 | Safe to discard whenever |
| Separate defect | Class B, 2 | Real identity, wrong numeral system. Fix in `app/core/phone.py`, not in a backfill |

**Nothing here is a data-cleanup task.** The 15 live rows are a record of customers the shop could
not call. Deleting them destroys the evidence and does not recover a single booking.

---

## Phase 7 — Seeder alignment

**No new Seeder.** `demo_service` → `provisioning_service` is the provisioning mechanism, and
`scripts/seed_from_rk_template.py` is the working barber path (fixed 2026-09-10, `1699335`).

Once the lifecycle is settled, a seeded tenant must be able to exercise the **real** reservation
flow end to end — which means the Seeder must not produce a fake phone, an incomplete page, invalid
working hours, or orphan staff/service data. Those constraints are already written in
`.claudedocs/decisions/client-tenant-identity-decision-gate.md`; this phase only adds: **a seeded
tenant must be able to complete a booking with a real customer identity.**

---

## Success contract — testable, end to end

A customer chooses service + barber + date + slot, and then:

1. the reservation context is preserved across the handoff
2. WhatsApp opens on the **correct tenant's** number
3. the inbound message is **correlated to that reservation**, deterministically
4. the customer's WhatsApp number becomes the **real** `customer_phone`
5. **no placeholder identity is ever persisted**
6. the bot asks only for what is genuinely missing
7. the merchant receives an alert that contains a real name and a callable number
8. tenant isolation holds — a message to tenant A never touches tenant B's reservation
9. the reservation is **not duplicated** — one tap produces exactly one row
10. the final reservation carries a real customer identity

**Verification is a real observation on production, not a code review** — the stored
`reservations.customer_phone` read back from the database, and a real merchant alert on a real
phone. There is no staging.

---

## Open decisions

**D1.** ✅ **DECIDED 2026-09-11 — B, Draft/Hold.** See Phase 1.
**D2 / D12.** ✅ **DECIDED 2026-09-11** — `حجز {slug} {short signed token}`. Slug legible and
load-bearing as the fallback; token self-contained, signed, short. **Open sub-question:** the exact
token encoding and its lifetime.
**D3.** ✅ **DECIDED** — at hold creation, carrying real identity.
**D4.** ✅ **DECIDED 2026-09-11 — one hour**, measured **from the arriving WhatsApp message** to
shop confirmation. *(Corrected: an earlier line in this file said "from the tap" — that predates
the Phase 1 correction that the website writes nothing and the hold begins at the message.)*
**D7.** ✅ **DECIDED** — one clock, not two. **D9.** ✅ **DECIDED** — `hold` is a new `status` value.
**D11.** ✅ **VOID 2026-09-11** — resolved by removal. The hold is created by the arriving message,
which carries the phone, so a hold without a customer identity cannot exist.
**D8.** ✅ **DECIDED** — merchant acts from a WhatsApp message; no calendar UI in v1.
**D10.** ✅ **DECIDED** — expiry notification removed; lazy expiry; §5 intact.
**D13.** 🔴 **OPEN** — the exact short-token encoding, signature scheme and lifetime. Carries one
requirement that is *not* optional whichever encoding wins: **the bot must re-validate slot
availability when the message arrives**, because the slot may have been taken between the tap and
the send. Reuse `get_available_slots` — the same function the website used.
**D5.** Treatment of the 15 live Class-A rows, once the lifecycle is fixed — Phase 6.
**D6.** Class B and the `normalize_for_storage` Arabic-Indic defect: fix now, or fold into a wider
phone pass? It is small, isolated, and independent of everything above.
**Ratified 2026-09-10 — whenever it is fixed, it is fixed SEPARATELY.** Salman: *"إصلاح
normalization لازم يكون مستقل عن lifecycle/handoff، وإلا منخلط دليلين مختلفين."* The two classes are
evidence of two different defects; a single backfill touching both would destroy the distinction
this investigation just established. **No backfill of the 2 Class-B rows either, for now.**
