# RK Barber Shop — Tenant Verification

Copied from `tenant-verification-template.md`, this project's first real use. Real business name
found via investigation (below), not asked — confirmed **"RK Barber Shop"** (English) from the
logo watermark embedded in one of the tenant's own uploaded videos.

**Tenant:** slug `hr` (confirmed by Salman) — **WhatsApp:** `96176985477` (confirmed) —
**Date:** 2026-07-23 — **Status:** Phase 0 (Tenant Discovery) in progress, no code/DB changes yet.

## 0. Phase 0 — Tenant Discovery (real investigation, per Salman's explicit instruction)

**The 3 videos — classified by actually downloading and extracting real frames, not guessed from
filenames**, per `curl` from the real Supabase `properties/RK Barbar/` folder:

| File | Real specs | Content (from actual extracted frames) | Role |
|---|---|---|---|
| `WhatsApp Video 2026-07-22 at 02.01.14.mp4` | 24.2s, 464×832, 5.07MB | Hand opening the shop's glass entrance door, then panning across product shelves (hair sprays, gels, branded caps) and a styling station — casual phone-shot, no logo | **Shop/Storefront Intro** |
| `WhatsApp Video 2026-07-22 at 02.01.24.mp4` | 13.1s, 464×832, 2.65MB | Close-up panning across product shelves — "Elegance" brand sprays/gels, a photo of the barber on the shelf, the barber-pole light fixture | **Products Close-up** |
| `WhatsApp Video 2026-07-22 at 02.01.45.mp4` | 18.1s, 576×1024 (higher-res), 3.78MB | Wide cinematic shots of the full shop interior — multiple premium leather barber chairs, arched mirror decor, ceiling lighting, barber pole — **carries a real "RK Barber Shop" logo watermark** (crown icon) throughout | **Premium Shop Showcase — confirms the real business name** |

Matches Salman's own predicted classification almost exactly, refined by real evidence: video 3 is
better described as a *premium full-shop* showcase (not specifically "products") — the thing that
actually distinguishes it is production quality + the embedded logo, confirmed by frame content, not
assumed from file size alone.

**Real architecture question this raised, investigated before asking anyone**: does putting all 3
videos on the page fit existing architecture, or does something new need building?
- **Hero**: video 3 (the premium, logo-bearing one) is the natural Hero — this is exactly Sprint
  2's existing `ReplaceMedia`/`hero.bg_image` shape (one video, autoplay background). **No new
  architecture needed for the Hero.**
- **The other 2 videos (shop-tour, product close-up)**: checked `GallerySection.jsx` directly —
  its real data shape is `{ heading_ar, images: [{url, caption_ar}] }`, **images only, no video
  support at all** (confirmed by reading the component, zero `video`/`mp4`/`isVideo` references
  found). No existing section/Capability handles "gallery videos" today.
- **Decision (per the Abstraction Rule — one real case doesn't justify a new shared Capability
  yet)**: do not extend `GallerySection.jsx` or invent a new "Video Gallery" Capability for this
  first case. Build a small, tenant-specific "Our Shop" section for RK Barber Shop only (matching
  how beit-al-fakhar's bespoke sections work), holding these 2 videos directly. If a second real
  tenant later needs the same thing, *that's* the point to consider a shared Capability — not now.

**Confirmed via `SERVICE_TYPE_MAP` (`app/core/services.py`)**: no existing `service_type` combines
`booking` + `catalog` — `"real_estate"`/`"hotel"` seed booking only, `"restaurant"`/`"ecommerce"`
seed catalog-ish only, `"services"` seeds `["catalog"]` only. This tenant needs both. Resolution:
seed a new explicit service list for this tenant directly (`["booking", "catalog",
"whatsapp_ordering"]`) rather than forcing an existing `service_type` preset — not a schema change,
just the first real tenant not matching any preset's assumption of "one module only."

**Booking complexity (confirmed by Salman)**: simple — one service type, no staff picker, but the
Admin Dashboard needs a **calendar** view so the owner can see upcoming client bookings.

**Correction — first claim here was wrong, caught before it stood as fact**: initially wrote that
a calendar view already exists; actually reading `ReservationsTab.jsx` (552 lines) disproves that
— it's a **table/list view** (status badges — `pending`/`confirmed`/`arrived`/`cancelled`/
`no_show` — with forward-only status transitions and pagination), not a calendar. **Real gap
confirmed**: no calendar view of reservations exists anywhere in the admin dashboard today. This
is either new work for this tenant (a real UI feature, not an architecture change — reservations
data already exists via `app/api/v1/admin/reservations.py`, only a calendar *rendering* of the same
data is missing) or the existing table view is accepted as the MVP and a calendar is a named
follow-up — flagged for a decision during actual development, not resolved here.

---

## 1. What Made This Tenant Different

A real combination not previously exercised in this codebase: simple appointment **Booking** +
a service/product **Catalog** display + **WhatsApp** contact, all in one tenant, plus 3 real
uploaded videos (only 1 of which is actually a Hero problem — see §0). beit-al-fakhar was a pure
showroom/store (Catalog + WhatsApp, no Booking); this is the first tenant needing Booking and
Catalog together.

## 2. Architecture Questions Raised During the Build

| Question asked | Answer found |
|---|---|
| Does `SERVICE_TYPE_MAP` have a preset combining `booking` + `catalog`? | **No.** Seed this tenant's `client_services` explicitly (`["booking", "catalog", "whatsapp_ordering"]`) rather than via any existing `service_type` preset — see §0. |
| Is the 3-video Hero Sprint 2's plain `ReplaceMedia`, or something new? | **Plain `ReplaceMedia`, one video** (video 3) — the other 2 videos are not a Hero problem at all, see §0. |
| Do the non-Hero videos need a new shared Capability (a "Video Gallery")? | **Not yet** — build tenant-specific for this first case; revisit only if a second tenant needs the same thing (Abstraction Rule). |
| Does a reservations calendar view already exist? | **No — real gap confirmed**, not assumed. Data exists (`app/api/v1/admin/reservations.py`), only a calendar rendering is missing. Open decision: build now vs. defer, see §0. |
| Did we need to modify an existing ADR or Principle? | Not yet — none of the above required touching `TOS-002`, `ADR-0003`, or any Principle; all fit within existing Capability boundaries. |
| Was a file's planned location wrong, or was the Implementation Contract incomplete for this case? | Not yet observed — too early, still Phase 0. Will be re-checked once real development starts. |

## 3. Navigation Check (real, timed)

Per the same discipline added to every ADR-0003 migration phase — not "was the right file
technically reachable," but "how long did it actually take, for real, during this build":

- Time to find the relevant Capability's Contract: ___
- Time to find the relevant Principle (if any applied): ___
- Any point where you gave up searching and re-read the whole old plan/mega-doc out of habit
  instead of the new structure? (If yes, that's a real finding, not a personal failure — name it.)

## 4. Confirmed Findings

Real, evidenced things this build proved or disproved about the architecture — grounded in what
actually happened, not what should have happened.

## 5. Side Findings

Real things noticed along the way that aren't the point of this review (dead code, a naming
collision, tech debt) — named as side findings explicitly, not folded into the main narrative.

## 6. Unknowns

What genuinely still needs Salman, after real investigation resolved everything discoverable:
- **Arabic business name** — the video's logo watermark only confirms the English name ("RK Barber
  Shop"); no Arabic name found in any real artifact. Not guessed.
- Whether to build a reservations calendar view now (real gap, §0) or accept the existing table
  view as MVP for this tenant and defer the calendar as a named follow-up.
- Real service list + prices — per Salman, the owner adds these via the Dashboard directly; no
  real data seeded now beyond a minimal empty/starter catalog structure.

## 7. Verdict — Does the Architecture Need to Change?

- [ ] No — the architecture held, as-is, for this real case.
- [ ] Yes — Capability Contract(s) affected: ___
- [ ] Yes — ADR(s) affected: ___
- [ ] Yes — Principle(s) affected: ___
- [ ] Yes — the Implementation Contract's own template/structure needs a change: ___

If any "Yes" is checked, the actual edit happens as its own follow-up, referencing this Review as
the evidence — this document itself is never edited afterward to reflect the fix (same immutability
rule as every other Review).
