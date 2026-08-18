# Mister H — Asset Pack (Pending) + Visual QA Preparation

**Status: Asset Pack Sourcing is a pending content dependency, not actively worked.** Per Salman's
explicit instruction (2026-08-19): don't leave this as an open-ended wait — record it as blocked,
continue with everything that doesn't need real assets, and use the wait to prepare (not execute)
the Visual QA methodology so it's ready to run the moment real files land. Blocked because of
missing real material from Ali, never because of missing engineering — the receiving side is done.

**Execution order once Ali's material lands (Salman's own sequence, binding)**:
```
Upload → Mapping → Provenance evidence → Public verification → Visual QA → Fixes (if needed) → final evidence/commit
```
A real photo of the shop/services from Ali is the only accepted source — never stock, never
generated, never presented as if it were Mister H's own.

---

## 1. Priority 1 — the real, current ask to Ali

- **Hero**: at least one real fallback image, in addition to the real video already live.
- **Services**: 4–6 real photos, ideally one genuinely tied to each real service (not generic).
- **Gallery**: 8–12 real photos of the shop's actual work.

**Binding, restated**: no stock photos, no AI-generated images presented as if they were real
photos of Mister H. Art direction stays exactly as already established (Design Spec §2.3): dark,
cinematic, premium, black + warm gold, one coherent set — not several unrelated styles.

**Once real files exist, the work is upload + mapping + verification — not new engineering.** The
receiving architecture (Hero media Phase 1, Gallery media this session, Services photos already
real via `StaffTab.jsx`) is fully built and already proven end-to-end.

---

## 2. Asset Provenance — required record for every real upload, going forward

Salman's explicit concern: without a real record of where each asset came from, a mistake becomes
invisible later — a service photo accidentally landing in the gallery, or a stock/generated image
quietly passing as if it were a real photo of the shop.

**Decision: track this as real evidence at upload time, not a new database column.** Per this
project's own repeated discipline (`instagram_url` this same session — check the real schema
before assuming a field is missing), adding a schema field for something that can be fully covered
by a written evidence record at the moment of upload would be building infrastructure ahead of a
proven need. If a real future requirement emerges for the Dashboard itself to query/display
provenance, that becomes the actual trigger to add a field — not decided speculatively now.

**Required format, one row per real asset uploaded from here on**:

| Asset | Purpose | Source | Tenant | DB reference |
|---|---|---|---|---|
| *filename or short description* | *which real slot it fills — `page_hero` fallback, a named real service, `page_gallery`* | *exactly where it came from — "provided by Ali via [channel] on [date]", never "found online"/"generated"* | *Mister H (`mr-h`), confirmed, not assumed* | *the real `GalleryImage.id`/`CatalogService.image_url`, confirmed via a real API read after upload, not assumed from the upload response alone* |

This table is filled in as a real evidence file
(`.claudedocs/work/homepage-phase2/{date}/asset-pack-provenance.md`) the moment real uploads
happen — not retroactively, and not skipped for "obviously fine" assets.

---

## 3. Visual QA Preparation — the rubric, ready to run once real assets exist

**Not executed yet — there is nothing real to judge until Priority 1 lands.** This section exists
so the pass itself is fast and checkable the moment it can start, built from what's already real
and decided this session (Design Specification, the URBANCUT/Dribbble reference research), not
invented fresh at QA time.

### 3.1 What "done" means for this pass

Judged against composition/crop/contrast/typography/spacing/hierarchy — **explicitly not** "does
the section render." A section can pass Phase 2.3/2.6's functional tests and still fail this pass
on visual grounds; that is a real, separate outcome, not a contradiction.

### 3.2 Per-surface checklist

| Surface | Check against | Real standard already set |
|---|---|---|
| Hero (once a fallback image exists) | Design Spec §3.1 | Subject weighted to one side, not centered; dark gradient/overlay fades media into black, never a hard edge; text never sits on the subject's most important detail |
| Services cards | Design Spec §3.2, Expansion Proposal §1 item 7 | Photo is the hero of the card (not a small inset); uniform aspect-ratio crop across all 6; dark gradient + name overlay at the bottom — icon-only fallback should no longer be visible once real photos exist |
| Gallery | Design Spec §2.3 art-direction criteria | Every photo low-key, high-contrast, close-up/action grooming photography; **cross-photo consistency check** — no single bright/neon/daylight photo breaking the coherence of the set, even if that one photo is individually well-composed |
| Whole page | Design Spec §2.1/§2.2 | Gold stays a restrained accent, not a dominant fill (outside the one deliberate CTA banner); the three typography registers (display/body/label) stay visually distinct from each other, not flattened to one weight |

### 3.3 Format the actual QA report will use

Same `Confirmed / Side Findings / Unknowns` discipline this project uses everywhere else
(`investigation-protocol.md`) — a real screenshot-backed comparison against the reference images
already gathered this session, not a prose impression. Each row in §3.2 becomes a pass/fail line
with a real screenshot cited, not a summary claim.

---

## 4. What happens next

Waiting on real Priority 1 material from Ali. Nothing else in Phase 2 is blocked by this — Logo/Nav
and array-field editors remain their own separate, independently-scoped workstreams per Salman's
own explicit sequencing, started only after this Visual QA pass actually runs.
