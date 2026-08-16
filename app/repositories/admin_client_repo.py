"""
Admin Client Repository — Prisma write/read queries for the Client model.
Extends the read-only client_repo with admin mutations.
No business logic here.
"""

from app.db.client import prisma_client


async def find_client_by_id(client_id: str):
    """Fetch Client by UUID."""
    return await prisma_client.client.find_unique(where={"id": client_id})


async def find_client_by_slug(slug: str):
    """Fetch Client by slug."""
    return await prisma_client.client.find_unique(where={"slug": slug})


async def find_client_by_identifier(identifier: str):
    """Find a client matching slug, email, or phone (for login)."""
    return await prisma_client.client.find_first(
        where={
            "OR": [
                {"slug":  identifier},
                {"email": identifier},
                {"phone": identifier},
            ]
        }
    )


async def update_client(client_id: str, data: dict):
    """Update a Client row by primary key."""
    return await prisma_client.client.update(
        where={"id": client_id},
        data=data,
    )


async def claim_provisioning(client_id: str) -> bool:
    """
    Atomically claim a client for provisioning (Unified Provisioning Contract, Phase 3.6,
    2026-08-15 -- closes a real concurrency gap found in Phase 3.5's audit). Flips
    provisioningStatus to "provisioning" ONLY if it isn't already "provisioning" or "complete" --
    a single conditional UPDATE, not a separate read-then-write, so two genuinely simultaneous
    calls for the same client can't both pass a check and both proceed to create duplicate rows.

    Returns True if this call won the claim (proceed with provisioning). Returns False if another
    call already holds it -- the caller must then re-check the real current status to tell "someone
    else just finished" from "someone else is actively working" (see provisioning_service.py).

    update_many() returns a plain int (the row count) in this prisma-client-py version (0.15.0),
    not an object with a .count attribute -- same fix already documented in reservation_repo.py's
    update_status()/update_fields(), confirmed directly in venv/lib/.../prisma/actions.py.
    """
    # P0 wipe-guard (2026-08-16, ALZABT_PROVISIONING_DOMAIN_OBJECTS_P0_WIPE_GUARD_PROPOSAL.md):
    # allowlist, not the original blocklist -- a client with provisioningStatus=None (a legacy or
    # Demo-Builder-provisioned tenant this orchestration never owns) must never win this claim,
    # even if provisioning_service.py's own earlier explicit check were ever bypassed. Same
    # single atomic conditional UPDATE as before, no new read-then-write window.
    updated_count = await prisma_client.client.update_many(
        where={
            "id": client_id,
            "provisioningStatus": {"in": ["pending", "failed"]},
        },
        data={"provisioningStatus": "provisioning"},
    )
    return updated_count == 1
