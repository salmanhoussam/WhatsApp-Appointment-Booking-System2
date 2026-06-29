from prisma import Prisma
from app.schemas.booking_service import BookingServiceCreate, BookingServiceUpdate
from typing import List, Optional

async def get_booking_services(db: Prisma, booking_id: str, client_id: str) -> List[dict]:
    booking = await db.booking.find_first(
        where={"id": booking_id, "clientId": client_id} # تم تصحيح clientId
    )
    if not booking:
        return []
    return await db.bookingservice.find_many(
        where={"bookingId": booking_id}, # تم تصحيح bookingId
        include={"service": True}
    )

async def add_service_to_booking(db: Prisma, booking_id: str, data: BookingServiceCreate, client_id: str) -> Optional[dict]:
    booking = await db.booking.find_first(
        where={"id": booking_id, "clientId": client_id}
    )
    if not booking:
        return None
    service = await db.service.find_first(
        where={"id": data.service_id, "clientId": client_id}
    )
    if not service:
        return None
    
    return await db.bookingservice.create(data={
        "bookingId": booking_id,
        "serviceId": data.service_id,
        "quantity": data.quantity,
        "price": float(service.basePrice),  # always read from DB — never trust the payload
    })

async def update_booking_service(db: Prisma, booking_id: str, service_id: str, data: BookingServiceUpdate, client_id: str) -> Optional[dict]:
    booking = await db.booking.find_first(
        where={"id": booking_id, "clientId": client_id}
    )
    if not booking or not await db.service.find_first(where={"id": service_id, "clientId": client_id}):
        return None
        
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    return await db.bookingservice.update(
        where={
            "bookingId_serviceId": { # تم تصحيح اسم الـ Compound ID حسب Prisma
                "bookingId": booking_id,
                "serviceId": service_id
            }
        },
        data=update_data
    )

async def remove_service_from_booking(db: Prisma, booking_id: str, service_id: str, client_id: str) -> bool:
    booking = await db.booking.find_first(
        where={"id": booking_id, "clientId": client_id}
    )
    if not booking:
        return False
        
    await db.bookingservice.delete(
        where={
            "bookingId_serviceId": {
                "bookingId": booking_id,
                "serviceId": service_id
            }
        }
    )
    return True