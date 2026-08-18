-- Media/Content Foundation -- GalleryImage.media_type + GalleryImage.alt_text
-- Additive only, no existing row touched (defaults kept, no backfill needed).
-- See .claudedocs/architecture/ALZABT_MEDIA_CONTENT_FOUNDATION_PROPOSAL.md
-- Run once against the Supabase database:
--   psql $DIRECT_URL -f prisma/migrations/add_gallery_image_media_type.sql

ALTER TABLE public.gallery_images
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS alt_text   TEXT;

-- Verify: every existing row must show media_type = 'image', alt_text = NULL immediately after.
SELECT client_id, image_type, media_type, alt_text, url FROM public.gallery_images ORDER BY created_at DESC LIMIT 20;
