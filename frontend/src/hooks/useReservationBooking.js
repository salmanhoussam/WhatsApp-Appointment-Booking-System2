import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import useTenantConfig from './useTenantConfig'
import useTenantSlug from './useTenantSlug'
import { fetchAllCategories, fetchItems } from '../services/catalogApi'
import publicApi from '../utils/publicApi'

const AR_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

function todayUTC() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

function buildDayStrip(count = 7) {
  const start = todayUTC()
  const days = []
  for (let i = 0; i < count; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    days.push({
      iso:     d.toISOString().slice(0, 10),
      weekday: AR_WEEKDAYS[d.getUTCDay()],
      dayNum:  d.getUTCDate(),
    })
  }
  return days
}

function formatArabicDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  return `${AR_WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth()]}`
}

// No real customer identity is collected in this Pilot flow -- confirmation happens over
// WhatsApp instead (Salman's explicit product decision, 2026-08-02). Reservation.customerName/
// customerPhone are non-nullable columns (prisma/schema.prisma:681-682), so a clearly-marked
// placeholder is stored; the shop owner reconciles the real customer against the incoming
// WhatsApp message by hand, same as the rest of this Pilot's manual pending->confirmed flow.
const WHATSAPP_PLACEHOLDER_NAME  = 'زبون واتساب'
const WHATSAPP_PLACEHOLDER_PHONE = 'عبر واتساب'

/**
 * useReservationBooking — domain hook for the single-screen booking page (Reservation Pilot,
 * Phase 2 redesign). Everything is visible at once: service + staff selects, a real day-strip
 * calendar, a time-slot grid, a booking summary, and a single WhatsApp-confirm action. Consumes
 * only the existing backend (barbers/availability/create) -- no slot or conflict logic here.
 *
 * `mode` tells the page which UI to render:
 *   'loading' — still resolving whether this tenant has barbers configured
 *   'booking' — real Barber rows exist -> this single-screen booking experience
 *   'legacy'  — no Barber rows -> the original generic date/time form, unchanged, for every
 *               other generic tenant (restaurant table reservations, etc.)
 */
export default function useReservationBooking() {
  const { config, isLoading: configLoading } = useTenantConfig()
  const slug = useTenantSlug()

  const [barbers, setBarbers] = useState([])
  const [barbersLoading, setBarbersLoading] = useState(true)
  const [selectedBarberId, setSelectedBarberId] = useState(null)

  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState(null)

  const dayStrip = useMemo(() => buildDayStrip(7), [])
  const [selectedDate, setSelectedDate] = useState(dayStrip[0].iso)

  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [reservationId, setReservationId] = useState(null)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Mode detection -- real Barber rows, not a hardcoded tenant slug.
  useEffect(() => {
    if (!slug) return
    setBarbersLoading(true)
    publicApi.get('/reservations/barbers', { params: { client_slug: slug } })
      .then(({ data }) => {
        if (!mountedRef.current) return
        const list = data?.data ?? []
        setBarbers(list)
        if (list.length) setSelectedBarberId(list[0].id)
      })
      .catch(() => { if (mountedRef.current) setBarbers([]) })
      .finally(() => { if (mountedRef.current) setBarbersLoading(false) })
  }, [slug])

  const mode = barbersLoading ? 'loading' : (barbers.length > 0 ? 'booking' : 'legacy')

  // Bookable services -- only fetched once we know this is a barber-mode tenant.
  useEffect(() => {
    if (mode !== 'booking' || !slug) return
    setServicesLoading(true)
    fetchAllCategories(slug)
      .then(({ data }) => {
        const cats = data?.data ?? []
        return Promise.all(
          cats.map((cat) =>
            fetchItems(cat.module_key, slug, cat.id)
              .then(({ data }) => data?.data ?? [])
              .catch(() => [])
          )
        )
      })
      .then((perCategory) => {
        if (!mountedRef.current) return
        const bookable = perCategory.flat().filter((item) => item?.metadata?.requires_booking)
        setServices(bookable)
        if (bookable.length) setSelectedServiceId(bookable[0].id)
      })
      .catch(() => { if (mountedRef.current) setServices([]) })
      .finally(() => { if (mountedRef.current) setServicesLoading(false) })
  }, [mode, slug])

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null
  const selectedBarber  = barbers.find((b) => b.id === selectedBarberId) ?? null
  const durationMin     = selectedService?.metadata?.duration_min ?? null

  useEffect(() => {
    if (!slug || !selectedBarberId || !durationMin || !selectedDate) return
    setSlotsLoading(true)
    setSelectedSlot(null)
    publicApi.get('/reservations/availability', {
      params: { client_slug: slug, barber_id: selectedBarberId, date: selectedDate, duration_min: durationMin },
    })
      .then(({ data }) => { if (mountedRef.current) setSlots(data?.data ?? []) })
      .catch(() => { if (mountedRef.current) setSlots([]) })
      .finally(() => { if (mountedRef.current) setSlotsLoading(false) })
  }, [slug, selectedBarberId, selectedDate, durationMin])

  // Changing service/staff/day invalidates whatever was already confirmed, so the summary/CTA
  // always reflects the current selection, not a stale one.
  const chooseService = useCallback((id) => { setSelectedServiceId(id); setReservationId(null) }, [])
  const chooseBarber  = useCallback((id) => { setSelectedBarberId(id); setReservationId(null) }, [])
  const chooseDate    = useCallback((iso) => { setSelectedDate(iso); setReservationId(null) }, [])
  const chooseSlot    = useCallback((slot) => { setSelectedSlot(slot); setReservationId(null) }, [])

  const confirmViaWhatsApp = useCallback(async () => {
    if (!selectedService || !selectedBarber || !selectedSlot || !config?.whatsapp_number) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      // Reservation is created (status "pending") BEFORE WhatsApp opens -- per Salman's explicit
      // requirement: the slot must be held the moment it's chosen, not only once/if the customer
      // actually sends the WhatsApp message. Otherwise a customer who closes WhatsApp without
      // sending leaves the calendar showing the slot as free while the shop owner never got
      // anything, or two customers could race for the same slot in the gap.
      const { data } = await publicApi.post(
        '/reservations/',
        {
          module_key:     'barber',
          customer_name:  WHATSAPP_PLACEHOLDER_NAME,
          customer_phone: WHATSAPP_PLACEHOLDER_PHONE,
          reserved_at:    selectedSlot.datetime,
          duration_min:   durationMin,
          metadata:       { barber_id: selectedBarber.id, service_id: selectedService.id },
        },
        { params: { client_slug: slug } }
      )
      if (!mountedRef.current) return
      const id = data?.data?.id ?? null
      setReservationId(id)

      const message = [
        'مرحباً، أريد تأكيد الحجز.',
        `الخدمة: ${selectedService.name_ar}`,
        `الحلاق: ${selectedBarber.name}`,
        `الموعد: ${formatArabicDate(selectedDate)} - ${selectedSlot.time}`,
      ].join('\n')
      const waNumber = String(config.whatsapp_number).replace(/\D/g, '')
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
      window.open(waUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      if (!mountedRef.current) return
      const detail = err?.response?.data?.detail
      setSubmitError(
        typeof detail === 'string' ? detail : 'حدث خطأ أثناء إنشاء الحجز. يرجى المحاولة مجدداً.'
      )
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }, [selectedService, selectedBarber, selectedSlot, selectedDate, durationMin, slug, config])

  return {
    config, configLoading, mode,
    dayStrip, selectedDate, chooseDate,
    services, servicesLoading, selectedServiceId, selectedService, chooseService,
    barbers, barbersLoading, selectedBarberId, selectedBarber, chooseBarber,
    slots, slotsLoading, selectedSlot, chooseSlot,
    submitting, submitError, reservationId, confirmViaWhatsApp,
    formatArabicDate,
  }
}
