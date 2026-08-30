# File Upload Security & Tenant Isolation Audit — Evidence

Follows: `investigation-protocol.md` evidence discipline. Trigger: Salman's explicit "Functional
Sweep — Step 3" instruction (2026-08-30), Security Sweep phase.

## 0. Every real upload entry point

4 route files accept `UploadFile`: `upload.py` (generic image upload — logos, page hero/story/
gallery, catalog items, unit photos, staff/service photos), `gallery.py` (unit gallery images),
`units.py` (unit cover image), `fleet.py` (Uber CSV trip import — different concern, checked
separately, §6). The first 3 all funnel through the same 2 shared functions in
`app/services/storage_service.py` (`upload_to_gallery_path`, `upload_unit_image`) — one real choke
point, not three independent implementations to audit separately.

---

## 1. CRITICAL, confirmed live: real path traversal, cross-tenant storage write

`admin/gallery.py`'s upload route accepted a free-form client-supplied `folder_context` Form
field, concatenated directly into the Supabase Storage object key
(`f"{client_slug}/{folder_context}/{uuid}.{ext}"`) with **zero sanitization**.

**Live test against production** (via `pilot-test-20260720`, the safe pre-existing test fixture
used throughout this session's audits): called `storage_service.upload_to_gallery_path()` directly
with `folder_context="../../../QA-TRAVERSAL-PROBE-zzz/nested"`. Result:

```
StorageApiError: Route POST:/QA-TRAVERSAL-PROBE-zzz/nested/probe-test-abc123.png not found
```

The `..` sequences were resolved by Supabase's own SDK/gateway exactly like a real filesystem —
proven by the 404 landing on a *different, non-existent route*, not a "storage key not found"
error. Narrowed the test to exactly 1 `../` (`"pilot-test-20260720/../QA-TRAVERSAL-VALID-TEST/probe.png"`)
to get an unambiguous, valid result:

```
UploadResponse(path='pilot-test-20260720/../QA-TRAVERSAL-VALID-TEST/probe.png',
                full_path='properties/QA-TRAVERSAL-VALID-TEST/probe.png')
```

**The file landed at the bucket ROOT** (`properties/QA-TRAVERSAL-VALID-TEST/probe.png`) —
confirmed via `storage.list('')` (found it at root) and `storage.list('pilot-test-20260720')`
(the tenant's own folder was untouched, containing only its real `catalog`/`pages` subfolders).
**With the right segment count, this lets any authenticated tenant admin write into — and
overwrite — another tenant's real storage folder**, including logos and hero media. Test artifact
(`QA-TRAVERSAL-VALID-TEST/probe.png`) was deleted immediately after confirming this, via
`storage.remove()` — confirmed removed via a follow-up `list('')`.

### Fix
Every dynamic path segment (`client_slug`, and each `/`-separated piece of `folder_context`) is
now validated against a strict allowlist (`^[A-Za-z0-9_-]+$` — letters, digits, underscore, hyphen
only) before being used — rejects `.`, `..`, `/`, and anything else with a clear 400, never a
silently-mangled path. `gallery.py`'s `folder_context` Form override was removed entirely, not just
sanitized: its one real frontend caller (`UnitFormModal.jsx`) already sent exactly the value the
backend computes anyway from the already-ownership-verified `unit_id`, so nothing was lost by no
longer trusting a client-supplied override at all.

### Post-fix re-verification (same probe)
```
[TRAVERSAL folder_context] REJECTED -> 400: Invalid folder_context.
```
Also re-tested via the real deployed HTTP route (`POST /admin/upload/`, `context=catalog_item`,
`category_id="../../../evil"`) — **400** `"Invalid folder_context."` (the `category_id`
Form field feeds the same folder-template path, closed by the same fix).

---

## 2. File Type & Size Validation

### Before this pass
- Content-Type allowlist **did already exist** (`_ALLOWED_IMAGE`/`_ALLOWED_VIDEO` in
  `storage_service.py`) — jpeg/png/webp/gif images, mp4/webm/quicktime/x-msvideo videos.
- Size limits **did already exist** (8 MB image / 200 MB video) — but checked only *after*
  `file_bytes = await file.read()` had already read the entire body into memory in every route
  handler, not before, as Salman's own scope named.
- A missing/empty `Content-Type` header **silently defaulted to `"image/jpeg"`** in all 3 routes
  (`file.content_type or "image/jpeg"`) — an attacker who simply omitted the header bypassed the
  allowlist check entirely, since the fallback value itself was always an allowed type.

### Fix
- Bounded chunked read (`_read_upload_bounded`, 1 MB chunks): aborts the moment the running total
  exceeds the real limit for the declared content type, so an oversized upload is rejected without
  ever being fully buffered — closes the "read fully before checking size" gap directly.
- Content-Type no longer defaults to an allowed value when missing — `file.content_type` is passed
  through as-is; a `None`/empty value now correctly fails the allowlist the same as any other
  disallowed value.
- Applied the same bounded-read fix to `fleet.py`'s unrelated CSV import, which had no size limit
  of any kind (10 MB cap — generous for a real Uber Fleet Portal export).

### Live verification (post-fix, both direct `storage_service` calls and real HTTP)
| Test | Result |
|---|---|
| 9 MB image (over the 8 MB limit), direct call | **413** `"File exceeds 8 MB limit"` |
| 9 MB image, real `POST /admin/upload/` via RK's real admin token | **413** `"File exceeds 8 MB limit"` |
| PHP payload (`<?php system($_GET["c"]); ?>`), `content_type=None` (header omitted) | **400** `"Unsupported file type 'None'"` |
| Same payload, `content_type="application/x-php"` (honest declaration) | **400** `"Unsupported file type 'application/x-php'"` |
| Same payload, real `POST /admin/upload/`, `type=application/x-php` | **400**, same message |
| Legitimate 1x1 PNG, `image/png` (regression check) | **200**, uploaded and cleaned up |
| Legitimate PNG via real HTTP with RK's real admin token | **200**, uploaded and cleaned up |

### Honest residual gap — no magic-byte content sniffing
Validation is on the **declared** `Content-Type` header, not the actual file bytes' magic number —
an attacker who lies (`Content-Type: image/png` on a real PHP payload) still passes the allowlist
check today, same as before this pass. **Practical risk assessed as low, not fixed this pass**:
Supabase Storage serves uploaded objects as static blobs — there is no execution context anywhere
in this pipeline that would ever run a `.php`/`.sh` payload as code; the stored object is always
`{uuid}.{ext}` (extension from the trusted Content-Type, never the filename — see §3), served as a
static file. A lying Content-Type can smuggle arbitrary bytes into storage under a mismatched
extension, but cannot achieve code execution through this path. Worth a real magic-byte check
(e.g. `python-magic` / Pillow's own image-verify) in a future pass for defense-in-depth, not
required to close an active exploit path.

---

## 3. Secure Naming — untrusted filenames

### Before this pass
The stored **filename** was already a fresh `uuid.uuid4()` (good — never the caller's real
filename) — but the **extension** was still derived from the untrusted original filename
(`original_filename.rsplit(".", 1)[-1]`), with no character sanitization. A crafted filename like
`"../../../evil.png"` could inject `/`-separated segments into what was meant to be a plain
extension, becoming a second, independent path-injection vector (distinct from §1's
`folder_context` one).

### Fix
Extension is now derived **only** from the already-validated `Content-Type`, via a fixed lookup
table (`image/png` → `png`, etc.) — the caller-supplied filename is no longer used to build the
storage path at all, closing this vector at the root rather than trying to sanitize an
attacker-controlled string.

### Live verification (post-fix)
```
original_filename = "../../../evil.png", content_type = "image/png"
-> https://.../properties/pilot-test-20260720/pages/home/hero/bc45f1d1-....png
```
The malicious filename was accepted as input (upload succeeded, since a malicious filename is not
itself a reason to reject a legitimate image) but had **zero effect** on the resulting path — no
extra segments, no traversal, a clean UUID + `.png`. Test artifact deleted immediately after
confirming this.

---

## 4. Storage Isolation — Cross-Tenant Overwrite

Every path is built as `{client_slug}/...` where `client_slug` comes from the verified JWT
(`tenant["slug"]`, via `get_current_tenant`) — never client input directly — so under normal
operation one tenant's uploads cannot land under another tenant's slug *unless* the traversal bug
in §1 is exploited (now fixed) or the id-ownership gap below is exploited.

**Found and fixed**: `upload.py`'s `barber` and `catalog_service` contexts were the only 2 of 6
that never verified the given `barber_id`/`service_id` actually belongs to the calling tenant
before using it in a path segment — `catalog_item`/`unit_cover`/`unit_gallery` already did this.
With §1's traversal fix in place this could no longer *overwrite* another tenant's real folder, but
it still let an admin name another tenant's real id as a path segment under their own slug. Added
the same ownership check (`find_barber`/`find_catalog_service`, scoped by `tenant["id"]`) already
used by the other 4 contexts.

**Live verification (post-fix, real HTTP, real cross-tenant id)**: RK's real admin token, with
`context=barber` and `barber_id` set to mr-h's real barber id (`ae6a4ed7-...`, fetched during the
earlier Tenant Isolation Audit) → **404** `"Barber not found"` — RK cannot reference mr-h's barber
at all now, regardless of what happens in storage.

---

## 5. Cleanup

Every test artifact this audit created in real Supabase Storage was deleted immediately after
confirming the finding it was testing — `QA-TRAVERSAL-VALID-TEST/probe.png` (bucket root, §1),
the malicious-filename test file under `pilot-test-20260720/pages/home/hero/` (§3), and the
legitimate regression-check uploads under both `pilot-test-20260720/` and `rk/`'s real
`pages/home/hero/` folders. Confirmed removed via follow-up `storage.list()` calls, not just
assumed from the delete call succeeding.

---

## 6. Fleet CSV import — separate, narrower concern

`fleet.py`'s `POST /trips/import` accepts a CSV file with no relation to Supabase Storage/image
paths at all (parsed in-memory as trip data, never written to the bucket) — the path-traversal and
extension-spoofing findings above don't apply to it. It did share the same "unbounded read before
any check" gap; given the same bounded-read fix (10 MB cap). Not otherwise in scope for this pass
(narrower vertical, per this session's earlier Tenant Isolation audit's own assessment of Fleet/
Samsara).

---

## Summary

| Finding | Severity | Status |
|---|---|---|
| Path traversal via `folder_context`/`category_id` — confirmed live cross-tenant storage write | 🔴 Critical | **Fixed**, re-verified |
| Untrusted filename → unsanitized extension (secondary traversal vector) | 🟠 Real | **Fixed**, re-verified |
| Oversized file fully buffered before size check | 🟠 Real (DoS) | **Fixed**, re-verified |
| Missing Content-Type silently defaulted to an allowed value | 🟠 Real (bypass) | **Fixed**, re-verified |
| `barber`/`catalog_service` upload contexts missing tenant-ownership check | 🟡 Defense-in-depth | **Fixed**, re-verified |
| No magic-byte content sniffing (declared Content-Type only) | 🟢 Low practical risk | Documented, not fixed — no execution surface exists for the payload class this would catch |
| Fleet CSV import — no size limit | 🟡 Minor, narrower vertical | **Fixed** (10 MB cap) |
