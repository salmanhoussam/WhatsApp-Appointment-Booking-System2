// DemoBuilderPage.jsx — real per-visitor demo tenant builder for Alzabt (barbershop/reservations
// type only -- Clinic isn't built yet). Reachable ONLY from the root ProductShowcaseHome's Alzabt
// section CTA (relative route "demo-builder"). Reverses the earlier "static alzabt-demo tenant
// only" decision -- explicit, knowing call by Salman, 2026-08-12.
//
// /alzabt (the marketing page) and demo.salmansaas.com/alzabt stay unchanged, still pointing at
// the static alzabt-demo reference tenant -- this is a second, additional "try it" path, not a
// replacement.
//
// Modeled directly on frontend/src/pages/showcase/pages/DemoLandingPage.jsx's proven 2-field
// form + loading/error + success pattern, POSTing to the same /demo/create endpoint with a new
// business_type="barbershop" value -- no new backend endpoint.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import publicApi from '../../utils/publicApi'

const WHATSAPP_GREEN = '#25D366'

const VIOLET = '#7C3AED'
const FONT = "'Cairo', 'Segoe UI', sans-serif"

const COPY = {
  title: 'ابني ديمو عالزبط تبعك',
  subtitle: 'صالون وهمي فيه حجز حقيقي، خلال ثواني — بإسمك إنت',
  nameArLabel: 'اسم الصالون (عربي)',
  nameEnLabel: 'اسم الصالون (إنكليزي) — اختياري',
  submit: 'ابني الديمو',
  submitting: 'عم نبنيلك الديمو...',
  errFill: 'يرجى كتابة اسم الصالون بالعربي على الأقل',
  errServer: 'صار خطأ، جرّب مرة تانية',
  successTitle: 'جاهز! الديمو تبعك صار حقيقي',
  slugLabel: 'رابط صالونك',
  passwordLabel: 'كلمة سر الأدمن المؤقتة',
  ctaReserve: 'جرّب صفحة الحجز الآن',
  ctaDashboard: 'أو افتح لوحة التحكم',
  ctaWhatsapp: 'جرّب الحجز عبر واتساب',
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
      animation: 'demoBuilderSpin 0.7s linear infinite',
    }} />
  )
}

export default function DemoBuilderPage() {
  const navigate = useNavigate()
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [whatsappUrl, setWhatsappUrl] = useState(null)

  // Non-blocking, best-effort — the success screen (slug/password/reserve/dashboard) must never
  // wait on or break because of this. `available: false` (WHATSAPP_CENTRAL_NUMBER unset, or any
  // network/API failure) silently renders nothing extra, per the approved plan.
  useEffect(() => {
    if (!result?.slug) return
    let cancelled = false
    publicApi
      .get('/reservations/whatsapp-link', { params: { client_slug: result.slug } })
      .then((res) => {
        if (cancelled) return
        const data = res.data?.data ?? res.data
        if (data?.available && data?.url) setWhatsappUrl(data.url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [result?.slug])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nameAr.trim()) {
      setError(COPY.errFill)
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await publicApi.post('/demo/create', {
        business_type: 'barbershop',
        name_ar: nameAr.trim(),
        name_en: nameEn.trim(),
      })
      setResult(res.data?.data ?? res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || COPY.errServer)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', fontFamily: FONT }} dir="rtl">
      <style>{'@keyframes demoBuilderSpin { to { transform: rotate(360deg); } }'}</style>

      <nav style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>
          SalmanSaaS
        </span>
      </nav>

      <main style={{ maxWidth: 480, margin: '0 auto', padding: '56px 24px 80px' }}>
        {!result ? (
          <>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '5px 12px', borderRadius: 999,
              background: 'rgba(124,58,237,0.16)', marginBottom: 18,
            }}>
              <Scissors size={13} color={VIOLET} strokeWidth={2} />
              <span style={{ fontSize: 12, fontWeight: 700, color: VIOLET }}>عالزبط</span>
            </div>

            <h1 style={{
              margin: '0 0 8px', fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)', fontWeight: 800,
              color: 'rgba(255,255,255,0.92)',
            }}>
              {COPY.title}
            </h1>
            <p style={{ margin: '0 0 32px', fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
              {COPY.subtitle}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                  {COPY.nameArLabel}
                </label>
                <input
                  type="text" dir="rtl" value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="صالون الأناقة"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                  {COPY.nameEnLabel}
                </label>
                <input
                  type="text" dir="ltr" value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="Elegance Salon"
                  style={inputStyle}
                />
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171', fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px 24px', borderRadius: 999, border: 'none', marginTop: 8,
                  background: loading ? 'rgba(124,58,237,0.5)' : `linear-gradient(135deg, ${VIOLET}, #9333EA)`,
                  color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: FONT,
                  cursor: loading ? 'default' : 'pointer',
                  boxShadow: '0 8px 24px rgba(124,58,237,0.24)',
                }}
              >
                {loading && <Spinner />}
                {loading ? COPY.submitting : COPY.submit}
              </button>
            </form>
          </>
        ) : (
          <div>
            <h1 style={{
              margin: '0 0 24px', fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)', fontWeight: 800,
              color: 'rgba(255,255,255,0.92)',
            }}>
              {COPY.successTitle}
            </h1>

            <div style={{
              padding: '20px', borderRadius: 16,
              background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.24)',
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{COPY.slugLabel}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: VIOLET, marginBottom: 16, fontFamily: 'monospace' }}>
                {result.slug}
              </div>

              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{COPY.passwordLabel}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace',
                  filter: showPassword ? 'none' : 'blur(4px)',
                }}>
                  {result.temp_password}
                </span>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => navigate(`/${result.slug}/reserve`)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '15px 24px', borderRadius: 999, border: 'none',
                background: `linear-gradient(135deg, ${VIOLET}, #9333EA)`,
                color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: FONT,
                cursor: 'pointer', boxShadow: '0 8px 24px rgba(124,58,237,0.24)', marginBottom: 12,
              }}
            >
              {COPY.ctaReserve}
              <ArrowLeft size={15} />
            </button>

            <a
              href={result.admin_url}
              style={{
                display: 'block', textAlign: 'center', fontSize: 13,
                color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
              }}
            >
              {COPY.ctaDashboard}
            </a>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', textAlign: 'center', fontSize: 13, marginTop: 12,
                  color: WHATSAPP_GREEN, textDecoration: 'none', fontWeight: 700,
                }}
              >
                {COPY.ctaWhatsapp}
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '12px 16px', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)',
  color: 'rgba(255,255,255,0.9)', fontSize: 14, fontFamily: FONT,
  outline: 'none', boxSizing: 'border-box',
}
