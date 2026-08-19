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

// ── Hero Media — real Dashboard Renderer (Media/Content Foundation, 2026-08-17) ────────────────
// The first real "Renderer" for the Tenant OS Editing Engine's media.hero.bg_image Contract
// (previously only a discovery wrapper, EditableRegion, existed -- nothing rendered an actual
// upload UI). Two-step, matching the already-established pattern: (1) POST /admin/upload/
// (context=page_hero) uploads the real file to Supabase Storage and returns a URL; (2)
// PATCH /admin/media/hero-image writes that URL into a real GalleryImage row. No hardcoded URLs,
// no tenant-conditional code -- this is the one real control every reservations tenant uses.
function HeroMediaSection({ color }) {
  const [current, setCurrent] = useState(null) // { url, media_type } | null
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    adminApi.get('/media/hero-image')
      .then(({ data }) => { if (data.success) setCurrent(data.data) })
      .catch(() => {}) // no hero media set yet -- not an error state
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load]) // eslint-disable-line

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    setSuccess(false)
    try {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
      const form = new FormData()
      form.append('file', file)
      form.append('context', 'page_hero')
      const { data: uploadRes } = await adminApi.post('/upload/', form)
      await adminApi.patch('/media/hero-image', { image_url: uploadRes.url, media_type: mediaType })
      setCurrent({ url: uploadRes.url, media_type: mediaType })
      setSuccess(true)
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'تعذّر رفع الملف')
    } finally {
      setUploading(false)
      e.target.value = '' // allow re-selecting the same file
    }
  }

  return (
    <Card style={{ marginBottom: 20 }}>
      <div style={sectionTitle}>وسائط الصفحة الرئيسية (Hero)</div>
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>
        صورة أو فيديو خلفية الصفحة الرئيسية — يظهر مباشرة على موقعك العام بعد الرفع، بدون الحاجة لأي تعديل تقني
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: T.textMuted }}>جاري التحميل...</div>
      ) : current ? (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
          {current.media_type === 'video' ? (
            <video src={current.url} muted style={{ width: 90, height: 64, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}` }} />
          ) : (
            <img src={current.url} alt="hero" style={{ width: 90, height: 64, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}` }} />
          )}
          <div style={{ fontSize: 12, color: T.textSecond }}>
            الحالي: {current.media_type === 'video' ? 'فيديو' : 'صورة'}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 16 }}>لا يوجد وسائط مرفوعة بعد</div>
      )}

      <label style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, cursor: uploading ? 'not-allowed' : 'pointer',
        padding: '10px 18px', borderRadius: 8, border: `1.5px solid ${color}`,
        color: color, fontSize: 13, fontWeight: 700, fontFamily: FONT,
        opacity: uploading ? 0.5 : 1,
      }}>
        {uploading ? 'جاري الرفع...' : (current ? 'استبدال الملف' : 'رفع صورة أو فيديو')}
        <input type="file" accept="image/*,video/*" onChange={handleFile} disabled={uploading} style={{ display: 'none' }} />
      </label>

      {error && <div style={{ marginTop: 10, fontSize: 12, color: T.danger }}>{error}</div>}
      {success && <div style={{ marginTop: 10, fontSize: 12, color: T.green }}>✓ تم الحفظ — الصفحة العامة ستتحدث خلال ثوانٍ</div>}
    </Card>
  )
}

// ── Gallery Media (Homepage Phase 2.4, 2026-08-18) ────────────────────────────
// Same 2-step upload pattern as HeroMediaSection above, but a real collection (add/delete/
// reorder), not a singleton replace -- matches the real backend shape
// (app/api/v1/admin/media.py's gallery-images routes, gallery_repo.py's collection functions).

function GalleryMediaSection({ color }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    adminApi.get('/media/gallery-images')
      .then(({ data }) => { if (data.success) setImages(data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load]) // eslint-disable-line

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
      const form = new FormData()
      form.append('file', file)
      form.append('context', 'page_gallery')
      const { data: uploadRes } = await adminApi.post('/upload/', form)
      await adminApi.post('/media/gallery-images', { image_url: uploadRes.url, media_type: mediaType })
      await load()
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'تعذّر رفع الملف')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (id) => {
    setError(null)
    try {
      await adminApi.delete(`/media/gallery-images/${id}`)
      setImages(prev => prev.filter(img => img.id !== id))
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'تعذّر حذف الصورة')
    }
  }

  const handleMove = async (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= images.length) return
    const reordered = [...images]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setImages(reordered) // optimistic
    try {
      await adminApi.patch('/media/gallery-images/reorder', { ordered_ids: reordered.map(img => img.id) })
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'تعذّر إعادة الترتيب')
      load() // revert to real state on failure
    }
  }

  return (
    <Card style={{ marginBottom: 20 }}>
      <div style={sectionTitle}>معرض الصور</div>
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>
        الصور التي تظهر في قسم "معرض الصور" بالصفحة العامة — يظهر كل تعديل مباشرة بعد الرفع
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: T.textMuted }}>جاري التحميل...</div>
      ) : images.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: 16 }}>
          {images.map((img, i) => (
            <div key={img.id} style={{ position: 'relative' }}>
              {img.media_type === 'video' ? (
                <video src={img.url} muted style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}` }} />
              ) : (
                <img src={img.url} alt={img.caption_ar || ''} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}` }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" onClick={() => handleMove(i, -1)} disabled={i === 0}
                    style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: T.textMuted, opacity: i === 0 ? 0.3 : 1, fontSize: 13 }}>
                    ↑
                  </button>
                  <button type="button" onClick={() => handleMove(i, 1)} disabled={i === images.length - 1}
                    style={{ background: 'none', border: 'none', cursor: i === images.length - 1 ? 'default' : 'pointer', color: T.textMuted, opacity: i === images.length - 1 ? 0.3 : 1, fontSize: 13 }}>
                    ↓
                  </button>
                </div>
                <button type="button" onClick={() => handleDelete(img.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.danger, fontSize: 12 }}>
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 16 }}>لا توجد صور بعد</div>
      )}

      <label style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, cursor: uploading ? 'not-allowed' : 'pointer',
        padding: '10px 18px', borderRadius: 8, border: `1.5px solid ${color}`,
        color: color, fontSize: 13, fontWeight: 700, fontFamily: FONT,
        opacity: uploading ? 0.5 : 1,
      }}>
        {uploading ? 'جاري الرفع...' : 'إضافة صورة'}
        <input type="file" accept="image/*,video/*" onChange={handleFile} disabled={uploading} style={{ display: 'none' }} />
      </label>

      {error && <div style={{ marginTop: 10, fontSize: 12, color: T.danger }}>{error}</div>}
    </Card>
  )
}

// ── Section Settings (Homepage Phase 2.6, 2026-08-18; schema-driven since TOS-005 Phase B,
// 2026-08-19; repeatable groups since TOS-005 Phase D, 2026-08-19) ────────────────────────────
// The field/label lists that used to live here as hardcoded SECTION_FIELDS/SECTION_LABELS
// objects are retired -- app/schemas/section_schemas.py is now the one real source of truth
// (TOS-005-cms-generic-engine.md §4.1), fetched once via GET /content/sections/schema
// (SectionSettingsArea below) and passed down. No independent copy exists here anymore --
// divergence between this form and the backend's own validation is structurally impossible,
// not merely discouraged. Media fields (hero.bg_image_url, gallery.images) are absent from the
// fetched schema's non-repeatable fields for the same reason they were absent here before --
// HeroMediaSection/GalleryMediaSection above already own those. Repeatable-kind fields
// (story.stats, location.tags, why_choose_us.items, ...) render via the one generic
// RepeatableGroupEditor below -- never a per-section editor (StoryEditor/LocationEditor/
// WhyChooseUsEditor never exist).

// One shared input renderer for both scalar fields (SectionRow) and repeatable sub-fields
// (RepeatableGroupEditor) -- the same kind -> input-type switch, written once.
//
// Tenant OS Section Editor Phase 2 (2026-08-20) adds `media`/`group` branches -- ready, but not
// yet reachable by any real schema field: Salman's explicit Phase 2 scope is schema + validation
// only, no wiring of hero.bg_image_url/gallery.images into SECTION_SCHEMAS yet (avoids a real
// duplicate-UI period against HeroMediaSection/GalleryMediaSection, which still live in General
// Settings below). These two branches will get their first live exercise once a real schema field
// declares that kind -- Phase 4 for `media`, whenever a real `group` field is authored.
function FieldInput({ kind, value, onChange, options, fields }) {
  if (kind === 'textarea') {
    return <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={value} onChange={(e) => onChange(e.target.value)} />
  }
  if (kind === 'select') {
    return (
      <select style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label_ar}</option>)}
      </select>
    )
  }
  if (kind === 'boolean') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      </label>
    )
  }
  if (kind === 'media') {
    // Declared for discovery only -- the backend rejects writing this kind via section fields
    // (app/schemas/section_schemas.py's `_validate_value`). Real editing stays on its own
    // dedicated component (HeroMediaSection/GalleryMediaSection today) until Phase 4.
    return (
      <div style={{ fontSize: 12, color: T.textMuted, padding: '8px 0' }}>
        حقل وسائط — يُدار من قسم مخصص
      </div>
    )
  }
  if (kind === 'group') {
    const subFields = fields ?? {}
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: 8 }}>
        {Object.entries(subFields).map(([subKey, subSchema]) => (
          <Field key={subKey} label={subSchema.label_ar}>
            <FieldInput
              kind={subSchema.kind}
              value={value?.[subKey] ?? (subSchema.kind === 'boolean' ? false : '')}
              onChange={(v) => onChange({ ...(value ?? {}), [subKey]: v })}
              options={subSchema.options}
              fields={subSchema.fields}
            />
          </Field>
        ))}
      </div>
    )
  }
  return <input type={kind === 'number' ? 'number' : 'text'} style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)} />
}

// TOS-005 Phase 1 (Section Shell, 2026-08-19) -- SectionRow split into two pieces, same logic,
// new arrangement: SectionListRow (the compact list line -- checkbox/label/reorder/select) and
// SectionEditorPanel (the field/repeatable editor, now a dedicated panel instead of an inline
// accordion). No field-saving/validation logic changed -- this is a pure layout move, per
// Salman's own Phase 1 constraint ("لا refactor كبير... فقط طريقة عرضه في Dashboard تتغير").

function SectionListRow({ section, index, total, schema, selected, onSelect, onToggleEnabled, onMove }) {
  const enabled = section.enabled !== false
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
      padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
      background: selected ? `${T.green}14` : 'transparent',
    }} onClick={() => onSelect(section.type)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <input
          type="checkbox" checked={enabled}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggleEnabled(section.type, e.target.checked)}
        />
        <span style={{
          fontSize: 13, fontWeight: selected ? 700 : 600,
          color: selected ? T.green : T.textPrimary, opacity: enabled ? 1 : 0.45,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {schema?.label_ar ?? section.type}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button type="button" onClick={(e) => { e.stopPropagation(); onMove(index, -1) }} disabled={index === 0}
          style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', color: T.textMuted, opacity: index === 0 ? 0.3 : 1, fontSize: 13 }}>↑</button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onMove(index, 1) }} disabled={index === total - 1}
          style={{ background: 'none', border: 'none', cursor: index === total - 1 ? 'default' : 'pointer', color: T.textMuted, opacity: index === total - 1 ? 0.3 : 1, fontSize: 13 }}>↓</button>
      </div>
    </div>
  )
}

function SectionEditorPanel({ section, schema, color }) {
  const fieldsConfig = Object.entries(schema?.fields ?? {})
    .filter(([, f]) => f.kind !== 'repeatable')
    .map(([key, f]) => ({ key, label: f.label_ar, type: f.kind, options: f.options }))
  const repeatableFields = Object.entries(schema?.fields ?? {})
    .filter(([, f]) => f.kind === 'repeatable')
    .map(([key, f]) => ({ key, schema: f }))
  const [values, setValues] = useState(() => {
    const initial = {}
    fieldsConfig.forEach(f => { initial[f.key] = section.data?.[f.key] ?? (f.type === 'boolean' ? false : '') })
    return initial
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      // Numbers/booleans stored as real numbers/booleans, not strings; empty string clears the field
      const fields = {}
      fieldsConfig.forEach(f => {
        const raw = values[f.key]
        fields[f.key] = f.type === 'boolean' ? Boolean(raw)
          : f.type === 'number' && raw !== '' ? Number(raw)
          : (raw === '' ? null : raw)
      })
      await adminApi.patch(`/content/sections/${section.type}/fields`, { fields })
      setSaved(true)
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'تعذّر الحفظ')
    } finally {
      setSaving(false)
    }
  }

  if (fieldsConfig.length === 0 && repeatableFields.length === 0) {
    return (
      <div style={{ fontSize: 12, color: T.textMuted, padding: '4px 2px' }}>
        لا توجد عناصر قابلة للتعديل لهذا القسم بعد.
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 12 }}>
        {schema?.label_ar ?? section.type}
      </div>
      {fieldsConfig.length > 0 && (
        <>
          {fieldsConfig.map(f => (
            <Field key={f.key} label={f.label}>
              <FieldInput kind={f.type} value={values[f.key]} onChange={(v) => setValues(prev => { setSaved(false); return { ...prev, [f.key]: v } })} options={f.options} />
            </Field>
          ))}
          <Button onClick={handleSave} disabled={saving} color={color} style={{ marginTop: 4 }}>
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
          {saved && <span style={{ marginInlineStart: 10, fontSize: 12, color: T.green }}>✓ تم الحفظ</span>}
          {error && <div style={{ marginTop: 8, fontSize: 12, color: T.danger }}>{error}</div>}
        </>
      )}
      {repeatableFields.map(rf => (
        <RepeatableGroupEditor key={rf.key} sectionType={section.type} field={rf.key} fieldSchema={rf.schema} color={color} />
      ))}
    </div>
  )
}

// One generic editor for every repeatable field on every section -- {sectionType, field}, its
// item shape read from the fetched schema (never a per-section StoryEditor/LocationEditor/
// WhyChooseUsEditor). `fieldSchema.fields` present -> array of objects (why_choose_us.items,
// story.stats); `fieldSchema.item_kind` present -> array of bare scalars (location.tags).
function RepeatableGroupEditor({ sectionType, field, fieldSchema, color }) {
  const [items, setItems] = useState(null) // null = loading; server-confirmed state
  // Local editable copy, one entry per item -- edits only touch this until an explicit "حفظ"
  // per row, same convention SectionRow's own scalar fields already use. Never fires a request
  // per keystroke: typing quickly can't race two overlapping PATCHes against the same index.
  const [drafts, setDrafts] = useState([])
  const [savingIndex, setSavingIndex] = useState(null) // which row (or 'add'/'move') is in flight
  const [error, setError] = useState(null)
  const subFields = fieldSchema.fields ?? null
  const isScalar = subFields === null
  const emptyItem = () => isScalar ? '' : Object.fromEntries(Object.keys(subFields).map(k => [k, '']))
  const [newItem, setNewItem] = useState(emptyItem)

  const load = useCallback(() => {
    adminApi.get(`/content/sections/${sectionType}/repeatable/${field}`)
      .then(({ data }) => {
        if (data.success) { setItems(data.data); setDrafts(data.data) }
      })
      .catch(() => { setItems([]); setDrafts([]) })
  }, [sectionType, field])

  useEffect(() => { load() }, [load])

  const setDraft = (i, item) => setDrafts(prev => prev.map((d, idx) => idx === i ? item : d))

  const run = async (key, action) => {
    setSavingIndex(key)
    setError(null)
    try {
      const { data } = await action()
      if (data.success) { setItems(data.data); setDrafts(data.data) }
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'تعذّر الحفظ')
    } finally {
      setSavingIndex(null)
    }
  }

  const handleAdd = () => run('add', async () => {
    const res = await adminApi.post(`/content/sections/${sectionType}/repeatable/${field}`, { item: newItem })
    setNewItem(emptyItem())
    return res
  })

  const handleSaveRow = (i) => run(i, () =>
    adminApi.patch(`/content/sections/${sectionType}/repeatable/${field}/${i}`, { item: drafts[i] }))

  const handleDelete = (i) => run(i, () =>
    adminApi.delete(`/content/sections/${sectionType}/repeatable/${field}/${i}`))

  const handleMove = (i, direction) => {
    if (!items) return
    const target = i + direction
    if (target < 0 || target >= items.length) return
    const orderedIndices = items.map((_, idx) => idx)
    ;[orderedIndices[i], orderedIndices[target]] = [orderedIndices[target], orderedIndices[i]]
    run('move', () => adminApi.patch(`/content/sections/${sectionType}/repeatable/${field}/reorder`, { ordered_indices: orderedIndices }))
  }

  const rowDirty = (i) => JSON.stringify(drafts[i]) !== JSON.stringify(items[i])

  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px dashed ${T.borderSoft}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.textSecond, marginBottom: 8 }}>{fieldSchema.label_ar}</div>

      {items === null ? (
        <div style={{ fontSize: 12, color: T.textMuted }}>جاري التحميل...</div>
      ) : (
        <>
          {items.map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: isScalar ? 'center' : 'flex-start', gap: 8, marginBottom: 8, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ flex: 1 }}>
                {isScalar ? (
                  <FieldInput kind={fieldSchema.item_kind} value={drafts[i] ?? ''} onChange={(v) => setDraft(i, v)} />
                ) : (
                  Object.entries(subFields).map(([subKey, subSchema]) => (
                    <Field key={subKey} label={subSchema.label_ar}>
                      <FieldInput kind={subSchema.kind} value={drafts[i]?.[subKey] ?? ''} options={subSchema.options}
                        onChange={(v) => setDraft(i, { ...drafts[i], [subKey]: v })} />
                    </Field>
                  ))
                )}
                {rowDirty(i) && (
                  <Button onClick={() => handleSaveRow(i)} disabled={savingIndex !== null} color={color} size="sm" style={{ marginTop: 4 }}>
                    {savingIndex === i ? 'جاري الحفظ...' : 'حفظ'}
                  </Button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button type="button" onClick={() => handleMove(i, -1)} disabled={i === 0 || savingIndex !== null}
                  style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: T.textMuted, opacity: i === 0 ? 0.3 : 1, fontSize: 14 }}>↑</button>
                <button type="button" onClick={() => handleMove(i, 1)} disabled={i === items.length - 1 || savingIndex !== null}
                  style={{ background: 'none', border: 'none', cursor: i === items.length - 1 ? 'default' : 'pointer', color: T.textMuted, opacity: i === items.length - 1 ? 0.3 : 1, fontSize: 14 }}>↓</button>
                <button type="button" onClick={() => handleDelete(i)} disabled={savingIndex !== null}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.danger, fontSize: 12 }}>حذف</button>
              </div>
            </div>
          ))}

          <div style={{ padding: 10, borderRadius: 8, border: `1px dashed ${T.border}` }}>
            {isScalar ? (
              <FieldInput kind={fieldSchema.item_kind} value={newItem} onChange={setNewItem} />
            ) : (
              Object.entries(subFields).map(([subKey, subSchema]) => (
                <Field key={subKey} label={subSchema.label_ar}>
                  <FieldInput kind={subSchema.kind} value={newItem[subKey] ?? ''} options={subSchema.options}
                    onChange={(v) => setNewItem(prev => ({ ...prev, [subKey]: v }))} />
                </Field>
              ))
            )}
            <Button onClick={handleAdd} disabled={savingIndex !== null} color={color} style={{ marginTop: 4 }}>
              {savingIndex === 'add' ? '...' : '+ إضافة'}
            </Button>
          </div>
          {error && <div style={{ marginTop: 8, fontSize: 12, color: T.danger }}>{error}</div>}
        </>
      )}
    </div>
  )
}

function SectionSettingsArea({ color }) {
  const [sections, setSections] = useState([])
  const [schemas, setSchemas] = useState(null) // TOS-005 Phase B -- fetched once, not hardcoded
  const [loading, setLoading] = useState(true)
  // TOS-005 Phase 1 (Section Shell) -- which section's editor shows on the opposite side.
  // Defaults to the first real section once the list loads, so the editor is never empty on
  // first open.
  const [selectedType, setSelectedType] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      adminApi.get('/content/sections'),
      adminApi.get('/content/sections/schema'),
    ])
      .then(([sectionsRes, schemaRes]) => {
        if (sectionsRes.data.success) {
          const sorted = [...sectionsRes.data.data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          setSections(sorted)
          setSelectedType(prev => (prev && sorted.some(s => s.type === prev)) ? prev : (sorted[0]?.type ?? null))
        }
        if (schemaRes.data.success) setSchemas(schemaRes.data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load]) // eslint-disable-line

  const handleToggleEnabled = async (type, enabled) => {
    setSections(prev => prev.map(s => s.type === type ? { ...s, enabled } : s)) // optimistic
    try {
      await adminApi.patch(`/content/sections/${type}/enabled`, { enabled })
    } catch {
      load() // revert to real state on failure
    }
  }

  const handleMove = async (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= sections.length) return
    const reordered = [...sections]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setSections(reordered) // optimistic
    try {
      await adminApi.patch('/content/sections/reorder', { ordered_types: reordered.map(s => s.type) })
    } catch {
      load() // revert to real state on failure
    }
  }

  const selectedSection = sections.find(s => s.type === selectedType) ?? null

  return (
    <Card style={{ marginBottom: 20 }}>
      <div style={sectionTitle}>إعدادات الأقسام</div>
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>
        اختر قسماً لتعديله، أخفِه أو أظهره، رتّبه — يظهر التغيير مباشرة على موقعك العام
      </div>
      {loading ? (
        <div style={{ fontSize: 13, color: T.textMuted }}>جاري التحميل...</div>
      ) : (
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {/* List side */}
          <div style={{ width: 150, flexShrink: 0, borderInlineEnd: `1px solid ${T.borderSoft}`, paddingInlineEnd: 10 }}>
            {sections.map((s, i) => (
              <SectionListRow
                key={s.id ?? s.type}
                section={s}
                index={i}
                total={sections.length}
                schema={schemas?.[s.type]}
                selected={s.type === selectedType}
                onSelect={setSelectedType}
                onToggleEnabled={handleToggleEnabled}
                onMove={handleMove}
              />
            ))}
          </div>
          {/* Editor side -- the "opposite side" panel for whichever section is selected */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {selectedSection ? (
              <SectionEditorPanel section={selectedSection} schema={schemas?.[selectedSection.type]} color={color} />
            ) : (
              <div style={{ fontSize: 12, color: T.textMuted }}>لا توجد أقسام بعد.</div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsTab({ settings, onUpdated, color, onFormChange }) {
  const existingConfig = settings?.config ?? {}
  const existingHours   = existingConfig.working_hours ?? {}

  const [form, setForm] = useState({
    name_ar:          settings?.name_ar         ?? '',
    name_en:          settings?.name_en         ?? '',
    primary_color:    settings?.primary_color   ?? '#6366f1',
    whatsapp_number:  settings?.whatsapp_number ?? '',
    // design
    page_type:        settings?.page_type       ?? 'normal',
    catalog_layout:   existingConfig.catalog_layout ?? 'grid',
    font:             existingConfig.font           ?? 'Cairo',
    // working hours (Homepage Phase 2.6, 2026-08-18) -- the real field HoursSection.jsx actually
    // prioritizes; previously had zero Dashboard editing surface anywhere, confirmed via a real
    // grep of every admin tab (ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md SS3)
    working_hours_open:  existingHours.open_time  ?? '',
    working_hours_close: existingHours.close_time ?? '',
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
          // Real field HoursSection.jsx prioritizes (Homepage Phase 2.6) -- only written when
          // both times are actually set, so an empty form never wipes a real existing value.
          working_hours: (form.working_hours_open && form.working_hours_close) ? {
            ...existingConfig.working_hours,
            open_time:  form.working_hours_open,
            close_time: form.working_hours_close,
          } : existingConfig.working_hours,
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

      {/* ── Hero Media ────────────────────────────────────────────────── */}
      <HeroMediaSection color={form.primary_color} />

      {/* ── Gallery Media ─────────────────────────────────────────────── */}
      <GalleryMediaSection color={form.primary_color} />

      {/* ── Working Hours (Homepage Phase 2.6) ───────────────────────────
          Real field HoursSection.jsx actually prioritizes -- previously had zero editing
          surface anywhere in the Dashboard, confirmed via a real grep of every admin tab. */}
      <Card style={{ marginBottom: 20 }}>
        <div style={sectionTitle}>ساعات العمل</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="من">
            <input type="time" style={inputStyle} value={form.working_hours_open} onChange={set('working_hours_open')} dir="ltr" />
          </Field>
          <Field label="إلى">
            <input type="time" style={inputStyle} value={form.working_hours_close} onChange={set('working_hours_close')} dir="ltr" />
          </Field>
        </div>
      </Card>

      {/* ── Section Settings (Homepage Phase 2.6) ────────────────────────
          Per ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md -- show/hide, reorder, and the real
          text/settings fields for every live section. Hero/Gallery text fields (title_ar,
          heading_ar, ...) live here now too, correcting the removed "Hero Text" card above,
          which wrote to config.hero -- a field HeroSection.jsx never read (confirmed real,
          pre-existing, dead since it shipped; nothing else in the codebase referenced it). */}
      <SectionSettingsArea color={form.primary_color} />

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
