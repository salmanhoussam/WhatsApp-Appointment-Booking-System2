/**
 * SEO.jsx — Atom
 *
 * Injects document <title>, OpenGraph, and Twitter Card meta tags via
 * react-helmet-async. Reads tenant branding from useTenantConfig() so
 * all defaults (site name, theme color) stay in sync with the DB.
 *
 * Props (all optional — falls back to tenant + built-in defaults):
 *   title        — page title string (do NOT include site name — appended automatically)
 *   description  — meta description for search + social previews
 *   image        — absolute URL for og:image / twitter:image
 *   url          — canonical URL (defaults to window.location.href)
 *   noindex      — pass true to add noindex for admin/private pages
 */

import { Helmet } from 'react-helmet-async';
import useTenantConfig from '../../hooks/useTenantConfig';

const BASE_URL = 'https://smar.salmansaas.com';

// Premium default OG image — forest showcase shot
const DEFAULT_OG_IMAGE =
  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/showcase/journey_forest.jpg';

const DEFAULT_DESCRIPTION =
  'شاليهات وفيلل فاخرة في قلب جبال لبنان — إقامة لا تُنسى في أحضان الطبيعة. احجز عبر واتساب في دقيقة.';

export default function SEO({
  title,
  description,
  image,
  url,
  noindex = false,
}) {
  const { config } = useTenantConfig();

  const siteName = config.name_ar || 'بيت سمار';

  // Title: "الوحدات | بيت سمار" — if title already contains site name, use as-is
  const fullTitle = title
    ? (title.includes(siteName) ? title : `${title} | ${siteName}`)
    : siteName;

  const resolvedDesc  = description || DEFAULT_DESCRIPTION;
  const resolvedImage = image       || DEFAULT_OG_IMAGE;
  const resolvedUrl   = url         || (typeof window !== 'undefined' ? window.location.href : BASE_URL);
  const themeColor    = config.primary_color || '#d4a853';

  return (
    <Helmet>
      {/* ── Document ── */}
      <html lang="ar" dir="rtl" />
      <title>{fullTitle}</title>
      <meta name="description"  content={resolvedDesc} />
      <meta name="theme-color"  content={themeColor} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* ── OpenGraph (WhatsApp, Facebook, LinkedIn) ── */}
      <meta property="og:type"        content="website" />
      <meta property="og:site_name"   content={siteName} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={resolvedDesc} />
      <meta property="og:image"       content={resolvedImage} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url"         content={resolvedUrl} />
      <meta property="og:locale"      content="ar_LB" />

      {/* ── Twitter Card ── */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={resolvedDesc} />
      <meta name="twitter:image"       content={resolvedImage} />
    </Helmet>
  );
}
