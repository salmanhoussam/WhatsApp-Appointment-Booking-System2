# Phase 70E — Olivello Store Flow
# تاريخ: 2026-05-21
# الهدف: ربط showcase بالمتجر — ProductsSection + floating cart

---

## التحليل

Routes مكتملة بالفعل في olivello.routes.jsx:
- /olivello/store  → CatalogPage  (generic ✅ — TenantConfigProvider + useCatalog)
- /olivello/cart   → CartPage     (generic ✅ — useGenericStore moduleKey='store')
- GoldenDropSection CTA buttons → /olivello/store ✅

ما ينقص:
1. ProductsSection — Section 8 داخل OlivelloShowcase (منتجات branded داخل الـ showcase)
2. Floating cart button على الـ showcase page

---

## Agent Assignment

### Agent 1: Frontend-Architect-Agent
**الملف:** `frontend/src/pages/olivello/sections/ProductsSection.jsx`

**Specs:**
```
- عنوان الـ section: "اختر زيتك" / "Choose Your Oil"
- Background: oklch(19% 0.05 95) — انتقال سلس من GoldenDropSection
- يسحب المنتجات من API: GET /public/store/products?client_slug=olivello
- فيلتر بسيط بالـ categories (horizontal pills)
- 4 بطاقات في صف (grid 2×2 mobile, 4 desktop)
- كل بطاقة:
  - صورة أو placeholder ذهبي (إذا لا صورة)
  - name_ar (Tajawal font)
  - وصف مختصر (سطر واحد)
  - سعر بذهب
  - زر "أضف للسلة" (يستخدم useGenericStore.addItem)
- لما يُضاف عنصر: micro-animation على الزر (scale bounce)
- Cart FAB: عند وجود cartItems > 0 يظهر زر ثابت في الأسفل
  - يوجّه إلى /olivello/cart
  - يظهر عدد العناصر
- Colors: olivello palette (oklch(78% 0.16 72) للـ accent, لا أزرق)
- No Tailwind — pure inline styles only (consistent with other sections)
```

### Agent 2: Main Agent (هذه المحادثة)
**المسؤولية:** تحديث OlivelloShowcase.jsx لإضافة ProductsSection

---

## ترتيب التنفيذ

```
1. كتابة ProductsSection.jsx (API fetch + grid + cart)
2. تحديث OlivelloShowcase.jsx (إضافة Section 8)
3. اختبار: /olivello/home → scroll إلى آخر section → أضف منتج → انتقل إلى /olivello/cart
4. تحقق من /olivello/store (CatalogPage) يشتغل بدون مشاكل
```

---

## معيار النجاح

```
✅ ProductsSection يظهر بعد GoldenDropSection
✅ المنتجات تُحمَّل من الـ API (11 منتج)
✅ فيلتر الـ categories يشتغل
✅ "أضف للسلة" يحدّث الـ cart badge
✅ Cart FAB يظهر عند وجود عناصر
✅ /olivello/cart يستكمل الـ checkout
✅ لا تعارض بين useOlivelloStore و useGenericStore
```

---

## ملاحظة مهمة

useGenericStore و useOlivelloStore منفصلان — الـ generic pages (CatalogPage/CartPage)
تستخدم useGenericStore فقط. ProductsSection سيستخدم useGenericStore أيضاً
حتى تكون السلة موحدة بين الـ showcase والـ /olivello/store page.
