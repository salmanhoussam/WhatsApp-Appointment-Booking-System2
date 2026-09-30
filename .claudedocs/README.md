# `.claudedocs` — نقطةُ الدخول

هذا الملفُّ **خريطةُ علاقات، لا قائمةُ أسماء**. يقول لك أيُّ وثيقةٍ تحكم، وأيُّها خطّةُ تنفيذ،
وأيُّها دليلٌ لا يُعدَّل — وبأيِّ ترتيبٍ تُقرَأ حسب ما تريد فعلَه.

> أُنشئ ٢٠٢٦-٠٩-٣٠ استئنافاً لقرارٍ مؤجَّلٍ منذ ٢٠٢٦-٠٧-١٨ (`todo_list.md:735`)، بعد أن تحقّق
> شرطُه بفارقٍ كبير: أُجِّل حتّى «٥–٦ وثائقَ معماريّة»، و`architecture/` يحمل اليومَ ٥٥ ملفّاً.
> ومعيارُ نجاحِه مكتوبٌ هناك حرفيّاً: **«ليس مجرّد فهرسِ أسماء، بل خريطةُ علاقاتٍ بين الوثائق».**

**ما لا يفعله هذا الملف:** لا يعيد محتوى [`architecture/INDEX.md`](architecture/INDEX.md) — ذاك
فهرسُ المعمارِ والقرارات، وهذا نقطةُ دخولِ المشروع. ولا **يعيد كتابةَ الحالة**: يقول أين تعيش.
وثيقةُ ملاحةٍ تنسخ الحالةَ تتقادم، وهذا ما حصل لـ`todo_list.md` بالضبط.

---

## ابدأ من هنا

| تريد أن تعرف | اقرأ |
|---|---|
| ماذا حدث آخرَ مرّة · وأين توقّفنا بالضبط | **أحدثُ ملفٍّ في [`sessions/`](sessions/)** — وفيه قسما `Open Risks` و`START HERE NEXT SESSION` |
| حالةُ الشيفرةِ الآن | `git status` و`git log origin/main..HEAD` — لا وثيقة. المستودعُ يغلب أيَّ وثيقةٍ عند التعارض |
| حالةُ بوّابةِ الإنتاج | القسمُ نفسُه في أحدثِ جلسة. **البوّابةُ مغلقةٌ افتراضاً**، ولا تُفتح إلّا بعبارةٍ صريحةٍ من سلمان لغرضٍ واحدٍ محدَّد |
| القواعدُ التي تحكم كلَّ عمل | [`.claude/rules/`](../.claude/rules/) و[`.claude/CLAUDE.md`](../.claude/CLAUDE.md) |

---

## أنواعُ الوثائقِ وسلطتُها — الفرقُ الذي يحلّ معظمَ الالتباس

| | النوع | أين | ما يعنيه |
|---|---|---|---|
| 🟢 | **حاكم** · Source of Truth | `adr/` · `implementation/*_CONTRACT.md` · `architecture/capabilities/` · `.claude/rules/` | **يُقرَأ ليُلتزَم به**، ولا يُعدَّل إلّا بقرارٍ صريح |
| 🔵 | **خطّةُ تنفيذ** | `plans/` · بعضُ `architecture/` | **يُنفَّذ منه**، ويُراجَع حين تتغيّر الحقائق |
| ⚪ | **دليلٌ وتاريخ** | `work/` · `verification/` · `sessions/` · `reviews/` · `evolution/` · `maturity/` · `archive/` | **لا يُعدَّل أبداً.** خطؤه يُصحَّح بمدخلٍ جديدٍ مؤرَّخ، لا بإعادةِ كتابته |

**ثلاثُ قواعدَ تتبع مباشرةً:**

- وثيقةٌ في `archive/` **ليست مرجعاً**، مهما كثرت الإحالاتُ إليها. أعلاها إحالةً اليومَ
  `archive/TENANT_OS_PLAN.md` — وخليفتُه هو [`architecture/TENANT_OS.md`](architecture/TENANT_OS.md).
- `work/` هو **٥٥٪ من ملفّاتِ هذا المجلّد** ودليلٌ خام. تقرأه لتعرف *كيف* ثبت شيءٌ، لا لتعرف *ماذا* نفعل.
- `sessions/*.md` **لا يُعدَّل رجعيّاً أبداً** (قرارٌ قائمٌ منذ ٢٠٢٦-٠٧-١٨). أيُّ استخراجٍ منظَّمٍ يُكتَب ملفّاً جديداً.

---

## المساراتُ النشطة — السلاسل، لا القوائم

**العيادة** — `vertical` كاملٌ من الصفرِ إلى حجزٍ حقيقيٍّ على الإنتاج:

```
plans/clinic-p5-website-booking.md                        🔵 الخطّة الجامعة
   └→ implementation/CLINIC_P1_SAFETY_FENCES_CONTRACT.md  🟢 ← وكلُّ عقدٍ يليه يعتمد عليه
      → CLINIC_P2_PATIENT_IDENTITY_CONTRACT.md            🟢 المريضُ ليس الزبون
      → CLINIC_P3_SERVICE_MOTIF_CONTRACT.md               🟢 مَن يُسمَح له بالحجز
      → CLINIC_P4_AVAILABILITY_CONTRACT.md                🟢 محرّكُ التوفّر · ستّةُ قرارات
      → CLINIC_Q5B_BOOKING_MODULE_CONTRACT.md             🟢 الخادمُ يشتقّ، والواجهةُ لا تخمّن
      → CLINIC_TEST_TENANT_CONTRACT.md                    🟢 ويفتح بوّابةَ الإنتاج لغرضٍ واحد
   └→ architecture/CLINIC_WEB_UX_CONTRACT.md              🟢 نصوصُ الواجهة، تُقَرّ قبل الكود
   └→ verification/CLINIC_P{1,2,3,4,4C}_GATE.md           ⚪ وwork/clinic-*/ الدليلُ الخام
```

**ليا والحلاقون** — خدمةُ منصّةٍ تكتب بياناتِ تينانتٍ حقيقيّةً من واتساب:

```
architecture/capabilities/lia.md  +  app/prompts/lia.md   🟢 السلوكُ والنصّ
   └→ plans/lia-*.md  (١٥ خطّة)                           🔵
   └→ work/lia-live/  ·  reviews/barber-vertical-closure-2026-09-24.md   ⚪
```

**Tenant OS** — والمثالُ الأوضحُ على أنّ المؤرشَفَ لا يزال يعترض الطريق:

```
adr/ADR-0003.md  +  adr/TOS-*.md                          🟢
   └→ architecture/TENANT_OS.md                           🟢 الصورةُ الجامعة
      → architecture/principles/  ·  architecture/capabilities/
   └→ implementation/ADR-0003/                            🔵
   ⚠️ archive/TENANT_OS_PLAN.md متجاوَزٌ منذ ٢٠٢٦-٠٧-٢٧ — ولا يزال مُحالاً إليه أكثرَ من خليفتِه
```

**دورةُ حياةِ التينانت** — وهذه حرفيّاً العيّنةُ التي وصفها قرارُ ٢٠٢٦-٠٧-١٨:

```
adr/ADR-0002.md  🟢
   └→ architecture/TENANT_LIFECYCLE_PLAN.md          🔵 نموذجُ الأعمال
   └→ architecture/SUPER_ADMIN_DASHBOARD_PLAN.md     🔵 طبقةُ التشغيل
   └→ verification/ADR-0002_*.md  ·  reviews/ADR-0002_*.md   ⚪
```

**واتساب** — `plans/whatsapp-outbound-reliability-and-templates.md` 🔵 ومعه `work/` و`reviews/` ⚪.

**الـverticals** — `architecture/ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md` 🟢 يملك ملكيّةَ السجلّ ودورةَ حياته.

---

## إذا أردتَ أن... اقرأ

| المهمّة | الترتيب |
|---|---|
| **تنفّذ** | العقدُ الحاكم 🟢 ← الخطّة 🔵 ← بوّابةُ التحقّقِ السابقة ⚪ لتعرف ما أُثبِت فعلاً |
| **تحقّق في عطب** | `work/<الموضوع>/<التاريخ>/` ⚪ ← `verification/` ⚪ ← العقدُ الحاكم 🟢 · والقاعدةُ في [`investigation-protocol.md`](../.claude/rules/investigation-protocol.md) |
| **تراجع قراراً** | `reviews/` أو `maturity/<الموضوع>.md` ← العقودُ المُحال إليها ← `verification/` |
| **تستأنف جلسة** | أحدثُ `sessions/` ← قسمُ `START HERE` ← العقدُ الحاكمُ للمهمّةِ المسمّاة. والقاعدةُ في [`context-recovery-protocol.md`](../.claude/rules/context-recovery-protocol.md) |
| **تبدأ قدرةً جديدة** | [`templates/SERVICE_CONTRACT_TEMPLATE.md`](templates/SERVICE_CONTRACT_TEMPLATE.md) ← [`service-execution-constitution.md`](../.claude/rules/service-execution-constitution.md) |
| **تفهم لماذا نعمل هكذا** | [`evolution/`](evolution/) — وأكثفُها [`test-evidence-discipline.md`](evolution/test-evidence-discipline.md): ستُّ طرقٍ يكون فيها الفحصُ الأخضرُ بلا قيمة |

---

## المعمارُ والقرارات

🔗 **[`architecture/INDEX.md`](architecture/INDEX.md)** — فهرسُ القراراتِ والمبادئِ والـCapabilities.
كلُّ ADR ومبدأٍ وCapability يُبلَغ من هناك، ولا يُكرَّر هنا.

---

## فجواتٌ معروفة — مقيسةٌ ٢٠٢٦-٠٩-٣٠، ومذكورةٌ لا معالَجة

| # | الفجوة | المقياس |
|---|---|---|
| ف-١ | وثائقُ مرجعيّةٌ لا يُشير إليها شيء | ١٠٢ من ٢٨٨ (٣٥٪) |
| ف-٢ | ما تصله طبقةُ الحكمِ بالاسم | ١٤ من ٢٨٨ (٤٪) |
| ف-٣ | `architecture/` معمارٌ فعليٌّ منه | ٨ من ٥٥ — والباقي عقودٌ ومقترحاتٌ وخططٌ وتدقيقات |
| ف-٤ | روابطُ قاعدتُها خاطئة (الملفّاتُ موجودة) | ٥٥ في ٤ ملفّات · ومفقودٌ فعلاً: ١ |
| ف-٥ | وثائقُ تُعلن تجاوزَها وما زالت مراكزَ ثقل | ١٥ · أبرزُها `todo_list.md` و`archive/TENANT_OS_PLAN.md` |
| ف-٦ | مجلّداتٌ بلا تعريفٍ في أيِّ قاعدة | ٦: `audits/ design/ guides/ references/ research/ resources/` |
| ~~ف-٧~~ | ~~وحدتان بلا مستأجرٍ خارجَ الخريطة~~ | 🟢 **أُغلقت ٢٠٢٦-٠٩-٣٠** — `dating` و`moments` استُؤصلتا، و§9 في `service-system.md` تمنع تكرارَها |

**ولم يُنقَل ولم يُحذَف ولم يُعَد تسميةُ شيءٍ لمعالجتها.** فرزُ الـ٤٧ ملفّاً في `architecture/`
تحديداً **مرفوضٌ الآن بقرارٍ صريح**: النقلُ يكسر أكثرَ من أربعين إحالةً قائمة، والوصفُ الملاحيُّ
أعلاه أرخصُ وأأمنُ من إعادةِ التنظيم. وكلُّ معالجةٍ من هذه الستّ تحتاج موافقتَها المستقلّة.

---

## `todo_list.md` — تحذيرٌ يلزم قولُه

أكثرُ وثيقةٍ إحالةً في هذا المجلّدِ كلِّه (٤٣)، **وتُعلن تقادمَها في سطرِها الثالث**. فهي ليست
ميّتةً ولا حيّة: **تحمل بنوداً حاملةً لا يدلّ عليها شيء** — ومنها معيارُ نجاحِ هذا الملفِّ نفسِه،
في السطر ٧٣٥. اقرأها بحثاً عن بند، لا بوصفها حالةً راهنة.
