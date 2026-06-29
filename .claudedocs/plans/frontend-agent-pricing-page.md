# Frontend Agent Plan — Pricing Page
# Phase: SalmanSaaS Marketing Site
# Priority: 🔴 URGENT — بدونها لا تحويل للعملاء
# تاريخ: 2026-06-29

---

## الهدف

بناء صفحة `/pricing` على `demo.salmansaas.com` تعرض:
- 3 خطط اشتراك واضحة (Starter / Growth / Enterprise)
- مقارنة بالمنافسين (Bolt / Shopify / Bubble)
- نموذج "طلب عرض" (Lead Capture)
- كل شيء بالعربية أولاً، مع دعم الإنجليزية

---

## الملف المستهدف

```
frontend/src/pages/showcase/PricingPage.jsx
```

وإضافة route في:
```
src/router/tenants/  ← أو App.jsx كـ static route
```

---

## تصميم الصفحة (Layout)

```
┌─────────────────────────────────────────┐
│  HERO: "كل عمل يستحق موقعاً جاهزاً"   │
│  subtitle + CTA صغير                    │
├─────────────────────────────────────────┤
│  PRICING CARDS (3 بطاقات)               │
│  Starter $29 | Growth $49 | Enterprise $99 │
│  ← البطاقة الوسطى (Growth) = مميزة      │
├─────────────────────────────────────────┤
│  COMPARISON TABLE                       │
│  نحن vs Bolt vs Shopify vs Bubble       │
├─────────────────────────────────────────┤
│  LEAD CAPTURE FORM                      │
│  اسم + رقم واتساب + نوع العمل          │
│  زر: "ابدأ اليوم ←"                    │
└─────────────────────────────────────────┘
```

---

## بيانات الـ Pricing Cards

```js
const plans = [
  {
    name_ar: "البداية",
    name_en: "Starter",
    price: 29,
    currency: "USD",
    features_ar: [
      "موقع واحد كامل",
      "WhatsApp Bot أساسي",
      "لوحة تحكم بسيطة",
      "دعم عبر البريد الإلكتروني",
      "شهادة SSL مجانية",
    ],
    cta: "ابدأ مجاناً",
    highlighted: false,
  },
  {
    name_ar: "النمو",
    name_en: "Growth",
    price: 49,
    currency: "USD",
    features_ar: [
      "كل ميزات Starter",
      "مواقع متعددة (حتى 3)",
      "WhatsApp Bot متقدم + إشعارات",
      "إحصائيات الزوار",
      "دعم أولوية",
      "تكاملات الدفع المحلية",
    ],
    cta: "ابدأ الآن",
    highlighted: true, // ← البطاقة المميزة
    badge: "الأكثر شيوعاً",
  },
  {
    name_ar: "المؤسسات",
    name_en: "Enterprise",
    price: 99,
    currency: "USD",
    features_ar: [
      "كل ميزات Growth",
      "مواقع غير محدودة",
      "تكاملات مخصصة",
      "مدير حساب مخصص",
      "ضمان SLA 99.9%",
      "تقارير متقدمة",
    ],
    cta: "تواصل معنا",
    highlighted: false,
  },
];
```

---

## بيانات Comparison Table

```js
const comparison = [
  { feature: "عربي أولاً (RTL)", us: true,  bolt: false, shopify: false, bubble: false },
  { feature: "WhatsApp Native",   us: true,  bolt: false, shopify: false, bubble: false },
  { feature: "جاهز خلال 24 ساعة",us: true,  bolt: false, shopify: false, bubble: false },
  { feature: "Fully Managed",     us: true,  bolt: false, shopify: true,  bubble: false },
  { feature: "Zero Commission",   us: true,  bolt: true,  shopify: false, bubble: true  },
  { feature: "دفع محلي (Whish/OMT)", us: true, bolt: false, shopify: false, bubble: false },
  { feature: "لا تحتاج مطور",    us: true,  bolt: false, shopify: true,  bubble: false },
];
```

---

## Lead Capture Form

```jsx
// إرسال مؤقت عبر ntfy أو WhatsApp redirect
// لاحقاً: POST /api/v1/public/leads

const handleSubmit = async (e) => {
  e.preventDefault();
  const { name, phone, business_type } = formData;

  // مؤقت: فتح واتساب مع البيانات
  const msg = `مرحباً، أريد البدء مع SalmanSaaS!%0aالاسم: ${name}%0aنوع العمل: ${business_type}`;
  window.open(`https://wa.me/96XXXXXXXX?text=${msg}`, '_blank');
};
```

---

## Design Tokens (GS MAR)

```css
/* بطاقة عادية */
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 20px;
backdrop-filter: blur(12px);

/* بطاقة مميزة (Growth) */
background: rgba(212,168,83,0.12);  /* gold glass */
border: 1px solid rgba(212,168,83,0.4);
box-shadow: 0 0 40px rgba(212,168,83,0.15);
```

---

## Animation (Framer Motion)

```js
// Cards stagger
const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const card = {
  hidden: { opacity: 0, y: 30 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", stiffness: 70, damping: 20, mass: 1.5 } }
};
```

---

## Route

```jsx
// في App.jsx أو showcase.routes.jsx
<Route path="/pricing" element={<PricingPage />} />
```

URL النهائي: `demo.salmansaas.com/pricing`

---

## Checklist للـ Agent

```
□ PricingPage.jsx — 3 cards + comparison + form
□ Framer Motion stagger على الـ cards
□ GS MAR glassmorphism tokens مطبّقة
□ RTL-aware (dir="rtl" على الصفحة)
□ بطاقة Growth مميزة (border gold + badge)
□ Comparison Table — checkmarks واضحة
□ Lead Form — WhatsApp redirect مؤقت
□ Mobile responsive (cards تصبح stack على موبايل)
□ Route مضافة
□ اختبار على localhost:5173/pricing
```

---

## الأسئلة الثلاثة — الإجابة النهائية

**السؤال 1:** نبدأ بـ Pricing Page؟
→ ✅ نعم — الأولوية الأولى. بدونها لا تحويل للعملاء.

**السؤال 2:** نحسّن WhatsApp Bot؟
→ 🔄 بعد Pricing Page — تحسينه يصبح أكثر قيمة حين يكون لدينا عملاء جدد.

**السؤال 3:** نبني Client Dashboard؟
→ 🔄 ثالثاً — يُبنى حين يكون لدينا عملاء فعليون يحتاجونه.

**الترتيب:**
```
1. Pricing Page  → جذب العملاء
2. Lead Form     → تحويلهم
3. How it Works  → إقناعهم
4. Dashboard     → إبقاؤهم
5. WhatsApp Bot  → تحسين التجربة
```
