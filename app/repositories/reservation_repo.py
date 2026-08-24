"""
Reservation Repository — CRUD only, no business logic.
All queries MUST filter by clientId.
"""

from datetime import datetime, timedelta
from prisma import Prisma


class ReservationRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def create(self, data: dict):
        return await self.db.reservation.create(data=data)

    async def find_by_id(self, reservation_id: str, client_id: str):
        return await self.db.reservation.find_first(
            where={"id": reservation_id, "clientId": client_id}
        )

    async def find_by_id_and_phone(self, reservation_id: str, client_id: str, customer_phone: str):
        return await self.db.reservation.find_first(
            where={
                "id":            reservation_id,
                "clientId":      client_id,
                "customerPhone": customer_phone,
            }
        )

    async def list_by_client(
        self,
        client_id: str,
        module_key: str | None = None,
        status: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 50,
        barber_id: str | None = None,
    ) -> list:
        where: dict = {"clientId": client_id}
        if module_key:
            where["moduleKey"] = module_key
        if status:
            where["status"] = status
        if barber_id:
            where["barberId"] = barber_id
        if date_from or date_to:
            where["reservedAt"] = {}
            if date_from:
                where["reservedAt"]["gte"] = date_from
            if date_to:
                where["reservedAt"]["lte"] = date_to

        return await self.db.reservation.find_many(
            where=where,
            order={"reservedAt": "asc"},
            take=limit,
        )

    async def list_all_for_client_with_service(self, client_id: str) -> list:
        """Every reservation for this tenant, real `service` relation included (for name
        resolution) -- no take limit, tenant-wide (not barber-scoped like
        list_customer_identities_for_barber below). Used only by the Customer Registry
        aggregation (customer_registry_service.py) -- a real, separate, TENANT_ADMIN-gated read
        path from list_my_clients' STAFF-scoped one, which stays untouched."""
        return await self.db.reservation.find_many(
            where={"clientId": client_id},
            include={"service": True},
            order={"reservedAt": "desc"},
        )

    async def list_orphan_for_client_with_service(self, client_id: str) -> list:
        """Phase D (Customer Experience, 2026-08-24) -- Reservations with NO linked Customer row
        (customerId IS NULL): rows created before Phase A's find-or-create existed, or any future
        edge case. The Customer Registry (customer_registry_service.py) reads real Customer rows'
        joined reservation history first (CustomerRepository.list_with_reservations) and uses this
        as the fallback for whatever that join can't cover -- so pre-Phase-A history is never
        silently dropped from the registry."""
        return await self.db.reservation.find_many(
            where={"clientId": client_id, "customerId": None},
            include={"service": True},
            order={"reservedAt": "desc"},
        )

    async def list_customer_identities_for_barber(self, client_id: str, barber_id: str) -> list:
        """Staff Scoped Access Phase C (2026-08-09) -- every reservation for one barber, no take
        limit, used only to derive distinct client identity (name/phone/email). Not a paginated
        list view -- see reservation_service.list_my_clients() for the dedup step."""
        return await self.db.reservation.find_many(
            where={"clientId": client_id, "barberId": barber_id},
        )

    async def find_overlapping(
        self,
        client_id: str,
        module_key: str,
        reserved_at: datetime,
        duration_min: int,
        exclude_id: str | None = None,
    ) -> list:
        """Fetch active reservations in a ±4h window for conflict checking."""
        window_start = reserved_at - timedelta(hours=4)
        window_end   = reserved_at + timedelta(hours=4)
        where: dict = {
            "clientId":  client_id,
            "moduleKey": module_key,
            "status":    {"in": ["pending", "confirmed", "arrived"]},
            "reservedAt": {"gte": window_start, "lte": window_end},
        }
        if exclude_id:
            where["id"] = {"not": exclude_id}
        return await self.db.reservation.find_many(where=where)

    async def find_overlapping_by_resource(
        self,
        client_id: str,
        resource_id: str,
        reserved_at: datetime,
        duration_min: int,
        exclude_id: str | None = None,
    ) -> list:
        """Same ±4h window strategy as find_overlapping, but scoped by the real resourceId FK
        (indexed via @@index([clientId, resourceId, reservedAt])) instead of moduleKey + time
        only — no metadata string-matching needed for resource-backed reservations."""
        window_start = reserved_at - timedelta(hours=4)
        window_end   = reserved_at + timedelta(hours=4)
        where: dict = {
            "clientId":   client_id,
            "resourceId": resource_id,
            "status":     {"in": ["pending", "confirmed", "arrived"]},
            "reservedAt": {"gte": window_start, "lte": window_end},
        }
        if exclude_id:
            where["id"] = {"not": exclude_id}
        return await self.db.reservation.find_many(where=where)

    async def find_overlapping_by_barber(
        self,
        client_id: str,
        barber_id: str,
        reserved_at: datetime,
        duration_min: int,
        exclude_id: str | None = None,
    ) -> list:
        """Conflict lookup for the barber-backed Reservation Strategy (2nd real case, built
        independently of find_overlapping_by_resource() above per Salman's instruction, 2026-07-31
        -- not a call into that function, a fresh one scoped by the real barberId FK instead."""
        window_start = reserved_at - timedelta(hours=4)
        window_end   = reserved_at + timedelta(hours=4)
        where: dict = {
            "clientId":   client_id,
            "barberId":   barber_id,
            "status":     {"in": ["pending", "confirmed", "arrived"]},
            "reservedAt": {"gte": window_start, "lte": window_end},
        }
        if exclude_id:
            where["id"] = {"not": exclude_id}
        return await self.db.reservation.find_many(where=where)

    async def find_by_barber_on_date(
        self,
        client_id: str,
        barber_id: str,
        day_start: datetime,
        day_end: datetime,
    ) -> list:
        """One query for a barber's whole day, used by the availability slot-generator
        (Reservation Pilot Phase 1) so candidate-slot filtering happens in memory instead of
        one DB round-trip per candidate -- find_overlapping_by_barber() above is the right
        shape for checking a single proposed booking, not for generating many candidates."""
        return await self.db.reservation.find_many(where={
            "clientId":   client_id,
            "barberId":   barber_id,
            "status":     {"in": ["pending", "confirmed", "arrived"]},
            "reservedAt": {"gte": day_start, "lte": day_end},
        })

    async def update_status(self, reservation_id: str, client_id: str, status: str):
        # update_many() returns a plain int (the row count) in this prisma-client-py version
        # (0.15.0, confirmed directly in venv/lib/.../prisma/actions.py), not an object with a
        # .count attribute -- fixed 2026-07-30, see todo_list.md for the pre-existing bug report.
        updated_count = await self.db.reservation.update_many(
            where={"id": reservation_id, "clientId": client_id},
            data={"status": status},
        )
        if updated_count == 0:
            return None
        return await self.find_by_id(reservation_id, client_id)

    async def update_fields(self, reservation_id: str, client_id: str, data: dict):
        """Generic tenant-scoped patch -- used by edit_reservation() (time/barber/duration/name/
        phone/service change, Phase 3.1 reschedule + Phase 3.2 full Edit, one function). Same
        update_many()-then-refetch shape as update_status()/cancel() above, for the same reason
        (this prisma-client-py version's update_many() returns a row count, not a row)."""
        updated_count = await self.db.reservation.update_many(
            where={"id": reservation_id, "clientId": client_id},
            data=data,
        )
        if updated_count == 0:
            return None
        return await self.find_by_id(reservation_id, client_id)

    async def cancel(self, reservation_id: str, client_id: str, customer_phone: str):
        # Same update_many() return-type fix as update_status() above.
        updated_count = await self.db.reservation.update_many(
            where={
                "id":            reservation_id,
                "clientId":      client_id,
                "customerPhone": customer_phone,
                "status":        {"in": ["pending", "confirmed"]},
            },
            data={"status": "cancelled"},
        )
        return updated_count > 0
