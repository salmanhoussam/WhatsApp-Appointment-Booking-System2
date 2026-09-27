/**
 * bookingEndpoints.js — which endpoints a booking module talks to, and what it sends.
 *
 * P5-D (Salman, 2026-09-27), the step after T-ب-٦: the hook resolved WHICH experience to show from
 * `booking_module`; this resolves WHICH requests that experience makes. Pure -- no React, no
 * publicApi, no I/O -- for the same reason ./bookingMode.js is: this project has no JavaScript test
 * runner, so logic that matters has to be callable from node to be measured at all.
 *
 * 🔴 THE THREE DIFFERENCES ARE NOT COSMETIC, AND ONE OF THEM IS A RATIFIED PROHIBITION
 *
 *   staff list    barber  GET /reservations/barbers                  SOFT filter by service:
 *                         ?client_slug&service_id?                   an empty filtered result falls
 *                                                                    back to the FULL list
 *                 clinic  GET /reservations/resources                HARD filter:
 *                         ?client_slug&module_key=clinic&service_id? empty means "no doctor here
 *                                                                    performs this", never "we
 *                                                                    could not tell" (ق-٤-ب/ق-٤-ز)
 *
 *   availability  barber  GET /reservations/availability
 *                         ?client_slug&barber_id&date&duration_min
 *                 clinic  GET /reservations/resources/{id}/availability
 *                         ?client_slug&service_id&date
 *                         🔴 NO duration_min -- ق-٤-أ. The server derives it from
 *                         CatalogService.durationMin so a caller CANNOT ask for a length the
 *                         service does not have. Sending it here is not harmless noise, it is
 *                         asking for a guarantee the contract exists to remove. And service_id is
 *                         REQUIRED here while optional on the picker, because the duration has
 *                         nowhere else to come from.
 *
 *   create        barber  metadata { barber_id,   service_id }
 *                 clinic  metadata { resource_id, service_id }   -- mirrored to Reservation.resourceId
 *
 * Every function returns null when the request is not yet makeable, so a caller never builds a
 * half-formed URL and never has to remember which module needs which field. `null` is "not ready",
 * distinct from a built request with empty params.
 */

/** Staff picker. `serviceId` optional: omitted on the first load, before a service is chosen. */
export function staffListRequest({ bookingModule, slug, serviceId = null }) {
  if (!slug) return null
  if (bookingModule === 'barber') {
    return {
      url: '/reservations/barbers',
      params: { client_slug: slug, ...(serviceId ? { service_id: serviceId } : {}) },
    }
  }
  if (bookingModule === 'clinic') {
    return {
      url: '/reservations/resources',
      // module_key is REQUIRED by that endpoint, and an unknown value there returns an empty list
      // with success:true -- a silent empty. Supplying it from the resolved module is what keeps
      // that from ever being a typo.
      params: {
        client_slug: slug, module_key: 'clinic',
        ...(serviceId ? { service_id: serviceId } : {}),
      },
    }
  }
  return null   // legacy / unresolved -- no staff concept at all
}

/** Free start times for the chosen staff member on the chosen date. */
export function availabilityRequest({
  bookingModule, slug, staffId, serviceId = null, date, durationMin = null,
}) {
  if (!slug || !staffId || !date) return null
  if (bookingModule === 'barber') {
    // The barber endpoint cannot derive a duration, so without one there is no request to make.
    if (!durationMin) return null
    return {
      url: '/reservations/availability',
      params: { client_slug: slug, barber_id: staffId, date, duration_min: durationMin },
    }
  }
  if (bookingModule === 'clinic') {
    // Mirror image: service_id is mandatory, duration_min is forbidden (ق-٤-أ).
    if (!serviceId) return null
    return {
      url: `/reservations/resources/${staffId}/availability`,
      params: { client_slug: slug, service_id: serviceId, date },
    }
  }
  return null
}

/** The module-specific half of the create body. */
export function bookingMetadata({ bookingModule, staffId, serviceId }) {
  if (!staffId || !serviceId) return null
  if (bookingModule === 'barber') return { barber_id: staffId, service_id: serviceId }
  if (bookingModule === 'clinic') return { resource_id: staffId, service_id: serviceId }
  return null
}
