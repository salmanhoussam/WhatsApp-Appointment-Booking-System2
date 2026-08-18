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


async def update_gallery_image(image_id: str, data: dict):
    """Update a gallery image by primary key."""
    return await prisma_client.galleryimage.update(
        where={"id": image_id},
        data=data,
    )


async def reorder_gallery_image(image_id: str, client_id: str, sort_order: int):
    """Update sort_order for a single image, scoped to tenant."""
    return await prisma_client.galleryimage.update_many(
        where={"id": image_id, "clientId": client_id},
        data={"sort_order": sort_order},
    )


async def delete_gallery_image(image_id: str):
    """Hard-delete a gallery image by primary key."""
    return await prisma_client.galleryimage.delete(where={"id": image_id})


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
