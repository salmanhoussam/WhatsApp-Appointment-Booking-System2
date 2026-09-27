/**
 * Real behavioural cases for frontend/src/hooks/bookingEndpoints.js — CALLED, not grepped.
 * Driven from scripts/test_p5d_booking_mode_signal.py. Emits one JSON array on stdout.
 */
import { staffListRequest, availabilityRequest, bookingMetadata }
  from '../frontend/src/hooks/bookingEndpoints.js'

const r = []
const eq = (label, got, want) =>
  r.push({ label, passed: JSON.stringify(got) === JSON.stringify(want),
           detail: `got ${JSON.stringify(got)}` })
const yes = (label, passed, detail = '') => r.push({ label, passed, detail })

// ── staff picker: two endpoints, and the clinic one carries a required discriminator ────────────
eq("T-ب-٧-b1  barber staff list -> /reservations/barbers",
   staffListRequest({ bookingModule: 'barber', slug: 'rk', serviceId: 's1' }),
   { url: '/reservations/barbers', params: { client_slug: 'rk', service_id: 's1' } })
eq("T-ب-٧-b2  clinic staff list -> /reservations/resources, and module_key is supplied from the "
   + "RESOLVED module, never typed by a call site",
   staffListRequest({ bookingModule: 'clinic', slug: 'cl', serviceId: 's1' }),
   { url: '/reservations/resources',
     params: { client_slug: 'cl', module_key: 'clinic', service_id: 's1' } })
eq("T-ب-٧-b3  first load, before any service is chosen: service_id is OMITTED, not sent empty",
   staffListRequest({ bookingModule: 'barber', slug: 'rk' }),
   { url: '/reservations/barbers', params: { client_slug: 'rk' } })
eq("T-ب-٧-b4  🔴 legacy/unresolved has no staff concept at all -> null, so no half-formed URL is "
   + "ever built for a tenant that has no staff picker",
   staffListRequest({ bookingModule: null, slug: 'smar' }), null)
eq("T-ب-٧-b5  and an UNREGISTERED module is not guessed into either endpoint",
   staffListRequest({ bookingModule: 'clnic', slug: 'x' }), null)

// ── availability: the two contracts are mirror images ───────────────────────────────────────────
eq("T-ب-٧-b6  barber availability -> /availability with duration_min",
   availabilityRequest({ bookingModule: 'barber', slug: 'rk', staffId: 'b1',
                         date: '2026-10-01', durationMin: 30 }),
   { url: '/reservations/availability',
     params: { client_slug: 'rk', barber_id: 'b1', date: '2026-10-01', duration_min: 30 } })
eq("T-ب-٧-b7  clinic availability -> /resources/{id}/availability with service_id",
   availabilityRequest({ bookingModule: 'clinic', slug: 'cl', staffId: 'r1', serviceId: 's1',
                         date: '2026-10-01' }),
   { url: '/reservations/resources/r1/availability',
     params: { client_slug: 'cl', service_id: 's1', date: '2026-10-01' } })

const clinicReq = availabilityRequest({ bookingModule: 'clinic', slug: 'cl', staffId: 'r1',
                                        serviceId: 's1', date: '2026-10-01', durationMin: 30 })
yes("T-ب-٧-b8  🔴 ق-٤-أ HONOURED — clinic availability sends NO duration_min EVEN WHEN the caller "
    + "passes one. The server derives it from the service so a caller cannot ask for a length the "
    + "service does not have; forwarding it would ask for the guarantee the contract removes",
    clinicReq !== null && !('duration_min' in clinicReq.params),
    `params: ${JSON.stringify(clinicReq && clinicReq.params)}`)
yes("T-ب-٧-b9  and the mirror: barber WITHOUT duration_min is not answerable -> null",
    availabilityRequest({ bookingModule: 'barber', slug: 'rk', staffId: 'b1',
                          date: '2026-10-01' }) === null)
yes("T-ب-٧-b10  while clinic WITHOUT service_id is not answerable -> null (service_id is where the "
    + "duration comes from, so it is required there and optional on the picker)",
    availabilityRequest({ bookingModule: 'clinic', slug: 'cl', staffId: 'r1',
                          date: '2026-10-01' }) === null)
yes("T-ب-٧-b11  no staff chosen, or no date -> null in both modules",
    availabilityRequest({ bookingModule: 'barber', slug: 'rk', date: '2026-10-01', durationMin: 30 }) === null
    && availabilityRequest({ bookingModule: 'clinic', slug: 'cl', staffId: 'r1', serviceId: 's1' }) === null)

// ── create body ────────────────────────────────────────────────────────────────────────────────
eq("T-ب-٧-b12  barber create metadata -> { barber_id, service_id }",
   bookingMetadata({ bookingModule: 'barber', staffId: 'b1', serviceId: 's1' }),
   { barber_id: 'b1', service_id: 's1' })
eq("T-ب-٧-b13  clinic create metadata -> { resource_id, service_id } — the key NAME is the contract, "
   + "and it is mirrored to the real Reservation.resourceId FK",
   bookingMetadata({ bookingModule: 'clinic', staffId: 'r1', serviceId: 's1' }),
   { resource_id: 'r1', service_id: 's1' })
yes("T-ب-٧-b14  🔴 and a clinic NEVER sends barber_id, nor a barber resource_id — the two key sets "
    + "are disjoint, asserted rather than assumed",
    !('barber_id' in bookingMetadata({ bookingModule: 'clinic', staffId: 'r1', serviceId: 's1' }))
    && !('resource_id' in bookingMetadata({ bookingModule: 'barber', staffId: 'b1', serviceId: 's1' })))
yes("T-ب-٧-b15  legacy/unresolved -> null, and an incomplete selection -> null",
    bookingMetadata({ bookingModule: null, staffId: 'x', serviceId: 'y' }) === null
    && bookingMetadata({ bookingModule: 'barber', staffId: null, serviceId: 's1' }) === null)

process.stdout.write(JSON.stringify(r))
