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
