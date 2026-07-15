"""
Thin wrapper around a fully local Ollama model, spoken to via its
OpenAI-compatible endpoint (http://localhost:11434/v1). No network call
ever leaves the machine — prompts and data both stay local, which is the
whole point of this product.

Requires a tool-calling-capable model to already be pulled, e.g.:
    ollama pull qwen2.5:7b
"""

import json
import logging
from pathlib import Path

from openai import APIError, OpenAI

from ai.tools import TOOLS
from config import settings

logger = logging.getLogger("local_agent")

_SYSTEM_PROMPT = (Path(__file__).parent / "prompts" / "system.md").read_text()

_client = OpenAI(base_url=f"{settings.OLLAMA_HOST}/v1", api_key="ollama")  # api_key is unused by Ollama


def ask(user_message: str) -> dict:
    """
    Sends one user message + the tool schema to the local model.

    Returns exactly one of:
      {"type": "tool_call", "name": str, "arguments": dict}
      {"type": "text", "content": str}
      {"type": "error", "message": str}   -- Ollama unreachable, or the
                                              model returned something we
                                              couldn't parse as a valid tool call.
    """
    try:
        response = _client.chat.completions.create(
            model=settings.OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            tools=TOOLS,
        )
    except APIError as exc:
        # Covers connection failures (Ollama not running/unreachable) and
        # any error response Ollama's OpenAI-compatible endpoint returns
        # (e.g. unknown model). Both are operational, not programming, errors.
        logger.warning("Ollama call failed: %s", exc)
        return {
            "type": "error",
            "message": (
                f"Local AI model isn't responding — make sure Ollama is running "
                f"(`ollama serve`) with `{settings.OLLAMA_MODEL}` pulled, "
                f"reachable at {settings.OLLAMA_HOST}."
            ),
        }

    message = response.choices[0].message

    if message.tool_calls:
        call = message.tool_calls[0]
        try:
            arguments = json.loads(call.function.arguments or "{}")
        except json.JSONDecodeError as exc:
            logger.warning("Model returned malformed tool-call arguments: %s", exc)
            return {
                "type": "error",
                "message": "Local AI model returned an invalid response — try rephrasing.",
            }
        return {"type": "tool_call", "name": call.function.name, "arguments": arguments}

    return {"type": "text", "content": message.content or ""}
