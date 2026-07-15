from contextlib import contextmanager

from config import settings


@contextmanager
def get_connection():
    import psycopg
    from psycopg.rows import dict_row

    conn = psycopg.connect(settings.POSTGRES_DSN, row_factory=dict_row)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
