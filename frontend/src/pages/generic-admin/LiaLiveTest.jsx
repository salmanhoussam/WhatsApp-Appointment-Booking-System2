// Lia Live Test Console v2 — the owner's page for live-testing Lia FROM HIS PHONE.
// Plan: .claudedocs/plans/lia-live-test-console-v2.md (D-1: barberlab-test only · D-2: device only).
//
// WHAT IT IS: a launcher and a notebook. Every typed step is one tap that opens WhatsApp on the
// central bot number with the message already written; every button step just tells the owner to
// press the button inside WhatsApp. The owner records only what he SEES (three states + a note).
//
// WHAT IT IS NOT: evidence. The DB rows, Railway log lines and SecurityAuditLog stay with
// `scripts/lia_live_evidence.py` and Claude. v1's evidence fields (state/DB/record/log) and its
// 28-scenario report were removed because the owner could not fill them from a phone.
//
// WIRING (unchanged from v1): served at /{slug}/dashboard/lia-live-test by GenericAdminDashboard's
// `case 'lia-live-test'` (lazy + Suspense), behind ProtectedRoute. Not in the nav. The unknown-tab
// redirect there is scoped to `isPermissionBased`, so a legacy owner (permissions IS NULL) reaches
// this page; a permission-based account would bounce to its first nav item — the known fragility.
//
// ZERO new backend routes. ZERO writes. Reads: the public whatsapp-link (the central number) and,
// on demand, the existing admin reservations/customers lists.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import adminApi from '../../utils/admin.config'
import publicApi from '../../utils/publicApi'
import { FONT } from './theme'

// D-1 (Salman, 2026-09-19): live tests run on barberlab-test only. rk is a USER of Lia, not a
// test target. Hard-coded on purpose, so it is never a matter of who typed which URL.
const ALLOWED_SLUG = 'barberlab-test'
const STORE_KEY = 'lia_console_v2'

const STATES = [
  ['none', 'ما جرّبت'],
  ['ok',   'زبطت متل المتوقع'],
  ['off',  'طلعت غير شي'],
]

// Real messages from the 2026-09-19 verified live runs — verbatim. Every starter ends at ❌, so a
// run never writes a real row unless the owner changes it himself.
const STARTERS = [
  { id: 's-past-no-number', title: 'موعد ماضي بلا رقم',
    steps: ['سجل موعد لأحمد مبارح الساعة 4 شعر مع سامي', 'زبون طيار', 'اضغط ❌'],
    expected: 'ليا بتسأل عن الرقم، بعدين بتعرض المعاينة، وبعد ❌: «تمام، ألغيت الموعد…».' },
  { id: 's-greet-barber-buttons', title: 'ترحيب + أزرار الحلاق + خدمة تلقائية',
    steps: ['سجل موعد عادل 70123321 مبارح الساعة 4', 'اضغط [زياد]', 'اضغط ❌'],
    expected: '«أهلاً …، نسيت تقلّي الحلاق. مين فيهم؟» مع أزرار الحلاقين، بعدين معاينة فيها «شعر ودقن (تلقائي)».' },
  { id: 's-edit-time', title: 'تعديل الوقت من المعاينة',
    steps: ['سجل موعد عادل 70123321 مبارح الساعة 4 مع سامي', 'خليها الساعة 5', 'اضغط ❌'],
    expected: 'معاينة جديدة على الساعة 17:00.' },
  { id: 's-edit-barber', title: 'تعديل الحلاق من المعاينة',
    steps: ['سجل موعد عادل 70123321 مبارح الساعة 4 مع سامي', 'خليه مع زياد', 'اضغط ❌'],
    expected: 'معاينة جديدة والحلاق فيها زياد.' },
  { id: 's-unknown-barber', title: 'حلاق مش موجود',
    steps: ['سجل موعد عادل 70123321 مبارح الساعة 4 مع سامي', 'خليه مع كريم', 'اضغط ❌'],
    expected: 'السؤال عن الحلاق مع لائحة الحلاقين الحقيقية.' },
  { id: 's-future', title: 'موعد مستقبلي',
    steps: ['سجل موعد لسامر 70123321 بكرا الساعة 3 مع سامي', 'اضغط ❌'],
    expected: 'معاينة بلا سطر «موعد ماضي».' },
  { id: 's-product', title: 'منتج',
    steps: ['ضيف منتج شامبو بـ12 دولار', 'اضغط ❌'],
    expected: 'معاينة المنتج قبل أي حفظ، و❌ بتلغيها.' },
]

const EMPTY = { custom: [], results: {}, hidden: [] }

// Every read/write is wrapped: private windows, blocked site data and quota errors all throw here,
// and the page must keep working in memory when they do.
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null')
    if (!raw || typeof raw !== 'object') return EMPTY
    return {
      custom: Array.isArray(raw.custom)
        ? raw.custom.filter((c) => c && typeof c.id === 'string' && typeof c.title === 'string'
            && Array.isArray(c.steps) && c.steps.every((s) => typeof s === 'string'))
        : [],
      results: raw.results && typeof raw.results === 'object' ? raw.results : {},
      hidden: Array.isArray(raw.hidden) ? raw.hidden : [],
    }
  } catch {
    return EMPTY
  }
}

function save(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

// A line starting with «اضغط» is a WhatsApp button tap, not a message to type.
function parseStep(line) {
  const t = line.trim()
  if (t.startsWith('اضغط')) {
    const label = t.slice('اضغط'.length).trim().replace(/^\[|\]$/g, '').trim()
    return { tap: true, label: label || '…' }
  }
  return { tap: false, text: t }
}

function toLines(text) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean)
}

function newId() {
  return `c-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fall through to the textarea path */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export default function LiaLiveTest() {
  const { slug: routeSlug } = useParams()
  const slug = routeSlug || ''

  const [store, setStore] = useState(load)
  const [persists, setPersists] = useState(true)
  const [botNumber, setBotNumber] = useState(null)
  const [botState, setBotState] = useState('loading') // loading | ready | off
  const [open, setOpen] = useState({})
  const [form, setForm] = useState(null) // null | { id?, title, steps, expected }
  const [exportMsg, setExportMsg] = useState('')
  const [exportText, setExportText] = useState('')
  const [evidence, setEvidence] = useState(null)
  const [evidenceErr, setEvidenceErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setPersists(save(store)) }, [store])

  // The central bot number comes ONLY from the tenant's public whatsapp-link. Never hardcoded,
  // and never the owner's personal wa.me number that marketing pages use.
  useEffect(() => {
    if (slug !== ALLOWED_SLUG) return undefined
    let alive = true
    publicApi
      .get('/reservations/whatsapp-link', { params: { client_slug: slug } })
      .then((res) => {
        const data = res?.data?.data
        let num = null
        if (data?.available && data?.url) {
          try { num = new URL(data.url).pathname.replace(/\D/g, '') } catch { num = null }
        }
        if (!alive) return
        if (num && num.length >= 8) { setBotNumber(num); setBotState('ready') } else setBotState('off')
      })
      .catch(() => { if (alive) setBotState('off') })
    return () => { alive = false }
  }, [slug])

  const tests = useMemo(() => [
    ...STARTERS.filter((s) => !store.hidden.includes(s.id)).map((s) => ({ ...s, starter: true })),
    ...store.custom.map((c) => ({ ...c, starter: false })),
  ], [store])

  const hiddenStarters = STARTERS.filter((s) => store.hidden.includes(s.id))

  const counts = useMemo(() => {
    const c = { none: 0, ok: 0, off: 0 }
    tests.forEach((t) => { const k = store.results[t.id]?.status; c[k in c ? k : 'none'] += 1 })
    return c
  }, [tests, store.results])

  const setResult = useCallback((id, field, value) => {
    setStore((s) => ({ ...s, results: { ...s.results, [id]: { ...(s.results[id] || {}), [field]: value } } }))
  }, [])

  const isOpen = (t) => (open[t.id] !== undefined ? open[t.id] : (store.results[t.id]?.status || 'none') === 'none')

  const saveForm = () => {
    const steps = toLines(form.steps)
    const title = form.title.trim()
    if (!title || !steps.length) return
    const entry = { id: form.id || newId(), title, steps, expected: form.expected.trim() }
    setStore((s) => ({
      ...s,
      custom: form.id ? s.custom.map((c) => (c.id === form.id ? entry : c)) : [...s.custom, entry],
    }))
    setOpen((o) => ({ ...o, [entry.id]: true }))
    setForm(null)
  }

  const removeCustom = (id) => {
    if (!window.confirm('نحذف هالاختبار عن هالجهاز؟')) return
    setStore((s) => {
      const results = { ...s.results }
      delete results[id]
      return { ...s, custom: s.custom.filter((c) => c.id !== id), results }
    })
  }

  const setHidden = (id, hide) => setStore((s) => ({
    ...s, hidden: hide ? [...new Set([...s.hidden, id])] : s.hidden.filter((h) => h !== id),
  }))

  const exportAll = async () => {
    const label = Object.fromEntries(STATES)
    const lines = [`Lia — دفتر الاختبار — ${slug} — ${new Date().toLocaleString('ar')}`, '']
    tests.forEach((t, i) => {
      const r = store.results[t.id] || {}
      lines.push(`${i + 1}. ${t.title}${t.starter ? '' : ' (مكتوب يدوياً)'}`)
      t.steps.forEach((s, j) => lines.push(`   ${j + 1}) ${s}`))
      if (t.expected) lines.push(`   المتوقّع: ${t.expected}`)
      lines.push(`   النتيجة: ${label[r.status || 'none']}`)
      if (r.note) lines.push(`   ملاحظة: ${r.note.replace(/\n/g, ' / ')}`)
      lines.push('')
    })
    const text = lines.join('\n')
    const ok = await copyText(text)
    setExportMsg(ok ? 'انتسخ ✓' : '')
    setExportText(ok ? '' : text)
    if (ok) setTimeout(() => setExportMsg(''), 2500)
  }

  // Light, read-only view through endpoints that already exist, scoped by the dashboard's own JWT.
  const readEvidence = useCallback(async () => {
    setBusy(true)
    setEvidenceErr('')
    try {
      const [res, cust] = await Promise.all([adminApi.get('/reservations/'), adminApi.get('/customers/')])
      const rows = (x) => (Array.isArray(x?.data?.data) ? x.data.data : x?.data?.data?.items || [])
      setEvidence({
        at: new Date().toLocaleTimeString('ar'),
        reservations: rows(res).slice(0, 5),
        customers: rows(cust).slice(0, 5),
      })
    } catch (e) {
      setEvidenceErr(e?.response?.status ? `الخادم ردّ ${e.response.status}` : 'تعذّرت القراءة')
    } finally {
      setBusy(false)
    }
  }, [])

  if (slug !== ALLOWED_SLUG) {
    return (
      <div className="llt" dir="rtl">
        <style>{CSS}</style>
        <section className="llt-hero">
          <p className="llt-eyebrow">LIA · LIVE CONSOLE</p>
          <h1 className="llt-h1">هالصفحة بس لـ {ALLOWED_SLUG}</h1>
          <p className="llt-sub">الاختبار الحيّ ما بيصير على أي محل تاني. المحل الحالي: <b>{slug || '—'}</b></p>
        </section>
      </div>
    )
  }

  const waHref = (text) => `https://wa.me/${botNumber}?text=${encodeURIComponent(text)}`

  return (
    <div className="llt" dir="rtl">
      <style>{CSS}</style>

      <section className="llt-hero">
        <p className="llt-eyebrow">LIA · LIVE CONSOLE · {slug}</p>
        <h1 className="llt-h1">جرّب ليا من تلفونك</h1>
        <p className="llt-sub">كل كبسة خضرا بتفتح واتساب والرسالة جاهزة — إنت بس اكبس «إرسال».</p>
        <div className="llt-wa-status" data-state={botState}>
          <span className="llt-dot" />
          {botState === 'loading' && 'عم نجيب رقم ليا…'}
          {botState === 'ready' && <>رقم ليا جاهز <span className="llt-num" dir="ltr">+{botNumber}</span></>}
          {botState === 'off' && 'رقم ليا مش مضبوط هون — كبسات الإرسال مخفية.'}
        </div>
        <div className="llt-tally">
          {STATES.map(([k, label]) => (
            <div key={k} className="llt-tally-item" data-s={k}>
              <b>{counts[k]}</b><span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="llt-disclaimer">
        هالصفحة دفتر ملاحظات، مش دليل. الدليل (قاعدة البيانات واللوج) بيقرأه Claude من السيرفر.
        {!persists && <span className="llt-warn"> التخزين مقفول بهالمتصفح — ملاحظاتك رح تروح إذا سكّرت الصفحة، انسخها قبل.</span>}
      </p>

      <div className="llt-toolbar">
        <button type="button" className="llt-btn llt-btn-dark"
                onClick={() => setForm({ title: '', steps: '', expected: '' })}>
          + اكتب اختبار جديد
        </button>
        <button type="button" className="llt-btn llt-btn-quiet" onClick={exportAll}>
          {exportMsg || 'انسخ الكل'}
        </button>
      </div>
      {exportText && (
        <div className="llt-card llt-pad">
          <p className="llt-small">النسخ التلقائي ما زبط — حدّد النص وانسخه يدوياً:</p>
          <textarea className="llt-input llt-mono" rows={8} readOnly value={exportText}
                    onFocus={(e) => e.target.select()} />
        </div>
      )}

      {form && (
        <TestForm form={form} setForm={setForm} onSave={saveForm} onCancel={() => setForm(null)} />
      )}

      <ol className="llt-list">
        {tests.map((t, idx) => {
          const r = store.results[t.id] || {}
          const status = r.status || 'none'
          const expanded = isOpen(t)
          return (
            <li key={t.id} className="llt-card llt-test" data-s={status}>
              <button type="button" className="llt-test-head" aria-expanded={expanded}
                      onClick={() => setOpen((o) => ({ ...o, [t.id]: !expanded }))}>
                <span className="llt-idx">{String(idx + 1).padStart(2, '0')}</span>
                <span className="llt-test-title">
                  {t.title}
                  <span className="llt-meta">{t.steps.length} خطوات{t.starter ? '' : ' · مكتوب يدوياً'}</span>
                </span>
                <span className="llt-badge" data-s={status}>{Object.fromEntries(STATES)[status]}</span>
              </button>

              {expanded && (
                <div className="llt-body">
                  <ol className="llt-steps">
                    {t.steps.map((line, i) => {
                      const step = parseStep(line)
                      return (
                        <li key={i} className="llt-step">
                          <span className="llt-step-n">{i + 1}</span>
                          {step.tap ? (
                            <div className="llt-tap">
                              <span>اضغط الزر في واتساب</span>
                              <span className="llt-chip">{step.label}</span>
                            </div>
                          ) : (
                            <div className="llt-send">
                              <div className="llt-bubble">{step.text}</div>
                              {botState === 'ready' && (
                                <a className="llt-btn llt-btn-wa" href={waHref(step.text)}
                                   target="_blank" rel="noopener noreferrer">
                                  افتح بواتساب
                                </a>
                              )}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ol>

                  {t.expected && (
                    <div className="llt-expected">
                      <span className="llt-label">المتوقّع</span>
                      <p>{t.expected}</p>
                    </div>
                  )}

                  <div className="llt-label">شو صار؟</div>
                  <div className="llt-seg" role="radiogroup" aria-label="النتيجة">
                    {STATES.map(([k, label]) => (
                      <button key={k} type="button" role="radio" aria-checked={status === k}
                              className="llt-seg-btn" data-s={k}
                              onClick={() => setResult(t.id, 'status', k)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <textarea className="llt-input" rows={2} placeholder="ملاحظة (اختياري) — شو شفت بالظبط؟"
                            aria-label="ملاحظة" value={r.note || ''}
                            onChange={(e) => setResult(t.id, 'note', e.target.value)} />

                  <div className="llt-row-actions">
                    {t.starter ? (
                      <button type="button" className="llt-link" onClick={() => setHidden(t.id, true)}>إخفاء</button>
                    ) : (
                      <>
                        <button type="button" className="llt-link"
                                onClick={() => setForm({ id: t.id, title: t.title, steps: t.steps.join('\n'), expected: t.expected || '' })}>
                          تعديل
                        </button>
                        <button type="button" className="llt-link llt-link-danger" onClick={() => removeCustom(t.id)}>حذف</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {hiddenStarters.length > 0 && (
        <div className="llt-card llt-pad">
          <div className="llt-label">اختبارات مخفية</div>
          {hiddenStarters.map((s) => (
            <div key={s.id} className="llt-hidden-row">
              <span>{s.title}</span>
              <button type="button" className="llt-link" onClick={() => setHidden(s.id, false)}>رجّعه</button>
            </div>
          ))}
        </div>
      )}

      <details className="llt-card llt-pad llt-evidence">
        <summary>آخر ما انكتب بقاعدة البيانات <span className="llt-meta">قراءة فقط</span></summary>
        <button type="button" className="llt-btn llt-btn-quiet" onClick={readEvidence} disabled={busy}>
          {busy ? 'عم يقرا…' : 'اقرا هلّق'}
        </button>
        {evidenceErr && <p className="llt-warn">{evidenceErr}</p>}
        {evidence && (
          <div className="llt-ev">
            <p className="llt-small">قراءة {evidence.at}</p>
            <div className="llt-label">آخر الحجوزات</div>
            {evidence.reservations.length === 0 && <p className="llt-small">ولا حجز.</p>}
            {evidence.reservations.map((r) => (
              <div key={r.id} className="llt-ev-row">
                <b>{r.customer_name || '—'}</b>
                <span dir="ltr">{r.reserved_at || '—'}</span>
                <span>{r.status || '—'} · {r.source || '—'}</span>
              </div>
            ))}
            <div className="llt-label">آخر الزباين</div>
            {evidence.customers.length === 0 && <p className="llt-small">ولا زبون.</p>}
            {evidence.customers.map((c, i) => (
              <div key={c.phone ?? `np-${i}`} className="llt-ev-row">
                <b>{c.name || 'بدون اسم'}</b>
                <span dir="ltr">{c.no_phone ? 'بدون رقم' : c.phone}</span>
              </div>
            ))}
          </div>
        )}
      </details>
    </div>
  )
}

function TestForm({ form, setForm, onSave, onCancel }) {
  const valid = form.title.trim() && toLines(form.steps).length > 0
  return (
    <div className="llt-card llt-pad llt-form">
      <div className="llt-form-title">{form.id ? 'تعديل الاختبار' : 'اختبار جديد'}</div>
      <label className="llt-label" htmlFor="llt-f-title">العنوان</label>
      <input id="llt-f-title" className="llt-input" value={form.title}
             onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً: موعد بلا حلاق" />
      <label className="llt-label" htmlFor="llt-f-steps">الخطوات</label>
      <p className="llt-small">كل رسالة بسطر. السطر اللي بيبلّش بـ«اضغط» يعني زر بواتساب (مثلاً: اضغط ❌).</p>
      <textarea id="llt-f-steps" className="llt-input" rows={4} value={form.steps}
                onChange={(e) => setForm({ ...form, steps: e.target.value })}
                placeholder={'سجل موعد لعلي بكرا الساعة 2\nاضغط ❌'} />
      <label className="llt-label" htmlFor="llt-f-exp">شو لازم يصير</label>
      <textarea id="llt-f-exp" className="llt-input" rows={2} value={form.expected}
                onChange={(e) => setForm({ ...form, expected: e.target.value })} />
      <div className="llt-toolbar">
        <button type="button" className="llt-btn llt-btn-dark" onClick={onSave} disabled={!valid}>حفظ</button>
        <button type="button" className="llt-btn llt-btn-quiet" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  )
}

// Scoped under `.llt` — nothing here reaches another tab or tenant. The page paints every one of
// its own surfaces (never inherits the dashboard's background or text colour), so it reads the
// same whether the surrounding dashboard is light or dark.
const CSS = `
.llt {
  --ink: #0C1A15; --ink-2: #16302A; --ink-text: #EAF3EE; --ink-muted: #9FB8AC;
  --paper: #EFEBE1; --card: #FFFDF8; --line: rgba(12,26,21,0.12);
  --text: #15211C; --muted: #5E6C65;
  --wa: #25D366; --wa-press: #1DB954; --wa-ink: #05361D; --bubble: #DCF8C6;
  --ok: #17754A; --ok-soft: #DDF2E6; --off: #B4441B; --off-soft: #FBE7DC;
  --none: #6A7872; --none-soft: #E6E2D7;
  color-scheme: light;
  font-family: ${FONT}; color: var(--text); background: var(--paper);
  border-radius: 20px; padding: 12px; max-width: 760px; margin: 0 auto;
  box-sizing: border-box; min-width: 0; overflow-wrap: anywhere;
}
.llt *, .llt *::before, .llt *::after { box-sizing: border-box; }
.llt-hero {
  background: radial-gradient(120% 90% at 100% 0%, #1E4A3B 0%, var(--ink) 60%);
  color: var(--ink-text); border-radius: 16px; padding: 20px 18px;
}
.llt-eyebrow { margin: 0 0 6px; font: 700 11px 'Space Mono', monospace; letter-spacing: .14em; color: var(--ink-muted); direction: ltr; text-align: right; }
.llt-h1 { margin: 0; font-size: 24px; font-weight: 900; line-height: 1.3; }
.llt-sub { margin: 6px 0 0; font-size: 14px; line-height: 1.8; color: var(--ink-muted); }
.llt-wa-status { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 14px; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.07); font-size: 13px; }
.llt-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ink-muted); flex: none; }
.llt-wa-status[data-state="ready"] .llt-dot { background: var(--wa); box-shadow: 0 0 0 4px rgba(37,211,102,0.2); }
.llt-wa-status[data-state="off"] .llt-dot { background: #F59E0B; }
.llt-num { font-family: 'Space Mono', monospace; font-size: 12px; color: var(--ink-text); }
.llt-tally { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; margin-top: 16px; }
.llt-tally-item { background: rgba(255,255,255,0.06); border-radius: 12px; padding: 10px 8px; text-align: center; }
.llt-tally-item b { display: block; font-size: 22px; font-weight: 900; line-height: 1.1; }
.llt-tally-item span { font-size: 11px; color: var(--ink-muted); }
.llt-tally-item[data-s="ok"] b { color: #6EE7A8; }
.llt-tally-item[data-s="off"] b { color: #FDBA8C; }
.llt-disclaimer { margin: 12px 4px; font-size: 12px; line-height: 1.8; color: var(--muted); }
.llt-warn { color: var(--off); font-size: 12px; }
.llt-toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 12px; }
.llt-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 0 18px; border-radius: 12px; border: 1px solid transparent; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; text-decoration: none; transition: transform .12s ease, background-color .15s ease; -webkit-tap-highlight-color: transparent; }
.llt-btn:active { transform: scale(0.98); }
.llt-btn:disabled { opacity: .5; cursor: default; }
.llt-btn:focus-visible, .llt-seg-btn:focus-visible, .llt-link:focus-visible, .llt-test-head:focus-visible { outline: 3px solid #3B82F6; outline-offset: 2px; }
.llt-btn-dark { background: var(--ink); color: var(--ink-text); flex: 1 1 auto; }
.llt-btn-quiet { background: var(--card); color: var(--text); border-color: var(--line); }
.llt-btn-wa { background: var(--wa); color: var(--wa-ink); width: 100%; min-height: 52px; font-size: 16px; font-weight: 900; box-shadow: 0 6px 16px -8px rgba(29,185,84,0.8); }
.llt-btn-wa:hover { background: var(--wa-press); }
.llt-card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; margin-bottom: 10px; }
.llt-pad { padding: 16px; }
.llt-list { list-style: none; margin: 0; padding: 0; }
.llt-test { overflow: hidden; }
.llt-test-head { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 16px; background: none; border: 0; font: inherit; color: inherit; text-align: start; cursor: pointer; }
.llt-idx { font: 700 12px 'Space Mono', monospace; color: var(--muted); flex: none; }
.llt-test-title { flex: 1; min-width: 0; font-size: 15px; font-weight: 700; line-height: 1.5; }
.llt-meta { display: block; font-size: 12px; font-weight: 400; color: var(--muted); }
.llt-badge { flex: none; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: var(--none-soft); color: var(--none); max-width: 42%; text-align: center; line-height: 1.5; }
.llt-badge[data-s="ok"] { background: var(--ok-soft); color: var(--ok); }
.llt-badge[data-s="off"] { background: var(--off-soft); color: var(--off); }
.llt-body { padding: 0 16px 16px; border-top: 1px solid var(--line); }
.llt-steps { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 12px; }
.llt-step { display: flex; gap: 10px; align-items: flex-start; }
.llt-step-n { flex: none; width: 26px; height: 26px; border-radius: 50%; background: var(--ink); color: var(--ink-text); font: 700 12px 'Space Mono', monospace; display: grid; place-items: center; margin-top: 6px; }
.llt-send { flex: 1; min-width: 0; display: grid; gap: 8px; }
.llt-bubble { background: var(--bubble); color: #0B2415; border-radius: 14px 4px 14px 14px; padding: 10px 14px; font-size: 15px; line-height: 1.7; }
.llt-tap { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; border: 1.5px dashed var(--line); border-radius: 14px; padding: 10px 14px; font-size: 14px; color: var(--muted); background: rgba(12,26,21,0.02); }
.llt-chip { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 4px 14px; font-weight: 700; color: var(--text); font-size: 14px; }
.llt-expected { margin-top: 14px; background: #F5F1E6; border-radius: 12px; padding: 10px 14px; }
.llt-expected p { margin: 2px 0 0; font-size: 14px; line-height: 1.8; }
.llt-label { display: block; margin: 14px 0 6px; font-size: 12px; font-weight: 700; color: var(--muted); }
.llt-expected .llt-label { margin: 0; }
.llt-seg { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 6px; }
.llt-seg-btn { min-height: 48px; padding: 6px 4px; border-radius: 12px; border: 1px solid var(--line); background: var(--card); font: inherit; font-size: 13px; font-weight: 700; color: var(--muted); cursor: pointer; line-height: 1.35; }
.llt-seg-btn[aria-checked="true"][data-s="none"] { background: var(--none); border-color: var(--none); color: #fff; }
.llt-seg-btn[aria-checked="true"][data-s="ok"] { background: var(--ok); border-color: var(--ok); color: #fff; }
.llt-seg-btn[aria-checked="true"][data-s="off"] { background: var(--off); border-color: var(--off); color: #fff; }
.llt-input { width: 100%; margin-top: 8px; background: #FBF9F3; border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; font: inherit; font-size: 16px; color: var(--text); resize: vertical; }
.llt-input:focus { outline: 2px solid var(--ink-2); outline-offset: 0; }
.llt-mono { font-family: 'Space Mono', monospace; font-size: 12px; }
.llt-row-actions { display: flex; gap: 4px; justify-content: flex-end; margin-top: 8px; }
.llt-link { background: none; border: 0; font: inherit; font-size: 13px; color: var(--muted); padding: 10px 12px; min-height: 40px; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
.llt-link-danger { color: var(--off); }
.llt-hidden-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 14px; }
.llt-small { margin: 4px 0 0; font-size: 12px; color: var(--muted); line-height: 1.7; }
.llt-form-title { font-size: 17px; font-weight: 900; }
.llt-form .llt-label { margin-top: 12px; }
.llt-form .llt-toolbar { margin: 14px 0 0; }
.llt-evidence summary { cursor: pointer; font-weight: 700; font-size: 14px; min-height: 32px; }
.llt-evidence .llt-meta { display: inline; margin-right: 6px; }
.llt-evidence .llt-btn { margin-top: 10px; }
.llt-ev-row { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 13px; padding: 8px 0; border-bottom: 1px solid var(--line); }
.llt-ev-row span { color: var(--muted); }
@media (min-width: 640px) {
  .llt { padding: 20px; }
  .llt-hero { padding: 28px; }
  .llt-h1 { font-size: 30px; }
  .llt-btn-wa { width: auto; justify-self: start; padding: 0 28px; }
}
@media (prefers-reduced-motion: reduce) { .llt-btn { transition: none; } .llt-btn:active { transform: none; } }
`
