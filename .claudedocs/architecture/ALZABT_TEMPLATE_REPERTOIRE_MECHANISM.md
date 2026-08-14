# Alzabt Template Repertoire — How the SaaS Actually Builds Different Sites Per Sector

**Status:** Round 2 of 3 — architecture/mechanism understanding, still not a locked decision.
Answers Salman's direct question: *"How should Alzabt, as a SaaS, actually be able to build
genuinely different sites for different sectors, while keeping shared capabilities?"* This
document proposes the **mechanism**. It does **not** decide the actual repertoire (which section
types belong in a Barber template vs. a Clinic template) — that decision is explicitly Salman's,
next, after reading this. No code, no DB, no tenant data touched.

**Reads after**: `.claudedocs/architecture/ALZABT_PRODUCT_MODEL.md` (Round 1 — what Alzabt *is*,
the platform/tenant distinction, the "don't assume one page per vertical" principle). This
document is the "how" for that document's Section 5.

---

## 1. The real, existing mechanism — more built than assumed

Before proposing anything, the actual current code changes the starting picture in a genuinely
good way. Checked directly, not assumed:

`Client.config.content = { template_key, page_type, sections: [...] }`, rendered by
`DynamicPage.jsx` via a **section-type registry** (`SECTION_MAP`, `frontend/src/pages/generic/
normal/DynamicPage.jsx:55-67`) that already maps **12 real, built section components**:

```
hero · story · featured_items · categories_grid · gallery · location ·
cta · offers · testimonials · hours · video_story · story_experience
```

Each is a real file under `frontend/src/components/dynamic-sections/`. This means the **shared
component library** — the thing every vertical and every tenant draws from — already exists and
is more capable than either RK's or Ali's current page suggests. RK uses 6 of these 12; Ali's
`barbershop_demo` template (built this same session) used only 4. **The gap is not "we need to
build a section library" — it mostly already exists. The gap is that no one has yet deliberately
curated which of these 12 already-real types make a genuinely good Barber (or Clinic, or Beauty)
page, and populated them with real content.** This is a materially more encouraging starting point
than "build a template system from scratch."

**A correction to today's earlier review, now that I've read the actual code**: I flagged Ali's
"cta" section as *likely not rendering/not a supported type* — that was wrong, or at least
unverified with the wrong evidence. `cta` **is** a real, registered type (`CtaSection.jsx`, real
`<h2>` heading). Why it didn't show up in this morning's heading extraction for Ali specifically is
still an open, small, real detail — but it is not evidence the section-type mechanism is broken.
Correcting this now rather than letting it stand — worth a direct look whenever Ali is actually
rebuilt (Round 3), not chased here.

---

## 2. The three-layer mechanism (the actual answer to "how")

```
Layer 1 — Section Component Library      (Alzabt, built once, vertical-agnostic in code)
   hero · story · gallery · staff/team* · services · hours · location ·
   testimonials · offers · cta · video_story · ...
              │
              ▼
Layer 2 — Vertical Template              (Alzabt, curated per sector — the "repertoire")
   a named preset: WHICH of Layer 1's section types this kind of business
   typically needs, in what order, with sensible defaults
   e.g. barbershop.json, clinic.json, beauty_salon.json  (naming illustrative, not decided)
              │
              ▼
Layer 3 — Tenant Instance                (the real business, differs even within one vertical)
   the specific business's own real photography, real copy, real services/
   staff, and its own choice of which Layer-2-suggested sections to actually
   keep, reorder, or drop
```

*(`staff/team` is not yet in the registry — named as an example of a plausible future Layer-1
addition, not a decision made here.)*

**Layer 1 is Alzabt's shared capability, in the SaaS-architecture sense** — built once, reused by
every vertical and every tenant, exactly like the Reservations booking engine already is. A
`GallerySection` doesn't know or care whether it's showing barbershop interior photos or a clinic's
waiting room — same component, different content.

**Layer 2 is where "different sectors get different sites" actually lives.** A vertical template
is nothing more than a curated `sections: [...]` preset — the *same* JSON shape
`scripts/data/page_templates/*.json` already uses for restaurant/store/booking, applied to
Reservations verticals for the first time. This is real, proven infrastructure (`seed_page_content.py`
already reads exactly this shape) — not a new system to invent.

**Layer 3 is what actually makes two tenants in the same vertical feel different from each other**
— per Round 1's own finding, color alone doesn't do this; real photography, real copy, and a
business's own deliberate section choices do. This is also why a template must stay a *starting
point*, never a locked structure a tenant is stuck with (Round 1, Section 5).

---

## 3. What this leaves completely untouched — the "shared capabilities" half of the question

Nothing about this mechanism touches, forks, or duplicates:
- The Reservations data model (`Barber`, `CatalogService`, `Reservation`, `BarberService`)
- The booking API / availability engine
- The admin dashboard (Calendar, Reservations, Staff, Services tabs)
- `client_services` gating, auth, multi-tenancy isolation

All of that is **Layer 0**, beneath even the Section Component Library — the actual business logic
every vertical shares identically. A Clinic's "staff" are still `Barber` rows; a Beauty salon's
"services" are still `CatalogService` rows. The template repertoire mechanism operates entirely in
the **public-facing presentation layer** (`Client.config.content` + `DynamicPage.jsx`) and never
needs to know or care what's happening in the booking engine underneath it. This is the concrete
answer to "how do we build different sites while keeping shared capabilities" — the sharing
happens at Layer 0 (data/booking) and Layer 1 (component code); the *difference* happens at Layer
2 (curation) and Layer 3 (real content) — four clearly separated layers, not one blurred system.

---

## 4. The Booksy reference — where it actually applies in this mechanism

The screenshot Salman sent (`booksy.com/en-us/s/barber-shop`) does two distinct jobs, and it's
worth being precise about which:

1. **A visual quality bar for Layer 1** — the shared Hero/Gallery/photography treatment on that
   page (confident headline, real editorial-quality barber photography, generous whitespace,
   clear search/booking affordance) is exactly the bar the *shared section components themselves*
   should be held to. Since Layer 1 is shared across every vertical and every tenant, raising its
   quality raises the floor for all of them at once — this is real leverage, not per-tenant work.
   Concretely: if `HeroSection`/`GallerySection` are visually weak, no amount of vertical curation
   or real content fixes that; if they're strong, every tenant benefits automatically.
2. **A real naming reference for future verticals** (not a build target now) — Booksy's own
   category nav in that screenshot: `Hair · Barber · Nails · Skin care · Brows and lashes ·
   Massage · Makeup · Wellness and spa · More...`. Useful, real-world evidence for *what sectors
   this market actually organizes itself into*, worth having on hand whenever Salman decides which
   verticals Alzabt actually pursues next — not a signal to start building a directory now, per
   Round 1, Section 7.

**Not adopted from Booksy**: the discovery/search-bar page structure itself, the marketplace
concept, or the assumption that every vertical needs the same page shape Booksy gives every
barbershop listing. Those remain explicitly out of scope (Round 1, Section 7/8).

---

## 5. What happens after Salman decides the repertoire (naming the shape, not writing it yet)

Once Salman picks the actual repertoire (which Layer-2 templates to build first, and which Layer-1
section types each one uses), the execution work this mechanism implies is small and concrete —
named here only so the shape is visible, not written as prompts yet, per instruction:

1. Confirm/extend the Layer 1 registry if a decided repertoire needs a section type that doesn't
   exist yet (e.g. a `staff`/`team` section, if barbers/doctors/stylists need a dedicated
   presentation different from how `featured_items` presents services).
2. Author the Layer 2 template JSON (`scripts/data/page_templates/{vertical}.json`) — the same
   mechanism already used for restaurant/store/booking, applied to the decided vertical.
3. Apply it to a real reference tenant (Round 3's actual barbershop-reference work) — with real
   content, real photography per Round 1's evidence, not placeholder text.

---

## 6. Open Questions carried forward from Round 1 that this document doesn't resolve

Unchanged from `ALZABT_PRODUCT_MODEL.md`'s own Section 9 — this document proposes a mechanism, it
doesn't answer which sections a Barber vs. Clinic vs. Beauty template should actually contain, how
many verticals get their own dedicated repertoire vs. share one, or whether photography is a hard
requirement. Those stay Salman's decision, next.
