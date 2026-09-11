# Phone Numbers — Always Active

paths: "app/**,frontend/src/**,scripts/**"

Established 2026-09-08, Salman's explicit decision, from a real production failure — not from
style preference.

## The failure this rule exists to prevent

جعفر, a real staff member at `rk`, was invited on 2026-09-07 and **never received his WhatsApp
setup link**. Six days later his account still had no password and had never logged in. Root cause,
confirmed end-to-end:

1. His number was stored `70764479` — a Lebanese national number, **no country code**.
2. `whatsapp_service.send_text()` passes `to` **straight to Meta's Cloud API**, which requires a
   full international number. There is no normalisation anywhere in that path.
3. `send_staff_setup_link()` swallows every exception by design ("never raises", so a failed invite
   cannot roll back the account creation) — so the failure was invisible.
4. `team.py` reported `invite_sent: true` from `bool(body.phone)` — **the presence of a number, not
   the success of a send**. The owner was told it worked.

The account that *does* work — `rkbarber@dev.invalid`, stored `96176985477` — differs in exactly one
way: it carries the country code.

## The rule

> **Storage is always WITH the country code. Entry is always WITHOUT it.**

| Layer | Rule |
|---|---|
| **Database / API / outbound** | Digits only, **country code included** — `96170764479` |
| **User input, everywhere** | A **country selector in front of the field, defaulting to Lebanon (+961)**; the user types only their national number |

**"Everywhere" means everywhere** (Salman, 2026-09-08): *"أي مكان العميل بدّه يحط رقمه فيه — إن كان
بالtenant، ولا هو عم يعمل حجز، أو order، أو بالdashboard — أي مكان في خانة للرقم، حط خانة دالة
البلد قبلها، وعملها default على لبنان."* Booking forms, checkout, registration, admin dashboard,
tenant pages — no exceptions carved out for being "internal" or "just a demo".

## The one implementation of it

`app/core/phone.py` is the **single** place that converts typed input into stored form:

- `normalize_for_storage(phone, country_code="961")` → the storage/outbound form, or `None`.
  Accepts `+961 70 764 479`, `0096170764479`, `070764479`, `70764479` — all become `96170764479`.
  Never raises; a write path must not fail because someone typed a space.
- `split_for_display(phone)` → `("961", "70764479")`, for prefilling an edit form. Falls back to the
  default country code for rows written before this rule existed.

**Call it at every write point.** A UI country selector is the good experience; the backend
normaliser is the guarantee. Never rely on the UI alone — an API client, a seed script, or an
un-migrated form will all eventually send a bare national number.

### Two layers, two different responsibilities (2026-09-12, Salman's correction)

Normalisation is an **action that happens at the API boundary, and only there.** Seed and test data
is not normalised — it is **written canonical in the first place**, because it is not human input
and crosses no boundary. Conflating the two makes the rule unenforceable, because it stops being
clear where the guarantee actually lives:

```
API boundary          Seed / test data
     ↓                       ↓
normalize_for_storage()  already canonical
     ↓                       ↓
        Barber.phone storage
```

### Audit of every real write path to `Barber.phone` (2026-09-12)

This file previously named `team.py` as the incident site and **did not mention
`admin/barbers.py` at all** — so its own audit was incomplete, which is a way this failure recurs
even while the rule is on the record. Measured, not assumed (repo-wide search, `app/` + `scripts/`
+ `prisma/migrations/*.sql` + `scripts/data/*.json` + `.claude/agent/*.md`):

| Layer | Write path | State |
|---|---|---|
| API boundary | `app/api/v1/admin/team.py:243` · `:290` | ✅ normalised since 2026-09-08 |
| API boundary | `app/api/v1/admin/barbers.py:122` (POST) · `:152` (PATCH) | ✅ **fixed 2026-09-12** — was raw, no import at all |
| Seed fixture | `scripts/seed_barber_arch_test.py:84` · `:91` | ✅ **fixed 2026-09-12** — literals now canonical, no normaliser call |
| — | `app/services/provisioning_service.py:64` (shared provisioning), `scripts/seed_from_rk_template.py`, `seed_alzabt_demo_tenant.py`, `seed_ali_tenant.py` | Write no phone at all ⇒ column stays `NULL` |
| — | Raw SQL in any migration · `scripts/data/*.json` · `tenant-seeder`'s documented procedure | **Zero** write paths |

**Why this was invisible until now:** `Barber.phone` is read in exactly two places
(`admin/barbers.py:76`'s serializer, and `StaffTab.jsx:265` prefilling the edit modal) and is
**never** a WhatsApp send target nor used to match an inbound sender. An unnormalised row therefore
caused no visible failure, unlike `User.phone`, which produced the real جعفر incident above. That
changes the moment the column becomes operational — which is why it was fixed *before* it does.

### The scope of that fix, stated exactly

```
✅  Normalize Barber.phone at the API boundary because Barber.phone is an
    operational WhatsApp-capable phone field.

❌  Barber.phone is the canonical phone for all Staff.
```

The second form was proposed and **withdrawn** (Salman, 2026-09-12): it infers a `Staff` abstraction
from one resource. `Barber` is a **business resource**; `User` is the **auth identity**; a
`Staff`/Person model **does not exist** in this schema, and a person may hold several roles. Nothing
here decides how phones work for Staff in general — that architecture is deliberately still open,
and no refactor toward it is authorised by this rule.

**One deliberate behaviour change from the 2026-09-12 fix:** on `PATCH /admin/barbers/{id}`,
`phone: ""` now stores `NULL` instead of an empty string — the correct representation of "no phone",
and the shape three existing accounts already carry as a separately-tracked defect. Recorded here
rather than worked around.

Frontend equivalent: `frontend/src/design-system/molecules/PhoneField.jsx`, whose `onChange` emits
the already-normalised international value, so a call site never handles a partial number.

## Relationship to `user_repo.normalize_local_phone` — complements, not rivals

`normalize_local_phone` (2026-08-29, also Salman's decision) **strips** the country code, and is
correct: it governs **login matching**, so `+96176985477`, `96176985477` and `76985477` all resolve
to one account.

The two rules operate on different moments and do not conflict:

```
WRITE:  what the user typed  --normalize_for_storage-->  96170764479   (stored)
READ:   96170764479          --normalize_local_phone-->  76985477      (matched)
```

Storing with the country code stays fully loginable **precisely because** the login path strips it
again. Live proof: `rkbarber@dev.invalid` is stored with `961` and logs in successfully
(`last_login_at 2026-09-07 19:11`).

That file's own warning — *"NEVER apply this to clients.phone, which must keep its full country
code for real outbound WhatsApp sends"* — stays exactly right, and this rule generalises it: **any**
column that can become an outbound WhatsApp target must keep the country code. `users.phone` became
such a column on 2026-09-07 when staff invites were built, which is precisely the gap that let this
failure through.

## A send is not "sent" until it succeeded

Second, narrower rule from the same incident: **never report delivery from the presence of a phone
number.** A notification helper may swallow its exception (that contract is correct — a failed
invite must not roll back a real account), but the caller must then surface the real outcome rather
than assume success. "Always delivered" requires knowing when it was not.
