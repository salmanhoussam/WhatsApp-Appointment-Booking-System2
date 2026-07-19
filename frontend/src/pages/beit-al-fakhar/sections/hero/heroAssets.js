/**
 * heroAssets.js — the ONLY file in the Hero that knows image URLs.
 *
 * Swap assets here when better Higgsfield generations are ready — nothing
 * in HeroExperience.jsx, DoorScene.jsx, or useDoorSequence.js references a
 * URL directly, so a swap here never touches animation code.
 *
 * Current doorClosed/doorOpen are Higgsfield restyle placeholders
 * (generated 2026-07-19 from the real storefront photo as reference) —
 * expected to be regenerated later. doorReal is the actual Beit Al-Fakhar
 * entrance photo and does not change.
 */
export const heroAssets = {
  doorClosed: {
    src: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beit-al-fakhar/pages/home/hero/door-closed.png',
    alt: 'بيت الفخار — الباب مغلق',
  },
  doorReal: {
    src: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beit-al-fakhar/special/gallery/01-entrance.jpg',
    alt: 'بيت الفخار — المدخل الحقيقي',
  },
  doorOpen: {
    src: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beit-al-fakhar/pages/home/hero/door-open.png',
    alt: 'بيت الفخار — الباب مفتوح، الداخل يظهر',
  },
};
