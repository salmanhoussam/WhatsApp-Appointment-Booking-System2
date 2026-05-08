import { useState, useEffect, useCallback } from 'react'
import adminApi       from '../../../utils/admin.config'
import useImageUpload from '../../../hooks/useImageUpload'

// ── Shared styles ─────────────────────────────────────────────────────────────

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: 14,
  fontFamily: "'Cairo', sans-serif",
  outline: 'none', boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block', fontSize: 12,
  color: 'rgba(255,255,255,0.5)',
  marginBottom: 6, letterSpacing: '0.05em',
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, onSave, saving, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div
        style={{
          ...glass, background: '#181828',
          width: '100%', maxWidth: 480,
          padding: 28, fontFamily: "'Cairo', sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {children}
        <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>إلغاء</button>
          <button onClick={onSave} disabled={saving} style={{ padding: '9px 24px', borderRadius: 8, background: '#6366f1', border: 'none', color: '#fff', cursor: saving ? 'wait' : 'pointer', fontFamily: "'Cairo', sans-serif", opacity: saving ? 0.7 : 1 }}>
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
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

const EMPTY_CAT  = { name_ar: '', name_en: '', display_template: 'grid' }
const EMPTY_ITEM = { name_ar: '', name_en: '', price: '', currency: 'USD', description_ar: '', image_url: '' }

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
    adminApi.get('/catalog/categories')
      .then(r => setCategories(r.data.data ?? []))
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false))
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  // ── Load items when category selected ─────────────────────────────────────

  useEffect(() => {
    if (!selectedCat) { setItems([]); return }
    setItemsLoading(true)
    adminApi.get(`/catalog/items?category_id=${selectedCat.id}`)
      .then(r => setItems(r.data.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setItemsLoading(false))
  }, [selectedCat])

  // ── Category CRUD ──────────────────────────────────────────────────────────

  const openCreateCat = () => { setEditingCat(null); setCatForm(EMPTY_CAT); setShowCatModal(true) }
  const openEditCat   = (cat, e) => {
    e.stopPropagation()
    setEditingCat(cat)
    setCatForm({ name_ar: cat.name_ar, name_en: cat.name_en ?? '', display_template: cat.display_template ?? 'grid' })
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

  const deleteCat = async (cat, e) => {
    e.stopPropagation()
    if (!confirm(`حذف قسم "${cat.name_ar}"؟`)) return
    await adminApi.delete(`/catalog/categories/${cat.id}`)
    if (selectedCat?.id === cat.id) setSelectedCat(null)
    loadCategories()
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

      const r = await adminApi.get(`/catalog/items?category_id=${selectedCat.id}`)
      setItems(r.data.data ?? [])
      setShowItemModal(false)
    } catch (err) {
      alert(err?.response?.data?.detail ?? 'حدث خطأ')
    } finally {
      setItemSaving(false)
    }
  }

  const deleteItem = async (item) => {
    if (!confirm(`حذف "${item.name_ar}"؟`)) return
    await adminApi.delete(`/catalog/items/${item.id}`)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Categories ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>الأقسام</span>
        <button onClick={openCreateCat} style={{ padding: '8px 18px', borderRadius: 8, background: color, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: "'Cairo', sans-serif" }}>
          + قسم جديد
        </button>
      </div>

      {catLoading ? (
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>جاري التحميل...</p>
      ) : categories.length === 0 ? (
        <div style={{ ...glass, padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
          <div style={{ fontSize: 13 }}>لا توجد أقسام بعد — أضف قسمًا للبدء</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
          {categories.map(cat => {
            const selected = selectedCat?.id === cat.id
            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCat(selected ? null : cat)}
                style={{
                  ...glass,
                  padding: 16, cursor: 'pointer',
                  borderColor: selected ? `${color}80` : 'rgba(255,255,255,0.08)',
                  background:  selected ? `${color}15` : 'rgba(255,255,255,0.04)',
                  transition: 'all 0.18s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{cat.name_ar}</div>
                {cat.name_en && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{cat.name_en}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={e => openEditCat(cat, e)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>تعديل</button>
                  <button onClick={e => deleteCat(cat, e)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff8080', cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>حذف</button>
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
              <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                منتجات — {selectedCat.name_ar}
              </span>
              <button onClick={() => setSelectedCat(null)} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>إغلاق</button>
            </div>
            <button onClick={openCreateItem} style={{ padding: '8px 18px', borderRadius: 8, background: color, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: "'Cairo', sans-serif" }}>
              + منتج جديد
            </button>
          </div>

          {itemsLoading ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>جاري التحميل...</p>
          ) : items.length === 0 ? (
            <div style={{ ...glass, padding: 28, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: 13 }}>لا توجد منتجات في هذا القسم بعد</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(item => (
                <div key={item.id} style={{ ...glass, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  {item.image_url && (
                    <img src={item.image_url} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name_ar}</div>
                    {item.name_en && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{item.name_en}</div>}
                    {item.description_ar && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{item.description_ar}</div>}
                  </div>
                  {item.price != null && (
                    <div style={{ fontSize: 14, fontWeight: 700, color, flexShrink: 0 }}>
                      {item.price} {item.currency}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => openEditItem(item)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>تعديل</button>
                    <button onClick={() => deleteItem(item)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff8080', cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>حذف</button>
                  </div>
                </div>
              ))}
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
          <Field label="طريقة العرض">
            <select style={inputStyle} value={catForm.display_template} onChange={e => setCatForm(p => ({ ...p, display_template: e.target.value }))}>
              <option value="grid">شبكة (Grid)</option>
              <option value="list">قائمة (List)</option>
              <option value="showcase">عرض (Showcase)</option>
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
              background: 'rgba(255,255,255,0.06)',
              border: `1px dashed ${imageFile ? color : 'rgba(255,255,255,0.15)'}`,
              color: imageFile ? color : 'rgba(255,255,255,0.45)',
              fontSize: 13, fontFamily: "'Cairo', sans-serif",
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
              <div style={{ fontSize: 12, color: '#ff8080', marginTop: 6 }}>{uploadError}</div>
            )}
          </Field>
        </Modal>
      )}
    </div>
  )
}
