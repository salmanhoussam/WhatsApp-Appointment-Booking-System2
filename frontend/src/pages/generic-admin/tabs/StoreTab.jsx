import { useState, useEffect, useCallback } from 'react'
import adminApi       from '../../../utils/admin.config'
import useImageUpload from '../../../hooks/useImageUpload'
import { T, FONT } from '../theme'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import OrdersTab from './OrdersTab'

// ── Store Tab (Staff/Store IA Separation, 2026-08-09,
// .claudedocs/implementation/STAFF_STORE_IA_SEPARATION_CONTRACT.md) ────────────────────────────
//
// Categories/Items/Orders internal toggle, wired to store.py's EXISTING, already-isolated admin
// endpoints (/store/categories, /store/products, hardcoded module_key='store' server-side) --
// structurally cannot ever show a Service. Orders sub-view renders the existing OrdersTab
// component directly, unchanged, zero logic duplicated.
//
// Real API contract differences from CatalogTab.jsx/catalog.py, confirmed by reading store.py
// before writing this file -- NOT the same shape, do not copy-paste blindly:
//   1. store.py's PATCH routes (CategoryIn/ProductIn) require the FULL object on every call --
//      unlike catalog.py's all-Optional partial-patch schemas, omitting a field here would RESET
//      it to its Pydantic default, not preserve the current value. Every mutation below sends the
//      complete current object.
//   2. store.py's DELETE routes are HARD deletes (admin_catalog_repo.delete_category_by_filter /
//      delete_item_by_filter -- confirmed via the repository code, not assumed). "Hide" here is
//      ALWAYS a PATCH with is_active:false -- the DELETE routes are never called from this file.
//   3. ProductIn has no sort_order field at all -- Store Items cannot be reordered via the existing
//      endpoints. No reorder UI for Items (Categories still support it, CategoryIn does have
//      sort_order). Not a bug, a real backend gap named for later, per the Contract's "zero backend
//      changes in this task" scope.
//   4. Items is its own flat, always-visible list (GET /products with no category_id returns every
//      store item) -- deliberately NOT gated behind clicking a category first, per Salman's explicit
//      requirement.
//
// Modal/Field defined locally, mirroring StaffTab.jsx/CatalogTab.jsx's own local copies --
// deliberately not extracted into a shared component (Contract's explicit "no refactor" scope).

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
          width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
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

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

const EMPTY_CAT  = { name_ar: '', name_en: '', image_url: '', parent_id: '', sort_order: 0, is_active: true }
const EMPTY_ITEM = { name_ar: '', name_en: '', description_ar: '', price: '', category_id: '', image_url: '', is_featured: false, is_active: true }

export default function StoreTab({ color, currency = 'USD', activeServices }) {
  const [subView, setSubView] = useState('categories')

  // ── Categories ─────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState([])
  const [catLoading, setCatLoading] = useState(true)

  const [showCatModal, setShowCatModal] = useState(false)
  const [editingCat,   setEditingCat]   = useState(null)
  const [catForm,      setCatForm]      = useState(EMPTY_CAT)
  const [catSaving,    setCatSaving]    = useState(false)

  const loadCategories = useCallback(() => {
    setCatLoading(true)
    adminApi.get('/store/categories')
      .then(r => setCategories(r.data.data ?? []))
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false))
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  const openCreateCat = () => { setEditingCat(null); setCatForm(EMPTY_CAT); setShowCatModal(true) }
  const openEditCat = (cat) => {
    setEditingCat(cat)
    setCatForm({
      name_ar: cat.name_ar, name_en: cat.name_en ?? '', image_url: cat.image_url ?? '',
      parent_id: cat.parent_id ?? '', sort_order: cat.sort_order ?? 0, is_active: cat.is_active,
    })
    setShowCatModal(true)
  }

  const saveCat = async () => {
    if (!catForm.name_ar.trim()) return
    setCatSaving(true)
    try {
      // Full body every time -- CategoryIn has no partial-patch semantics, see file header.
      const body = {
        name_ar: catForm.name_ar, name_en: catForm.name_en || null,
        image_url: catForm.image_url || null, parent_id: catForm.parent_id || null,
        sort_order: catForm.sort_order, is_active: catForm.is_active,
      }
      if (editingCat) {
        await adminApi.patch(`/store/categories/${editingCat.id}`, body)
      } else {
        await adminApi.post('/store/categories', body)
      }
      loadCategories()
      setShowCatModal(false)
    } catch (err) {
      alert(err?.response?.data?.detail ?? 'حدث خطأ')
    } finally {
      setCatSaving(false)
    }
  }

  // Hide/show: PATCH is_active only -- never DELETE (hard delete in store.py, see file header).
  const toggleCatActive = async (cat) => {
    await adminApi.patch(`/store/categories/${cat.id}`, {
      name_ar: cat.name_ar, name_en: cat.name_en, image_url: cat.image_url,
      parent_id: cat.parent_id, sort_order: cat.sort_order, is_active: !cat.is_active,
    })
    loadCategories()
  }

  const moveCat = async (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= categories.length) return
    const reordered = [...categories]
    ;[reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]]
    setCategories(reordered)
    try {
      await Promise.all(reordered.map((cat, i) => adminApi.patch(`/store/categories/${cat.id}`, {
        name_ar: cat.name_ar, name_en: cat.name_en, image_url: cat.image_url,
        parent_id: cat.parent_id, sort_order: i, is_active: cat.is_active,
      })))
    } finally {
      loadCategories()
    }
  }

  // ── Items (flat, always visible -- never gated behind a category click) ────
  const [items,        setItems]        = useState([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [itemCatFilter, setItemCatFilter] = useState('')

  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem,   setEditingItem]   = useState(null)
  const [itemForm,      setItemForm]      = useState(EMPTY_ITEM)
  const [itemSaving,    setItemSaving]    = useState(false)

  const [imageFile,    setImageFile]    = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const { upload, error: uploadError, reset: resetUpload } = useImageUpload()

  const loadItems = useCallback((categoryId) => {
    setItemsLoading(true)
    const params = categoryId ? `?category_id=${categoryId}` : ''
    adminApi.get(`/store/products${params}`)
      .then(r => setItems(r.data.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setItemsLoading(false))
  }, [])

  useEffect(() => { loadItems(itemCatFilter || undefined) }, [loadItems, itemCatFilter])

  const catNameFor = (categoryId) => categories.find(c => c.id === categoryId)?.name_ar ?? ''

  const resetImageState = () => {
    setImageFile(null)
    setImagePreview(null)
    resetUpload()
  }

  const openCreateItem = () => {
    setEditingItem(null)
    setItemForm({ ...EMPTY_ITEM, category_id: itemCatFilter || categories[0]?.id || '' })
    resetImageState()
    setShowItemModal(true)
  }

  const openEditItem = (item) => {
    setEditingItem(item)
    setItemForm({
      name_ar: item.name_ar, name_en: item.name_en ?? '',
      description_ar: item.description_ar ?? '', price: item.price ?? '',
      category_id: item.category_id ?? '', image_url: item.image_url ?? '',
      is_featured: item.is_featured ?? false, is_active: item.is_active,
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

  const saveItem = async () => {
    if (!itemForm.name_ar.trim() || !itemForm.category_id || itemForm.price === '') return
    setItemSaving(true)
    try {
      // Full body every time -- ProductIn has no partial-patch semantics, see file header.
      const body = {
        name_ar: itemForm.name_ar, name_en: itemForm.name_en || null,
        description_ar: itemForm.description_ar || null,
        price: Number(itemForm.price), image_url: itemForm.image_url || null,
        category_id: itemForm.category_id, is_featured: itemForm.is_featured,
        is_active: itemForm.is_active,
      }

      let savedId = editingItem?.id

      if (editingItem) {
        await adminApi.patch(`/store/products/${editingItem.id}`, body)
      } else {
        const res = await adminApi.post('/store/products', body)
        savedId = res.data.data.id
      }

      if (imageFile && savedId) {
        const { url } = await upload(imageFile, { context: 'catalog_item', category_id: itemForm.category_id, item_id: savedId })
        await adminApi.patch(`/store/products/${savedId}`, { ...body, image_url: url })
      }

      loadItems(itemCatFilter || undefined)
      setShowItemModal(false)
    } catch (err) {
      alert(err?.response?.data?.detail ?? 'حدث خطأ')
    } finally {
      setItemSaving(false)
    }
  }

  // Hide/show: PATCH is_active only -- never DELETE (hard delete in store.py, see file header).
  const toggleItemActive = async (item) => {
    await adminApi.patch(`/store/products/${item.id}`, {
      name_ar: item.name_ar, name_en: item.name_en, description_ar: item.description_ar,
      price: item.price, image_url: item.image_url, category_id: item.category_id,
      is_featured: item.is_featured, is_active: !item.is_active,
    })
    loadItems(itemCatFilter || undefined)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['categories', 'الأقسام'], ['items', 'المنتجات'], ['orders', 'الطلبات']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubView(id)}
            style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: FONT, border: 'none',
              background: subView === id ? color : T.cardBg,
              color: subView === id ? '#0a0a0f' : T.textSecond,
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {subView === 'orders' ? (
        <OrdersTab activeServices={activeServices} color={color} currency={currency} />
      ) : subView === 'categories' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}>أقسام المتجر</span>
            <Button variant="primary" color={color} onClick={openCreateCat}>+ قسم جديد</Button>
          </div>
          {catLoading ? (
            <p style={{ color: T.textMuted, fontSize: 13 }}>جاري التحميل...</p>
          ) : categories.length === 0 ? (
            <Card padding={0} style={{ textAlign: 'center' }}>
              <EmptyState icon="📦" message="لا توجد أقسام بعد — أضف أول قسم للمتجر" />
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {categories.map((cat, index) => (
                <Card key={cat.id} padding={16} style={{ opacity: cat.is_active ? 1 : 0.55 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: T.textPrimary, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cat.name_ar}
                    </div>
                    {!cat.is_active && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: `${T.textMuted}22`, color: T.textMuted, fontWeight: 600, flexShrink: 0 }}>
                        مخفي
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Button variant="secondary" size="sm" onClick={() => openEditCat(cat)}>تعديل</Button>
                    <Button variant={cat.is_active ? 'danger' : 'secondary'} size="sm" onClick={() => toggleCatActive(cat)}>
                      {cat.is_active ? 'إخفاء' : 'إظهار'}
                    </Button>
                    <div style={{ display: 'flex', gap: 2, marginInlineStart: 'auto' }}>
                      <button type="button" onClick={() => moveCat(index, -1)} disabled={index === 0}
                        style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.cardBg, color: T.textSecond, cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.4 : 1 }}>↑</button>
                      <button type="button" onClick={() => moveCat(index, 1)} disabled={index === categories.length - 1}
                        style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.cardBg, color: T.textSecond, cursor: index === categories.length - 1 ? 'default' : 'pointer', opacity: index === categories.length - 1 ? 0.4 : 1 }}>↓</button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}>منتجات المتجر</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select style={{ ...inputStyle, width: 'auto' }} value={itemCatFilter} onChange={e => setItemCatFilter(e.target.value)}>
                <option value="">كل الأقسام</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
              <Button variant="primary" color={color} onClick={openCreateItem} disabled={categories.length === 0}>+ منتج جديد</Button>
            </div>
          </div>

          {itemsLoading ? (
            <p style={{ color: T.textMuted, fontSize: 13 }}>جاري التحميل...</p>
          ) : items.length === 0 ? (
            <Card padding={0}>
              <EmptyState message="لا توجد منتجات بعد" />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(item => (
                <Card key={item.id} padding="14px 18px" style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: item.is_active ? 1 : 0.55 }}>
                  {item.image_url && (
                    <img src={item.image_url} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: T.textPrimary }}>{item.name_ar}</div>
                      {!item.is_active && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: `${T.textMuted}22`, color: T.textMuted, fontWeight: 600, flexShrink: 0 }}>
                          مخفي
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>{catNameFor(item.category_id)}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color, flexShrink: 0 }}>
                    {item.price} {currency}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Button variant="secondary" size="sm" onClick={() => openEditItem(item)}>تعديل</Button>
                    <Button variant={item.is_active ? 'danger' : 'secondary'} size="sm" onClick={() => toggleItemActive(item)}>
                      {item.is_active ? 'إخفاء' : 'إظهار'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {showCatModal && (
        <Modal
          title={editingCat ? 'تعديل القسم' : 'قسم جديد'}
          onClose={() => setShowCatModal(false)}
          onSave={saveCat}
          saving={catSaving}
        >
          <Field label="اسم القسم (عربي) *">
            <input style={inputStyle} value={catForm.name_ar} onChange={e => setCatForm(p => ({ ...p, name_ar: e.target.value }))} placeholder="مثال: منتجات العناية" />
          </Field>
          <Field label="اسم القسم (إنجليزي)">
            <input style={inputStyle} value={catForm.name_en} onChange={e => setCatForm(p => ({ ...p, name_en: e.target.value }))} placeholder="e.g. Grooming Products" />
          </Field>
        </Modal>
      )}

      {showItemModal && (
        <Modal
          title={editingItem ? 'تعديل المنتج' : 'منتج جديد'}
          onClose={() => setShowItemModal(false)}
          onSave={saveItem}
          saving={itemSaving}
        >
          <Field label="اسم المنتج (عربي) *">
            <input style={inputStyle} value={itemForm.name_ar} onChange={e => setItemForm(p => ({ ...p, name_ar: e.target.value }))} placeholder="مثال: سبراي تثبيت الشعر" />
          </Field>
          <Field label="اسم المنتج (إنجليزي)">
            <input style={inputStyle} value={itemForm.name_en} onChange={e => setItemForm(p => ({ ...p, name_en: e.target.value }))} placeholder="e.g. Hair Fixing Spray" />
          </Field>
          <Field label="الوصف">
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} value={itemForm.description_ar} onChange={e => setItemForm(p => ({ ...p, description_ar: e.target.value }))} placeholder="وصف مختصر (اختياري)" />
          </Field>
          <Field label="القسم *">
            <select style={inputStyle} value={itemForm.category_id} onChange={e => setItemForm(p => ({ ...p, category_id: e.target.value }))}>
              {categories.length === 0 && <option value="">لا توجد أقسام بعد</option>}
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
          </Field>
          <Field label={`السعر (${currency})`}>
            <input type="number" style={inputStyle} value={itemForm.price} onChange={e => setItemForm(p => ({ ...p, price: e.target.value }))} placeholder="0" />
          </Field>

          <Field label="الصورة">
            {imagePreview && (
              <img src={imagePreview} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', marginBottom: 10, display: 'block' }} />
            )}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
              background: T.pageBg,
              border: `1px dashed ${imageFile ? color : T.border}`,
              color: imageFile ? color : T.textMuted,
              fontSize: 13, fontFamily: FONT,
            }}>
              {imageFile ? imageFile.name : 'اختر صورة من جهازك'}
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
            {uploadError && <div style={{ fontSize: 12, color: T.danger, marginTop: 6 }}>{uploadError}</div>}
          </Field>
        </Modal>
      )}
    </div>
  )
}
