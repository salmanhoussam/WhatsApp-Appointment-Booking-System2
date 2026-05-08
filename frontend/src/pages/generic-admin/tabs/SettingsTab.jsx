import { useState } from 'react'
import adminApi from '../../../utils/admin.config'

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 8, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: 14,
  fontFamily: "'Cairo', sans-serif",
  outline: 'none',
}

const labelStyle = {
  display: 'block', fontSize: 12,
  color: 'rgba(255,255,255,0.5)',
  marginBottom: 6, letterSpacing: '0.04em',
}

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14, padding: 24,
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>{hint}</div>}
    </div>
  )
}

export default function SettingsTab({ settings, onUpdated, color }) {
  const [form, setForm] = useState({
    name_ar:         settings?.name_ar         ?? '',
    name_en:         settings?.name_en         ?? '',
    primary_color:   settings?.primary_color   ?? '#6366f1',
    whatsapp_number: settings?.whatsapp_number ?? '',
  })
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState(null)

  const handleChange = (key) => (e) => {
    setForm(p => ({ ...p, [key]: e.target.value }))
    setSuccess(false)
    setError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await adminApi.patch('/settings', form)
      onUpdated(prev => ({ ...prev, ...form }))
      setSuccess(true)
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
        إعدادات المتجر
      </div>

      <div style={glass}>
        <Field label="اسم المتجر (عربي)" >
          <input style={inputStyle} value={form.name_ar} onChange={handleChange('name_ar')} placeholder="مثال: متجر لايلى" />
        </Field>

        <Field label="اسم المتجر (إنجليزي)">
          <input style={inputStyle} value={form.name_en} onChange={handleChange('name_en')} placeholder="e.g. Layla Store" />
        </Field>

        <Field label="رقم واتساب" hint="للتواصل مع الزبائن — بدون مسافات مثال: 96170123456">
          <input style={inputStyle} value={form.whatsapp_number} onChange={handleChange('whatsapp_number')} placeholder="96170123456" dir="ltr" />
        </Field>

        <Field label="اللون الأساسي">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              type="color"
              value={form.primary_color}
              onChange={handleChange('primary_color')}
              style={{
                width: 52, height: 44, borderRadius: 8, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'none', padding: 4,
              }}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={form.primary_color}
              onChange={handleChange('primary_color')}
              placeholder="#6366f1"
              dir="ltr"
            />
            <div style={{
              width: 44, height: 44, borderRadius: 8, flexShrink: 0,
              background: form.primary_color,
              border: '1px solid rgba(255,255,255,0.1)',
            }} />
          </div>
        </Field>

        {/* Feedback */}
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff8080', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(80,200,120,0.1)', border: '1px solid rgba(80,200,120,0.2)', color: '#60d080', fontSize: 13, marginBottom: 16 }}>
            تم حفظ الإعدادات بنجاح
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 10,
            background: color, border: 'none',
            color: '#fff', fontSize: 14, fontWeight: 600,
            fontFamily: "'Cairo', sans-serif",
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  )
}
