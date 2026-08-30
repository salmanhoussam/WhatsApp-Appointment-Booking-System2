"""
Gallery Repository — Prisma queries only.
All queries MUST filter by clientId. No business logic here.
"""

from app.db.client import prisma_client
from typing import Optional


async def list_gallery_images(unit_id: str, client_id: str) -> list:
    """All gallery images for a unit, scoped to tenant."""
    return await prisma_client.galleryimage.find_many(
        where={"unitId": unit_id, "clientId": client_id},
        order={"sort_order": "asc"},
    )


async def count_gallery_images(unit_id: str, client_id: str) -> int:
    """Count images for a unit, scoped to tenant."""
    return await prisma_client.galleryimage.count(
        where={"unitId": unit_id, "clientId": client_id}
    )


async def create_gallery_image(data: dict):
    """Insert a new GalleryImage row."""
    return await prisma_client.galleryimage.create(data=data)


async def find_gallery_image(image_id: str, client_id: str):
    """Single gallery image scoped to tenant."""
    return await prisma_client.galleryimage.find_first(
        where={"id": image_id, "clientId": client_id}
    )


async def update_gallery_image(image_id: str, client_id: str, data: dict):
    """Update a gallery image by primary key, scoped to tenant.

    Tenant Isolation Audit (2026-08-30) -- previously unscoped (`where={"id": image_id}` only);
    every real caller (`admin/gallery.py`) already pre-checks ownership via `find_gallery_image()`
    first, so this was never exploitable in practice, but the function itself didn't independently
    enforce this file's own "ALL queries MUST filter by clientId" rule. Same `update_many()` +
    re-fetch shape already established for `barber_repo.update_barber()` / `catalog_service_repo.
    update_catalog_service()` (Study 7, 2026-08-24) -- `update_many()` is what lets `clientId`
    actually participate in the filter; it returns a count, not the row, so the fresh row is
    re-fetched via the already-tenant-scoped `find_gallery_image()`.
    """
    await prisma_client.galleryimage.update_many(
        where={"id": image_id, "clientId": client_id},
        data=data,
    )
    return await find_gallery_image(image_id, client_id)


async def reorder_gallery_image(image_id: str, client_id: str, sort_order: int):
    """Update sort_order for a single image, scoped to tenant."""
    return await prisma_client.galleryimage.update_many(
        where={"id": image_id, "clientId": client_id},
        data={"sort_order": sort_order},
    )


async def delete_gallery_image(image_id: str, client_id: str):
    """Hard-delete a gallery image by primary key, scoped to tenant.

    Tenant Isolation Audit (2026-08-30) -- same fix class as update_gallery_image() above.
    """
    return await prisma_client.galleryimage.delete_many(where={"id": image_id, "clientId": client_id})


# ── Page-level tenant media (Media/Content Foundation, 2026-08-17) ─────────────────────────────
# clientId-only rows (unitId/catalogItemId both null -- already legal, both fields are optional on
# this model). "Page" media types (page_hero, page_logo) are singletons: at most one isActive row
# per (clientId, imageType), enforced here via delete-then-create, not a DB constraint.

async def find_active_page_media(client_id: str, image_type: str):
    """The current active row for one (clientId, imageType) singleton slot, or None."""
    return await prisma_client.galleryimage.find_first(
        where={"clientId": client_id, "imageType": image_type, "isActive": True},
        order={"createdAt": "desc"},
    )


async def replace_page_media(client_id: str, image_type: str, url: str, media_type: str = "image", alt_text: str | None = None):
    """
    Singleton replace: delete any existing row(s) for this (clientId, imageType), then create the
    new one. Real "Replace Media" semantics -- not a gallery append.
    """
    await prisma_client.galleryimage.delete_many(
        where={"clientId": client_id, "imageType": image_type}
    )
    return await prisma_client.galleryimage.create(data={
        "clientId":  client_id,
        "imageType": image_type,
        "mediaType": media_type,
        "url":       url,
        "altText":   alt_text,
    })


# ── Page-level tenant media -- collections (Homepage Phase 2.4, 2026-08-18) ────────────────────
# page_gallery (and any future collection-shaped imageType) is NOT a singleton -- multiple rows
# share one (clientId, imageType), ordered by sort_order, added/removed individually. Distinct from
# replace_page_media's delete-then-create semantics above, which stay correct for page_hero/
# page_logo specifically.

async def list_page_media(client_id: str, image_type: str):
    """All active rows for one (clientId, imageType) collection, ordered by sort_order."""
    return await prisma_client.galleryimage.find_many(
        where={"clientId": client_id, "imageType": image_type, "isActive": True},
        order={"sort_order": "asc"},
    )


async def add_page_media(
    client_id: str,
    image_type: str,
    url: str,
    media_type: str = "image",
    alt_text: str | None = None,
    caption_ar: str | None = None,
    sort_order: int | None = None,
):
    """Append one new row to a (clientId, imageType) collection -- never deletes existing rows."""
    if sort_order is None:
        existing = await list_page_media(client_id, image_type)
        sort_order = len(existing)
    return await prisma_client.galleryimage.create(data={
        "clientId":   client_id,
        "imageType":  image_type,
        "mediaType":  media_type,
        "url":        url,
        "altText":    alt_text,
        "caption_ar": caption_ar,
        "sort_order": sort_order,
    })


async def remove_page_media(client_id: str, media_id: str):
    """Delete one row by id, scoped to this tenant -- never touches another tenant's row."""
    return await prisma_client.galleryimage.delete_many(
        where={"id": media_id, "clientId": client_id}
    )


async def reorder_page_media(client_id: str, image_type: str, ordered_ids: list[str]):
    """Re-assign sort_order (0-based, matching ordered_ids' own sequence) for a collection."""
    for index, media_id in enumerate(ordered_ids):
        await prisma_client.galleryimage.update_many(
            where={"id": media_id, "clientId": client_id, "imageType": image_type},
            data={"sort_order": index},
        )
