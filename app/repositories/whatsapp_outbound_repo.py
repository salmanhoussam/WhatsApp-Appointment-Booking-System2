"""
WhatsApp Outbound Repository — Prisma queries only.

Backs the correlation between an outbound WhatsApp message and the reply it expects. See
prisma/schema.prisma's WhatsAppOutbound docstring for why this is a table and not a column on
Reservation (one alert reaches up to two recipients, and each send gets its own wamid).
"""

from typing import Optional

from prisma import Prisma


class WhatsAppOutboundRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def record(
        self,
        wamid:          str,
        client_id:      str,
        purpose:        str,
        recipient:      str,
        reservation_id: Optional[str] = None,
    ):
        """Remember that `wamid` was sent, so a later reply carrying it as `context.id` resolves.

        Upsert rather than create: Meta's ids are unique, but a retry of the same send must not
        turn a duplicate into an exception inside a notification path whose whole contract is that
        it never raises.
        """
        return await self.db.whatsappoutbound.upsert(
            where={"wamid": wamid},
            data={
                "create": {
                    "wamid":         wamid,
                    "clientId":      client_id,
                    "purpose":       purpose,
                    "recipient":     recipient,
                    "reservationId": reservation_id,
                },
                "update": {
                    "purpose":       purpose,
                    "recipient":     recipient,
                    "reservationId": reservation_id,
                },
            },
        )

    async def find_by_wamid(self, wamid: str, client_id: Optional[str] = None):
        """Resolve an inbound reply's `context.id` back to what we sent.

        `client_id` is optional ONLY because the inbound webhook resolves its tenant from this
        very row -- it is the one caller that cannot filter by a tenant it does not yet know.
        Every other caller must pass it, per the platform's clientId-on-every-query rule.
        """
        row = await self.db.whatsappoutbound.find_unique(where={"wamid": wamid})
        if row is None:
            return None
        if client_id is not None and row.clientId != client_id:
            return None
        return row
