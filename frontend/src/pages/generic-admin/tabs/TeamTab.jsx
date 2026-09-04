import { useState, useEffect, useCallback } from 'react'
import adminApi from '../../../utils/admin.config'
import { T, FONT } from '../theme'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

// ── Team Tab (Phase 2B-4, 2026-09-04) ───────────────────────────────────────────────────────────
// Login accounts for this tenant — the merchant-facing surface for the permission model.
//
// Why it exists: until now there was NO path anywhere in this dashboard to create a login account
// for an employee. admin/team.py has existed since the Authorization Hardening work, but its only
// consumer was the LEGACY smar dashboard, and its create schema could not produce a STAFF account
// at all (role was Literal["MANAGER_RESERVATIONS","MANAGER_UNITS"]). That is Phase 2A's F6 gap.
//
// What this deliberately is NOT (out of v1 scope, per the approved design):
//   - no per-permission checkboxes and no custom preset builder — presets only;
//   - no editing an existing account's preset/permissions — create + deactivate/reactivate only;
//   - no scope toggle — scope comes from the preset, resolved server-side.
// The backend supports more than this UI exposes; exposure waits for real demand.
//
// Modal/Field are defined locally, mirroring StaffTab.jsx's and CatalogTab.jsx's own local copies
// rather than extracting a shared ui/Modal.jsx — same Abstraction Rule reasoning those files
// already record; this phase is explicitly not a refactor.

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

// Preset catalogue. `assignable` mirrors app/core/permissions.py's ASSIGNABLE_PRESETS — the areas
// a preset grants must all be migrated to permission checks before it can be offered
// (PHASE_2B_2_DESIGN.md §1). Unavailable presets are shown DISABLED WITH A REASON rather than
// hidden, so the UI does not silently differ between environments mid-migration.
//
// This list is a LABEL catalogue, not an authority: the server resolves preset -> permissions and
// rejects anything unassignable with a 422 (enforced in resolve_preset, not only here). If the two
// ever disagree, the server wins and the user sees its message.
const PRESETS = [
  {
    id: 'staff', label: 'موظف',
    hint: 'يرى حجوزاته هو فقط، ويطّلع على الخدمات',
    assignable: true, requiresBarber: true,
  },
  {
    id: 'reservations_manager', label: 'مدير الحجوزات',
    hint: 'يدير كل الحجوزات',
    assignable: false, reason: 'غير متاح بعد — بانتظار ترحيل صلاحيات العملاء والكتالوج',
  },
  {
    id: 'shop_manager', label: 'مدير المتجر',
    hint: 'يدير المتجر والمنتجات',
    assignable: false, reason: 'غير متاح بعد — بانتظار ترحيل صلاحيات المتجر',
  },
  {
    id: 'tenant_admin', label: 'المالك',
    hint: 'صلاحية كاملة على كل شيء',
    assignable: true, requiresBarber: false,
  },
]

const PRESET_LABEL = Object.fromEntries(PRESETS.map(p => [p.id, p.label]))

const ROLE_LABEL = {
  SUPER_ADMIN:          'مدير المنصة',
  TENANT_ADMIN:         'المالك',
  MANAGER_RESERVATIONS: 'مدير الحجوزات',
  MANAGER_UNITS:        'مدير الوحدات',
  STAFF:                'موظف',
}

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

const EMPTY_MEMBER = { full_name: '', email: '', password: '', preset: 'staff', barber_id: '' }

// ── Main ─────────────────────────────────────────────────────────────────────

export default function TeamTab({ color }) {
  const [members,   setMembers]   = useState([])
  const [staff,     setStaff]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState(null)
  const [form,      setForm]      = useState(EMPTY_MEMBER)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Barbers are needed for the picker below; a failure there must not blank the whole tab,
      // so the two are settled independently rather than with a single all-or-nothing await.
      const [teamRes, staffRes] = await Promise.allSettled([
        adminApi.get('/team'),
        adminApi.get('/barbers/'),
      ])
      // The two endpoints use DIFFERENT response shapes and both must be read on their own terms:
      //   /admin/team    -> a bare array          (team.py returns the list directly)
      //   /admin/barbers/ -> {success, data:[...]} (the standard envelope, api-rules.md §5)
      // Found by real browser verification, 2026-09-04: reading `.data` identically on both put an
      // object into `staff`, and `staff.filter(...)` threw, blanking the whole dashboard (there is
      // no error boundary above this tab). StaffTab.jsx:155 already reads `r.data.data ?? []` for
      // this same endpoint — matched here rather than invented.
      // Array.isArray on both: this tab has no error boundary above it, so a non-array here does
      // not degrade one widget — it blanks the entire dashboard. Cheap insurance against exactly
      // the failure that occurred.
      const asList = (v) => (Array.isArray(v) ? v : [])
      if (teamRes.status === 'fulfilled') setMembers(asList(teamRes.value.data))
      else setError(teamRes.reason?.response?.data?.detail || 'تعذّر تحميل الفريق')
      if (staffRes.status === 'fulfilled') setStaff(asList(staffRes.value.data?.data))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const selectedPreset = PRESETS.find(p => p.id === form.preset)
  // Barbers with no login account yet. User.barberId is @unique, so an already-linked barber would
  // be rejected with a 409 — filtering here turns that into an affordance the owner never hits.
  const linkedBarberIds = new Set(members.map(m => m.barber_id).filter(Boolean))
  const availableBarbers = staff.filter(s => !linkedBarberIds.has(s.id))

  const openCreate = () => {
    setForm(EMPTY_MEMBER)
    setFormError(null)
    setShowModal(true)
  }

  const save = async () => {
    setFormError(null)
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setFormError('الاسم والبريد وكلمة المرور مطلوبة')
      return
    }
    if (selectedPreset?.requiresBarber && !form.barber_id) {
      // The server enforces this too (422) — this is the friendly first line of defence, not the
      // authority. A self-scoped account with no barber link fails closed on every request.
      setFormError('اختر الموظف المرتبط بهذا الحساب')
      return
    }
    setSaving(true)
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email:     form.email.trim(),
        password:  form.password,
        preset:    form.preset,
      }
      if (selectedPreset?.requiresBarber) payload.barber_id = form.barber_id
      await adminApi.post('/team', payload)
      setShowModal(false)
      await load()
    } catch (e) {
      setFormError(e?.response?.data?.detail || 'تعذّر إنشاء الحساب')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (member) => {
    if (!confirm(`تعطيل حساب "${member.full_name}"؟ يمكن إعادة تفعيله لاحقاً.`)) return
    await adminApi.delete(`/team/${member.id}`)
    load()
  }

  const reactivate = async (member) => {
    if (!confirm(`إعادة تفعيل حساب "${member.full_name}"؟`)) return
    await adminApi.post(`/team/${member.id}/reactivate`)
    load()
  }

  const barberName = (id) => staff.find(s => s.id === id)?.name ?? null

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, margin: 0 }}>الفريق</h2>
          <p style={{ fontSize: 12, color: T.textMuted, margin: '4px 0 0' }}>
            حسابات الدخول للوحة التحكم — كل حساب يرى ما تسمح به صلاحيته فقط
          </p>
        </div>
        <Button variant="primary" color={color} onClick={openCreate}>+ حساب جديد</Button>
      </div>

      {error && (
        <Card padding={16} style={{ marginBottom: 12, borderColor: '#ef4444' }}>
          <span style={{ fontSize: 13, color: '#ef4444' }}>{error}</span>
        </Card>
      )}

      {loading ? (
        <p style={{ color: T.textMuted, fontSize: 13 }}>جاري التحميل...</p>
      ) : members.length === 0 ? (
        <Card padding={0} style={{ textAlign: 'center' }}>
          <EmptyState icon="🔑" message="لا توجد حسابات بعد — أنشئ أول حساب دخول لموظف" />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {members.map(member => (
            <Card key={member.id} padding={16} style={{ opacity: member.is_active ? 1 : 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${color}18`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color }}>
                  {member.full_name?.[0] ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.full_name}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, direction: 'ltr', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {member.email}
                  </div>
                </div>
                {!member.is_active && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: `${T.textMuted}22`, color: T.textMuted, fontWeight: 600, flexShrink: 0 }}>
                    معطّل
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: `${color}14`, color, fontWeight: 600 }}>
                  {/* preset is the real authority label; role is the legacy fallback for accounts
                      created before this phase (and for the inert placeholder role). */}
                  {PRESET_LABEL[member.preset] ?? ROLE_LABEL[member.role] ?? member.role}
                </span>
                {member.scope === 'self' && (
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: `${T.textMuted}18`, color: T.textSecond, fontWeight: 600 }}>
                    بياناته فقط
                  </span>
                )}
                {member.barber_id && barberName(member.barber_id) && (
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: `${T.textMuted}18`, color: T.textSecond, fontWeight: 600 }}>
                    مرتبط بـ {barberName(member.barber_id)}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {member.is_active ? (
                  <Button variant="danger" size="sm" onClick={() => deactivate(member)}>تعطيل</Button>
                ) : (
                  <Button variant="primary" color={color} size="sm" onClick={() => reactivate(member)}>إعادة تفعيل</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="حساب دخول جديد" onClose={() => setShowModal(false)} onSave={save} saving={saving}>
          <Field label="الاسم الكامل">
            <input style={inputStyle} value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label="البريد الإلكتروني">
            <input style={{ ...inputStyle, direction: 'ltr' }} type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="كلمة المرور">
            <input style={{ ...inputStyle, direction: 'ltr' }} type="password" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} />
          </Field>

          <Field label="الصلاحية">
            <div style={{ display: 'grid', gap: 8 }}>
              {PRESETS.map(p => (
                <label key={p.id}
                  title={p.assignable ? undefined : p.reason}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                    borderRadius: 8, border: `1px solid ${form.preset === p.id ? color : T.border}`,
                    background: form.preset === p.id ? `${color}0d` : T.cardBg,
                    cursor: p.assignable ? 'pointer' : 'not-allowed',
                    opacity: p.assignable ? 1 : 0.5,
                  }}>
                  <input type="radio" name="preset" value={p.id} disabled={!p.assignable}
                    checked={form.preset === p.id}
                    onChange={() => setForm({ ...form, preset: p.id, barber_id: '' })}
                    style={{ marginTop: 2 }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{p.label}</span>
                    <span style={{ display: 'block', fontSize: 11, color: T.textMuted }}>
                      {p.assignable ? p.hint : p.reason}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Field>

          {selectedPreset?.requiresBarber && (
            <Field label="مرتبط بالموظف">
              <select style={inputStyle} value={form.barber_id}
                onChange={e => setForm({ ...form, barber_id: e.target.value })}>
                <option value="">— اختر الموظف —</option>
                {availableBarbers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <span style={{ display: 'block', fontSize: 11, color: T.textMuted, marginTop: 6 }}>
                هذا الربط هو ما يجعل الحساب يرى حجوزاته هو فقط.
                {availableBarbers.length === 0 && ' — لا يوجد موظف بلا حساب دخول حالياً.'}
              </span>
            </Field>
          )}

          {formError && (
            <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{formError}</div>
          )}
        </Modal>
      )}
    </div>
  )
}
