import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function SetupPage() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const [status, setStatus] = useState('loading') // loading | success | error
  const [error,  setError]  = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setError('رابط غير صالح — لا يوجد token')
      setStatus('error')
      return
    }

    axios.get(`${API_BASE}/api/v1/auth/setup`, { params: { token } })
      .then(({ data }) => {
        const { token: jwt, slug } = data.data
        localStorage.setItem('admin_access_token', jwt)
        setStatus('success')
        // Short pause so the user sees the success state, then redirect
        setTimeout(() => navigate(`/${slug}/dashboard`, { replace: true }), 1200)
      })
      .catch((err) => {
        const msg = err.response?.data?.detail || 'رابط غير صالح أو منتهي الصلاحية'
        setError(msg)
        setStatus('error')
      })
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

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
