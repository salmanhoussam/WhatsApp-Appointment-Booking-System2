import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import useTenantConfig from './useTenantConfig'
import useTenantSlug from './useTenantSlug'
import publicApi from '../utils/publicApi'

const AR_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const AR_WEEKDAYS_SHORT = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمس', 'جمع', 'سبت']
const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

function todayUTC() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

function isoOf(d) {
  return d.toISOString().slice(0, 10)
}

// Real month-grid (Calendly-style "full month view" rather than a short day-strip -- fewer clicks
// to reach a day further out, and reads as an actual calendar, not a scrollable list of buttons).
function buildMonthGrid(monthOffset) {
  const today = todayUTC()
  const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthOffset, 1))
  const startWeekday = first.getUTCDay()
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), d))
    cells.push({
      iso:     isoOf(date),
      dayNum:  d,
      isPast:  date.getTime() < today.getTime(),
      isToday: date.getTime() === today.getTime(),
    })
  }

  return {
    label: `${AR_MONTHS[first.getUTCMonth()]} ${first.getUTCFullYear()}`,
    cells,
  }
}

function formatArabicDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  return `${AR_WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth()]}`
}

// No real customer identity is collected on the primary (WhatsApp) path -- confirmation happens
// over WhatsApp instead (Salman's explicit product decision, 2026-08-02, kept unchanged in this
// redesign). Reservation.customerName/customerPhone are non-nullable columns
// (prisma/schema.prisma:681-682), so a clearly-marked placeholder is stored on that path; the
// secondary (local) path still collects and stores the real name/phone.
const WHATSAPP_PLACEHOLDER_NAME  = 'زبون واتساب'
const WHATSAPP_PLACEHOLDER_PHONE = 'عبر واتساب'

/**
 * useReservationBooking — domain hook for the single-screen booking page (Reservation Pilot).
 * Everything lives on one screen: service + staff pickers, a real month-grid calendar with the
 * time-slot grid for the selected day, a running booking summary, and two confirm paths --
 * WhatsApp (primary) and a local name/phone form (secondary, collapsed by default). Consumes only
 * the existing backend (barbers/availability/create) -- no slot or conflict logic here.
 *
 * `mode`: 'loading' | 'booking' (real Barber rows exist) | 'legacy' (generic date/time form) |
 * 'error' (the barbers fetch itself failed -- distinct from 'legacy', which means it succeeded
 * and genuinely found zero staff; added 2026-08-10, see the barbersError bug-fix comment below).
 */
export default function useReservationBooking() {
  const { config, isLoading: configLoading } = useTenantConfig()
  const slug = useTenantSlug()

  const [barbers, setBarbers] = useState([])
  const [barbersLoading, setBarbersLoading] = useState(true)
  const [barbersError, setBarbersError] = useState(false)
  const [selectedBarberId, setSelectedBarberId] = useState(null)

  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(false)
  // Deep-link support (2026-08-18, Homepage Phase 2.3): a Services card's "احجز الآن" button
  // links to `/{slug}/reserve?service={id}` so the visitor lands with that service already
  // chosen instead of picking again. Read once, lazily -- the services-loaded effect below
  // preserves this instead of overwriting it with the default first-service selection.
  const [selectedServiceId, setSelectedServiceId] = useState(
    () => new URLSearchParams(window.location.search).get('service') || null
  )

  const [monthOffset, setMonthOffset] = useState(0)
  const monthGrid = useMemo(() => buildMonthGrid(monthOffset), [monthOffset])
  const [selectedDate, setSelectedDate] = useState(() => isoOf(todayUTC()))

  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)

  const [showLocalForm, setShowLocalForm] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [reservationId, setReservationId] = useState(null)
  const [confirmMethod, setConfirmMethod] = useState(null) // 'whatsapp' | 'local'
  const [whatsappUrl, setWhatsappUrl] = useState(null) // fallback link if the tab open was blocked

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const [barbersRetryKey, setBarbersRetryKey] = useState(0)
  const retryBarbers = useCallback(() => setBarbersRetryKey((k) => k + 1), [])

  useEffect(() => {
    if (!slug) return
    setBarbersLoading(true)
    setBarbersError(false)
    publicApi.get('/reservations/barbers', { params: { client_slug: slug } })
      .then(({ data }) => {
        if (!mountedRef.current) return
        const list = data?.data ?? []
        setBarbers(list)
        if (list.length) setSelectedBarberId(list[0].id)
      })
      // Bug fix (2026-08-10, .claudedocs/work/availability-reliability/2026-08-10/summary.md):
      // a failed request used to be treated identically to "this tenant genuinely has zero
      // staff" (both set barbers=[]), silently dropping a real customer into the old legacy
      // form. barbersError now keeps that distinction all the way to the UI.
      .catch(() => { if (mountedRef.current) { setBarbers([]); setBarbersError(true) } })
      .finally(() => { if (mountedRef.current) setBarbersLoading(false) })
  }, [slug, barbersRetryKey])

  const mode = barbersLoading
    ? 'loading'
    : barbersError
      ? 'error'
      : (barbers.length > 0 ? 'booking' : 'legacy')

  // Phase 3.7C (2026-08-08) -- was a category-walk (fetchAllCategories -> fetchItems per category
  // -> filter by metadata.requires_booking); now a single call against the real CatalogService
  // model (GET /reservations/catalog-services), which only ever returns real bookable services.
  useEffect(() => {
    if (mode !== 'booking' || !slug) return
    setServicesLoading(true)
    publicApi.get('/reservations/catalog-services', { params: { client_slug: slug } })
      .then(({ data }) => {
        if (!mountedRef.current) return
        const list = data?.data ?? []
        setServices(list)
        // Keep a deep-linked selection (from the URL's `?service=` param) instead of
        // overwriting it -- only default to the first service when nothing was pre-selected,
        // or when the pre-selected id turns out not to be a real service on this tenant.
        if (list.length) {
          setSelectedServiceId((prev) =>
            prev && list.some((s) => s.id === prev) ? prev : list[0].id
          )
        }
      })
      .catch(() => { if (mountedRef.current) setServices([]) })
      .finally(() => { if (mountedRef.current) setServicesLoading(false) })
  }, [mode, slug])

  // Staff<->Service filtering (Phase 3.7C, Commit 5) -- once a service is selected, re-fetch the
  // barber list scoped to that service (soft filter: the backend falls back to the full list when
  // no assignments exist for it yet). Separate from the initial unfiltered fetch above, which
  // exists only to establish `mode` and a safe default before any service is known. Re-validates
  // the current selection against the new list -- if it's no longer present, falls back to the
  // new list's first entry, same auto-select-first pattern used everywhere else in this hook.
  useEffect(() => {
    if (!slug || mode !== 'booking' || !selectedServiceId) return
    publicApi.get('/reservations/barbers', { params: { client_slug: slug, service_id: selectedServiceId } })
      .then(({ data }) => {
        if (!mountedRef.current) return
        const list = data?.data ?? []
        setBarbers(list)
        setSelectedBarberId((prev) => (list.some((b) => b.id === prev) ? prev : (list[0]?.id ?? null)))
      })
      .catch(() => {})
  }, [slug, mode, selectedServiceId])

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null
  const selectedBarber  = barbers.find((b) => b.id === selectedBarberId) ?? null
  const durationMin     = selectedService?.duration_min ?? null

  const [slotsRetryKey, setSlotsRetryKey] = useState(0)
  const retrySlots = useCallback(() => setSlotsRetryKey((k) => k + 1), [])

  useEffect(() => {
    if (!slug || !selectedBarberId || !durationMin || !selectedDate) return
    setSlotsLoading(true)
    setSlotsError(false)
    setSelectedSlot(null)
    publicApi.get('/reservations/availability', {
      params: { client_slug: slug, barber_id: selectedBarberId, date: selectedDate, duration_min: durationMin },
    })
      .then(({ data }) => { if (mountedRef.current) setSlots(data?.data ?? []) })
      // Bug fix (2026-08-10): a failed request rendered the identical "no appointments today"
      // copy as a real, confirmed empty day -- a customer hitting a bad moment saw what looked
      // like a fully-booked shop on every date they tried, with no way to tell the difference.
      // slotsError keeps that distinction all the way to CalendarPanel.
      .catch(() => { if (mountedRef.current) { setSlots([]); setSlotsError(true) } })
      .finally(() => { if (mountedRef.current) setSlotsLoading(false) })
  }, [slug, selectedBarberId, selectedDate, durationMin, slotsRetryKey])

  const resetConfirmation = useCallback(() => {
    setReservationId(null)
    setConfirmMethod(null)
    setWhatsappUrl(null)
  }, [])

  const chooseService = useCallback((id) => { setSelectedServiceId(id); resetConfirmation() }, [resetConfirmation])
  const chooseBarber  = useCallback((id) => { setSelectedBarberId(id); resetConfirmation() }, [resetConfirmation])
  const chooseDate    = useCallback((iso) => { setSelectedDate(iso); resetConfirmation() }, [resetConfirmation])
  const chooseSlot    = useCallback((slot) => { setSelectedSlot(slot); resetConfirmation() }, [resetConfirmation])
  const goPrevMonth   = useCallback(() => setMonthOffset((m) => Math.max(0, m - 1)), [])
  const goNextMonth   = useCallback(() => setMonthOffset((m) => m + 1), [])
  const toggleLocalForm = useCallback(() => setShowLocalForm((v) => !v), [])

  const canConfirm = !!(selectedService && selectedBarber && selectedSlot)

  const createReservation = useCallback(async (name, phone) => {
    const { data } = await publicApi.post(
      '/reservations/',
      {
        module_key:     'barber',
        customer_name:  name,
        customer_phone: phone,
        reserved_at:    selectedSlot.datetime,
        duration_min:   durationMin,
        metadata:       { barber_id: selectedBarber.id, service_id: selectedService.id },
      },
      { params: { client_slug: slug } }
    )
    return data?.data?.id ?? null
  }, [selectedSlot, durationMin, selectedBarber, selectedService, slug])

  // WhatsApp (primary) confirm path.
  const confirmViaWhatsApp = useCallback(async () => {
    if (!canConfirm || !config?.whatsapp_number) return
    setSubmitError(null)
    setSubmitting(true)

    // The tab is opened SYNCHRONOUSLY, inside this click handler's own call stack, before any
    // `await`. Browsers only associate window.open() with the user's trusted click gesture when
    // there's no async gap first -- opening after an awaited network call is exactly what
    // triggers the "popup blocked" notification bar (confirmed via Browser Verification,
    // 2026-08-03, see the Reservation Pilot plan's WhatsApp investigation). Opening a blank tab
    // now and navigating it once the POST resolves keeps the tab inside the trusted gesture.
    const waTab = window.open('about:blank', '_blank')

    try {
      const id = await createReservation(WHATSAPP_PLACEHOLDER_NAME, WHATSAPP_PLACEHOLDER_PHONE)
      if (!mountedRef.current) return
      setReservationId(id)
      setConfirmMethod('whatsapp')

      const message = [
        'مرحباً، أريد تأكيد الحجز.',
        `الخدمة: ${selectedService.name_ar}`,
        `الحلاق: ${selectedBarber.name}`,
        `الموعد: ${formatArabicDate(selectedDate)} - ${selectedSlot.time}`,
      ].join('\n')
      const waNumber = String(config.whatsapp_number).replace(/\D/g, '')
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
      setWhatsappUrl(waUrl)

      if (waTab) waTab.location.href = waUrl
      else window.open(waUrl, '_blank') // fallback if the pre-open itself didn't return a handle
    } catch (err) {
      if (waTab) waTab.close()
      if (!mountedRef.current) return
      const detail = err?.response?.data?.detail
      setSubmitError(
        typeof detail === 'string' ? detail : 'حدث خطأ أثناء إنشاء الحجز. يرجى المحاولة مجدداً.'
      )
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }, [canConfirm, config, createReservation, selectedService, selectedBarber, selectedSlot, selectedDate])

  // Local (secondary) confirm path -- real name/phone, no WhatsApp.
  const confirmLocally = useCallback(async (e) => {
    e?.preventDefault?.()
    if (!canConfirm || !customerName || !customerPhone) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const id = await createReservation(customerName, customerPhone)
      if (!mountedRef.current) return
      setReservationId(id)
      setConfirmMethod('local')
    } catch (err) {
      if (!mountedRef.current) return
      const detail = err?.response?.data?.detail
      setSubmitError(
        typeof detail === 'string' ? detail : 'حدث خطأ أثناء إنشاء الحجز. يرجى المحاولة مجدداً.'
      )
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }, [canConfirm, customerName, customerPhone, createReservation])

  return {
    config, configLoading, mode,
    monthGrid, goPrevMonth, goNextMonth, monthOffset,
    weekdaysShort: AR_WEEKDAYS_SHORT,
    selectedDate, chooseDate,
    services, servicesLoading, selectedServiceId, selectedService, chooseService,
    barbers, barbersLoading, barbersError, retryBarbers, selectedBarberId, selectedBarber, chooseBarber,
    slots, slotsLoading, slotsError, retrySlots, selectedSlot, chooseSlot,
    showLocalForm, toggleLocalForm,
    customerName, setCustomerName, customerPhone, setCustomerPhone,
    submitting, submitError, reservationId, confirmMethod, whatsappUrl,
    canConfirm, confirmViaWhatsApp, confirmLocally,
    formatArabicDate,
  }
}
