# Database Pooler Plan — Supabase Transaction Pooler Fix

## Root Cause

The backend was failing silently on DB connection errors.
`public_service.py` was catching all exceptions and returning `None`,
which caused routes to return `404 Not Found` instead of `500 Internal Server Error`.
This made connection failures look like "record not found" bugs.

## Environment Variables (Must be exact)

```env
# Transaction Pooler — port 6543 + pgbouncer=true — used for ALL runtime queries
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection — port 5432 — used ONLY for prisma migrate / db push
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
```

## prisma/schema.prisma datasource block

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Error Handling Rule (Implemented)

In `app/services/public_service.py`, the three public DB functions now follow this pattern:

```python
async def get_tenant_config(db, slug):
    try:
        record = await db.tenantconfig.find_unique(...)  # raises if DB is down
        if not record:
            return None   # ← legitimate 404: query succeeded, record absent
        return _record_to_dict(record)
    except Exception as e:
        logger.error(f"🔥 DB error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")
        # ↑ infrastructure failure → 500, never phantom 404
```

**Rule:** `return None` only when the query succeeds but finds no records.
Any exception from the DB layer raises `HTTPException(500)`.

## Functions Fixed

- `get_unit_services_data`
- `get_unit_calendar_data`
- `get_tenant_config`
