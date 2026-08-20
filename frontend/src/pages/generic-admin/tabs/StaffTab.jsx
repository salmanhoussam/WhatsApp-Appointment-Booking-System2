import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import adminApi       from '../../../utils/admin.config'
import useImageUpload from '../../../hooks/useImageUpload'
import { T, FONT } from '../theme'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

// ── Staff Tab (Phase 3.7A, 2026-08-07) ──────────────────────────────────────────────────────────
// Barber roster CRUD -- name/phone/description/image/working hours/active/sort order.
//
// Staff/Store IA Separation (2026-08-09, .claudedocs/implementation/
// STAFF_STORE_IA_SEPARATION_CONTRACT.md) -- adds an internal الموظفون/الخدمات toggle. الخدمات is
// real CatalogService CRUD (create/edit/reorder/hide-show), wired to the already-built
// /catalog-services/ endpoints (Phase 3.7C) -- this is Service *entity* management, deliberately
// separate from the existing "الخدمات التي يقدمها" checklist below (Staff<->Service *assignment*,
// unchanged). Two different jobs, same page, per the IA Contract's own reasoning.
//
// Modal/Field defined locally here, mirroring CatalogTab.jsx's own local copy rather than a shared
// ui/Modal.jsx -- deliberately not extracted (Abstraction Rule; the IA Contract explicitly calls
// for no refactor in this task).

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  background: T.cardBg,
  border: `1px solid ${T.border}`,
  color: T.textPrimary, fontSize: 14,
  fontFamily: FONT,
  outline: 'none', boxSizing: 'border-box', colorScheme: 'light',
}

const labelStyle = {
  display: 'block', fontSize: 12,
  color: T.textSecond,
  marginBottom: 6, letterSpacing: '0.05em',
}

const AR_DAYS = [
  { key: 0, label: 'أحد' }, { key: 1, label: 'اثنين' }, { key: 2, label: 'ثلاثاء' },
  { key: 3, label: 'أربعاء' }, { key: 4, label: 'خميس' }, { key: 5, label: 'جمعة' },
  { key: 6, label: 'سبت' },
]

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, onSave, saving, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div
        style={{
          background: T.cardBg, border: `1px solid ${T.border}`, boxShadow: T.shadowPopover,
          borderRadius: 12,
          width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
          padding: 28, fontFamily: FONT,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.textMuted, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {children}
        <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button variant="primary" onClick={onSave} disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

const EMPTY_STAFF = {
  name: '', phone: '', description: '', image_url: '',
  open_time: '09:00', close_time: '18:00', closed_days: [], service_ids: [],
}

const EMPTY_SERVICE = {
  name_ar: '', name_en: '', description_ar: '', category_id: '',
  price: '', currency: 'USD', duration_min: 30, image_url: '',
}

export default function StaffTab({ color }) {
  // Staff/Store IA Separation (2026-08-09) -- الموظفون (existing content below, untouched) /
  // الخدمات (new CatalogService CRUD).
  // Tenant OS Section Editor Phase 5 (2026-08-20) -- Section Editor deep-links here with
  // `?view=services|employees` (SettingsTab.jsx's CapabilityLink) so opening "الخدمات"/"فريقنا"
  // from the Section Editor lands directly on the matching sub-view, not always the default.
  const [searchParams] = useSearchParams()
  const [subView, setSubView] = useState(() => searchParams.get('view') === 'services' ? 'services' : 'employees')

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const [staff,   setStaff]   = useState([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(EMPTY_STAFF)
  const [saving,    setSaving]    = useState(false)

  const [imageFile,    setImageFile]    = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const { upload, error: uploadError, reset: resetUpload } = useImageUpload()

  // Phase 3.7C (2026-08-08) -- the real Staff<->Service relationship. All real CatalogServices for
  // this tenant, fetched once for the checklist -- reuses the same admin endpoint Reservations'
  // pickers already fetch from (GET /catalog-services/), no new backend surface for this list.
  // Deliberately a SEPARATE fetch/state from svcList below (Services management) -- this one stays
  // active-only, exactly as before; svcList needs include_inactive=true for the management view.
  const [services, setServices] = useState([])

  // ── Services management (الخدمات sub-view, Staff/Store IA Separation, 2026-08-09) ─────────────
  const [svcList,    setSvcList]    = useState([])
  const [svcLoading, setSvcLoading] = useState(true)
  const [catOptions, setCatOptions] = useState([]) // CatalogCategory, module_key='catalog', for the dropdown

  const [showSvcModal, setShowSvcModal] = useState(false)
  const [svcEditing,   setSvcEditing]   = useState(null)
  const [svcForm,      setSvcForm]      = useState(EMPTY_SERVICE)
  const [svcSaving,    setSvcSaving]    = useState(false)

  const [svcImageFile,    setSvcImageFile]    = useState(null)
  const [svcImagePreview, setSvcImagePreview] = useState(null)
  const { upload: svcUpload, error: svcUploadError, reset: resetSvcUpload } = useImageUpload()

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadStaff = useCallback(() => {
    setLoading(true)
    adminApi.get('/barbers/')
      .then(r => setStaff(r.data.data ?? []))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false))
  }, [])

  // Made a reusable callback (was a one-shot mount-only effect) -- real bug found via required
  // Browser Verification (2026-08-09): this list is what the "الخدمات التي يقدمها" assignment
  // checklist renders, and it never refreshed after a service was created/edited/hidden in the new
  // الخدمات sub-view (below), since StaffTab never unmounts when switching sub-views. A service
  // created there silently never appeared as an assignable option until a full page reload. Fixed
  // by calling this after every Services-CRUD mutation, not just once on mount.
  const loadServices = useCallback(() => {
    adminApi.get('/catalog-services/')
      .then(r => setServices(r.data.data ?? []))
      .catch(() => setServices([]))
  }, [])

  useEffect(() => { loadStaff() }, [loadStaff])
  useEffect(() => { loadServices() }, [loadServices])

  // ── Employee <-> Service panel (Dashboard UX Corrections #7/C, 2026-08-10) ───────────────────
  // A visible, at-a-glance two-panel view of the Staff<->Service relationship -- COEXISTS with the
  // edit-modal checklist above (G3 default: coexist, not replace); the modal stays the full
  // barber-profile editor, this panel is for quick browsing/toggling without opening it. Reuses the
  // exact same already-existing endpoints (GET/PATCH /barbers/{id}/services), no new backend surface.
  const [panelSelectedId, setPanelSelectedId] = useState(null)
  const [panelServiceIds, setPanelServiceIds] = useState([])
  const [panelLoading,    setPanelLoading]    = useState(false)
  const [panelTogglingId, setPanelTogglingId] = useState(null)

  // Default the panel's selected employee to the first real staff member once the roster loads --
  // never left unselected when a real employee exists.
  useEffect(() => {
    if (panelSelectedId == null && staff.length > 0) setPanelSelectedId(staff[0].id)
  }, [staff, panelSelectedId])

  const loadPanelServices = useCallback((barberId) => {
    if (!barberId) return
    setPanelLoading(true)
    adminApi.get(`/barbers/${barberId}/services`)
      .then(r => setPanelServiceIds(r.data.data ?? []))
      .catch(() => setPanelServiceIds([]))
      .finally(() => setPanelLoading(false))
  }, [])

  useEffect(() => { loadPanelServices(panelSelectedId) }, [panelSelectedId, loadPanelServices])

  // Toggle -> PATCH the full list (same contract the edit-modal's save() already uses) -> re-fetch
  // to prove the round-trip actually persisted, rather than trusting an optimistic local update
  // (Section F's explicit verification requirement: "confirm it persists, re-fetch to prove it
  // round-tripped, not just local state").
  const togglePanelService = async (serviceId) => {
    if (!panelSelectedId || panelTogglingId) return
    const next = panelServiceIds.includes(serviceId)
      ? panelServiceIds.filter(id => id !== serviceId)
      : [...panelServiceIds, serviceId]
    setPanelTogglingId(serviceId)
    try {
      await adminApi.patch(`/barbers/${panelSelectedId}/services`, { service_ids: next })
      loadPanelServices(panelSelectedId)
    } catch (err) {
      alert(err?.response?.data?.detail ?? 'حدث خطأ أثناء تحديث الخدمات')
    } finally {
      setPanelTogglingId(null)
    }
  }

  // ── Services management: load + category options ────────────────────────────

  const loadSvcList = useCallback(() => {
    setSvcLoading(true)
    adminApi.get('/catalog-services/?include_inactive=true')
      .then(r => setSvcList(r.data.data ?? []))
      .catch(() => setSvcList([]))
      .finally(() => setSvcLoading(false))
  }, [])

  useEffect(() => {
    if (subView !== 'services') return
    loadSvcList()
    // Category dropdown: existing catalog categories only (module_key='catalog') -- category CRUD
    // itself stays owned by CatalogTab.jsx, this only selects an existing one.
    adminApi.get('/catalog/categories?include_inactive=true')
      .then(r => setCatOptions((r.data.data ?? []).filter(c => c.module_key === 'catalog')))
      .catch(() => setCatOptions([]))
  }, [subView, loadSvcList])

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const resetImageState = () => {
    setImageFile(null)
    setImagePreview(null)
    resetUpload()
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_STAFF)
    resetImageState()
    setShowModal(true)
  }

  const openEdit = (member) => {
    const wh = member.working_hours || {}
    setEditing(member)
    setForm({
      name: member.name, phone: member.phone ?? '',
      description: member.description ?? '', image_url: member.image_url ?? '',
      open_time: wh.open_time ?? '09:00', close_time: wh.close_time ?? '18:00',
      closed_days: wh.closed_days ?? [], service_ids: [],
    })
    resetImageState()
    setImagePreview(member.image_url || null)
    setShowModal(true)
    adminApi.get(`/barbers/${member.id}/services`)
      .then(r => setForm(p => ({ ...p, service_ids: r.data.data ?? [] })))
      .catch(() => {})
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const toggleClosedDay = (dayKey) => {
    setForm(p => ({
      ...p,
      closed_days: p.closed_days.includes(dayKey)
        ? p.closed_days.filter(d => d !== dayKey)
        : [...p.closed_days, dayKey],
    }))
  }

  const toggleService = (serviceId) => {
    setForm(p => ({
      ...p,
      service_ids: p.service_ids.includes(serviceId)
        ? p.service_ids.filter(id => id !== serviceId)
        : [...p.service_ids, serviceId],
    }))
  }

  // ── Save (create-then-upload-then-patch, same sequencing CatalogTab.jsx's
  //     saveItem() already uses -- the image needs a real id first) ─────────────

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const body = {
        name:        form.name,
        phone:       form.phone || undefined,
        description: form.description || undefined,
        working_hours: {
          open_time:   form.open_time,
          close_time:  form.close_time,
          closed_days: form.closed_days,
        },
      }

      let savedId = editing?.id

      if (editing) {
        await adminApi.patch(`/barbers/${editing.id}`, body)
      } else {
        const res = await adminApi.post('/barbers/', body)
        savedId = res.data.data.id
      }

      if (imageFile && savedId) {
        const { url } = await upload(imageFile, { context: 'barber', barber_id: savedId })
        await adminApi.patch(`/barbers/${savedId}`, { image_url: url })
      }

      if (savedId) {
        await adminApi.patch(`/barbers/${savedId}/services`, { service_ids: form.service_ids })
      }

      loadStaff()
      setShowModal(false)
    } catch (err) {
      alert(err?.response?.data?.detail ?? 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (member) => {
    if (!confirm(`إخفاء "${member.name}"؟ يمكن إعادة تفعيله لاحقاً.`)) return
    await adminApi.patch(`/barbers/${member.id}/deactivate`)
    loadStaff()
  }

  // ── Services CRUD (الخدمات sub-view) ──────────────────────────────────────────

  const resetSvcImageState = () => {
    setSvcImageFile(null)
    setSvcImagePreview(null)
    resetSvcUpload()
  }

  const openCreateService = () => {
    setSvcEditing(null)
    setSvcForm({ ...EMPTY_SERVICE, category_id: catOptions[0]?.id ?? '' })
    resetSvcImageState()
    setShowSvcModal(true)
  }

  const openEditService = (svc) => {
    setSvcEditing(svc)
    setSvcForm({
      name_ar: svc.name_ar, name_en: svc.name_en ?? '',
      description_ar: svc.description_ar ?? '', category_id: svc.category_id ?? '',
      price: svc.price ?? '', currency: svc.currency ?? 'USD',
      duration_min: svc.duration_min ?? 30, image_url: svc.image_url ?? '',
    })
    resetSvcImageState()
    setSvcImagePreview(svc.image_url || null)
    setShowSvcModal(true)
  }

  const handleSvcFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSvcImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setSvcImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  // Create -> upload (if a new file was picked) -> patch image_url, same sequencing as the
  // barber save() above and CatalogTab.jsx's own saveItem() -- the image needs a real id first.
  const saveService = async () => {
    if (!svcForm.name_ar.trim() || !svcForm.category_id) return
    setSvcSaving(true)
    try {
      const body = {
        name_ar:        svcForm.name_ar,
        name_en:        svcForm.name_en || undefined,
        description_ar: svcForm.description_ar || undefined,
        price:          svcForm.price === '' ? undefined : Number(svcForm.price),
        currency:       svcForm.currency,
        duration_min:   Number(svcForm.duration_min) || 30,
      }

      let savedId = svcEditing?.id

      if (svcEditing) {
        await adminApi.patch(`/catalog-services/${svcEditing.id}`, body)
      } else {
        const res = await adminApi.post('/catalog-services/', { ...body, category_id: svcForm.category_id })
        savedId = res.data.data.id
      }

      if (svcImageFile && savedId) {
        const { url } = await svcUpload(svcImageFile, { context: 'catalog_service', service_id: savedId })
        await adminApi.patch(`/catalog-services/${savedId}`, { image_url: url })
      }

      loadSvcList()
      loadServices() // keep the assignment checklist's own list in sync -- see loadServices' own comment
      setShowSvcModal(false)
    } catch (err) {
      alert(err?.response?.data?.detail ?? 'حدث خطأ')
    } finally {
      setSvcSaving(false)
    }
  }

  const toggleServiceActive = async (svc) => {
    await adminApi.patch(`/catalog-services/${svc.id}`, { is_active: !svc.is_active })
    loadSvcList()
    loadServices()
  }

  // Reorder (Catalog 3.7B pattern): swap sort_order with the neighbor, renumber both via PATCH.
  const moveService = async (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= svcList.length) return
    const a = svcList[index]
    const b = svcList[targetIndex]
    await Promise.all([
      adminApi.patch(`/catalog-services/${a.id}`, { sort_order: b.sort_order ?? targetIndex }),
      adminApi.patch(`/catalog-services/${b.id}`, { sort_order: a.sort_order ?? index }),
    ])
    loadSvcList()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: FONT }}>
      {/* الموظفون / الخدمات toggle -- Staff/Store IA Separation, 2026-08-09. Same pill style as
          ReservationsTab.jsx's Today/Week/List switcher. */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['employees', 'الموظفون'], ['services', 'الخدمات']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubView(id)}
            style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: FONT, border: 'none',
              background: subView === id ? color : T.cardBg,
              color: subView === id ? '#0a0a0f' : T.textSecond,
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}>
          {subView === 'employees' ? 'الموظفون' : 'الخدمات'}
        </span>
        {subView === 'employees' ? (
          <Button variant="primary" color={color} onClick={openCreate}>+ موظف جديد</Button>
        ) : (
          <Button variant="primary" color={color} onClick={openCreateService} disabled={catOptions.length === 0}>+ خدمة جديدة</Button>
        )}
      </div>

      {/* Employee <-> Service two-panel view (#7/C, 2026-08-10) -- only in الموظفون sub-view, only
          once real staff exist (an empty roster has nothing to select). Coexists with the card
          grid below, unchanged, and with the edit-modal checklist (G3 default). */}
      {subView === 'employees' && !loading && staff.length > 0 && (
        <Card padding={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '200px 1fr',
            direction: 'rtl', fontFamily: FONT,
          }}>
            {/* Left panel: employees */}
            <div style={{
              borderInlineEnd: isMobile ? 'none' : `1px solid ${T.borderSoft}`,
              borderBottom: isMobile ? `1px solid ${T.borderSoft}` : 'none',
              padding: 10,
              display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 4,
              overflowX: isMobile ? 'auto' : 'visible',
            }}>
              {staff.map(member => {
                const active = panelSelectedId === member.id
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setPanelSelectedId(member.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 8, textAlign: 'right',
                      cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: active ? 700 : 500,
                      background: active ? `${color}14` : 'transparent',
                      color: active ? color : T.textSecond,
                      border: `1px solid ${active ? `${color}44` : 'transparent'}`,
                      whiteSpace: 'nowrap', flexShrink: 0,
                      minHeight: 36, // real tap-target sizing (Section B.12)
                    }}
                  >
                    {member.name}
                  </button>
                )
              })}
            </div>

            {/* Right panel: selected employee's services */}
            <div style={{ padding: 16, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
                الخدمات التي يقدمها {staff.find(s => s.id === panelSelectedId)?.name ?? ''}
              </div>
              {services.length === 0 ? (
                <div style={{ fontSize: 12, color: T.textMuted }}>لا توجد خدمات بعد — أضف خدمات أولاً</div>
              ) : panelLoading ? (
                <div style={{ fontSize: 12, color: T.textMuted }}>جاري التحميل...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {services.map(s => {
                    const checked = panelServiceIds.includes(s.id)
                    const toggling = panelTogglingId === s.id
                    return (
                      <label
                        key={s.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 6px', borderRadius: 6,
                          cursor: toggling ? 'wait' : 'pointer', fontSize: 13, color: T.textPrimary,
                          opacity: toggling ? 0.6 : 1,
                          minHeight: 36, // real tap-target sizing (Section B.12)
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={toggling}
                          onChange={() => togglePanelService(s.id)}
                          style={{ width: 16, height: 16, accentColor: color, cursor: 'pointer', flexShrink: 0 }}
                        />
                        {s.name_ar}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {subView === 'services' ? (
        svcLoading ? (
          <p style={{ color: T.textMuted, fontSize: 13 }}>جاري التحميل...</p>
        ) : svcList.length === 0 ? (
          <Card padding={0} style={{ textAlign: 'center' }}>
            <EmptyState icon="✂️" message="لا توجد خدمات بعد — أضف أول خدمة للبدء" />
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {svcList.map((svc, index) => (
              <Card key={svc.id} padding={16} style={{ opacity: svc.is_active ? 1 : 0.55 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  {svc.image_url
                    ? <img src={svc.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 48, height: 48, borderRadius: 10, background: `${color}18`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color }}>✂️</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {svc.name_ar}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>
                      {svc.duration_min} دقيقة{svc.price != null ? ` · ${svc.price} ${svc.currency}` : ''}
                    </div>
                  </div>
                  {!svc.is_active && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: `${T.textMuted}22`, color: T.textMuted, fontWeight: 600, flexShrink: 0 }}>
                      مخفي
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Button variant="secondary" size="sm" onClick={() => openEditService(svc)}>تعديل</Button>
                  <Button variant={svc.is_active ? 'danger' : 'secondary'} size="sm" onClick={() => toggleServiceActive(svc)}>
                    {svc.is_active ? 'إخفاء' : 'إظهار'}
                  </Button>
                  <div style={{ display: 'flex', gap: 2, marginInlineStart: 'auto' }}>
                    <button type="button" onClick={() => moveService(index, -1)} disabled={index === 0}
                      style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.cardBg, color: T.textSecond, cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.4 : 1 }}>↑</button>
                    <button type="button" onClick={() => moveService(index, 1)} disabled={index === svcList.length - 1}
                      style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.cardBg, color: T.textSecond, cursor: index === svcList.length - 1 ? 'default' : 'pointer', opacity: index === svcList.length - 1 ? 0.4 : 1 }}>↓</button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : loading ? (
        <p style={{ color: T.textMuted, fontSize: 13 }}>جاري التحميل...</p>
      ) : staff.length === 0 ? (
        <Card padding={0} style={{ textAlign: 'center' }}>
          <EmptyState icon="👤" message="لا يوجد موظفون بعد — أضف أول موظف للبدء" />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {staff.map(member => (
            <Card key={member.id} padding={16} style={{ opacity: member.is_active ? 1 : 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                {member.image_url
                  ? <img src={member.image_url} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${color}18`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color }}>{member.name?.[0] ?? '?'}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.name}
                  </div>
                  {member.phone && (
                    <div style={{ fontSize: 11, color: T.textMuted, direction: 'ltr', textAlign: 'right' }}>{member.phone}</div>
                  )}
                </div>
                {!member.is_active && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: `${T.textMuted}22`, color: T.textMuted, fontWeight: 600, flexShrink: 0 }}>
                    مخفي
                  </span>
                )}
              </div>
              {member.description && (
                <div style={{ fontSize: 12, color: T.textSecond, marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {member.description}
                </div>
              )}
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 10 }}>
                {member.working_hours?.open_time && member.working_hours?.close_time
                  ? `${member.working_hours.open_time} – ${member.working_hours.close_time}`
                  : 'لم تُحدد ساعات العمل'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => openEdit(member)}>تعديل</Button>
                {member.is_active && (
                  <Button variant="danger" size="sm" onClick={() => deactivate(member)}>إخفاء</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? 'تعديل الموظف' : 'موظف جديد'}
          onClose={() => setShowModal(false)}
          onSave={save}
          saving={saving}
        >
          <Field label="الاسم *">
            <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: حسين" />
          </Field>
          <Field label="رقم الهاتف">
            <input style={{ ...inputStyle, direction: 'ltr' }} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="96170123456" />
          </Field>
          <Field label="الوصف">
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="وصف مختصر (اختياري)" />
          </Field>

          <Field label="الصورة">
            {imagePreview && (
              <img src={imagePreview} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', marginBottom: 10, display: 'block' }} />
            )}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
              background: T.pageBg,
              border: `1px dashed ${imageFile ? color : T.border}`,
              color: imageFile ? color : T.textMuted,
              fontSize: 13, fontFamily: FONT,
            }}>
              {imageFile ? imageFile.name : 'اختر صورة من جهازك'}
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
            {uploadError && <div style={{ fontSize: 12, color: T.danger, marginTop: 6 }}>{uploadError}</div>}
          </Field>

          <Field label="ساعات العمل">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input type="time" style={inputStyle} value={form.open_time} onChange={e => setForm(p => ({ ...p, open_time: e.target.value }))} />
              <input type="time" style={inputStyle} value={form.close_time} onChange={e => setForm(p => ({ ...p, close_time: e.target.value }))} />
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 6 }}>أيام الإغلاق</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {AR_DAYS.map(d => {
                const active = form.closed_days.includes(d.key)
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleClosedDay(d.key)}
                    style={{
                      padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', fontFamily: FONT,
                      background: active ? `${T.danger}18` : T.cardBg,
                      color: active ? T.danger : T.textSecond,
                      border: `1px solid ${active ? T.danger + '44' : T.border}`,
                    }}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="الخدمات التي يقدمها">
            {services.length === 0 ? (
              <div style={{ fontSize: 12, color: T.textMuted }}>لا توجد خدمات بعد — أضف خدمات أولاً</div>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {services.map(s => {
                  const active = form.service_ids.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      style={{
                        padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', fontFamily: FONT,
                        background: active ? `${color}18` : T.cardBg,
                        color: active ? color : T.textSecond,
                        border: `1px solid ${active ? color + '44' : T.border}`,
                      }}
                    >
                      {s.name_ar}
                    </button>
                  )
                })}
              </div>
            )}
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>
              اختياري — إذا لم تُحدَّد أي خدمة، يظهر هذا الموظف عند حجز أي خدمة
            </div>
          </Field>
        </Modal>
      )}

      {showSvcModal && (
        <Modal
          title={svcEditing ? 'تعديل الخدمة' : 'خدمة جديدة'}
          onClose={() => setShowSvcModal(false)}
          onSave={saveService}
          saving={svcSaving}
        >
          <Field label="الاسم (عربي) *">
            <input style={inputStyle} value={svcForm.name_ar} onChange={e => setSvcForm(p => ({ ...p, name_ar: e.target.value }))} placeholder="مثال: شعر ودقن" />
          </Field>
          <Field label="الاسم (إنجليزي)">
            <input style={{ ...inputStyle, direction: 'ltr' }} value={svcForm.name_en} onChange={e => setSvcForm(p => ({ ...p, name_en: e.target.value }))} placeholder="Hair &amp; Beard" />
          </Field>
          <Field label="الوصف">
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} value={svcForm.description_ar} onChange={e => setSvcForm(p => ({ ...p, description_ar: e.target.value }))} placeholder="وصف مختصر (اختياري)" />
          </Field>
          <Field label="القسم *">
            <select
              style={inputStyle}
              value={svcForm.category_id}
              onChange={e => setSvcForm(p => ({ ...p, category_id: e.target.value }))}
              disabled={!!svcEditing}
            >
              {catOptions.length === 0 && <option value="">لا توجد أقسام خدمات بعد</option>}
              {catOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name_ar}</option>
              ))}
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Field label="السعر">
              <input type="number" style={inputStyle} value={svcForm.price} onChange={e => setSvcForm(p => ({ ...p, price: e.target.value }))} placeholder="0" />
            </Field>
            <Field label="العملة">
              <input style={{ ...inputStyle, direction: 'ltr' }} value={svcForm.currency} onChange={e => setSvcForm(p => ({ ...p, currency: e.target.value }))} placeholder="USD" />
            </Field>
          </div>
          <Field label="المدة (دقيقة)">
            <input type="number" style={inputStyle} value={svcForm.duration_min} onChange={e => setSvcForm(p => ({ ...p, duration_min: e.target.value }))} placeholder="30" />
          </Field>

          <Field label="الصورة">
            {svcImagePreview && (
              <img src={svcImagePreview} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', marginBottom: 10, display: 'block' }} />
            )}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
              background: T.pageBg,
              border: `1px dashed ${svcImageFile ? color : T.border}`,
              color: svcImageFile ? color : T.textMuted,
              fontSize: 13, fontFamily: FONT,
            }}>
              {svcImageFile ? svcImageFile.name : 'اختر صورة من جهازك'}
              <input type="file" accept="image/*" onChange={handleSvcFileChange} style={{ display: 'none' }} />
            </label>
            {svcUploadError && <div style={{ fontSize: 12, color: T.danger, marginTop: 6 }}>{svcUploadError}</div>}
          </Field>
        </Modal>
      )}
    </div>
  )
}
