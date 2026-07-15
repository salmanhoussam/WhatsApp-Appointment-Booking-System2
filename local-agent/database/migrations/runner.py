"""
Applies schema.sql (or schema_postgres.sql) against the active plugin's
database. Idempotent — every statement is CREATE TABLE IF NOT EXISTS.
"""

import sqlite3

from config import settings


def run_sqlite_migrations() -> None:
    sql = settings.SCHEMA_SQL_PATH.read_text()
    conn = sqlite3.connect(settings.SQLITE_PATH)
    try:
        conn.executescript(sql)
        conn.commit()
    finally:
        conn.close()


def run_postgres_migrations() -> None:
    import psycopg

    sql = settings.POSTGRES_SCHEMA_SQL_PATH.read_text()
    conn = psycopg.connect(settings.POSTGRES_DSN)
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    finally:
        conn.close()


def run_migrations(plugin: str = None) -> None:
    plugin = plugin or settings.ACTIVE_PLUGIN
    if plugin == "sqlite":
        run_sqlite_migrations()
    elif plugin == "postgres":
        run_postgres_migrations()
    else:
        raise ValueError(f"No migration runner for plugin '{plugin}'")
