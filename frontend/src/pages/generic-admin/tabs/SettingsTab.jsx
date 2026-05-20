import { useState, useEffect, useRef } from 'react'
import adminApi from '../../../utils/admin.config'
import useImageUpload from '../../../hooks/useImageUpload'

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 8, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: 14,
  fontFamily: "'Cairo', sans-serif",
  outline: 'none',
}

const labelStyle = {
  display: 'block', fontSize: 12,
  color: 'rgba(255,255,255,0.5)',
  marginBottom: 6, letterSpacing: '0.04em',
}

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14, padding: 24,
}

const sectionTitle = {
  fontSize: 15, fontWeight: 600,
  color: 'rgba(255,255,255,0.8)',
  marginBottom: 14,
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>{hint}</div>}
    </div>
  )
}

// ── Video Upload Field ────────────────────────────────────────────────────────

function VideoUploadField({ label, value, onChange, hint }) {
  const { upload, uploading } = useImageUpload()
  const inputRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { url } = await upload(file, { context: 'page_hero_video' })
      onChange(url)
    } catch { /* leave existing */ }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="https://... أو ارفع فيديو"
          dir="ltr"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          style={{
            padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)',
            cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 13,
            fontFamily: "'Cairo', sans-serif", whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {uploading ? '⏳ جاري الرفع...' : '📎 رفع فيديو'}
        </button>
        <input
          ref={inputRef} type="file"
          accept="video/mp4,video/webm,video/quicktime"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>
      {value && (
        <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
          <video
            src={value} muted
            style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }}
          />
          <button
            onClick={() => onChange('')}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.7)', border: 'none',
              borderRadius: 4, color: '#ff6b6b', cursor: 'pointer',
              fontSize: 11, padding: '2px 8px',
            }}
          >✕ حذف</button>
        </div>
      )}
      {hint && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>{hint}</div>}
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
              border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
              background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
              color: active ? color : 'rgba(255,255,255,0.45)',
              fontSize: 11, fontWeight: active ? 700 : 400,
              fontFamily: "'Cairo', sans-serif",
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

// ── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsTab({ settings, onUpdated, color, onFormChange }) {
  const existingHero   = settings?.config?.hero ?? {}
  const existingConfig = settings?.config ?? {}

  const [form, setForm] = useState({
    name_ar:          settings?.name_ar         ?? '',
    name_en:          settings?.name_en         ?? '',
    primary_color:    settings?.primary_color   ?? '#6366f1',
    whatsapp_number:  settings?.whatsapp_number ?? '',
    hero_video_url:   settings?.hero_video_url  ?? '',
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
        hero_video_url:  form.hero_video_url  || undefined,
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
    <div style={{ maxWidth: 580 }}>

      {/* ── Branding ──────────────────────────────────────────────────── */}
      <div style={{ ...sectionTitle, marginBottom: 14 }}>معلومات المتجر</div>
      <div style={{ ...glass, marginBottom: 20 }}>
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
                border: '1px solid rgba(255,255,255,0.15)',
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
              border: '1px solid rgba(255,255,255,0.1)',
            }} />
          </div>
        </Field>
      </div>

      {/* ── Design & Templates ────────────────────────────────────────── */}
      <div style={{ ...sectionTitle, marginBottom: 14 }}>التصميم والمظهر</div>
      <div style={{ ...glass, marginBottom: 20 }}>

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
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>معاينة اللون</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: form.primary_color }} />
            <div style={{ width: 28, height: 28, borderRadius: 6, background: `${form.primary_color}44` }} />
            <div style={{ width: 28, height: 28, borderRadius: 6, background: `${form.primary_color}18` }} />
          </div>
        </div>
      </div>

      {/* ── Hero Text ─────────────────────────────────────────────────── */}
      <div style={{ ...sectionTitle, marginBottom: 14 }}>نصوص الصفحة الرئيسية</div>
      <div style={{ ...glass, marginBottom: 20 }}>
        <Field label="العنوان الرئيسي" hint="يظهر بدلاً من اسم المتجر">
          <input style={inputStyle} value={form.hero_title_ar} onChange={set('hero_title_ar')} placeholder="مثال: اكتشفي عالم الجمال" />
        </Field>

        <Field label="النص التوضيحي" hint="وصف قصير تحت العنوان">
          <input style={inputStyle} value={form.hero_subtitle_ar} onChange={set('hero_subtitle_ar')} placeholder="مثال: خدمات تجميل احترافية بأسعار مناسبة" />
        </Field>

        <Field label="نص زر التواصل">
          <input style={inputStyle} value={form.hero_cta_ar} onChange={set('hero_cta_ar')} placeholder="تواصل معنا" />
        </Field>
      </div>

      {/* ── Hero Video ────────────────────────────────────────────────── */}
      <div style={{ ...sectionTitle, marginBottom: 14 }}>فيديو الصفحة الرئيسية</div>
      <div style={{ ...glass, marginBottom: 20 }}>
        <VideoUploadField
          label="فيديو الـ Hero (اختياري)"
          value={form.hero_video_url}
          onChange={v => { setForm(p => ({ ...p, hero_video_url: v })); setSuccess(false) }}
          hint="MP4 أو WebM — حتى 200 MB — يظهر كخلفية متحركة للصفحة الرئيسية"
        />
      </div>

      {/* ── Feedback + Save ───────────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)',
          color: '#ff8080', fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(80,200,120,0.1)', border: '1px solid rgba(80,200,120,0.2)',
          color: '#60d080', fontSize: 13, marginBottom: 16,
        }}>
          ✓ تم حفظ الإعدادات بنجاح — الصفحة العامة ستتحدث خلال ثوانٍ
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 10,
          background: saving ? 'rgba(255,255,255,0.08)' : color,
          border: 'none',
          color: '#fff', fontSize: 14, fontWeight: 600,
          fontFamily: "'Cairo', sans-serif",
          cursor: saving ? 'wait' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </button>
    </div>
  )
}
