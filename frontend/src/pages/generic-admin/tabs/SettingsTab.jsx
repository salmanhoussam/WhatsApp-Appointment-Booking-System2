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
// 2026-08-19; repeatable groups since TOS-005 Phase D, 2026-08-19; media-kind fields since
// Tenant OS Section Editor Phase 4, 2026-08-20) ───────────────────────────────────────────
// The field/label lists that used to live here as hardcoded SECTION_FIELDS/SECTION_LABELS
// objects are retired -- app/schemas/section_schemas.py is now the one real source of truth
// (TOS-005-cms-generic-engine.md §4.1), fetched once via GET /content/sections/schema
// (SectionSettingsArea below) and passed down. No independent copy exists here anymore --
// divergence between this form and the backend's own validation is structurally impossible,
// not merely discouraged. Media-kind fields (hero.bg_image_url, gallery.images) are excluded
// from fieldsConfig's scalar loop and rendered instead via MediaField, which mounts
// HeroMediaSection/GalleryMediaSection -- the field's real value is still written exclusively
// through those components' own dedicated endpoints, never through this form's generic
// fields PATCH (the backend rejects it, section_schemas.py's `_validate_value`). Repeatable-kind
// fields (story.stats, location.tags, why_choose_us.items, ...) render via the one generic
// RepeatableGroupEditor below -- never a per-section editor (StoryEditor/LocationEditor/
// WhyChooseUsEditor never exist).

// One shared input renderer for both scalar fields (SectionRow) and repeatable sub-fields
// (RepeatableGroupEditor) -- the same kind -> input-type switch, written once.
//
// Tenant OS Section Editor Phase 2 (2026-08-20) added a `group` branch here. `media` deliberately
// has no branch in FieldInput -- same as `repeatable`, a media-kind field is never a value/onChange
// pair rendered inline; it's excluded from SectionEditorPanel's fieldsConfig and rendered instead
// via the dedicated MediaField dispatcher below (Phase 4), which mounts a real, self-contained,
// already-correct component (HeroMediaSection/GalleryMediaSection) -- consistent with how
// featured_items/staff already link out to StaffTab.jsx's own editor rather than rendering inline.
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

// Tenant OS Section Editor Phase 4 (2026-08-20) -- one dispatcher for every media-kind field.
// `pipeline` (declared in section_schemas.py) decides which existing, unchanged component owns
// it: `singleton` -> HeroMediaSection, `collection` -> GalleryMediaSection. Never a third, generic
// upload implementation (TOS-005 §8.1's own reconciliation) -- the same "delegate to a real,
// already-correct editor" shape featured_items/staff already use via StaffTab.jsx.
function MediaField({ pipeline, color }) {
  if (pipeline === 'singleton') return <HeroMediaSection color={color} />
  if (pipeline === 'collection') return <GalleryMediaSection color={color} />
  return null
}

// Tenant OS Section Editor Phase 5 (2026-08-20) -- featured_items' and staff's real items
// (CatalogService/Barber rows) are owned by the Catalog/Staff Capability, already fully
// CRUD-editable via StaffTab.jsx (name/description/price/image/active/reorder for Services,
// name/photo/hours for Staff) -- never rebuilt here. This is TOS-005 §1.3's "orchestrate, don't
// duplicate a second CRUD" pattern applied a third time (after Content/Media). A small
// declarative map, not a per-type if/else, names which section type deep-links to which
// StaffTab.jsx subView (`?view=` query param, same pattern SmarListingsPage already uses for its
// own `?type` filter -- rules/smar-tenant.md).
// products entry added Track B (2026-08-20) -- real CatalogItem (module_key='store') rows are
// owned by the Catalog/Store Capability, already fully CRUD-editable via StoreTab.jsx/
// CatalogTab.jsx, same "orchestrate, don't duplicate" pattern as featured_items/staff above.
// `navId: null` means "resolve dynamically" -- unlike featured_items/staff (always 'staff'),
// products' target tab is a real hasReservations-driven branch (store.py's routes/StoreTab.jsx
// for hasReservations tenants, catalog.py's/CatalogTab.jsx otherwise -- buildNav()'s own existing
// split, GenericAdminDashboard.jsx), never a tenant-slug check.
const CAPABILITY_LINKS = {
  featured_items: { navId: 'staff', view: 'services',  label: 'إدارة الخدمات ←' },
  staff:          { navId: 'staff', view: 'employees', label: 'إدارة الموظفين ←' },
  products:       { navId: null,    view: null,        label: 'إدارة المنتجات ←' },
}

function CapabilityLink({ sectionType, color, changeTab, hasReservations }) {
  const link = CAPABILITY_LINKS[sectionType]
  if (!link || !changeTab) return null
  const navId = link.navId ?? (hasReservations ? 'store' : 'catalog')
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      padding: '12px 14px', borderRadius: 8, marginBottom: 16,
      background: `${color}0f`, border: `1px solid ${color}30`,
    }}>
      <span style={{ fontSize: 12.5, color: T.textSecond }}>
        العناصر نفسها (الاسم، السعر، الصورة...) تُدار من صفحة {navId === 'staff' ? 'الموظفين' : 'المتجر'}
      </span>
      <button
        type="button"
        onClick={() => changeTab(navId, link.view ? `view=${link.view}` : undefined)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          color, fontSize: 13, fontWeight: 700, fontFamily: FONT,
        }}
      >
        {link.label}
      </button>
    </div>
  )
}

function SectionEditorPanel({ section, schema, color, changeTab, hasReservations }) {
  const fieldsConfig = Object.entries(schema?.fields ?? {})
    .filter(([, f]) => f.kind !== 'repeatable' && f.kind !== 'media')
    .map(([key, f]) => ({ key, label: f.label_ar, type: f.kind, options: f.options, fields: f.fields }))
  const repeatableFields = Object.entries(schema?.fields ?? {})
    .filter(([, f]) => f.kind === 'repeatable')
    .map(([key, f]) => ({ key, schema: f }))
  const mediaFields = Object.entries(schema?.fields ?? {})
    .filter(([, f]) => f.kind === 'media')
    .map(([key, f]) => ({ key, pipeline: f.pipeline }))
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

  if (fieldsConfig.length === 0 && repeatableFields.length === 0 && mediaFields.length === 0) {
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
      <CapabilityLink sectionType={section.type} color={color} changeTab={changeTab} hasReservations={hasReservations} />
      {mediaFields.map(mf => (
        <MediaField key={mf.key} pipeline={mf.pipeline} color={color} />
      ))}
      {fieldsConfig.length > 0 && (
        <>
          {fieldsConfig.map(f => (
            <Field key={f.key} label={f.label}>
              <FieldInput kind={f.type} value={values[f.key]} onChange={(v) => setValues(prev => { setSaved(false); return { ...prev, [f.key]: v } })} options={f.options} fields={f.fields} />
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

function SectionSettingsArea({ color, changeTab, hasReservations }) {
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
              <SectionEditorPanel section={selectedSection} schema={schemas?.[selectedSection.type]} color={color} changeTab={changeTab} hasReservations={hasReservations} />
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

export default function SettingsTab({ settings, onUpdated, color, onFormChange, changeTab, hasReservations }) {
  const existingConfig = settings?.config ?? {}
  const existingHours   = existingConfig.working_hours ?? {}

  const [form, setForm] = useState({
    name_ar:          settings?.name_ar         ?? '',
    name_en:          settings?.name_en         ?? '',
    primary_color:    settings?.primary_color   ?? '#6366f1',
    whatsapp_number:  settings?.whatsapp_number ?? '',
    // design -- page_type/catalog_layout kept intentionally (Tenant OS Section Editor Phase 6
    // scope decision, 2026-08-20): both are real, load-bearing for the auto-onboarded/Demo
    // rendering path (DynamicTenantResolver.jsx, DemoCatalogPage.jsx) -- a separate, still-live
    // Menu/Restaurant/Store application track this pass does not touch. See
    // .claudedocs/work/legacy-page-settings-audit/2026-08-20/summary.md for the full evidence.
    page_type:        settings?.page_type       ?? 'normal',
    catalog_layout:   existingConfig.catalog_layout ?? 'grid',
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

        {/* "الخط" (font) control removed -- Tenant OS Section Editor Phase 6, narrowed scope,
            2026-08-20. Confirmed genuinely dead: zero real consumers anywhere in the codebase
            (unlike page_type/catalog_layout above, kept intentionally -- see the comment on
            this component's initial form state for the full reasoning). */}

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

      {/* Hero/Gallery media moved into the Section Editor below (Tenant OS Section Editor
          Phase 4, 2026-08-20) -- HeroMediaSection/GalleryMediaSection now render only inside
          SectionEditorPanel's own MediaField dispatcher, never duplicated here. */}

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
      <SectionSettingsArea color={form.primary_color} changeTab={changeTab} hasReservations={hasReservations} />

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
