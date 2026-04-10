from fastapi import APIRouter
from . import properties, units, bookings, listings

router = APIRouter()

router.include_router(properties.router, prefix="/properties", tags=["Public Properties"])
router.include_router(units.router, prefix="/units", tags=["Public Units"])
router.include_router(bookings.router, prefix="/bookings", tags=["Public Bookings"])
router.include_router(listings.router, prefix="/listings", tags=["Public Listings"])
