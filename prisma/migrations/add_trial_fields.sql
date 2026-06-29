-- Migration: add trial/lifecycle fields to clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS status        VARCHAR(20)  NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS service_type  VARCHAR(50)  DEFAULT 'real_estate',
  ADD COLUMN IF NOT EXISTS notes         TEXT;

-- smar is the internal demo tenant, not a customer trial
UPDATE clients SET status = 'demo' WHERE slug = 'smar';
