import { useState, useEffect, useCallback } from 'react'
import adminApi from '../../../utils/admin.config'
import { T, FONT } from '../theme'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 8, boxSizing: 'border-box',
  background: T.cardBg,
  border: `1px solid ${T.border}`,
  color: T.textPrimary, fontSize: 14,
  fontFamily: FONT,
  outline: 'none', colorScheme: 'light',
}

const labelStyle = {
  display: 'block', fontSize: 12,
  color: T.textSecond,
  marginBottom: 6, letterSpacing: '0.04em',
}

const sectionTitle = {
  fontSize: 15, fontWeight: 700,
  color: T.textPrimary,
  marginBottom: 18,
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 5 }}>{hint}</div>}
    </div>
  )
}

// ── Radio-style button group ──────────────────────────────────────────────────

function OptionGroup({ options, value, onChange, color }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const active = value === opt.key
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
              border: `1.5px solid ${active ? color : T.border}`,
              background: active ? `${color}18` : T.pageBg,
              color: active ? color : T.textMuted,
              fontSize: 11, fontWeight: active ? 700 : 400,
              fontFamily: FONT,
              transition: 'all 0.18s',
              minWidth: 64,
            }}
          >
            {opt.icon && <span style={{ fontSize: 18, lineHeight: 1 }}>{opt.icon}</span>}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Option definitions ────────────────────────────────────────────────────────

const HERO_OPTS = [
  { key: 'normal',   label: 'بسيط',   icon: '▣' },
  { key: 'showcase', label: 'واجهة',  icon: '▦' },
  { key: 'landing',  label: 'هبوط',   icon: '▤' },
]

const LAYOUT_OPTS = [
  { key: 'grid',     label: 'شبكة',   icon: '⊞' },
  { key: 'list',     label: 'قائمة',  icon: '≡' },
  { key: 'showcase', label: 'بطاقات', icon: '▭' },
]

const FONT_OPTS = [
  { key: 'Cairo',    label: 'Cairo'   },
  { key: 'Tajawal',  label: 'Tajawal' },
  { key: 'Inter',    label: 'Inter'   },
]

// ── Store QR — deliberately minimal (Store Template Pilot, 2026-07-31) ────────
// Generates on demand from the backend (GET /admin/settings/qr), no complex QR system --
// one static image encoding the tenant's real public store URL, per Salman's explicit scope.
function StoreQRSection({ color }) {
  const [qr,      setQr]      = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [copied,  setCopied]  = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminApi.get('/settings/qr')
      .then(({ data }) => { if (data.success) setQr(data.data) })
      .catch(() => setError('تعذّر توليد رمز QR'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load]) // eslint-disable-line

  const copyLink = () => {
    if (!qr?.url) return
    navigator.clipboard.writeText(qr.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card style={{ marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ ...sectionTitle, marginBottom: 0, width: '100%' }}>رابط متجرك ورمز QR</div>
      {loading && <div style={{ fontSize: 13, color: T.textMuted }}>جاري التوليد...</div>}
      {error && <div style={{ fontSize: 13, color: T.danger }}>{error}</div>}
      {qr && (
        <>
          {/* QR quiet-zone background stays literal white regardless of theme -- required for
              the code to scan correctly, not a dark-theme leftover. */}
          <img
            src={`data:image/png;base64,${qr.image_b64}`}
            alt="QR code لمتجرك"
            style={{ width: 140, height: 140, borderRadius: 10, background: '#fff', padding: 8, border: `1px solid ${T.border}` }}
          />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: T.textSecond, marginBottom: 8 }}>
              اطبع هذا الرمز واعرضه في متجرك — يفتح الزبون المتجر مباشرة من هاتفه
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: T.pageBg, borderRadius: 8, padding: '8px 12px',
            }}>
              <span style={{ fontSize: 12, color: T.textPrimary, direction: 'ltr', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {qr.url}
              </span>
              <Button variant="secondary" size="sm" color={color} onClick={copyLink} style={{ flexShrink: 0 }}>
                {copied ? '✓ تم النسخ' : 'نسخ الرابط'}
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsTab({ settings, onUpdated, color, onFormChange }) {
  const existingHero   = settings?.config?.hero ?? {}
  const existingConfig = settings?.config ?? {}

  const [form, setForm] = useState({
    name_ar:          settings?.name_ar         ?? '',
    name_en:          settings?.name_en         ?? '',
    primary_color:    settings?.primary_color   ?? '#6366f1',
    whatsapp_number:  settings?.whatsapp_number ?? '',
    // design
    page_type:        settings?.page_type       ?? 'normal',
    catalog_layout:   existingConfig.catalog_layout ?? 'grid',
    font:             existingConfig.font           ?? 'Cairo',
    // hero text
    hero_title_ar:    existingHero.title_ar     ?? '',
    hero_subtitle_ar: existingHero.subtitle_ar  ?? '',
    hero_cta_ar:      existingHero.cta_ar       ?? '',
  })

  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState(null)

  // Notify parent (preview iframe) whenever form changes
  useEffect(() => { onFormChange?.(form) }, [form]) // eslint-disable-line

  const set = (key) => (val) => {
    // accepts both event (from <input>) and raw value (from OptionGroup)
    const value = val?.target ? val.target.value : val
    setForm(p => ({ ...p, [key]: value }))
    setSuccess(false)
    setError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name_ar:         form.name_ar         || undefined,
        name_en:         form.name_en         || undefined,
        primary_color:   form.primary_color,
        whatsapp_number: form.whatsapp_number || undefined,
        page_type:       form.page_type,
        config: {
          ...existingConfig,
          catalog_layout: form.catalog_layout,
          font:           form.font,
          hero: {
            title_ar:    form.hero_title_ar    || undefined,
            subtitle_ar: form.hero_subtitle_ar || undefined,
            cta_ar:      form.hero_cta_ar      || undefined,
          },
        },
      }
      await adminApi.patch('/settings', payload)
      onUpdated(prev => ({ ...prev, ...payload, config: payload.config }))
      setSuccess(true)
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 580, fontFamily: FONT }}>

      {/* ── Branding ──────────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 20 }}>
        <div style={sectionTitle}>معلومات المتجر</div>
        <Field label="الاسم بالعربي">
          <input style={inputStyle} value={form.name_ar} onChange={set('name_ar')} placeholder="مثال: صالون روز" />
        </Field>

        <Field label="الاسم بالإنجليزي">
          <input style={inputStyle} value={form.name_en} onChange={set('name_en')} placeholder="e.g. Roz Salon" />
        </Field>

        <Field label="رقم واتساب" hint="بدون مسافات — مثال: 96170123456">
          <input style={inputStyle} value={form.whatsapp_number} onChange={set('whatsapp_number')} placeholder="96170123456" dir="ltr" />
        </Field>

        <Field label="اللون الأساسي">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              type="color"
              value={form.primary_color}
              onChange={set('primary_color')}
              style={{
                width: 52, height: 44, borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${T.border}`,
                background: 'none', padding: 4,
              }}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={form.primary_color}
              onChange={set('primary_color')}
              placeholder="#6366f1"
              dir="ltr"
            />
            <div style={{
              width: 44, height: 44, borderRadius: 8, flexShrink: 0,
              background: form.primary_color,
              border: `1px solid ${T.border}`,
            }} />
          </div>
        </Field>
      </Card>

      {/* ── Store QR ──────────────────────────────────────────────────── */}
      <StoreQRSection color={form.primary_color} />

      {/* ── Design & Templates ────────────────────────────────────────── */}
      <Card style={{ marginBottom: 20 }}>
        <div style={sectionTitle}>التصميم والمظهر</div>

        <Field label="نمط الصفحة الرئيسية" hint="يتغير تصميم قسم الـ Hero">
          <OptionGroup
            options={HERO_OPTS}
            value={form.page_type}
            onChange={set('page_type')}
            color={form.primary_color}
          />
        </Field>

        <Field label="عرض الكتالوج" hint="كيف تظهر المنتجات أو الخدمات للزبون">
          <OptionGroup
            options={LAYOUT_OPTS}
            value={form.catalog_layout}
            onChange={set('catalog_layout')}
            color={form.primary_color}
          />
        </Field>

        <Field label="الخط" hint="الخط المستخدم في الصفحة العامة">
          <OptionGroup
            options={FONT_OPTS}
            value={form.font}
            onChange={set('font')}
            color={form.primary_color}
          />
        </Field>

        {/* Live color preview */}
        <div style={{
          marginTop: 4, padding: '12px 16px', borderRadius: 10,
          background: `${form.primary_color}12`,
          border: `1px solid ${form.primary_color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          direction: 'rtl',
        }}>
          <span style={{ fontSize: 12, color: T.textSecond }}>معاينة اللون</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: form.primary_color }} />
            <div style={{ width: 28, height: 28, borderRadius: 6, background: `${form.primary_color}44` }} />
            <div style={{ width: 28, height: 28, borderRadius: 6, background: `${form.primary_color}18` }} />
          </div>
        </div>
      </Card>

      {/* ── Hero Text ─────────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 20 }}>
        <div style={sectionTitle}>نصوص الصفحة الرئيسية</div>
        <Field label="العنوان الرئيسي" hint="يظهر بدلاً من اسم المتجر">
          <input style={inputStyle} value={form.hero_title_ar} onChange={set('hero_title_ar')} placeholder="مثال: اكتشفي عالم الجمال" />
        </Field>

        <Field label="النص التوضيحي" hint="وصف قصير تحت العنوان">
          <input style={inputStyle} value={form.hero_subtitle_ar} onChange={set('hero_subtitle_ar')} placeholder="مثال: خدمات تجميل احترافية بأسعار مناسبة" />
        </Field>

        <Field label="نص زر التواصل">
          <input style={inputStyle} value={form.hero_cta_ar} onChange={set('hero_cta_ar')} placeholder="تواصل معنا" />
        </Field>
      </Card>

      {/* ── Feedback + Save ───────────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: T.dangerSoft, border: `1px solid ${T.danger}33`,
          color: T.danger, fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: T.greenSoft, border: `1px solid ${T.green}33`,
          color: T.green, fontSize: 13, marginBottom: 16,
        }}>
          ✓ تم حفظ الإعدادات بنجاح — الصفحة العامة ستتحدث خلال ثوانٍ
        </div>
      )}

      <Button
        variant="primary"
        color={color}
        onClick={handleSave}
        disabled={saving}
        style={{ width: '100%', padding: '12px 0' }}
      >
        {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </Button>
    </div>
  )
}
