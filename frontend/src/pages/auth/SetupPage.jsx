import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'

// Account setup (magic-link) — dashboard.salmansaas.com in production (2026-08-28 API domain split).
const API_BASE = import.meta.env.VITE_ADMIN_API_URL || 'http://127.0.0.1:8000'

export default function SetupPage() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  // 'password' (Staff Invite, 2026-09-07) is a fourth state, not a variant of the other three: the
  // backend answers requires_password=true for an invited account and DOES NOT consume the token,
  // so this page has to collect a password and post it back before anything is spent.
  const [status, setStatus] = useState('loading') // loading | password | success | error
  const [error,  setError]  = useState('')
  const [fullName, setFullName] = useState('')
  const [pw,  setPw]  = useState('')
  const [pw2, setPw2] = useState('')
  const [saving, setSaving] = useState(false)

  const token = params.get('token')

  const succeed = (data) => {
    localStorage.setItem('admin_access_token', data.token)
    setStatus('success')
    // Short pause so the user sees the success state, then redirect
    setTimeout(() => navigate(`/${data.slug}/dashboard`, { replace: true }), 1200)
  }

  const fail = (err, fallback) => {
    setError(err.response?.data?.detail || fallback)
    setStatus('error')
  }

  useEffect(() => {
    if (!token) {
      setError('رابط غير صالح — لا يوجد token')
      setStatus('error')
      return
    }

    axios.get(`${API_BASE}/api/v1/auth/setup`, { params: { token } })
      .then(({ data }) => {
        // An invited account: the token is still unspent, ask for a password first.
        if (data.data.requires_password) {
          setFullName(data.data.full_name || '')
          setStatus('password')
          return
        }
        succeed(data.data)   // tenant-registration magic link — unchanged behaviour
      })
      .catch((err) => fail(err, 'رابط غير صالح أو منتهي الصلاحية'))
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const submitPassword = async () => {
    if (pw.length < 8)  { setError('كلمة السر يجب أن تكون 8 أحرف على الأقل'); return }
    if (pw !== pw2)     { setError('كلمتا السر غير متطابقتين'); return }
    setError('')
    setSaving(true)
    try {
      const { data } = await axios.post(`${API_BASE}/api/v1/auth/set-password`, { token, password: pw })
      succeed(data.data)
    } catch (err) {
      // Stay on the form for a recoverable error (a weak password, a 422) so the invitee can
      // correct it; only a dead/expired token is terminal.
      const dead = [404, 410, 403].includes(err.response?.status)
      if (dead) fail(err, 'رابط غير صالح أو منتهي الصلاحية')
      else setError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'تعذّر حفظ كلمة السر')
      setSaving(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Cairo', sans-serif",
      direction: 'rtl',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '48px 56px',
        textAlign: 'center',
        maxWidth: 380,
      }}>
        {status === 'loading' && (
          <>
            <Spinner />
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 20, fontSize: 15 }}>
              جارٍ التحقق من الرابط...
            </p>
          </>
        )}

        {status === 'password' && (
          <>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔐</div>
            <h2 style={{ color: '#fff', fontSize: 19, fontWeight: 700, margin: '0 0 6px' }}>
              {fullName ? `أهلاً ${fullName}` : 'تفعيل الحساب'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13.5, margin: '0 0 22px' }}>
              اختر كلمة سر لحسابك للدخول إلى لوحة التحكم
            </p>

            <input
              type="password" value={pw} autoFocus
              placeholder="كلمة السر (8 أحرف على الأقل)"
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitPassword()}
              style={pwInput}
            />
            <input
              type="password" value={pw2}
              placeholder="تأكيد كلمة السر"
              onChange={e => setPw2(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitPassword()}
              style={pwInput}
            />

            {error && (
              <p style={{ color: '#ef4444', fontSize: 13, margin: '4px 0 12px' }}>{error}</p>
            )}

            <button
              onClick={submitPassword} disabled={saving}
              style={{
                width: '100%', marginTop: 8,
                background: saving ? 'rgba(109,40,217,0.5)' : '#6d28d9',
                border: 'none', borderRadius: 8, padding: '12px 24px',
                color: '#fff', fontSize: 14.5, fontWeight: 700,
                cursor: saving ? 'default' : 'pointer',
                fontFamily: "'Cairo', sans-serif",
              }}
            >
              {saving ? 'جارٍ الحفظ...' : 'تفعيل الحساب والدخول'}
            </button>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
              تم التحقق بنجاح
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
              جارٍ التحويل للوحة التحكم...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⛔</div>
            <h2 style={{ color: '#ef4444', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
              رابط غير صالح
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 24 }}>
              {error}
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                padding: '10px 24px',
                color: '#fff',
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif",
              }}
            >
              تسجيل الدخول يدوياً
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const pwInput = {
  width: '100%',
  boxSizing: 'border-box',
  marginBottom: 12,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8,
  padding: '11px 14px',
  color: '#fff',
  fontSize: 14,
  fontFamily: "'Cairo', sans-serif",
  direction: 'ltr',
  textAlign: 'center',
  outline: 'none',
}

function Spinner() {
  return (
    <div style={{
      width: 40, height: 40, margin: '0 auto',
      border: '3px solid rgba(255,255,255,0.1)',
      borderTop: '3px solid #6d28d9',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
