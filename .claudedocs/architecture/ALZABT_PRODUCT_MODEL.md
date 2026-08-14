# Alzabt Product Model — What Alzabt Actually Is

**Status:** Understanding document, not a locked decision. Written 2026-08-14 per Salman's
explicit instruction, as round 1 of a deliberately separated 3-round sequence: (1) understand and
record what Alzabt *is* as a product — this document — (2) decide what a Business Home should be,
(3) build the barbershop reference for real. **This round is documentation only** — no UI, no DB,
no tenant data, no new template, no refactor, no implementation. Its job is to stop the next
rounds from drifting back into "just fix Ali's page," which is a narrower question than the real
one.

**Relationship to existing docs** (this file doesn't replace or duplicate them):
- `.claudedocs/implementation/ALZABT_MASTER_PRODUCT_PLAN.md` — the standing *execution* reference
  (rollout priority, visual system, Section K steps). That document assumes the reader already
  knows what Alzabt is; this document is what should be read *before* it.
- `.claudedocs/architecture/TEMPLATE_ROADMAP_VISION.md` (2026-07-20) — an earlier, generic
  "Restaurant → Store → Clinic" vertical-template sequencing vision, written before Alzabt existed
  as a named product. Same underlying instinct (verticals need their own shape, not one shared
  template), never connected to the Reservations capability specifically until now.
- `.claudedocs/evolution/reservation-capability.md` — the Reservations capability's own
  accumulating technical understanding (backend/data model). This document is the *product-level*
  counterpart — what the capability is *for*, not how it's built.
- Today's real browser audit of RK/Ali/`alzabt-demo` home pages (same session) is the concrete
  evidence base for this document's "Ali as reference case" section below — not re-derived here,
  cited where relevant.

---

## 1. What Alzabt Is (Corrected Mental Model)

**Alzabt is not a Barber product.** The mental model this document exists to correct:

> ❌ "Alzabt is a booking platform for barbershops."
> ✅ **"Alzabt is a SaaS platform that lets any business built around services + staff +
> appointments + bookings get its own branded presence and its own booking experience."**

Barber is the **first real vertical** — proven, working, real revenue-shaped data flowing through
it (RK). It is evidence that the underlying capability (Reservations: services, staff,
availability, booking) works for one real business shape. It is **not** the definition of the
product, and nothing about the platform's architecture should assume "barber" as a permanent
constant.

```
Alzabt SaaS
│
├── Barber business       → branded business website + services + staff + booking
├── Beauty / Makeup       → branded business website + services + staff + booking
├── Clinic                → branded business website + services + staff + booking
└── (future verticals)    → their own appropriate experience
```

A `/{slug}` tenant is **the real business website Alzabt builds for that specific customer** — not
a copy of a shared template with a different accent color and a different name substituted in.
Today's implementation gets partway there (real per-tenant content sections, real per-tenant
`primary_color`) but the *thinking* behind it has been vertical-blind — this document is the
correction, not yet the fix.

---

## 2. Two Layers, Never Conflated

This is the single most load-bearing distinction in this document — every other section depends on
keeping these two layers separate in language, in code organization, and in how future work gets
scoped.

### Layer 1 — Alzabt itself (the SaaS product)

Everything that exists *once*, platform-wide, regardless of how many tenants exist or what
vertical they're in:

- Marketing (`/alzabt`, root Product Showcase Home)
- Demo Builder (`/demo-builder`) — the mechanism that provisions a tenant, not a tenant itself
- Onboarding / tenant provisioning
- Platform capabilities (Reservations, Catalog, Store, ...) — the shared engine
- Future: discovery / marketplace possibilities (Section 7)

### Layer 2 — a Tenant (a real business using Alzabt)

Everything that must feel like it belongs to *one specific real business*, not the platform:

- Identity (name, story, tone of voice)
- Branding (`primary_color`, typography choices within the shared design language, photography)
- Services, staff, availability
- Location, hours
- Business-specific content (what this business wants a visitor to know before booking)
- The booking experience itself, as *this business's* booking flow, not "Alzabt's booking form
  embedded in a page"

**The test for every future decision**: does this belong to Alzabt (built once, shared, invisible
to which vertical a tenant is in) or to the Tenant (must differ per business, and often per
vertical)? A decision that's unclear on this axis is the single most common source of the exact
drift Salman is trying to prevent by splitting this into 3 rounds.

---

## 3. The Role of Tenant Home

`/{slug}` (rendered today by `DynamicPage.jsx`, sections-driven from `Client.config.content`) is
**not a dashboard, not a generic SaaS landing page, and not "the tenant's admin tool's public
face."** It is the **first real thing a customer of that business sees** — the same job a real
business's own website does. A visitor landing there should feel like they arrived at *that
barbershop's* (or *that clinic's*) real site, with booking as the natural next action — not like
they arrived at a demo of booking software that happens to be skinned in that business's color.

This reframes what "good" means for a Tenant Home: it is not measured against "does this look like
a polished admin panel," it's measured against "does this look like a real, specific business
would trust putting this in front of their own customers." Today's `booking_showcase` template
(built for hotels/chalets, currently carrying RK's real barbershop content — see Section 6) proves
the *mechanism* can produce something that reads as real. It does not yet prove the *product*
reliably produces that outcome for every vertical without a human doing careful manual content
work each time.

---

## 4. Shared Capabilities vs. Vertical-Specific Experience

Two different kinds of "shared" already exist in this codebase, and they should stay conceptually
separate even though both are labeled "shared":

| | Shared **Capability** (Layer 1) | Vertical-appropriate **Experience** (Layer 2, varies) |
|---|---|---|
| What it is | The engine: `Barber`, `CatalogService`, `Reservation`, availability logic, `client_services` gating | The *shape* of the Tenant Home built on top of it |
| Changes per tenant? | No — same models, same API, same admin dashboard mechanics | Yes — which sections exist, their order, their content |
| Changes per vertical? | Rarely — a Clinic's "staff" are still `Barber` rows, a "service" is still `CatalogService`, structurally | Often — a Clinic's Tenant Home likely needs different sections than a Barber's |
| Example | The exact same `POST /reservations/` endpoint powers RK, Ali, and any future Clinic tenant | RK's real page currently uses Hero → About → Services → Products → Hours → Location → CTA; a Clinic might reasonably need Hero → Story → Doctors/Specialists → Services → Insurance/Policies → Location → Booking instead |

**The capability (Reservations) staying shared across verticals is correct and should not change.**
What should NOT be assumed is that the *page structure* built on top of that shared capability
must also be identical across verticals. Today's `page_templates/` (`booking.json`,
`restaurant.json`, `store.json`) already prove the project accepts vertical-specific page shapes
for *other* capabilities — Reservations/Barber has simply never had its own native one yet (the
`barbershop_demo` template built for Ali today is the first attempt, explicitly informal, not a
finished vertical template — see Section 6).

---

## 5. How to Think About Templates Without Making Them Identical

The risk this section names explicitly, because it's the easiest way for the next two rounds to
quietly re-introduce the exact "generic tenant template" thinking Salman is correcting here: a
"template" must not become synonymous with "one fixed page structure every tenant of that vertical
gets, differing only in text and color." That is exactly the trap of treating Ali as "a badly
skinned RK" instead of its own reference case.

A healthier frame, consistent with how `page_templates/*.json` already work (`_meta` + `sections`
array, sections addressable/reorderable/optional):

- A **vertical** (Barber, Beauty, Clinic, ...) suggests a **repertoire of section types** that
  tend to be relevant to businesses of that shape — not a fixed page.
- A **specific business** picks, orders, and fills in the sections that actually fit them from
  that repertoire (and the repertoire itself should be extensible, not a closed list).
- Example, stated by Salman directly: a Barber might reasonably want `Hero → Story → Services →
  Barbers → Gallery → Hours → Location → Booking`. A different business — even within the same
  broad vertical — might not need all of those, or might need them in a different order, or might
  need one this list doesn't have yet (e.g. a Clinic likely wants "Insurance accepted" or
  "Specialists," which a Barber never would).
- **Do not assume every vertical needs the same page.** This is stated explicitly because it's the
  single easiest wrong shortcut available to future rounds under time pressure.

---

## 6. How Branding / Imagery / Content / Sections Actually Differentiate a Tenant

Today's real evidence (this session's browser audit of RK, Ali, `alzabt-demo`) shows every layer
of differentiation this section describes, both working and failing, concretely:

- **Branding (`primary_color`)** — real and working (RK's teal-slate, Ali's navy) — but evidence
  shows color alone is *not* what makes a page feel like a real, specific business. Ali's page has
  a distinct, confident color and typography treatment and still reads as unfinished/generic,
  because the deeper layers below are thin.
- **Imagery/photography** — the single most visible differentiator in today's evidence. RK's page,
  with 3 real interior/product photos, reads as an established, real place within the first 5
  seconds. Ali's page, with zero photography anywhere, reads as a demo despite having a
  confident, original hero and story copy. This is strong, direct evidence that photography (or a
  deliberate, well-executed *absence* of it — a different design choice, not simply "none") is
  doing real work in whether a Tenant Home reads as a real business.
- **Content depth and completeness** — RK has real copy across 6+ sections; Ali has real copy
  across only 2 (the rest either unbuilt or broken); `alzabt-demo` has none. Depth alone isn't
  sufficient either — RK's real content sits inside a page with severe unstyled spacing gaps
  between sections, and two of its sections ("Hours," "Location") are live with literal "قريباً"
  placeholders despite being a real production tenant. **Both dimensions matter independently**:
  how much real content exists, and how well the existing content is actually presented.
  Completeness without polish reads as unfinished; polish without completeness reads as empty.
- **Section choice and order** — not yet tested as an independent variable, since no vertical
  other than "generic barbershop" has a real page built yet. This is exactly what Round 2 (What
  should a Business Home be) needs to establish deliberately, not inherit by accident from
  whichever template happened to get reused first (RK inherited a hotel template's shape; this
  should be a deliberate choice for future verticals, not an artifact of what was available).

**Ali should be read as the first real reference case for this question, not a broken tenant to
patch.** What it currently proves: a confident hero + real original copy is a strong start, but a
Business Home that stops after 2 sections, with a broken services section and no imagery, does not
yet cross the bar of "a customer would trust this is a real business." What's still open is
*exactly* how many sections, which kinds, and how much photography is the real minimum bar — that
decision is explicitly deferred to Round 2, not decided here.

---

## 7. Future: Marketplace / Discovery Layer (Not Now)

Booksy (and comparable barber/salon marketplace products) are useful specifically because they
show what a **future, separate product layer** could look like on top of Alzabt, once many real
tenants across many verticals exist: a discovery/marketplace surface with categories —

```
Barber · Hair · Makeup · Skin care · Wellness · Clinics · ...
```

— letting a visitor browse/discover businesses by category, the way Booksy's own directory works.
**This is out of scope for all three of the currently planned rounds.** It's recorded here only so
a future session understands *why* Booksy is a relevant reference at all, and doesn't mistake "we
looked at Booksy" as an instruction to build a directory now. The current, real product surface a
visitor reaches Alzabt through is still `/demo-builder` (pick a vertical → get your own tenant) and
each tenant's own `/{slug}` — not a shared cross-tenant discovery page. Nothing about today's
architecture should be built in a way that *precludes* a future discovery layer, but nothing should
be built *for* it yet either — that would be designing for a hypothetical, which this project's own
Abstraction Rule (`rules/team-roles.md`) already argues against.

---

## 8. Using Booksy / Barber-Salon References Without Copying Them

The reference images Salman provided (Booksy and comparable barber/salon marketing + booking
sites) should be read as **quality and craft references** — the level of visual storytelling,
composition, and polish a real Business Home should reach — not as a page structure to clone.
Concretely:

- **Use them to calibrate**: photography quality/composition, how confidently a hero establishes
  identity in the first few seconds, how services are presented (visually, not just as a price
  list), how a booking CTA is made to feel like a natural next step rather than a bolted-on form.
- **Do not use them to dictate**: the exact section list, the exact order, the exact visual style
  (color, type, layout system) — those must come from Alzabt's own design language and from what
  a *specific tenant's* business actually needs, not from imitating a specific competitor's
  specific product.
- This mirrors exactly how the original 7-image Setmore/Calendr/Bookly/etc. reference set was
  already used for the Calendar redesign earlier this session (Alzabt Master Product Plan, Section
  C/D) — "reference for direction, not literal copy" — extended here to the Business Home
  question instead of the admin Calendar.

---

## 9. Open Questions / Future Decisions

Stated explicitly as open, per Salman's own instruction — nothing below should be treated as
decided by virtue of being written down here.

1. **What is the actual minimum section repertoire for the Barber vertical specifically?** Section
   5 names a plausible example (`Hero → Story → Services → Barbers → Gallery → Hours → Location →
   Booking`) but this was Salman's illustrative example, not a ratified list. Round 2's job.
2. **Does every tenant need real photography, or is there a legitimate photography-free design
   direction** (strong typography + color + motion, no images) that can still clear the "feels
   like a real business" bar? Ali's current page suggests photography-free is not yet sufficient
   as currently executed, but it's untested whether a *deliberately* photography-free design
   (rather than an accidentally empty one) could work.
3. **How many verticals get their own dedicated section repertoire vs. share one with minor
   variation?** E.g., does Beauty/Makeup genuinely need a different shape than Barber, or are they
   close enough to share one "personal grooming services" template family?
4. **Where does vertical selection actually happen in the product?** Today only Barber exists as a
   real, working `business_type` in `/demo/create`'s seeding logic and in the Demo Builder. Whether
   future verticals get their own dedicated onboarding path, or a shared "select your vertical,
   then Alzabt configures the right section repertoire" flow, is undecided.
5. **Who authors a real tenant's content in production** — is real photography/copy something
   Alzabt captures from the business owner during onboarding, something a future AI-assisted
   content step generates from a short business description, or purely manual? Not addressed by
   this document at all; a real open question for whenever a *real*, non-demo tenant onboards
   through the self-registration flow (already known broken/deferred — Onboarding Audit,
   2026-08-12).
6. **Should the existing `booking_showcase` (hotel/chalet) template that RK currently runs on stay
   as-is, get renamed/reclassified once a real Barber-native template exists, or get migrated?**
   Not decided — today's audit found RK's *content* is genuinely good despite the mismatched
   template name; whether that's a real problem worth migrating away from, or a harmless historical
   artifact, is exactly the kind of question Round 2 should answer with evidence, not assumption.

---

## Summary (for the short readback Salman asked for)

Alzabt is the SaaS platform; Barber is its first proven vertical, not its definition. A tenant's
`/{slug}` page is that business's real website, not a recolored template — its job is to make a
real customer trust they've landed on a real, specific business, not a demo. Shared Reservations
capability (Layer 1) should stay shared across every future vertical; the Business Home built on
top of it (Layer 2) should not be assumed to look the same across verticals, or even necessarily
across two businesses in the same vertical. Ali is the first honest reference case for what's
still missing to clear that bar — not a broken tenant to patch. Booksy and comparable sites are
craft/quality references, not structures to copy, and any future discovery/marketplace layer is
explicitly out of scope for now. Five real open questions are named above rather than guessed at.
