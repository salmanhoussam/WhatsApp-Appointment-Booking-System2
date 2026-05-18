"""
app/api/v1/public/ai_chat.py
SalmanSaaS Showcase Chatbot — POST /api/v1/public/ai/chat

Streaming SSE endpoint (no auth required).
Uses Anthropic claude-haiku-4-5-20251001 with AsyncAnthropic.messages.stream().
Rate limit: 20 req/minute per IP (in-memory, no Redis).
"""

import json
import logging
import time
from collections import defaultdict
from typing import AsyncGenerator, Optional

import anthropic
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = (
    "You are a helpful assistant for SalmanSaaS — an Arabic SaaS platform that helps "
    "businesses create professional websites for booking, restaurant menus, and online stores. "
    "Answer questions about the platform concisely. "
    "Supported modules: booking (فندق/شاليه/فيلا reservations), "
    "restaurant (قوائم مطاعم), store (متجر إلكتروني). "
    "Pricing: Starter (free), Pro ($29/mo), Enterprise (contact). "
    "Answer in the same language the user writes in (Arabic or English). "
    "Keep answers under 3 sentences."
)

# ── Rate limiter (in-memory) ──────────────────────────────────────────────────

# { ip: [timestamp, ...] }  — only keep last 60 seconds of timestamps
_rate_store: dict[str, list[float]] = defaultdict(list)

_RATE_LIMIT = 20       # max requests
_RATE_WINDOW = 60.0    # per seconds


def _check_rate_limit(ip: str) -> bool:
    """
    Returns True if the IP is within the rate limit.
    Cleans up old timestamps on every call (no background task needed).
    """
    now = time.monotonic()
    window_start = now - _RATE_WINDOW

    # Keep only timestamps inside the current window
    timestamps = [t for t in _rate_store[ip] if t > window_start]
    _rate_store[ip] = timestamps

    if len(timestamps) >= _RATE_LIMIT:
        return False

    _rate_store[ip].append(now)
    return True


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str          # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[list[ChatMessage]] = Field(default_factory=list)


# ── SSE generator ─────────────────────────────────────────────────────────────

async def _stream_claude(message: str, history: list[ChatMessage]) -> AsyncGenerator[str, None]:
    """Yields SSE-formatted strings from Claude's streaming response."""
    api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
    if not api_key:
        yield f"data: {json.dumps({'error': 'AI not configured'})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"
        return

    # Build messages list — cap history at last 10 turns
    messages: list[dict] = []
    for msg in (history or [])[-10:]:
        if msg.role in ("user", "assistant"):
            messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": message})

    client = anthropic.AsyncAnthropic(api_key=api_key)

    try:
        async with client.messages.stream(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=_SYSTEM_PROMPT,
            messages=messages,
        ) as stream:
            async for text_chunk in stream.text_stream:
                yield f"data: {json.dumps({'text': text_chunk})}\n\n"

    except anthropic.APIStatusError as e:
        logger.error("Claude API error: %s", e)
        yield f"data: {json.dumps({'error': f'Claude API error: {e.status_code}'})}\n\n"
    except anthropic.APIConnectionError as e:
        logger.error("Claude connection error: %s", e)
        yield f"data: {json.dumps({'error': 'Connection to AI service failed'})}\n\n"
    except Exception as e:
        logger.error("Unexpected streaming error: %s", e)
        yield f"data: {json.dumps({'error': 'Internal streaming error'})}\n\n"
    finally:
        yield f"data: {json.dumps({'done': True})}\n\n"


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/chat", tags=["Public AI"])
async def ai_chat(request: Request, body: ChatRequest):
    """
    Streaming SSE chatbot for the SalmanSaaS showcase homepage.
    No auth required. Rate limited to 20 req/min per IP.
    """
    # ── Guard: API key configured? ─────────────────────────────────
    if not getattr(settings, "ANTHROPIC_API_KEY", None):
        raise HTTPException(
            status_code=503,
            detail={"success": False, "error": "AI not configured"},
        )

    # ── Rate limit ─────────────────────────────────────────────────
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail={"success": False, "error": "Rate limit exceeded. Try again in a minute."},
        )

    return StreamingResponse(
        _stream_claude(body.message, body.history or []),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
