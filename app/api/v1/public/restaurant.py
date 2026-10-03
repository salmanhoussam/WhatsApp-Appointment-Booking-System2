"""
Public Restaurant API — /api/v1/public/restaurant/
No auth required. All endpoints gated by require_service("restaurant").
Categories and items from CatalogCategory/CatalogItem (module_key='restaurant').
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.db.dependencies import get_current_tenant
from app.core.services import require_service
import app.repositories.restaurant_repo as restaurant_repo

router = APIRouter()


# ── Serializers ───────────────────────────────────────────────────────────────

def _fmt_item(item) -> dict:
    """Serialize one item.

    🔴 `price` RETURNS null FOR AN ABSENT PRICE, AND THAT IS THE POINT (Salman, 2026-10-03:
    «ما في سعر 0، هذا الشي مرفوض … ما عنا product سعرو 0»). This line used to read
    `else "0"`, which turned the absence of a price into a price OF zero at the API boundary —
    so a dish whose price is the day's market price was published as costing nothing.

    It was also an inconsistency inside our own codebase, not a missing feature: the ADMIN path
    has returned null for absence all along (`catalog_service.py:35` and `:66`,
    `float(item.price) if item.price is not None else None`). Two serializers for one column
    disagreed, and the public one was the one that lied. This aligns them.

    A real price is untouched — still `str(...)`, same value, same type as before, because
    changing the shape for priced items was explicitly out of scope.

    MEASURED NEUTRAL when shipped (2026-10-03): zero NULL-priced rows traverse this path today
    (caracas carries 18 rows at 0, not NULL; beit-al-fakhar holds 34 NULLs but is a store and
    answers 403 here), so this changes no byte for any tenant until those 18 rows are migrated
    separately. See `.claudedocs/work/caracas-price-absence/2026-10-03/summary.md`.
    """
    meta = item.metadata or {}
    return {
        "id":             item.id,
        "category_id":    item.categoryId,
        "name_ar":        item.nameAr,
        "name_en":        item.nameEn,
        "description_ar": item.descriptionAr,
        "description_en": item.descriptionEn,
        "image_url":      item.imageUrl,
        "price":          str(item.price) if item.price is not None else None,
        "currency":       item.currency,
        "is_available":   item.isActive,
        "sort_order":     item.sortOrder,
        "calories":       meta.get("calories"),
        "is_spicy":       meta.get("spicy", False),
    }


def _fmt_category(cat, include_items: bool = True) -> dict:
    """Serialize a category.

    `fallback_image_url` exists because `image_url` is stored but not necessarily alive. MEASURED
    2026-10-01: all ten of caracas' categories carry an `imageUrl` pointing at
    `gdzthjcvzvhfpsvoxhbm.supabase.co` — a DECOMMISSIONED Supabase project. Every one fails to
    connect, while the item images on the live project return 200. A category circle drawn from
    `image_url` would be ten broken images.

    Both are returned rather than one chosen here, deliberately. The server cannot know a URL is
    dead without fetching it, and host-sniffing would only recognise the one decommissioned project
    we happen to know about today. The browser already knows: it renders `image_url` and swaps to
    the fallback on error, which works for this migration and for any image that dies later.

    The fallback is the first active item that has a picture — a sandwich category shows a
    sandwich, which is what a round thumbnail is for. `image_url` is returned unchanged, because
    dropping the stored value would hide the broken migration instead of working around it.
    """
    items = [i for i in (cat.items or []) if i.isActive] if cat.items is not None else []
    result = {
        "id":         cat.id,
        "name_ar":    cat.nameAr,
        "name_en":    cat.nameEn,
        "image_url":  cat.imageUrl,
        "fallback_image_url": next((i.imageUrl for i in items if i.imageUrl), None),
        "item_count": len(items) if cat.items is not None else None,
        # How many of those items carry a price at all. Derived from rows ALREADY loaded for
        # `fallback_image_url` above, so it costs no extra query — and it reaches both the full
        # menu and the tab list, because both go through this one serializer.
        #
        # «Priced» means `price is not None`, and deliberately NOT `price > 0`: writing `> 0`
        # here would re-encode the very assumption this change exists to remove, that a zero is
        # a way of saying "no price". Until the 18 caracas rows are migrated from 0 to NULL, the
        # two daily-priced categories therefore still report 10 and 8 here — correct against
        # today's data, which says they are priced at zero. Nothing consumes this field yet.
        "priced_item_count": sum(1 for i in items if i.price is not None)
        if cat.items is not None else None,
        "sort_order": cat.sortOrder,
    }
    if include_items:
        result["items"] = [_fmt_item(i) for i in items]
    return result


@router.get("/menu")
async def get_full_menu(
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("restaurant")),
):
    """The whole menu — every category with its items nested.

    🔴 WHY THIS WAS MISSING AND WHAT IT COST (found 2026-10-01, reported by Salman from his phone)
    The caracas menu page's «الكل» tab has called `GET /public/restaurant/menu` since it was
    written. That route did not exist: the public restaurant router had exactly two, both
    per-category. So «الكل» hit a 404 on every single load, and because the caller wrote
    `.catch(() => setAllItems([]))`, the failure rendered as «لا توجد عناصر في هذا التصنيف» —
    a tenant with 97 live items telling its customers it had none.

    **«الكل» has therefore never worked**, and it never announced itself: a swallowed error shown
    as an empty state is indistinguishable from an empty category. Nobody noticed because the page
    auto-selects the first real category on load, so you only reach it by tapping the tab.

    Nothing new is built here. `_fmt_category(include_items=True)` and
    `restaurant_repo.list_menu_categories(include_items=True)` both already existed and were never
    exposed — the same shape as the logo route added the same day. The response matches what the
    caller has always expected: `data.categories[].items[]`.
    """
    categories = await restaurant_repo.list_menu_categories(tenant["id"], include_items=True)
    return {
        "success": True,
        "data": {"categories": [_fmt_category(c, include_items=True) for c in categories]},
    }


@router.get("/menu/categories")
async def get_categories(
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("restaurant")),
):
    """Categories for tab navigation — no items in the payload, but loaded to derive two fields.

    `include_items=True` with `include_items=False` on the serializer is deliberate, not a
    contradiction: the rows are needed to compute `fallback_image_url` and `item_count`, and are
    then dropped from the response. One query instead of making every caller fetch the whole menu
    just to draw a thumbnail.
    """
    categories = await restaurant_repo.list_menu_categories(tenant["id"], include_items=True)
    return {
        "success": True,
        "data": [_fmt_category(c, include_items=False) for c in categories],
    }


@router.get("/menu/categories/{category_id}/items")
async def get_category_items(
    category_id: str,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("restaurant")),
):
    """Items for a specific category."""
    category = await restaurant_repo.find_menu_category_with_items(tenant["id"], category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")

    return {
        "success": True,
        "data": [_fmt_item(i) for i in (category.items or []) if i.isActive],
    }


# ── Order Creation ─────────────────────────────────────────────────────────────

class OrderItemIn(BaseModel):
    catalog_item_id: str
    quantity:        int = 1
    notes:           Optional[str] = None


class CreateOrderIn(BaseModel):
    customer_name:  str
    customer_phone: str
    table_number:   Optional[str] = None
    notes:          Optional[str] = None
    items:          list[OrderItemIn]


