/**
 * TenantRegisterPage.jsx — Self-service tenant sign-up
 *
 * Route: /register?template=fashion-grid&color=%23E8E8E8&slug=my-store
 *
 * Flow after submit:
 *   1. POST  /api/v1/auth/register    → creates Client + TENANT_ADMIN user → returns USER JWT directly
 *   2. PATCH /api/v1/admin/settings   → apply template_key + primary_color
 *   3. POST  /api/v1/admin/catalog/seed-from-template → create starter categories
 *   4. Redirect → /{slug}/dashboard?welcome=1
 */

import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import axios                   from 'axios'
import { getTemplate }         from '../../config/template-registry'
import adminApi                from '../../utils/admin.config'

// ── API base (auth is outside /public and /admin prefixes) ──────────────────
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
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
  })
  const [errors,   setErrors]   = useState({})
  const [step,     setStep]     = useState('idle') // idle | submitting | success
  const [serverErr, setServerErr] = useState(null)
  const [progress, setProgress] = useState('')

  const color = template?.primary_color ?? presetColor

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
      const MODULE_TO_VENUE = { store: 'ecommerce', restaurant: 'restaurant', catalog: 'services' }
      const venueType = MODULE_TO_VENUE[template?.module_key] ?? 'real_estate'

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
      })
      const token = regRes.data.data.token
      localStorage.setItem('admin_access_token', token)

      // Step 2 — Apply template settings
      setProgress('جاري تطبيق القالب...')
      await adminApi.patch('/settings', {
        name_ar:       form.business_name,
        primary_color: color,
        template_key:  templateKey,
        page_type:     template?.page_type ?? 'normal',
      })

      // Step 3 — Seed categories from template
      if (template?.seedCategories?.length) {
        setProgress('جاري تهيئة الأقسام...')
        await adminApi.post('/catalog/seed-from-template', {
          template_key:   templateKey,
          module_key:     template.module_key ?? 'catalog',
          categories:     template.seedCategories,
          clear_existing: false,
        })
      }

      // Step 4 — Redirect
      setStep('success')
      setProgress('تم! جاري فتح لوحة التحكم...')
      setTimeout(() => {
        navigate(`/${form.slug}/dashboard?welcome=1`, { replace: true })
      }, 900)

    } catch (err) {
      setStep('idle')
      setProgress('')
      const detail = err?.response?.data?.detail
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
