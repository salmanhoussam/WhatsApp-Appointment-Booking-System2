"""
Single entrypoint main.py calls for any incoming instruction.

Phase 1 only has one capable sub-agent (database_agent), so routing is
trivial today. Phase 3 adds vision_agent (reading invoice images) — this
is the one place that will gain a real routing decision then, without
main.py or database_agent.py needing to change.
"""

from agents import database_agent


def handle(text: str) -> str:
    return database_agent.handle_message(text)
