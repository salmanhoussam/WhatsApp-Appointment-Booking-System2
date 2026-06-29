/**
 * GalleryTab.jsx — Admin gallery image management
 *
 * Lets TENANT_ADMIN / MANAGER_UNITS manage per-unit gallery images.
 * Backend: /api/v1/admin/gallery/{unit_id} (list, upload, reorder, delete)
 *
 * Flow:
 *   1. Load all units → show as pill selector
 *   2. On unit select → fetch that unit's GalleryImage rows
 *   3. Upload: drag-drop / click → POST multipart to /gallery/{unit_id}
 *   4. Per-image controls: span toggle (small ↔ hero), hide/show, delete
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import adminApi from '../../../../utils/admin.config';

const C = {
  bg:        '#0a0a0f',
  surface:   'rgba(255,255,255,0.03)',
  surfaceHi: 'rgba(255,255,255,0.06)',
  border:    'rgba(255,255,255,0.07)',
  gold:      '#d4a853',
  goldDim:   'rgba(212,168,83,0.08)',
  goldBord:  'rgba(212,168,83,0.25)',
  textPri:   '#f0f0f5',
  textMut:   'rgba(240,240,245,0.45)',
  red:       '#ef4444',
  redDim:    'rgba(239,68,68,0.08)',
  green:     '#22c55e',
  greenDim:  'rgba(34,197,94,0.08)',
};

// ── Image card ────────────────────────────────────────────────────────────────

function ImageCard({ img, onDelete, onToggleSpan, onToggleActive }) {
  const [hovered, setHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('حذف هذه الصورة من Supabase وقاعدة البيانات؟')) return;
    setDeleting(true);
    await onDelete(img.id);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:     'relative',
        borderRadius: 10,
        overflow:     'hidden',
        border:       `1px solid ${img.is_active ? C.border : C.red + '55'}`,
        background:   C.surface,
        opacity:      img.is_active ? 1 : 0.55,
        transition:   'all 0.2s',
      }}
    >
      {/* Thumbnail */}
      <img
        src={img.url}
        alt=""
        style={{
          width: '100%', aspectRatio: '4/3',
          objectFit: 'cover', display: 'block',
        }}
      />

      {/* HERO badge */}
      {img.span_size === 'large' && (
        <div style={{
          position:   'absolute', top: 6, left: 6,
          background: C.gold, color: '#050508',
          fontSize: 9, fontWeight: 800, letterSpacing: '0.14em',
          padding: '2px 7px', borderRadius: 4,
        }}>
          HERO
        </div>
      )}

      {/* Hidden badge */}
      {!img.is_active && (
        <div style={{
          position:   'absolute', top: 6, right: 6,
          background: C.redDim, border: `1px solid ${C.red}55`,
          color: C.red, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
          padding: '2px 7px', borderRadius: 4,
        }}>
          HIDDEN
        </div>
      )}

      {/* Control overlay (visible on hover) */}
      <div style={{
        position:   'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(5,5,8,0.88) 0%, transparent 55%)',
        display:    'flex', alignItems: 'flex-end',
        padding:    8, gap: 6,
        opacity:    hovered ? 1 : 0,
        transition: 'opacity 0.2s',
        pointerEvents: hovered ? 'auto' : 'none',
      }}>
        {/* Span toggle */}
        <button
          onClick={() => onToggleSpan(img)}
          title={img.span_size === 'large' ? 'Switch to Small' : 'Make Hero (large)'}
          style={{
            padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
            border: `1px solid ${C.goldBord}`, background: C.goldDim,
            color: C.gold, fontSize: 11, fontWeight: 600,
          }}
        >
          {img.span_size === 'large' ? '⬛ Small' : '🔲 Hero'}
        </button>

        {/* Hide / Show */}
        <button
          onClick={() => onToggleActive(img)}
          style={{
            padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
            border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.5)',
            color: C.textMut, fontSize: 11,
          }}
        >
          {img.is_active ? '🙈 Hide' : '👁 Show'}
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            marginLeft: 'auto',
            padding: '4px 9px', borderRadius: 6, cursor: deleting ? 'not-allowed' : 'pointer',
            border: `1px solid ${C.red}44`, background: C.redDim,
            color: C.red, fontSize: 11, opacity: deleting ? 0.5 : 1,
          }}
        >
          {deleting ? '…' : '🗑 Delete'}
        </button>
      </div>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 12,
    }}>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{
          aspectRatio: '4/3', borderRadius: 10,
          background: C.surface,
          animation: 'shimmer 1.4s ease-in-out infinite',
        }} />
      ))}
      <style>{`
        @keyframes shimmer {
          0%,100% { opacity: 0.3; }
          50%      { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GalleryTab() {
  const [units,         setUnits]         = useState([]);
  const [selUnitId,     setSelUnitId]     = useState(null);
  const [images,        setImages]        = useState([]);
  const [unitsLoading,  setUnitsLoading]  = useState(true);
  const [imgsLoading,   setImgsLoading]   = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [dragOver,      setDragOver]      = useState(false);
  const [uploadCount,   setUploadCount]   = useState(0);
  const [error,         setError]         = useState('');
  const fileInputRef = useRef(null);

  // ── Load units on mount ───────────────────────────────────────────────────
  useEffect(() => {
    setUnitsLoading(true);
    adminApi.get('/units/')
      .then(r => {
        const list = r.data.data ?? r.data ?? [];
        const active = list.filter(u => u.isActive !== false);
        setUnits(active);
        if (active.length > 0) setSelUnitId(active[0].id);
      })
      .catch(() => setError('تعذّر تحميل الوحدات'))
      .finally(() => setUnitsLoading(false));
  }, []);

  // ── Load images when unit changes ─────────────────────────────────────────
  useEffect(() => {
    if (!selUnitId) return;
    setImgsLoading(true);
    setImages([]);
    adminApi.get(`/gallery/${selUnitId}`)
      .then(r => setImages(r.data ?? []))
      .catch(() => setError('تعذّر تحميل صور الوحدة'))
      .finally(() => setImgsLoading(false));
  }, [selUnitId]);

  // ── Upload handler ────────────────────────────────────────────────────────
  const handleUpload = useCallback(async (files) => {
    if (!selUnitId || !files.length) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const valid = files.filter(f => validTypes.includes(f.type) && f.size <= 8 * 1024 * 1024);
    if (valid.length < files.length) {
      setError(`${files.length - valid.length} ملف تم تجاهله — JPEG/PNG/WebP فقط، حد 8 MB`);
    }
    if (!valid.length) return;

    setUploading(true);
    setUploadCount(valid.length);
    setError('');
    let done = 0;

    for (const file of valid) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('span_size', 'small');
        const r = await adminApi.post(`/gallery/${selUnitId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setImages(prev => [...prev, r.data]);
        done++;
      } catch {
        setError('فشل رفع ملف واحد أو أكثر');
      }
    }

    setUploading(false);
    setUploadCount(0);
  }, [selUnitId]);

  // ── Per-image actions ─────────────────────────────────────────────────────
  const handleDelete = async (imgId) => {
    try {
      await adminApi.delete(`/gallery/images/${imgId}`);
      setImages(prev => prev.filter(i => i.id !== imgId));
    } catch {
      setError('فشل حذف الصورة');
    }
  };

  const handleToggleSpan = async (img) => {
    const next = img.span_size === 'large' ? 'small' : 'large';
    try {
      const r = await adminApi.patch(`/gallery/images/${img.id}`, { span_size: next });
      setImages(prev => prev.map(i => i.id === img.id ? r.data : i));
    } catch {
      setError('تعذّر تحديث حجم الصورة');
    }
  };

  const handleToggleActive = async (img) => {
    try {
      const r = await adminApi.patch(`/gallery/images/${img.id}`, { is_active: !img.is_active });
      setImages(prev => prev.map(i => i.id === img.id ? r.data : i));
    } catch {
      setError('تعذّر تحديث حالة الصورة');
    }
  };

  // ── Drop handlers ─────────────────────────────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = ()  => setDragOver(false);
  const onDrop      = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(Array.from(e.dataTransfer.files));
  };

  const selUnit = units.find(u => u.id === selUnitId);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Error banner */}
      {error && (
        <div style={{
          background: C.redDim, border: `1px solid ${C.red}55`,
          borderRadius: 8, padding: '10px 16px', marginBottom: 20,
          color: C.red, fontSize: 13, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
          >×</button>
        </div>
      )}

      {/* ── Unit selector ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: C.textMut, marginBottom: 12,
        }}>
          اختر الوحدة لإدارة صورها
        </div>

        {unitsLoading ? (
          <div style={{ color: C.textMut, fontSize: 13 }}>جاري تحميل الوحدات…</div>
        ) : units.length === 0 ? (
          <div style={{ color: C.textMut, fontSize: 13 }}>لا توجد وحدات — أضف وحدة أولاً من تبويب الوحدات</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {units.map(u => {
              const active = selUnitId === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => setSelUnitId(u.id)}
                  style={{
                    padding:      '7px 18px',
                    borderRadius: 20,
                    border:       `1px solid ${active ? C.gold : C.border}`,
                    background:   active ? C.goldDim : 'transparent',
                    color:        active ? C.gold : C.textMut,
                    fontSize:     13,
                    fontWeight:   active ? 600 : 400,
                    cursor:       'pointer',
                    transition:   'all 0.15s',
                  }}
                >
                  {u.name_ar || u.name_en || u.unit_type || 'Unit'}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Upload dropzone ────────────────────────────────────────────────── */}
      <div
        onClick={() => !uploading && selUnitId && fileInputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border:        `2px dashed ${dragOver ? C.gold : uploading ? C.gold : C.goldBord}`,
          borderRadius:  12,
          padding:       '32px 24px',
          textAlign:     'center',
          cursor:        selUnitId && !uploading ? 'pointer' : 'default',
          marginBottom:  32,
          background:    dragOver ? C.goldDim : C.surface,
          transition:    'all 0.2s',
          userSelect:    'none',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={e => { handleUpload(Array.from(e.target.files || [])); e.target.value = ''; }}
        />

        {uploading ? (
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
            <div style={{ color: C.gold, fontWeight: 600, fontSize: 14 }}>
              جاري رفع {uploadCount} صورة…
            </div>
          </div>
        ) : !selUnitId ? (
          <div style={{ color: C.textMut, fontSize: 14 }}>اختر وحدة أولاً لرفع الصور</div>
        ) : (
          <div>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📸</div>
            <div style={{ color: C.gold, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
              {selUnit ? `رفع صور لـ "${selUnit.name_ar || selUnit.name_en}"` : 'رفع صور'}
            </div>
            <div style={{ color: C.textMut, fontSize: 12 }}>
              اسحب وأفلت الصور هنا · أو انقر للتصفح
            </div>
            <div style={{ color: C.textMut, fontSize: 11, marginTop: 4 }}>
              JPEG / PNG / WebP · الحد الأقصى 8 MB لكل صورة · رفع متعدد مدعوم
            </div>
          </div>
        )}
      </div>

      {/* ── Image grid ─────────────────────────────────────────────────────── */}
      {imgsLoading ? (
        <Skeleton />
      ) : !selUnitId ? null : images.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '56px 0',
          color: C.textMut, fontSize: 14,
          border: `1px dashed ${C.border}`, borderRadius: 12,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
          <div>لا توجد صور لهذه الوحدة بعد</div>
          <div style={{ fontSize: 12, marginTop: 6, color: C.textMut }}>
            ارفع الصور من المنطقة أعلاه — ستظهر هنا فوراً
          </div>
        </div>
      ) : (
        <div>
          {/* Count + legend */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: C.textMut, letterSpacing: '0.06em' }}>
              {images.length} صورة · {images.filter(i => i.is_active).length} ظاهرة
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: C.textMut }}>
              <span>مرّر على الصورة لإظهار الخيارات</span>
              <span style={{ color: C.gold }}>🔲 Hero = حجم كبير في المعرض</span>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {images.map(img => (
              <ImageCard
                key={img.id}
                img={img}
                onDelete={handleDelete}
                onToggleSpan={handleToggleSpan}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
