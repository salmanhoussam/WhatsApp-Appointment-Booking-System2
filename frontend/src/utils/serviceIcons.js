import { Scissors, UserRound, ScissorsLineDashed, Wind, Sparkles, Paintbrush } from 'lucide-react'

/**
 * Real-name -> icon mapping for barber services, keyed by the exact Arabic name a real tenant's
 * CatalogService uses (confirmed against RK/Mister H's real service names, not guessed). Extracted
 * from ReservePage.jsx (2026-08-18, Homepage Phase 2.3) so CatalogItemCard's richer placeholder for
 * bookable services (no cart-item version needs this) reuses the same one canonical mapping instead
 * of a second, drifting copy.
 */
const SERVICE_ICONS = {
  'شعر':            Scissors,
  'دقن':            UserRound,
  'شعر ودقن':       ScissorsLineDashed,
  'تمشيط أو تسريح': Wind,
  'كرياتين':        Sparkles,
  'حنة أو صبغة':    Paintbrush,
}

export function serviceIconFor(nameAr) {
  return SERVICE_ICONS[nameAr] ?? Scissors
}
