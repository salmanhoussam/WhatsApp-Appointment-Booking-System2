import { useState, useEffect, useCallback, useRef } from 'react'
import useTenantConfig from './useTenantConfig'
import useTenantSlug from './useTenantSlug'
import { fetchAllCategories, fetchItems } from '../services/catalogApi'
import publicApi from '../utils/publicApi'

function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * useReservationWizard — domain hook for the staff-based booking journey
 * (Reservation Pilot, Phase 2). Consumes the existing Phase 1 backend only
 * (GET /reservations/barbers, GET /reservations/availability,
 * POST /reservations/) — no slot/conflict computation happens here.
 *
 * `mode` tells the page which UI to render:
 *   'loading' — still resolving whether this tenant has barbers configured
 *   'wizard'  — real Barber rows exist -> staff-based booking journey
 *   'legacy'  — no Barber rows -> fall back to the generic date/time form,
 *               unchanged, for every other generic tenant (restaurant table
 *               reservations, etc.) that isn't part of this Pilot's scope.
 */
export default function useReservationWizard() {
  const { config, isLoading: configLoading } = useTenantConfig()
  const slug = useTenantSlug()

  const [step, setStep] = useState('service') // service | staff | slot | confirm | success

  const [barbers, setBarbers] = useState([])
  const [barbersLoading, setBarbersLoading] = useState(true)
  const [selectedBarber, setSelectedBarber] = useState(null)

  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [selectedService, setSelectedService] = useState(null)

  const [date, setDate] = useState(todayISODate())
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [reservationId, setReservationId] = useState(null)

  // mountedRef reset in the effect body itself, not just useRef(true)'s initializer -- StrictMode's
  // dev-mode mount->cleanup->remount cycle otherwise latches this false permanently (confirmed root
  // cause of the beit-al-fakhar /store spinner bug, see useCatalog.js for the full writeup).
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Mode detection — real Barber rows, not a hardcoded tenant slug.
  useEffect(() => {
    if (!slug) return
    setBarbersLoading(true)
    publicApi.get('/reservations/barbers', { params: { client_slug: slug } })
      .then(({ data }) => { if (mountedRef.current) setBarbers(data?.data ?? []) })
      .catch(() => { if (mountedRef.current) setBarbers([]) })
      .finally(() => { if (mountedRef.current) setBarbersLoading(false) })
  }, [slug])

  const mode = barbersLoading ? 'loading' : (barbers.length > 0 ? 'wizard' : 'legacy')

  // Bookable services -- only fetched once we know this is a barber-mode tenant.
  useEffect(() => {
    if (mode !== 'wizard' || !slug) return
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
        setServices(perCategory.flat().filter((item) => item?.metadata?.requires_booking))
      })
      .catch(() => { if (mountedRef.current) setServices([]) })
      .finally(() => { if (mountedRef.current) setServicesLoading(false) })
  }, [mode, slug])

  const durationMin = selectedService?.metadata?.duration_min ?? null

  useEffect(() => {
    if (!slug || !selectedBarber || !durationMin || !date) return
    setSlotsLoading(true)
    setSelectedSlot(null)
    publicApi.get('/reservations/availability', {
      params: { client_slug: slug, barber_id: selectedBarber.id, date, duration_min: durationMin },
    })
      .then(({ data }) => { if (mountedRef.current) setSlots(data?.data ?? []) })
      .catch(() => { if (mountedRef.current) setSlots([]) })
      .finally(() => { if (mountedRef.current) setSlotsLoading(false) })
  }, [slug, selectedBarber, date, durationMin])

  const chooseService = useCallback((item) => { setSelectedService(item); setStep('staff') }, [])
  const chooseBarber  = useCallback((barber) => { setSelectedBarber(barber); setStep('slot') }, [])
  const chooseSlot    = useCallback((slot) => { setSelectedSlot(slot); setStep('confirm') }, [])

  const goBack = useCallback(() => {
    setStep((s) => {
      if (s === 'staff')   return 'service'
      if (s === 'slot')    return 'staff'
      if (s === 'confirm') return 'slot'
      return s
    })
  }, [])

  const submit = useCallback(async (e) => {
    e?.preventDefault?.()
    if (!selectedService || !selectedBarber || !selectedSlot) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const { data } = await publicApi.post(
        '/reservations/',
        {
          module_key:     'barber',
          customer_name:  customerName,
          customer_phone: customerPhone,
          reserved_at:    selectedSlot.datetime,
          duration_min:   durationMin,
          metadata:       { barber_id: selectedBarber.id, service_id: selectedService.id },
        },
        { params: { client_slug: slug } }
      )
      if (!mountedRef.current) return
      setReservationId(data?.data?.id ?? null)
      setStep('success')
    } catch (err) {
      if (!mountedRef.current) return
      const detail = err?.response?.data?.detail
      setSubmitError(
        typeof detail === 'string' ? detail : 'حدث خطأ أثناء إرسال الحجز. يرجى المحاولة مجدداً.'
      )
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }, [selectedService, selectedBarber, selectedSlot, customerName, customerPhone, durationMin, slug])

  return {
    config, configLoading, mode,
    step, goBack,
    barbers, barbersLoading, selectedBarber, chooseBarber,
    services, servicesLoading, selectedService, chooseService,
    date, setDate, slots, slotsLoading, selectedSlot, chooseSlot,
    customerName, setCustomerName, customerPhone, setCustomerPhone,
    submitting, submitError, submit, reservationId,
  }
}
