# Phase 3 Discovery — Does Self-Registration Actually Have Enough Data?

**Status:** Discovery only. **No code.** Answers Salman's 6 named questions with real evidence,
then stops at a real, confirmed gap rather than inventing data to close it — per his own explicit
instruction. No "smallest contract" is proposed yet, because the honest answer below is that one
of its two required inputs doesn't exist in the current flow at all.

**Note carried forward, not reopened**: per Salman's own instruction, the two defaults kept inside
`provision_barber_domain()` (category label, working hours) stay documented as temporary,
low-stakes defaults — not re-litigated here, not treated as settled precedent for this round's
much bigger question.

---

## 1 & 2. Where does `barber_name` come from? Do we have a real name, or only a business name?

`TenantRegisterPage.jsx`'s entire form, confirmed by direct read — exactly 6 fields, none of them
"barber name" or "staff name":

```js
{ business_name, owner_name, slug, email, password, whatsapp_number }
```

**Real answer: neither a dedicated barber name nor certainty — only a plausible proxy.**
`owner_name` is the one field that could stand in for it, but it means "the person who
self-registered this account," not "the person who will actually cut hair." For a real one-person
barbershop these are very often the same person — but that is an **assumption**, not a fact
collected anywhere in the flow. No question anywhere asks "who is your first staff member."

## 3 & 4. Where do `services` come from? Are the 6 demo services an appropriate default?

`template.seedCategories` for `beauty-barber` — confirmed, the **only** service-shaped data self-
registration ever collects:

```js
[
  { name_ar: 'قص شعر',     name_en: 'Haircut' },
  { name_ar: 'حلاقة لحية', name_en: 'Beard Trim' },
  { name_ar: 'علاجات شعر', name_en: 'Hair Treatments' },
  { name_ar: 'باقات',      name_en: 'Packages' },
]
```

**These are category labels, not `CatalogService` rows** — confirmed by re-reading
`admin_seed_from_template()` (Phase 2's own impact-map finding, re-verified here): it creates
`CatalogCategory` rows only, nothing else. `CatalogService.nameAr` is a real, required,
non-defaultable schema field (`String`, no `?`, no `@default`) — and no per-service *name* exists
here at all, only a *category* name ("Haircut" as a grouping, not "Haircut — 20 min, $8" as a
bookable line item). `CatalogService.price` is genuinely nullable at the schema level, so a
`null` price wouldn't crash — but a real customer looking at "Haircut — price not set" on a
booking page is not an honestly "ready" tenant either.

**Not answering "are the 6 demo services an appropriate default" myself, per instruction** — see
Options, below.

## 5. What happens today if the customer gives no services or barber info?

**Confirmed, the current, real, live behavior**: nothing. Self-registration's real 3-step flow
(`/auth/register` → `/admin/settings` → `/catalog/seed-from-template`) never calls
`provision_barber_domain()`, `barber_repo`, or `catalog_service_repo` at all. A freshly self-
registered Barber-template tenant today has `reservations` correctly active (this session's
earlier fix) and some generic categories — zero real bookable staff, zero real bookable services.
Not a crash — a silent, honest absence, exactly matching Phase 3's own starting question.

## 6a. How do we prevent a retry from creating duplicate Barber/Services?

**A concrete, already-live example of this exact risk was found, not hypothetical.** Reading
`TenantRegisterPage.jsx`'s error handling precisely: all 3 steps run inside one `try` block. If
Step 1 (`/auth/register`) succeeds but Step 2 or 3 throws, the `catch` block resets the UI to
`'idle'` and shows an error — **without ever navigating away**. The `Client`+`User` from Step 1
**already exist** at that point. If the visitor clicks submit again, Step 1 now fails on the
existing slug/email/phone-uniqueness guards, and the UI has no path forward — a real, currently-
reproducible half-provisioned-tenant state, live in production today, before Phase 3 adds any
domain-object creation to the mix at all.

**This is exactly why Phase 1 deliberately deferred the idempotency guard** ("build one only once
a second real caller with a real retry path exists," per `ALZABT_PHASE2_EXTRACTION_BOUNDARY_FINDING.md`)
— Self-Registration, wired to call `provision_barber_domain()` as one more step in this same
already-multi-step, already-failure-exposed flow, **is** that real second caller. The guard is no
longer speculative infrastructure once Phase 3 exists — it becomes load-bearing.

## 6b. How does `provisioning_status` prevent a tenant being treated complete too early?

Not used anywhere yet (Phase 1 only added the column). For Phase 3 to make it real: `Client` is
created with `provisioning_status='pending'` at Step 1; each subsequent step (settings, category
seed, and — once the data question below is resolved — domain-object provisioning) only flips it
to `'complete'` after every step in the sequence succeeds; any exception sets `'failed'`, never
silently leaves it `'pending'` forever. The Dashboard's own `?welcome=1` redirect (today
unconditional the moment the client-side steps finish) would be the natural place to *read* this
status honestly, instead of assuming success — a real, small, additive UI change, not proposed or
built in this round.

---

## The real gap this discovery confirms — stopping here, not inventing data

**Self-Registration does not currently collect the information needed to honestly create real
`CatalogService` rows** — no per-service name distinct from a category label, no price, no
duration, anywhere in the flow. `barber_name` has a defensible-but-unconfirmed proxy
(`owner_name`); `services` has **no real per-item data at all**, only 4 generic category labels.
Per instruction, this is presented as a real gap for a decision, not quietly patched with invented
numbers.

## Options for the onboarding-safe default (not decided here)

- **Option A — Provision nothing beyond what already works today.** Self-registration creates
  `Client`+`User`+`client_services`+`vertical` (unchanged) and stops — zero `Barber`, zero
  `CatalogService`. The tenant's real Dashboard (Add Staff / Add Service, both already real,
  already working per Phase 1's own impact map) is where the owner adds their real first staff
  member and real services. Most honest option — never guesses a name or invents a price. Real
  cost: the public page shows zero bookable services until the owner does this manually; the
  Barber vertical's own "domain data" guarantee (Ready Tenant part 4) stays unmet for this door
  specifically, named as a known, deliberate gap rather than faked.
- **Option B — Create one real `Barber` (from `owner_name`, explicitly named as an assumption, not
  a certainty) but zero `CatalogService` rows.** `Barber` genuinely has no missing required field
  (name + a sensible default working-hours, matching the two low-stakes defaults already accepted
  in Phase 2) — this part can be done honestly. Services still can't be, for the same reason as
  Option A. A middle ground: the tenant is "bookable" in principle the moment they add a real
  service themselves.
- **Option C — Add a real new onboarding question** ("what do you offer, roughly what does it
  cost?") to the self-registration form itself, before provisioning runs. The only option that
  actually closes the data gap with real customer input rather than working around it. Real cost:
  a genuine product/UX addition, bigger than "the smallest contract," a new form step design, not
  scoped by this discovery round.
- **Option D — Reuse Demo Builder's placeholder content, clearly labeled as example/starter
  content to edit.** Named for completeness, not recommended — this is the exact thing Salman's
  own governing rule for this round rules out directly: *"Self-registration لا يرث محتوى Demo
  Builder لمجرد أنه يحتاج بيانات."*

## What this document does not do

Does not pick an option. Does not build a contract, since the contract's own shape depends
entirely on which option is chosen (A/B need no new form fields at all; C needs real new frontend
work first). Does not touch code. Waiting for Salman's decision on the default before any
"smallest contract" is drafted.
