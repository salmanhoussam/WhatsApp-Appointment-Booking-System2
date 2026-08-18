# Homepage Phase 2.4 — Gallery media collection (backend) — Evidence

Contract: `ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md`, Phase 2.4. First concrete
piece: wire Gallery images to the real Media Foundation (Phase 1), extending its singleton
(`replace_page_media`) pattern with a new collection shape (add/remove/reorder), since a gallery is
inherently a list, not a "replace the one active row" slot.

## Investigation before building (per Service Execution Constitution)

- `prisma/schema.prisma`'s `GalleryImage.imageType` comment already named `page_gallery` as a valid
  value (added during Phase 1, never wired up) — confirmed real, not invented.
- `app/api/v1/admin/upload.py` confirmed: `page_hero`/`page_logo`/`page_story`/`page_demo` contexts
  all upload to storage only, never create a DB row there (only `catalog_item`/`unit_cover`/
  `unit_gallery` do) — the real, established 2-step pattern (upload → separate media.py route
  creates the row). `page_gallery` follows the identical pattern, added to `FOLDER_MAP`/
  `IMAGE_TYPE_MAP`.

## What changed

- `app/repositories/gallery_repo.py` — `list_page_media`, `add_page_media`, `remove_page_media`,
  `reorder_page_media`: a real collection shape, distinct from `replace_page_media`'s singleton
  delete-then-create.
- `app/services/media_service.py` — thin wrappers, same Capability/Service file as the hero
  functions (one Capability, one Service, per `rules/backend/architecture.md` §9).
- `app/api/v1/admin/media.py` — `GET/POST /admin/media/gallery-images`,
  `DELETE /admin/media/gallery-images/{id}`, `PATCH /admin/media/gallery-images/reorder`.
- `app/api/v1/admin/upload.py` — `page_gallery` added to `FOLDER_MAP`/`IMAGE_TYPE_MAP`.
- `app/services/public_service.py` — `_inject_page_gallery_media()`, same additive-override
  pattern as `_inject_page_hero_media`: real rows completely replace `content.sections[gallery].
  data.images[]` when they exist; a tenant with none (every tenant today) is untouched.
  `GallerySection.jsx` needed zero changes — it already reads `images: [{url, caption_ar}]`.

## Live verification (real API calls, not a script)

| Check | Result |
|---|---|
| `GET` before any real row | `{"data": []}` |
| `POST` add one real test image | `{"success": true}`, then `GET` confirmed it listed with a real `id`, `sort_order: 0` |
| Public config injection | `GET /public/mr-h/config` — gallery `data.images` fully replaced by the real row (was 4 placeholder slots, became the 1 real one) |
| `rk` regression | `GET /public/rk/config` — gallery `data.images: []`, completely unaffected (RK has zero `page_gallery` rows, injection correctly no-ops) |
| `DELETE` | Confirmed the row disappears from `GET`, and public config **reverts** to the original 4-placeholder-slot JSON-blob state — proving the injection is additive/reversible, not a one-way migration |
| `PATCH .../reorder` | Added 2 real test images (A, B; `sort_order` 0, 1), reordered to `[B, A]`, confirmed via `GET` sorted by `sort_order` that B is now 0 and A is now 1 |
| Cleanup | All test rows deleted, confirmed `GET` returns `[]` again — no test data left behind |
| Python syntax | `ast.parse()` clean on all 5 changed files |
| Backend restart | Clean (one transient Supabase pooler retry on startup, already-documented recurring flakiness, self-resolved within its own retry logic — not a new issue) |

## Data impact

Real test writes to Mister H only, all created and deleted within this verification pass — net
zero permanent data change. Zero writes to RK or any other tenant.

## Next

Dashboard UI (upload/list/delete/reorder through the real admin panel) — not built yet, this
evidence covers the backend contract only.
