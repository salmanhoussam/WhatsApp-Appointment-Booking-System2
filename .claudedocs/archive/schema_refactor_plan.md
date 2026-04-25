# Schema Refactor Plan — Merge TenantConfig into Client

## Problem

`TenantConfig` was an orphaned table with no FK relation to any entity.
`Client` is the true root of the multi-tenant architecture.
Having two separate tables for the same tenant caused silent 404s and architectural confusion.

## Solution

Merge all branding/config fields from `TenantConfig` into `Client`, then drop `TenantConfig`.

## Fields Migrated to `Client`

| Field | Type | Notes |
|-------|------|-------|
| `name_ar` | `String?` | Arabic display name |
| `name_en` | `String?` | English display name |
| `primary_color` | `String?` | Brand hex color |
| `hero_video_url` | `String?` | Full-screen homepage video |
| `whatsapp_number` | `String?` | Public contact number |
| `currency` | `String` default `"USD"` | Pricing currency |
| `features` | `Json?` | Feature flags: `{spatial, listings, booking, payment}` |
| `unit_types` | `String[]` | e.g. `["villa", "chalet"]` |
| `payment_methods` | `String[]` | e.g. `["cash", "card", "whatsapp", "whish", "omt"]` |

## Backend Changes

- `public_service.get_tenant_config(slug)` now queries `db.client.find_first(where={"slug": slug})`
- Auto-seed logic: if `primary_color` is null on an existing smar Client → `update` with `_SMAR_STYLING`
- If smar Client row is entirely absent (fresh DB) → `create` with `_SMAR_CREATE`

## DB Commands (run after this change)

```bash
# Apply schema to Supabase (drops tenant_configs table, adds columns to clients)
npx prisma db push

# Regenerate Python client (already done by agent)
python -m prisma generate
```

## Auto-Seed Behavior (Zero Manual Setup)

On the first `/smar/config` request after deploy:
1. Query `clients` table by slug `"smar"`
2. If row exists but `primary_color` is null → patch it with SMAR branding
3. If row is completely absent → create it with full SMAR defaults
4. Return the config — frontend receives gold theme instantly
