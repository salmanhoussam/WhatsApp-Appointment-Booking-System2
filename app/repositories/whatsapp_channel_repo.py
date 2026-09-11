"""
WhatsApp Channel Repository — Prisma queries only.

Backs the channel's own three tables (accounts, conversations, messages). Design and the
reasoning behind every invariant enforced here:
`.claudedocs/plans/whatsapp-channel-data-model.md`.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from prisma import Prisma
from prisma.errors import UniqueViolationError

logger = logging.getLogger(__name__)


class WhatsAppChannelRepository:
    def __init__(self, db: Prisma):
        self.db = db

    # ── Account ──────────────────────────────────────────────────────────────

    async def get_or_create_account(self, phone_number_id: str, display_phone: str = ""):
        """The channel a message arrived on — NEVER the tenant it belongs to.

        Self-seeding on first inbound message rather than requiring a manual bootstrap row: the
        id comes from Meta's own payload, so there is nothing for a human to type wrong. `scope`
        defaults to "central", which is what every number is until a second one exists.
        """
        row = await self.db.whatsappaccount.find_unique(
            where={"phoneNumberId": phone_number_id})
        if row:
            return row
        try:
            return await self.db.whatsappaccount.create(data={
                "phoneNumberId":      phone_number_id,
                "displayPhoneNumber": display_phone or None,
            })
        except UniqueViolationError:
            # Another worker created it between the read and the write — gunicorn -w 2.
            return await self.db.whatsappaccount.find_unique(
                where={"phoneNumberId": phone_number_id})

    # ── Conversation ─────────────────────────────────────────────────────────

    async def resolve_or_open_conversation(
        self,
        account_id:     str,
        customer_phone: str,
        client_id:      Optional[str],
    ):
        """The ACTIVE conversation for this (account, phone, tenant), opening one if none.

        `client_id` may be None — a merchant onboarding conversation exists before its tenant
        does. Postgres treats each NULL as distinct, so the partial unique index does not limit
        those to one per phone; that is intended and documented in the schema.

        The index `whatsapp_conversations_active_uidx` is what makes the race safe: two workers
        racing to open the same conversation produce one winner and one UniqueViolationError,
        which is then re-read rather than retried.
        """
        where = {
            "accountId":     account_id,
            "customerPhone": customer_phone,
            "clientId":      client_id,
            "status":        "active",
        }
        row = await self.db.whatsappconversation.find_first(where=where)
        if row:
            return row
        try:
            return await self.db.whatsappconversation.create(data={
                "accountId":     account_id,
                "customerPhone": customer_phone,
                "clientId":      client_id,
            })
        except UniqueViolationError:
            return await self.db.whatsappconversation.find_first(where=where)

    async def touch_conversation(self, conversation_id: str) -> None:
        await self.db.whatsappconversation.update(
            where={"id": conversation_id},
            data={"lastMessageAt": datetime.now(timezone.utc)},
        )

    # ── Messages ─────────────────────────────────────────────────────────────

    async def find_message_by_wamid(self, wamid: str):
        """The message Meta says a button tap is answering — the anchor A3 defines.

        `context.id` on an inbound tap is the wamid of OUR outbound alert. Resolving it here is
        what lets a merchant action take its reservation and tenant from real recorded state
        instead of from the button's own text, which a second booking in the same hour would
        duplicate exactly.
        """
        if not wamid:
            return None
        return await self.db.whatsappmessage.find_unique(where={"wamid": wamid})

    async def claim_inbound(
        self,
        wamid:           str,
        conversation_id: str,
        client_id:       Optional[str],
        message_type:    str,
        text:            Optional[str] = None,
    ) -> bool:
        """Record an inbound message, and say whether THIS call is the one that claimed it.

        Returns True when the row was created here (process the message), False when Meta has
        already delivered this wamid before (ignore it).

        The INSERT ITSELF is the claim. A "does it exist?" read followed by a write races under
        `gunicorn -w 2` — the same multi-worker reality that broke the in-memory session store —
        and two racing webhook retries would both pass the read. A unique index cannot be raced.

        `client_id` is taken from the caller only because the caller has just resolved the
        conversation; it must always be that conversation's own clientId, never an independent
        value. See the schema's own note on this being derived, not a second source of truth.
        """
        try:
            await self.db.whatsappmessage.create(data={
                "conversationId": conversation_id,
                "clientId":       client_id,
                "direction":      "IN",
                "wamid":          wamid,
                "messageType":    message_type,
                "text":           text or None,
            })
            return True
        except UniqueViolationError:
            return False
