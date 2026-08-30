-- WhatsApp Session Store (2026-08-30)
-- Fixes a confirmed production bug: whatsapp_flow.py's former in-memory `_sessions` dict is
-- invisible across gunicorn's 2 worker processes (Dockerfile: `-w 2`), so a real customer's
-- WhatsApp conversation could silently lose all state mid-flow depending on which worker handled
-- the next message -- see .claudedocs/implementation/WHATSAPP_DB_SESSIONS_FIX/evidence.md.
--
-- Run once against the Supabase database:
--   psql $DIRECT_URL -f prisma/migrations/add_whatsapp_sessions.sql

CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id TEXT        NOT NULL,
  customer_phone  TEXT        NOT NULL,
  client_id       UUID,
  step            TEXT        NOT NULL DEFAULT 'IDLE',
  state_data      JSONB,
  expires_at      TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (phone_number_id, customer_phone)
);

CREATE INDEX IF NOT EXISTS whatsapp_sessions_expires_at_idx ON public.whatsapp_sessions (expires_at);
