import sqlite3
from contextlib import contextmanager

from config import settings


@contextmanager
def get_connection():
    conn = sqlite3.connect(settings.SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
