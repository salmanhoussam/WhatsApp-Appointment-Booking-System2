# Alzabt — Master Completion Audit & Reconciliation

**تاريخ:** 2026-08-15. **نوع الجلسة:** Project Completion Audit / Master Plan Reconciliation — **قراءة
وتحقق فقط، صفر كود، صفر P0.4/P1.2/P2**. بديل عن خطة أبو حسين السابقة (`ALZABT_COMPLETION_PLAN_20260831.md`)
وليس تكرارًا لها — تلك كانت "شو الملفات الباقية"، هذه "شو يجب أن يكون صحيحًا حتى نقول إن Alzabt جاهز فعلًا."

**المصدر الحاكم للرؤية:** `new-matirial/Gemini_Generated_Image_z1vl4uz1vl4uz1vl.jpeg` — التدفق الحقيقي
للمنتج: **التسجيل والبدء (Onboarding) → بناء نظام الحجوزات (System Builder) → الإطلاق والاستقرار
(Go Live) → الماركت بليس (Marketplace)** — مع حلقة مستمرة بين صاحب المصلحة والزبون. هذه الصورة تصبح
جزءًا رسميًا من مرجعية المنتج من الآن، لا تُختصر لمجرد "RK يشتغل."

---

## أولًا — التحقق من الـ git (Source of Truth، لا الخطة)

نُفِّذ صراحة قبل كتابة أي شيء آخر:

```
git show --stat e66710c   → مؤكد: 6 ملفات، 439 إضافة، commit حقيقي، رسالة مطابقة تمامًا للـ Proposal المُوافَق عليه
git status                → لا شيء من P1.1 غير مُلتَزَم؛ فقط نفس ملفات الـ drift القديمة غير المرتبطة
```

**النتيجة: `e66710c` حقيقي فعلًا** — StaffSection.jsx، تعديل `reservations.py`، ملف evidence، ملف proposal،
كلها موجودة بالضبط كما وصفتها الخطة السابقة. الشك كان له ما يبرره كمبدأ (git هو الحكم، لا أي سرد) — لكن
في هذه الحالة تحديدًا، السرد كان صحيحًا.

---

## ثانيًا — جرد حقيقي لـ `.claude/` و`.claudedocs/` (لا افتراض، فحص فعلي)

### ما هو فعليًا موجود، غير موثّق سابقًا بدقة

| الموقع | الحالة الحقيقية |
|---|---|
| `.claude/memory.md` | **190KB، 3516 سطر، آخر تعديل 2026-07-25 — متجمّد منذ 3 أسابيع تقريبًا.** كل الذاكرة الحقيقية لهذه الجلسة (Vertical Registry، Provisioning، P0.1-P1.1 بالكامل) ذهبت لمكان آخر تمامًا: نظام auto-memory خارجي (`~/.claude/projects/.../memory/`). `CLAUDE.md` نفسه ما زال يقول إن `/memory-sync` والـ `memory-keeper` agent يحدّثان هذا الملف — **هذا غير صحيح فعليًا منذ 3 أسابيع.** |
| `.claude/agent-prompts.md` | ملف من 2026-07-04، غير مذكور إطلاقًا في فهرس `CLAUDE.md` — يتيم حقيقي |
| `.claudedocs/roadmap/{active,upcoming,completed}.yaml` | آخر تعديل 2026-07-04. محتواه الفعلي (فُحص مباشرة) يعود لمرحلة "Smar 3D Scrollytelling" — **من قبل وجود Alzabt/RK/Reservations كمفاهيم أصلًا.** آلية roadmap كاملة، مبنية بجهد حقيقي، مهجورة تمامًا |
| `.claudedocs/audits/claudedocs_audit.md` | تدقيق ذاتي حقيقي لبنية `.claudedocs/` من 24 أبريل 2026 — وجد نفس نوع المشاكل (ملفات ضخمة، تعارض تواريخ، ملفات في غير مكانها) التي نجدها اليوم مجددًا. **لم يُتابَع** |
| `.claudedocs/architecture/AGENT_COLLABORATION_MAP.md` | موجود فعلًا (غير مُلتَزَم بعد بـ git)، يحوي 5 نتائج حقيقية غير محلولة: 2 ملف Frontend-Architect متضاربين، عاملين شبه منتهيين ما زالا يبدوان كـ standing agents، `konaan-onboarding-schema.md` قديم (v1.0 بينما المُطبَّق فعليًا v2.1)، فهرس `CLAUDE.md` يذكر 7 من 13 agent حقيقي فقط، و**`memory-keeper.md` يشير لمسار Windows غير موجود على هذه الآلة** — يفسر مباشرة سبب توقف `.claude/memory.md` |
| `.claude/commands/Scaffold Tenant Command.md` | ملف مهجور بعنوانه الخاص "DEPRECATED — use scaffold-tenant.md instead"، ما زال موجودًا فعليًا |
| `.claude/agent/Frontend-Architect-Agent.md` و`frontend-architect.md` | نسختان حقيقيتان متضاربتان، مؤكَّد وجودهما معًا الآن |
| `.claude/commands/fix.md`, `polish.md` | أوامر حقيقية موجودة، **غير مذكورة في فهرس `CLAUDE.md`'s Commands section** |
| لا يوجد automated test suite | فُحص مباشرة: لا `pytest.ini`، لا `conftest.py`، لا سكربت اختبار في `frontend/package.json` (فقط dev/build/lint). كل التحقق في هذا المشروع — بما فيه هذه الجلسة بالكامل — يدوي عبر Playwright حي + evidence.md لكل feature. رصين لكن غير قابل للأتمتة أو إعادة التشغيل التلقائي |
| `railway.json` | موجود فعلًا (root + frontend/) — البنية التحتية جاهزة جزئيًا للنشر |
| لا يوجد `.github/` workflows | لا CI/CD آلي — النشر والتحقق كلاهما يدوي بالكامل اليوم |

**الخلاصة الصادقة:** `.claude/` و`.claudedocs/` **ليسا فارغين ولا مهملين بالكامل** — فيهما انضباط حقيقي وموثّق
بعمق (كل هذه الجلسة كانت مثالًا حيًا على ذلك: proposal → impact map → evidence → commit، مرارًا). المشكلة
الحقيقية هي **ازدواجية**: نظامان للذاكرة يعملان بالتوازي (القديم متجمد، الجديد حي فعليًا لكن غير مُعرَّف رسميًا
في `CLAUDE.md`)، ونظام roadmap كامل مهجور منذ شهر ونصف بينما التتبع الفعلي انتقل لـ `todo_list.md` +
`sessions/*.md` بدون إعلان رسمي لهذا الانتقال.

---

## ثالثًا — مصفوفة الحالة الحقيقية (19 مجال)

**تنبيه على القراءة:** "قبل LIVE؟" هنا **توصية مبنية على الأدلة، وليست قرارًا** — القرار يبقى لك دائمًا، مطابقةً
لانضباط الجلسات السابقة (Recommendation ≠ Decision).

| # | المجال | موجود | ناقص | مصدر الحقيقة | قبل LIVE؟ |
|---|---|---|---|---|---|
| 1 | **Core backend** | 4-Layer معماري صارم، `require_service()` gating، multi-tenancy عبر `clientId` في كل query | لا شيء حرج جديد هذه الجلسة | `app/`, `.claude/rules/backend/*.md` | — (مستقر) |
| 2 | **Reservations** | محرك كامل: `Barber`, `CatalogService`, `BarberService`, availability slots, working hours، مُختبَر حيًا مرارًا | ربط BarberService ضعيف عند RK (2 من 12 ممكن)، خلل STAFF nav المتقطع (~50%) | `app/services/reservation_service.py`, memory `project_reservation_and_staff_state_20260809` | جزئيًا — الربط الضعيف بيانات وليس كسرًا وظيفيًا |
| 3 | **Onboarding** | 3 أبواب حقيقية (Self-Registration، Demo Builder، WhatsApp/n8n)، Unified Provisioning Contract كامل ومُختبَر (Phase 1-3.6)، atomic claim، retry-safe | `service_type`/`vertical` غير متوافقين عمدًا (مؤجل)، لا UI حقيقي لتحرير `Client.config.working_hours` | `app/services/{registration,provisioning,demo}_service.py`, Phase 3.5 audit | لا — الأساس مقفول ومُدقَّق فعليًا |
| 4 | **Demo Builder** | معزول تمامًا عن RK، تزويد حقيقي (`business_type: barbershop`)، دورة حياة 14 يوم | لا cron لتنظيف `trial_ends_at` المنتهية | `app/services/demo_service.py`, memory `project_alzabt_master_plan_priority` | لا — منفصل عن مسار الإنتاج |
| 5 | **System Builder** (لوحة التحكم) | Dashboard حقيقي: Reservations/Staff/Services/Store tabs، 3-tier auth (STAFF scoped) | Ali's Staff-tab service-assignment 403 (يحتاج `catalog` مفعّلة)، بند "List-vs-Calendar" محجوب على قرار منتج | `frontend/src/pages/generic-admin/`, `RESERVATION_PRODUCTION_ROADMAP.md` | نعم جزئيًا — الـ 403 يمس عمل صاحب المصلحة الحقيقي |
| 6 | **Tenant pages** (`/{slug}`) | `DynamicPage.jsx` + `SECTION_MAP` (13 قسم الآن مع `staff`)، RK/Ali/alzabt-demo تعمل فعليًا | فراغات تباعد غير مُشخَّصة عند RK (P0.4)، لا قسم `staff` مُفعَّل فعليًا على أي تينانت حقيقي بعد | `frontend/src/pages/generic/normal/DynamicPage.jsx` | لا — الصفحات تعمل، التلميع تحسين لاحق |
| 7 | **Section System** | P0.1/P0.2/P0.3/P1.1 منجزة ومُلتزَمة (`7a3f531`, `af981d5`, `e66710c`) | P0.4 (تشخيص)، P1.2 (Credentials، خاص بـ Clinic فقط)، P2 (جودة بصرية)، P3 (قالب Barber فعلي) — لا شيء منها بدأ | `ALZABT_SECTION_SYSTEM_WORK_SEQUENCE.md` | لا — RK/Ali يعملان اليوم بدونها |
| 8 | **Barber vertical** | الوحيد الحقيقي المُثبَت: `VERTICAL_REGISTRY["barber"]`، RK+Ali+alzabt-demo مُصنَّفة `vertical='barber'` | `page_template` ما زال `None` — لا قالب صفحة فعلي مبني بعد | `app/core/verticals.py` | لا — العمل بدونه اليوم |
| 9 | **Clinic vertical** | لا شيء حقيقي — مذكور فقط في المصفوفات المعمارية (`ALZABT_VERTICAL_REPERTOIRE_MATRIX.md`) كنية مستقبلية | كل شيء: لا Registry entry، لا `credentials` section، لا onboarding مسار | — (لا يوجد بعد) | لا — خارج نطاق 08-31 صراحةً |
| 10 | **Retail vertical** (Store/Restaurant) | يعمل فعليًا لكن على مسار مختلف تمامًا — تينانتات قديمة (footlab, caracas) لا تستخدم `DynamicPage`/`SECTION_MAP` إطلاقًا، بل صفحات مخصصة `tenantRegistry` | لم يُدمَج مع Vertical Registry أو Section System — نظامان منفصلان فعليًا اليوم، ليس نظامًا واحدًا موحدًا | `frontend/src/router/tenants/index.js` | لا — يعمل، لكنه **دين معماري حقيقي** يستحق قرارًا واعيًا لاحقًا: هل يُدمَج يومًا، أم يبقى مسارًا موازيًا دائمًا؟ |
| 11 | **Marketplace** | **لا شيء حقيقي في الكود إطلاقًا.** موجود فقط كرؤية بصرية في الصورة المرجعية | كل شيء — انظر القسم الرابع أدناه للتفصيل الكامل | الصورة فقط، لا مستند هندسي | لا — خارج نطاق 08-31 صراحةً، لكن **يحتاج تحويل من رؤية إلى backlog حقيقي الآن**، ليس بعد |
| 12 | **Production / Railway** | `railway.json` موجود (root + frontend)، RC مُقفَل عند `cf6f474` سابقًا (قبل كل عمل هذه الجلسة — **يحتاج فحص: هل الالتزامات الجديدة تدخل ضمن نفس RC أم تحتاج فحصًا جديدًا؟**) | لا CI/CD آلي، Step 13 (Railway deploy + migrations + smoke test) لم يُنفَّذ إطلاقًا بعد | `.claudedocs/work/alzabt-pre-live-readiness/`, memory `project_production_deadline_20260831` | **نعم — هذا هو جوهر الـ deadline نفسه** |
| 13 | **Supabase** | Storage bucket واحد (`properties`)، تعدد tenant عبر `{slug}/` prefix، موثّق جيدًا (`storage-tenant.md`) | **تذبذب pooler متكرر جدًا طوال هذه الجلسة تحديدًا (503/500 متقطعة على الأقل 6 مرات موثّقة)** — لم يُشخَّص جذريًا قط، فقط أُعيدت المحاولة في كل مرة | `.claude/rules/storage-tenant.md`, أدلة هذه الجلسة | **نعم — خطر حقيقي على عملاء فعليين إذا تكرر بنفس الوتيرة في الإنتاج** |
| 14 | **Data hygiene** | 42 صف حُذف بأمان ومُوثَّق (2026-08-10) | 7 حجوزات متبقية **محجوبة على رد خارجي من صاحب RK الحقيقي** — ليست مهمة داخلية | `.claudedocs/work/production-data-hygiene/2026-08-10/deletion-review.md` | نعم — لكنها محجوبة على طرف خارجي، لا على عمل هندسي |
| 15 | **Security / permissions** | JWT roles، 3-tier STAFF scoping، rate limiting على auth، `require_roles`/`require_service` منهجي | لا فحص أمني (security-review) رسمي حديث نُفِّذ على كامل عمل هذه الجلسة (Provisioning endpoints الجديدة) | `.claude/rules/backend/security.md` | يُستحسن — endpoint جديد (`/provisioning/domain-objects`) لم يمر بمراجعة أمنية مستقلة بعد، فقط بمراجعتي الذاتية |
| 16 | **Documentation** | غنية جدًا وحقيقية (ADR، evolution، capabilities، sessions) — **لكن مزدوجة كما في القسم الثاني أعلاه** | لا "مصدر حقيقة واحد معلن" رسميًا بين `.claude/memory.md` القديم والذاكرة الخارجية الجديدة؛ `roadmap/*.yaml` مهجور بدون إعلان | هذا الملف نفسه + القسم الثاني | **نعم — هذا بالضبط ما طلبته: Track 3 مطلوب فعلًا** |
| 17 | **Agent instructions** | 13 agent حقيقي، معظمهم مستخدمون فعليًا (`bo-hussein` تحديدًا نشط طوال هذه الجلسة) | 5 نتائج AGENT_COLLABORATION_MAP.md غير محلولة (تكرار Frontend agent، فهرس CLAUDE.md ناقص، مسار memory-keeper معطل) | `AGENT_COLLABORATION_MAP.md` | لا — لا يكسر العمل اليومي، لكنه دَين حوكمة حقيقي |
| 18 | **Verification / evidence** | **الأقوى في كل المشروع** — كل عنصر من P0.1 إلى P1.1 له impact map + proposal + live evidence + commit منفصل. الانضباط هنا مثالي فعليًا هذه الجلسة | صفر أتمتة (لا test suite) — كل التحقق يدوي بالكامل، يعتمد على من يُشغِّله في كل مرة | أدلة هذه الجلسة نفسها | لا — لكنه **مُكلِف زمنيًا** كلما زاد حجم النظام (Marketplace سيحتاج نوعًا مختلفًا من التحقق) |
| 19 | **Release process** | خطة Step 13 موثّقة بدقة ومُصادَق عليها (Railway → migrations → smoke test → قرار → LIVE)، قاعدة "لا استنتاج للقرار" مُطبَّقة بصرامة طوال الجلسات | لم يُنفَّذ أي جزء منها بعد إطلاقًا | memory `project_production_deadline_20260831` | **نعم — هذا المسار نفسه** |

---

## رابعًا — الماركت بليس: من رؤية إلى Backlog هندسي حقيقي

الصورة المرجعية واضحة كـ North Star، لكن **لا يوجد اليوم أي تحويل هندسي لها** — لا نموذج بيانات، لا حالة
tenant، لا API. هذا القسم يحوّل أسئلتك المطروحة إلى بنود backlog حقيقية، **بدون الإجابة عنها** — هذا قرار
منتج/معماري يخصك، ليس شيئًا أستنتجه بالنيابة عنك:

| السؤال المطروح | ما هو موجود اليوم كنقطة بداية | ما الناقص فعليًا |
|---|---|---|
| كيف يصبح tenant قابلاً للبحث (searchable)؟ | لا شيء — لا فهرسة، لا full-text search | يحتاج تعريف: بحث بالاسم؟ بالنوع (vertical)؟ بالموقع؟ |
| ما شروط ظهور tenant في الـ Marketplace؟ | **موجود فعليًا كمفهوم جزئي**: حالات `status`/`lifecycle_state` الحالية (`active`/`trial`/`suspended`) + `provisioningStatus` الجديد (`pending`/`provisioning`/`complete`/`failed`) | لا علاقة رسمية بين هذه الحقول وبين "جاهز للظهور في ماركت بليس" — يحتاجان تعريفًا صريحًا جديدًا، ليس افتراضًا |
| كيف يُستخدم الموقع الجغرافي؟ | **لا شيء إطلاقًا** — لا حقل عنوان/إحداثيات منظّم في `Client` اليوم | يحتاج حقل بيانات جديد بالكامل + قرار: يدوي عند onboarding أم يُستخرج من مصدر خارجي (Google Places مثلًا)؟ |
| كيف تُعرض الخدمات والأسعار والتقييمات؟ | الخدمات والأسعار **موجودة فعليًا** (`CatalogService`, الآن مع P1.1 حتى الفريق) — **التقييمات لا وجود لها إطلاقًا** في أي نموذج بيانات | نموذج Review/Rating كامل غير موجود — لا جدول، لا API، لا UI |
| كيف ينتقل الحجز من Marketplace إلى tenant؟ | البنية التحتية للحجز نفسها (Reservations engine) **جاهزة وتعمل فعليًا** | مسار الانتقال نفسه (Marketplace card → تينانت مُحدَّد → صفحة حجزه) غير موجود لأن Marketplace نفسه غير موجود |
| ما هو الـ public tenant contract؟ | موجود جزئيًا فعليًا — `GET /public/{slug}/config` هو أقرب شيء لعقد عام اليوم، لكنه صُمِّم لخدمة صفحة تينانت واحد، لا للفهرسة الجماعية | يحتاج تعريف عقد منفصل: ما الحد الأدنى من البيانات الذي كل tenant *يجب* أن يوفره ليظهر في قائمة/بطاقة Marketplace |
| كيف نمنع ظهور tenant ناقص أو غير جاهز؟ | **هذا بالضبط ما وُجد جزئيًا هذه الجلسة**: `provisioningStatus='complete'` **موثَّق صراحة أنه لا يعني "جاهز ليُعرض على زبون"** (نفس التحذير المتكرر طوال الجلسة) | معيار "جاهز لماركت بليس" غير معرَّف إطلاقًا اليوم — أعلى من `provisioningStatus`، أعلى من Completion Gate الحالي في `tenant-onboarding.md` |
| ما حالات tenant: draft/demo/ready/live/suspended/archived؟ | موجود جزئيًا ومبعثر: `status` (active/suspended)، `lifecycle_state` (trial/...)، `provisioningStatus` (pending/provisioning/complete/failed) — **ثلاثة حقول منفصلة، لا حالة واحدة موحدة** | هذا بالضبط الثغرة التي أشار إليها P0.3.5 audit سابقًا (تداخل `provisioningStatus` مع `TENANT_LIFECYCLE_PLAN.md`'s "Onboarding Status" غير المبني) — **لم تُحل بعد**، والـ Marketplace يزيدها إلحاحًا |
| من مصدر الحقيقة لكل حالة؟ | لا يوجد اليوم — الحقول الثلاثة أعلاه تُكتَب من أماكن مختلفة (`registration_service.py`, `demo_service.py`, `provisioning_service.py`) بدون نموذج موحّد واحد | يحتاج قرارًا معماريًا صريحًا: state machine واحدة أم حقول مستقلة موثّقة بعلاقاتها بوضوح؟ |
| كيف Onboarding/Demo Builder/System Builder/Marketplace مرتبطون؟ | التدفق الحقيقي اليوم يتوقف عند System Builder — لا شيء يصل لـ Marketplace | هذا هو الفراغ الأكبر في الصورة كلها — يحتاج تصميم كامل، ليس تطويرًا مباشرًا |

**الخلاصة الصادقة لهذا القسم:** Marketplace ليس "ميزة قادمة" بسيطة — هو **طبقة منتج جديدة كاملة** تحتاج
جولة Discovery/Design مستقلة خاصة بها (بنفس انضباط الجلسات السابقة: Product Model → Registry Architecture
→ Impact Map → Proposal)، **بعد** 08-31 صراحةً حسب الأولوية المعلنة، لكن تستحق أن تُفتَح كـ track موثّق
الآن بدل أن تبقى صورة فقط.

---

## خامسًا — المسار الثالث المطلوب: Project Knowledge & Governance

يُضاف كمسار مستقل موازٍ للـ Release وSection System، وليس بديلاً عنهما:

### ما يجب أن يحدث (بنود حقيقية، ليست عمومية)

1. **حسم ازدواجية الذاكرة صراحة**: إما (أ) إعلان `.claude/memory.md` مهجورًا رسميًا و`CLAUDE.md` يُحدَّث ليشير
   للنظام الخارجي الحقيقي، أو (ب) استئناف تحديث `.claude/memory.md` فعليًا. الوضع الحالي — كلاهما موجود،
   واحد فقط حي — هو بالضبط "documentation theater" الذي حذّرتَ منه.
2. **حسم مصير `.claudedocs/roadmap/*.yaml`**: أرشفة صريحة (`git mv` إلى `archive/`) مع سطر يوضح أن
   `todo_list.md` + `sessions/*.md` هما المصدر الحقيقي الآن — بدل تركه معلّقًا كأنه لا يزال حيًا.
3. **تحديث فهرس `CLAUDE.md`'s Agents/Commands** ليطابق الـ 13 agent الحقيقي و12 أمر حقيقي، بدل السبعة/التسعة
   المذكورين.
4. **قرار صريح بشأن الملفات المكررة**: `Frontend-Architect-Agent.md` مقابل `frontend-architect.md`،
   `Scaffold Tenant Command.md` المهجور مقابل `scaffold-tenant.md`.
5. **إصلاح مسار `memory-keeper.md`** (Windows path معطل) — بند صغير حرفيًا، لكنه يفسر لماذا الذاكرة القديمة
   ماتت بصمت.
6. **الأهم فلسفيًا**: كل ملف مستقبلي في `.claudedocs/` يُنشأ بوظيفة معلنة ومصدر حقيقة واضح من البداية — بالضبط
   كما طلبت، لا "documentation theater".

**لا شيء من هذه الستة يحتاج قرارًا معماريًا صعبًا — كلها تنظيف حوكمة صريح، منخفض الخطورة، يمكن تنفيذه بجلسة
واحدة منفصلة إذا وافقت، منفصلة تمامًا عن P0.4/Section System/Marketplace.**

---

## سادسًا — خارطة الطريق الرئيسية الموحّدة (Master Completion Roadmap)

```
                    ┌─────────────────────────────────────────────┐
                    │   Track 1 — الإطلاق (له Deadline حقيقي)      │
                    │   الأولوية القصوى قبل 08-31                  │
                    └─────────────────────────────────────────────┘
   تنظيف البيانات (بانتظار RK) → فحص أمني على Provisioning الجديد →
   تشخيص تذبذب Supabase pooler (خطر حقيقي، غير مُشخَّص) →
   حل 403 عند Ali (يمس صاحب مصلحة حقيقي) → فحص نهائي شامل →
   Step 13 (Railway + migrations + smoke test) → قرار LIVE الصريح

                    ┌─────────────────────────────────────────────┐
                    │   Track 2 — نظام الأقسام (تحسين جودة)        │
                    │   لا يحجب الإطلاق، مطلوب توضيح أولوية        │
                    └─────────────────────────────────────────────┘
   P0.4 (تشخيص فراغات RK) → P2 (جودة بصرية عامة) →
   P3 (قالب Barber فعلي، يُطبَّق على RK/Ali بموافقة صريحة)
   [P1.2/Clinic تبقى مؤجلة — لا حاجة حقيقية اليوم]

                    ┌─────────────────────────────────────────────┐
                    │   Track 3 — المعرفة والحوكمة (جديد، مطلوب)   │
                    │   جلسة واحدة مستقلة، منخفضة الخطورة          │
                    └─────────────────────────────────────────────┘
   حسم ازدواجية الذاكرة → أرشفة roadmap/*.yaml رسميًا →
   تحديث فهرس CLAUDE.md → حسم الملفات المكررة → إصلاح مسار memory-keeper

                    ┌─────────────────────────────────────────────┐
                    │   Track 4 — Marketplace (رؤية → Discovery)   │
                    │   بعد 08-31 صراحة، لكن يُفتح كـ track موثّق   │
                    │   الآن بدل أن يبقى صورة فقط                  │
                    └─────────────────────────────────────────────┘
   جولة Product Model مستقلة (نفس منهجية Alzabt Product Model) →
   حسم حالة tenant الموحّدة (state machine واحدة) →
   تصميم public tenant contract → نموذج Review/Rating →
   الموقع الجغرافي → الربط الفعلي بـ Onboarding/System Builder
```

---

## سابعًا — ماذا يعني هذا عمليًا الآن

**لا بدء لأي كود.** هذا المستند نفسه هو المُخرَج المطلوب لهذه الجلسة.

الأسئلة المفتوحة الحقيقية التي تحتاج قرارك، بدون افتراض إجابة لأي منها:

1. هل نفتح **جلسة Track 3** (تنظيف الحوكمة، منخفضة الخطورة، جلسة واحدة) قبل أي شيء آخر؟
2. هل **تذبذب Supabase pooler** يستحق جلسة تشخيص مستقلة الآن، بما أنه ظهر كخطر حقيقي محتمل على الإنتاج؟
3. هل RC المُقفَل سابقًا عند `cf6f474` ما زال صالحًا، أم يحتاج إعادة فحص الآن بعد كل التزامات هذه الجلسة
   (`e5e031c` حتى `e66710c`)؟
4. متى تُفتَح جولة Discovery الأولى لـ Marketplace كـ track موثّق — الآن (بالتوازي، بدون تنفيذ) أم بعد 08-31
   فقط؟
