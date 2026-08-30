"""
app/services/storage_service.py
Supabase Storage operations for admin media management (4-layer: Service layer).
Called only from admin route handlers — never directly from routes.
"""
import asyncio
import logging
import os
import re
import uuid
from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)

_SUPABASE_URL = os.getenv("SUPABASE_URL")
_SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

try:
    from supabase import create_client as _create_supabase
    _supabase = _create_supabase(_SUPABASE_URL, _SUPABASE_KEY) if (_SUPABASE_URL and _SUPABASE_KEY) else None
except Exception:
    _supabase = None

_BUCKET        = "properties"
_ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_ALLOWED_VIDEO = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"}
_ALLOWED       = _ALLOWED_IMAGE | _ALLOWED_VIDEO
_MAX_IMAGE     = 8  * 1024 * 1024   # 8 MB
_MAX_VIDEO     = 200 * 1024 * 1024  # 200 MB
_READ_CHUNK    = 1 * 1024 * 1024    # 1 MB — bounded-read granularity

# File Upload Security Audit (2026-08-30) -- the stored file's extension now comes ONLY from this
# table, keyed by the already-validated `content_type`, never from the caller-supplied filename.
# Closes a real, confirmed path-injection vector: `original_filename.rsplit(".", 1)[-1]` used to
# feed directly into the storage key with no character sanitization -- a filename like
# "../../../x" could inject extra "/"-separated segments into the key. Never reintroduce a
# filename-derived extension without re-sanitizing per _PATH_SEGMENT_RE below.
_EXT_BY_CONTENT_TYPE = {
    "image/jpeg":      "jpg",
    "image/png":       "png",
    "image/webp":      "webp",
    "image/gif":       "gif",
    "video/mp4":       "mp4",
    "video/webm":      "webm",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
}

# A safe storage path segment: letters, digits, underscore, hyphen only -- no ".", "..", "/", or
# any other character that could alter how a path resolves. Real, confirmed exploit (this audit):
# Supabase Storage's own SDK resolves ".." in an object key exactly like a real filesystem would
# (verified live: `"{slug}/../QA-PROBE/x.png"` landed at `properties/QA-PROBE/x.png` -- the bucket
# ROOT, completely outside the slug's folder). Every dynamic piece that becomes part of a storage
# key -- client_slug, and every segment of folder_context -- MUST pass this check before use.
_PATH_SEGMENT_RE = re.compile(r"^[A-Za-z0-9_-]+$")


def _sanitize_path_segment(value: str, label: str) -> str:
    if not value or not _PATH_SEGMENT_RE.match(value):
        raise HTTPException(status_code=400, detail=f"Invalid {label}.")
    return value


def _sanitize_folder_path(folder_context: str, label: str = "storage path") -> str:
    """Validates every "/"-separated segment of a multi-segment folder path (e.g.
    "units/{unit_id}/gallery") individually -- rejects any segment that is empty, ".", "..", or
    contains anything outside _PATH_SEGMENT_RE. Rejecting rather than stripping: a caller sending
    a malicious segment gets a clear 400, not a silently-mangled path that might still resolve
    somewhere unintended."""
    segments = folder_context.split("/")
    for seg in segments:
        _sanitize_path_segment(seg, label)
    return "/".join(segments)


def _ext_for_content_type(content_type: str) -> str:
    """The extension is derived ONLY from the already-validated `content_type`, never from the
    caller-supplied filename -- see _EXT_BY_CONTENT_TYPE's own module-level comment."""
    return _EXT_BY_CONTENT_TYPE.get(content_type, "bin")


async def _read_upload_bounded(file: UploadFile, content_type: str) -> bytes:
    """
    File Upload Security Audit (2026-08-30) -- previously every caller did an unconditional
    `await file.read()` (reading the ENTIRE body into memory) before any size check ran, so an
    oversized/malicious upload was already fully buffered before being rejected -- exactly the
    "before it's fully read into memory" gap this audit was asked to close. Reads in
    `_READ_CHUNK`-sized pieces instead, aborting the moment the running total exceeds the real
    limit for this content type -- never buffers more than one chunk past the limit.

    `content_type` here is the caller-declared value (spoofable, like any Content-Type header) --
    used only to pick which size ceiling applies during the bounded read itself. The real,
    security-relevant allowlist check (`content_type in _ALLOWED`) still runs on this same
    caller-declared value afterward, unchanged from before this fix. An unrecognized content_type
    reads under the smaller (image) ceiling, so an attacker can't use a bogus MIME string to buy a
    bigger read budget than a real, allowed type would get -- the allowlist check right after this
    still rejects it either way.
    """
    max_bytes = _MAX_VIDEO if content_type in _ALLOWED_VIDEO else _MAX_IMAGE
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(_READ_CHUNK)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            limit_str = "200 MB" if content_type in _ALLOWED_VIDEO else "8 MB"
            raise HTTPException(status_code=413, detail=f"File exceeds {limit_str} limit")
        chunks.append(chunk)
    return b"".join(chunks)


def _path_from_url(url: str) -> str:
    """Extract the storage path from a Supabase public URL."""
    marker = f"/object/public/{_BUCKET}/"
    idx = url.find(marker)
    if idx == -1:
        raise ValueError(f"URL is not a '{_BUCKET}' bucket path: {url}")
    return url[idx + len(marker):]


async def upload_unit_image(
    client_slug: str,
    unit_id: str,
    file: UploadFile,
    content_type: str,
    original_filename: str,
) -> str:
    """
    Upload an image to Supabase Storage at:
      properties/{client_slug}/units/{unit_id}/{uuid}.{ext}

    Returns the public URL.
    Raises HTTPException on validation or storage failure.

    `original_filename` is accepted for logging/API-compatibility only -- it is never used to
    build the storage path (see _ext_for_content_type's own docstring for why).
    """
    if not _supabase:
        raise HTTPException(status_code=500, detail="Storage not configured — check SUPABASE_URL and SUPABASE_SERVICE_KEY")

    if content_type not in _ALLOWED_IMAGE:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{content_type}'. Allowed: jpeg, png, webp, gif")

    file_bytes = await _read_upload_bounded(file, content_type)

    safe_slug = _sanitize_path_segment(client_slug, "client_slug")
    safe_unit_id = _sanitize_path_segment(unit_id, "unit_id")
    ext = _ext_for_content_type(content_type)
    path = f"{safe_slug}/units/{safe_unit_id}/{uuid.uuid4()}.{ext}"

    def _do_upload():
        _supabase.storage.from_(_BUCKET).upload(
            path,
            file_bytes,
            {"content-type": content_type, "cache-control": "31536000", "upsert": "false"},
        )
        return _supabase.storage.from_(_BUCKET).get_public_url(path)

    try:
        public_url: str = await asyncio.to_thread(_do_upload)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔥 Supabase upload failed — path={path}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Storage upload failed")

    return public_url


async def upload_to_gallery_path(
    client_slug: str,
    folder_context: str,
    file: UploadFile,
    content_type: str,
    original_filename: str,
) -> str:
    """
    Upload a gallery image to Supabase Storage at:
      properties/{client_slug}/{folder_context}/{uuid}.{ext}

    folder_context example: "units/{unit_id}/gallery"
    Returns the public URL.

    `original_filename` is accepted for logging/API-compatibility only -- it is never used to
    build the storage path. `folder_context` is caller-supplied in some routes (e.g.
    admin/gallery.py's own Form field) -- sanitized below per-segment before use; see
    _sanitize_folder_path's own docstring for the real, confirmed exploit this closes.
    """
    if not _supabase:
        raise HTTPException(status_code=500, detail="Storage not configured — check SUPABASE_URL and SUPABASE_SERVICE_KEY")

    if content_type not in _ALLOWED:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{content_type}'. Allowed: jpeg, png, webp, gif, mp4, webm, mov")

    file_bytes = await _read_upload_bounded(file, content_type)

    safe_slug = _sanitize_path_segment(client_slug, "client_slug")
    safe_folder = _sanitize_folder_path(folder_context, "folder_context")
    ext = _ext_for_content_type(content_type)
    path = f"{safe_slug}/{safe_folder}/{uuid.uuid4()}.{ext}"

    def _do_upload():
        _supabase.storage.from_(_BUCKET).upload(
            path,
            file_bytes,
            {"content-type": content_type, "cache-control": "31536000", "upsert": "false"},
        )
        return _supabase.storage.from_(_BUCKET).get_public_url(path)

    try:
        public_url: str = await asyncio.to_thread(_do_upload)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔥 Supabase gallery upload failed — path={path}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Storage upload failed")

    return public_url


async def delete_unit_image(public_url: str) -> None:
    """
    Remove an image from Supabase Storage by its public URL.
    Raises HTTPException on failure.
    """
    if not _supabase:
        raise HTTPException(status_code=500, detail="Storage not configured")

    try:
        path = _path_from_url(public_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    def _do_delete():
        _supabase.storage.from_(_BUCKET).remove([path])

    try:
        await asyncio.to_thread(_do_delete)
    except Exception as e:
        logger.error(f"🔥 Supabase delete failed — path={path}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Storage delete failed")
