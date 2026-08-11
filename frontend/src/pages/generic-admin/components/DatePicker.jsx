import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { T, FONT } from '../theme'

// Custom date picker -- replaces native <input type="date"> (Dashboard UX Corrections #3,
// 2026-08-10). Same reasoning already proven in this codebase by Dropdown.jsx: a native date
// input's format/picker chrome is entirely OS/browser-controlled, not something this app's CSS can
// govern -- identical class of problem Dropdown.jsx already fixed for native <select>. This
// component follows Dropdown.jsx's exact architectural pattern (button trigger + an app-controlled,
// fixed-position panel that opens below and never exceeds the viewport) rather than inventing a
// second pattern.
//
// `value`/`onChange` are always the ISO 'YYYY-MM-DD' wire format this app's filters already send --
// only the *displayed/typed* format changes (MM/DD/YYYY), never the format sent to the backend.

const WEEKDAYS_AR = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

function pad2(n) { return String(n).padStart(2, '0') }

// Month-nav prev/next buttons in the open panel -- was referenced but never defined (real bug
// found via real-browser verification, 2026-08-10: threw `ReferenceError: navBtnStyle is not
// defined` the instant the panel opened, crashing the whole app past any error boundary).
const navBtnStyle = {
  width: 26, height: 26, borderRadius: 8, border: `1px solid ${T.border}`,
  background: T.cardBg, color: T.textSecond, cursor: 'pointer',
  fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
}

function isoToDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return ''
  return `${m}/${d}/${y}`
}

// Returns a valid ISO string or null -- rejects malformed input and real-calendar-invalid dates
// (e.g. 02/30/2026) rather than silently clamping them.
function displayToIso(display) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(display.trim())
  if (!match) return null
  const month = parseInt(match[1], 10)
  const day   = parseInt(match[2], 10)
  const year  = parseInt(match[3], 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return `${year}-${pad2(month)}-${pad2(day)}`
}

// Auto-inserts '/' as the user types digits -- never lets a 3rd/5th char through without one.
function autoFormatTyped(raw, prevLength) {
  const digitsOnly = raw.replace(/[^\d/]/g, '')
  const digits = digitsOnly.replace(/\//g, '').slice(0, 8) // mm dd yyyy = 8 digits max
  let out = digits.slice(0, 2)
  if (digits.length > 2) out += '/' + digits.slice(2, 4)
  if (digits.length > 4) out += '/' + digits.slice(4, 8)
  return out
}

function isoToDate(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export default function DatePicker({ value, onChange, disabled = false, placeholder = 'MM/DD/YYYY' }) {
  const [open, setOpen] = useState(false)
  const [typedText, setTypedText] = useState(() => isoToDisplay(value))
  const [invalid, setInvalid] = useState(false)
  const [panelStyle, setPanelStyle] = useState(null)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const inputRef = useRef(null)

  const selectedDate = useMemo(() => isoToDate(value), [value])
  const [viewMonth, setViewMonth] = useState(() => {
    const d = isoToDate(value) ?? new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  // Keep the typed text in sync when `value` changes from outside (e.g. an "اليوم" quick-filter
  // button elsewhere resets the same state this component is bound to).
  useEffect(() => {
    setTypedText(isoToDisplay(value))
    setInvalid(false)
    const d = isoToDate(value)
    if (d) setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1))
  }, [value])

  const computePanelPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    // Same "always opens below, clamps to viewport, never flips above" rule as Dropdown.jsx --
    // an explicit product requirement there, applied consistently here.
    const maxHeight = Math.max(200, window.innerHeight - rect.bottom - 16)
    const panelWidth = 268
    // Clamp horizontally so the grid (wider than the trigger, unlike Dropdown's full-width list)
    // never overflows the right edge of the viewport in this RTL layout.
    const left = Math.min(rect.left, window.innerWidth - panelWidth - 8)
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: Math.max(8, left),
      width: panelWidth,
      maxHeight: Math.min(340, maxHeight),
    })
  }, [])

  const openPanel = () => {
    if (disabled) return
    computePanelPosition()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const onReposition = () => computePanelPosition()
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, computePanelPosition])

  const commitTyped = useCallback((text) => {
    if (text.trim() === '') { setInvalid(false); return }
    const iso = displayToIso(text)
    if (iso) {
      setInvalid(false)
      onChange(iso)
    } else {
      // Reject cleanly -- revert the visible text to the last real value rather than sending a
      // bad date to the backend or leaving the field silently stuck on invalid text.
      setInvalid(true)
      setTimeout(() => { setTypedText(isoToDisplay(value)); setInvalid(false) }, 900)
    }
  }, [onChange, value])

  const handleTypedChange = (e) => {
    setTypedText((prev) => autoFormatTyped(e.target.value, prev.length))
    setInvalid(false)
  }

  const handleTypedKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitTyped(typedText); inputRef.current?.blur() }
  }

  const handleTypedBlur = () => commitTyped(typedText)

  const daysGrid = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const firstDow = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [viewMonth])

  const isSameDay = (day) => {
    if (!selectedDate || day == null) return false
    return selectedDate.getFullYear() === viewMonth.getFullYear() &&
      selectedDate.getMonth() === viewMonth.getMonth() &&
      selectedDate.getDate() === day
  }
  const isToday = (day) => {
    if (day == null) return false
    const t = new Date()
    return t.getFullYear() === viewMonth.getFullYear() &&
      t.getMonth() === viewMonth.getMonth() &&
      t.getDate() === day
  }

  const pickDay = (day) => {
    if (day == null) return
    const iso = `${viewMonth.getFullYear()}-${pad2(viewMonth.getMonth() + 1)}-${pad2(day)}`
    onChange(iso)
    setOpen(false)
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <div
        ref={triggerRef}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 8,
          background: disabled ? T.pageBg : T.cardBg,
          border: `1px solid ${invalid ? '#dc2626' : T.border}`,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={typedText}
          onChange={handleTypedChange}
          onKeyDown={handleTypedKeyDown}
          onBlur={handleTypedBlur}
          disabled={disabled}
          placeholder={placeholder}
          dir="ltr"
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            color: T.textPrimary, fontSize: 13, fontFamily: FONT, textAlign: 'left',
          }}
        />
        <button
          type="button"
          onClick={openPanel}
          disabled={disabled}
          aria-label="فتح التقويم"
          style={{
            border: 'none', background: 'transparent', padding: 4, margin: 0,
            cursor: disabled ? 'not-allowed' : 'pointer', color: T.textMuted,
            display: 'flex', alignItems: 'center', flexShrink: 0,
            // Touch target kept ≥ 32px tall even though the icon itself is small (Section B.12's
            // mobile tap-target requirement).
            minWidth: 28, minHeight: 28, justifyContent: 'center',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M2 6.5H14" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5 1.5V4M11 1.5V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && panelStyle && (
        <div
          style={{
            ...panelStyle, zIndex: 1200, overflowY: 'auto', background: T.cardBg,
            border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: T.shadowLg,
            direction: 'rtl', fontFamily: FONT, padding: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              style={navBtnStyle}
            >
              ‹
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>
              {MONTHS_AR[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              style={navBtnStyle}
            >
              ›
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {WEEKDAYS_AR.map((w) => (
              <div key={w} style={{ fontSize: 10, color: T.textMuted, textAlign: 'center', padding: '2px 0' }}>
                {w}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {daysGrid.map((day, i) => (
              <button
                key={i}
                type="button"
                disabled={day == null}
                onClick={() => pickDay(day)}
                style={{
                  height: 32, borderRadius: 8, border: 'none', cursor: day == null ? 'default' : 'pointer',
                  fontSize: 12, fontFamily: FONT,
                  background: isSameDay(day) ? T.greenSoft : 'transparent',
                  color: day == null ? 'transparent' : (isSameDay(day) ? T.textPrimary : (isToday(day) ? T.textPrimary : T.textSecond)),
                  fontWeight: isSameDay(day) || isToday(day) ? 700 : 400,
                  outline: isToday(day) && !isSameDay(day) ? `1px solid ${T.border}` : 'none',
                }}
              >
                {day ?? ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
