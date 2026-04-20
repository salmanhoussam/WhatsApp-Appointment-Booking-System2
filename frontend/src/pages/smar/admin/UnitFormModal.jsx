import { useState, useEffect, useRef } from 'react';
import adminApi from '../../../utils/admin.config';

// ── Shared palette ────────────────────────────────────────────────────────────
const C = {
  bg:       '#0a0a0f',
  surface:  '#12121a',
  surface2: '#1a1a28',
  border:   'rgba(255,255,255,0.08)',
  borderHi: 'rgba(255,255,255,0.15)',
  gold:     '#d4a853',
  goldDim:  'rgba(212,168,83,0.10)',
  goldBorder:'rgba(212,168,83,0.35)',
  text:     '#f0f0f5',
  muted:    '#6b6b80',
  red:      '#f87171',
  redDim:   'rgba(248,113,113,0.12)',
  green:    '#34d399',
  greenDim: 'rgba(52,211,153,0.10)',
  blue:     '#60a5fa',
  blueDim:  'rgba(96,165,250,0.10)',
  purple:   '#a78bfa',
  purpleDim:'rgba(167,139,250,0.10)',
};

const inputCls = [
  'w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[#4a4a5a]',
  'bg-black/40 border border-white/10',
  'focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853]',
  'transition-all',
].join(' ');

const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-[#6b6b80] mb-2';

// ── Tiny icon components ──────────────────────────────────────────────────────
function TrashIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function PlusIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ArrowUpIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ArrowDownIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      border: `2px solid rgba(212,168,83,0.25)`,
      borderTopColor: C.gold,
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}

// ── Category options ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'chalet',     label: 'شاليه',   emoji: '🏠' },
  { value: 'villa',      label: 'فيلا',    emoji: '🏡' },
  { value: 'studio',     label: 'ستوديو',  emoji: '🏢' },
  { value: 'restaurant', label: 'مطعم',    emoji: '🍽️' },
  { value: 'pool',       label: 'مسبح',    emoji: '🏊' },
];

// ── Block type definitions ────────────────────────────────────────────────────
const BLOCK_TYPES = [
  {
    type: 'section_title',
    label: 'عنوان رئيسي',
    emoji: '📌',
    color: C.gold,
    colorDim: C.goldDim,
  },
  {
    type: 'highlight_item',
    label: 'ميزة بارزة',
    emoji: '✨',
    color: C.green,
    colorDim: C.greenDim,
  },
  {
    type: 'paragraph',
    label: 'نص وصفي',
    emoji: '📝',
    color: C.blue,
    colorDim: C.blueDim,
  },
];

// ── Amenity icon suggestions ──────────────────────────────────────────────────
const AMENITY_ICONS = [
  'wifi', 'pool', 'mountain', 'car', 'flame', 'snowflake', 'tv', 'utensils',
  'bath', 'bed-double', 'tree-pine', 'sun', 'moon', 'coffee', 'music', 'shield',
  'sparkles', 'star', 'heart', 'baby', 'wind', 'dumbbell', 'parking-circle',
];

// ── Tiny reusable styled button ───────────────────────────────────────────────
function SmallBtn({ onClick, color = C.muted, bg = 'transparent', children, title, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`,
        background: bg, color, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
        fontWeight: 600, transition: 'all 0.15s', opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ──────────────────── CONTENT BLOCK EDITOR (Tab 3) ────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function ContentBlockEditor({ blocks, onChange }) {
  const addBlock = (type) => {
    const newBlock = type === 'section_title'
      ? { type, content: '', style: { size: 'large', color: 'gold', bold: true } }
      : type === 'highlight_item'
      ? { type, icon: 'sparkles', title: '', content: '' }
      : { type, content: '', style: { size: 'normal', color: 'gray' } };
    onChange([...blocks, newBlock]);
  };

  const updateBlock = (index, updates) => {
    const updated = blocks.map((b, i) => i === index ? { ...b, ...updates } : b);
    onChange(updated);
  };

  const removeBlock = (index) => onChange(blocks.filter((_, i) => i !== index));

  const moveBlock = (index, dir) => {
    const arr = [...blocks];
    const swap = index + dir;
    if (swap < 0 || swap >= arr.length) return;
    [arr[index], arr[swap]] = [arr[swap], arr[index]];
    onChange(arr);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Add buttons */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap',
        padding: '14px 16px', borderRadius: 12,
        background: 'rgba(255,255,255,0.02)', border: `1px dashed ${C.border}`,
      }}>
        <span style={{ color: C.muted, fontSize: 11, fontWeight: 700, width: '100%',
          marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          إضافة عنصر جديد
        </span>
        {BLOCK_TYPES.map(bt => (
          <button
            key={bt.type}
            type="button"
            onClick={() => addBlock(bt.type)}
            style={{
              padding: '8px 14px', borderRadius: 8,
              border: `1px solid ${bt.color}30`,
              background: bt.colorDim,
              color: bt.color,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
          >
            <span>{bt.emoji}</span> {bt.label}
          </button>
        ))}
      </div>

      {/* Blocks list */}
      {blocks.length === 0 && (
        <div style={{
          padding: '32px 20px', textAlign: 'center', borderRadius: 12,
          background: 'rgba(255,255,255,0.015)', border: `1px solid ${C.border}`,
        }}>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
            لم تُضف أي عناصر بعد — ابدأ بإضافة عنوان أو ميزة
          </p>
        </div>
      )}

      {blocks.map((block, idx) => {
        const bt = BLOCK_TYPES.find(b => b.type === block.type) || BLOCK_TYPES[2];
        return (
          <div
            key={idx}
            style={{
              borderRadius: 12, overflow: 'hidden',
              border: `1px solid ${bt.color}22`,
              background: C.surface2,
            }}
          >
            {/* Block header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              background: bt.colorDim,
              borderBottom: `1px solid ${bt.color}22`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{bt.emoji}</span>
                <span style={{ color: bt.color, fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {bt.label} #{idx + 1}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <SmallBtn onClick={() => moveBlock(idx, -1)} disabled={idx === 0} title="تحريك لأعلى">
                  <ArrowUpIcon />
                </SmallBtn>
                <SmallBtn onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1} title="تحريك لأسفل">
                  <ArrowDownIcon />
                </SmallBtn>
                <SmallBtn onClick={() => removeBlock(idx)} color={C.red} title="حذف">
                  <TrashIcon size={12} />
                </SmallBtn>
              </div>
            </div>

            {/* Block body */}
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* === section_title === */}
              {block.type === 'section_title' && (<>
                <div>
                  <label className={labelCls}>نص العنوان</label>
                  <input
                    className={inputCls}
                    value={block.content || ''}
                    onChange={e => updateBlock(idx, { content: e.target.value })}
                    placeholder="مثال: Connection, Nature & Serenity 🌿"
                    dir="auto"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className={labelCls}>اللون</label>
                    <select
                      className={inputCls}
                      value={block.style?.color || 'gold'}
                      onChange={e => updateBlock(idx, {
                        style: { ...block.style, color: e.target.value }
                      })}
                    >
                      <option value="gold">ذهبي ✨</option>
                      <option value="white">أبيض ⚪</option>
                      <option value="gray">رمادي</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>الحجم</label>
                    <select
                      className={inputCls}
                      value={block.style?.size || 'large'}
                      onChange={e => updateBlock(idx, {
                        style: { ...block.style, size: e.target.value }
                      })}
                    >
                      <option value="large">كبير</option>
                      <option value="medium">متوسط</option>
                      <option value="small">صغير</option>
                    </select>
                  </div>
                </div>
              </>)}

              {/* === highlight_item === */}
              {block.type === 'highlight_item' && (<>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                  <div>
                    <label className={labelCls}>الأيقونة</label>
                    <select
                      className={inputCls}
                      value={block.icon || 'sparkles'}
                      onChange={e => updateBlock(idx, { icon: e.target.value })}
                    >
                      {AMENITY_ICONS.map(ic => (
                        <option key={ic} value={ic}>{ic}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>العنوان</label>
                    <input
                      className={inputCls}
                      value={block.title || ''}
                      onChange={e => updateBlock(idx, { title: e.target.value })}
                      placeholder="مثال: Luxurious Accommodation"
                      dir="auto"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>الوصف</label>
                  <textarea
                    className={inputCls}
                    value={block.content || ''}
                    onChange={e => updateBlock(idx, { content: e.target.value })}
                    rows={2}
                    placeholder="مثال: King-size beds with fine linens..."
                    dir="auto"
                    style={{ resize: 'vertical', minHeight: 60 }}
                  />
                </div>
              </>)}

              {/* === paragraph === */}
              {block.type === 'paragraph' && (<>
                <div>
                  <label className={labelCls}>المحتوى</label>
                  <textarea
                    className={inputCls}
                    value={block.content || ''}
                    onChange={e => updateBlock(idx, { content: e.target.value })}
                    rows={3}
                    placeholder="اكتب نص وصفي هنا..."
                    dir="auto"
                    style={{ resize: 'vertical', minHeight: 80 }}
                  />
                </div>
                <div>
                  <label className={labelCls}>لون النص</label>
                  <select
                    className={inputCls}
                    value={block.style?.color || 'gray'}
                    onChange={e => updateBlock(idx, {
                      style: { ...block.style, color: e.target.value }
                    })}
                  >
                    <option value="gray">رمادي (افتراضي)</option>
                    <option value="white">أبيض</option>
                    <option value="gold">ذهبي</option>
                  </select>
                </div>
              </>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ───────────── AMENITIES & RULES MANAGER (Tab 4) ──────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function AmenitiesEditor({ amenities, onChange }) {
  const addRow = () => onChange([...amenities, { icon: 'sparkles', label: '', label_ar: '' }]);
  const updateRow = (idx, updates) =>
    onChange(amenities.map((a, i) => i === idx ? { ...a, ...updates } : a));
  const removeRow = (idx) => onChange(amenities.filter((_, i) => i !== idx));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: C.muted, fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          المرافق ({amenities.length})
        </span>
        <button
          type="button"
          onClick={addRow}
          style={{
            padding: '6px 14px', borderRadius: 8,
            background: C.greenDim, border: `1px solid ${C.green}30`,
            color: C.green, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <PlusIcon size={12} /> إضافة مرفق
        </button>
      </div>

      {amenities.length === 0 && (
        <div style={{
          padding: '24px 16px', textAlign: 'center', borderRadius: 10,
          background: 'rgba(255,255,255,0.015)', border: `1px solid ${C.border}`,
        }}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
            لا توجد مرافق — أضف واي فاي، مسبح، إطلالة...
          </p>
        </div>
      )}

      {amenities.map((am, idx) => (
        <div
          key={idx}
          style={{
            display: 'grid', gridTemplateColumns: '100px 1fr 1fr 36px',
            gap: 8, alignItems: 'end',
            padding: '10px 12px', borderRadius: 10,
            background: C.surface2, border: `1px solid ${C.border}`,
          }}
        >
          <div>
            <label style={{ color: C.muted, fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>
              أيقونة
            </label>
            <select
              className={inputCls}
              value={am.icon || 'sparkles'}
              onChange={e => updateRow(idx, { icon: e.target.value })}
              style={{ padding: '8px 6px', fontSize: 11 }}
            >
              {AMENITY_ICONS.map(ic => (
                <option key={ic} value={ic}>{ic}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: C.muted, fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>
              English
            </label>
            <input
              className={inputCls}
              value={am.label || ''}
              onChange={e => updateRow(idx, { label: e.target.value })}
              placeholder="Free WiFi"
              style={{ padding: '8px 10px', fontSize: 12 }}
            />
          </div>
          <div>
            <label style={{ color: C.muted, fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>
              عربي
            </label>
            <input
              className={inputCls}
              value={am.label_ar || ''}
              onChange={e => updateRow(idx, { label_ar: e.target.value })}
              placeholder="واي فاي مجاني"
              dir="rtl"
              style={{ padding: '8px 10px', fontSize: 12 }}
            />
          </div>
          <button
            type="button"
            onClick={() => removeRow(idx)}
            title="حذف"
            style={{
              padding: 8, borderRadius: 8, border: `1px solid ${C.border}`,
              background: 'transparent', color: C.red, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <TrashIcon size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}


function RulesPoliciesEditor({ rules, onChange }) {
  const updateField = (field, value) => onChange({ ...rules, [field]: value });

  const addRule = () => {
    const current = rules.rules || [];
    updateField('rules', [...current, '']);
  };

  const updateRule = (idx, value) => {
    const updated = (rules.rules || []).map((r, i) => i === idx ? value : r);
    updateField('rules', updated);
  };

  const removeRule = (idx) => {
    updateField('rules', (rules.rules || []).filter((_, i) => i !== idx));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Check-in / Check-out */}
      <div>
        <span style={{ color: C.muted, fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 10 }}>
          أوقات الدخول والخروج
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className={labelCls}>وقت الدخول (Check-in)</label>
            <input
              type="time"
              className={inputCls}
              value={rules.checkIn || '15:00'}
              onChange={e => updateField('checkIn', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>وقت الخروج (Check-out)</label>
            <input
              type="time"
              className={inputCls}
              value={rules.checkOut || '12:00'}
              onChange={e => updateField('checkOut', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Cancellation policy */}
      <div>
        <label className={labelCls}>سياسة الإلغاء</label>
        <textarea
          className={inputCls}
          value={rules.cancellation || ''}
          onChange={e => updateField('cancellation', e.target.value)}
          rows={2}
          placeholder="مثال: استرداد 50% عند الإلغاء قبل 48 ساعة من تاريخ الدخول"
          dir="auto"
          style={{ resize: 'vertical', minHeight: 60 }}
        />
      </div>

      {/* Dynamic rules list */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ color: C.muted, fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            القواعد ({(rules.rules || []).length})
          </span>
          <button
            type="button"
            onClick={addRule}
            style={{
              padding: '6px 14px', borderRadius: 8,
              background: C.purpleDim, border: `1px solid ${C.purple}30`,
              color: C.purple, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <PlusIcon size={12} /> إضافة قاعدة
          </button>
        </div>

        {(rules.rules || []).length === 0 && (
          <div style={{
            padding: '20px 16px', textAlign: 'center', borderRadius: 10,
            background: 'rgba(255,255,255,0.015)', border: `1px solid ${C.border}`,
          }}>
            <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
              لا توجد قواعد — أضف مثل "ممنوع التدخين" أو "أوقات الهدوء"
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(rules.rules || []).map((rule, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                color: C.purple, fontSize: 11, fontWeight: 800,
                width: 20, textAlign: 'center', flexShrink: 0,
              }}>
                {idx + 1}
              </span>
              <input
                className={inputCls}
                value={rule}
                onChange={e => updateRule(idx, e.target.value)}
                placeholder="مثال: ممنوع التدخين داخل الوحدة"
                dir="auto"
                style={{ padding: '8px 12px', fontSize: 12, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => removeRule(idx)}
                title="حذف"
                style={{
                  padding: 7, borderRadius: 6, border: `1px solid ${C.border}`,
                  background: 'transparent', color: C.red, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <TrashIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ──────────────────────── MAIN MODAL ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function UnitFormModal({ isOpen, onClose, unit, onSave, onImagesChange }) {
  const [activeTab, setActiveTab] = useState('details');

  // ── Details form state ────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name_ar: '', name_en: '', category: 'chalet',
    capacity: 2, bedrooms: 1, bathrooms: 1, price: '', price_label: '',
    description_ar: '', description_en: '',
  });

  // ── Dynamic content state ─────────────────────────────────────────────────
  const [contentBlocks, setContentBlocks] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [rulesPolicies, setRulesPolicies] = useState({
    checkIn: '15:00', checkOut: '12:00', cancellation: '', rules: [],
  });

  // ── Images state ──────────────────────────────────────────────────────────
  const [images,      setImages]      = useState([]);
  const [uploading,   setUploading]   = useState(false);
  const [deleting,    setDeleting]    = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [isDragging,  setIsDragging]  = useState(false);
  const fileInputRef = useRef(null);

  // ── Save status ───────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  // ── Hydrate on open ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('details');
    setUploadError('');
    setSaving(false);

    if (unit) {
      setForm({
        name_ar:        unit.name_ar  || unit.name || '',
        name_en:        unit.name_en  || '',
        category:       unit.category || unit.unit_type || 'chalet',
        capacity:       unit.capacity || 2,
        bedrooms:       unit.bedrooms  ?? 1,
        bathrooms:      unit.bathrooms ?? 1,
        price:          unit.price != null ? String(unit.price) : '',
        price_label:    unit.price_label || '',
        description_ar: unit.description_ar || '',
        description_en: unit.description_en || '',
      });
      setImages(Array.isArray(unit.images) ? unit.images : []);
      setContentBlocks(Array.isArray(unit.content_blocks) ? unit.content_blocks : []);
      setAmenities(Array.isArray(unit.amenities) ? unit.amenities : []);
      setRulesPolicies(
        unit.rules_policies && typeof unit.rules_policies === 'object'
          ? { checkIn: '15:00', checkOut: '12:00', cancellation: '', rules: [], ...unit.rules_policies }
          : { checkIn: '15:00', checkOut: '12:00', cancellation: '', rules: [] }
      );
    } else {
      setForm({ name_ar: '', name_en: '', category: 'chalet',
        capacity: 2, bedrooms: 1, bathrooms: 1, price: '', price_label: '',
        description_ar: '', description_en: '' });
      setImages([]);
      setContentBlocks([]);
      setAmenities([]);
      setRulesPolicies({ checkIn: '15:00', checkOut: '12:00', cancellation: '', rules: [] });
    }
  }, [unit, isOpen]);

  if (!isOpen) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);

    const payload = {
      name_ar:        form.name_ar,
      name_en:        form.name_en || null,
      category:       form.category,
      unit_type:      form.category,  // Keep unit_type synced with category
      capacity:       Number(form.capacity),
      bedrooms:       form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms:      form.bathrooms ? Number(form.bathrooms) : null,
      price:          form.price !== '' ? parseFloat(form.price) : null,
      price_label:    form.price_label || null,
      description_ar: form.description_ar || null,
      description_en: form.description_en || null,
      // ── Block Builder JSON ──────────────────────────────────────────────
      content_blocks: contentBlocks.length > 0 ? contentBlocks : null,
      amenities:      amenities.length > 0 ? amenities : null,
      rules_policies: (rulesPolicies.checkIn || rulesPolicies.checkOut ||
                       rulesPolicies.cancellation || (rulesPolicies.rules || []).length > 0)
                      ? rulesPolicies : null,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file || !unit?.id) return;
    setUploadError('');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await adminApi.post(`/units/${unit.id}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImages(data.images || []);
      onImagesChange?.(data.images || []);
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'فشل رفع الصورة — حاول مجدداً');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (url) => {
    if (!unit?.id) return;
    setDeleting(url);
    try {
      const { data } = await adminApi.delete(`/units/${unit.id}/images`, { data: { url } });
      setImages(data.images || []);
      onImagesChange?.(data.images || []);
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'فشل حذف الصورة');
    } finally {
      setDeleting(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  // ── Tab definitions ───────────────────────────────────────────────────────
  const TABS = [
    { key: 'details',  label: 'الأساسيات', emoji: '📋' },
    ...(unit?.id ? [{ key: 'images', label: 'الصور', emoji: '🖼️' }] : []),
    { key: 'content',  label: 'المحتوى',  emoji: '🧱' },
    { key: 'rules',    label: 'المرافق والقواعد', emoji: '⚙️' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        }}
      />

      {/* Modal card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
          pointerEvents: 'none',
        }}
      >
        <div style={{
          width: '100%', maxWidth: 640,
          maxHeight: '92vh',
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          pointerEvents: 'all',
        }}>

          {/* ── Header ── */}
          <div style={{
            padding: '22px 24px 0',
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0, direction: 'rtl' }}>
                {unit ? '✏️ تعديل الوحدة' : '➕ إضافة وحدة جديدة'}
              </h2>
              <button
                onClick={onClose}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`,
                  background: 'transparent', color: C.muted, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                }}
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex', gap: 2,
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    padding: '8px 14px', borderRadius: '8px 8px 0 0',
                    border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background:   activeTab === t.key ? C.bg         : 'transparent',
                    color:        activeTab === t.key ? C.gold       : C.muted,
                    borderBottom: activeTab === t.key ? `2px solid ${C.gold}` : '2px solid transparent',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>

            {/* ═══════════════ TAB 1: BASIC INFO ═══════════════ */}
            {activeTab === 'details' && (
              <form id="unit-details-form" onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Name fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className={labelCls}>اسم الوحدة (عربي) *</label>
                    <input
                      className={inputCls}
                      value={form.name_ar}
                      onChange={e => setField('name_ar', e.target.value)}
                      placeholder="شاليه الصنوبر"
                      dir="rtl"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Name (English)</label>
                    <input
                      className={inputCls}
                      value={form.name_en}
                      onChange={e => setField('name_en', e.target.value)}
                      placeholder="Pine Chalet"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className={labelCls}>الفئة / التصنيف</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setField('category', cat.value)}
                        style={{
                          padding: '8px 16px', borderRadius: 10,
                          border: `1.5px solid ${form.category === cat.value ? C.gold : C.border}`,
                          background: form.category === cat.value ? C.goldDim : 'transparent',
                          color: form.category === cat.value ? C.gold : C.muted,
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <span>{cat.emoji}</span> {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Capacity / Bedrooms / Bathrooms */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label className={labelCls}>السعة *</label>
                    <input type="number" min={1} className={inputCls}
                      value={form.capacity}
                      onChange={e => setField('capacity', e.target.value)}
                      style={{ textAlign: 'center' }} />
                  </div>
                  <div>
                    <label className={labelCls}>غرف النوم</label>
                    <input type="number" min={0} className={inputCls}
                      value={form.bedrooms}
                      onChange={e => setField('bedrooms', e.target.value)}
                      style={{ textAlign: 'center' }} />
                  </div>
                  <div>
                    <label className={labelCls}>الحمامات</label>
                    <input type="number" min={0} className={inputCls}
                      value={form.bathrooms}
                      onChange={e => setField('bathrooms', e.target.value)}
                      style={{ textAlign: 'center' }} />
                  </div>
                </div>

                {/* Price */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className={labelCls}>السعر الليلي (USD)</label>
                    <input type="number" min={0} step="0.01" className={inputCls}
                      value={form.price}
                      onChange={e => setField('price', e.target.value)}
                      placeholder="250" />
                  </div>
                  <div>
                    <label className={labelCls}>تسمية السعر</label>
                    <input className={inputCls}
                      value={form.price_label}
                      onChange={e => setField('price_label', e.target.value)}
                      placeholder="يبدأ من"
                      dir="rtl" />
                  </div>
                </div>

                {/* Descriptions */}
                <div>
                  <label className={labelCls}>الوصف (عربي)</label>
                  <textarea
                    className={inputCls}
                    value={form.description_ar}
                    onChange={e => setField('description_ar', e.target.value)}
                    rows={2}
                    placeholder="شاليه فاخر مع إطلالة بانورامية..."
                    dir="rtl"
                    style={{ resize: 'vertical', minHeight: 60 }}
                  />
                </div>
                <div>
                  <label className={labelCls}>Description (English)</label>
                  <textarea
                    className={inputCls}
                    value={form.description_en}
                    onChange={e => setField('description_en', e.target.value)}
                    rows={2}
                    placeholder="Luxury chalet with panoramic views..."
                    style={{ resize: 'vertical', minHeight: 60 }}
                  />
                </div>
              </form>
            )}


            {/* ═══════════════ TAB 2: IMAGES ═══════════════ */}
            {activeTab === 'images' && unit?.id && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Current images grid */}
                {images.length > 0 ? (
                  <div>
                    <p style={{ color: C.muted, fontSize: 11, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                      الصور الحالية ({images.length})
                    </p>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 8,
                    }}>
                      {images.map(url => (
                        <div
                          key={url}
                          style={{
                            position: 'relative', borderRadius: 10, overflow: 'hidden',
                            aspectRatio: '1', border: `1px solid ${C.border}`,
                            background: '#0a0a0f',
                          }}
                        >
                          <img
                            src={url}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            loading="lazy"
                          />
                          <button
                            onClick={() => handleDelete(url)}
                            disabled={deleting === url}
                            title="حذف الصورة"
                            style={{
                              position: 'absolute', inset: 0,
                              background: 'rgba(0,0,0,0)',
                              border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              opacity: 0, transition: 'background 0.18s, opacity 0.18s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(248,113,113,0.55)';
                              e.currentTarget.style.opacity = '1';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(0,0,0,0)';
                              e.currentTarget.style.opacity = '0';
                            }}
                          >
                            {deleting === url
                              ? <Spinner />
                              : <span style={{ color: '#fff', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}>
                                  <TrashIcon />
                                </span>
                            }
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
                    لا توجد صور بعد — ارفع أول صورة أدناه
                  </p>
                )}

                {/* Dropzone */}
                <div>
                  <p style={{ color: C.muted, fontSize: 11, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                    رفع صورة جديدة
                  </p>
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${isDragging ? C.gold : C.goldBorder}`,
                      borderRadius: 14,
                      padding: '32px 20px',
                      textAlign: 'center',
                      cursor: uploading ? 'wait' : 'pointer',
                      background: isDragging ? C.goldDim : 'rgba(212,168,83,0.03)',
                      transition: 'border-color 0.18s, background 0.18s',
                    }}
                  >
                    {uploading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <Spinner />
                        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>جاري الرفع…</p>
                      </div>
                    ) : (
                      <>
                        <div style={{ color: C.goldBorder, marginBottom: 10 }}><UploadIcon /></div>
                        <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>
                          اسحب الصورة هنا أو اضغط للاختيار
                        </p>
                        <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>
                          PNG, JPG, WEBP — حد أقصى 8 MB
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = ''; }}
                  />
                </div>

                {uploadError && (
                  <div style={{
                    background: C.redDim, border: `1px solid rgba(248,113,113,0.3)`,
                    borderRadius: 8, padding: '10px 14px',
                    color: C.red, fontSize: 12,
                  }}>
                    {uploadError}
                  </div>
                )}
              </div>
            )}


            {/* ═══════════════ TAB 3: CONTENT BLOCKS ═══════════════ */}
            {activeTab === 'content' && (
              <ContentBlockEditor
                blocks={contentBlocks}
                onChange={setContentBlocks}
              />
            )}


            {/* ═══════════════ TAB 4: AMENITIES & RULES ═══════════════ */}
            {activeTab === 'rules' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <AmenitiesEditor
                  amenities={amenities}
                  onChange={setAmenities}
                />
                <div style={{
                  height: 1, background: C.border,
                  margin: '0 -24px', width: 'calc(100% + 48px)',
                }} />
                <RulesPoliciesEditor
                  rules={rulesPolicies}
                  onChange={setRulesPolicies}
                />
              </div>
            )}
          </div>

          {/* ── Footer — always visible with save ── */}
          <div style={{
            padding: '16px 24px', borderTop: `1px solid ${C.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexShrink: 0,
          }}>
            {/* Block count badge */}
            <div style={{ display: 'flex', gap: 8 }}>
              {contentBlocks.length > 0 && (
                <span style={{
                  padding: '4px 10px', borderRadius: 6,
                  background: C.goldDim, color: C.gold,
                  fontSize: 10, fontWeight: 700,
                }}>
                  🧱 {contentBlocks.length} blocks
                </span>
              )}
              {amenities.length > 0 && (
                <span style={{
                  padding: '4px 10px', borderRadius: 6,
                  background: C.greenDim, color: C.green,
                  fontSize: 10, fontWeight: 700,
                }}>
                  ✨ {amenities.length} amenities
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  border: `1px solid ${C.border}`, background: 'transparent',
                  color: C.muted, cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  padding: '10px 28px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                  border: 'none', cursor: saving ? 'wait' : 'pointer',
                  background: saving
                    ? 'rgba(212,168,83,0.4)'
                    : 'linear-gradient(135deg,#d4a853,#b8892a)',
                  color: '#000',
                  boxShadow: '0 4px 18px rgba(212,168,83,0.30)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {saving && <Spinner />}
                {unit ? 'حفظ التعديلات' : 'إنشاء الوحدة'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
