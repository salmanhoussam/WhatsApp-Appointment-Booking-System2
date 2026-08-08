import { useState, useEffect, useCallback } from 'react'
import adminApi       from '../../../utils/admin.config'
import useImageUpload from '../../../hooks/useImageUpload'
import { T, FONT } from '../theme'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

// ── Shared styles (Dashboard Design System Completion, 2026-08-05 -- re-themed
// off the same T/FONT tokens already shipped for Calendar/Reservations/Overview) ──

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  background: T.cardBg,
  border: `1px solid ${T.border}`,
  color: T.textPrimary, fontSize: 14,
  fontFamily: FONT,
  outline: 'none', boxSizing: 'border-box', colorScheme: 'light',
}

const labelStyle = {
  display: 'block', fontSize: 12,
  color: T.textSecond,
  marginBottom: 6, letterSpacing: '0.05em',
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, onSave, saving, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div
        style={{
          background: T.cardBg, border: `1px solid ${T.border}`, boxShadow: T.shadowPopover,
          borderRadius: 12,
          width: '100%', maxWidth: 480,
          padding: 28, fontFamily: FONT,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.textMuted, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {children}
        <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button variant="primary" onClick={onSave} disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const EMPTY_CAT  = { name_ar: '', name_en: '', display_template: 'grid', module_key: 'catalog', parent_id: '' }
const EMPTY_ITEM = { name_ar: '', name_en: '', price: '', currency: 'USD', description_ar: '', image_url: '' }

const MODULE_KEY_META = {
  catalog: { label: 'عام / خدمات', badge: 'خدمة', color: '#6366f1' },
  store:   { label: 'متجر (منتجات للبيع)', badge: 'منتج', color: '#10b981' },
  booking: { label: 'حجز', badge: 'حجز', color: '#f59e0b' },
  restaurant: { label: 'مطعم', badge: 'قائمة', color: '#ef4444' },
}

export default function CatalogTab({ color }) {
  const [categories,   setCategories]   = useState([])
  const [selectedCat,  setSelectedCat]  = useState(null)
  const [items,        setItems]        = useState([])
  const [catLoading,   setCatLoading]   = useState(true)
  const [itemsLoading, setItemsLoading] = useState(false)

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false)
  const [editingCat,   setEditingCat]   = useState(null)
  const [catForm,      setCatForm]      = useState(EMPTY_CAT)
  const [catSaving,    setCatSaving]    = useState(false)

  // Item modal
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem,   setEditingItem]   = useState(null)
  const [itemForm,      setItemForm]      = useState(EMPTY_ITEM)
  const [itemSaving,    setItemSaving]    = useState(false)

  // Image upload
  const [imageFile,    setImageFile]    = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const { upload, error: uploadError, reset: resetUpload } = useImageUpload()

  // ── Load categories ────────────────────────────────────────────────────────

  const loadCategories = useCallback(() => {
    setCatLoading(true)
    adminApi.get('/catalog/categories?include_inactive=true')
      .then(r => setCategories(r.data.data ?? []))
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false))
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  // ── Load items when category selected ─────────────────────────────────────

  useEffect(() => {
    if (!selectedCat) { setItems([]); return }
    setItemsLoading(true)
    adminApi.get(`/catalog/items?category_id=${selectedCat.id}&include_inactive=true`)
      .then(r => setItems(r.data.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setItemsLoading(false))
  }, [selectedCat])

  // ── Category CRUD ──────────────────────────────────────────────────────────

  const openCreateCat = () => { setEditingCat(null); setCatForm(EMPTY_CAT); setShowCatModal(true) }
  const openEditCat   = (cat, e) => {
    e.stopPropagation()
    setEditingCat(cat)
    setCatForm({ name_ar: cat.name_ar, name_en: cat.name_en ?? '', display_template: cat.display_template ?? 'grid', module_key: cat.module_key ?? 'catalog', parent_id: cat.parent_id ?? '' })
    setShowCatModal(true)
  }

  const saveCat = async () => {
    if (!catForm.name_ar.trim()) return
    setCatSaving(true)
    try {
      if (editingCat) {
        await adminApi.patch(`/catalog/categories/${editingCat.id}`, catForm)
      } else {
        await adminApi.post('/catalog/categories', catForm)
      }
      loadCategories()
      setShowCatModal(false)
    } catch (err) {
      alert(err?.response?.data?.detail ?? 'حدث خطأ')
    } finally {
      setCatSaving(false)
    }
  }

  const hideCat = async (cat, e) => {
    e.stopPropagation()
    if (!confirm(`إخفاء قسم "${cat.name_ar}"؟ يمكن إعادة إظهاره لاحقاً.`)) return
    await adminApi.delete(`/catalog/categories/${cat.id}`)
    if (selectedCat?.id === cat.id) setSelectedCat(null)
    loadCategories()
  }

  const showCat = async (cat, e) => {
    e.stopPropagation()
    await adminApi.patch(`/catalog/categories/${cat.id}`, { is_active: true })
    loadCategories()
  }

  // ── Category reorder — renumbers the whole list to sequential sort_order,
  // since every real row starts at the untouched default (0) and a naive
  // adjacent-swap would be a no-op until the first reorder ever happens ──
  const moveCat = async (index, direction, e) => {
    e.stopPropagation()
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= categories.length) return
    const reordered = [...categories]
    ;[reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]]
    setCategories(reordered)
    try {
      await Promise.all(reordered.map((cat, i) => adminApi.patch(`/catalog/categories/${cat.id}`, { sort_order: i })))
    } finally {
      loadCategories()
    }
  }

  // ── Item modal helpers ─────────────────────────────────────────────────────

  const resetImageState = () => {
    setImageFile(null)
    setImagePreview(null)
    resetUpload()
  }

  const openCreateItem = () => {
    setEditingItem(null)
    setItemForm(EMPTY_ITEM)
    resetImageState()
    setShowItemModal(true)
  }

  const openEditItem = (item) => {
    setEditingItem(item)
    setItemForm({
      name_ar: item.name_ar, name_en: item.name_en ?? '',
      price: item.price ?? '', currency: item.currency ?? 'USD',
      description_ar: item.description_ar ?? '', image_url: item.image_url ?? '',
    })
    resetImageState()
    setImagePreview(item.image_url || null)
    setShowItemModal(true)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  // ── Item CRUD ──────────────────────────────────────────────────────────────

  const saveItem = async () => {
    if (!itemForm.name_ar.trim()) return
    setItemSaving(true)
    try {
      const body = {
        ...itemForm,
        price: itemForm.price !== '' ? parseFloat(itemForm.price) : undefined,
        category_id: selectedCat.id,
      }
      if (body.price === undefined) delete body.price

      let savedId = editingItem?.id

      if (editingItem) {
        await adminApi.patch(`/catalog/items/${editingItem.id}`, body)
      } else {
        const res = await adminApi.post('/catalog/items', body)
        savedId = res.data.data.id
      }

      // Upload image if file was selected
      if (imageFile && savedId) {
        const { url } = await upload(imageFile, {
          context:     'catalog_item',
          category_id: selectedCat.id,
          item_id:     savedId,
        })
        await adminApi.patch(`/catalog/items/${savedId}`, { image_url: url })
      }

      const r = await adminApi.get(`/catalog/items?category_id=${selectedCat.id}&include_inactive=true`)
      setItems(r.data.data ?? [])
      setShowItemModal(false)
    } catch (err) {
      alert(err?.response?.data?.detail ?? 'حدث خطأ')
    } finally {
      setItemSaving(false)
    }
  }

  const hideItem = async (item) => {
    if (!confirm(`إخفاء "${item.name_ar}"؟ يمكن إعادة إظهاره لاحقاً.`)) return
    await adminApi.delete(`/catalog/items/${item.id}`)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: false } : i))
  }

  const showItem = async (item) => {
    await adminApi.patch(`/catalog/items/${item.id}`, { is_active: true })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: true } : i))
  }

  // ── Item reorder (within the selected category) — same whole-list
  // renumbering approach as moveCat, for the same reason ──
  const moveItem = async (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= items.length) return
    const reordered = [...items]
    ;[reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]]
    setItems(reordered)
    try {
      await Promise.all(reordered.map((item, i) => adminApi.patch(`/catalog/items/${item.id}`, { sort_order: i })))
    } finally {
      const r = await adminApi.get(`/catalog/items?category_id=${selectedCat.id}&include_inactive=true`)
      setItems(r.data.data ?? [])
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: FONT }}>
      {/* ── Categories ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}>الأقسام</span>
        <Button variant="primary" color={color} onClick={openCreateCat}>+ قسم جديد</Button>
      </div>

      {catLoading ? (
        <p style={{ color: T.textMuted, fontSize: 13 }}>جاري التحميل...</p>
      ) : categories.length === 0 ? (
        <Card padding={0} style={{ textAlign: 'center' }}>
          <EmptyState icon="📦" message="لا توجد أقسام بعد — أضف قسمًا للبدء" />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
          {categories.map((cat, catIndex) => {
            const selected = selectedCat?.id === cat.id
            const inactive = cat.is_active === false
            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCat(selected ? null : cat)}
                style={{
                  borderRadius: 12, border: `1px solid ${selected ? `${color}80` : T.border}`,
                  padding: 16, cursor: 'pointer',
                  background: selected ? `${color}15` : T.cardBg,
                  boxShadow: T.shadow, opacity: inactive ? 0.55 : 1,
                  transition: 'all 0.18s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: T.textPrimary }}>{cat.name_ar}</div>
                  {(() => {
                    const meta = MODULE_KEY_META[cat.module_key] ?? MODULE_KEY_META.catalog
                    return (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: `${meta.color}22`, color: meta.color, fontWeight: 600 }}>
                        {meta.badge}
                      </span>
                    )
                  })()}
                  {inactive && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: `${T.textMuted}22`, color: T.textMuted, fontWeight: 600 }}>
                      مخفي
                    </span>
                  )}
                </div>
                {cat.name_en && <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>{cat.name_en}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Button variant="secondary" size="sm" onClick={e => openEditCat(cat, e)}>تعديل</Button>
                  {inactive
                    ? <Button variant="secondary" size="sm" onClick={e => showCat(cat, e)}>إظهار</Button>
                    : <Button variant="danger" size="sm" onClick={e => hideCat(cat, e)}>إخفاء</Button>}
                  <Button variant="secondary" size="sm" disabled={catIndex === 0} onClick={e => moveCat(catIndex, -1, e)}>↑</Button>
                  <Button variant="secondary" size="sm" disabled={catIndex === categories.length - 1} onClick={e => moveCat(catIndex, 1, e)}>↓</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Items for selected category ── */}
      {selectedCat && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}>
                منتجات — {selectedCat.name_ar}
              </span>
              <Button variant="secondary" size="sm" onClick={() => setSelectedCat(null)}>إغلاق</Button>
            </div>
            <Button variant="primary" color={color} onClick={openCreateItem}>+ منتج جديد</Button>
          </div>

          {itemsLoading ? (
            <p style={{ color: T.textMuted, fontSize: 13 }}>جاري التحميل...</p>
          ) : items.length === 0 ? (
            <Card padding={0}>
              <EmptyState message="لا توجد منتجات في هذا القسم بعد" />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((item, itemIndex) => {
                const inactive = item.is_active === false
                return (
                <Card key={item.id} padding="14px 18px" style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: inactive ? 0.55 : 1 }}>
                  {item.image_url && (
                    <img src={item.image_url} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: T.textPrimary }}>{item.name_ar}</div>
                      {inactive && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: `${T.textMuted}22`, color: T.textMuted, fontWeight: 600, flexShrink: 0 }}>
                          مخفي
                        </span>
                      )}
                    </div>
                    {item.name_en && <div style={{ fontSize: 11, color: T.textMuted }}>{item.name_en}</div>}
                    {item.description_ar && <div style={{ fontSize: 12, color: T.textSecond, marginTop: 4 }}>{item.description_ar}</div>}
                  </div>
                  {item.price != null && (
                    <div style={{ fontSize: 14, fontWeight: 700, color, flexShrink: 0 }}>
                      {item.price} {item.currency}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Button variant="secondary" size="sm" onClick={() => openEditItem(item)}>تعديل</Button>
                    {inactive
                      ? <Button variant="secondary" size="sm" onClick={() => showItem(item)}>إظهار</Button>
                      : <Button variant="danger" size="sm" onClick={() => hideItem(item)}>إخفاء</Button>}
                    <Button variant="secondary" size="sm" disabled={itemIndex === 0} onClick={() => moveItem(itemIndex, -1)}>↑</Button>
                    <Button variant="secondary" size="sm" disabled={itemIndex === items.length - 1} onClick={() => moveItem(itemIndex, 1)}>↓</Button>
                  </div>
                </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Category modal ── */}
      {showCatModal && (
        <Modal
          title={editingCat ? 'تعديل القسم' : 'قسم جديد'}
          onClose={() => setShowCatModal(false)}
          onSave={saveCat}
          saving={catSaving}
        >
          <Field label="اسم القسم (عربي) *">
            <input style={inputStyle} value={catForm.name_ar} onChange={e => setCatForm(p => ({ ...p, name_ar: e.target.value }))} placeholder="مثال: ملابس نسائية" />
          </Field>
          <Field label="اسم القسم (إنجليزي)">
            <input style={inputStyle} value={catForm.name_en} onChange={e => setCatForm(p => ({ ...p, name_en: e.target.value }))} placeholder="e.g. Women's Clothing" />
          </Field>
          <Field label="نوع القسم — خدمة أم منتج للبيع؟">
            <select
              style={{ ...inputStyle, opacity: editingCat ? 0.5 : 1 }}
              value={catForm.module_key}
              disabled={!!editingCat}
              onChange={e => setCatForm(p => ({ ...p, module_key: e.target.value }))}
            >
              <option value="catalog">عام / خدمات (حجوزات، خدمات حلاقة...)</option>
              <option value="store">متجر — منتجات حقيقية للبيع (سبراي، واكس...)</option>
            </select>
            {editingCat && (
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>
                لا يمكن تغيير نوع القسم بعد إنشائه — أنشئ قسمًا جديدًا بدلاً من ذلك
              </div>
            )}
          </Field>
          <Field label="طريقة العرض">
            <select style={inputStyle} value={catForm.display_template} onChange={e => setCatForm(p => ({ ...p, display_template: e.target.value }))}>
              <option value="grid">شبكة (Grid)</option>
              <option value="list">قائمة (List)</option>
              <option value="showcase">عرض (Showcase)</option>
            </select>
          </Field>
          <Field label="القسم الرئيسي (اختياري)">
            <select style={inputStyle} value={catForm.parent_id} onChange={e => setCatForm(p => ({ ...p, parent_id: e.target.value }))}>
              <option value="">بدون (قسم رئيسي)</option>
              {categories.filter(c => c.id !== editingCat?.id).map(c => (
                <option key={c.id} value={c.id}>{c.name_ar}</option>
              ))}
            </select>
          </Field>
        </Modal>
      )}

      {/* ── Item modal ── */}
      {showItemModal && (
        <Modal
          title={editingItem ? 'تعديل المنتج' : 'منتج جديد'}
          onClose={() => setShowItemModal(false)}
          onSave={saveItem}
          saving={itemSaving}
        >
          <Field label="اسم المنتج (عربي) *">
            <input style={inputStyle} value={itemForm.name_ar} onChange={e => setItemForm(p => ({ ...p, name_ar: e.target.value }))} placeholder="مثال: فستان صيفي" />
          </Field>
          <Field label="اسم المنتج (إنجليزي)">
            <input style={inputStyle} value={itemForm.name_en} onChange={e => setItemForm(p => ({ ...p, name_en: e.target.value }))} placeholder="e.g. Summer Dress" />
          </Field>
          <Field label="وصف المنتج">
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} value={itemForm.description_ar} onChange={e => setItemForm(p => ({ ...p, description_ar: e.target.value }))} placeholder="وصف مختصر للمنتج" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="السعر">
              <input style={inputStyle} type="number" min="0" step="0.01" value={itemForm.price} onChange={e => setItemForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label="العملة">
              <select style={inputStyle} value={itemForm.currency} onChange={e => setItemForm(p => ({ ...p, currency: e.target.value }))}>
                <option value="USD">USD</option>
                <option value="LBP">LBP</option>
                <option value="SAR">SAR</option>
                <option value="AED">AED</option>
                <option value="EUR">EUR</option>
              </select>
            </Field>
          </div>

          {/* ── Image upload ── */}
          <Field label="صورة المنتج">
            {/* Preview */}
            {imagePreview && (
              <img
                src={imagePreview}
                alt=""
                style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', marginBottom: 10, display: 'block' }}
              />
            )}

            {/* File picker */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
              background: T.pageBg,
              border: `1px dashed ${imageFile ? color : T.border}`,
              color: imageFile ? color : T.textMuted,
              fontSize: 13, fontFamily: FONT,
              transition: 'border-color .15s, color .15s',
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {imageFile ? imageFile.name : 'اختر صورة من جهازك'}
              <input
                type="file" accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>

            {/* URL fallback — shown when no file is selected */}
            {!imageFile && (
              <input
                style={{ ...inputStyle, marginTop: 8, fontSize: 13 }}
                value={itemForm.image_url}
                onChange={e => setItemForm(p => ({ ...p, image_url: e.target.value }))}
                placeholder="أو أدخل رابط الصورة مباشرةً"
                dir="ltr"
              />
            )}

            {uploadError && (
              <div style={{ fontSize: 12, color: T.danger, marginTop: 6 }}>{uploadError}</div>
            )}
          </Field>
        </Modal>
      )}
    </div>
  )
}
