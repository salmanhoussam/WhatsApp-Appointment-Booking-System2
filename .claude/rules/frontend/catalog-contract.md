paths: "frontend/src/pages/**"

# Catalog Data Contract — Frontend Rules
# ⚠️ قرأ هذا قبل بناء أي صفحة مطعم أو متجر أو كاتالوج

---

## 1. الحقل الوحيد لتعريف العنصر هو `id` من CatalogItem

كل عنصر في القائمة (menu item) أو المتجر (product) هو `CatalogItem` في الباكند.
المعرف الوحيد المقبول في الـ store وفي الـ API هو:

| السياق | الاسم الصحيح | ❌ لا تستخدم |
|--------|-------------|-------------|
| Zustand store key | `catalogItemId` (restaurant) أو `catalog_item_id` (store) | `menuItemId`, `productId`, `product_id`, `menu_item_id` |
| API payload | `catalog_item_id` | `menu_item_id`, `product_id` |
| React key prop | `item.id` أو `item.catalogItemId` | `item.menuItemId`, `item.productId` |

---

## 2. Zustand Store Pattern — Restaurant

```js
// ✅ صح
addItem: (item) => {
  const existing = state.cartItems.find((i) => i.catalogItemId === item.catalogItemId);
  // ...
  return { cartItems: [...state.cartItems, { ...item, quantity: 1 }] };
}

// ❌ غلط — كان مستخدم قبل Phase 54
addItem: (item) => {
  const existing = state.cartItems.find((i) => i.menuItemId === item.menuItemId);
}
```

عند استدعاء `addItem` من الصفحة:
```js
// ✅ صح
addItem({ catalogItemId: item.id, price: Number(item.price), name_ar: item.name_ar })

// ❌ غلط
addItem({ menuItemId: item.id, ... })
```

---

## 3. Zustand Store Pattern — Store/E-commerce

```js
// ✅ صح
{ catalog_item_id: product.id, quantity, product }

// ❌ غلط
{ product_id: product.id, quantity, product }
```

---

## 4. API Payload — Restaurant Orders

```js
// POST /public/restaurant/orders
// ✅ صح
items: cartItems.map((i) => ({ catalog_item_id: i.catalogItemId, quantity: i.quantity }))

// ❌ غلط — كسر مع Phase 54
items: cartItems.map((i) => ({ menu_item_id: i.menuItemId, quantity: i.quantity }))
```

---

## 5. API Payload — Store Cart

```js
// POST /public/store/cart
// ✅ صح
{ session_id, catalog_item_id: product.id, quantity }

// ❌ غلط
{ session_id, product_id: product.id, quantity }

// DELETE /public/store/cart/{session_id}/items/{catalog_item_id}
// ✅ صح: المعرف في URL هو catalog_item_id
```

---

## 6. حقول الـ API Response

الـ API يرجع هذه الحقول من `CatalogItem`:

```js
{
  id,             // UUID — استخدمه كـ catalogItemId في الـ store
  name_ar,
  name_en,
  description_ar,
  description_en,
  image_url,
  price,          // Decimal → اعمل له Number() قبل الحسابات
  currency,
  is_available,   // restaurant: true/false (isActive)
  is_active,      // store: true/false
  is_featured,
  sort_order,
  category_id,
  metadata,       // JSON خاص بالـ module: { calories, spicy } أو { variants, discount, brand }
}
```

---

## 7. لماذا تغيّر — السياق التاريخي

قبل **Phase 54** (2026-05-05):
- المطاعم كانت تستخدم `MenuCategory` + `MenuItem` → الـ ID كان `menuItemId`
- المتاجر كانت تستخدم `StoreCategory` + `StoreProduct` → الـ ID كان `productId`/`product_id`

بعد **Phase 54**:
- كل شيء أصبح `CatalogCategory` + `CatalogItem` → الـ ID موحّد: `id` / `catalogItemId` / `catalog_item_id`
- 7 جداول انحذفت، جدولان يكفيان لكل module

**أي client جديد (صالون، خدمات، متجر جديد) يبني فرونتند:**
→ يستخدم هذه القواعد مباشرة، لا يخترع أسماء حقول جديدة.
