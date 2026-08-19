# Homepage Section Settings — Contract (Phase 2.5/2.6)

**Status: Contract — the inventory Phase 2.6's Dashboard Renderer is built against.** Per Salman's
explicit instruction (2026-08-18): "لا أريد أن يحوّل أبو حسين Phase 2.5/2.6 إلى 'ابنِ Dashboard
editor لكل شيء' دفعة واحدة بدون عقد واضح... الأفضل يعمل inventory للـ sections الموجودة فعلياً
ويحدد لكل واحد: section → editable fields → media fields → visibility → ordering → section-specific
settings." Every row below is built from reading the real component source (`grep`-extracted field
usage), not guessed — same evidence discipline this whole session has used throughout.

Logo/Nav is explicitly **out of scope** here — a separate, deferred structural/design decision, per
Salman's own explicit call this round.

---

## 1. What already exists (Phase 2.1, unchanged)

- `enabled` (boolean, default true when absent) — `PATCH /admin/content/sections/{type}/enabled`
- `order` (int) — `PATCH /admin/content/sections/reorder`
- Both already verified live, both apply to every section type uniformly — no per-section work
  needed for these two.

**Real gap closing this round**: no `GET` route exists yet to list every section (type/enabled/
order/heading) in one call — the Dashboard needs this to render a section list at all. New in
Phase 2.6.

---

## 2. Section Inventory — every section Mister H actually has live

| Section | Text fields (generic-editable) | Media fields | Structural/array fields | Section-specific settings |
|---|---|---|---|---|
| `hero` | `title_ar`, `subtitle_ar`, `cta_text_ar` | `bg_image_url`/`bg_type` — **has its own dedicated real Renderer already** (`HeroMediaSection`, Phase 1) — excluded from the generic editor to avoid a second write path to the same media | `framed_video_caption_ar` (paired with the framed-card mode, not Mister H's current default) | — |
| `story` | `heading_ar`, `body_ar` | none | `stats[]` ({num, label}) — **deferred**, see §4 | — |
| `staff` | `heading_ar` | none in `data` — member photos are `Barber.imageUrl`, already real/Dashboard-editable via `StaffTab.jsx` (confirmed, same "already real" finding as Services) | members themselves — live `Barber` API, not authored `data` | — |
| `gallery` | `heading_ar` | `images[]` — **has its own dedicated real Renderer already** (`GalleryMediaSection`, just built this session) — excluded from the generic editor | — | `limit` (int), `gallery_link` (string) |
| `featured_items` | `heading_ar` | none — items are live `CatalogService`/`CatalogItem` data, already real/Dashboard-editable via `StaffTab.jsx` | — | `limit` (int) |
| `hours` | `heading_ar` | none | `rows[]` — **dead for any tenant with real `working_hours` set** (Mister H included) — see the real finding below | — |
| `location` | `heading_ar`, `para_ar` | none — `maps_url` is an embed link, not an uploaded asset; treated as a plain text/URL field, not routed through the Media upload flow | `tags[]` (string array) — **deferred**, see §4 | `maps_url` (plain URL field) |
| `cta` | `text_ar`, `subtext_ar`, `button_ar`, `link` | none | — | `variant` (enum: `plain`/`banner`/`promo-strip`) |
| `why_choose_us` | `heading_ar` | none | `items[]` ({icon_key, title_ar, body_ar}) — **deferred**, see §4 | — |

## 3. Real finding: Hours has no editing surface anywhere today

Confirmed via a real grep of every Dashboard tab: `Client.config.working_hours` (the field
`HoursSection.jsx` actually prioritizes over `data.rows` whenever it's set — true for Mister H) is
only ever **read**, never written, anywhere in the current Dashboard (`ReservationsTab.jsx`'s own
usage is a read-only calendar-range calculation, not an editor). `data.rows` is the older,
authored fallback — editing it would have **zero visible effect** for Mister H, since
`working_hours` always wins when both exist. This is a real, separate gap this Contract names but
does not silently patch by pointing the generic editor at the dead `rows` field instead — see §5.

## 4. Deferred: array/structural field editing

`stats[]`, `tags[]`, `items[]` (each a list of small objects, not a single string) need a
repeatable-group UI (add/remove/reorder rows, each with its own sub-fields) — a meaningfully
bigger UI surface than a single text input. Building this now, on top of everything else in this
Contract, is exactly the "build everything at once" Salman explicitly warned against. **Deferred,
named explicitly, not silently dropped** — Phase 2.6 ships without it; a future increment can add
a generic repeatable-group editor once the simpler text/media/settings surface is proven working
end-to-end.

## 5. Phase 2.6 MVP scope — what actually ships

1. **Section list + enable/disable + reorder** — a real Dashboard view of every section (type,
   heading, enabled, order), toggling and reordering through the existing Phase 2.1 routes.
2. **Generic text-field editor** — one generic backend route + one Dashboard form pattern, driven
   by this Contract's "Text fields" column, covering every section above.
3. **Section-specific settings** — `gallery.limit`/`gallery_link`, `featured_items.limit`,
   `cta.variant`, `location.maps_url` — same generic field-update mechanism, just more field names.
4. **Media** — Hero and Gallery already have real, dedicated Renderers (Phase 1, this session) —
   Phase 2.6 does not rebuild these, just surfaces them in the same section-settings view.
5. **`working_hours` editor** — the real gap named in §3, closed here since Hours would otherwise
   be the one section with text fields but no real way to change what a visitor actually sees.

**Not shipped this round, named explicitly**: `stats[]`/`tags[]`/`items[]` array editing (§4),
Logo/Nav (out of scope per Salman's own call).

## 6. Closing Acceptance Test (Salman's own words, binding)

> إذا استطاع صاحب Mister H من الـ Dashboard إخفاء section، إعادة ترتيبه، تعديل محتواه، واستبدال
> الـ media، ثم رأى النتيجة مباشرة على الـ homepage — وقتها فعلاً نقدر نقول إننا بنينا الصفحة كـ
> منتج قابل للإدارة.

Verified end-to-end, real browser, real data, at minimum one full real example covering every verb
(hide, reorder, edit text, replace media) before this phase is called done — not a claim, an
evidence file per the same discipline as every phase so far.

---

## 7. CMS Readiness Gate — Unified Section Schema + Repeatable-Group Design (2026-08-19, pre-CMS)

**Status: schema + API contract design only. No code written.** Per Salman's explicit instruction
before any CMS Implementation Contract is drafted: fix the section model into one canonical shape,
and design repeatable-group (array-field) editing as part of that shape from day one — not a
bolt-on per-section special case, and not built twice (once now, once inside a future CMS).

### 7.1 The canonical Section shape — source of truth going forward

Every section, regardless of type, is exactly this shape. No section-specific backend model —
only section-specific *data* inside these generic slots:

```
Section
├── type                — fixed key (hero, story, staff, gallery, featured_items, hours,
│                          location, cta, why_choose_us, ...) — selects the frontend Renderer and
│                          which columns below are populated, per §2's table
├── order                — int — Phase 2.1, PATCH /admin/content/sections/reorder
├── enabled              — bool — Phase 2.1, PATCH /admin/content/sections/{type}/enabled
├── scalar fields        — text/number/enum values in `data` — Phase 2.5/2.6's generic
│                          PATCH /admin/content/sections/{type}/fields
├── media fields         — image/video; never a raw `data` field — always a real GalleryImage row
│                          (singleton for hero, collection for gallery) — Phase 1/2.4's dedicated
│                          Renderer, never the generic field editor
├── repeatable fields    — lists of small objects (`stats[]`, `tags[]`, `items[]`) — §7.3 below
└── section-specific settings — scalar fields meaningful to one section type only
                           (`gallery.limit`, `cta.variant`) — mechanically identical to scalar
                           fields, kept as its own bucket only because §2's table already names it
                           separately; no separate backend mechanism needed
```

This is not a new model — it restates Phase 2.1 (`enabled`/`order`) + Phase 2.5/2.6 (scalar
fields) + Phase 1/2.4 (media) as one shape, with the one real gap (repeatable fields) named and
closed by design in §7.3, not left as a silent hole. **No CMS Implementation Contract should
introduce a 7th bucket or a per-section-type backend model** — a future section needing something
outside these six slots is a signal to revisit this schema explicitly, not to special-case around
it.

### 7.2 Array-field contract — confirmed source of truth

§2/§4 above already fix the exact shape of every real repeatable field in production today; this
table is repeated here as the CMS's one confirmed source of truth (the CMS Contract reads from
here, not from re-deriving shapes out of the components a second time):

| Section | Repeatable field | Item shape |
|---|---|---|
| `story` | `stats[]` | `{num, label}` |
| `location` | `tags[]` | `string` (not an object — simplest real case) |
| `why_choose_us` | `items[]` | `{icon_key, title_ar, body_ar}` |

No change to these shapes from what §2/§4 already documented.

### 7.3 Repeatable-group editing — designed once, generic

Per Salman's explicit instruction: **not a separate deliverable, not built twice.** Scoped now as
part of the CMS Implementation Contract, reusing the same Dispatcher justification already applied
once for scalar fields (`content.py`'s own documented decision, Phase 2.5/2.6 — a generic routing
shape is only justified once real repetition across sections proves it, not before; 3 real array
fields across 3 real sections meets the same bar the 9 scalar fields met).

**Backend — one generic contract, not one per section:**
```
GET    /admin/content/sections/{type}/repeatable/{field}          — list current items, ordered
POST   /admin/content/sections/{type}/repeatable/{field}          — append one item
PATCH  /admin/content/sections/{type}/repeatable/{field}/{index}  — edit one item's sub-fields
DELETE /admin/content/sections/{type}/repeatable/{field}/{index}  — remove one item
PATCH  /admin/content/sections/{type}/repeatable/{field}/reorder  — reorder, same pattern as
                                                                     Phase 2.1's section reorder
```
`{field}` is validated server-side against §7.2's table — never an arbitrary client-supplied key.
Item shape is validated per-field against the same table (a `tags[]` PATCH accepts a bare string;
a `stats[]`/`items[]` PATCH accepts only the named sub-object keys).

**Frontend — one generic Dashboard component, not one per section:** a `RepeatableGroupEditor`
taking `{sectionType, field, itemShape}` (itemShape drawn from §7.2), rendering add/edit/delete/
reorder rows generically — the same relationship `SectionRow`'s existing scalar-field form already
has to §2's Text fields column, extended to cover §7.2's rows. `tags[]` renders as a single-input
row (a bare string, not a sub-object); `stats[]`/`items[]` render a small per-row form (2-3
sub-fields each).

**What this closes**: exactly the gap §4 named as deferred — Story stats, Location tags, Why
Choose Us items become fully Dashboard-editable, without a second, separately-designed editor
built later. This section supersedes §4's deferral notice for design purposes; §4 itself is left
unedited as historical record of the original, deliberate Phase 2.6 scoping decision.

### 7.4 What this Gate does NOT decide

- No code from this section has been written — schema + API contract design only, per Salman's
  explicit "لا تكتب كود CMS قبل موافقتي على الـ Contract."
- Repository hygiene (Track 3) is tracked separately, own evidence path, not folded into this
  document — different concern entirely.
- The actual CMS Implementation Contract (real backend route file, real Dashboard component file,
  any migration) is the next deliverable, gated on Salman's explicit approval of this §7 shape.
