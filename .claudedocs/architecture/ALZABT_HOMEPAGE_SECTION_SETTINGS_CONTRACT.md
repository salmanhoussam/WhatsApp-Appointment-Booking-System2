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
