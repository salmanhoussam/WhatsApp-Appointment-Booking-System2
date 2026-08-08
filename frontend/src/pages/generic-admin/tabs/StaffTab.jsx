import { useState, useEffect, useCallback } from 'react'
import adminApi       from '../../../utils/admin.config'
import useImageUpload from '../../../hooks/useImageUpload'
import { T, FONT } from '../theme'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

// ── Staff Tab (Phase 3.7A, 2026-08-07) ──────────────────────────────────────────────────────────
// Barber roster CRUD only -- name/phone/description/image/working hours/active/sort order. No
// Services/Categories/Skills/Pricing field anywhere in this file, not even a placeholder -- the
// Staff Capability Investigation (.claudedocs/work/staff-capability-investigation/2026-08-07)
// confirmed no Barber<->CatalogItem relationship exists in any form; that decision belongs to a
// future Phase 3.7C, not this one. `Resource` (clinic) is out of scope too -- no real clinic tenant
// exists yet, this tab is Barber-only per Salman's explicit call.
//
// Modal/Field defined locally here, mirroring CatalogTab.jsx's own local copy rather than a shared
// ui/Modal.jsx -- this is now the second real case of the same shape (Abstraction Rule would
// justify extracting one), but doing that extraction here would mean touching CatalogTab.jsx, which
// is explicitly out of this phase's scope (Phase 3.7B). Deliberately deferred, not forgotten.

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

export default function StaffTab({ color }) {
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
  const [services, setServices] = useState([])

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadStaff = useCallback(() => {
    setLoading(true)
    adminApi.get('/barbers/')
      .then(r => setStaff(r.data.data ?? []))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadStaff() }, [loadStaff])
  useEffect(() => {
    adminApi.get('/catalog-services/')
      .then(r => setServices(r.data.data ?? []))
      .catch(() => setServices([]))
  }, [])

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}>الموظفون</span>
        <Button variant="primary" color={color} onClick={openCreate}>+ موظف جديد</Button>
      </div>

      {loading ? (
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
    </div>
  )
}
