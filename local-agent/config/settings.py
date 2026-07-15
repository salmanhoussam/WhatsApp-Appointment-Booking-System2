"""
Central configuration for the Salman Local AI Agent.

Everything the rest of the app needs to know about *where* data lives and
*which* LLM to call lives here — nothing else in the codebase should read
environment variables directly.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# -- Active plugin -----------------------------------------------------------
# One of: "sqlite", "postgres" (mysql/sqlserver/pos are Phase 3, not wired yet)
ACTIVE_PLUGIN = os.environ.get("LOCAL_AGENT_PLUGIN", os.environ.get("LOCAL_AGENT_DB", "sqlite"))

# -- SQLite ------------------------------------------------------------------
SQLITE_PATH = str(BASE_DIR / "storage" / "local.db")

# -- Postgres (used only when ACTIVE_PLUGIN == "postgres") -------------------
POSTGRES_DSN = os.environ.get(
    "LOCAL_AGENT_POSTGRES_DSN",
    "postgresql://postgres:postgres@localhost:5432/local_agent",
)

# -- Ollama (local LLM, fully offline) ----------------------------------------
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")

# -- Server --------------------------------------------------------------
HOST = os.environ.get("LOCAL_AGENT_HOST", "127.0.0.1")
PORT = int(os.environ.get("LOCAL_AGENT_PORT", "8010"))

# -- Paths ---------------------------------------------------------------
LOGS_DIR = BASE_DIR / "logs"
STORAGE_DIR = BASE_DIR / "storage"
SCHEMA_SQL_PATH = BASE_DIR / "database" / "migrations" / "schema.sql"
POSTGRES_SCHEMA_SQL_PATH = BASE_DIR / "database" / "migrations" / "schema_postgres.sql"

LOGS_DIR.mkdir(exist_ok=True)
STORAGE_DIR.mkdir(exist_ok=True)
