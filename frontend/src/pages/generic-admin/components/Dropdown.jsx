import { useState, useRef, useEffect, useCallback } from 'react'
import { T, FONT } from '../theme'

// Custom dropdown -- replaces native <select> (Phase 3.1 UX Iteration, 2026-08-05). A native
// <select>'s open list is rendered by the OS/browser chrome, not by CSS -- its position, colors,
// and clipping behavior are outside this app's control, and on mobile Chrome this was confirmed
// (real screenshot, Salman's own manual test, iPhone 14 Pro Max DevTools emulation) to render as a
// small, oddly-positioned native picker overlapping the sidebar instead of opening below the field.
// This component is a real listbox (button trigger + an absolutely-positioned panel this app fully
// controls), so "opens below, no clipping, readable options" can actually be guaranteed.
//
// Used in 3+ places within ReservationsTodayView.jsx (CreatePopover's staff/service selects,
// ReservationPopover's edit-mode staff/service selects, the mini-reschedule staff select) -- shared
// here rather than duplicated per Salman's own "reuse, don't invent per-screen" instinct.
export default function Dropdown({ value, onChange, options, placeholder = '—', disabled = false }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const [panelStyle, setPanelStyle] = useState(null)

  const selected = options.find((o) => o.value === value)

  const computePanelPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    // Opens BELOW the trigger, full trigger width, clamped so it never overflows the viewport --
    // if there isn't enough room below (rare, only very close to the bottom edge), it still opens
    // below but height-caps + scrolls internally rather than flipping above (explicit requirement:
    // "open below," not "open wherever fits").
    const maxHeight = Math.max(120, window.innerHeight - rect.bottom - 16)
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(280, maxHeight),
    })
  }, [])

  const toggle = () => {
    if (disabled) return
    if (!open) computePanelPosition()
    setOpen((o) => !o)
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

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        style={{
          width: '100%', textAlign: 'right', padding: '9px 12px', borderRadius: 10,
          background: disabled ? T.pageBg : T.cardBg, border: `1px solid ${T.border}`,
          color: selected ? T.textPrimary : T.textMuted, fontSize: 13, fontFamily: FONT,
          cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 8,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <span style={{ color: T.textMuted, fontSize: 10, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
      </button>

      {open && panelStyle && (
        <div
          style={{
            ...panelStyle, zIndex: 1200, overflowY: 'auto', background: T.cardBg,
            border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: T.shadowLg,
            direction: 'rtl', fontFamily: FONT,
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 13, color: T.textMuted }}>لا توجد خيارات</div>
          ) : options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  padding: '9px 12px', fontSize: 13, cursor: 'pointer',
                  color: T.textPrimary, background: isSelected ? T.greenSoft : 'transparent',
                  fontWeight: isSelected ? 700 : 400,
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = T.pageBg }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                {opt.label}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
