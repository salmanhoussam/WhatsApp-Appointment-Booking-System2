/**
 * walkthroughAssets.js — the ONLY file that knows about the hero frame
 * sequence's URLs/count. Swap the sequence here (different video, more/
 * fewer frames, different numbering) without touching useFrameSequence.js
 * or FrameSequenceCanvas.jsx.
 *
 * Source: the real Beit Al-Fakhar storefront walkthrough video
 * (properties/beit-al-fakhar/special/hero/WhatsApp Video 2026-07-13...mp4),
 * sampled at ~3.2fps across its ~22s duration — 100% real footage, no
 * AI-generated frames. Extracted 2026-07-19 via ffmpeg, uploaded as WebP.
 */
const FRAME_COUNT = 71;
const BASE_URL =
  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beit-al-fakhar/pages/home/hero/walkthrough';

export const walkthroughAssets = {
  frameCount: FRAME_COUNT,
  frameUrl: (index) => `${BASE_URL}/frame_${String(index + 1).padStart(3, '0')}.webp`,
  // Native pixel size of every frame (all frames share one size — extracted
  // from a single source video). Used for canvas "cover" cropping math.
  nativeWidth: 640,
  nativeHeight: 1138,
};
