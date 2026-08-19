# Alzabt — Barber Production Daily Roadmap

**Status:** Ratified plan, 2026-08-15, Salman's own words verbatim. Supersedes the open questions at
the end of `ALZABT_MASTER_COMPLETION_AUDIT.md` — Track 3 (Governance), Marketplace, and the rest of
Section System (P0.4/P2/P3) are explicitly deferred to post-production (see "بعد Production" below),
not answered piecemeal. The Supabase pooler investigation gets its own dedicated day (18 Aug) rather
than being folded into general verification. RC validity against the commits made since `cf6f474`
(`e5e031c` through `e66710c`) is addressed as part of Day 1's checkpoint reinstatement.

**Governing principle:** Production readiness ≠ اكتمال المنتج بالكامل. لا يُعتبر أي بند من Section
System/Governance/Marketplace شرطًا لتأجيل إطلاق Barber، إلا إذا اكتُشف أثناء التحقق أنه يؤثر فعليًا
على سلامة أو موثوقية تجربة العميل.

---

## الهدف الوحيد قبل 2026-08-31

تجهيز مسار **Barber** ليكون جاهزًا للإنتاج بشكل موثوق.

## قواعد التنفيذ

1. Barber هو الأولوية حتى 31/8.
2. لا نفتح مسارات جديدة لمجرد أنها موجودة في الـ Master Audit.
3. Marketplace وTrack 3 وSection System الكامل تبقى backlog منظمة.
4. أي تعديل بعد Production مسموح، بشرط: عدم كسر الإنتاج، التحقق قبل وبعد التعديل، توثيق التغيير عندما
   يكون مؤثرًا.
5. لا نعلن LIVE من تلقاء أنفسنا.
6. كلمة **LIVE** تحتاج قرارًا صريحًا من صاحب المشروع.
7. كل يوم ينتهي بحالة واضحة: Done / Blocked / Carry forward.
8. إذا ظهر blocker حقيقي، نعالجه أولًا بدل الالتزام الأعمى بالجدول.

---

# المرحلة 1 — إغلاق المخاطر الحقيقية

## 16 Aug — إعادة تثبيت Checkpoint
تثبيت Git state؛ تأكيد وجود P0.1/P0.2/P1.1 كما يجب؛ تثبيت ما هو داخل نطاق Barber وما هو خارجه؛ لا تعديل
كود. **المخرج:** نقطة انطلاق واحدة واضحة.

## 17 Aug — Production Data Hygiene
حسم ما يمكن حسمه داخليًا من بيانات RK؛ فصل ما يحتاج ردًا خارجيًا. **Blocker:** الـ 7 حجوزات المحجوبة على
تأكيد صاحب RK — إذا لم يصل الرد، تُوثَّق كـ external blocker ونُكمل البنود غير المعتمدة عليها.

## 18 Aug — Supabase Pooler Investigation
تشخيص حقيقي (اتصال مؤقت / pool exhaustion / timeout / infrastructure / سوء استخدام من التطبيق) — **ليس
مجرد retry**. **المخرج:** سبب معروف + إجراء، أو دليل كافٍ أنه ليس blocker للإنتاج.

## 19 Aug — Provisioning / Security Review
مراجعة endpoints الـ provisioning الجديدة: tenant isolation، authorization، service gating، role
boundaries، استحالة الوصول لبيانات tenant آخر. **المخرج:** security checkpoint موثّق.

---

# المرحلة 2 — إغلاق تجربة Barber

## 20 Aug — System Builder / Admin
التأكد أن صاحب Barber يستطيع فعليًا إدارة: الخدمات، الموظفين، ربط الموظفين بالخدمات، ساعات العمل،
الحجوزات، صلاحيات STAFF. يُفحص أيضًا 403 عند Ali — إذا كان السبب أن Ali demo لا production، يُوثَّق بدل
اختراع إصلاح غير مطلوب.

## 21 Aug — Public Barber Page
رحلة العميل من خارج لوحة التحكم: الصفحة، الخدمات، الأسعار، الساعات، الموظفين، الصور، حالات الفراغ،
mobile+desktop. **لا نبدأ P2 كتجميل شامل** — فقط ما يثبت تأثيره على التجربة الأساسية.

## 22 Aug — Booking Flow
الرحلة الكاملة: Public Barber Page → Service → Barber → Date → Available Slot → Reservation. مع
working hours، availability، unavailable slots، edge cases، tenant isolation.

## 23 Aug — Real-Tenant Regression
اختبار على RK، alzabt-demo، Ali (بحسب تصنيفه كـ demo) — بدون تغيير بيانات tenant حقيقي بلا إذن.

---

# المرحلة 3 — Production Candidate

## 24 Aug — Full Regression Pass
Backend، Reservations، Onboarding، Demo Builder، System Builder، Public Barber Page، Booking، Staff
permissions، Storage، Tenant isolation. **المخرج:** قائمة blockers فقط.

## 25 Aug — Fix Only Real Blockers
لا تحسينات جديدة — فقط ما أثبت الفحص أنه يمنع Production أو يجعل التجربة غير موثوقة.

## 26 Aug — Re-test After Fixes
كل blocker يُعاد اختباره + **regression حول الإصلاح، وليس الإصلاح وحده**.

## 27 Aug — Production Candidate Check
مراجعة: Git، migrations، environment variables، Railway configuration، frontend build، backend
startup، database connectivity، storage، reservations. **ليست LIVE بعد.**

---

# المرحلة 4 — Step 13

## 28 Aug — Railway Deployment
Deploy → التحقق من migrations → environment variables → تأكد backend/frontend يعملان كما هو متوقع.

## 29 Aug — Production Smoke Test
RK (فتح الصفحة، اختيار خدمة، حجز موعد، لوحة التحكم) + Demo (إنشاء/فتح tenant، النظام، provisioning) +
Tenant جديد (Demo Builder/onboarding من البداية). Desktop + Mobile.

## 30 Aug — Final Regression + Go/No-Go Evidence
لا features جديدة. فقط: هل هناك blocker؟ هل الـ pooler مستقر؟ هل البيانات نظيفة؟ هل booking يعمل؟ هل
tenant isolation سليم؟ هل deployment مستقر؟ هل هناك regression؟ → **Production Readiness Checkpoint**
واضح.

---

# 31 Aug — Decision Day

إذا كل شيء ناجح: **نطلب القرار الصريح** — "هل ننتقل من READY إلى LIVE؟" — نعم → إعلان LIVE، نفس
discipline، أي تحسين لاحق يصبح post-production work. إذا ظهر blocker: لا يُدفَن تحت كلمة "جاهز"، يُحدَّد
بدقة، ويُقرَّر هل يمنع LIVE فعلًا أم يمكن إصلاحه بعد الإطلاق.

---

# بعد Production — Backlog منظم، ليس مهام 31/8

### Track A — Section System
P0.4، P2، P3، Clinic/Credentials عند ظهور حاجة حقيقية.

### Track B — Knowledge & Governance
memory source of truth، roadmap cleanup، CLAUDE.md index، duplicate agents/commands، memory-keeper
path، documentation governance. (التفصيل الكامل: `ALZABT_MASTER_COMPLETION_AUDIT.md`'s القسم الخامس)

### Track C — Marketplace
تحويل الصورة إلى Product Discovery حقيقي: tenant state، marketplace readiness، search، location،
reviews، public contract، booking handoff. (التفصيل الكامل: نفس الملف، القسم الرابع)

---

# تعريف النجاح

بنهاية 31/8، **لا** نحتاج أن نقول "Alzabt كامل." نحتاج أن نقدر نقول بدقة:

> **"مسار Barber جاهز للإنتاج، اختُبر على المسارات الحقيقية، والمخاطر المعروفة إما أُغلقت أو صُنفت
> بوضوح، ويمكن اتخاذ قرار LIVE بناءً على evidence وليس على الانطباع."**

الهدف ليس إنهاء كل شيء. الهدف هو إنهاء الشيء الذي يجب أن ينتهي أولًا.
