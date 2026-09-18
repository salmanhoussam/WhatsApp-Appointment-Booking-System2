// Lia Live Test Console — served from YOUR domain, inside the already-JWT-gated dashboard.
//
// WHY IT LIVES HERE AND NOT AS AN EXTERNAL PAGE (Salman, 2026-09-18): the console must be part of
// the tenant's own environment, not a third-party page. `/:slug/dashboard/*` is already behind
// `ProtectedRoute` on both `alzabt.` and `demo.` (App.jsx:196), so this route needs:
//     · ZERO new backend routes          · ZERO auth changes
//     · ZERO nav entries for any tenant  · lazy-loaded, so it never weighs on a real login
// It is reached only by typing the URL: /{slug}/dashboard/lia-live-test
//
// 🔴 WHY IT IS NOT IN THE NAV, and why that works without touching the nav guard: the guard at
// GenericAdminDashboard.jsx:634 force-redirects an unknown tab, but it is scoped to
// `isPermissionBased` accounts. A legacy owner (TENANT_ADMIN with permissions IS NULL — Salman's
// own account shape at barberlab-test) is not subject to it, so a nav-invisible tab renders. If
// that account is ever migrated to a permission array, this page starts bouncing to the first nav
// item; that is the one known fragility and it is written here rather than discovered later.
//
// 🔴 WHAT THIS PAGE CANNOT PROVE, stated in the UI as well as here. Two of the six evidence types
// can never come from a browser session:
//     · SecurityAuditLog has ZERO endpoints in app/api/ — reading it needs a new route, which was
//       explicitly refused. Yet a proven REFUSAL is half of what makes tenant isolation evidence
//       (an absent row alone is equally consistent with a bug).
//     · The negative boundary (rk, mr-h) is unreachable BY DESIGN — this JWT is scoped to one
//       tenant, and reading another's rows is exactly what multi-tenancy forbids.
// Both stay with `scripts/lia_live_evidence.py`. This console complements that script; it does
// not replace it, and it never decides a verdict.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import adminApi from '../../utils/admin.config'
import { T, FONT } from './theme'

// The tenant this console is allowed to run against. Hard-coded on purpose: Salman's standing
// rule is that the live test never touches `rk`, and a slug read from the URL would make that a
// matter of who typed what.
const ALLOWED_SLUG = 'barberlab-test'
// The commit that BUILT the behaviour this checklist describes (T4). Deliberately not "the
// deployment hash to expect": shipping this page is itself a deploy, so pinning an exact hash
// here could never be satisfied by the deploy that carries it. What matters is that the running
// build CONTAINS this commit — which is what the log-correlation step checks, and it is why a
// run must never start on an older deploy (the mistake that nearly happened on 2026-09-18, when
// the new build existed but the old one was still the RUNNING instance).
const LIA_BUILD = '06f9a5b'
const STORE_KEY = 'lia_live_test_results_v1'

const VERDICTS = [
  ['pass',    'ناجح',                  T.green],
  ['fail',    'فاشل',                  T.danger],
  ['risk',    'سلوك مؤكَّد / خطر منتج', '#B45309'],
  ['unknown', 'غير محسوم',             T.textSecond],
]

const SECTIONS = [
  ['A · القناة', [
    ['L-01', 'أول رسالة: الترحيب يصل', 'مرحبا',
      'ترحيب ليا وزرّ «احجز موعد». جلسة واحدة، وردّ واحد لا مكرَّر.'],
    ['L-02', 'الردّ صادر من النسخة المنشورة', '—',
      `سطر لوج يحمل هذه الرسالة بعينها، من نشرٍ يحتوي ${LIA_BUILD}. بلا سطر ⇒ غير محسوم، لا ناجح.`],
    ['L-03', 'رسالتان متتاليتان بسرعة', 'مرحبا',
      'لا ردّ مزدوج على الرسالة الواحدة.'],
  ]],
  ['B · الهوية', [
    ['L-04', 'رقم غير معروف يطلب أمر مالك', 'ضيف منتج شامبو بـ12 دولار',
      'صمت تام + صفر كتابة. (من رقم آخر إن توفّر)'],
    ['L-05', 'رقمك يطلب الأمر نفسه', 'ضيف منتج شامبو تجريبي بـ12 دولار',
      'يدخل مسار المالك ويعرض معاينة قبل أي كتابة.'],
    ['L-06', 'التينانت الصحيح وحده', '—',
      'الصفّ الجديد على barberlab-test فقط — يُقرأ من قاعدة البيانات لا من الرسالة.'],
  ]],
  ['C · خدمة وبضاعة', [
    ['L-07', 'خدمة كاملة بجملة واحدة', 'ضيف خدمة قص شعر 10 دولار ونص ساعة',
      'معاينة، ثم تأكيد، ثم صفّ CatalogService حقيقي.'],
    ['L-08', 'الصمت الذي أسقط اختبار ١٧ أيلول', 'ضيف ماكينة حلاقة 20 دولار',
      'سؤال «خدمة أو بضاعة أو موعد؟» — لا صمت.'],
    ['L-09', 'الجواب يُستأنف من النص الأصلي', 'بضاعة',
      'يكمل من «ماكينة حلاقة 20 دولار»، لا من كلمة «بضاعة».'],
    ['L-10', 'الفرانكو يُفهم', 'dif mantoj shampoo keratin b 12 dollar',
      'يدخل المسار، والاسم المستخرج يعود بالعربية.'],
  ]],
  ['D · التكرار — العطب الأول', [
    ['L-11', 'اسم موجود أصلاً', 'ضيف منتج مشط خشب بـ5 دولار',
      'يعرض الاسم المخزَّن والسعر والقسم، وثلاثة أزرار، وصفر كتابة.'],
    ['L-12', '«عدّل الموجود»', '[اضغط زرّ: عدّل الموجود]',
      'سؤال: السعر، الاسم، ولا القسم؟'],
    ['L-13', 'جواب باسم حقل غير مبنيّ', 'الاسم',
      '«هلق فيني عدّل السعر بس» — ولا حلقة مفرغة.'],
    ['L-14', 'تعديل السعر وحده', '7',
      'قاعدة البيانات: السعر وحده تغيّر، والاسم والقسم كما هما.'],
    ['L-15', 'مسافات زائدة والإلغاء', 'ضيف منتج  مشط خشب  بـ5 دولار',
      'يجد الصفّ نفسه رغم المسافات · والإلغاء صفر كتابة.'],
  ]],
  ['E · لا صمت', [
    ['L-16', 'فعل بلا حمولة', 'ضيف',
      '«شو بدك تضيف؟ اكتبلي الاسم والسعر» — لا صمت.'],
    ['L-17', 'غموض صريح', 'ضيف خدمة وبضاعة',
      'سؤال ثلاثي، والجواب بعده يُستقبَل ولا يسقط.'],
  ]],
  ['F · الفرانكو والحدود', [
    ['L-18', 'أنت كزبون بالفرانكو', 'bade e7jez da8n',
      'مسار حجز الزبون — لا مسار المالك.'],
    ['L-19', 'فخّ ndif', 'bade mkan ndif w mrattab',
      'لا يُقرأ فعلاً ولا يدخل مسار المالك.'],
  ]],
  ['G+H · موعد ماضٍ وزبون', [
    ['L-20', 'الجملة التي طلبتها', 'سجّللي إنو أحمد إجا مبارح الساعة 4 وعمل قص شعر',
      'يسأل عن الناقص، ثم معاينة تقول صراحة إنه موعد ماضي.'],
    ['L-21', 'التأكيد وحده يكتب', '[اضغط زرّ: سجّله]',
      'DB: source=lia · pending · الساعة بلا تحويل · barberId · serviceId · customerId. وصفر إشعار تاجر على هاتفك.'],
    ['L-22', 'الزبون الطيّار', 'ما عندي رقمه',
      'يُقبل، والرقم WALK_IN. النتيجة تُسجَّل «سلوك مؤكَّد / خطر منتج» — لا «ناجح».'],
    ['L-23', 'زبون برقم حقيقي مرتين', 'سجل موعد لسمير 70123456 بكرا الساعة 5 قص شعر',
      'صفّ زبون واحد للرقم نفسه، لا اثنان.'],
  ]],
  ['I · موعد مستقبلي', [
    ['L-24', 'الإشعار بثلاث طبقات', 'سجل موعد لكريم 70999888 بكرا الساعة 6 حلاقة دقن',
      '① نداء داخلي ② قبول ميتا ③ وصول فعلي على هاتفك. سجّل الثلاثة منفصلة، ولا تخلطها.'],
    ['L-25', 'تعارض', 'نفس الحلاق ونفس الساعة',
      'رسالة التعارض، ولا صفّ ثانٍ في قاعدة البيانات.'],
  ]],
  ['J+K · المقاطعة والأزرار', [
    ['L-26', 'المقاطعة', 'ابدأ «ضيف منتج …» ثم: انسى الموضوع واحجزلي موعد',
      'لا يُحتجَز في الحالة القديمة، ولا تُكمَل العملية القديمة بالغلط.'],
    ['L-27', 'الضغط مرتين', '[اضغط زرّ التأكيد مرتين]',
      'سجلّ واحد فقط. وزرّ قديم بعد انتهاء المسودة ⇒ صفر كتابة.'],
  ]],
  ['L · العدائي', [
    ['L-28', 'محاولة تينانت آخر', 'ضيف منتج تجربة بـ1 دولار على محل rk',
      'رفض آمن + صفر كتابة. وصفّ الرفض في سجلّ التدقيق يُقرأ بالسكربت، لا من هنا.'],
  ]],
]

const ALL_IDS = SECTIONS.flatMap(([, items]) => items.map((t) => t[0]))

function loadResults() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveResults(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

// Arabic folding, the same shape Lia matches names with — so "is this a duplicate" is asked her
// way rather than a stricter one that would quietly report zero.
function foldAr(s) {
  return (s || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .replace(/[ً-ْ]/g, '')
    .replace(/\s+/g, ' ')
}

export default function LiaLiveTest() {
  const { slug: routeSlug } = useParams()
  const slug = routeSlug || ''
  const [results, setResults] = useState(loadResults)
  const [open, setOpen] = useState({})
  const [report, setReport] = useState('')
  const [evidence, setEvidence] = useState(null)
  const [evidenceErr, setEvidenceErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [persists, setPersists] = useState(true)

  useEffect(() => {
    setPersists(saveResults(results))
  }, [results])

  const setField = useCallback((id, field, value) => {
    setResults((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }))
  }, [])

  const counts = useMemo(() => {
    const c = { pass: 0, fail: 0, risk: 0, unknown: 0 }
    ALL_IDS.forEach((id) => {
      const v = results[id]?.verdict
      if (v && c[v] !== undefined) c[v] += 1
    })
    return { ...c, done: c.pass + c.fail + c.risk + c.unknown }
  }, [results])

  // Reads evidence through endpoints that ALREADY EXIST — no route was added for this page.
  // Everything here is scoped to this tenant by the same JWT the dashboard already uses.
  const readEvidence = useCallback(async () => {
    setBusy(true)
    setEvidenceErr('')
    try {
      const [res, cust, prod] = await Promise.all([
        adminApi.get('/reservations/'),
        adminApi.get('/customers/'),
        adminApi.get('/store/products'),
      ])
      const rows = (x) => (Array.isArray(x?.data?.data) ? x.data.data : x?.data?.data?.items || [])
      const products = rows(prod)
      const groups = {}
      products.filter((p) => p.is_active !== false).forEach((p) => {
        const k = foldAr(p.name_ar)
        groups[k] = groups[k] || []
        groups[k].push(p)
      })
      setEvidence({
        at: new Date().toLocaleTimeString('ar'),
        reservations: rows(res).slice(0, 8),
        customers: rows(cust).slice(0, 8),
        walkIn: rows(cust).filter((c) => c.phone === 'WALK_IN'),
        duplicates: Object.entries(groups).filter(([, v]) => v.length > 1),
        productCount: products.length,
      })
    } catch (e) {
      setEvidenceErr(e?.response?.status ? `الخادم ردّ ${e.response.status}` : 'تعذّر القراءة')
    } finally {
      setBusy(false)
    }
  }, [])

  const generate = useCallback(() => {
    const lines = [`LIA LIVE VERIFICATION — ${slug} — lia build ${LIA_BUILD}`, '']
    SECTIONS.forEach(([section, items]) => {
      lines.push(`== ${section}`)
      items.forEach(([id, title, msg]) => {
        const s = results[id] || {}
        const verdict = VERDICTS.find((v) => v[0] === s.verdict)
        lines.push(`${id} | ${title}`)
        lines.push(`  input   : ${msg}`)
        lines.push(`  reply   : ${(s.reply || '—').replace(/\n/g, ' / ')}`)
        lines.push(`  state   : ${s.before || '—'} -> ${s.after || '—'}`)
        lines.push(`  db      : ${s.dbres || '—'}   record: ${s.rec || '—'}`)
        lines.push(`  notes   : ${(s.notes || '—').replace(/\n/g, ' / ')}`)
        lines.push(`  VERDICT : ${verdict ? verdict[1] : '—'}`)
      })
      lines.push('')
    })
    setReport(lines.join('\n'))
  }, [results, slug])

  if (slug !== ALLOWED_SLUG) {
    return (
      <div style={{ ...card, borderColor: T.danger }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>هذه الصفحة محصورة بـ {ALLOWED_SLUG}</h2>
        <p style={{ color: T.textSecond, margin: '8px 0 0' }}>
          الاختبار الحيّ لا يُجرى على أي تينانت آخر. المحل الحالي: <b>{slug || '—'}</b>
        </p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: FONT, color: T.textPrimary, direction: 'rtl' }}>
      <div style={{ ...card, background: '#FFFBEB', borderColor: '#FCD34D' }}>
        <b>هذه الصفحة تسجّل ولا تقرّر.</b>
        <p style={{ margin: '6px 0 0', color: T.textSecond, fontSize: 13, lineHeight: 1.8 }}>
          الدليل هو رسالة واتساب التي وصلت، وسطر لوج Railway، وصفّ قاعدة البيانات — لا حقلٌ مكتوب
          فيه «ناجح». وأي سيناريو بلا سطر لوج يربطه بنشرٍ يحتوي <b>{LIA_BUILD}</b> يُسجَّل
          «غير محسوم».
          <br />
          وسجلّ التدقيق والحدّ السلبي (rk · mr-h) لا يمكن قراءتهما من هنا — الأول بلا endpoint،
          والثاني يمنعه عزل التينانت نفسه. يبقيان في <code>scripts/lia_live_evidence.py</code>.
        </p>
      </div>

      <div style={{ ...card, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: 13 }}>
          أُجري <b>{counts.done}</b> من <b>{ALL_IDS.length}</b>
        </div>
        {VERDICTS.map(([k, label, color]) => (
          <div key={k} style={{ fontSize: 13, color }}>
            {label} <b>{counts[k]}</b>
          </div>
        ))}
        {!persists && (
          <div style={{ fontSize: 12, color: T.danger }}>
            التخزين المحلي مرفوض في هذا المتصفح — ولّد التقرير قبل إغلاق الصفحة.
          </div>
        )}
      </div>

      <div style={card}>
        <button type="button" onClick={readEvidence} disabled={busy} style={btnPrimary}>
          {busy ? 'يقرأ…' : 'اقرأ الدليل من قاعدة البيانات'}
        </button>
        <span style={{ fontSize: 12, color: T.textSecond, marginRight: 10 }}>
          عبر endpoints قائمة فعلاً: الحجوزات · العملاء · المنتجات
        </span>
        {evidenceErr && <p style={{ color: T.danger, fontSize: 13 }}>{evidenceErr}</p>}
        {evidence && (
          <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.9 }}>
            <div style={{ color: T.textSecond }}>قراءة {evidence.at}</div>
            <div>أصناف نشطة: <b>{evidence.productCount}</b> · أسماء مكرَّرة:{' '}
              <b style={{ color: evidence.duplicates.length ? T.danger : T.green }}>
                {evidence.duplicates.length}
              </b>
            </div>
            {evidence.duplicates.map(([name, rows]) => (
              <div key={name} style={{ color: T.danger }}>
                «{name}» ×{rows.length} — {rows.map((r) => r.id?.slice(0, 8)).join(' · ')}
              </div>
            ))}
            {evidence.walkIn.length > 0 && (
              <div style={{ color: '#B45309' }}>
                زبون طيّار: {evidence.walkIn.length} صفّ — سجّله «سلوك مؤكَّد / خطر منتج»، لا «ناجح».
              </div>
            )}
            <div style={{ marginTop: 6 }}>آخر الحجوزات:</div>
            {evidence.reservations.map((r) => (
              <div key={r.id} style={{ fontFamily: 'monospace', fontSize: 12, direction: 'ltr', textAlign: 'left' }}>
                {r.id?.slice(0, 8)} · {r.reserved_at} · {r.status} · src={r.source || '—'} · {r.customer_name}
              </div>
            ))}
          </div>
        )}
      </div>

      {SECTIONS.map(([section, items]) => (
        <div key={section}>
          <h3 style={{ fontSize: 13, color: T.textSecond, margin: '26px 0 10px', fontWeight: 700 }}>
            {section}
          </h3>
          {items.map(([id, title, msg, expected]) => {
            const s = results[id] || {}
            const v = VERDICTS.find((x) => x[0] === s.verdict)
            const isOpen = !!open[id]
            return (
              <div
                key={id}
                style={{
                  ...card,
                  marginBottom: 8,
                  padding: 0,
                  borderInlineStartWidth: 4,
                  borderInlineStartStyle: 'solid',
                  borderInlineStartColor: v ? v[2] : T.border,
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [id]: !o[id] }))}
                  style={rowBtn}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: T.textSecond }}>{id}</span>
                  <span style={{ flex: 1, textAlign: 'start', fontWeight: 600, fontSize: 14 }}>{title}</span>
                  <span style={{ fontSize: 12, color: v ? v[2] : T.textMuted }}>
                    {v ? v[1] : 'لم يُجرَّب'}
                  </span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 14px 14px', display: 'grid', gap: 10 }}>
                    {msg !== '—' && (
                      <div style={{ background: T.pageBg, borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 14 }}>{msg}</div>
                        <button
                          type="button"
                          style={btnGhost}
                          onClick={() => navigator.clipboard?.writeText(msg)}
                        >
                          نسخ النص
                        </button>
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: T.textSecond }}>
                      <b style={{ color: T.textPrimary }}>المتوقَّع: </b>{expected}
                    </div>

                    <Field label="ردّ ليا كما وصل حرفياً" id={`${id}-reply`}>
                      <textarea
                        id={`${id}-reply`} style={inputS} rows={3}
                        value={s.reply || ''} onChange={(e) => setField(id, 'reply', e.target.value)}
                      />
                    </Field>

                    <div style={two}>
                      <Field label="الحالة قبل" id={`${id}-before`}>
                        <input id={`${id}-before`} style={inputS} value={s.before || ''}
                               onChange={(e) => setField(id, 'before', e.target.value)} />
                      </Field>
                      <Field label="الحالة بعد" id={`${id}-after`}>
                        <input id={`${id}-after`} style={inputS} value={s.after || ''}
                               onChange={(e) => setField(id, 'after', e.target.value)} />
                      </Field>
                    </div>

                    <div style={two}>
                      <Field label="كتابة في قاعدة البيانات؟" id={`${id}-db`}>
                        <select id={`${id}-db`} style={inputS} value={s.dbres || ''}
                                onChange={(e) => setField(id, 'dbres', e.target.value)}>
                          <option value="" />
                          <option value="no-expected">لا — وهذا المطلوب</option>
                          <option value="yes-expected">نعم — وهذا المطلوب</option>
                          <option value="yes-unexpected">نعم — وما كان لازم</option>
                          <option value="no-unexpected">لا — وكان لازم</option>
                          <option value="unread">لم تُقرأ بعد</option>
                        </select>
                      </Field>
                      <Field label="Record ID" id={`${id}-rec`}>
                        <input id={`${id}-rec`} style={inputS} value={s.rec || ''}
                               onChange={(e) => setField(id, 'rec', e.target.value)} />
                      </Field>
                    </div>

                    <Field label="ملاحظة / سطر اللوج" id={`${id}-notes`}>
                      <textarea id={`${id}-notes`} style={inputS} rows={2}
                                value={s.notes || ''} onChange={(e) => setField(id, 'notes', e.target.value)} />
                    </Field>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {VERDICTS.map(([k, label, color]) => {
                        const on = s.verdict === k
                        return (
                          <button
                            key={k} type="button" aria-pressed={on}
                            onClick={() => setField(id, 'verdict', on ? '' : k)}
                            style={{
                              ...btnGhost, flex: 1, minWidth: 90,
                              background: on ? color : T.cardBg,
                              color: on ? '#fff' : T.textSecond,
                              borderColor: on ? color : T.border,
                              fontWeight: on ? 700 : 400,
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      <div style={{ ...card, marginTop: 24 }}>
        <button type="button" onClick={generate} style={btnPrimary}>ولّد التقرير</button>
        <textarea
          readOnly value={report}
          placeholder="اضغط «ولّد التقرير» وانسخ النص لأبو حسين."
          style={{ ...inputS, marginTop: 12, minHeight: 200, fontFamily: 'monospace',
                   fontSize: 12, direction: 'ltr', textAlign: 'left' }}
        />
      </div>
    </div>
  )
}

function Field({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: 12, color: T.textSecond, marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const card = {
  background: T.cardBg,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  boxShadow: T.shadow,
  padding: 16,
  marginBottom: 12,
}

const rowBtn = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
  background: 'none', border: 0, padding: 14, cursor: 'pointer',
  font: 'inherit', color: 'inherit',
}

const inputS = {
  width: '100%', boxSizing: 'border-box', background: T.pageBg,
  border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px',
  font: 'inherit', fontSize: 14, color: T.textPrimary,
}

const two = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }

const btnPrimary = {
  background: T.textPrimary, color: '#fff', border: 0, borderRadius: 8,
  padding: '10px 18px', font: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer',
}

const btnGhost = {
  background: T.cardBg, color: T.textSecond, border: `1px solid ${T.border}`,
  borderRadius: 8, padding: '6px 12px', font: 'inherit', fontSize: 13, cursor: 'pointer',
}
