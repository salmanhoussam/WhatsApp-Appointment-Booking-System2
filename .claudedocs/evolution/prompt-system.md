# Prompt System — Evolution Log

Accumulating understanding of prompts-as-architecture (not "Prompt Architecture" — deliberately not
named that; see the 2026-07-23 entry). See `.claude/rules/documentation-policy.md`'s "Architecture
Evolution Log" section for what this file is and isn't. Explicitly **not** an ADR yet — per
Salman: "From everything you've shown, it's still an evolving idea." It matures through the next
few real implementations before promotion is even considered.

## 2026-07-23

### Context

Mid-session tangent, while confirming the next concrete step (wiring RK Barber's Hero to Video 3
via the existing Media Capability). Salman raised a broader idea: if a system depends on AI
prompts as a first-class part of the product — not just incidental text — should prompts still
just be plain text files?

### Discovery

Investigated the current Editing Engine's real write path (`app/api/v1/admin/content.py` →
`app/services/content_service.py` → `app/repositories/content_sections_repo.py` → DB) — confirmed
it is plain CRUD today, with **zero AI/prompt layer anywhere in that chain**. `TENANT_OS_PLAN.md
§11` already states AI Access is explicitly "not built" — reserved as a future Interface sibling
to Content/Media, with no model or prompt design decided yet. So this isn't describing an existing
system that needs fixing — there is no prompt-driven mechanism in this codebase yet at all.

### Current Understanding

If/when an AI Interface is built (letting a user or agent edit a Capability — e.g. regenerate a
Hero, edit one section — through natural language instead of the Dashboard's direct-manipulation
UI), the idea on the table is that the prompt itself shouldn't be a bare string tied to one model.
Salman's own framing: separate layers — a Prompt Definition layer, a Context layer, a
Validation/Execution layer — so new capabilities (e.g. "generate a landing page," "edit just the
Hero section") can be added later without rewriting the whole system, and so the system isn't
locked to one specific LLM. No concrete design exists yet — this is the idea in its rawest form,
recorded here specifically so it isn't lost, re-derived from scratch, or prematurely written up as
a permanent ADR before it's had a chance to prove itself against a real build.

### Open Questions

- Does this get designed against the *first* real AI Interface build, or does it need its own
  standalone design pass before any AI Interface work starts? Unresolved — no AI Interface work is
  currently scheduled (still gated per `TENANT_OS_PLAN.md §11` and
  `AI_OPERATIONS_PLATFORM_VISION.md`'s own phase gates).
- Whether "Context layer" here means the same thing as this project's existing Tenant Context
  Resolver (`get_current_tenant`, `.claude/rules/backend/architecture.md §5`) or something new and
  AI-specific is unresolved.

### Promoted?

No — explicitly, per Salman: still an evolving idea, not ready for an ADR. Matures through the
next few real implementations first.

---

## 2026-09-27

### Context

سلمان سأل سؤالاً بسيطاً: «أنا ولا مرّة شفت تقرير من ايجنت أو شغل ايجنت وكيف بيتم التواصل». ولم يكن
سؤالَ فضول — كان أوّلَ مَن لاحظ أنّ طبقةً كاملةً في هذا المشروعِ لم تُنتِج أثراً واحداً.

### Discovery

**أربعةَ عشرَ ملفَّ وكيلٍ لم تكن مسجَّلةً في الهارنس إطلاقاً، لثلاثةِ أشهر.** والسببُ مِزلاجان
مستقلّان، كلٌّ منهما وحدَه كافٍ:

```
①  المجلّد  .claude/agent/  بالمفرد   —   والهارنسُ يقرأ  .claude/agents/
②  كلُّ ملفٍّ يبدأ بـ `name:` مجرّدةً   —   ولا سياجَ `---` في أيٍّ منها
```

ودليلُ الأثرِ **مقيسٌ لا مُستنتَج**: لا ملفَّ في `verification/` أو `reviews/` ينسب طوراً إلى وكيل،
أي أنّ القاعدةَ ٦ في `documentation-policy.md` — «سَمِّ الوكيلَ الذي نفّذ كلَّ طور» — **لم تُطلَق
ولا مرّةً**، لأنّ التنفيذَ لم يتوزّع يوماً. و`/bo-hussein` حين يقول «وزّعتُ على backend-architect»
كان يعني: الجلسةُ الرئيسيّةُ تقرأ ذلك الـmarkdown كتعليماتٍ **لنفسِها** وتنفّذ وحدَها.

وثلاثةُ اكتشافاتٍ لاحقةٍ من العائلةِ نفسِها، في اليومِ نفسِه:

```
٢١ من ٣١ مدخلاً في .claude/skills/   روابطُ رمزيّةٌ إلى شجرةٍ ثانيةٍ (.agents/) — لا مجلّداتٌ حقيقيّة
١٤ من ٢٢ مهارةً في general/          مطابقةٌ بالاسمِ الحرفيِّ لمهاراتٍ مُحزَّمةٍ متاحةٍ أصلاً
٣٧ من ٤٨ مهارةً                      لا يشير إليها وكيلٌ واحد — و٤ منها تسمّيها **قاعدةٌ ملزِمة**
```

### Current Understanding

**قابليّةُ القراءةِ ليست قابليّةَ التحميل.** ملفُّ prompt يبدو صحيحاً للإنسانِ وغيرَ مرئيٍّ للآلةِ
في الوقتِ نفسِه، وهذا العطبُ **لا يُظهر أعراضاً**: لا خطأ، لا تحذير، لا فرقٌ في المخرَج — لأنّ
الجلسةَ الرئيسيّةَ تنفّذ العملَ على أيِّ حال، فتُخفي الغياب.

ومنه نتيجةٌ أعمّ: **أيُّ أثرٍ حكوميٍّ (وكيل · مهارة · قاعدة) يحتاج فحصَ وجودٍ فعليٍّ لا فحصَ
محتوى.** ولذلك بُني `/team-onboarding` ليطبع «كم ملفاً موجودٌ **مقابل** كم يرى الهارنسُ»، وأيُّ
اختلافٍ بين الرقمين يُطبَع 🔴 — فالعطبُ بقي مخفيّاً ثلاثةَ أشهرٍ لأنّ **لا شيءَ كان يطبع الجاهزيّةَ
ليُقارَن بها ادّعاء**.

وآليّةُ الوصولِ نفسُها قِيست فكانت واحدةً لا ثلاثاً: لا وكيلَ يملك أداةَ `Skill` (صفر من ١٢)، ولا
وكيلَ فرعيٍّ يملك أوامرَ مائلة، و`retriever:expand_skills` غيرُ موجودٍ في المشروعِ إطلاقاً. ⇒
**المسارُ الصريحُ المقروءُ هو الآليّةُ الوحيدة**، وثلاثةُ أسطرٍ في `bo-hussein.md` كانت عاطلةً
بالبناءِ لأنّها كُتبت أوامرَ مائلة.

### Open Questions

- الاثنا عشرَ مسجَّلون الآن، **ولا واحدٌ منهم شُغِّل في عملٍ حقيقيٍّ بعد.** التسجيلُ مُثبَت
  (`code-reviewer` حُمِّل واقتبس من تعريفِه حرفيّاً في worktree معزول)، والاستعمالُ لا. فهل تصير
  القاعدةُ ٦ قابلةً للتطبيقِ فعلاً، أم تبقى قاعدةً لطبقةٍ لا تعمل؟
- `كونان` باسمِه العربيِّ **يُسجَّل** — لكن هل يعمل وظيفيّاً؟ اختبارُه مؤجَّلٌ بقرارِ سلمان.
- ٢١ مهارةً ما زالت بلا وكيلٍ يشير إليها (أغلبُها عامٌّ متاحٌ للجلسةِ مباشرةً) — هل الربطُ مطلوبٌ
  أصلاً، أم أنّ «مهارةٌ يستعملها الإنسانُ لا الوكيل» فئةٌ مشروعةٌ تحتاج تسميةً بدل ربط؟

### Promoted?

No. حالةٌ واحدةٌ حقيقيّةٌ من هذا الشكلِ بالضبط (أثرٌ حكوميٌّ غيرُ محمَّل)، وعتبةُ التجريدِ في هذا
المشروعِ حالتان. والفحصُ الوقائيُّ موجودٌ عمليّاً في `/team-onboarding`، فلا حاجةَ لقاعدةٍ الآن.
