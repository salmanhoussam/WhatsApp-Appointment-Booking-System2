# Decision 1.5 — Defining the Booking Vertical & the Customer Experience

**Date:** 2026-09-06 · **Mode:** investigation only. Nothing modified, committed or deployed.
**Not** an Admin API migration, **not** a Generic refactor, **not** UI implementation.

> **Answering the direct question first: I have NO screenshots and NO video of the old Mountain
> attempt.** What I do have is **the actual code, still on disk and committed** — so nothing below is
> reconstructed from memory. Every claim cites a real file. What the code cannot tell us is what it
> *looked like running*; that gap is named in Unknowns.

---

## 🔴 Read this before anything else — a collision with Phase B

The files that make up the old Mountain attempt are **exactly the files Phase B proposed deleting**:

```
SmarPage.jsx · CollageScene.jsx · MountainBackground.jsx · Scene3D.jsx
CameraManager.jsx · FloatingRings.jsx · useSmarStore.js · sections/HeroSection.jsx
```

**They are the only surviving record of this experiment.** Phase B's B3 step must be **put on hold
for the smar canvas/sections tree** until Decision 1.5 closes. The `beit-al-fakhar/plates/` files in
that same step are unrelated and unaffected.

---

## 1. What Booking actually IS at Smar — proven from schema + live data

```
Client ─→ Property ─→ Unit ─→ Booking
                       ├─→ Price          (per-date pricing)
                       └─→ GalleryImage
```

### The "object" is `Unit`

`prisma/schema.prisma` `model Unit` — and it **already carries spatial placement**:

```prisma
position_x  Float?  @map("position_x")
position_y  Float?  @map("position_y")
unit_type   String? @default("chalet")   // villa | chalet | restaurant | pool
```

So the answer to *"is the object a Unit / Chalet / Apartment / Property / land parcel?"* is:

> **The object is a `Unit`.** `chalet`, `villa`, `restaurant`, `pool` are **`unit_type` values**, not
> separate entities. `Property` is the container (the estate); `Unit` is the bookable thing.
> **And someone already designed the spatial layer into the data model** — `position_x`/`position_y`
> exist for exactly the "place this object on a scene" idea.

### Live inventory — `GET /public/listings/?client_slug=smar` → **200**

**16 real units**, Hebrew-letter naming (Aleph, Bēt, Gīml, Dālet, He, Wāw, Zayin, Hēt, Tēt, Yod,
Lāmed…), real prices **150–950**:

| | |
|---|---|
| 13 × `chalet`, 3 × `villa` | ✅ real, curated |
| `content_blocks` | ✅ **16/16** |
| `amenities` | ✅ **16/16** |
| `description_ar` | ✅ **16/16** |
| **`position_x` / `position_y`** | ❌ **0/16 — never populated** |
| **`images`** | ❌ **0/16** |
| **`gallery_images`** | ❌ **0/16** |
| **`image_url`** | ❌ **0/16** |

> ## The single most decision-relevant fact
> **Smar has rich text and zero pixels.** Not one image on any of the 16 units, and not one
> coordinate. **Any visual object-selection experience is blocked on content, not on code.**

---

## 2. RK vs Smar — two genuinely different verticals

| | **RK (Reservation)** | **Smar (Booking)** |
|---|---|---|
| chain | `CatalogService → Barber → time slot → Reservation` | `Property → Unit → date range → Booking` |
| you book | **time on a person** | **a date range on a thing** |
| availability | staff calendar + duration | per-unit day-by-day occupancy |
| inventory | services (abstract) | units (physical, placeable) |
| capability key | `reservations` | `booking` |

These are not two skins of one model. **`booking` and `reservations` were already settled as distinct
capabilities** — this is the same distinction, seen from the domain side.

### The availability contract already exists and is well-designed
`app/api/v1/public/units.py:47` — `GET /units/{unit_id}/availability?client_slug=&month=YYYY-MM`,
returning a **day-by-day calendar** with four states: `available` · `booked` · `blocked` ·
`no_price`. That is exactly the right primitive for a date-range booking UX.

---

## 3. 🔴 NEW — the Booking vertical's public API is broken in production

Tested live, reproducibly (each twice):

| endpoint | result |
|---|---|
| `GET /public/listings/?client_slug=smar` | **200** ✅ |
| `GET /public/properties/?client_slug=smar` | **500** `INTERNAL_ERROR` ❌ |
| `GET /public/units/{id}/availability?...&month=2026-09` | **500** `INTERNAL_ERROR` ❌ |
| same, `month=2026-10` | **500** ❌ |

**Two of the three customer-facing Booking endpoints are down.** So today, a customer cannot list
properties and cannot see availability for any smar unit. This is upstream of every UX question
below — no Mountain, no grid, no list works without availability.

*(Not investigated further — root-causing these is its own task, and this is an investigation.)*

---

## 4. What the old "Mountain" ACTUALLY was — the correction

Read from the real files, not memory:

| file | lines | what it really is |
|---|---|---|
| `SmarPage.jsx` | 86 | A **600vh GSAP ScrollTrigger shell**. Its own header diagram: `HeroSection (fixed) + scrollContainer 600vh + sticky 100vh stage` |
| `MountainBackground.jsx` | 85 | **A CSS gradient backdrop.** Sky → forest → stone, plus a sunlight bloom. `pointerEvents: 'none'`, `aria-hidden`. **No objects, no interaction, no mountain geometry** |
| `CollageScene.jsx` | 575 | **3 hardcoded photo tiles** — `id: 'villa'`, `id: 'restaurant'`, `id: 'chalet'` — that slide in and pin on scroll, plus a booking bottom-sheet |
| `Scene3D` · `CameraManager` · `FloatingRings` | 51+66+53 | R3F scaffolding, already detached (CLAUDE.md Phase 7.3 removed the Canvas) |

### The decisive detail

`CollageScene.jsx` **never loads a single real unit.** Its only outward data reference in 575 lines
is `href="/listings"` (line 299). The three "objects" are a **hardcoded array of three
`unit_type` categories** — not the 16 real units, not anything with a `position_x`.

Yet at line 163 it hands `unit_id: expanded.id` to the booking flow — where `expanded` is a *tile*,
not a Unit.

> ### So this is why it felt "مخبّص" — and it wasn't a skill problem
> The page was trying to be **three different things at once**:
> 1. **brand scrollytelling** (600vh, pinned tiles, cinematic reveal) — *marketing*
> 2. **an inventory selector** (pick the object you want) — *but wired to 3 fake categories, not 16 real units*
> 3. **a booking form** (dates, guests, submit) — *needing a real `unit_id` the scene could not supply*
>
> Your reading was right: it was **customer experience + business management + booking architecture
> fused into one surface**. The code confirms it independently.

---

## 5. What this means for the decision

**The Mountain idea is not disproven — it was never actually built.** What exists is a *backdrop* and
a *3-tile marketing animation*. The interactive "see the objects, pick one, book it" experience
never reached the code. And the two things it would need are both absent:

| requirement | state |
|---|---|
| unit images | **0/16** |
| unit coordinates (`position_x/y`) | **0/16** — column exists, never filled |
| availability API | **500 in production** |
| unit text/pricing/amenities | ✅ **complete** |

So the honest sequencing is: **content and a working availability API come before any spatial UX.**
A Mountain built today would render 16 nameless, imageless boxes at coordinate `null` and fail to
show a calendar.

### The clean separation your framing implies (stated, not decided)

```
CUSTOMER EXPERIENCE  (public)          BUSINESS MANAGEMENT  (admin)
  Property/scene view                    Units CRUD
  → pick a Unit                          Availability & pricing
  → see availability                     Bookings inbox
  → select dates → Book                  Per-unit gallery
```

The Mountain belongs **entirely on the left**, as a *tenant-specific experience template for smar* —
not as a required part of Generic. On that reading, `smar` stops being "a legacy dashboard we're
stuck carrying" and becomes **the first real tenant of a Booking vertical**, exactly as you framed it.

---

## Confirmed / Side / Unknowns

### Confirmed
1. The object is **`Unit`**; `Property` is its container; `chalet/villa/restaurant/pool` are
   `unit_type` values. `position_x`/`position_y` already exist in the schema.
2. Smar has **16 real units**, complete text/amenities/pricing, **zero images, zero coordinates**.
3. Booking and Reservation are structurally different domains (thing+date-range vs person+time-slot).
4. A well-shaped day-by-day availability contract already exists (`units.py:47`, 4 states).
5. **`/public/properties/` and `/public/units/{id}/availability` both return 500 in production.**
6. The old Mountain = a CSS backdrop + 3 hardcoded category tiles on a 600vh scroll; **it never
   touched real inventory**.
7. Phase B's deletion list **is** the Mountain artifact set — must be held.

### Side findings
- `CollageScene.jsx:22` hardcodes the **old Sydney** storage base URL — one of the stale refs Phase B
  catalogued, here in a file we now must *not* delete yet.
- CLAUDE.md still lists Phases 8–15 ("MountainBackground", "Full Mountain Pyramid orchestration,
  R3F re-integration") as pending roadmap — that roadmap predates this finding and should be
  reconciled with whatever Decision 1.5 concludes.

### Unknowns
1. **What the old Mountain looked like running** — no screenshots, no video, no recording exists in
   the repo. If you have any, they would answer *why it felt wrong visually*, which the code cannot.
2. **Why the two Booking endpoints 500** — not root-caused (out of scope for this investigation).
3. **Whether smar's units ever had images** that were lost, or never had any.
4. Whether `position_x/y` was populated at some earlier point (no migration or seed sets it).

---

## Recommendation / Decision / Execution
- **Recommendation:** before any Booking UX design, close two prerequisites — (a) root-cause the two
  500s, (b) settle the unit-image content gap. Both are blocking regardless of which experience wins.
- **Decision:** none taken. Decision 1.5 remains open pending your review.
- **Execution:** none. No file modified, nothing committed, nothing deployed.
