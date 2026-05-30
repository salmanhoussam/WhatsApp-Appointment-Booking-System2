from .client_repo import ClientRepository
from .property_repo import PropertyRepository
from .unit_repo import UnitRepository
from .customer_repo import CustomerRepository
from .booking_repo import BookingRepository
from .availability_repo import AvailabilityRepository
from .dashboard_repo import DashboardRepository

# Admin-specific repos (module-level functions, not classes)
from . import user_repo
from . import client_services_repo
from . import gallery_repo
from . import admin_catalog_repo
from . import service_repo
from . import price_repo
from . import restaurant_admin_repo
from . import store_admin_repo
from . import admin_client_repo

__all__ = [
    "ClientRepository",
    "PropertyRepository",
    "UnitRepository",
    "CustomerRepository",
    "BookingRepository",
    "AvailabilityRepository",
    "DashboardRepository",
    # Module-style repos
    "user_repo",
    "client_services_repo",
    "gallery_repo",
    "admin_catalog_repo",
    "service_repo",
    "price_repo",
    "restaurant_admin_repo",
    "store_admin_repo",
    "admin_client_repo",
]
