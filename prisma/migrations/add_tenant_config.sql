-- Phase 35.2 — TenantConfig table
-- Run once against the Supabase database:
--   psql $DIRECT_URL -f prisma/migrations/add_tenant_config.sql

CREATE TABLE IF NOT EXISTS public.tenant_configs (
  slug             TEXT        PRIMARY KEY,
  name_ar          TEXT        NOT NULL,
  name_en          TEXT        NOT NULL,
  primary_color    TEXT        NOT NULL,
  hero_video_url   TEXT,
  whatsapp_number  TEXT        NOT NULL,
  currency         TEXT        NOT NULL DEFAULT 'USD',
  features         JSONB       NOT NULL DEFAULT '{}',
  unit_types       TEXT[]      NOT NULL DEFAULT '{}',
  payment_methods  TEXT[]      NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: Beit Smar tenant config
INSERT INTO public.tenant_configs (
  slug, name_ar, name_en, primary_color, hero_video_url,
  whatsapp_number, currency, features, unit_types, payment_methods
) VALUES (
  'smar',
  'بيت سمار',
  'Beit Smar',
  '#d4a853',
  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/Logo_Formation_Video_Ready.mp4',
  '96178727986',
  'USD',
  '{"spatial": true, "listings": true, "booking": true, "payment": true}'::jsonb,
  ARRAY['villa', 'chalet'],
  ARRAY['cash', 'card', 'whatsapp', 'whish', 'omt']
)
ON CONFLICT (slug) DO UPDATE SET
  name_ar         = EXCLUDED.name_ar,
  name_en         = EXCLUDED.name_en,
  primary_color   = EXCLUDED.primary_color,
  hero_video_url  = EXCLUDED.hero_video_url,
  whatsapp_number = EXCLUDED.whatsapp_number,
  currency        = EXCLUDED.currency,
  features        = EXCLUDED.features,
  unit_types      = EXCLUDED.unit_types,
  payment_methods = EXCLUDED.payment_methods,
  updated_at      = NOW();
