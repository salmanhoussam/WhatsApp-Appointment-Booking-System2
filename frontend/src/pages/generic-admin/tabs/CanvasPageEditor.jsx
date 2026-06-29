/**
 * CanvasPageEditor.jsx — Canva-style 3-panel page editor
 *
 * Layout:
 *   LEFT  (220px)  — section list + template picker
 *   CENTER (flex-1) — visual canvas blocks
 *   RIGHT  (300px)  — contextual panel: SettingsTab (no selection) OR section editor
 *
 * Props: { config, onUpdate }
 *   config   — Client settings object from parent (same shape as SettingsTab receives)
 *   onUpdate — callback after successful save (no args)
 *
 * Save endpoint: PUT /api/v1/admin/client/config
 * Payload: { content: { sections, template_key, page_type } }
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence }                   from 'framer-motion'
import adminApi       from '../../../utils/admin.config'
import useImageUpload from '../../../hooks/useImageUpload'
import Button         from '../../../design-system/atoms/Button'
import DSInput        from '../../../design-system/atoms/Input'
import SettingsTab    from './SettingsTab'

// ── Palette ───────────────────────────────────────────────────────────────────
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
  { type: 'offers',          icon: '🏷️', labelAr: 'العروض',           desc: 'بانر عروض وخصومات ملوّنة' },
  { type: 'story',           icon: '📖', labelAr: 'قصتنا',            desc: 'نص وصفي + إحصائيات' },
  { type: 'featured_items',  icon: '⭐', labelAr: 'أبرز العناصر',     desc: 'يسحب من الكاتالوج تلقائياً' },
  { type: 'categories_grid', icon: '🗂', labelAr: 'شبكة التصنيفات',   desc: 'عرض فئات المتجر بصرياً' },
  { type: 'gallery',         icon: '🖼', labelAr: 'معرض الصور',       desc: 'رفع صور متعددة' },
  { type: 'testimonials',    icon: '💬', labelAr: 'آراء العملاء',     desc: 'تقييمات مع نجوم ونصوص' },
  { type: 'hours',           icon: '🕐', labelAr: 'أوقات العمل',      desc: 'جدول أيام الأسبوع' },
  { type: 'location',        icon: '📍', labelAr: 'الموقع',            desc: 'نص + رابط خريطة + وسوم' },
  { type: 'cta',             icon: '🎯', labelAr: 'دعوة للتحرك',      desc: 'بانر CTA عريض' },
]

// ── Default data per section type ─────────────────────────────────────────────
const DEFAULT_DATA = {
  hero:            { title_ar: '', subtitle_ar: '', cta_text_ar: 'اكتشف المزيد', bg_image_url: '', bg_type: 'color' },
  offers:          { heading_ar: 'عروض خاصة', items: [
    { title_ar: 'عرض اليوم',    desc_ar: 'على جميع المشروبات الساخنة', badge: '20% OFF', accent: '#e85d26' },
    { title_ar: 'وجبة مجانية', desc_ar: 'مع كل طلبية فوق 50,000 ل.ل',  badge: 'مجاني',   accent: '#22c55e' },
  ]},
  story:           { heading_ar: '', body_ar: '', stats: [{ num: '', label: '' }], bg_image_url: '', bg_type: 'color' },
  featured_items:  { heading_ar: 'أبرز العناصر', limit: 6, bg_image_url: '', bg_type: 'color' },
  categories_grid: { heading_ar: 'التصنيفات', show_count: true, bg_image_url: '', bg_type: 'color' },
  gallery:         { images: [] },
  testimonials:    { heading_ar: 'ماذا يقول عملاؤنا', items: [
    { text_ar: '', author: '', rating: 5 },
    { text_ar: '', author: '', rating: 5 },
    { text_ar: '', author: '', rating: 5 },
  ]},
  hours:           { heading_ar: 'أوقات العمل', rows: [
    { day_ar: 'الاثنين — الجمعة', open_ar: '09:00 ص', close_ar: '10:00 م', closed: false },
    { day_ar: 'السبت',            open_ar: '10:00 ص', close_ar: '11:00 م', closed: false },
    { day_ar: 'الأحد',            open_ar: '',         close_ar: '',         closed: true  },
  ]},
  location:        { para_ar: '', maps_url: '', tags: '', bg_image_url: '', bg_type: 'color' },
  cta:             { text_ar: '', link: '', accent: '', bg_image_url: '', bg_type: 'color' },
}

// ── Template options ──────────────────────────────────────────────────────────
const TEMPLATE_OPTIONS = [
  {
    key: 'restaurant',
    label: 'مطعم / كافيه',
    color: '#e85d26',
    descAr: 'للمطاعم، الكافيهات، المطابخ السحابية',
    sections: ['hero','offers','categories_grid','featured_items','gallery','testimonials','hours','cta'],
  },
  {
    key: 'cafe_minimal',
    label: 'كافيه بسيط',
    color: '#f59e0b',
    descAr: 'قائمة مختصرة + موقع + تواصل',
    sections: ['hero','featured_items','offers','gallery','hours','cta'],
  },
  {
    key: 'store_classic',
    label: 'متجر إلكتروني',
    color: '#8b5cf6',
    descAr: 'للمتاجر، البوتيكات، المنتجات',
    sections: ['hero','offers','categories_grid','featured_items','testimonials','cta'],
  },
  {
    key: 'booking_showcase',
    label: 'فندق / شاليه',
    color: '#3ecf8e',
    descAr: 'للفنادق، الشاليهات، والمساحات',
    sections: ['hero','story','gallery','featured_items','testimonials','hours','location','cta'],
  },
  {
    key: 'landing',
    label: 'صفحة تسويقية',
    color: '#3b82f6',
    descAr: 'للحملات، الإطلاق، وصفحات الهبوط',
    sections: ['hero','story','featured_items','testimonials','cta'],
  },
]

const uid = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

// ── Field atoms ───────────────────────────────────────────────────────────────

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
        يعرض العناصر ذات <code style={{ color: C.gold }}>is_featured=true</code> من الكاتالوج تلقائياً.
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
        يسحب التصنيفات من الكاتالوج المزروع تلقائياً.
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

function OffersEditor({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  const setItem = (i, k, v) => {
    const items = [...(data.items || [])]
    items[i] = { ...items[i], [k]: v }
    set('items', items)
  }
  const removeItem = (i) => set('items', (data.items || []).filter((_, idx) => idx !== i))
  const addItem    = () => set('items', [...(data.items || []), { title_ar: '', desc_ar: '', badge: '', accent: '#e85d26' }])
  const ACCENT_PRESETS = ['#e85d26','#22c55e','#3b82f6','#f59e0b','#8b5cf6','#f87171']

  return (
    <>
      <Field label="عنوان القسم" value={data.heading_ar} onChange={v => set('heading_ar', v)} placeholder="عروض خاصة" />
      {(data.items || []).map((item, i) => (
        <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: C.surfaceHi, border: `1px solid ${C.border}`, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>عرض {i + 1}</span>
            <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>
          <Field label="العنوان" value={item.title_ar} onChange={v => setItem(i, 'title_ar', v)} placeholder="خصم 20%" />
          <Field label="الوصف" value={item.desc_ar} onChange={v => setItem(i, 'desc_ar', v)} placeholder="على جميع الطلبات هذا الأسبوع" />
          <Field label="شارة (badge)" value={item.badge} onChange={v => setItem(i, 'badge', v)} placeholder="20% OFF" />
          <div className="mb-[11px]">
            <label className="block text-[10px] tracking-[0.1em] uppercase text-white/40 font-semibold mb-[5px]">لون العرض</label>
            <div style={{ display: 'flex', gap: 7 }}>
              {ACCENT_PRESETS.map(c => (
                <button key={c} onClick={() => setItem(i, 'accent', c)} style={{
                  width: 22, height: 22, borderRadius: '50%', background: c,
                  border: `2px solid ${item.accent === c ? '#fff' : 'transparent'}`,
                  cursor: 'pointer', flexShrink: 0,
                }} />
              ))}
            </div>
          </div>
        </div>
      ))}
      <button onClick={addItem} style={{
        fontSize: 12, color: C.gold, background: 'none',
        border: `1px dashed ${C.goldBorder}`, borderRadius: 7,
        padding: '8px 0', width: '100%', cursor: 'pointer', fontWeight: 700,
      }}>
        + إضافة عرض
      </button>
    </>
  )
}

function TestimonialsEditor({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  const setItem = (i, k, v) => {
    const items = [...(data.items || [])]
    items[i] = { ...items[i], [k]: v }
    set('items', items)
  }
  return (
    <>
      <Field label="عنوان القسم" value={data.heading_ar} onChange={v => set('heading_ar', v)} placeholder="ماذا يقول عملاؤنا" />
      {(data.items || []).map((item, i) => (
        <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: C.surfaceHi, border: `1px solid ${C.border}`, marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 8 }}>تقييم {i + 1}</div>
          <Field label="النص" value={item.text_ar} onChange={v => setItem(i, 'text_ar', v)} multiline rows={2} placeholder="تجربة رائعة..." />
          <Field label="الاسم" value={item.author} onChange={v => setItem(i, 'author', v)} placeholder="أحمد محمد" />
          <div className="mb-[11px]">
            <label className="block text-[10px] tracking-[0.1em] uppercase text-white/40 font-semibold mb-[5px]">التقييم</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setItem(i, 'rating', n)} style={{
                  fontSize: 20, background: 'none', border: 'none', cursor: 'pointer',
                  color: n <= (item.rating ?? 5) ? '#f59e0b' : C.border, padding: 0,
                }}>★</button>
              ))}
            </div>
          </div>
        </div>
      ))}
      {(data.items || []).length < 6 && (
        <button onClick={() => set('items', [...(data.items || []), { text_ar: '', author: '', rating: 5 }])} style={{
          fontSize: 12, color: C.gold, background: 'none',
          border: `1px dashed ${C.goldBorder}`, borderRadius: 7,
          padding: '8px 0', width: '100%', cursor: 'pointer', fontWeight: 700,
        }}>
          + إضافة تقييم
        </button>
      )}
    </>
  )
}

function HoursEditor({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  const setRow = (i, k, v) => {
    const rows = [...(data.rows || [])]
    rows[i] = { ...rows[i], [k]: v }
    set('rows', rows)
  }
  return (
    <>
      <Field label="عنوان القسم" value={data.heading_ar} onChange={v => set('heading_ar', v)} placeholder="أوقات العمل" />
      {(data.rows || []).map((row, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <DSInput value={row.day_ar ?? ''} onChange={e => setRow(i, 'day_ar', e.target.value)} placeholder="الاثنين" className="mb-0 flex-1" />
          {!row.closed ? (
            <>
              <DSInput value={row.open_ar ?? ''} onChange={e => setRow(i, 'open_ar', e.target.value)} placeholder="09:00" className="mb-0" style={{ width: 72 }} />
              <span style={{ color: C.muted, fontSize: 11, flexShrink: 0 }}>—</span>
              <DSInput value={row.close_ar ?? ''} onChange={e => setRow(i, 'close_ar', e.target.value)} placeholder="22:00" className="mb-0" style={{ width: 72 }} />
            </>
          ) : (
            <span style={{ fontSize: 11, color: C.red, fontWeight: 600, flex: 1 }}>مغلق</span>
          )}
          <button onClick={() => setRow(i, 'closed', !row.closed)} style={{
            background: 'none', border: `1px solid ${row.closed ? C.red : C.border}`,
            borderRadius: 5, padding: '4px 8px', color: row.closed ? C.red : C.muted,
            fontSize: 10, cursor: 'pointer', flexShrink: 0,
          }}>
            {row.closed ? 'افتح' : 'أغلق'}
          </button>
          <button onClick={() => set('rows', (data.rows || []).filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✕</button>
        </div>
      ))}
      {(data.rows || []).length < 8 && (
        <button onClick={() => set('rows', [...(data.rows || []), { day_ar: '', open_ar: '', close_ar: '', closed: false }])} style={{
          fontSize: 12, color: C.gold, background: 'none',
          border: `1px dashed ${C.goldBorder}`, borderRadius: 7,
          padding: '8px 0', width: '100%', cursor: 'pointer', fontWeight: 700, marginTop: 4,
        }}>
          + يوم جديد
        </button>
      )}
    </>
  )
}

// ── Editors map ───────────────────────────────────────────────────────────────
const EDITORS = {
  hero:            HeroEditor,
  offers:          OffersEditor,
  story:           StoryEditor,
  featured_items:  FeaturedItemsEditor,
  categories_grid: CategoriesGridEditor,
  gallery:         GalleryEditor,
  testimonials:    TestimonialsEditor,
  hours:           HoursEditor,
  location:        LocationEditor,
  cta:             CtaEditor,
}

// ── Drag Handle ──────────────────────────────────────────────────────────────
function DragHandle({ onMouseDown }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 8, flexShrink: 0,
        position: 'relative',
        cursor: 'col-resize',
        zIndex: 5,
        background: 'transparent',
        transition: 'background 0.15s',
      }}
    >
      {/* Visual line — thin, expands on hover */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: '50%', transform: 'translateX(-50%)',
        width: hovered ? 3 : 1,
        background: hovered ? 'rgba(212,168,83,0.6)' : 'rgba(255,255,255,0.07)',
        borderRadius: 2,
        transition: 'width 0.15s, background 0.15s',
      }} />
      {/* Grip dots */}
      {hovered && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 3, height: 3, borderRadius: '50%',
              background: 'rgba(212,168,83,0.8)',
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Add Section Modal ─────────────────────────────────────────────────────────
function AddSectionModal({ onAdd, onClose }) {
  return (
    <motion.div
      key="add-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{ opacity: 0, scale: 0.95,    y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: C.surfaceHi, border: `1px solid ${C.borderHi}`,
          borderRadius: 14, padding: '20px 0', width: 320,
          boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          maxHeight: '70vh', overflowY: 'auto',
        }}
      >
        <div style={{ padding: '0 20px 12px', fontSize: 13, fontWeight: 700, color: C.text, borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
          إضافة قسم جديد
        </div>
        {SECTION_TYPES.map(t => (
          <button
            key={t.type}
            onClick={() => { onAdd(t.type); onClose() }}
            style={{
              width: '100%', padding: '10px 20px', background: 'transparent',
              border: 'none', cursor: 'pointer', textAlign: 'right',
              display: 'flex', alignItems: 'center', gap: 12,
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.labelAr}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{t.desc}</div>
            </div>
          </button>
        ))}
      </motion.div>
    </motion.div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CanvasPageEditor({ config, settings, color, onUpdate }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [sections,         setSections]         = useState([])
  const [activeTemplate,   setActiveTemplate]   = useState('normal')
  const [selectedSectionId, setSelectedSectionId] = useState(null)
  const [saving,           setSaving]           = useState(false)
  const [dirty,            setDirty]            = useState(false)
  const [showAddPanel,     setShowAddPanel]      = useState(false)
  const [hoveredId,        setHoveredId]        = useState(null)
  const [drawerOpen,       setDrawerOpen]       = useState(false)
  const [isMobile,         setIsMobile]         = useState(false)
  const [hoveredBlockId,   setHoveredBlockId]   = useState(null)
  const [toast,            setToast]            = useState(null)
  const [leftW,            setLeftW]            = useState(() => {
    const saved = localStorage.getItem('cpe_leftW')
    return saved ? Number(saved) : 220
  })
  const [rightW,           setRightW]           = useState(() => {
    const saved = localStorage.getItem('cpe_rightW')
    return saved ? Number(saved) : 300
  })
  const dragRef = useRef(null) // { side: 'left'|'right', startX, startW }

  // ── Mobile detection ────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Panel resize ─────────────────────────────────────────────────────────────
  const startDrag = useCallback((side, e) => {
    e.preventDefault()
    dragRef.current = {
      side,
      startX: e.clientX,
      startW: side === 'left' ? leftW : rightW,
    }
    const onMove = (ev) => {
      const { side: s, startX, startW } = dragRef.current
      const delta = s === 'left' ? ev.clientX - startX : startX - ev.clientX
      const next  = Math.min(Math.max(startW + delta, 160), 420)
      if (s === 'left') {
        setLeftW(next)
        localStorage.setItem('cpe_leftW', next)
      } else {
        setRightW(next)
        localStorage.setItem('cpe_rightW', next)
      }
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor    = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }, [leftW, rightW])

  // ── Load sections from API (same as PageBuilderTab) ──────────────────────────
  useEffect(() => {
    adminApi.get('/settings')
      .then(res => {
        const cfg     = res.data?.config ?? res.data ?? {}
        const content = cfg.content ?? {}
        if (Array.isArray(content.sections) && content.sections.length) {
          setSections(content.sections.map(s => ({
            ...s,
            id:   s.id ?? uid(),
            data: { ...(DEFAULT_DATA[s.type] ?? {}), ...(s.data ?? {}) },
          })))
        }
        if (content.template_key) setActiveTemplate(content.template_key)
      })
      .catch(err => console.error('[CanvasPageEditor] load failed:', err))
  }, [])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedSection = sections.find(s => s.id === selectedSectionId) ?? null

  // ── Section CRUD ─────────────────────────────────────────────────────────────
  const addSection = useCallback((type) => {
    const newSec = { id: uid(), type, order: sections.length, data: { ...DEFAULT_DATA[type] } }
    setSections(s => [...s, newSec])
    setDirty(true)
    setSelectedSectionId(newSec.id)
  }, [sections.length])

  const updateSection = useCallback((updated) => {
    setSections(s => s.map(sec => sec.id === updated.id ? updated : sec))
    setDirty(true)
  }, [])

  const deleteSection = useCallback((id) => {
    setSections(s => s.filter(sec => sec.id !== id))
    setSelectedSectionId(prev => prev === id ? null : prev)
    setDirty(true)
  }, [])

  const moveSection = useCallback((id, direction) => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === id)
      if (idx < 0) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
      return arr
    })
    setDirty(true)
  }, [])

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

  const applyTemplate = useCallback((tpl) => {
    const ok = sections.length === 0 || window.confirm(`سيتم استبدال الأقسام الحالية بقالب "${tpl.label}". هل تريد المتابعة؟`)
    if (!ok) return
    setSections(tpl.sections.map((type, i) => ({ id: uid(), type, order: i, data: { ...DEFAULT_DATA[type] } })))
    setActiveTemplate(tpl.key)
    setSelectedSectionId(null)
    setDirty(true)
  }, [sections.length])

  // ── Save — mirrors PageBuilderTab: PATCH /settings with full config ──────────
  const handleSave = async () => {
    setSaving(true)
    try {
      const storedCfg = settings ?? config ?? {}
      const content = {
        sections:     sections.map((s, i) => ({ ...s, order: i })),
        template_key: activeTemplate,
        page_type:    storedCfg?.content?.page_type || 'generic',
      }
      await adminApi.patch('/settings', { config: { ...storedCfg, content } })
      setDirty(false)
      showToast('تم الحفظ ✓')
      onUpdate?.()
    } catch (err) {
      console.error('[CanvasPageEditor] save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (!selectedSectionId) return
      if (e.key === 'Escape') setSelectedSectionId(null)
      if ((e.key === 'Delete' || e.key === 'Backspace') &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA') {
        deleteSection(selectedSectionId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedSectionId, deleteSection])

  // ── Render section editor in right panel ─────────────────────────────────────
  const renderSectionEditor = (section) => {
    if (!section) return null
    const Editor = EDITORS[section.type]
    if (!Editor) return <div style={{ color: C.muted, fontSize: 13 }}>لا يوجد محرر لهذا القسم</div>
    return (
      <Editor
        data={section.data}
        onChange={data => updateSection({ ...section, data })}
      />
    )
  }

  // ── LEFT PANEL ───────────────────────────────────────────────────────────────
  const leftPanel = (
    <div style={{
      width: isMobile ? '100%' : leftW,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      background: C.surface,
      borderRight: `1px solid ${C.border}`,
      overflowY: 'auto',
      ...(isMobile ? {
        position: 'fixed', left: drawerOpen ? 0 : -260, top: 0,
        height: '100vh', width: 260, zIndex: 50,
        transition: 'left 0.25s ease',
        boxShadow: drawerOpen ? '4px 0 32px rgba(0,0,0,0.6)' : 'none',
      } : {}),
    }}>
      {/* Panel header */}
      <div style={{
        padding: '14px 12px 10px',
        borderBottom: `1px solid ${C.border}`,
        fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: C.muted, fontWeight: 600, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>الأقسام ({sections.length})</span>
        {isMobile && (
          <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        )}
      </div>

      {/* Section list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {sections.length === 0 && (
          <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            لا توجد أقسام بعد.
            <br />أضف قسماً من الزر أدناه.
          </div>
        )}
        {sections.map(section => {
          const meta = SECTION_TYPES.find(t => t.type === section.type)
          const isSelected = selectedSectionId === section.id
          const isHovered  = hoveredId === section.id

          return (
            <div
              key={section.id}
              onClick={() => { setSelectedSectionId(section.id); isMobile && setDrawerOpen(false) }}
              onMouseEnter={() => setHoveredId(section.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                padding: '9px 10px',
                background: isSelected ? C.goldDim : isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                border: `1px solid ${isSelected ? C.goldBorder : 'transparent'}`,
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 3,
                position: 'relative',
                transition: 'background 0.12s, border-color 0.12s',
              }}
            >
              <span style={{ fontSize: 15 }}>{meta?.icon}</span>
              <span style={{ fontSize: 12, color: isSelected ? C.gold : C.text, flex: 1, fontWeight: isSelected ? 600 : 400 }}>
                {meta?.labelAr}
              </span>
              {/* Delete on hover */}
              {(isHovered || isSelected) && (
                <button
                  onClick={e => { e.stopPropagation(); deleteSection(section.id) }}
                  style={{
                    background: 'none', border: 'none',
                    color: C.red, cursor: 'pointer',
                    fontSize: 12, padding: '0 2px', lineHeight: 1,
                    flexShrink: 0,
                  }}
                >✕</button>
              )}
            </div>
          )
        })}

        {/* Add section button */}
        <button
          onClick={() => setShowAddPanel(true)}
          style={{
            width: '100%', marginTop: 8,
            padding: '9px 0', borderRadius: 8,
            background: 'transparent',
            border: `1px dashed ${C.goldBorder}`,
            color: C.gold, fontSize: 12, fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.goldDim}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          + إضافة قسم
        </button>
      </div>

      {/* Template picker */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        padding: '10px 8px 12px',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, fontWeight: 600, marginBottom: 8, paddingRight: 2 }}>
          القوالب
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {TEMPLATE_OPTIONS.map(t => {
            const active = activeTemplate === t.key
            return (
              <button
                key={t.key}
                onClick={() => applyTemplate(t)}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 7,
                  border: `1px solid ${active ? t.color : C.border}`,
                  background: active ? `${t.color}14` : 'transparent',
                  cursor: 'pointer', textAlign: 'right',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = t.color + '60' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = C.border }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: active ? t.color : C.text, fontWeight: active ? 700 : 400, flex: 1 }}>
                  {t.label}
                </span>
                {active && <span style={{ fontSize: 10, color: t.color }}>✓</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  // ── Type accent colors ────────────────────────────────────────────────────────
  const TYPE_COLORS = {
    hero:            C.gold,
    offers:          '#e85d26',
    story:           '#3b82f6',
    featured_items:  '#f59e0b',
    categories_grid: '#8b5cf6',
    gallery:         '#a855f7',
    testimonials:    '#22c55e',
    hours:           '#06b6d4',
    location:        '#84cc16',
    cta:             '#f43f5e',
  }

  // ── CENTER CANVAS ────────────────────────────────────────────────────────────
  const centerCanvas = (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: 24,
      background: '#0d0d14',
      minWidth: 0,
    }}>
      {sections.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: 320, color: C.muted, gap: 14,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          borderRadius: 12,
          border: `1px dashed ${C.border}`,
        }}>
          <div style={{ fontSize: 36 }}>🧩</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>ابدأ بإضافة قسم</div>
          <div style={{ fontSize: 12 }}>اختر قسماً يدوياً أو طبّق قالباً جاهزاً</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={() => setShowAddPanel(true)}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: C.goldDim, border: `1px solid ${C.goldBorder}`,
                color: C.gold, cursor: 'pointer',
              }}
            >
              + إضافة قسم
            </button>
            <button
              onClick={() => applyTemplate(TEMPLATE_OPTIONS[0])}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: 'transparent', border: `1px solid ${C.border}`,
                color: C.muted, cursor: 'pointer',
              }}
            >
              اختيار قالب
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {sections.map((section, index) => {
          const meta       = SECTION_TYPES.find(t => t.type === section.type)
          const isSelected = selectedSectionId === section.id
          const isHovered  = hoveredBlockId === section.id
          const typeColor  = TYPE_COLORS[section.type] || C.gold

          return (
            <motion.div
              key={section.id}
              layout="position"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.5 }}
              onClick={() => setSelectedSectionId(section.id)}
              onMouseEnter={() => setHoveredBlockId(section.id)}
              onMouseLeave={() => setHoveredBlockId(null)}
              style={{
                borderRadius: 10,
                border: `2px solid ${isSelected ? typeColor : isHovered ? C.borderHi : C.border}`,
                boxShadow: isSelected ? `0 0 22px ${typeColor}22` : 'none',
                marginBottom: 12,
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                minHeight: 120,
              }}
            >
              {/* Header bar with type accent */}
              <div style={{
                padding: '10px 14px',
                background: isSelected ? `${typeColor}14` : C.surfaceHi,
                display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: `1px solid ${C.border}`,
                borderRight: `3px solid ${typeColor}`,
              }}>
                <span style={{ fontSize: 18 }}>{meta?.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? typeColor : C.text, flex: 1 }}>
                  {meta?.labelAr}
                </span>
                <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace', direction: 'ltr' }}>
                  {section.type}
                </span>
              </div>

              {/* Content preview */}
              <div style={{ padding: '12px 14px', background: C.surface }}>
                {section.data?.title_ar && (
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 600, marginBottom: 4 }}>
                    {section.data.title_ar}
                  </div>
                )}
                {section.data?.heading_ar && (
                  <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>
                    {section.data.heading_ar}
                  </div>
                )}
                {section.data?.subtitle_ar && (
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {section.data.subtitle_ar.slice(0, 80)}{section.data.subtitle_ar.length > 80 ? '…' : ''}
                  </div>
                )}
                {section.data?.body_ar && !section.data?.heading_ar && (
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {section.data.body_ar.slice(0, 80)}{section.data.body_ar.length > 80 ? '…' : ''}
                  </div>
                )}
                {section.data?.bg_image_url && (
                  <img
                    src={section.data.bg_image_url}
                    alt=""
                    style={{ height: 40, width: '100%', objectFit: 'cover', borderRadius: 4, marginTop: 6 }}
                  />
                )}
                {section.type === 'gallery' && (section.data?.images || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {section.data.images.slice(0, 4).map((img, i) => (
                      <img key={i} src={img.url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }} />
                    ))}
                    {section.data.images.length > 4 && (
                      <div style={{ width: 36, height: 36, borderRadius: 4, background: C.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.muted }}>
                        +{section.data.images.length - 4}
                      </div>
                    )}
                  </div>
                )}
                {section.type === 'offers' && (section.data?.items || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                    {section.data.items.slice(0, 3).map((item, i) => (
                      <span key={i} style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 4,
                        background: `${item.accent || '#e85d26'}20`,
                        border: `1px solid ${item.accent || '#e85d26'}40`,
                        color: item.accent || '#e85d26',
                      }}>
                        {item.badge || item.title_ar || 'عرض'}
                      </span>
                    ))}
                  </div>
                )}
                {section.type === 'hours' && (section.data?.rows || []).length > 0 && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    {section.data.rows.length} أيام مضافة
                  </div>
                )}
                {section.type === 'testimonials' && (section.data?.items || []).length > 0 && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    {section.data.items.filter(t => t.author || t.text_ar).length} تقييمات
                  </div>
                )}
                {!section.data?.title_ar && !section.data?.heading_ar && !section.data?.bg_image_url &&
                 section.type !== 'gallery' && section.type !== 'offers' &&
                 section.type !== 'hours' && section.type !== 'testimonials' && (
                  <div style={{ fontSize: 12, color: C.muted }}>انقر للتعديل من اللوحة اليمنى</div>
                )}
              </div>

              {/* Hover overlay — move up/down/delete */}
              {isHovered && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: 8, left: 8,
                    display: 'flex', flexDirection: 'column', gap: 4,
                    zIndex: 5,
                  }}
                >
                  <button
                    onClick={e => { e.stopPropagation(); moveSection(section.id, 'up') }}
                    disabled={index === 0}
                    title="تحريك لأعلى"
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: 'rgba(0,0,0,0.75)',
                      border: `1px solid ${C.border}`,
                      color: index === 0 ? C.muted + '60' : C.text,
                      cursor: index === 0 ? 'default' : 'pointer',
                      fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'opacity 0.15s',
                    }}
                  >↑</button>
                  <button
                    onClick={e => { e.stopPropagation(); moveSection(section.id, 'down') }}
                    disabled={index === sections.length - 1}
                    title="تحريك لأسفل"
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: 'rgba(0,0,0,0.75)',
                      border: `1px solid ${C.border}`,
                      color: index === sections.length - 1 ? C.muted + '60' : C.text,
                      cursor: index === sections.length - 1 ? 'default' : 'pointer',
                      fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'opacity 0.15s',
                    }}
                  >↓</button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteSection(section.id) }}
                    title="حذف القسم"
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: 'rgba(0,0,0,0.75)',
                      border: `1px solid ${C.red}50`,
                      color: C.red,
                      cursor: 'pointer',
                      fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'opacity 0.15s',
                    }}
                  >🗑</button>
                </div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )

  // ── RIGHT PANEL ──────────────────────────────────────────────────────────────
  const rightPanel = (
    <div style={{
      width: isMobile ? '100%' : rightW,
      flexShrink: 0,
      borderLeft: `1px solid ${C.border}`,
      background: C.surface,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      ...(isMobile ? {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        maxHeight: selectedSectionId !== null ? '60vh' : 0,
        height: selectedSectionId !== null ? '60vh' : 0,
        zIndex: 40, borderLeft: 'none',
        borderTop: `1px solid ${C.border}`,
        transition: 'max-height 0.25s ease, height 0.25s ease',
        boxShadow: selectedSectionId !== null ? '0 -8px 32px rgba(0,0,0,0.5)' : 'none',
      } : {}),
    }}>
      <AnimatePresence mode="wait">
        {selectedSectionId === null ? (
          <motion.div
            key="settings-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.5 }}
            style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            {/* Right panel header — no selection */}
            <div style={{
              padding: '13px 16px',
              borderBottom: `1px solid ${C.border}`,
              fontSize: 11, color: C.muted, fontWeight: 600,
              letterSpacing: '0.08em', flexShrink: 0,
            }}>
              الإعدادات العامة
            </div>
            <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
              <SettingsTab
                settings={settings ?? config}
                onUpdated={() => onUpdate?.()}
                color={color ?? config?.primary_color ?? '#6366f1'}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={selectedSectionId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.5 }}
            style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            {/* Right panel header — section selected */}
            <div style={{
              padding: '10px 14px',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', gap: 8,
              flexShrink: 0,
            }}>
              <button
                onClick={() => setSelectedSectionId(null)}
                style={{
                  background: 'none', border: 'none',
                  color: C.muted, cursor: 'pointer',
                  fontSize: 17, lineHeight: 1, padding: '0 2px',
                }}
                title="العودة للإعدادات"
              >
                ←
              </button>
              <span style={{ fontSize: 16 }}>
                {SECTION_TYPES.find(t => t.type === selectedSection?.type)?.icon}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1 }}>
                {SECTION_TYPES.find(t => t.type === selectedSection?.type)?.labelAr}
              </span>
              <button
                onClick={() => deleteSection(selectedSection?.id)}
                title="حذف القسم"
                style={{
                  background: 'none', border: 'none',
                  color: C.red, cursor: 'pointer',
                  fontSize: 13, padding: '2px 6px',
                }}
              >
                ✕
              </button>
            </div>
            {/* Editor body */}
            <div style={{ padding: 16, direction: 'rtl', flex: 1, overflowY: 'auto' }}>
              {renderSectionEditor(selectedSection)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  // ── Mobile overlay (closes drawer) ───────────────────────────────────────────
  const mobileOverlay = isMobile && drawerOpen && (
    <div
      onClick={() => setDrawerOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 45,
        background: 'rgba(0,0,0,0.4)',
      }}
    />
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        direction: 'rtl',
        background: C.bg,
      }}
    >
      {/* ── TOOLBAR ──────────────────────────────────────────────────────── */}
      <div style={{
        height: 52,
        padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
        flexShrink: 0,
        position: 'relative', zIndex: 10,
      }}>
        {/* Left: drawer toggle (mobile) + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isMobile && (
            <button
              onClick={() => setDrawerOpen(o => !o)}
              style={{
                background: 'none', border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '5px 9px',
                color: C.text, cursor: 'pointer', fontSize: 14,
              }}
            >
              ☰
            </button>
          )}
          <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>محرر الصفحة</span>
          {sections.length > 0 && (
            <span style={{ fontSize: 11, color: C.muted }}>· {sections.length} قسم</span>
          )}
        </div>

        {/* Right: save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: dirty ? C.gold : C.surfaceHi,
            color: dirty ? '#000' : C.muted,
            border: `1px solid ${dirty ? C.gold : C.border}`,
            borderRadius: 8,
            padding: '7px 18px',
            fontSize: 12, fontWeight: 700,
            cursor: saving ? 'wait' : 'pointer',
            transition: 'background 0.18s, color 0.18s, border-color 0.18s',
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          {saving ? '⏳ جارٍ الحفظ...' : dirty ? '💾 حفظ*' : '💾 حفظ'}
        </button>
      </div>

      {/* ── 3-PANEL BODY ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {leftPanel}
        {!isMobile && <DragHandle side="left"  onMouseDown={e => startDrag('left',  e)} />}
        {centerCanvas}
        {!isMobile && <DragHandle side="right" onMouseDown={e => startDrag('right', e)} />}
        {rightPanel}
        {mobileOverlay}
      </div>

      {/* ── ADD SECTION MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddPanel && (
          <AddSectionModal
            onAdd={addSection}
            onClose={() => setShowAddPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* ── TOAST ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              position: 'fixed', bottom: 28, right: 28,
              background: C.green, color: '#0a1a10',
              padding: '10px 20px', borderRadius: 8,
              fontWeight: 700, fontSize: 13,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              zIndex: 2000, pointerEvents: 'none',
              fontFamily: "'Cairo', sans-serif",
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
