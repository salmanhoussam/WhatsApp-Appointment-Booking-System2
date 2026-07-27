# Content Capability — Architecture Review (pre-Sprint-2 gate)

Follows: Investigation Protocol (`.claude/rules/investigation-protocol.md`) — same discipline as
`BEIT_AL_FAKHAR_STORE_EXPERIENCE_REVIEW.md`, applied here to architecture instead of shopper
experience. Real re-reading of the actual current files, not a recollection of what was written —
several findings below only surfaced from that fresh reading. No code changed while producing this
review; findings are recorded, not fixed, per the same discipline used throughout this whole
Tenant OS body of work.

---

## Answering the six questions directly

**1. Is `EditableRegion` still really a Contract, or has it started growing?**

Confirmed unchanged, byte-for-byte in spirit, since it was first built: 12 real lines, still only
`registerRegion`/`unregisterRegion` in a `useEffect`, still a plain `<span data-capability
data-field-key style={{display:'contents'}}>`. Zero conditional logic, zero awareness of any
Interface. **Stable — no drift.**

**2. Has `CONTENT_FIELDS` started turning into a Registry?**

Not structurally — it's still a 2-entry plain object literal inside one component, not a class, not
a service, not imported anywhere else. But re-reading it next to `contentSchema` surfaced the real
finding of this review (below): it isn't becoming a Registry so much as it has become a **second,
parallel description of the same fields** `contentSchema` already declares, with neither reading
the other.

**3. Is the Discovery registry still simple?**

Yes — still the same 18-line `Map` wrapper. But a more important, previously unstated fact:
`discoverRegions()` — the one function that would make Discovery *useful* — has **zero callers
anywhere in the codebase** (confirmed via `grep -rn "discoverRegions" frontend/src/`). The real
click-to-edit flow built in Sprint 1 works entirely through `DynamicPage.jsx`'s click-capture
reading DOM `data-*` attributes directly — it never queries the JS registry at all.
`registerRegion`/`unregisterRegion` genuinely run (every mount/unmount of a real `EditableRegion`
calls them), so Discovery isn't dead code in the sense of never executing — but nothing yet reads
what it collects. **Discovery is simple because it hasn't been exercised, not because it has
proven itself simple under real use.** This is a real gap worth closing before trusting Discovery
the way §14 describes it (a tree any Interface can query) — right now, no Interface actually does.

**4. Are there places where the same pattern is starting to repeat?**

Yes, clearly, in a different layer than `CONTENT_FIELDS`: `content_service.py`'s two function
pairs (`update_hero_title`/`get_hero_title` and `update_story_heading`/`get_story_heading`) are
structurally identical — find a section by `type`, get/patch one `data` field, write the whole
config back — differing only in the section-type string and the field name. The same shape repeats
one level up in `content.py`'s four route handlers. This is real, not a false positive: it is
**exactly two independently-written instances of the same behavior**, which is precisely the
Abstraction Rule's own stated bar (`rules/team-roles.md`: "at least two independently implemented
production use cases demonstrate the same stable behavior") — a bar this specific duplication has
now genuinely met, unlike the frontend Registry question, which hasn't.

**5. Is there something worth extracting?**

Two real things, at two different layers, with two different honest verdicts:

- **Backend (`content_service.py`/`content.py`) — yes, extraction is earned now.** A generic
  `_get_section_field(client_id, section_type, field_name)` / `_update_section_field(client_id,
  section_type, field_name, value)` pair inside `content_service.py`, with the four existing
  named functions becoming thin wrappers (or being replaced outright). This is Service-layer
  deduplication, not a new architectural mechanism — it doesn't touch the still-deferred Dispatcher
  question.
- **Frontend (`CONTENT_FIELDS` vs `contentSchema`) — yes, but as *merging*, not as building a
  Registry.** Extend `contentSchema`'s existing per-key entries with the three fields
  `CONTENT_FIELDS` adds (`sectionType`, `dataField`, `apiPath`), and delete `CONTENT_FIELDS`
  entirely, reading everything from `contentSchema` instead. This removes real, present
  duplication without introducing any new abstraction layer — it's the difference between "stop
  maintaining two descriptions of two fields" (safe, small, do now) and "build a Schema Registry
  service" (still premature — see below). These are not the same move, even though they sound
  adjacent.

**A judgment call flagged rather than decided here**: whether `content.py`'s four route handlers
should also collapse into one generic `PATCH /content/section-field` endpoint taking
`{section_type, field_name, value}` is a real option, but it edges directly into the Operation-
execution Dispatcher question §1a/Q7 explicitly deferred until a second real Capability proves the
routing shape repeats. Content alone reaching this point is arguably not yet that second
Capability — this is a real decision for the same explicit review process the Dispatcher question
already went through once, not something to fold in silently here.

**6. Is a Schema Registry justified yet, or still premature?**

Still premature, by your own explicitly-stated bar — 2 entries is not "hard to maintain." Agreed,
unchanged from the ratified Gate. The merge described above (point 5) is a real, worthwhile move
available *right now*, but it is explicitly **not** the Schema Registry — it's the same plain
object, just not duplicated into two.

---

## Side Findings (real, minor, not architecture concerns)

- Three stale comments, all from Sprint 1's first pass, now inaccurate after the second field
  landed: `discovery.js` ("only one real registration... exists"), `schemas/content.js` ("Sprint 1
  scope: hero.title only"), `content.py`'s module docstring ("Sprint 1 scope only (Hero Title)").
  Harmless, but exactly the kind of small drift worth fixing whenever these files are next touched
  for a real reason, rather than as its own commit.

## Unknowns

- Whether Media's real Operations (`ReplaceMedia`, and possibly `Crop`/delete) can be expressed
  through the *same* `EditableRegion`/Discovery/click-capture shell Content used, or whether image
  operations need a materially different interaction pattern (e.g. a file picker can't be triggered
  by a synthetic click the same way a text prompt can) is genuinely untested — Sprint 1 only ever
  exercised the `UpdateField` Operation type. This is precisely why Media, not a second text field,
  is the right next test, per your own reasoning below.

---

## On the proposed Sprint 2 ordering

**Content (done) → Media → Site Configuration → Catalog → Theme → Orders → Customers → AI** — this
holds up against the real Architecture Integrity Findings (`TENANT_OS_PLAN.md` §19), not just
intuition:

- **Media** is currently **Experimental** maturity, **Missing Architecture** (no dedicated service
  at all — real only inside Booking's unit-gallery context today). Building it next closes a real
  finding the same size and shape as Content's was, and — the sharper reason — it is the first test
  of an Operation type besides `UpdateField`. Sprint 1 proved the Engine generalizes across
  *fields*; Media is the first real test of whether it generalizes across *Operation types*, which
  is a genuinely different, harder claim than "a second text field worked."
- **Site Configuration** next is the original Broken-Architecture finding this whole thread started
  from (`client_service.py` exists, `settings.py` bypasses it) — real, contained, well-understood
  by now.
- **Catalog last among the "easy" ones** is the right call: its Duplicate-Architecture finding is
  the riskiest to close (migrating `store.py`/`restaurant.py` off `admin_catalog_repo` touches live
  route files serving real tenants), and by the time Media + Site Configuration are done, two more
  independent real cases will exist to de-risk exactly that migration.
- **Orders, Customers, then AI last** matches the plan's own stated logic throughout — AI is an
  Interface that consumes whichever Capabilities already exist cleanly, not a Capability to build
  toward on its own schedule.

No changes recommended to this ordering — it is well-grounded in the real findings already on
record, not just directionally reasonable.
