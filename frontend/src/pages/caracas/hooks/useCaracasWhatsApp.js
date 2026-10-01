import useTenantConfig from '../../../hooks/useTenantConfig';

/**
 * The restaurant's own WhatsApp number, from the tenant config — never a literal.
 *
 * WHY THIS EXISTS (2026-10-01)
 * ----------------------------
 * Every caracas page hardcoded `96178727986`, which is the PLATFORM owner's personal number, not
 * the restaurant's. So every customer who tapped "اطلب عبر واتساب" messaged Salman instead of the
 * restaurant, and the restaurant owner never saw a single order. Found by driving a real browser
 * through the customer journey: the button calls
 * `window.open("https://wa.me/96178727986?text=<the order>")` and the whole journey issues zero
 * POST, so nothing in our system recorded it either.
 *
 * The correct number was already in the database (`clients.whatsapp_number`), already served by
 * `GET /api/v1/public/caracas/config`, and already read correctly one folder over by
 * `pages/generic/normal/CartPage.jsx:365`. Only this tenant's bespoke pages ignored it — the same
 * "second parallel path to one capability" shape `rules/backend/architecture.md` §9 names.
 *
 * `link()` returns **null** when no number is known. That is deliberate: an inert button is a
 * visible, harmless failure, while `wa.me/` with an empty number opens a broken page, and a stale
 * literal sends a real order to the wrong person. Callers must handle null rather than interpolate
 * it.
 *
 * The slug is passed explicitly instead of relying on route resolution, because these pages are
 * caracas-specific by construction and a resolver fallback to another tenant's config would
 * reintroduce exactly the bug this file fixes.
 */
const SLUG = 'caracas';

export default function useCaracasWhatsApp() {
  const { config, isLoading } = useTenantConfig(SLUG);
  const phone = (config?.whatsapp_number || '').replace(/[^0-9]/g, '');
  const link = (text) =>
    phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : null;
  return { phone, link, isLoading };
}
