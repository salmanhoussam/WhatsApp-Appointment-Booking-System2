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

    async def record_outbound(
        self,
        wamid:             Optional[str],
        conversation_id:   str,
        client_id:         Optional[str],
        message_type:      str,
        text:              Optional[str] = None,
        template_name:     Optional[str] = None,
        template_language: Optional[str] = None,
        purpose:           Optional[str] = None,
        context_type:      Optional[str] = None,
        context_id:        Optional[str] = None,
        reservation_id:    Optional[str] = None,
    ) -> Optional[str]:
        """Record a message WE sent, and return its row id.

        THE ANCHOR HALF OF A3, AND WITHOUT IT A2 CANNOT WORK. `find_message_by_wamid()` above
        resolves an inbound button tap to the outbound message it answers -- and until this method
        existed nothing ever wrote that outbound row. Measured 2026-09-12: `whatsapp_messages` held
        19 rows, every one `direction="IN"`, and a repo-wide search for a write of `"OUT"` returned
        zero hits. So a real merchant tap on the live `new_reservation_alert` was refused with
        `unknown_context` (server log, 17:59) even though the template was delivered AND read, the
        tap arrived, and `_CONFIRM_INTENTS` matched its text correctly. Every link worked except
        the one looking for a row that was never created.

        WHY `wamid` IS CONDITIONAL RATHER THAN REQUIRED. A send can succeed without Meta returning
        an id in a shape we parse (`SendResult.wamid` is Optional by construction). Such a row is
        still worth keeping -- it makes the channel history complete -- it simply cannot anchor a
        tap. Passing `wamid=None` writes NULL, which the UNIQUE index permits any number of times;
        passing a duplicate is treated as an already-recorded send and its existing id returned,
        so a retried send never raises here.

        `direction`, and nothing else, distinguishes this from `claim_inbound()`. The two are kept
        separate deliberately: an inbound insert IS an idempotency claim whose boolean result
        decides whether to process a webhook, while an outbound insert is a record of something
        that already happened and whose caller must never be blocked by it.
        """
        data: dict = {
            "conversationId": conversation_id,
            "clientId":       client_id,
            "direction":      "OUT",
            "messageType":    message_type,
            "text":           text or None,
            # Meta accepted it at this instant. `deliveredAt`/`readAt` stay NULL until the
            # statuses[] callback arrives under this same wamid -- acceptance is not delivery.
            "sentAt":         datetime.now(timezone.utc),
        }
        if wamid:
            data["wamid"] = wamid
        for key, value in (("templateName", template_name),
                           ("templateLanguage", template_language),
                           ("purpose", purpose), ("contextType", context_type),
                           ("contextId", context_id), ("reservationId", reservation_id)):
            if value:
                data[key] = value
        try:
            row = await self.db.whatsappmessage.create(data=data)
            return row.id
        except UniqueViolationError:
            existing = await self.find_message_by_wamid(wamid) if wamid else None
            return existing.id if existing else None

    async def claim_inbound(
        self,
        wamid:           str,
        conversation_id: str,
        client_id:       Optional[str],
        message_type:    str,
        text:            Optional[str] = None,
        purpose:         Optional[str] = None,
        context_type:    Optional[str] = None,
        context_id:      Optional[str] = None,
        reservation_id:  Optional[str] = None,
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
        data: dict = {
            "conversationId": conversation_id,
            "clientId":       client_id,
            "direction":      "IN",
            "wamid":          wamid,
            "messageType":    message_type,
            "text":           text or None,
        }
        # The typed context (A3). Optional because a plain customer message answers nothing --
        # only a button tap carries one. Added 2026-09-12 for merchant actions, which need the
        # row to say WHY it exists, not just what it said.
        for key, value in (("purpose", purpose), ("contextType", context_type),
                           ("contextId", context_id), ("reservationId", reservation_id)):
            if value:
                data[key] = value
        try:
            await self.db.whatsappmessage.create(data=data)
            return True
        except UniqueViolationError:
            return False
