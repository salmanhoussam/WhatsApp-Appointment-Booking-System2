# Alzabt Section System — Layer 1 Design/Capability Contract

**Status:** Specification only — no implementation. Answers Salman's explicit request after
`ALZABT_VERTICAL_REPERTOIRE_MATRIX.md`: a per-section Design/Capability Contract for the Section
System itself (Layer 1 from `ALZABT_TEMPLATE_REPERTOIRE_MECHANISM.md`), covering every existing
section plus the two confirmed future gaps (`staff`, `credentials`). **No code, no DB, no tenant
data.** Once this is settled, the project has a real, written language for what a "site for this
business" is built out of — implementation sequencing is a separate decision, after this.

**Grounded in real code**, not invented: every `data.*` field named below was read directly from
the actual component in `frontend/src/components/dynamic-sections/`, not assumed.

---

## The capability/presentation split, stated once (governs every entry below)

Per Salman's own example: `staff` is not "show barbers." It is the capability **"present a
business's people/team."** A vertical assigns it a **label** (Barber → "Barbers," Clinic →
"Doctors," Beauty → "Artists") and, where relevant, which fields matter most for that vertical —
but the underlying component, its layout, and its data shape are one shared thing, never
forked per vertical. This split applies to every section below, not just `staff` — each entry
separates its **Capability** (what it structurally does, vertical-neutral) from its **Vertical
Labels** (what each vertical calls it and how it frames the content).

---

## Locked vs. Customizable — one rule, stated once

Applied uniformly, not repeated as a judgment call per section:

- **Always locked (Layer 1, never tenant-editable)**: internal layout, spacing, typography scale,
  image aspect ratio/treatment, responsive breakpoint behavior, animation/motion. This is what the
  Visual Quality Bar (Decision 5) actually protects — a tenant cannot degrade it by editing.
- **Always customizable (Tenant, Layer 3)**: the section's real content — text fields, images,
  counts within a bounded range, links — everything that makes two tenants in the same vertical
  look different from each other. Per-section customizable fields are listed in each entry's own
  `Data shape` row; every field there is tenant-editable by default unless the entry says
  otherwise.
- **Per-vertical (Layer 2)**: which sections exist, their tier (Required/Recommended/Optional,
  already ratified in the Matrix), and their vertical label/framing.

---

## Section Registry

### `hero`

| | |
|---|---|
| **Capability** | Establish identity and a primary call-to-action within the first viewport — the section every visitor sees first |
| **Content needed** | A title, an optional subtitle, a background image or video |
| **Data shape** | `title_ar`, `subtitle_ar`, `bg_image_url` (image or `.mp4/.webm/.mov`, auto-detected) |
| **Reads live data?** | No — fully tenant-authored content, no API fetch |
| **Vertical labels** | Same across all — "Hero" is not vertical-specific in framing, only in its actual photo/copy content |
| **Verticals & tier** | Barber: Required · Clinic: Required · Beauty: Required (per Matrix) |
| **Visual quality rule** | Real photography required for "excellent" (per Round 2's Booksy-derived bar) — a missing `bg_image_url` must degrade gracefully (solid color fallback, confirmed in code), never break layout |
| **Responsive rule** | Headline must remain readable without scrolling on mobile; video backgrounds must not block interaction |
| **Locked** | Layout, text contrast handling, the exactly-one-primary-CTA convention |
| **Customizable** | `title_ar`, `subtitle_ar`, `bg_image_url` |

### `story`

| | |
|---|---|
| **Capability** | Narrative trust-building — "who we are," optionally with quantified credibility (stats) |
| **Content needed** | A heading, body text, optional stat chips |
| **Data shape** | `heading_ar`, `body_ar`, `stats[]` (`{num, label}`) |
| **Reads live data?** | No |
| **Vertical labels** | "Our Story" (Barber/Beauty framing) vs. not typically used at all for Clinic (Matrix: Optional, Credentials carries this weight instead) |
| **Verticals & tier** | Barber: Recommended · Clinic: Optional · Beauty: Optional (per Matrix) |
| **Visual quality rule** | Body copy length should be scannable, not a wall of text; stats (if used) need consistent number/label pairing |
| **Responsive rule** | Stat chips must reflow (not overflow) at mobile width — confirmed pattern already used by Ali's real page |
| **Locked** | Layout, stat-chip styling |
| **Customizable** | `heading_ar`, `body_ar`, `stats[]` (including whether to include stats at all) |

### `featured_items`

| | |
|---|---|
| **Capability** | Present the bookable/purchasable catalog — the actual conversion content |
| **Content needed** | None authored directly in this section — it renders real, live `CatalogService` (or `CatalogItem`, per module) data |
| **Data shape** | `heading_ar`, `limit` (max cards shown) |
| **Reads live data?** | **Yes** — fetches the tenant's real catalog by `slug` at render time, not stored in `data` |
| **Vertical labels** | "Services" (Barber/Clinic framing) vs. "Services" or "Treatments" (Clinic) — label-only difference |
| **Verticals & tier** | Barber: Required · Clinic: Required · Beauty: Required (per Matrix — the one section every vertical needs identically, for its own independently-stated reason) |
| **Visual quality rule** | Name + price + duration always visible per card (per Round 3's proposal); no empty/orphaned cards when count is odd |
| **Responsive rule** | Card grid must reflow to single/double column at mobile width without cropping price/duration text |
| **Locked** | Card layout, the name+price+duration-always-visible rule |
| **Customizable** | `heading_ar`, `limit` — the actual services shown are governed by the real Reservations capability (Layer 0), not by this section's own content |

### `gallery`

| | |
|---|---|
| **Capability** | Visual proof of real, physical work/space — the section doing the heaviest "feels like a real business" lifting per Round 1's evidence |
| **Content needed** | A set of real photographs |
| **Data shape** | `heading_ar`, `images[]` (`{url}`) |
| **Reads live data?** | No |
| **Vertical labels** | "Gallery"/"Shop Photos" (Barber) vs. "Portfolio" (Beauty — before/after, real work) vs. not used by default (Clinic) |
| **Verticals & tier** | Barber: Recommended · Clinic: excluded by default, Optional at most · Beauty: **Required** (per Matrix — the clearest tier-by-vertical evidence found so far) |
| **Visual quality rule** | Real photography only (Round 1's explicit finding: this is the single most visible differentiator) — a real minimum photo count belongs here once decided (not numerically fixed in this document, deferred to the dedicated Visual Quality Bar spec named in the Matrix doc) |
| **Responsive rule** | Grid must reflow, verified at real mobile width, consistent aspect ratio maintained per image |
| **Locked** | Grid layout, aspect ratio handling |
| **Customizable** | `heading_ar`, `images[]` |

### `location`

| | |
|---|---|
| **Capability** | Practical, physical-visit information |
| **Content needed** | A short description, optional tags (e.g. "parking available"), an optional embedded map |
| **Data shape** | `heading_ar`, `para_ar`, `tags[]`, `maps_url` (embed) |
| **Reads live data?** | No |
| **Vertical labels** | Same across all verticals — purely practical, not identity-driven |
| **Verticals & tier** | Barber: Recommended · Clinic: Recommended · Beauty: Recommended (per Matrix) |
| **Visual quality rule** | The map embed (when present) must not dominate the section visually over the actual address/tags |
| **Responsive rule** | Map embed must resize, never force horizontal scroll |
| **Locked** | Layout, map embed sizing |
| **Customizable** | `heading_ar`, `para_ar`, `tags[]`, `maps_url` |

### `hours`

| | |
|---|---|
| **Capability** | Practical scheduling information |
| **Content needed** | A set of day/time rows |
| **Data shape** | `heading_ar`, `rows[]` |
| **Reads live data?** | No — **this is itself a real, confirmed gap worth naming**: `working_hours` already exists as real structured data elsewhere in `Client.config` (used by the actual booking/availability engine, Layer 0) — this section currently re-authors hours as free-text content rather than reading the tenant's real, already-configured working hours. Today's RK evidence (`hours` showing literal "قريباً") is partly *this* gap, not just an unfinished-content problem. Named here, not fixed. |
| **Vertical labels** | Same across all verticals |
| **Verticals & tier** | Barber: Recommended · Clinic: Recommended · Beauty: Recommended (per Matrix) |
| **Visual quality rule** | Should never render literal placeholder text ("قريباً") in a way indistinguishable from real configured hours — an honesty/empty-state concern, not just a visual one |
| **Responsive rule** | Row list must remain readable (not truncated) at mobile width |
| **Locked** | Layout |
| **Customizable** | `heading_ar`, `rows[]` — **recommend this section be reconsidered to read real `working_hours` data instead of free-text authoring**, a real design question for whoever picks this up next, not decided here |

### `cta`

| | |
|---|---|
| **Capability** | The explicit conversion action — "book now" |
| **Content needed** | A short prompt, optional subtext, a link target |
| **Data shape** | `text_ar`, `subtext_ar`, `link` (internal path or external URL) |
| **Reads live data?** | No |
| **Vertical labels** | "Book Now" (Barber/Beauty) vs. "Book an Appointment" (Clinic) — label-only, real difference in tone Salman named explicitly ("even CTA isn't necessarily the same shape/place per vertical") |
| **Verticals & tier** | Barber: Required · Clinic: Required · Beauty: Required (per Matrix, each independently reasoned) |
| **Visual quality rule** | Must read as the natural next step, not a bolted-on form (Round 2's Booksy-derived note) |
| **Responsive rule** | Button must remain a real, comfortably-sized tap target on mobile |
| **Locked** | Layout, button prominence treatment |
| **Customizable** | `text_ar`, `subtext_ar`, `link` — **and, per Salman's own note, its position within the page is a real per-vertical choice, not fixed** — this section is not hardcoded to always be last; the Matrix/template decides its placement per vertical |

### `testimonials`

| | |
|---|---|
| **Capability** | Social proof — third-party trust signal |
| **Content needed** | A set of quotes/reviews with attribution |
| **Data shape** | `heading_ar`, `items[]` |
| **Reads live data?** | No |
| **Vertical labels** | "Reviews" (Barber/Beauty) vs. "Patient Reviews" (Clinic — carries more real weight here per Matrix) |
| **Verticals & tier** | Barber: Optional · Clinic: Recommended · Beauty: Recommended (per Matrix) |
| **Visual quality rule** | A small, curated number shown at once (per Round 3's proposal — avoid a wall of text); real or clearly-labeled-demo attribution only, per Round 1's honesty principle (never fabricate a customer identity) |
| **Responsive rule** | Card/quote layout must reflow without truncating attribution |
| **Locked** | Layout, the small-curated-count convention |
| **Customizable** | `heading_ar`, `items[]` |

### `offers`

| | |
|---|---|
| **Capability** | Promotional/discount messaging |
| **Content needed** | A set of promotional items |
| **Data shape** | `heading_ar`, `items[]` |
| **Reads live data?** | No |
| **Vertical labels** | Not currently mapped to any of the three matrices — **zero real usage in any Reservations-type tenant today** |
| **Verticals & tier** | Barber: not in Matrix · Clinic: not in Matrix · Beauty: not in Matrix — **remains a Candidate per the Proposal's Section 1 (Option C)**, not officially adopted for this domain until a real need names it (a promo-driven vertical, if one ever gets prioritized, might; none of the three current verticals asked for it) |
| **Visual quality rule** | Not specified — no real use case to design against yet |
| **Responsive rule** | Not specified |
| **Locked / Customizable** | Not applicable until adopted |

### `categories_grid`

| | |
|---|---|
| **Capability** | Browse-by-category navigation — reads live category data |
| **Content needed** | None authored directly — live data, plus a display toggle |
| **Data shape** | `heading_ar`, `show_count` |
| **Reads live data?** | **Yes** — real categories by `slug` |
| **Vertical labels** | Not currently mapped to any of the three matrices |
| **Verticals & tier** | Same as `offers` — **Candidate, not officially adopted**. Likely a retail/restaurant-shaped need (browsing many categories) rather than a services/booking one, where `featured_items` alone already does the job — worth real scrutiny before ever adopting it for a Reservations vertical, not assumed to fit |
| **Locked / Customizable** | Not applicable until adopted |

### `video_story`

| | |
|---|---|
| **Capability** | Richer, produced narrative content — a video-based alternative/supplement to `story` |
| **Content needed** | One or more real video assets |
| **Data shape** | `heading_ar`, `videos[]` (`{url}`) |
| **Reads live data?** | No |
| **Vertical labels** | Not vertical-specific in framing |
| **Verticals & tier** | Barber: Optional · Clinic: not in Matrix · Beauty: not in Matrix (per Matrix, Barber only, and Optional there) |
| **Visual quality rule** | Real production cost (video) — not proven necessary for launch; genuinely optional, not a corner-cut |
| **Responsive rule** | Video playback must not autoplay-with-sound, must remain performant on mobile bandwidth |
| **Locked** | Player chrome/layout |
| **Customizable** | `heading_ar`, `videos[]` |

### `story_experience`

| | |
|---|---|
| **Capability** | The richest content type in the library — a scroll-scrubbed, frame-sequence cinematic narrative (same technique family as `frame-sequence-canvas`, `rules/frontend/animations.md` §5) |
| **Content needed** | An extracted real video frame sequence, or a direct video, plus chapter markers |
| **Data shape** | `video_url` OR (`frame_count`, `frame_base_url`, `native_width`, `native_height`), `chapters[]` |
| **Reads live data?** | No |
| **Vertical labels** | Not vertical-specific in framing |
| **Verticals & tier** | Not in any of the three current Matrix verticals — real production cost is high, genuinely Optional-at-most for any of Barber/Clinic/Beauty until a specific business's real budget/ambition calls for it |
| **Visual quality rule** | Highest production bar in the library by nature of the technique — this is the section most likely to look *worse* than a simple photo if done with mediocre source footage, so it should never be a default suggestion, only ever a deliberate, informed choice |
| **Locked / Customizable** | Layout/scroll-mechanics locked (per the animations rule's own frame-sequence-canvas skill); source footage/frames/chapters customizable |

---

## Future gaps — specified now, not built

### `staff` *(new — real, confirmed gap)*

| | |
|---|---|
| **Capability** | Present a business's people/team — the shared capability behind Barber's "Staff," Clinic's "Doctors," Beauty's "Artists" (Matrix's own Cross-Vertical Observation #2) |
| **Content needed** | Per person: name, photo, role/title, optional short bio |
| **Proposed data shape** | `heading_ar`, `members[]` (`{name, photo_url, role_ar, bio_ar?}`) — proposed, not implemented |
| **Reads live data?** | Open design question: should this read the real `Barber` model (Layer 0) directly, the way `featured_items` reads real `CatalogService` data, or stay author-defined content like `story`/`gallery`? **Recommend reading real `Barber` data** — a staff section listing people who aren't real bookable barbers would be misleading, and RK/Ali already have real `Barber` rows with real names. Not decided here — a real implementation-time choice. |
| **Vertical labels** | Barber → "Our Barbers" · Clinic → "Our Doctors / Specialists" · Beauty → "Our Artists" — same component, per-vertical label + which fields are emphasized (Clinic likely wants credential-adjacent bio text more than Barber does) |
| **Verticals & tier** | Barber: Recommended · Clinic: Recommended · Beauty: Recommended (per Matrix) |
| **Visual quality rule** | Real photos required for full effect (same photography principle as `hero`/`gallery`); must degrade gracefully for a staff member with no photo yet |
| **Responsive rule** | Grid must reflow at mobile width, same discipline as `gallery` |
| **Locked** | Layout, card treatment |
| **Customizable** | Per-person content, if author-defined; or nothing directly, if sourced from real `Barber` data (open question above) |

### `credentials` *(new — real, confirmed gap)*

| | |
|---|---|
| **Capability** | Present formal qualifications/trust markers — carries the trust weight `story`/`gallery` carry for Barber/Beauty, specifically for Clinic |
| **Content needed** | A set of qualifications/certifications/affiliations, optionally with issuing body |
| **Proposed data shape** | `heading_ar`, `items[]` (`{label_ar, issuer_ar?, icon_or_logo_url?}`) — proposed, not implemented |
| **Reads live data?** | No — not derived from any existing model; genuinely new, author-defined content |
| **Vertical labels** | Clinic-specific so far — no evidence yet it generalizes (a future Wellness/Spa vertical might want a "Certifications" variant, unconfirmed per the Matrix's own note) |
| **Verticals & tier** | Clinic: **Required** · Barber/Beauty: not applicable |
| **Visual quality rule** | Should read as credible/official, not decorative — likely a more restrained, list-or-badge visual treatment than the photography-forward sections |
| **Responsive rule** | Must remain legible in a single column at mobile width |
| **Locked / Customizable** | Layout locked; `items[]` content customizable |

---

## What this document does not decide

- Exact pixel/number values for the Visual Quality Bar (minimum gallery photo count, exact spacing
  scale, etc.) — named in the Matrix doc as its own future deliverable, not written here.
- Whether `staff` reads real `Barber` data or stays author-defined — flagged as a real, open,
  implementation-time question, not decided.
- The `hours` section's real-data gap (re-authored free text vs. reading real `working_hours`) —
  named as a real design question, not resolved here.
- Whether/when `staff` and `credentials` actually get built — sequencing decision, still pending
  Salman's go-ahead to start implementation at all.
