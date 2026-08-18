# Mister H — Section Reorder — Evidence

Salman's instruction: Hero → Services → Team (staff) → Gallery → Story → Hours → Location
(Contact Us) → CTA (unmentioned, kept last, unchanged position).

## Change

Used the real `PATCH /admin/content/sections/reorder` endpoint (Phase 2.1, already built and
verified) — no new code needed, this is exactly the capability it exists for.

Before: `hero(0), story(1), staff(2), gallery(3), featured_items(4), hours(5), location(6), cta(7)`
After: `hero(0), featured_items(1), staff(2), gallery(3), story(4), hours(5), location(6), cta(7)`

## Live verification

| Check | Result |
|---|---|
| Public config order | Confirmed via direct read: `hero, featured_items, staff, gallery, story, hours, location, cta` |
| Real browser DOM order | `Array.from(document.querySelectorAll('[id^="s_"]')).map(el => el.id)` → `["s_hero","s_featured","s_staff","s_gallery","s_story","s_hours","s_location","s_cta"]` — exact match |
| Console errors | 0 |
| RK | Untouched — reorder targeted Mister H's `client_id` only, same isolation already proven in Phase 2.1's own evidence |

## Next

Continuing Phase 2.3 theming in this same new order (already did Hero, Services) — Staff (Team)
next, then Gallery, Story, Hours, Location.
