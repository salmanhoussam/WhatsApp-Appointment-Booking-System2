# تسجيلُ الوكلاء — الدليل · ٢٠٢٦-٠٩-٢٧

**الحالة:** ✅ مُغلَق · **الإيداع:** `6677cf9` · **صفرُ كتابةِ إنتاج**

هذا الملفُّ موجودٌ لسببٍ واحد: **تقريرُ الوكيلِ أدناه هو أوّلُ مخرَجٍ ينتجه وكيلٌ فرعيٌّ في تاريخِ
هذا المشروع.** وكان سيبقى في الدردشةِ وحدَها، وقاعدتُنا أنّ الدليلَ يسكن ملفّاً لا محادثة.

---

## ١ · العطبُ المقيس

```
ls .claude/agent/          ١٤ ملفاً — والهارنسُ يقرأ .claude/agents/
head -1 على الأربعةَ عشر   كلُّها تبدأ بـ name: مجرَّدةً · صفرُ سياجِ ---
أنواعُ الوكلاءِ المتاحةُ في الجلسةِ حينها:
   claude · claude-code-guide · Explore · general-purpose · Plan · statusline-setup
   ⇒ ولا واحدٌ من الأربعةَ عشر
```

**ودليلُ الأثر:** صفرُ ملفٍّ في `verification/` أو `reviews/` ينسب طوراً إلى وكيل ⇒ القاعدةُ ٦ في
`documentation-policy.md` لم تُطلَق ولا مرّةً، لأنّ التنفيذَ لم يتوزّع يوماً.

## ٢ · الإجراء

```
١  إنشاءُ .claude/agents/ ونسخُ code-reviewer.md وحدَه
٢  سياجُ --- حول الحقولِ الثلاثة — والفرقُ عن الأصل: +2 سطرَين، لا غير
٣  الاستدعاءُ من الجلسةِ الجارية ⇒ **مرفوض**:
   Agent type 'code-reviewer' not found. Available agents: claude, claude-code-guide,
   Explore, general-purpose, Plan, statusline-setup
   ⇒ ملفٌّ جديدٌ لا يُحمَّل في جلسةٍ تعمل — نفسُ سلوكِ Playwright MCP
٤  البديلُ المعتمَد: git worktree --detach على 0190db8 + جلسةٌ متداخلةٌ جديدةٌ
   (claude -p --allowedTools "Agent Task Read Grep Glob") تُحمِّل .claude/agents/ عند بدئها هي
```

## ٣ · تقريرُ `code-reviewer` — حرفيّاً كما وصل

> **(1) AGENT IDENTITY**
>
> Operating under `code-reviewer` — file: `…/wt-agent-test/.claude/agents/code-reviewer.md`
> (frontmatter `name: code-reviewer`, `tools: Read, Glob, Grep, Bash`). Note: a second, non-loaded
> copy exists at `.claude/agent/code-reviewer.md`.
>
> Two verbatim quotes from my own definition:
> - "**Block if:** أي query بدون `clientId` → 🔴 CRITICAL — cross-tenant data leak."
> - "**FM12 Rule:** أي page تستخدم useScroll/useTransform **يجب أن تكون lazy()** في router."
>
> **(2) FILE READ**
>
> `…/.claude/CLAUDE.md` — 170 lines. Untitled H1-less opening line, then `##` headings: Vision,
> Stack, Folder Structure (with `###` Active Clients & Canonical Demo URLs), Commands, Rules
> (Path-Scoped — auto-loaded), Agents (.claude/agent/), Skills (.claude/skills/), Critical Rules
> (always in mind), Auto-Reporting.
>
> **(3) QUICK REVIEW**
>
> - Does well: it is an index, not a manual. Each of the 20 rule files gets one line plus its
>   establishment date, so the reader knows where authority lives without the content being
>   duplicated here. The Skills section even distinguishes git-tracked from untracked folders —
>   rare honesty for a context file.
> - Inconsistent — the tenant table is stale and self-contradicting. "Active Clients (Updated
>   2026-07-18)" lists nine tenants (smar, caracas, footlab, arizona, olivello, moments, anas,
>   sneakers-lb, sneakers-beirut), and none of the platform's actual current tenants (`rk`, `mr-h`,
>   `alzabt-demo`, `barberlab-test`). Vision claims "3 modules", but the auto-loaded
>   `rules/backend/service-system.md` gates `reservations`, `catalog`, `store`, `restaurant`, and a
>   `clinic` vertical shipped 2026-09-26. Its own "Verification Source" column cites `memory.md`,
>   which line 98 of the same file declares "legacy/deprecated".
> - Missing: the two newest always-active rules are absent from the Rules list —
>   `rules/phone-numbers.md` (storage with country code) and `rules/tenant-onboarding.md` (the
>   Completion Gate). Also absent: `rules/backend/security.md` and `rules/storage-tenant.md`, both
>   of which loaded into my context anyway. The list therefore under-reports what actually governs
>   the repo — the opposite failure mode from the stale table, in the same document.
>
> **(4) TOOLS**
>
> `Bash` (`wc -l`, `ls`), `Grep` (heading extraction), `Read` (both files in full). No edits made.

## ٤ · لماذا هذا دليلٌ لا ادّعاء

الاقتباسان **من ملفِّ التعريفِ نفسِه** — «Block if: أي query بدون clientId» و«FM12 Rule» موجودتان
حرفيّاً في `code-reviewer.md`، ولا يستطيع نموذجٌ عامٌّ اختراعَهما. ⇒ التعريفُ حُمِّل فعلاً.

**وثلاثةٌ من اكتشافاتِه صُحِّحت في `CLAUDE.md` في اليومِ نفسِه** (المسار · جدولُ التينانتات ·
القواعدُ الأربعُ الغائبة) — ورابعٌ منها (`.claude/agent/` المفرد) هو العطبُ الذي كنّا نُصلحه، فوجده
من داخلِ الـworktree مستقلّاً عنّي.

## ٥ · التنظيف

```
تعديلاتُ الوكيلِ داخلَ الـworktree   صفر
git worktree remove + prune          تمّ · والمجلّدُ محذوفٌ من القرص
الشجرةُ الرئيسيّة                     بلا أثر
```

## ٦ · النتيجةُ النهائيّة

الاثنا عشرَ ظهروا في قائمةِ الهارنسِ بعدها، **ومعهم كونان باسمِه العربيّ** — فالمجهولُ المسجَّلُ
(«هل يُقبَل اسمٌ عربيٌّ بمسافاتٍ وشَرطة؟») انحلّ: **يُقبَل**.

**وما زال غيرَ مُثبَت:** لا وكيلٌ منهم شُغِّل في عملٍ حقيقيٍّ بعد. التسجيلُ مُثبَت، والاستعمالُ لا.
