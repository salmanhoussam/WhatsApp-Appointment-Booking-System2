# Self-Registration Contract — Small, Specific Analysis (No Fix)

**Status:** Investigation only, per Salman's explicit instruction after the Vertical Registry
implementation surfaced this as a real, unresolved suspicion. **No code changed in this round.**
Answers the 6 named questions, then proposes (does not implement) the smallest correct fix.

**One correction on the way in**: Salman's own framing said "10 Reservations templates" — the real,
precisely-counted number, re-verified this round, is **11**, not 10 (`food-restaurant`, `food-cafe`,
`beauty-barber`, `beauty-salon`, `beauty-spa`, `health-clinic`, `health-gym`, `health-nutrition`,
`services-photography`, `services-maintenance`, `services-design`). The prior round's own
`ALZABT_VERTICAL_CONCEPT_PROPOSAL.md` said "14" — also wrong. Corrected here rather than left
standing, since precision is the whole point of this round.

---

## 1. Where does `module_key` come from?

A static, developer-authored field on each of `template-registry.js`'s 20 entries. Only **3** real
values exist across all 20: `'store'`, `'restaurant'`, `'catalog'`. It never varies per-tenant —
it's baked into the template definition at commit time.

## 2. How does it become `venue_type`? — Two independent breaks, not one

**Break A (frontend, already found last round) — `TenantRegisterPage.jsx`'s own mapping:**
```js
const MODULE_TO_VENUE = { store: 'store', restaurant: 'restaurant', catalog: 'services' }
const venueType = MODULE_TO_VENUE[template?.module_key] ?? 'real_estate'
```
Every one of the 9 `module_key: 'catalog'` Reservations templates collapses to `venueType:
'services'` — a value with no entry in `registration_service.py`'s `_SERVICE_SEED_MAP`.

**Break B (backend, newly found this round, more severe) — the real, live Pydantic contract for
`/register` never accepts `venue_type` at all.** Read directly, `app/api/v1/public/registration.py`:

```python
class TenantRegistrationRequest(BaseModel):
    business_name:   str
    slug:            str
    email:           EmailStr
    password:        str
    whatsapp_number: str
    owner_name:      str | None = None
```

No `venue_type` field. No `services` field. No `primary_color` field. No `model_config =
{"extra": "allow"}` either (confirmed by direct read — unlike `app/schemas/page_content.py:129`,
which explicitly opts into that behavior elsewhere in this codebase). Pydantic v2's default for an
unconfigured model is `extra="ignore"` — confirmed via `pydantic.VERSION = 2.13.4` in this
environment. The route itself:

```python
async def register_tenant(request: Request, payload: TenantRegistrationRequest):
    return await registration_service.register_new_tenant(prisma_client, payload.model_dump())
```

`payload.model_dump()` can only ever contain the 6 declared fields — whatever `venueType`
`MODULE_TO_VENUE` computed on the frontend is silently discarded before `register_new_tenant()`
ever runs. Inside it:

```python
venue_type = data.get("venue_type", "real_estate")
```

Since `venue_type` is never present in `data` via this route, **this line evaluates to the literal
default, `"real_estate"`, unconditionally, for every tenant created through this exact code path
today** — regardless of which of the 20 templates was picked, including the 11 Reservations ones.
This is a stronger, more direct break than Break A: Break A computes a wrong value; Break B means
the wrong (or right) value never arrives at all.

**A real, honest Unknown, not resolved by this round**: whether Ali's actual, historical
`service_type = 'services'` came from Break A firing at some earlier point (a plausible, direct
match to Salman's own hypothesis) or from a different, now-superseded code path (Ali's onboarding
was already established in an earlier session as going through an older, informal
`scripts/data/ali/` pipeline, not necessarily this exact live route as it stands today) is **not
traceable from the current code alone** — it would need git history on `registration.py`'s schema
and on however Ali was actually created, which this round did not trace. Stated as a real Unknown,
not guessed at either direction.

## 3. What do the 11 Reservations templates currently send?

| Template | `module_key` | Frontend-computed `venueType` (Break A) | Ever reaches backend? |
|---|---|---|---|
| `food-restaurant`, `food-cafe` | `restaurant` | `'restaurant'` | No (Break B) |
| `beauty-barber`, `beauty-salon`, `beauty-spa`, `health-clinic`, `health-gym`, `health-nutrition`, `services-photography`, `services-maintenance`, `services-design` | `catalog` | `'services'` | No (Break B) |

Both groups are equally broken today, for the same reason (Break B supersedes Break A entirely) —
even the 2 `restaurant`-module templates, whose frontend-computed value (`'restaurant'`) *would*
correctly match a real `_SERVICE_SEED_MAP` key if it ever arrived, never get the chance, because it
never arrives either.

## 4. What does `registration_service.py` actually expect?

Two independent inputs, both effectively unreachable via `/register` today:
- `venue_type` — a string key into `_SERVICE_SEED_MAP` (`store|restaurant|barbershop|real_estate|
  hotel|sports`). Always resolves to `"real_estate"` via this route (Break B).
- `services` (`data.get("services") or []`) — an explicit override/addition list. `TenantRegisterPage.
  jsx` never sends this key either, and it isn't in `TenantRegistrationRequest` either — always
  empty via this route, same root cause as Break B.

## 5. What are the correct values per vertical, today?

Only **one** real value in `_SERVICE_SEED_MAP` includes `reservations`: `"barbershop"` →
`["booking", "reservations", "catalog", "whatsapp_ordering"]`. **No template-registry.js entry's
`module_key`, and no value `MODULE_TO_VENUE` can ever produce, resolves to `"barbershop"`** — that
key is reachable only from the Demo Builder's own `business_type` parameter (a completely different
door) and is unreachable from both the self-registration form and the WhatsApp/n8n onboarding
webhook (`onboarding.py`'s own schema comment: *"service_type: real_estate | restaurant | store |
services"* — `"barbershop"` isn't even a documented valid value there either). Concretely: **even a
real visitor who deliberately picks the Barber template today gets none of Barber's actual services
seeded** — this is not narrower than the Clinic-specific gap named in the earlier Gap Analysis, it
generalizes to every Reservations vertical, including the one already proven.

## 6. Is Barber just the first case, or do we need a contract that extends safely?

**The current contract cannot extend safely, and would not have even for Barber alone.** Three
independent places each encode a piece of "what vertical is this," none aware of the others:
`module_key` (3 values, template-level), `venue_type`/`MODULE_TO_VENUE` (a frontend-only lossy
translation, never delivered), and `_SERVICE_SEED_MAP` (backend, keyed by a value that can't arrive).
Adding Clinic or Beauty under this shape would mean touching all three again, with the same real
risk of silently missing one — exactly the failure mode already found twice in this one
investigation. This is a direct, concrete instance of the exact problem the Vertical Registry was
built to solve — self-registration simply never got wired to it (nor, it turns out, was its
pre-existing contract wired correctly to itself).

---

## Proposed smallest correct fix — named, not implemented

Route self-registration through the **same** mechanism already built and verified for the Demo
Builder, rather than patching `MODULE_TO_VENUE` or `TenantRegistrationRequest` in isolation:

1. `template-registry.js` already gained a `vertical` field on `beauty-barber` last round (`'barber'`,
   `null` implicitly for the other 19). Extend this to every entry explicitly (`vertical: null` for
   the 19 non-Barber ones) so the field is never silently absent.
2. `TenantRegisterPage.jsx` sends `template?.vertical` as part of the `/register` payload, alongside
   (not replacing) whatever it already sends — additive, matching this whole arc's own posture.
3. `TenantRegistrationRequest` gains one new, real, optional field: `vertical: str | None = None` —
   the minimal schema fix that closes Break B for this one field specifically (the schema-drop bug
   would otherwise silently swallow this new field exactly the way it swallowed `venue_type` today).
4. `registration_service.py` resolves services via `VERTICAL_REGISTRY.get(vertical)` **first**, when
   `vertical` is present and registered; falls back to today's existing `venue_type`/
   `_SERVICE_SEED_MAP` logic unchanged for every non-Reservations template (retail/restaurant stay
   exactly as they are, per the already-approved Reservations-only scope decision).

**Why this is smaller than it looks**: it doesn't fix `MODULE_TO_VENUE` or touch `venue_type`'s
existing behavior for retail/restaurant templates at all — those keep working (or not working,
unchanged either way) exactly as today. It only gives the 11 Reservations templates a second,
correct, additive path that bypasses both confirmed breaks at once, using infrastructure already
built and verified last round. **Why Barber alone doesn't prove this is sufficient**: this fix
closes the *routing* problem generically (any future `vertical` value reaches the Registry the same
way); it does not by itself make Clinic or Beauty registrable — that still needs their own
`VERTICAL_REGISTRY` entries (a separate, future, small addition, not part of this proposal) and,
for Clinic specifically, the still-open `credentials` section and Resource-vs-Barber staff-model
question named in earlier rounds.

---

## Checkpoint state, restated exactly as instructed

- **Vertical Registry implementation**: technically good, unaffected by anything found this round.
- **Self-registration contract**: unresolved, now proven broken in two independent, confirmed ways
  (not fixed — named only).
- **Existing tenant backfill (Step 5)**: HOLD — unchanged from Salman's instruction, and now better
  justified: with the real onboarding contract confirmed broken, inferring any tenant's historical
  vertical from `service_type`/`venue_type` would be inferring from a field the current code can't
  even reliably produce going forward, let alone trust retroactively.
- **P0.1**: HOLD — unchanged, independent of everything in this document.
- **Nothing committed.** No code touched this round.

Waiting for the two separate decisions named: **A** (fix the onboarding contract — using the
proposal above or another shape Salman prefers) and **B** (backfill existing tenants — only once
each tenant's real vertical is known with confidence, not guessed).
