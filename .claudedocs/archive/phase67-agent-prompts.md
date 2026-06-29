# Phase 67 — Canvas Page Editor: Agent Prompts
**التاريخ:** 2026-05-18  
**الهدف:** تحويل PageBuilderTab من نموذج قائمة إلى محرر Canvas بصري مثل Canva

---

## الخلاصة السريعة (اقرأها أولاً)

**الملفات الحالية:**
- `frontend/src/pages/generic-admin/tabs/PageBuilderTab.jsx` ← 1,297 سطر — القائمة + الـ editors
- `frontend/src/pages/generic-admin/tabs/SettingsTab.jsx` ← إعدادات الـ tenant
- `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx` ← يستدعي كليهما

**الهدف النهائي:**
```
frontend/src/pages/generic-admin/tabs/
├── CanvasPageEditor.jsx   ← جديد: Canva-style 3-panel editor
├── PageBuilderTab.jsx     ← يبقى كـ backup (لا تحذفه)
└── SettingsTab.jsx        ← يبقى كـ named export يُستخدم في الـ right panel
```

**Layout المطلوب (مثل الصورة المرفقة):**
```
┌─────────────────────────────────────────────────────────┐
│  TOOLBAR: [Template ▾] [💾 حفظ] [👁 معاينة]            │
├──────────┬──────────────────────────────┬───────────────┤
│   LEFT   │         CANVAS (وسط)         │     RIGHT     │
│  220px   │  flex-1, overflow-y: auto     │    300px      │
│          │                              │               │
│ قائمة    │  ┌────────────────────┐      │  بدون تحديد:  │
│ أقسام:   │  │  🌄 Hero            │◄━━━ │  إعدادات      │
│          │  │  (selected+glow)   │      │  الموقع       │
│ 🌄 Hero  │  └────────────────────┘      │               │
│ 🏷 Offers│  ┌────────────────────┐      │  مع تحديد:    │
│ 🖼 Gallery│  │  🏷 Offers          │      │  محرر القسم  │
│          │  └────────────────────┘      │  المحدد       │
│ [+ قسم]  │  ┌────────────────────┐      │               │
│          │  │  🖼 Gallery          │      │               │
│ Templates│  └────────────────────┘      │               │
└──────────┴──────────────────────────────┴───────────────┘
```

---

## PROMPT A — dashboard-builder
**المهمة:** بناء `CanvasPageEditor.jsx` (الهيكل + الـ layout)

```
أنت dashboard-builder. مهمتك بناء ملف جديد:
frontend/src/pages/generic-admin/tabs/CanvasPageEditor.jsx

## السياق

هذا replacement لـ PageBuilderTab.jsx — نفس الوظيفة لكن بـ Canva-style layout.

### الملف الحالي (اقرأه كاملاً قبل البدء):
frontend/src/pages/generic-admin/tabs/PageBuilderTab.jsx

الملف الحالي يحتوي على:
- SECTION_TYPES: مصفوفة 10 أنواع (hero, offers, story, featured_items, categories_grid, gallery, testimonials, hours, location, cta)
- DEFAULT_DATA: بيانات افتراضية لكل نوع
- TEMPLATE_OPTIONS: 5 قوالب جاهزة (restaurant, cafe_minimal, store_classic, booking_showcase, landing)
- Section Editors: HeroEditor, OffersEditor, StoryEditor, FeaturedItemsEditor, CategoriesGridEditor, GalleryEditor, TestimonialsEditor, HoursEditor, LocationEditor, CtaEditor
- Field, ImageUploadField, BgImageField: field atoms
- useImageUpload hook
- adminApi للحفظ

### الملف الجديد يجب أن:

1. يستورد ويُعيد استخدام من PageBuilderTab (DON'T re-invent):
   - SECTION_TYPES, DEFAULT_DATA, TEMPLATE_OPTIONS
   - جميع الـ Section Editors (HeroEditor ... CtaEditor)
   - Field, ImageUploadField, BgImageField atoms
   - uid() function

2. يضيف layout جديد — 3 columns:

### LEFT PANEL (220px, fixed height, overflow-y: auto):
- عنوان "الأقسام" + زر [+ إضافة] في الأعلى
- قائمة الأقسام الحالية كـ thumbnail cards (بالترتيب)
  - كل card: icon + labelAr + زر 🗑 عند hover
  - الـ card المحدد: gold border + gold background خفيفة
  - click على card → selectedSectionId = section.id
- DnD-kit لإعادة ترتيب الأقسام (نفس الـ DndContext الموجود في PageBuilderTab)
- في الأسفل: Template picker (dropdown أو 5 أزرار صغيرة ملوّنة)

### CENTER CANVAS (flex-1, overflow-y: auto, padding 24px):
- كل قسم يُعرض كـ visual block بالترتيب
- كل block:
  - Header bar: `[icon] [labelAr] [type]` مع خلفية ملوّنة خفيفة
  - Content preview: عرض أول 2-3 حقول كـ text (عنوان، subtitle) أو thumbnail صغير إذا في bg_image_url
  - على hover: border يظهر + زر [↑][↓][✕] في الكورنر الأيمن
  - عند التحديد (selectedSectionId === section.id): border: 2px solid #d4a853 + box-shadow gold خفيف
- Click على أي block → selectedSectionId = section.id
- لا تستخدم React rendering للـ actual page sections — هذا مجرد visual cards

### RIGHT PANEL (300px, fixed, overflow-y: auto):
- إذا selectedSectionId === null: اعرض SettingsPanel
  - استورد SettingsTab كـ named export: import { SettingsPanel } from './SettingsTab'
  - إذا SettingsTab مش كـ named export، wrap it: <SettingsTab config={config} onSave={handleSave} />
- إذا selectedSectionId !== null: اعرض section editor المناسب
  - AnimatePresence key={selectedSectionId} — slide-in من اليمين
  - Header: [← رجوع] + اسم القسم
  - Section editor component المناسب

### TOOLBAR (height 52px, sticky top):
- اليسار: dropdown لاختيار template
- اليمين: [💾 حفظ الكل] — نفس منطق الحفظ في PageBuilderTab (PUT /api/v1/admin/client/config)

### STATE:
```js
const [sections, setSections] = useState([])
const [selectedSectionId, setSelectedSectionId] = useState(null)
const [saving, setSaving] = useState(false)
const [dirty, setDirty] = useState(false)  // true عند أي تعديل
```

### PROPS (نفس PageBuilderTab):
```js
CanvasPageEditor.propTypes = {
  config: PropTypes.object,     // Client.config
  onUpdate: PropTypes.func,     // callback بعد الحفظ
}
```

### API (نفس PageBuilderTab بالضبط):
```js
// حفظ
PUT /api/v1/admin/client/config
body: { content: { sections, template_key, page_type } }
```

## Mobile breakpoint (<768px):
- LEFT panel: يصير drawer (position: fixed, left: 0, top: 0) يفتح بزر ☰ في الـ toolbar
- RIGHT panel: يصير bottom sheet (position: fixed, bottom: 0) يظهر عند تحديد قسم
- CENTER: عرض كامل (flex-1)

## Color palette (استخدم نفس C object من PageBuilderTab):
```js
const C = {
  bg: '#0a0a0f', surface: '#12121a', surfaceHi: '#1a1a28',
  border: 'rgba(255,255,255,0.07)', borderHi: 'rgba(255,255,255,0.14)',
  text: '#f0f0f5', muted: '#6b6b80',
  gold: '#d4a853', goldDim: 'rgba(212,168,83,0.10)', goldBorder: 'rgba(212,168,83,0.28)',
  green: '#3ecf8e', red: '#f87171',
}
```

## ما يجب التحقق منه بعد الكتابة:
1. لا imports مكسورة — كل import موجود في الملفات الفعلية
2. SECTION_TYPES, DEFAULT_DATA, TEMPLATE_OPTIONS مستوردة أو معرّفة (لا تكررها إذا ممكن import)
3. Section editors كلها تعمل نفس ما كانت في PageBuilderTab
4. الـ save function تستدعي نفس الـ API endpoint
5. لا تكسر PageBuilderTab.jsx — اتركه كما هو

اكتب الملف الكامل وجاهز للـ production.
```

---

## PROMPT B — Frontend-Architect-Agent
**المهمة:** تحسين الـ canvas blocks + animations + keyboard

```
أنت Frontend-Architect-Agent. مهمتك تحسين CanvasPageEditor.jsx بعد ما dashboard-builder بناها.

### اقرأ أولاً:
frontend/src/pages/generic-admin/tabs/CanvasPageEditor.jsx  ← الملف الذي بناه dashboard-builder

### التحسينات المطلوبة:

## 1. Canvas Section Blocks (الـ visual cards في الوسط)

كل section block يجب أن يعرض:
- Header: خلفية ملوّنة خفيفة حسب نوع القسم (hero → gold, offers → orange, gallery → purple, etc.)
- Content preview مناسب لكل type:
  - hero: يعرض title_ar إذا موجود، وإلا placeholder "عنوان الهيرو"
  - offers: يعرض عدد العروض "X عروض"
  - gallery: يعرض عدد الصور أو thumbnail أول صورة
  - hours: يعرض "X أيام" أو "أوقات العمل"
  - testimonials: يعرض عدد التقييمات
  - باقي الأنواع: يعرض heading_ar أو placeholder
- Aspect ratio: حافظ على height ثابت (120px لكل block) + gap بينهم

## 2. Hover Overlay
على hover على أي section block:
- يظهر overlay شفاف بـ 3 أزرار في الكورنر الأيسر (RTL):
  - [↑] move up — يحرك القسم للأعلى (أو استخدم DnD)
  - [↓] move down — يحرك للأسفل
  - [🗑] delete — يحذف مع confirmation toast
- كل زر: 28x28px، خلفية rgba(0,0,0,0.6)، border radius 6
- transition: opacity 0.15s

## 3. Animations (Framer Motion)
- section blocks: layout="position" على كل block للـ reorder animation السلسة
- إضافة قسم جديد: initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
- حذف قسم: exit={{ opacity: 0, x: -20 }} — داخل <AnimatePresence>
- right panel switch: AnimatePresence key={selectedSectionId} initial={{ x: 20, opacity: 0 }}

## 4. Keyboard Support
```js
useEffect(() => {
  const onKey = (e) => {
    if (!selectedSectionId) return
    if (e.key === 'Escape') setSelectedSectionId(null)
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // فقط إذا focus مش في input/textarea
      if (document.activeElement.tagName !== 'INPUT' && 
          document.activeElement.tagName !== 'TEXTAREA') {
        handleDeleteSection(selectedSectionId)
      }
    }
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [selectedSectionId])
```

## 5. Dirty State Indicator
- إذا dirty === true: الـ save button يصير gold glowing + نص "💾 حفظ*"
- بعد الحفظ: dirty = false + toast "تم الحفظ ✓" لمدة 2 ثانية

## 6. Empty State
- إذا sections.length === 0: عرض في الـ canvas:
  ```
  [شبكة نقاط خفيفة كخلفية]
  + اختر قالب جاهز أو أضف قسماً يدوياً
  [زر: اختيار قالب] [زر: إضافة قسم]
  ```

## قواعد لا تخترقها:
- لا تغيّر DATA STRUCTURES (sections, DEFAULT_DATA, TEMPLATE_OPTIONS)
- لا تغيّر API calls
- لا تضيف libraries جديدة — framer-motion + @dnd-kit موجودين
- كل animation: ease-out, max 300ms — لا bounce

اكتب التعديلات على CanvasPageEditor.jsx فقط.
```

---

## PROMPT C — dashboard-builder
**المهمة:** تحديث `GenericAdminDashboard.jsx` لاستخدام الـ editor الجديد

```
أنت dashboard-builder. مهمتك تحديث GenericAdminDashboard.jsx لاستخدام CanvasPageEditor.

### اقرأ أولاً:
1. frontend/src/pages/generic-admin/GenericAdminDashboard.jsx  ← كامل
2. frontend/src/pages/generic-admin/tabs/CanvasPageEditor.jsx  ← الجديد

### التغييرات المطلوبة:

## 1. استبدال الـ import
```js
// احذف:
import PageBuilderTab from './tabs/PageBuilderTab'

// أضف:
import CanvasPageEditor from './tabs/CanvasPageEditor'
```

## 2. استبدال الـ render
ابحث عن الجزء الذي يعرض PageBuilderTab (حسب activeTab):
```js
// احذف:
{activeTab === 'pagebuilder' && <PageBuilderTab config={config} onUpdate={handleConfigUpdate} />}

// أضف:
{activeTab === 'pagebuilder' && <CanvasPageEditor config={config} onUpdate={handleConfigUpdate} />}
```

## 3. الـ Settings Tab
- إذا كان SettingsTab يظهر كـ tab منفصل: احتفظ به لأن CanvasPageEditor يعرضه في الـ right panel تلقائياً عند عدم التحديد
- لا تحذف SettingsTab من الـ imports — CanvasPageEditor قد يستخدمه

## 4. Tab label (اختياري)
- غيّر label تبويبة Page Builder من "بنّاء الصفحات" إلى "محرر الصفحة"

## ما يجب التحقق منه:
1. config prop يوصل صح لـ CanvasPageEditor
2. handleConfigUpdate / onUpdate callback مربوط
3. لا يوجد duplicate imports
4. الملف يُحفظ ولا في أخطاء syntax

اكتب الـ diff الكامل أو الملف كاملاً.
```

---

## PROMPT D — memory-keeper
**المهمة:** تحديث الذاكرة بعد اكتمال Phase 67

```
أنت memory-keeper. Phase 67 (Canvas Page Editor) اكتمل. حدّث الذاكرة.

### ما تم إنجازه:
- CanvasPageEditor.jsx (جديد) — Canva-style 3-panel editor
  - LEFT: section list + DnD reorder + template picker
  - CENTER: visual canvas — section blocks قابلة للنقر
  - RIGHT: settings panel (بدون تحديد) أو section editor (مع تحديد)
  - MOBILE: left drawer + bottom sheet
- GenericAdminDashboard.jsx محدّث ليستخدم CanvasPageEditor بدل PageBuilderTab
- PageBuilderTab.jsx تبقى كـ backup — لم تُحذف

### ما يجب تحديثه في الذاكرة:
1. platform_saas_merge.md: أضف "Phase 67 ✅ CanvasPageEditor — Canva-style, 3 panels, mobile-first"
2. phase67_canvas_editor.md: حدّث الحالة من "planned" إلى "✅ Done [date]"
3. MEMORY.md: أضف سطر جديد أو حدّث الموجود

### لا تحذف:
- أي memory entries سابقة
- معلومات Phase 66 (ProChatbot)
- ARCH-01 status

اقرأ الملفات الحالية أولاً قبل الكتابة.
```

---

## ترتيب التنفيذ

```
Step 1: نفّذ PROMPT A (dashboard-builder) ← الهيكل الكامل
         ↓ تحقق: الملف يُبنى بدون أخطاء import
         
Step 2: نفّذ PROMPT B (Frontend-Architect-Agent) ← الـ animations والـ UX
         ↓ تحقق: الـ canvas blocks تظهر، الـ click يعمل، الـ animation سلسة
         
Step 3: نفّذ PROMPT C (dashboard-builder) ← الربط مع الـ dashboard
         ↓ تحقق: تبويبة "محرر الصفحة" تُظهر الـ canvas editor

Step 4: اختبر يدوياً:
         - افتح demo.salmansaas.com/[slug]/admin
         - اضغط "محرر الصفحة"
         - تحقق: 3 أعمدة تظهر صح
         - أضف قسم → يظهر في الـ canvas
         - اضغط على قسم → يُفتح editor في اليمين
         - اسحب قسم → يتحرك بـ animation
         - احفظ → API call يُرسل صح
         - موبايل: بدّل عرض الشاشة لـ 375px وتحقق من drawer + bottom sheet

Step 5: نفّذ PROMPT D (memory-keeper) ← تحديث الذاكرة
```

---

## نقاط الفشل الشائعة (تجنّبها)

| الخطأ | الحل |
|-------|------|
| Import circular بين CanvasPageEditor و PageBuilderTab | لا تستورد CanvasPageEditor من PageBuilderTab — فقط العكس |
| SettingsTab ما عنده named export | إذا ما في named export: `const SettingsPanel = SettingsTab` في CanvasPageEditor |
| DnD-kit conflict (دو DndContext) | CanvasPageEditor له DndContext واحد فقط |
| Animation layout shift | استخدم `layout="position"` مش `layout` على section blocks |
| Mobile bottom sheet فوق الـ keyboard | أضف `padding-bottom: env(safe-area-inset-bottom)` |
| Dirty state يُفعَّل عند التحميل | setDirty(true) فقط في onChange handlers، مش في useEffect الأولي |
