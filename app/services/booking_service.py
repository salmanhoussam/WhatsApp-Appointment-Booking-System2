import asyncio
from app.repositories import BookingRepository, CustomerRepository
from app.schemas.pagination import PaginatedResponse
from datetime import datetime
from typing import List, Optional

class BookingService:
    def __init__(self, booking_repo: BookingRepository, customer_repo: CustomerRepository):
        self.booking_repo = booking_repo
        self.customer_repo = customer_repo

    async def create_booking(self, client_id: str, unit_id: str, customer_data: dict, booking_data: dict):
        """
        Enterprise Booking Lifecycle:
        1. Resolve or Create the Customer.
        2. Check Unit availability for specific dates.
        3. Persist the Booking.
        """
        # 1. Resolve Customer by Phone
        customer = await self.customer_repo.get_by_phone(
            customer_data["phone"], client_id
        )
        
        if not customer:
            customer = await self.customer_repo.create(client_id, customer_data)
            
        # 2. Check Availability
        # Ensure isoformat is handled properly
        check_in = datetime.fromisoformat(booking_data["checkIn"])
        check_out = datetime.fromisoformat(booking_data["checkOut"])
        
        is_available = await self.booking_repo.check_availability(
            unit_id, check_in, check_out, client_id=client_id
        )
        
        if not is_available:
            raise ValueError("This unit is already booked for the selected dates.")
        # Ensure status is properly applied based on payment method
        payment_method = booking_data.get("payment_method", "cash")
        booking_data["status"] = "confirmed" if payment_method == "cash" else "pending"
            
        # 3. Create Booking
        return await self.booking_repo.create(
            client_id, unit_id, customer.id, booking_data
        )

    async def get_client_bookings(
        self, client_id: str, page: int = 1, limit: int = 20,
        status: Optional[str] = None,
        date_from=None,
        date_to=None,
    ) -> PaginatedResponse:
        """Admin view of all reservations — paginated, filterable by status and check-in range."""
        skip = (page - 1) * limit
        total, items = await asyncio.gather(
            self.booking_repo.count_by_client(client_id, status=status, date_from=date_from, date_to=date_to),
            self.booking_repo.get_all_by_client(client_id, skip=skip, take=limit, status=status, date_from=date_from, date_to=date_to),
        )
        return PaginatedResponse.build(data=items, total=total, page=page, limit=limit)

    async def update_booking_status(self, booking_id: str, client_id: str, status: str):
        """Update a booking's status — enforces tenant scoping."""
        VALID_STATUSES = {"pending", "confirmed", "cancelled", "completed"}
        if status not in VALID_STATUSES:
            raise ValueError(f"Invalid status '{status}'. Must be one of: {VALID_STATUSES}")
        return await self.booking_repo.update_status(booking_id, client_id, status)