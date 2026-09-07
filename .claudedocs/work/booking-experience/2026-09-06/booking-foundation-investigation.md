# Booking Foundation Investigation — the two 500s + the Unit media/spatial contract

**Date:** 2026-09-06 · **Mode:** investigation only.
**Zero modification · zero migration · zero seed · zero commit · zero deploy.** No DB was written to;
both root causes were proven **without touching a database at all**. The Mountain code was read, not
altered.

---

# PART 1 — The two 500s

## They are NOT the same cause. They are two independent defects of the same *class*.

Both are **contract mismatches between layers**, and both are **deterministic** — not data-dependent,
not intermittent, not environment-specific. Which means: **neither endpoint has ever worked.** Both
trace back to `c02f415` ("SalmanSaaS full platform — post-format rebuild"); the only later commit
touching either path (`9153d77`, a Hard/Soft-Block security fix) did not address them.

---

## 500 #1 — `GET /api/v1/public/properties/` — **two defects, either one fatal**

### Defect 1A — the route promises a list, the service returns a page object

| layer | file:line | what it does |
|---|---|---|
| route | `app/api/v1/public/properties.py:19` | declares `response_model=List[PropertyResponse]` |
| route | `:35` | `return await service.get_client_properties(client.id)` |
| service | `app/services/property_service.py:10-17` | returns **`PaginatedResponse.build(...)`** |
| schema | `app/schemas/pagination.py:19-24` | `PaginatedResponse` = `{data, total, page, limit, pages}` — an **object** |

FastAPI converts the returned model to a dict, then validates it against `List[PropertyResponse]`.
**Proven by executing the exact validation:**

```
what FastAPI actually validates: ['data', 'total', 'page', 'limit', 'pages']
  ❌ type=list_type   msg=Input should be a valid list
```

### Defect 1B — Pydantic expects snake_case, Prisma exposes camelCase

`PropertyResponse` (`app/schemas/property.py:25-30`) requires `client_id`, `created_at`,
`updated_at` and uses `from_attributes=True` with **no aliases**. But `model Property` declares
`clientId`, `createdAt`, `updatedAt`, `managerId`, `isActive` — so the Python objects Prisma returns
carry the **camelCase** attribute names. **Proven:**

```
PropertyResponse.model_validate(<prisma-shaped object>, from_attributes=True)
  ❌ client_id    Field required
  ❌ created_at   Field required
  ❌ updated_at   Field required
```

> Note the asymmetry that hid this: `name`, `description`, `image_url`, `max_guests`, `bedrooms`,
> `bathrooms` are **already snake_case in the Prisma schema**, so those five fields line up fine.
> Only the five camelCase ones break — which is exactly why it looks correct at a glance.

**So `/properties/` is doubly broken: fixing 1A alone would still 500 on 1B.**

---

## 500 #2 — `GET /api/v1/public/units/{id}/availability` — a `date` where Prisma demands a `datetime`

### The chain, traced

```
units.py:81      year, mon = int(month[:4]), int(month[5:7])
availability_service.py:67-68
                 period_start = date(year, month, 1)          ← datetime.date
                 period_end   = date(year, month, num_days)   ← datetime.date
availability_service.py:71   _fetch_both(repo, unit_id, client_id, period_start, period_end)
availability_repo.py:26      "date":     {"gte": start, "lte": end}
availability_repo.py:44-45   "checkIn":  {"lt": end},  "checkOut": {"gt": start}
                             ↳ Price.date / Booking.checkIn / checkOut are all `DateTime @db.Date`
prisma 0.15.0 _builder.dumps()
                             ↳ registers a serializer for datetime.datetime ONLY
```

**Proven by running Prisma's own serializer:**

```
✅ datetime.datetime (correct)          -> {"date": {"gte": "2026-09-01T00:00:00+00:00"}}
❌ datetime.date  (what the repo passes) -> TypeError: Type <class 'datetime.date'> not serializable
```

`datetime.datetime` subclasses `datetime.date`, **but not the reverse** — so a plain `date` never
matches the registered serializer.

### Why it surfaces as a 500 and not a 400
`units.py:88` catches only `BusinessLogicError`. A `TypeError` escapes to the global handler →
`{"code": "INTERNAL_ERROR"}`. Confirmed live for `month=2026-09` **and** `2026-10` — deterministic.

### A second, latent defect in the same function (would survive fixing the first)
`availability_service.py:76` builds `price_map = {p.date: p ...}` and `:83` fills `booked_dates`
from `booking.checkIn` — both **`datetime`** values from Prisma. But `:89` looks them up with
`d = date(year, month, day_num)` — a **`date`**. `datetime != date` in a dict/set lookup, so
**every day would silently report `no_price`** and no booking would ever register as `booked`.
Not a crash — a **silent correctness bug** waiting behind the crash.

---

## Live confirmation

| endpoint | HTTP |
|---|---|
| `GET /public/listings/?client_slug=smar` | **200** ✅ |
| `GET /public/properties/?client_slug=smar` | **500** ❌ |
| `GET /public/units/{id}/availability?...&month=2026-09` | **500** ❌ |
| same, `month=2026-10` | **500** ❌ |

`/listings/` works because it does **not** declare a strict `response_model` and does **not** query by
date — it sidesteps both defect classes.

---

# PART 2 — The Unit media / spatial contract

## 🔴 A correction to Decision 1.5, stated plainly

Decision 1.5 said *"the old Mountain never touched real inventory."* **That was wrong** — true of
`CollageScene.jsx`, but I had scoped the search to `pages/smar/` and **missed the real component**:

### `frontend/src/components/MountainMap.jsx` — 84 lines, orphaned (imported by nobody)

This is the actual Mountain, and it **does** take real units.

```jsx
MountainMap({ chalets, onUnitClick, isAdmin = false, lang = 'ar' })
```

## The spatial contract, answered from real code

> ### `position_x` / `position_y` are **PERCENTAGES (0–100) on a 2D isometric board.**
> Not 3D-scene coordinates. Not sort order.

| mechanism | line | evidence |
|---|---|---|
| placement | `:45-46` | `left: ${chalet.position_x \|\| 50}%` · `top: ${chalet.position_y \|\| 50}%` |
| the board | `:22-28` | `transform: rotateX(55deg) rotateZ(-35deg)`, `preserve-3d`, `perspective:1500px` on the parent — **CSS 2.5D isometric, no WebGL** |
| sprite counter-rotation | `:50` | `translate(-50%,-100%) rotateZ(35deg) rotateX(-55deg)` — cancels the board tilt so each unit stands upright facing camera |
| depth ordering | `:5`, `:48` | sorted by `position_y`, then `zIndex: index + 20` — **`position_y` doubles as depth**, so a unit lower on the slope occludes one behind it |
| **admin placement mode** | `:31-35` | when `isAdmin`, renders a dashed **10% × 10% grid** — the comment says it is *"to help you know the coordinates in admin mode"* |
| unit sprite | `:56-62` | `chalet.image_url` with `onError` → `/chalet-model.png` |
| interaction | `:42` | `onClick={() => onUnitClick(chalet)}` — a real unit object, straight into a booking flow |

**So the design contract was already decided, in code**: a percentage-based isometric board, with an
intended admin drag/place mode. What never existed is a *written* contract or any data.

## Why it looked wrong — fully explained, without a screenshot

Four independent failures stack on the same render:

1. **All 16 units have `position_x = position_y = NULL`** → every one falls back to `50% / 50%` →
   **all 16 chalets stack on a single point** in the middle of the board.
2. **All 16 units have `image_url = NULL`** → every sprite falls back to `/chalet-model.png`, which
   **does not exist in `frontend/public/`** (verified) → **16 broken-image icons**, piled up.
3. **The backdrops are real photographs of Beit Smar, not illustrations** — and they are mislabelled
   in the code. `:14` calls `bg2.png` *"Sky Background"*; it is actually a **terrace photo looking out
   over the valley to the sea** (railing and a wooden pillar in frame). `:17` calls `bg3.png` *"Sea
   Foreground"*; it is actually a **photo of the stone chalets themselves** — red-tiled roofs, olive
   tree, pergola, terraced stone walls.
4. So the backdrop **already contains the real chalets, in true camera perspective**, and the code
   then overlays a CSS-isometric board (`rotateX(55deg)`) of *more* chalet sprites on top of it. Two
   incompatible projections in the same frame, plus a duplicated subject.

> **This is why it read as "مخبّص" — and it was not a taste failure.** It was a real photograph with
> its own perspective, used as the ground plane for an isometric sprite board, populated by 16
> coordinate-less, image-less units. Any designer would have produced the same result from these
> inputs.

## Who writes / reads the fields today

| | |
|---|---|
| **writes** | **nobody** — no service, script, migration or seed sets them. `admin/units.py:137-138` only *reads them back out* (`getattr(unit, "position_x", None)`) |
| **reads** | `public_service.py:441-442` (defaults to `0`, note: **not `50`** — a third, inconsistent default) and `MountainMap.jsx` (defaults to `50`) |
| **UI to set them** | **none exists.** `isAdmin` renders a reference grid, but there is **no drag, no input, no PATCH** — the admin placement mode was drawn, never wired |

**Three different defaults for the same field** (`null` in DB, `0` in the API, `50` in the UI) is
itself a sign no contract was ever ratified.

---

# Confirmed / Side Findings / Unknowns

### Confirmed
1. `/public/properties/` 500 = **two independent defects** (page-object vs list; camelCase vs
   snake_case), each proven by executing the real validation.
2. `/public/units/{id}/availability` 500 = **`datetime.date` passed to a Prisma `DateTime` filter**,
   proven by running Prisma 0.15.0's own `dumps()`.
3. **The two 500s are unrelated causes** — same class (layer contract mismatch), different mechanism.
4. Both are deterministic ⇒ **neither endpoint has ever worked**; both date to `c02f415`.
5. A **latent** date/datetime lookup bug sits behind the availability crash and would produce silently
   wrong calendars once the crash is fixed.
6. `position_x/y` = **percentages on a CSS-isometric board**, `position_y` doubling as depth order —
   established by `MountainMap.jsx`, the real Mountain component.
7. **Nothing writes those fields; no UI exists to set them**; three inconsistent defaults exist.
8. The visual failure is fully explained by 4 stacked causes — no screenshot needed.

### Side findings
- `MountainMap.jsx` is **orphaned** (zero importers) and lives in shared `components/`, **not** in the
  smar tree — so Phase B's deletion list would *not* have caught it. It is nonetheless part of the
  same artifact set and must be preserved.
- `bg2.png` / `bg3.png` are **real Beit Smar photography** (208K / 276K) and are genuinely good assets
  — they are simply used in the wrong role. `/chalet-model.png` is missing.
- `public_service.py:441` defaulting to `0` while the UI defaults to `50` means an API consumer and
  the UI would place the same unit in two different places.

### Unknowns
1. **Why `PaginatedResponse` was introduced without updating the route's `response_model`** — no
   commit isolates that change; both sides arrive together in `c02f415`.
2. **Whether `/properties/` or availability ever had a passing test** — not searched; no test run.
3. **Whether smar's units ever had images** that were lost, vs never having had any.
4. **What the Mountain looked like running** — still unknown. But per §2 it is now *derivable*, and a
   screenshot would only confirm it.
5. Whether any other tenant/consumer depends on `/properties/` (it is 500 for everyone, so: unlikely
   to be in active use).

---

## Recommendation / Decision / Execution

- **Recommendation:** treat these as **three separate small fixes, not one** — (1) the `properties`
  response contract, (2) the availability `date`→`datetime` serialization **plus** its latent lookup
  bug in the same change, (3) a written spatial contract (units, range, default) before any UI. Do
  **not** bundle them; (1) and (2) share no code.
- **Decision:** none taken.
- **Execution:** none. Nothing modified, committed or deployed.
