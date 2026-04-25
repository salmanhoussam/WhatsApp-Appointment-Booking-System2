# تقرير فحص وإعادة هيكلة `.claudedocs/`
**التاريخ:** 24 أبريل 2026

---

## الهيكل الحالي — مع تحديد المشاكل

```
.claudedocs/
│
├── ⚠️ phases_roadmap.yaml          [123KB — 2419 سطر] ← HEAVY جداً
├── ⚠️ database_report.md           [20KB]  ← تاريخ التحديث: 21 أبريل (قديم؟)
├── roadmap_audit_april.md          [12KB]  ← آخر audit ✅
├── routing_architecture.md         [5KB]   ✅
├── خطة_المحتوى_الديناميكي.md       [4.5KB] ✅
├── new_tenant_checklist.md         [3KB]   ✅
├── frontend_structure.md           [3KB]   ✅ (لكن موجود نسخة أحدث في .claude/skills!)
├── schema_refactor_plan.md         [2KB]   ← تم تنفيذه — هل لازمني؟
├── database_pooler_plan.md         [2KB]   ← تم تنفيذه — هل لازمني؟
├── todo_list.md                    [1KB]   ← قديم (Phase 35 in progress؟)
│
├── resources/
│   └── developer-tools.md          ✅
│
└── sessions/
    ├── 2026-04-18.md               ✅ [5.7KB]
    ├── 2026-04-19.md               ✅ [12KB]
    ├── 2026-04-20.md               ✅ [7.1KB]
    ├── 2026-04-21.md               ✅ [19KB]
    ├── ⚠️ 22-04-2026.md            ← naming مختلف (DD-MM-YYYY)
    ├── ⚠️ 24-04-2026.md            ← naming مختلف (DD-MM-YYYY)
    └── ⚠️ Storage_Architecture_Plan.md ← مش session — غلط مكانه
```

---

## المشاكل المكتشفة — 6 مشاكل

### [DOC-01] ⚠️ `phases_roadmap.yaml` ثقيل جداً — 123KB / 2419 سطر
**المشكلة:** الـ agent يقرأ هذا الملف كاملاً في كل session. 123KB من YAML = context window ضخم بدون فائدة.
**السبب:** يحتوي على كل الـ phases من Phase 1 إلى Phase 50+ بالتفصيل.
**الحل:** قسّمه لـ 3 ملفات:
- `roadmap_completed.yaml` — الـ phases المكتملة (archive، لا يُقرأ تلقائياً)
- `roadmap_active.yaml` — الـ phase الحالية فقط (يُقرأ في كل session)
- `roadmap_upcoming.yaml` — الـ 3 phases القادمة (يُقرأ عند الحاجة)

---

### [DOC-02] ⚠️ `todo_list.md` قديم ومتعارض
**المشكلة:** يقول "Phase 35: In Progress" لكن الـ sessions تقول إننا في Phase 36+. الملف غير محدّث.
**الحل:** حدّثه أو احذفه — الـ sessions هي المصدر الحقيقي للحالة الراهنة.

---

### [DOC-03] ⚠️ `schema_refactor_plan.md` و `database_pooler_plan.md` — مُنفّذان
**المشكلة:** هذين الملفين يصفان خطط تم تنفيذها بالكامل (confirmed في الـ sessions).
**خطر:** الـ agent قد يعيد تنفيذ migrations أو يتعامل معهم كـ "pending tasks".
**الحل:** انقلهم لـ `archive/` — لا تحذفهم (مرجع تاريخي مهم).

---

### [DOC-04] ⚠️ `frontend_structure.md` — نسخة قديمة
**المشكلة:** موجودة هنا نسخة من قواعد الفرونتاند، لكن النسخة الأحدث والأكمل موجودة في `.claude/skills/frontend/frontend-component-builder/SKILL.md`.
**الحل:** احذف هذه النسخة أو حوّلها لـ redirect note.

---

### [DOC-05] ⚠️ Session naming inconsistency
**المشكلة:**
- `2026-04-18.md` إلى `2026-04-21.md` → YYYY-MM-DD ✅
- `22-04-2026.md` و `24-04-2026.md` → DD-MM-YYYY ❌
**الحل:** أعد تسمية للـ YYYY-MM-DD.

---

### [DOC-06] ⚠️ `Storage_Architecture_Plan.md` في غلط مكانه
**المشكلة:** موجود في `sessions/` لكنه ليس session — هو architecture document.
**الحل:** انقله لـ `.claudedocs/architecture/`.

---

## الهيكل المقترح النهائي

```
.claudedocs/
│
├── ── ACTIVE (يقرأها الـ agent بشكل دوري) ──────────────────
│
├── roadmap_audit_april.md          ✅ يبقى — آخر audit
├── new_tenant_checklist.md         ✅ يبقى — تُستخدم مع كل tenant
├── todo_list.md                    ← حدّثه (Phase 36 current)
│
├── resources/
│   ├── developer-tools.md          ✅
│   ├── Company_Skills_Framework.md ← انقله هنا (من خارج المجلد)
│   └── Owner_Onboarding_2Weeks.md  ← انقله هنا (من خارج المجلد)
│
├── ── ARCHITECTURE (مرجع — يُقرأ عند الحاجة) ────────────────
│
├── architecture/
│   ├── routing_architecture.md     ← انقله من root
│   ├── خطة_المحتوى_الديناميكي.md   ← انقله من root
│   ├── database_report.md          ← انقله من root
│   └── Storage_Architecture_Plan.md ← انقله من sessions/
│
├── ── ROADMAP (مقسّم بعد تقسيم phases_roadmap.yaml) ──────────
│
├── roadmap/
│   ├── active.yaml                 ← الـ phase الحالية فقط (Phase 36)
│   ├── upcoming.yaml               ← الـ 3 phases القادمة
│   └── completed.yaml              ← كل الـ phases المكتملة (archive)
│
├── ── ARCHIVE (تم تنفيذها — لا تُعدَّل) ──────────────────────
│
├── archive/
│   ├── schema_refactor_plan.md     ← ✅ Done
│   ├── database_pooler_plan.md     ← ✅ Done
│   └── frontend_structure.md       ← superseded by skills
│
├── ── AUDITS (تقارير الفحص) ───────────────────────────────────
│
├── audits/
│   └── audit_2026-04-24.md         ← code_review.md من هنا
│
└── ── SESSIONS ───────────────────────────────────────────────
│
└── sessions/
    ├── 2026-04-18.md
    ├── 2026-04-19.md
    ├── 2026-04-20.md
    ├── 2026-04-21.md
    ├── 2026-04-22.md               ← rename من 22-04-2026.md
    └── 2026-04-24.md               ← rename من 24-04-2026.md
```

---

## خطة التنفيذ

### الخطوة 1 — إصلاح فوري (5 دقائق)
```bash
cd .claudedocs/sessions/

# صحح naming
mv "22-04-2026.md"  "2026-04-22.md"
mv "24-04-2026.md"  "2026-04-24.md"

# انقل الملف الغلط
mkdir -p ../architecture
mv "Storage_Architecture_Plan.md" ../architecture/
```

### الخطوة 2 — إنشاء المجلدات وتنظيم الملفات (10 دقائق)
```bash
cd .claudedocs/

mkdir -p architecture archive audits roadmap

# Architecture docs
mv routing_architecture.md          architecture/
mv database_report.md               architecture/
mv "خطة_المحتوى_الديناميكي.md"      architecture/

# Archive (تم تنفيذهم)
mv schema_refactor_plan.md          archive/
mv database_pooler_plan.md          archive/
mv frontend_structure.md            archive/

# Audits
mv ../code_review.md                audits/audit_2026-04-24.md
```

### الخطوة 3 — تقسيم `phases_roadmap.yaml` (15 دقيقة)
هذه الخطوة الأهم — 123KB → 3 ملفات صغيرة.

افتح `phases_roadmap.yaml` وقسّمه:

```bash
# roadmap/completed.yaml  ← كل phase بـ status: completed
# roadmap/active.yaml     ← الـ phase الحالية فقط (Phase 36 أو الـ current)
# roadmap/upcoming.yaml   ← الـ 3 phases التالية
```

ثم احذف `phases_roadmap.yaml` الأصلي.

### الخطوة 4 — انقل التقريرين + حدّث todo_list.md (5 دقائق)
```bash
# انقل الملفات من root المشروع
mv Company_Skills_Framework.md      .claudedocs/resources/
mv Owner_Onboarding_2Weeks.md       .claudedocs/resources/

# حدّث todo_list.md يدوياً — اكتب الـ phase الحالي الصح
```

---

## ملخص الفوائد

| قبل | بعد |
|-----|-----|
| Agent يقرأ 123KB YAML في كل session | يقرأ فقط `active.yaml` (~5KB) |
| ملفات منفّذة تظهر كـ "pending" | في `archive/` — واضح إنها done |
| Sessions بـ naming مختلف | كلها YYYY-MM-DD |
| كل شي في root (flat) | منظّم في 5 مجلدات واضحة |
| code_review.md ضايع | في `audits/` مع التاريخ |

---

## الأولوية

| # | الخطوة | الوقت | الأثر |
|---|--------|-------|-------|
| 1 | تصحيح session naming | 2 دقيقة | 🟢 سهل |
| 2 | نقل Storage_Architecture_Plan | 1 دقيقة | 🟢 سهل |
| 3 | نقل ملفات archive | 5 دقائق | 🟡 مهم |
| 4 | تقسيم phases_roadmap.yaml | 15 دقيقة | 🔴 الأهم — يوفر context كبير |
| 5 | تحديث todo_list.md | 10 دقائق | 🟡 مهم |
