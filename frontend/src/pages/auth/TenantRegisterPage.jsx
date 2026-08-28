/**
 * TenantRegisterPage.jsx — Self-service tenant sign-up
 *
 * Route: /register?template=fashion-grid&color=%23E8E8E8&slug=my-store
 *
 * Flow after submit:
 *   1. POST  /api/v1/auth/register    → creates Client + TENANT_ADMIN user → returns USER JWT directly
 *   1.5 IF template.vertical is set (Unified Provisioning Contract, Phase 3, 2026-08-15):
 *      POST /api/v1/admin/provisioning/domain-objects → real Barber + real, priced CatalogService
 *      rows, from the staff_name/services this page now collects -- never Demo Builder's own
 *      placeholder content. Retry-safe: calling it again after a failure re-provisions from
 *      whatever the form currently holds, never duplicates.
 *   2. PATCH /api/v1/admin/settings   → apply template_key + primary_color
 *   3. IF template.vertical is NOT set (retail/restaurant, unchanged):
 *      POST /api/v1/admin/catalog/seed-from-template → create starter categories.
 *      Skipped for a resolved vertical -- Step 1.5 already provided real domain data; running
 *      this too would create a second, redundant, generic-labeled category alongside it (see
 *      ALZABT_PHASE3_FINAL_CONTRACT.md, Decision 4).
 *   4. Redirect → /{slug}/dashboard?welcome=1 (Canonical Admin URL Rule,
 *      .claude/rules/frontend/routing.md §0b — was /dashboard/{slug}, a non-canonical duplicate
 *      path that happened to reach the same GenericAdminDashboard component, fixed 2026-08-07) --
 *      only once every step that actually ran has genuinely succeeded (Step 1.5's own
 *      provisioning_status === 'complete' when it ran), never unconditionally.
 */

import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import axios                   from 'axios'
import { getTemplate }         from '../../config/template-registry'
import adminApi                from '../../utils/admin.config'

// ── API base (auth is outside /public and /admin prefixes, but is admin-domain traffic --
//    registration leads straight into dashboard access) — dashboard.salmansaas.com in production
//    (2026-08-28 API domain split). ──────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_ADMIN_API_URL
  ? `${import.meta.env.VITE_ADMIN_API_URL}/api/v1`
  : 'http://127.0.0.1:8000/api/v1'

const authApi = axios.create({ baseURL: API_BASE })

// ── Styles ───────────────────────────────────────────────────────────────────

const glass = (color) => ({
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${color}26`,
  borderRadius: 16,
})

const inputBase = {
  width: '100%', padding: '12px 16px', borderRadius: 10, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: 15,
  fontFamily: "'Cairo', sans-serif",
  outline: 'none', transition: 'border-color 0.2s',
}

const labelBase = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'rgba(255,255,255,0.45)',
  marginBottom: 7, letterSpacing: '0.06em',
}

// ── Helper ────────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/--+/g, '-')
    .substring(0, 50)
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={labelBase}>{label}</label>
      {children}
      {error && <div style={{ fontSize: 12, color: '#ff7070', marginTop: 5 }}>{error}</div>}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TenantRegisterPage() {
  const navigate = useNavigate()
  const params   = new URLSearchParams(window.location.search)

  const templateKey = params.get('template') || 'fashion-grid'
  const presetColor = params.get('color')    || '#6366f1'
  const presetSlug  = params.get('slug')     || ''

  const template = getTemplate(templateKey)

  const [form, setForm] = useState({
    business_name: '',
    owner_name:    '',
    slug:          presetSlug,
    email:         '',
    password:      '',
    whatsapp_number: '',
    // Phase 3 (2026-08-15) -- real vertical-specific data, collected only when
    // template.vertical is set; never a stand-in for owner_name, never Demo Builder's own
    // placeholder content. staff_name has no default; services starts with one empty row so the
    // "add a service" affordance is visible without an extra click.
    staff_name: '',
    services:   [{ name_ar: '', price: '', duration_min: '' }],
  })
  const [errors,   setErrors]   = useState({})
  const [step,     setStep]     = useState('idle') // idle | submitting | success
  const [serverErr, setServerErr] = useState(null)
  const [progress, setProgress] = useState('')
  // Phase 3.6 (2026-08-15) -- closes a real, confirmed gap the Phase 3.5 audit found: if Step 1
  // succeeds but a later step throws, resubmitting used to re-run Step 1 too, which then fails on
  // the slug/email/phone uniqueness guards (the Client already exists) -- a real dead end with no
  // path forward. Tracking the token in component state (not localStorage -- a stale token from
  // an unrelated earlier session must never be reused for a NEW registration) means a retry within
  // the same page load skips straight past whatever already succeeded.
  const [registeredToken, setRegisteredToken] = useState(null)

  const color = template?.primary_color ?? presetColor
  const isVerticalTenant = Boolean(template?.vertical)
  const staffLabel = template?.staff_label?.ar || 'مقدّم الخدمة'

  const updateService = (index, field, value) => {
    setForm(p => ({
      ...p,
      services: p.services.map((s, i) => i === index ? { ...s, [field]: value } : s),
    }))
  }
  const addService = () => {
    setForm(p => ({ ...p, services: [...p.services, { name_ar: '', price: '', duration_min: '' }] }))
  }
  const removeService = (index) => {
    setForm(p => ({ ...p, services: p.services.filter((_, i) => i !== index) }))
  }

  // Auto-generate slug from business name
  useEffect(() => {
    if (presetSlug) return
    if (form.business_name.trim()) {
      setForm(p => ({ ...p, slug: slugify(form.business_name) }))
    }
  }, [form.business_name, presetSlug])

  const validate = () => {
    const e = {}
    if (!form.business_name.trim()) e.business_name = 'اسم المتجر مطلوب'
    if (!form.email.trim())         e.email         = 'البريد الإلكتروني مطلوب'
    if (form.password.length < 8)   e.password      = 'كلمة المرور 8 أحرف على الأقل'
    if (!form.whatsapp_number.trim()) e.whatsapp_number = 'رقم الواتساب مطلوب'
    if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(form.slug))
      e.slug = 'رابط المتجر: أحرف إنجليزية صغيرة وأرقام وشرطة فقط (3-50 حرف)'

    // Phase 3 -- required only for a resolved vertical (Final Contract's own Validation table).
    // duration_min is required, not defaulted, deliberately -- same treatment as price, no
    // unexplained exception (ALZABT_PHASE3_FINAL_CONTRACT.md, Decision 1).
    if (isVerticalTenant) {
      if (!form.staff_name.trim()) e.staff_name = `اسم ${staffLabel} مطلوب`
      const validServices = form.services.filter(s => s.name_ar.trim())
      if (validServices.length === 0) {
        e.services = 'أضف خدمة واحدة على الأقل'
      } else {
        form.services.forEach((s, i) => {
          if (!s.name_ar.trim()) return // an all-empty trailing row is silently ignored, not an error
          if (!(Number(s.price) > 0))        e[`service_${i}_price`] = 'السعر مطلوب'
          if (!(Number(s.duration_min) > 0)) e[`service_${i}_duration`] = 'المدة مطلوبة'
        })
      }
    }
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setServerErr(null)
    setStep('submitting')

    try {
      // Step 1 — Register → returns USER JWT directly (no separate login needed)
      // venue_type must match a real key in registration_service.py's _SERVICE_SEED_MAP so the
      // right client_services get seeded. "ecommerce" was wrong here -- that key doesn't exist in
      // _SERVICE_SEED_MAP (only "store" does, seeding ["store", "catalog"]), so every store-module
      // template registration silently fell through to the map's own default (["catalog"] only,
      // never "store") -- confirmed 2026-07-31 as the real root cause of the Store Template
      // pilot's stuck tenant. Fixed to match module_key -> service key 1:1, per the template
      // registry's own documented intent (see template-registry.js's module_key comment block).
      const MODULE_TO_VENUE = { store: 'store', restaurant: 'restaurant', catalog: 'services' }
      const venueType = MODULE_TO_VENUE[template?.module_key] ?? 'real_estate'
      // Vertical Registry wiring (2026-08-14) -- sent alongside venueType, not replacing it.
      // Only beauty-barber carries a real `vertical` today (`'barber'`); every other template's
      // `vertical` is null, so this is a no-op for them -- registration_service.py falls back to
      // venueType/_SERVICE_SEED_MAP exactly as before whenever `vertical` is null.
      const vertical = template?.vertical ?? null

      // Step 1 — Register (SKIPPED if it already succeeded earlier this page-load, Phase 3.6).
      // Only ever reuses a token this exact form submission produced -- never anything from
      // localStorage, which could hold a stale token from a completely unrelated earlier session.
      let token = registeredToken
      if (!token) {
        setProgress('جاري إنشاء الحساب...')
        const regRes = await authApi.post('/auth/register', {
          business_name_ar: form.business_name,
          slug:             form.slug,
          email:            form.email,
          password:         form.password,
          whatsapp_number:  form.whatsapp_number,
          owner_name:       form.owner_name || form.business_name,
          primary_color:    color,
          venue_type:       venueType,
          vertical:         vertical,
        })
        token = regRes.data.data.token
        localStorage.setItem('admin_access_token', token)
        setRegisteredToken(token) // remembered for the rest of THIS page-load only
      }

      // Step 1.5 — Provision real vertical domain objects (Phase 3, 2026-08-15). Only when
      // vertical resolved -- a retail/restaurant template has nothing to provision here, unchanged.
      // Retry-safe: re-running this call (e.g. the visitor clicks submit again after a failure)
      // re-provisions from whatever the form holds right now, never duplicates -- the backend's
      // own delete-then-recreate guard, not this page's concern. Also safe against a genuine
      // concurrent double-submit as of Phase 3.6 (backend-side atomic claim).
      let provisioningComplete = true // stays true for a non-vertical tenant -- nothing to gate on
      if (vertical) {
        setProgress(`جاري إعداد ${staffLabel} والخدمات...`)
        const provRes = await adminApi.post('/provisioning/domain-objects', {
          staff_name: form.staff_name,
          services: form.services
            .filter(s => s.name_ar.trim())
            .map(s => ({
              name_ar:      s.name_ar,
              price:        Number(s.price),
              duration_min: Number(s.duration_min),
            })),
        })
        provisioningComplete = provRes.data?.data?.provisioning_status === 'complete'
      }

      // Step 2 — Apply template settings
      setProgress('جاري تطبيق القالب...')
      await adminApi.patch('/settings', {
        name_ar:       form.business_name,
        primary_color: color,
        template_key:  templateKey,
        page_type:     template?.page_type ?? 'normal',
      })

      // Step 3 — Seed categories from template. Skipped for a resolved vertical (Decision 4) --
      // Step 1.5 already provided real domain data; this would only create a second, redundant,
      // generic-labeled category alongside it.
      // clear_existing: true (Phase 3.6, was false) -- makes retrying this specific step safe too:
      // if a PRIOR attempt partially seeded categories before throwing, resubmitting would
      // otherwise duplicate whichever ones already landed. Safe unconditionally here (this is the
      // one and only real caller of this endpoint anywhere in the app, confirmed by a repo-wide
      // search) -- a fresh Client at this exact point in the flow has no categories to lose.
      if (!vertical && template?.seedCategories?.length) {
        setProgress('جاري تهيئة الأقسام...')
        await adminApi.post('/catalog/seed-from-template', {
          template_key:   templateKey,
          module_key:     template.module_key ?? 'catalog',
          categories:     template.seedCategories,
          clear_existing: true,
        })
      }

      if (!provisioningComplete) {
        // A real, honest incomplete state -- never a fake "success" redirect. The account and
        // its capabilities exist (Step 1 succeeded); only the domain-objects step didn't finish.
        // Resubmitting is safe (retry-safe by design, above) and is literally this same button.
        setStep('idle')
        setServerErr('تم إنشاء حسابك لكن لم يكتمل إعداد الخدمات. حاول مرة أخرى.')
        return
      }

      // Step 4 — Redirect
      setStep('success')
      setProgress('تم! جاري فتح لوحة التحكم...')
      setTimeout(() => {
        // Canonical Admin URL Rule (.claude/rules/frontend/routing.md §0b) -- was
        // /dashboard/{slug}, a non-canonical duplicate route that happened to reach the same
        // GenericAdminDashboard component; this is the real, live /register redirect (confirmed
        // via inbound-link + git-history investigation, §0c), unlike RegistrationPage.jsx's
        // earlier fix which landed in unreachable legacy code.
        navigate(`/${form.slug}/dashboard?welcome=1`, { replace: true })
      }, 900)

    } catch (err) {
      setStep('idle')
      setProgress('')
      // Phase 3.6 -- app/core/exceptions.py's AppException family (ConflictError,
      // BusinessLogicError -- what the new provisioning endpoint actually raises) is shaped
      // {error: {message}} by the global handler, not {detail: ...} (that shape is
      // StarletteHTTPException's own, e.g. FastAPI's built-in 404/422). Checked here so a real
      // "provisioning already in progress" conflict shows its real message instead of the
      // generic fallback.
      const detail = err?.response?.data?.detail ?? err?.response?.data?.error?.message
      if (typeof detail === 'string') {
        setServerErr(detail)
      } else if (Array.isArray(detail)) {
        setServerErr(detail.map(d => d.msg).join(' • '))
      } else {
        setServerErr('حدث خطأ. تأكد من البيانات وحاول مرة أخرى.')
      }
    }
  }

  const isSubmitting = step === 'submitting' || step === 'success'

  return (
    <div dir="rtl" style={{
      minHeight: '100vh', background: '#0d0d14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
      padding: '32px 20px',
    }}>
      {/* Background accent */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 70% 30%, ${color}18 0%, transparent 60%)`,
      }} />

      <div style={{
        width: '100%', maxWidth: 900, position: 'relative',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28,
      }}>
        {/* ── Left: Form ── */}
        <div style={{ ...glass(color), padding: '36px 32px' }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
              أنشئ متجرك الآن
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              {template ? `القالب: ${template.name_ar}` : 'سجّل معلوماتك للبدء'}
            </div>
          </div>

          {/* Fields */}
          <Field label="اسم المتجر / المنشأة *" error={errors.business_name}>
            <input
              style={inputBase}
              placeholder="مثال: بوتيك لايلى"
              value={form.business_name}
              onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))}
            />
          </Field>

          <Field label="الرابط المختصر للمتجر *" error={errors.slug}>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputBase, paddingRight: 16, direction: 'ltr', paddingLeft: 16 }}
                placeholder="layla-boutique"
                value={form.slug}
                onChange={e => setForm(p => ({ ...p, slug: slugify(e.target.value) }))}
              />
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
              رابط صفحتك: /demo/{form.slug || '...'}
            </div>
          </Field>

          <Field label="البريد الإلكتروني *" error={errors.email}>
            <input
              type="email"
              style={{ ...inputBase, direction: 'ltr' }}
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            />
          </Field>

          <Field label="كلمة المرور *" error={errors.password}>
            <input
              type="password"
              style={{ ...inputBase, direction: 'ltr' }}
              placeholder="8 أحرف على الأقل"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            />
          </Field>

          <Field label="رقم الواتساب *" error={errors.whatsapp_number}>
            <input
              style={{ ...inputBase, direction: 'ltr' }}
              placeholder="9613xxxxxxx"
              value={form.whatsapp_number}
              onChange={e => setForm(p => ({ ...p, whatsapp_number: e.target.value }))}
            />
          </Field>

          <Field label="اسم صاحب العمل">
            <input
              style={inputBase}
              placeholder="لايلى الأمين (اختياري)"
              value={form.owner_name}
              onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))}
            />
          </Field>

          {/* Phase 3 (2026-08-15) -- real vertical-specific data. Shown only for a resolved
              vertical; a retail/restaurant template never sees this section, unchanged. */}
          {isVerticalTenant && (
            <>
              <Field label={`اسم ${staffLabel} *`} error={errors.staff_name}>
                <input
                  style={inputBase}
                  placeholder={`مثال: ${staffLabel === 'الحلاق' ? 'أحمد' : staffLabel}`}
                  value={form.staff_name}
                  onChange={e => setForm(p => ({ ...p, staff_name: e.target.value }))}
                />
              </Field>

              <div style={{ marginBottom: 18 }}>
                <label style={labelBase}>الخدمات التي تقدّمها *</label>
                {errors.services && (
                  <div style={{ fontSize: 12, color: '#ff7070', marginBottom: 8 }}>{errors.services}</div>
                )}
                {form.services.map((s, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8,
                    marginBottom: 8, alignItems: 'start',
                  }}>
                    <div>
                      <input
                        style={inputBase}
                        placeholder="اسم الخدمة"
                        value={s.name_ar}
                        onChange={e => updateService(i, 'name_ar', e.target.value)}
                      />
                    </div>
                    <div>
                      <input
                        style={{ ...inputBase, direction: 'ltr' }}
                        placeholder="السعر $"
                        type="number" min="0" step="0.01"
                        value={s.price}
                        onChange={e => updateService(i, 'price', e.target.value)}
                      />
                      {errors[`service_${i}_price`] && (
                        <div style={{ fontSize: 11, color: '#ff7070', marginTop: 3 }}>{errors[`service_${i}_price`]}</div>
                      )}
                    </div>
                    <div>
                      <input
                        style={{ ...inputBase, direction: 'ltr' }}
                        placeholder="دقائق"
                        type="number" min="0" step="1"
                        value={s.duration_min}
                        onChange={e => updateService(i, 'duration_min', e.target.value)}
                      />
                      {errors[`service_${i}_duration`] && (
                        <div style={{ fontSize: 11, color: '#ff7070', marginTop: 3 }}>{errors[`service_${i}_duration`]}</div>
                      )}
                    </div>
                    {form.services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeService(i)}
                        style={{
                          background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)',
                          cursor: 'pointer', fontSize: 18, padding: '10px 4px',
                        }}
                      >×</button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addService}
                  style={{
                    background: 'transparent', border: `1px dashed ${color}66`, borderRadius: 8,
                    color, fontSize: 13, padding: '8px 14px', cursor: 'pointer', width: '100%',
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >+ أضف خدمة</button>
              </div>
            </>
          )}

          {/* Error message */}
          {serverErr && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.25)',
              color: '#ff8888', fontSize: 13, lineHeight: 1.5,
            }}>
              {serverErr}
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div style={{ fontSize: 12, color: color, marginBottom: 12, textAlign: 'center' }}>
              {progress}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 12,
              background: color, border: 'none',
              color: '#fff', fontSize: 16, fontWeight: 700,
              fontFamily: "'Cairo', sans-serif",
              cursor: isSubmitting ? 'wait' : 'pointer',
              opacity: isSubmitting ? 0.8 : 1,
              transition: 'opacity 0.2s',
              letterSpacing: '0.02em',
            }}
          >
            {isSubmitting ? '...' : 'أنشئ متجري'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            بإنشاء الحساب توافق على شروط الاستخدام
          </div>
        </div>

        {/* ── Right: Template Preview ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Template card */}
          <div style={{ ...glass(color), padding: '28px 24px', flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              القالب المختار
            </div>

            {/* Color preview */}
            <div style={{
              width: '100%', height: 120, borderRadius: 12, marginBottom: 16,
              background: `linear-gradient(135deg, ${color}cc, ${color}44)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                padding: '8px 20px', borderRadius: 8,
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                color: '#fff', fontSize: 14, fontWeight: 600,
              }}>
                {form.business_name || 'اسم متجرك'}
              </div>
            </div>

            {template && (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                  {template.name_ar}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
                  {template.name_en} · {template.industry}
                </div>

                {/* Seed categories preview */}
                {template.seedCategories?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10, letterSpacing: '0.08em' }}>
                      الأقسام الجاهزة عند البدء
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {template.seedCategories.map((cat, i) => (
                        <div key={i} style={{
                          padding: '5px 12px', borderRadius: 20,
                          background: `${color}22`,
                          border: `1px solid ${color}44`,
                          color, fontSize: 12, fontWeight: 500,
                        }}>
                          {cat.name_ar}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Trial info box */}
          <div style={{
            ...glass(color), padding: '20px 24px',
            background: `${color}0d`,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color, marginBottom: 8 }}>
              14 يوماً مجاناً
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
              • موقع كامل جاهز فوراً<br />
              • أضف منتجاتك وصورك بسهولة<br />
              • لا بطاقة ائتمانية مطلوبة
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: stack vertically */}
      <style>{`
        @media (max-width: 680px) {
          .register-grid { grid-template-columns: 1fr !important; }
          .register-preview { display: none !important; }
        }
      `}</style>
    </div>
  )
}
