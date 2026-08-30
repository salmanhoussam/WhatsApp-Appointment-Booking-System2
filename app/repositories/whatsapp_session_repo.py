"""
WhatsApp Session Repository — Prisma queries only.

Backs whatsapp_flow.py's conversation state, replacing its former in-memory dict (broken across
gunicorn's multiple worker processes -- see prisma/schema.prisma's WhatsAppSession model docstring
and .claudedocs/implementation/WHATSAPP_DB_SESSIONS_FIX/evidence.md for the full root cause).
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from prisma import Prisma, Json

SESSION_TTL_SECONDS = 1800  # 30 minutes -- same TTL the in-memory version used


class WhatsAppSessionRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def find_active(self, phone_number_id: str, customer_phone: str):
        """Return the session row for this (phone_number_id, customer_phone) pair, or None if it
        doesn't exist or has expired. Expiry is checked here (server-side, wall-clock), not left to
        the caller."""
        row = await self.db.whatsappsession.find_unique(
            where={
                "phoneNumberId_customerPhone": {
                    "phoneNumberId": phone_number_id,
                    "customerPhone": customer_phone,
                }
            }
        )
        if row is None:
            return None
        if row.expiresAt <= datetime.now(timezone.utc):
            return None
        return row

    async def upsert(
        self,
        phone_number_id: str,
        customer_phone: str,
        client_id: Optional[str],
        step: str,
        state_data: dict,
    ):
        """Create or overwrite the session row for this conversation, refreshing expiresAt to a
        fresh 30-minute window (matches the in-memory version's own touch() semantics: every
        message the customer sends extends the session, not just the first one)."""
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=SESSION_TTL_SECONDS)
        data = {
            "clientId": client_id,
            "step": step,
            "stateData": Json(state_data),
            "expiresAt": expires_at,
        }
        return await self.db.whatsappsession.upsert(
            where={
                "phoneNumberId_customerPhone": {
                    "phoneNumberId": phone_number_id,
                    "customerPhone": customer_phone,
                }
            },
            data={
                "create": {
                    "phoneNumberId": phone_number_id,
                    "customerPhone": customer_phone,
                    **data,
                },
                "update": data,
            },
        )

    async def delete(self, phone_number_id: str, customer_phone: str) -> None:
        await self.db.whatsappsession.delete_many(
            where={"phoneNumberId": phone_number_id, "customerPhone": customer_phone}
        )
