"""
Routes only — no business logic here (mirrors the SalmanSaaS convention
of keeping routes as thin HTTP transport, per .claude/rules/backend/api-rules.md).
"""

import logging

from fastapi import APIRouter, HTTPException

from agents import command_agent
from app.schemas import CommandRequest, CommandResponse, SetupRequest, SetupResponse
from config import settings
from database.migrations.runner import run_migrations
from plugins import plugin_manager

logger = logging.getLogger("local_agent")

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok", "plugin": settings.ACTIVE_PLUGIN}


@router.get("/plugins")
def plugins():
    """
    Which plugin is active, and which have actually been loaded so far
    (plugin_manager only imports a plugin lazily when it becomes active —
    this is not a static list of every plugin that could theoretically
    exist under plugins/, just what's really running right now).
    """
    return {"active": settings.ACTIVE_PLUGIN, "loaded": plugin_manager.list_plugins()}


@router.post("/agent/setup", response_model=SetupResponse)
def setup(body: SetupRequest):
    """
    Creates the local database schema if it doesn't exist yet.

    Phase 1 note: the schema is fixed (customers/products/invoices) — the
    `context` field is logged for reference only, it does not yet drive a
    dynamically-generated schema. That's a real future enhancement, not
    something silently faked here.
    """
    try:
        run_migrations()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Migration failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if body.context:
        logger.info("Setup context received: %s", body.context)

    return SetupResponse(
        plugin=settings.ACTIVE_PLUGIN,
        tables_created=["customers", "products", "invoices"],
        context_received=body.context,
    )


@router.post("/agent/command", response_model=CommandResponse)
def command(body: CommandRequest):
    if not body.text or not body.text.strip():
        raise HTTPException(status_code=422, detail="text is required")
    reply = command_agent.handle(body.text)
    return CommandResponse(reply=reply)
