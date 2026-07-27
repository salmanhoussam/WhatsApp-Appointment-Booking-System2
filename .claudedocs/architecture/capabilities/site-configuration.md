# Site Configuration Capability (broader than Theme)

Per the Capability Contract model (`../adr/TOS-003-capability-contract-model.md`). Extracted from
`TENANT_OS_PLAN.md` §13 (Ownership Matrix, Known Boundary Debt, Contract — Sprint 3, Phase 1),
§19/§20 (Open Findings/Maturity) during the ADR-0003 migration (Phase 5). Cross-checked for
completeness against `.claudedocs/work/tenant-os-sprint3-phase0/2026-07-22/PHASE0_INVESTIGATION.md`
per the Migration Contract's own validation requirement for this file specifically.

## Ownership

Salman's explicit framing, twice: first, that Site Configuration is not Theme (`theme.md`,
narrowly visual) but everything about how the tenant's business itself is configured; second,
after Sprint 3's Phase 0 re-investigation, that the Contract must be written **Ownership first,
fields second** — Phase 0 found the real risk isn't the API shape, it's that one concept ("Hero")
is currently split across more than one Capability's storage. His words: *"أكبر مشكلة ليست الـ
API. بل أن مفهومًا واحدًا ('Hero') موزع على Capabilityين... إذا لم نحل هذا أولًا، فسنبني Contract
فوق حدود غير مستقرة."*

### Ownership Matrix — every concept touching `Client`/`config`, assigned to exactly one Capability

| Concept | Capability | Why |
|---|---|---|
| Brand (`name_ar`, `name_en`) | Site Configuration | Identity metadata, not editorial text |
| Contact (`whatsapp_number`, `email`, `instagram_url`, `maps_url`) | Site Configuration | Business facts |
| Currency | Site Configuration | Business fact |
| Theme Tokens (`primary_color`, `font`, `catalog_layout`, `page_type`/`template_key`) | Site Configuration | Display configuration — see `theme.md` for the narrower visual slice |
| Logo | **Media**, not Site Configuration | Same reasoning as Hero Image — an image needing a `ReplaceMedia` Operation, not configuration data. Site Configuration may *reference* `logo_url` for rendering but does not own writing it. **Judgment call, not explicitly given by Salman** — his own example list didn't cover Logo; flagged for confirmation rather than assumed, precisely because Phase 0 found its current status ("✅ Real") was itself wrong (see correction below) |
| Hero Copy (title/subtitle/CTA text) | **Content**, not Site Configuration | Editorial text — regardless of where it is stored today. Salman's explicit rule: *"Site Configuration لا يملك أي نصوص تحريرية. أي شيء يمثل Content يبقى داخل Content Capability، حتى لو كان موجودًا تاريخيًا داخل `config.hero`."* |
| Story Copy | Content | Editorial text |
| Hero Image/Video (`bg_image_url`, matched for video by file extension) | Media | `ReplaceMedia` Operation |

**Correction, made honest by Phase 0's more rigorous evidence**: Logo was previously listed "✅
Real," evidenced only by `upload.py`'s `page_logo` `FOLDER_MAP` entry existing. Phase 0 read the
route's full body: `page_logo` matches none of its persistence branches (only
`page_hero_video` does) — the file uploads correctly, the resulting URL is never saved. No
`logo_url` field exists on `Client`; no frontend code references `logo_url`/`logoUrl` anywhere
(confirmed by grep). Logo is a **complete Gap**, not partial — upload-storage plumbing exists,
nothing else does.

### Known Boundary Debt (Phase 0 findings — named, not resolved, not silently inherited)

Three real, independently-confirmed instances of the same "Hero" concept fragmenting across
storage locations, each a different failure shape — not one bug repeated three times:

1. **Hero Copy — a live duplicate.** `config.hero.title_ar/subtitle_ar/cta_ar` (legacy, written
   only via `SettingsTab.jsx`'s own hero-text fields, read only by `ConfigurableHero.jsx:55` for
   the `page_type: "showcase"` + `sections: []` fallback) is a second, fully independent "Hero
   Title" storage location, unrelated to the real Content Capability field
   (`config.content.sections[type=hero].data.title_ar`, edited via `/content/hero-title`, rendered
   by `HeroSection.jsx` through `DynamicPage.jsx`'s real `SECTION_MAP`). Both are live and
   consumed today, depending on which rendering path a given tenant uses.
2. **Hero Video — a dead pipeline.** `Client.hero_video_url` (root column) has two real Admin
   write paths (`PATCH /settings` via `SettingsTab.jsx`'s form; `POST /upload/` with
   `context=page_hero_video` via `upload.py`'s direct bypass write) but its only real frontend
   *read* consumer, `frontend/src/design-system/organisms/TenantHero.jsx`, has **zero importers
   anywhere in the codebase** (confirmed by grep) — nothing ever renders it. Unlike Hero Copy, this
   isn't two live competing writers; it's a fully-wired write path with no live reader at the end of
   it. The real Media Capability path already covers the *conceptually* equivalent slot
   (`content.sections[hero].data.bg_image_url`, which already matches video file extensions in
   `HeroSection.jsx`) — `Client.hero_video_url` is redundant with it, not complementary.
3. **Hero Cover Image — a phantom reference.** `ConfigurableHero.jsx` (lines 59, 152) reads
   `config?.hero_image_url || config?.cover_url` — **neither field exists anywhere in
   `prisma/schema.prisma`**, confirmed by grep. For any tenant rendering through this fallback
   path, the hero cover image has never actually worked; this is a latent bug, not a duplication.

None of these three are fixed yet — named here so any future Implementation Contract inherits them
as explicit, evidenced decisions to make (migrate `config.hero.*` into `content.sections`? delete
`TenantHero.jsx` and both its write paths since nothing renders it? wire a real field for
`ConfigurableHero.jsx`'s cover image, or retire that fallback path entirely?), not silently
rediscovered later.

## Contract (Phase 1, Sprint 3)

Only the concepts the Ownership Matrix above actually assigns to Site Configuration. Each row:
Source of Truth (today's real storage), Admin Contract (write), Public Contract (read), Operation.

| Field | Source of Truth | Admin Contract | Public Contract | Operation |
|---|---|---|---|---|
| Brand name (ar/en) | `Client.name_ar`, `Client.name_en` | `PATCH /admin/site-config/brand` (planned) | `GET /public/{slug}/config` → `name_ar`/`name_en` (already real) | `UpdateField` |
| WhatsApp number | `Client.whatsapp_number` | `PATCH /admin/site-config/contact` (planned) | `GET /public/{slug}/config` → `whatsapp_number` (already real) | `UpdateField` |
| Email | `Client.email` | `PATCH /admin/site-config/contact` (planned) | **Gap, confirmed by Phase 0** — not exposed today; stays un-exposed unless a real reason to make it public surfaces | `UpdateField` |
| Instagram / Maps URL | `Client.instagram_url`, `Client.maps_url` | `PATCH /admin/site-config/contact` (planned) | `GET /public/{slug}/config` → same keys (already real) | `UpdateField` |
| Currency | `Client.currency` | `PATCH /admin/site-config/business` (planned) | `GET /public/{slug}/config` → `currency` (already real) | `UpdateField` |
| Primary color / font / catalog layout / page type | `Client.primary_color`, `config.font`, `config.catalog_layout`, `Client.pageType`/`templateKey` | `PATCH /admin/site-config/theme` (planned) | `GET /public/{slug}/config` → same keys (already real) | `UpdateField` |

**Source of Truth for the Service layer itself (not yet built)**: per Salman's explicit decision —
*"لن أحاول 'إعادة توصيل' `settings.py` بهذا الـ Service. بل سأتعامل مع `client_service.py` نفسه
كجزء من Sprint 3"* — the target Service is `client_service.py` itself, **extended** (its
`ClientUpdate` schema currently only covers `name`/`slug`/`phone`/`email`/`isActive`/`password` —
confirmed it cannot carry `primary_color`/`config`/`whatsapp_number` etc. as-is) and **fixed** to
call `admin_client_repo` instead of `prisma_client` directly, not a fresh Service written from
scratch. Route names above are illustrative groupings, not a final API surface commitment.

**Reframing this Contract's actual target**: not "wire `settings.py` into the Editing Engine" — it
is establishing **one canonical write path per field**. The same `upload.py` finding that surfaced
a second bypass writer for `hero_video_url` is evidence that the real problem was never one Route;
Site-Configuration-owned fields have had more than one Writer. Any future work here must fix
`settings.py` **and** `upload.py`'s `page_hero_video` branch together, not `settings.py` alone —
anything less leaves a second, uncoordinated writer standing.

**Deliberately narrower than a fuller Site Configuration would cover**: Business hours, Languages,
Custom domain, Timezone, Tax settings, Delivery zones/fees, SEO metadata, Analytics, and
Integrations remain real Gaps, not part of this Contract; they stay named as future work.

## Operations (Editing Engine, `TOS-002`)

All fields above use `UpdateField`. No `ReplaceMedia`/`ReorderList`/`ToggleVisibility` needs
identified for this Capability's current field set (Logo, being Media-owned, is documented in
`media.md` instead).

## Admin Projection

Not yet built as a single canonical path — see Open Findings. Target: `client_service.py`,
extended and fixed, per the Source of Truth note above.

## Public Projection

`GET /public/{slug}/config` — already real and unchanged for every field this Contract covers
except Email (a confirmed Gap, not exposed).

## Maturity

**Developing** — Contract and a partial Dashboard exist, but Implementation carries a live
Broken-Architecture finding (below).

## Open Findings

**Broken Architecture — Site Configuration (`settings.py`).** `client_service.py` exists and
already implements `create_client`/`get_client`/`update_client` — a real Service for exactly this
write path. `settings.py` bypasses it entirely, calling `admin_client_repo` directly. A second,
smaller defect in the same file: `client_service.py` itself calls `prisma_client` directly rather
than delegating to a repository — itself a break of "Zero Prisma calls outside Repositories" — it
would need that fixed before being wired in as-is, not just imported.

**Known Boundary Debt** — the 3 Hero-fragmentation findings documented in full above (Hero Copy
duplicate, Hero Video dead pipeline, Hero Cover Image phantom reference).

## Related

- `theme.md` — the narrower, purely-visual slice of this Capability.
- `content.md` — owns Hero/Story editorial text per this file's own Ownership Matrix.
- `media.md` — owns Logo and Hero Image/Video per this file's own Ownership Matrix.
