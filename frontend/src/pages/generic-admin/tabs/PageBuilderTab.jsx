/**
 * PageBuilderTab.jsx — Generic Dynamic Page Builder (v2)
 *
 * v2 changes over v1:
 *   – @dnd-kit/sortable drag-and-drop reordering (replaces ↑↓ buttons)
 *   – Design System: Button, Input, GlassCard from design-system/atoms
 *   – Backend: config.content validated by app/schemas/page_content.py
 *
 * Section types:
 *   hero            — title + subtitle + CTA + bg image/video upload
 *   story           — heading + body paragraphs + stats grid
 *   featured_items  — auto-pulls is_featured from catalog
 *   categories_grid — shows catalog categories as visual tiles
 *   gallery         — freeform image grid
 *   location        — text + maps_url + tags
 *   cta             — full-width call-to-action banner
 *
 * Data shape (Client.config.content):
 *   { sections: [{id, type, order, data}], template_key, page_type }
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence }                   from 'framer-motion'
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext,
  sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS }          from '@dnd-kit/utilities'
import adminApi         from '../../../utils/admin.config'
import useImageUpload   from '../../../hooks/useImageUpload'
import Button           from '../../../design-system/atoms/Button'
import DSInput          from '../../../design-system/atoms/Input'
import GlassCard        from '../../../design-system/atoms/GlassCard'

// ── Palette (inline tokens for non-DS elements) ───────────────────────────────
const C = {
  bg:         '#0a0a0f',
  surface:    '#12121a',
  surfaceHi:  '#1a1a28',
  border:     'rgba(255,255,255,0.07)',
  borderHi:   'rgba(255,255,255,0.14)',
  text:       '#f0f0f5',
  muted:      '#6b6b80',
  gold:       '#d4a853',
  goldDim:    'rgba(212,168,83,0.10)',
  goldBorder: 'rgba(212,168,83,0.28)',
  green:      '#3ecf8e',
  red:        '#f87171',
}

// ── Section type registry ─────────────────────────────────────────────────────
const SECTION_TYPES = [
  { type: 'hero',            icon: '🌄', labelAr: 'الهيرو',           desc: 'صورة/فيديو خلفية + عنوان + زر' },
  { type: 'story',           icon: '📖', labelAr: 'قصتنا',            desc: 'نص وصفي + إحصائيات' },
  { type: 'featured_items',  icon: '⭐', labelAr: 'منتجات مميزة',     desc: 'يسحب من الكاتالوج تلقائياً' },
  { type: 'categories_grid', icon: '🗂', labelAr: 'شبكة التصنيفات',   desc: 'عرض فئات المتجر بصرياً' },
  { type: 'gallery',         icon: '🖼', labelAr: 'معرض الصور',       desc: 'رفع صور متعددة' },
  { type: 'location',        icon: '📍', labelAr: 'الموقع',            desc: 'نص + رابط خريطة + وسوم' },
  { type: 'cta',             icon: '🎯', labelAr: 'دعوة للتحرك',      desc: 'بانر CTA عريض' },
]

const DEFAULT_DATA = {
  hero:            { title_ar: '', subtitle_ar: '', cta_text_ar: 'اكتشف المزيد', bg_image_url: '', bg_type: 'color' },
  story:           { heading_ar: '', body_ar: '', stats: [{ num: '', label: '' }], bg_image_url: '', bg_type: 'color' },
  featured_items:  { heading_ar: 'منتجات مميزة', limit: 6, bg_image_url: '', bg_type: 'color' },
  categories_grid: { heading_ar: 'التصنيفات', show_count: true, bg_image_url: '', bg_type: 'color' },
  gallery:         { images: [] },
  location:        { para_ar: '', maps_url: '', tags: '', bg_image_url: '', bg_type: 'color' },
  cta:             { text_ar: '', link: '', accent: '', bg_image_url: '', bg_type: 'color' },
}

const TEMPLATE_OPTIONS = [
  { key: 'food-cafe',    label: 'Café',         color: '#e85d26', descAr: 'للمطاعم والكافيهات' },
  { key: 'showcase',     label: 'Showcase',     color: '#6d28d9', descAr: 'واجهة سينمائية' },
  { key: 'landing',      label: 'Landing',      color: '#3b82f6', descAr: 'صفحة هبوط تسويقية' },
  { key: 'fashion-grid', label: 'Fashion Grid', color: '#E8E8E8', descAr: 'شبكة منتجات أنيقة' },
  { key: 'normal',       label: 'Normal',       color: '#3ecf8e', descAr: 'بسيط وسريع' },
]

const uid = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

// ── Field atoms ───────────────────────────────────────────────────────────────

// Single-line: wraps DS Input. Multiline: custom textarea matching DS Input style.
function Field({ label, value, onChange, multiline, rows = 3, placeholder = '' }) {
  if (multiline) {
    return (
      <div className="flex flex-col gap-1.5 mb-[11px]">
        {label && (
          <label
            className="text-[10px] tracking-[0.32em] uppercase text-white/40 font-semibold"
            style={{ direction: 'inherit' }}
          >
            {label}
          </label>
        )}
        <textarea
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-4 py-3 text-sm text-white/80 placeholder:text-white/25 bg-white/[0.04] border border-white/10 focus:border-[#d4a853] rounded-[8px] outline-none focus:ring-2 focus:ring-[#d4a853]/20 transition-all duration-200 resize-vertical"
        />
      </div>
    )
  }
  return (
    <DSInput
      label={label}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="mb-[11px]"
    />
  )
}

// ── Image Upload Field ────────────────────────────────────────────────────────

function ImageUploadField({ label, value, onChange, context = 'page_hero' }) {
  const { upload, uploading } = useImageUpload()
  const inputRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { url } = await upload(file, { context })
      onChange(url)
    } catch { /* leave existing */ }
  }

  return (
    <div className="mb-[11px]">
      {label && (
        <label className="block text-[10px] tracking-[0.1em] uppercase text-white/40 font-semibold mb-[5px]">
          {label}
        </label>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <DSInput
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="https://... أو ارفع صورة"
          className="flex-1 mb-0"
        />
        <Button
          variant="ghost"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="!min-h-0 !py-2 !px-3 !text-[11px] whitespace-nowrap flex-shrink-0"
        >
          {uploading ? '⏳' : '📎 رفع'}
        </Button>
        <input
          ref={inputRef} type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>
      {value && (
        <div style={{ marginTop: 6, borderRadius: 6, overflow: 'hidden', maxHeight: 80, position: 'relative' }}>
          {value.match(/\.(mp4|webm|mov)$/i)
            ? <video src={value} style={{ width: '100%', height: 80, objectFit: 'cover' }} muted />
            : <img src={value} alt="" style={{ width: '100%', height: 80, objectFit: 'cover' }} />
          }
          <button
            onClick={() => onChange('')}
            style={{
              position: 'absolute', top: 4, left: 4,
              background: 'rgba(0,0,0,0.7)', border: 'none',
              borderRadius: 4, color: C.red, cursor: 'pointer',
              fontSize: 11, padding: '2px 6px',
            }}
          >✕</button>
        </div>
      )}
    </div>
  )
}

// Shared bg-image field used by all non-hero section editors
function BgImageField({ data, set }) {
  return (
    <>
      <div style={{ height: 1, background: C.border, margin: '8px 0 14px' }} />
      <ImageUploadField
        label="صورة خلفية القسم (اختياري)"
        value={data.bg_image_url}
        onChange={v => set('bg_image_url', v)}
        context="page_hero"
      />
    </>
  )
}

// ── Section Editors ───────────────────────────────────────────────────────────

function HeroEditor({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  return (
    <>
      <Field label="العنوان الرئيسي" value={data.title_ar} onChange={v => set('title_ar', v)} placeholder="مرحباً بكم في..." />
      <Field label="النص الفرعي" value={data.subtitle_ar} onChange={v => set('subtitle_ar', v)} multiline rows={2} />
      <Field label="نص زر الـ CTA" value={data.cta_text_ar} onChange={v => set('cta_text_ar', v)} placeholder="اكتشف المزيد" />
      <ImageUploadField label="صورة/فيديو الخلفية" value={data.bg_image_url} onChange={v => set('bg_image_url', v)} context="page_hero" />
      <div className="mb-[11px]">
        <label className="block text-[10px] tracking-[0.1em] uppercase text-white/40 font-semibold mb-[5px]">
          نوع الخلفية
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['color', 'image', 'video'].map(t => (
            <button key={t} onClick={() => set('bg_type', t)} style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600,
              background: data.bg_type === t ? C.goldDim : 'transparent',
              border: `1px solid ${data.bg_type === t ? C.gold : C.border}`,
              color: data.bg_type === t ? C.gold : C.muted,
            }}>{t}</button>
          ))}
        </div>
      </div>
    </>
  )
}

function StoryEditor({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  const setStatField = (i, k, v) => {
    const stats = [...(data.stats || [])]
    stats[i] = { ...stats[i], [k]: v }
    set('stats', stats)
  }
  return (
    <>
      <Field label="العنوان" value={data.heading_ar} onChange={v => set('heading_ar', v)} />
      <Field label="النص" value={data.body_ar} onChange={v => set('body_ar', v)} multiline rows={4} />
      <div className="mb-[6px]">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <label className="text-[10px] tracking-[0.1em] uppercase text-white/40 font-semibold">إحصائيات</label>
          <button onClick={() => set('stats', [...(data.stats || []), { num: '', label: '' }])}
            style={{ fontSize: 11, color: C.gold, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
            + إضافة
          </button>
        </div>
        {(data.stats || []).map((st, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 28px', gap: 6, marginBottom: 6 }}>
            <DSInput value={st.num ?? ''} onChange={e => setStatField(i, 'num', e.target.value)} placeholder="11" className="mb-0" inputClassName="text-center" />
            <DSInput value={st.label ?? ''} onChange={e => setStatField(i, 'label', e.target.value)} placeholder="وحدة خاصة" className="mb-0" />
            <button onClick={() => set('stats', data.stats.filter((_, idx) => idx !== i))}
              style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 14, padding: '0 4px', alignSelf: 'center' }}>✕</button>
          </div>
        ))}
      </div>
      <BgImageField data={data} set={set} />
    </>
  )
}

function FeaturedItemsEditor({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  return (
    <>
      <Field label="عنوان القسم" value={data.heading_ar} onChange={v => set('heading_ar', v)} placeholder="منتجات مميزة" />
      <div className="mb-[11px]">
        <label className="block text-[10px] tracking-[0.1em] uppercase text-white/40 font-semibold mb-[5px]">عدد العناصر</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[3, 6, 9, 12].map(n => (
            <button key={n} onClick={() => set('limit', n)} style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 700,
              background: data.limit === n ? C.goldDim : 'transparent',
              border: `1px solid ${data.limit === n ? C.gold : C.border}`,
              color: data.limit === n ? C.gold : C.muted,
            }}>{n}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(212,168,83,0.05)', border: `1px solid ${C.goldBorder}`, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
        ⭐ يعرض العناصر ذات <code style={{ color: C.gold }}>is_featured=true</code> من الكاتالوج تلقائياً.
      </div>
      <BgImageField data={data} set={set} />
    </>
  )
}

function CategoriesGridEditor({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  return (
    <>
      <Field label="عنوان القسم" value={data.heading_ar} onChange={v => set('heading_ar', v)} placeholder="التصنيفات" />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.text, marginBottom: 11 }}>
        <input type="checkbox" checked={!!data.show_count} onChange={e => set('show_count', e.target.checked)} style={{ accentColor: C.gold, width: 14, height: 14 }} />
        عرض عدد العناصر في كل فئة
      </label>
      <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(212,168,83,0.05)', border: `1px solid ${C.goldBorder}`, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
        🗂 يسحب التصنيفات من الكاتالوج المزروع تلقائياً.
      </div>
      <BgImageField data={data} set={set} />
    </>
  )
}

function GalleryEditor({ data, onChange }) {
  const { upload, uploading } = useImageUpload()
  const inputRef = useRef(null)

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    let images = [...(data.images || [])]
    for (const file of files) {
      try {
        const { url } = await upload(file, { context: 'page_story' })
        images = [...images, { url, caption_ar: '' }]
      } catch { /* skip */ }
    }
    onChange({ ...data, images })
  }

  const removeImage = (i) => onChange({ ...data, images: (data.images || []).filter((_, idx) => idx !== i) })
  const updateCaption = (i, v) => {
    const images = [...(data.images || [])]
    images[i] = { ...images[i], caption_ar: v }
    onChange({ ...data, images })
  }

  return (
    <>
      <Button
        variant="ghost"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-full !min-h-0 !py-2.5 mb-3 border-dashed"
      >
        {uploading ? '⏳ جارٍ الرفع...' : '+ إضافة صور'}
      </Button>
      <input ref={inputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleFiles} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {(data.images || []).map((img, i) => (
          <div key={i} style={{ position: 'relative', borderRadius: 7, overflow: 'hidden', background: C.surface }}>
            <img src={img.url} alt="" style={{ width: '100%', height: 70, objectFit: 'cover', display: 'block' }} />
            <DSInput
              value={img.caption_ar ?? ''}
              onChange={e => updateCaption(i, e.target.value)}
              placeholder="وصف (اختياري)"
              className="mb-0"
              inputClassName="!rounded-none !rounded-b-[8px] !text-[11px] !py-1.5"
            />
            <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 4, color: C.red, cursor: 'pointer', fontSize: 11, padding: '2px 6px' }}>✕</button>
          </div>
        ))}
      </div>
    </>
  )
}

function LocationEditor({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  return (
    <>
      <Field label="النص التعريفي" value={data.para_ar} onChange={v => set('para_ar', v)} multiline rows={3} />
      <Field label="رابط Google Maps" value={data.maps_url} onChange={v => set('maps_url', v)} placeholder="https://maps.google.com/..." />
      <Field label="وسوم (مفصولة بفاصلة)" value={data.tags} onChange={v => set('tags', v)} placeholder="الرياض، حي النخيل" />
      <BgImageField data={data} set={set} />
    </>
  )
}

function CtaEditor({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  return (
    <>
      <Field label="نص البانر" value={data.text_ar} onChange={v => set('text_ar', v)} placeholder="احجز الآن واستمتع بعرض خاص" />
      <Field label="رابط الزر" value={data.link} onChange={v => set('link', v)} placeholder="/store أو https://wa.me/..." />
      <BgImageField data={data} set={set} />
    </>
  )
}

const EDITORS = {
  hero:            HeroEditor,
  story:           StoryEditor,
  featured_items:  FeaturedItemsEditor,
  categories_grid: CategoriesGridEditor,
  gallery:         GalleryEditor,
  location:        LocationEditor,
  cta:             CtaEditor,
}

// ── Sortable Section Card ─────────────────────────────────────────────────────

function SectionCard({ section, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false)
  const Editor = EDITORS[section.type]
  const meta   = SECTION_TYPES.find(s => s.type === section.type)

  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: section.id })

  const dragStyle = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0 : 1,  // hide original while overlay shows
    zIndex:     isDragging ? 50 : 'auto',
    position:   'relative',
    marginBottom: 8,
  }

  return (
    <div ref={setNodeRef} style={dragStyle}>
      <GlassCard
        className="p-0 overflow-hidden"
        style={{
          borderRadius: 10,
          boxShadow: isDragging ? `0 12px 32px rgba(0,0,0,0.5)` : 'none',
        }}
      >
        {/* ── Header row ─────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '11px 14px', gap: 10, userSelect: 'none',
          background: open ? C.surfaceHi : 'transparent',
          transition: 'background 0.15s',
        }}>

          {/* Drag handle — receives DnD listeners */}
          <button
            {...attributes}
            {...listeners}
            title="اسحب لإعادة الترتيب"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'none', border: 'none',
              cursor: isDragging ? 'grabbing' : 'grab',
              color: C.muted, fontSize: 16,
              padding: '2px 4px', flexShrink: 0,
              touchAction: 'none', lineHeight: 1,
            }}
          >
            ⠿
          </button>

          {/* Click area → expand / collapse */}
          <div
            onClick={() => setOpen(o => !o)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, cursor: 'pointer' }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{meta?.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{meta?.labelAr}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{meta?.desc}</div>
            </div>
          </div>

          {/* Delete */}
          <Button
            variant="danger"
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="!min-h-0 !px-2 !py-1 !text-[11px] !rounded-[6px]"
          >
            ✕
          </Button>

          {/* Chevron */}
          <span
            onClick={() => setOpen(o => !o)}
            style={{ fontSize: 11, color: C.muted, cursor: 'pointer', userSelect: 'none' }}
          >
            {open ? '▲' : '▼'}
          </span>
        </div>

        {/* ── Editor body ────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                padding: '14px 16px 8px',
                borderTop: `1px solid ${C.border}`,
                direction: 'rtl',
              }}>
                {Editor && (
                  <Editor
                    data={section.data}
                    onChange={data => onUpdate({ ...section, data })}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </div>
  )
}

// Lightweight ghost shown in DragOverlay while dragging
function DragGhost({ section }) {
  const meta = SECTION_TYPES.find(s => s.type === section?.type)
  return (
    <GlassCard
      goldAccent
      className="p-0 overflow-hidden"
      style={{ borderRadius: 10, boxShadow: '0 20px 48px rgba(0,0,0,0.7)', opacity: 0.92 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', gap: 10 }}>
        <span style={{ color: C.muted, fontSize: 16 }}>⠿</span>
        <span style={{ fontSize: 16 }}>{meta?.icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{meta?.labelAr}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{meta?.desc}</div>
        </div>
      </div>
    </GlassCard>
  )
}

// ── Live Preview ─────────────────────────────────────────────────────────────

function LivePreview({ sections, color }) {
  const TYPE_COLOR = {
    hero:            '#6d28d9',
    story:           '#3ecf8e',
    featured_items:  '#d4a853',
    categories_grid: '#f59e0b',
    gallery:         '#60a5fa',
    location:        '#fb923c',
    cta:             '#f87171',
  }
  return (
    <div style={{ fontFamily: 'inherit', direction: 'rtl' }}>
      {sections.map((sec) => {
        const meta   = SECTION_TYPES.find(s => s.type === sec.type)
        const tColor = TYPE_COLOR[sec.type] || color

        if (sec.type === 'hero') {
          return (
            <div key={sec.id} style={{
              position: 'relative', minHeight: 180, borderRadius: 10, marginBottom: 10, overflow: 'hidden',
              background: sec.data.bg_image_url
                ? `url(${sec.data.bg_image_url}) center/cover`
                : 'linear-gradient(135deg, oklch(0.18 0.05 280), oklch(0.12 0.03 260))',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
              <div style={{ position: 'relative', padding: '32px 24px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>
                  {sec.data.title_ar || 'عنوان الصفحة'}
                </div>
                {sec.data.subtitle_ar && (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>{sec.data.subtitle_ar}</div>
                )}
                {sec.data.cta_text_ar && (
                  <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 7, background: color, color: '#fff', fontSize: 13, fontWeight: 700 }}>
                    {sec.data.cta_text_ar}
                  </div>
                )}
              </div>
            </div>
          )
        }

        if (sec.type === 'story') {
          return (
            <div key={sec.id} style={{ background: C.surface, borderRadius: 10, padding: '20px', marginBottom: 10, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{sec.data.heading_ar || 'قصتنا'}</div>
              {sec.data.body_ar && (
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 12 }}>
                  {sec.data.body_ar.slice(0, 120)}{sec.data.body_ar.length > 120 ? '…' : ''}
                </div>
              )}
              {(sec.data.stats || []).filter(s => s.num).length > 0 && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {sec.data.stats.filter(s => s.num).map((st, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '8px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 7, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color }}>{st.num}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{st.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }

        if (sec.type === 'gallery' && (sec.data.images || []).length > 0) {
          return (
            <div key={sec.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {sec.data.images.slice(0, 6).map((img, i) => (
                  <img key={i} src={img.url} alt="" style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 7 }} />
                ))}
              </div>
            </div>
          )
        }

        // Generic placeholder
        return (
          <div key={sec.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderRadius: 10, marginBottom: 8,
            background: `${tColor}0d`, border: `1px solid ${tColor}28`,
          }}>
            <span style={{ fontSize: 20 }}>{meta?.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{meta?.labelAr}</div>
              {sec.type === 'featured_items' && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sec.data.heading_ar} · {sec.data.limit} عنصر</div>
              )}
              {sec.type === 'categories_grid' && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sec.data.heading_ar}</div>
              )}
              {sec.type === 'location' && sec.data.maps_url && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>📍 رابط الخريطة مُضاف</div>
              )}
              {sec.type === 'cta' && sec.data.text_ar && (
                <div style={{ fontSize: 12, color: tColor, marginTop: 4, fontWeight: 600 }}>{sec.data.text_ar.slice(0, 60)}</div>
              )}
            </div>
          </div>
        )
      })}
      {sections.length === 0 && (
        <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, paddingTop: 60 }}>
          أضف أول قسم من اليسار ←
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PageBuilderTab({ color = '#6d28d9', settings }) {
  const [sections,     setSections]     = useState([])
  const [templateKey,  setTemplateKey]  = useState('normal')
  const [pageType,     setPageType]     = useState('showcase')
  const [storedConfig, setStoredConfig] = useState({})
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState(null)
  const [showAddMenu,  setShowAddMenu]  = useState(false)
  const [activeId,     setActiveId]     = useState(null)

  // DnD sensors — require 5px movement to avoid mis-fires when expanding cards
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Load existing config from DB
  useEffect(() => {
    adminApi.get('/settings')
      .then(res => {
        const cfg = res.data?.config ?? res.data ?? {}
        setStoredConfig(cfg)
        const content = cfg.content ?? {}
        if (Array.isArray(content.sections) && content.sections.length) {
          setSections(content.sections.map(s => ({
            ...s,
            id:   s.id ?? uid(),
            data: { ...(DEFAULT_DATA[s.type] ?? {}), ...(s.data ?? {}) },
          })))
        }
        if (content.template_key) setTemplateKey(content.template_key)
        if (content.page_type)    setPageType(content.page_type)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Section CRUD
  const addSection = useCallback((type) => {
    const newSec = { id: uid(), type, order: sections.length, data: { ...DEFAULT_DATA[type] } }
    setSections(s => [...s, newSec])
    setShowAddMenu(false)
  }, [sections.length])

  const updateSection = useCallback((updated) => {
    setSections(s => s.map(sec => sec.id === updated.id ? updated : sec))
  }, [])

  const deleteSection = useCallback((id) => {
    setSections(s => s.filter(sec => sec.id !== id))
  }, [])

  // DnD handlers
  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (over && active.id !== over.id) {
      setSections(items => {
        const oldIdx = items.findIndex(s => s.id === active.id)
        const newIdx = items.findIndex(s => s.id === over.id)
        return arrayMove(items, oldIdx, newIdx).map((s, i) => ({ ...s, order: i }))
      })
    }
  }

  const activeSection = sections.find(s => s.id === activeId)

  // Publish
  const handlePublish = async () => {
    setSaving(true)
    const content = {
      sections: sections.map((s, i) => ({ ...s, order: i })),
      template_key: templateKey,
      page_type:    pageType,
    }
    try {
      await adminApi.patch('/settings', { config: { ...storedConfig, content } })
      setStoredConfig(prev => ({ ...prev, content }))
      showToast(true, 'تم حفظ الصفحة ونشرها ✓')
    } catch {
      showToast(false, 'فشل النشر — تحقق من الاتصال')
    } finally {
      setSaving(false)
    }
  }

  const showToast = (ok, msg) => {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 3500)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: C.muted, gap: 12 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 12px ${color}`, animation: 'pb-pulse 1.4s ease-in-out infinite' }} />
        <style>{`@keyframes pb-pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
        جارٍ التحميل...
      </div>
    )
  }

  return (
    <div style={{
      margin: '-28px -32px',
      height: 'calc(100dvh - 120px)',
      display: 'grid',
      gridTemplateColumns: '360px 1fr',
      overflow: 'hidden',
      direction: 'rtl',
    }}>

      {/* ═══════════════════════════════════════════════════════════
          RIGHT — Sections Editor Panel
      ═══════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        borderLeft: `1px solid ${C.border}`,
        background: C.surface, overflow: 'hidden',
      }}>

        {/* Toolbar */}
        <div style={{ padding: '13px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.bg }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>🧩 بناء الصفحة</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sections.length} قسم مضاف</div>
            </div>
            <Button
              variant="gold"
              disabled={saving}
              onClick={handlePublish}
              className="!min-h-0 !py-2 !px-4 !text-[11px]"
            >
              {saving ? '⏳ جارٍ النشر...' : '🚀 نشر'}
            </Button>
          </div>

          {/* Active template badge */}
          {templateKey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>القالب:</span>
              {(() => {
                const t = TEMPLATE_OPTIONS.find(o => o.key === templateKey)
                return t ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.color, background: `${t.color}18`, padding: '3px 8px', borderRadius: 4, border: `1px solid ${t.color}44` }}>
                    {t.label}
                  </span>
                ) : null
              })()}
            </div>
          )}
        </div>

        {/* Sections list with DnD */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 8px' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {sections.map((sec) => (
                <SectionCard
                  key={sec.id}
                  section={sec}
                  onUpdate={updateSection}
                  onDelete={() => deleteSection(sec.id)}
                />
              ))}
            </SortableContext>

            {/* Drag ghost overlay */}
            <DragOverlay dropAnimation={{ duration: 180 }}>
              {activeSection ? <DragGhost section={activeSection} /> : null}
            </DragOverlay>
          </DndContext>

          {/* Add section button */}
          <div style={{ position: 'relative', marginTop: 4 }}>
            <Button
              variant="ghost"
              onClick={() => setShowAddMenu(v => !v)}
              className="w-full !min-h-0 !py-2.5 !text-xs border-dashed"
            >
              + إضافة قسم
            </Button>

            <AnimatePresence>
              {showAddMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', bottom: '110%', right: 0, left: 0, zIndex: 50,
                    background: '#1a1a28', border: `1px solid ${C.borderHi}`,
                    borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  }}
                >
                  {SECTION_TYPES.map(t => (
                    <button key={t.type} onClick={() => addSection(t.type)} style={{
                      width: '100%', padding: '10px 14px', background: 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'right',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'background 0.1s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surfaceHi}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: 16 }}>{t.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.labelAr}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{t.desc}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* ── Template visual cards ── */}
          <div style={{ marginTop: 20 }}>
            <div style={{
              fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: C.muted, marginBottom: 10, fontWeight: 600, paddingRight: 4,
            }}>
              القوالب المتاحة
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {TEMPLATE_OPTIONS.map(t => {
                const active = templateKey === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => setTemplateKey(t.key)}
                    style={{
                      padding: '10px 12px',
                      border: `1px solid ${active ? t.color : C.border}`,
                      borderRadius: 9,
                      background: active ? `${t.color}18` : C.surfaceHi,
                      cursor: 'pointer', textAlign: 'right',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'all 0.15s', width: '100%',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = `${t.color}80` }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = C.border }}
                  >
                    <div style={{
                      width: 34, height: 34, flexShrink: 0, borderRadius: 7,
                      background: `${t.color}22`,
                      border: `2px solid ${active ? t.color : `${t.color}55`}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: t.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: active ? t.color : C.text }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{t.descAr}</div>
                    </div>
                    {active && (
                      <span style={{ fontSize: 14, color: t.color, flexShrink: 0 }}>✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ height: 32 }} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          LEFT — Live Preview
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ background: '#060609', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Browser chrome */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(6,6,9,0.95)', backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${C.border}`, padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#28c840' }} />
          <div style={{ flex: 1, padding: '4px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', direction: 'ltr' }}>
            /demo/{settings?.slug ?? '...'}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' }}>
            <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: color, marginLeft: 4, boxShadow: `0 0 5px ${color}` }} />
            PREVIEW
          </div>
        </div>

        {/* Preview content */}
        <div style={{ padding: '20px 24px', maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <LivePreview sections={sections} color={color} />
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="pb-toast"
            initial={{ opacity: 0, y: 40, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 40, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            style={{
              position: 'fixed', bottom: 28, left: '50%', zIndex: 9999,
              background: toast.ok ? 'rgba(62,207,142,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${toast.ok ? '#3ecf8e' : '#f87171'}44`,
              borderRadius: 12, padding: '10px 22px',
              color: toast.ok ? '#3ecf8e' : '#f87171',
              fontSize: 13, fontWeight: 600, backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 28px rgba(0,0,0,0.5)', whiteSpace: 'nowrap',
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
