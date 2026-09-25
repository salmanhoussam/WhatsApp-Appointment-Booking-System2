# Clinic P1 — Gate Report

**التاريخ:** ٢٠٢٦-٠٩-٢٥ · **العقد:** [`implementation/CLINIC_P1_SAFETY_FENCES_CONTRACT.md`](../implementation/CLINIC_P1_SAFETY_FENCES_CONTRACT.md) (Option B)
**الحالة:** ✅ **نُفِّذ** · ⏸️ **غيرُ مُودَع** — لا commit ولا push

---

## §١ — ما نُفِّذ

| | |
|---|---|
| **P1-A** | `_LIA_VERTICALS = frozenset({"barber"})` · `_vertical_allows_lia()` جديدةٌ مستقلّة · `_assert_lia_vertical()` كـbackstop · نداءٌ في المواضع الثلاثة قبل `_tenant_has_lia` · نصٌّ مُقَرّ · حدثُ تدقيق |
| **P1-B** | `reservations_active_resource_slot_uidx` — مطبَّقٌ على الإنتاج · **و F4 في التغيير نفسِه** |
| **P1-C** | ١٠٢١ فحصاً أخضر · AST لـFG-6 و RG-e · دليلُ `pg_indexes` |
| **🔒 غيرُ ممسوس** | `_tenant_has_lia` · `Customer` · `Barber` · أيُّ دالّةِ توفّر · `VERTICAL_REGISTRY` · أيُّ route · أيُّ واجهة |

---

## §٢ — الـdiff

```
app/prompts/lia.md                              +3      مفتاحٌ واحد، بنصِّك المُقَرّ
app/services/lia_owner_entry.py                +83      الفنسُ ونداءاتُه
app/services/reservation_service.py            +15      فرعُ UniqueViolationError (F4)
prisma/migrations/add_reservation_...sql       جديد     جملةٌ واحدة
scripts/test_lia_foundation.py                +116      FG-1…FG-11 · RG-e
scripts/test_reservation_contract_baseline.py  +71      RX-1…RX-4
scripts/test_first_message_and_escape.py       +13      TRANSITION: الفنسُ الجديد يُستَب مثل ①-b
```

**ولم يُلمَس `scripts/inspect_whatsapp_templates.py`** — يظهر في `git status` معدَّلاً منذ ما قبل
هذه الجلسة، ويبقى خارج أيّ staging بقاعدتك الثابتة.

---

## §٣ — الفحوص: ١٠٢١ أخضر

| الحزمة | PASS |
|---|---|
| `test_lia_reservation_t4` | 250 |
| `test_lia_daily_log` | 197 |
| `test_lia_foundation` | **104** (كان ٨٢ · +٢٢ من P1-A) |
| `test_lia_product_s3` | 102 |
| `test_lia_s7` | 92 |
| `test_first_message_and_escape` | 49 |
| `test_reservation_text_matcher` | 49 |
| `test_lia_draft_editing` | 46 |
| `test_reservation_contract_baseline` | **33** (كان ٢٩ · +٤ من RX) |
| `test_reservation_contract_t5` · `t3b` · `t1` · `product_s1` · `permission_core` | 29 · 28 · 23 · 19 · ✅ |

### 🔴 حزمتان فاشلتان — **وأُثبت أنّهما فاشلتان قبل شغلي**

`test_phase_2b4_core.py` و`test_slice3_core.py` ترجعان `rc=1`. **لم أفترض، بل قِسْت:** أنشأتُ
`git worktree` على `HEAD` النظيف وشغّلتُهما هناك — **فشلتا بالنتيجة نفسها**. ثمّ أُزيلت الشجرة.

```
test_phase_2b4_core.py@HEAD   rc=1   FAILED: ...and the reason names the unmigrated area
test_slice3_core.py@HEAD      rc=1   FAILED: ...and the message names 'catalog'
```

⇒ **عطلٌ سابقٌ قائم، خارج نطاق P1، ولم يُلمَس.** ويُسجَّل هنا لا يُطوى.

### وانحدارٌ حقيقيٌّ وجدتُه وأصلحتُه

`test_first_message_and_escape.py` كانت **خضراء على HEAD** وفشلت عندي بـ`ClientNotConnectedError`.
السبب مقيسٌ من التتبُّع: الحزمةُ تستب `_tenant_has_lia` ولا تعرف الفنسَ الجديد، فبلغ الفنسُ
عميلَ Prisma الحقيقيّ. **الخللُ في الـfake لا في الكود** (fake أفقر من الواقع)، وأُصلح بستبِّ
الفنس إلى جانب ①-b مع TRANSITION note تشرح السبب. أُعيد التشغيل: **٤٩ أخضر**.

---

## §٤ — دليل AST لـ FG-6 و RG-e

```
FG-6  ①-b is called from exactly three places        PASS  ['_still_authorised', 'try_handle']
FG-6  every one of them also calls ①-a               PASS
FG-6  welcome: ①-a precedes ①-b                      PASS
FG-6  data-entry: ①-a precedes ①-b                   PASS
FG-6  _still_authorised: ①-a precedes ①-b            PASS
FG-7  no fallback anywhere ... never resolves to barber when it refuses   PASS
FG-7  the allow-list is a frozenset literal in code, not a DB read        PASS
RG-e  _tenant_has_lia is untouched: bridge literal intact, ①-a absent     PASS
RG-e  and ①-a knows nothing about capabilities                           PASS
```

وسلوكيّاً: FG-1…FG-5b (عيادة مرفوضةٌ **ومعها `reservations` فعّالة**، `NULL` مرفوض، vertical
مجهولٌ مرفوض، تينانتٌ غيرُ موجودٍ مرفوضٌ لا منهار) · FG-10 (`_still_authorised` يردّ
`vertical_not_allowed` وقتَ الكتابة) · FG-10b (الـbackstop **يرفع** لا يردّ) · FG-8/9/11.

**و FG-5b هو جوهرُ الأمر:** `_tenant_has_lia(CLINIC) is True` و`_vertical_allows_lia(CLINIC) is False`
— أي أنّ ①-b وحدَها **كانت ستمرّر العيادة**.

---

## §٥ — دليل `pg_indexes` · والتغييرُ الوحيد على الإنتاج

**الخَرج الكامل:** `.claudedocs/work/clinic-preflight/2026-09-25/db-04-p1-index.txt`

```
BEFORE · 7 index(es) on reservations · reservations rows = 66
AFTER  · 8 index(es)                 · reservations rows = 66

IX-1  reservations_active_resource_slot_uidx exists : True
      ... USING btree (client_id, resource_id, reserved_at)
      WHERE status = ANY (ARRAY['pending','confirmed','arrived']) AND resource_id IS NOT NULL
IX-2  reservations_active_barber_slot_uidx unchanged : True
DATA  reservations rows before/after : 66 / 66 (UNCHANGED)
DIFF  added=['reservations_active_resource_slot_uidx'] removed=[] changed=[]
```

### 🔴 إفصاحٌ صريح

**هذا هو التغييرُ الوحيدُ الذي لمس الإنتاج في P1، وهو DDL لا بيانات.** قرأتُ أمرَك «صفر
production **data** writes» + «P1-B» + «pg_indexes evidence» على أنّه إذنٌ بتطبيق الفهرس —
وأقولُه هنا صراحةً لتعترض إن كنتُ أخطأتُ القراءة.

**وما يُثبت أنّه ليس كتابةَ بيانات:** عدُّ صفوف `reservations` **٦٦ قبل و٦٦ بعد**، مقروءاً في
النداء نفسِه. والسكربتُ يقرأ الجملةَ من ملفّ الـmigration نفسِه ويرفض أيَّ جملةٍ ثانيةٍ أو أيَّ
كلمةٍ مفتاحيّةٍ هدّامة، ويستعمل `DIRECT_URL` لا المجمَّع.

**التراجع:** `DROP INDEX IF EXISTS reservations_active_resource_slot_uidx;` — وصفرُ صفٍّ يلمسه.

---

## §٦ — Unknowns — كما هي، بلا تخمين

| ID | المجهول | الحالة |
|---|---|---|
| **P1-U1** | **إغلاقُ سباقِ المورد حيّاً** | 🔴 **غيرُ مُثبَت.** الفهرسُ مُثبَتٌ **بنيويّاً** فقط. صفرُ صفٍّ يحمل `resourceId` وصفرُ فحصِ تزامنٍ في الريبو ⇒ لا سبيل لإثباته بلا حجزِ عيادةٍ حقيقيّ. **يُغلَق في P4/P6.** ولا يُقال «race verified» في أيّ تقريرٍ حتّى ذلك الحين |
| **U2** | ماذا تحتاج عيادةٌ لبنانيّةٌ حقيقيّة | مفتوح — يخصّ C1.4 و C2.3 |
| **U3 · U4 · U5 · U6** | نوافذُ الحجز · «مريضٌ معروف» · `parcours` · سعةُ قائمة واتساب | مفتوحة، ولا تحجب |
| **U8-a · U8-b** | تفاصيلُ `Dr. Faisal`/`Dr. Sara` | مفتوحة بقرارِ «لا نلمس» |
| **PRE-1** 🆕 | `test_phase_2b4_core` و`test_slice3_core` فاشلتان على HEAD | **عطلٌ سابقٌ موثَّق**، خارج P1، لم يُحقَّق فيه |

---

## §٧ — الحالة

```
✅  P1-A · P1-B · P1-C  منفَّذة
✅  ١٠٢١ فحصاً أخضر · صفرُ انحدارٍ في الحلاقة
✅  فهرسُ المورد مطبَّقٌ ومُثبَتٌ بنيويّاً · وفهرسُ الحلاق سليم
✅  صفرُ production DATA writes — ٦٦/٦٦ صفّاً بلا حركة
⚠️  وproduction MUTATION واحدة من نوع DDL: الفهرس. داخلَ نطاق P1، مُعلَنةٌ لا مطويّة
    🔒 لا تُوصَف P1 مستقبلاً بأنّها «صفر production mutations» (تصحيحُ سلمان، ٢٠٢٦-٠٩-٢٥)
⏸️  صفرُ commit · صفرُ push · صفرُ deploy
🔴  سباقُ المورد: غيرُ مُثبَتٍ حيّاً — مُعلَن، لا مطويّ
```
