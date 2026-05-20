"""
app/services/storage_service.py
Supabase Storage operations for admin media management (4-layer: Service layer).
Called only from admin route handlers — never directly from routes.
"""
import asyncio
import logging
import os
import uuid
from fastapi import HTTPException

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
    file_bytes: bytes,
    content_type: str,
    original_filename: str,
) -> str:
    """
    Upload an image to Supabase Storage at:
      properties/{client_slug}/units/{unit_id}/{uuid}.{ext}

    Returns the public URL.
    Raises HTTPException on validation or storage failure.
    """
    if not _supabase:
        raise HTTPException(status_code=500, detail="Storage not configured — check SUPABASE_URL and SUPABASE_SERVICE_KEY")

    if content_type not in _ALLOWED_IMAGE:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{content_type}'. Allowed: jpeg, png, webp, gif")

    if len(file_bytes) > _MAX_IMAGE:
        raise HTTPException(status_code=400, detail="File exceeds 8 MB limit")

    ext  = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else "jpg"
    path = f"{client_slug}/units/{unit_id}/{uuid.uuid4()}.{ext}"

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
    file_bytes: bytes,
    content_type: str,
    original_filename: str,
) -> str:
    """
    Upload a gallery image to Supabase Storage at:
      properties/{client_slug}/{folder_context}/{uuid}.{ext}

    folder_context example: "units/{unit_id}/gallery"
    Returns the public URL.
    """
    if not _supabase:
        raise HTTPException(status_code=500, detail="Storage not configured — check SUPABASE_URL and SUPABASE_SERVICE_KEY")

    is_video = content_type in _ALLOWED_VIDEO
    if content_type not in _ALLOWED:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{content_type}'. Allowed: jpeg, png, webp, gif, mp4, webm, mov")

    max_bytes = _MAX_VIDEO if is_video else _MAX_IMAGE
    if len(file_bytes) > max_bytes:
        limit_str = "200 MB" if is_video else "8 MB"
        raise HTTPException(status_code=400, detail=f"File exceeds {limit_str} limit")

    ext  = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else "jpg"
    path = f"{client_slug}/{folder_context}/{uuid.uuid4()}.{ext}"

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
