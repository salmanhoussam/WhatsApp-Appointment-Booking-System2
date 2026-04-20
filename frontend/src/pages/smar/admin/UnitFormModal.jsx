import { useState, useEffect, useRef } from 'react';
import adminApi from '../../../utils/admin.config';

// ── Shared palette ────────────────────────────────────────────────────────────
const C = {
  bg:       '#0a0a0f',
  surface:  '#12121a',
  border:   'rgba(255,255,255,0.08)',
  borderHi: 'rgba(255,255,255,0.15)',
  gold:     '#d4a853',
  goldDim:  'rgba(212,168,83,0.10)',
  goldBorder:'rgba(212,168,83,0.35)',
  text:     '#f0f0f5',
  muted:    '#6b6b80',
  red:      '#f87171',
  redDim:   'rgba(248,113,113,0.12)',
};

const inputCls = [
  'w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[#4a4a5a]',
  'bg-black/40 border border-white/10',
  'focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853]',
  'transition-all',
].join(' ');

const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-[#6b6b80] mb-2';

// ── Trash icon SVG ────────────────────────────────────────────────────────────
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

// ── Upload icon SVG ───────────────────────────────────────────────────────────
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

// ── Spinner ───────────────────────────────────────────────────────────────────
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


export default function UnitFormModal({ isOpen, onClose, unit, onSave, onImagesChange }) {
  const [activeTab, setActiveTab] = useState('details');

  // ── Details form state ────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name_ar: '', capacity: 2, bedrooms: 1, bathrooms: 1, price: '',
  });

  // ── Images state ──────────────────────────────────────────────────────────
  const [images,      setImages]      = useState([]);
  const [uploading,   setUploading]   = useState(false);
  const [deleting,    setDeleting]    = useState(null); // URL being deleted
  const [uploadError, setUploadError] = useState('');
  const [isDragging,  setIsDragging]  = useState(false);
  const fileInputRef = useRef(null);

  // ── Hydrate on open ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('details');
    setUploadError('');

    if (unit) {
      setForm({
        name_ar:   unit.name_ar  || unit.name || '',
        capacity:  unit.capacity || 2,
        bedrooms:  unit.bedrooms  ?? 1,
        bathrooms: unit.bathrooms ?? 1,
        price:     unit.price != null ? String(unit.price) : '',
      });
      setImages(Array.isArray(unit.images) ? unit.images : []);
    } else {
      setForm({ name_ar: '', capacity: 2, bedrooms: 1, bathrooms: 1, price: '' });
      setImages([]);
    }
  }, [unit, isOpen]);

  if (!isOpen) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name_ar:   form.name_ar,
      capacity:  Number(form.capacity),
      bedrooms:  form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      price:     form.price !== '' ? parseFloat(form.price) : null,
    });
    onClose();
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Keyframe for spinner */}
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
          width: '100%', maxWidth: 540,
          maxHeight: '90vh',
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
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>
                {unit ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}
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

            {/* Tabs — only show images tab when editing an existing unit */}
            {unit?.id && (
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { key: 'details', label: 'التفاصيل' },
                  { key: 'images',  label: 'الصور' },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    style={{
                      padding: '8px 18px', borderRadius: '8px 8px 0 0',
                      border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      background:   activeTab === t.key ? C.bg         : 'transparent',
                      color:        activeTab === t.key ? C.gold       : C.muted,
                      borderBottom: activeTab === t.key ? `2px solid ${C.gold}` : '2px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Scrollable body ── */}
          <div style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>

            {/* ───────────── DETAILS TAB ───────────── */}
            {activeTab === 'details' && (
              <form id="unit-details-form" onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div>
                  <label className={labelCls}>اسم الوحدة *</label>
                  <input
                    className={inputCls}
                    value={form.name_ar}
                    onChange={e => setField('name_ar', e.target.value)}
                    placeholder="مثال: شاليه الصنوبر"
                    dir="rtl"
                    required
                  />
                </div>

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

                <div>
                  <label className={labelCls}>السعر الليلي الأساسي (USD)</label>
                  <input type="number" min={0} step="0.01" className={inputCls}
                    value={form.price}
                    onChange={e => setField('price', e.target.value)}
                    placeholder="مثال: 250" />
                </div>
              </form>
            )}

            {/* ───────────── IMAGES TAB ───────────── */}
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
                          {/* Delete overlay */}
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

                {/* Error */}
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
          </div>

          {/* ── Footer — only on details tab ── */}
          {activeTab === 'details' && (
            <div style={{
              padding: '16px 24px', borderTop: `1px solid ${C.border}`,
              display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0,
            }}>
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
                type="submit"
                form="unit-details-form"
                style={{
                  padding: '10px 28px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#d4a853,#b8892a)',
                  color: '#000',
                  boxShadow: '0 4px 18px rgba(212,168,83,0.30)',
                }}
              >
                {unit ? 'حفظ التعديلات' : 'إنشاء الوحدة'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
