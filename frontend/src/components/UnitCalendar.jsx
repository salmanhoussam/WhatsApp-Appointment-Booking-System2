/**
 * UnitCalendar.jsx  — Phase 23 rewrite
 *
 * Props
 * ─────
 * unitId    : string   — which unit to load calendar data for
 * slug      : string   — tenant slug (e.g. "smar")
 * onChange  : fn({ checkIn: Date, checkOut: Date }) — fires on every completed selection
 * adminMode : bool     — enables drag-to-select + shows price chips + allows past dates
 * value     : { checkIn: Date|null, checkOut: Date|null } — controlled external selection
 *
 * API response (Phase 23):
 *   { disabled_dates: string[], price_overrides: Record<string, number> }
 *
 * No external date libraries. Uses only: React, Framer Motion, publicApi.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion }      from 'framer-motion';
import publicApi                        from '../utils/publicApi';

// ── Theme — Light Heritage ─────────────────────────────────────────────────────
const C = {
  bg:          '#faf9f6',
  surface:     'rgba(255,255,255,0.92)',
  border:      'rgba(184,137,46,0.22)',
  text:        '#2d2824',
  muted:       '#9c8e85',
  gold:        '#b8892e',
  goldDim:     'rgba(184,137,46,0.13)',
  goldRange:   'rgba(184,137,46,0.20)',
  disabledBg:  'rgba(0,0,0,0.06)',
  disabledTxt: 'rgba(44,40,36,0.28)',
  todayRing:   'rgba(184,137,46,0.45)',
  priceChip:   'rgba(184,137,46,0.70)',
  adminSel:    'rgba(99,179,237,0.22)',   // soft blue tint for admin drag preview
  adminSelEnd: '#3b82f6',
  shadow:      '0 4px 24px rgba(44,40,36,0.10)',
};

const DAYS_AR   = ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

// ── Date helpers ───────────────────────────────────────────────────────────────

function fmtDay(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDay(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function buildMonthGrid(year, month) {
  const first    = new Date(year, month, 1);
  const last     = new Date(year, month + 1, 0);
  const startDow = first.getDay();
  const cells    = [];

  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, month, 1 - (startDow - i));
    cells.push({ date: d, str: fmtDay(d), inMonth: false });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const dt = new Date(year, month, d);
    cells.push({ date: dt, str: fmtDay(dt), inMonth: true });
  }
  const trailing = 7 - (cells.length % 7);
  if (trailing < 7) {
    for (let i = 1; i <= trailing; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({ date: d, str: fmtDay(d), inMonth: false });
    }
  }
  return cells;
}

function isSameDay(a, b) {
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();
}

function inRange(d, from, to) {
  if (!from || !to) return false;
  const lo = from < to ? from : to;
  const hi = from < to ? to   : from;
  return d > lo && d < hi;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, padding:'0 8px 12px' }}>
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} style={{
          height:36, borderRadius:6,
          background:'linear-gradient(90deg,rgba(0,0,0,0.05) 25%,rgba(0,0,0,0.09) 50%,rgba(0,0,0,0.05) 75%)',
          backgroundSize:'200% 100%', animation:'calShimmer 1.4s infinite',
        }} />
      ))}
      <style>{`@keyframes calShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function UnitCalendar({ unitId, slug, onChange, adminMode = false, value }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear,       setViewYear]       = useState(today.getFullYear());
  const [viewMonth,      setViewMonth]      = useState(today.getMonth());
  const [direction,      setDirection]      = useState(1);
  const [calData,        setCalData]        = useState(null); // null=loading
  const [error,          setError]          = useState(null);
  const [checkIn,        setCheckIn]        = useState(value?.checkIn  ?? null);
  const [checkOut,       setCheckOut]       = useState(value?.checkOut ?? null);

  // Drag-to-select refs (admin mode only — avoids stale closure in event handlers)
  const isDragging  = useRef(false);
  const dragAnchor  = useRef(null);  // Date where drag started
  const dragCurrent = useRef(null);  // Date currently under pointer

  // Sync externally controlled value
  useEffect(() => {
    if (value !== undefined) {
      setCheckIn(value?.checkIn  ?? null);
      setCheckOut(value?.checkOut ?? null);
    }
  }, [value?.checkIn, value?.checkOut]); // eslint-disable-line

  // Fetch calendar data on unit/slug change
  useEffect(() => {
    if (!unitId || !slug) return;
    setCalData(null);
    setError(null);

    publicApi.get(`/${slug}/units/${unitId}/calendar`)
      .then(r => {
        // Support both old flat-array shape and new { disabled_dates, price_overrides } shape
        if (Array.isArray(r.data)) {
          setCalData({ disabled_dates: r.data, price_overrides: {} });
        } else {
          setCalData(r.data);
        }
      })
      .catch(() => {
        setCalData({ disabled_dates: [], price_overrides: {} });
        setError('تعذّر تحميل التقويم');
      });
  }, [unitId, slug]);

  const disabledSet    = new Set(calData?.disabled_dates  ?? []);
  const priceOverrides = calData?.price_overrides          ?? {};
  const cells          = buildMonthGrid(viewYear, viewMonth);

  // ── Navigation ───────────────────────────────────────────────────────────
  function prevMonth() {
    setDirection(-1);
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else                 { setViewMonth(m => m - 1); }
  }
  function nextMonth() {
    setDirection(1);
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else                  { setViewMonth(m => m + 1); }
  }

  // ── Public mode: click-to-start / click-to-end ───────────────────────────
  function handlePublicClick(cell) {
    if (!cell.inMonth) return;
    if (disabledSet.has(cell.str)) return;
    if (cell.date < today) return;

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(cell.date);
      setCheckOut(null);
    } else {
      if (cell.date <= checkIn) { setCheckIn(cell.date); setCheckOut(null); return; }
      // Reject if a blocked date falls inside the range
      const rangeBlocked = [...disabledSet].some(s => {
        const d = parseDay(s);
        return d > checkIn && d <= cell.date;
      });
      if (rangeBlocked) { setCheckIn(cell.date); setCheckOut(null); return; }
      setCheckOut(cell.date);
      onChange?.({ checkIn, checkOut: cell.date });
    }
  }

  // ── Admin mode: drag-to-select ────────────────────────────────────────────
  function applyDragOrder(a, b) {
    // Always return [earlier, later]
    return a <= b ? [a, b] : [b, a];
  }

  function handleMouseDown(cell) {
    if (!adminMode || !cell.inMonth) return;
    isDragging.current  = true;
    dragAnchor.current  = cell.date;
    dragCurrent.current = cell.date;
    setCheckIn(cell.date);
    setCheckOut(null);
  }

  function handleMouseEnter(cell) {
    if (!isDragging.current || !adminMode || !cell.inMonth) return;
    dragCurrent.current = cell.date;
    const [lo, hi] = applyDragOrder(dragAnchor.current, cell.date);
    setCheckIn(lo);
    setCheckOut(hi);
  }

  function handleMouseUp(cell) {
    if (!isDragging.current || !adminMode) return;
    isDragging.current = false;
    if (!dragAnchor.current) return;
    const end = dragCurrent.current || dragAnchor.current;
    const [lo, hi] = applyDragOrder(dragAnchor.current, end);
    setCheckIn(lo);
    setCheckOut(hi);
    onChange?.({ checkIn: lo, checkOut: hi });
    dragAnchor.current  = null;
    dragCurrent.current = null;
  }

  // Release drag if pointer leaves the grid
  useEffect(() => {
    if (!adminMode) return;
    const release = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (dragAnchor.current && dragCurrent.current) {
        const [lo, hi] = applyDragOrder(dragAnchor.current, dragCurrent.current);
        onChange?.({ checkIn: lo, checkOut: hi });
      }
      dragAnchor.current  = null;
      dragCurrent.current = null;
    };
    window.addEventListener('mouseup', release);
    return () => window.removeEventListener('mouseup', release);
  }, [adminMode]); // eslint-disable-line

  // ── Cell styling ─────────────────────────────────────────────────────────
  function dayStyle(cell) {
    const isCheckIn  = isSameDay(cell.date, checkIn);
    const isCheckOut = isSameDay(cell.date, checkOut);
    const isInRange  = inRange(cell.date, checkIn, checkOut);
    const isBlocked  = disabledSet.has(cell.str);
    const isPast     = !adminMode && cell.date < today; // admin can select past dates
    const isToday    = isSameDay(cell.date, today);
    const hasPrice   = priceOverrides[cell.str] !== undefined;

    const base = {
      width: '100%', aspectRatio: adminMode ? '1 / 1.25' : '1',
      borderRadius: 8, border: 'none', outline: 'none',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 500,
      cursor: (isBlocked || isPast) ? 'not-allowed' : 'pointer',
      transition: 'background 0.12s, color 0.12s',
      position: 'relative', userSelect: 'none',
      fontFamily: 'inherit', padding: 0,
      // Disable text-selection during drag
      WebkitUserSelect: 'none', MozUserSelect: 'none',
    };

    if (!cell.inMonth) return { ...base, opacity: 0, pointerEvents: 'none' };

    // Admin drag selection — uses blue tint to distinguish from guest gold
    if (adminMode && (isCheckIn || isCheckOut)) return {
      ...base,
      background: C.adminSelEnd,
      color: '#fff',
      fontWeight: 700,
      borderRadius: isCheckIn && checkOut ? '8px 0 0 8px' : isCheckOut ? '0 8px 8px 0' : 8,
    };
    if (adminMode && isInRange) return {
      ...base, background: C.adminSel, color: C.adminSelEnd, borderRadius: 0, fontWeight: 600,
    };

    // Guest gold selection
    if (!adminMode && (isCheckIn || isCheckOut)) return {
      ...base,
      background: C.gold, color: '#fff', fontWeight: 700,
      borderRadius: isCheckIn && checkOut ? '8px 0 0 8px' : isCheckOut ? '0 8px 8px 0' : 8,
      boxShadow: `0 2px 8px ${C.goldDim}`,
    };
    if (!adminMode && isInRange) return {
      ...base, background: C.goldRange, color: C.gold, borderRadius: 0, fontWeight: 600,
    };

    if (isBlocked) return {
      ...base, background: C.disabledBg, color: C.disabledTxt,
      textDecoration: 'line-through', opacity: 0.55, cursor: 'not-allowed',
    };
    if (isPast) return {
      ...base, color: C.disabledTxt, opacity: 0.4, cursor: 'not-allowed',
    };
    if (isToday) return {
      ...base, color: C.gold, fontWeight: 700,
      boxShadow: `inset 0 0 0 1.5px ${C.todayRing}`, background: C.goldDim,
    };
    return { ...base, color: C.text };
  }

  const slideVariants = {
    enter:  d => ({ x: d * 40, opacity: 0 }),
    center:   { x: 0,          opacity: 1 },
    exit:   d => ({ x: d * -40, opacity: 0 }),
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
      boxShadow: C.shadow, overflow: 'hidden', width: '100%', maxWidth: 380,
      fontFamily: "'Noto Sans Arabic','Segoe UI',sans-serif", direction: 'rtl',
      // Prevent page selection during drag
      userSelect: 'none', WebkitUserSelect: 'none',
    }}>

      {/* ── Header ── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px 16px 10px', borderBottom:`1px solid ${C.border}`, background:C.bg,
      }}>
        <NavBtn onClick={prevMonth} label="‹" />
        <AnimatePresence mode="wait" custom={direction}>
          <motion.span
            key={`${viewYear}-${viewMonth}`}
            custom={direction} variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ fontSize:15, fontWeight:700, color:C.text, minWidth:130, textAlign:'center' }}
          >
            {MONTHS_AR[viewMonth]} {viewYear}
          </motion.span>
        </AnimatePresence>
        <NavBtn onClick={nextMonth} label="›" />
      </div>

      {/* ── Day-of-week row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'8px 8px 4px', gap:2 }}>
        {DAYS_AR.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:11, color:C.muted, fontWeight:600, paddingBottom:4 }}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Grid ── */}
      {calData === null ? (
        <SkeletonGrid />
      ) : (
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            custom={direction} variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, padding:'0 8px 12px' }}
          >
            {cells.map((cell, i) => {
              const price = priceOverrides[cell.str];
              return (
                <button
                  key={i}
                  style={dayStyle(cell)}
                  title={disabledSet.has(cell.str) ? 'محجوز' : price ? `${price} SAR` : undefined}
                  // Public: click events
                  onClick={!adminMode ? () => handlePublicClick(cell) : undefined}
                  // Admin: drag events
                  onMouseDown={adminMode ? () => handleMouseDown(cell) : undefined}
                  onMouseEnter={adminMode ? () => handleMouseEnter(cell) : undefined}
                  onMouseUp={adminMode ? () => handleMouseUp(cell) : undefined}
                >
                  {cell.inMonth && (
                    <>
                      <span>{cell.date.getDate()}</span>
                      {/* Price chip — shown in admin mode or when override exists */}
                      {price !== undefined && cell.inMonth && (
                        <span style={{
                          fontSize: 8, lineHeight: 1, marginTop: 2,
                          color: disabledSet.has(cell.str) ? C.disabledTxt : C.priceChip,
                          fontWeight: 600, letterSpacing: '-0.02em',
                        }}>
                          {price > 0 ? `${price}` : '—'}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Footer: legend + selection summary ── */}
      <div style={{
        padding:'6px 14px 10px', borderTop:`1px solid ${C.border}`,
        display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', background:C.bg,
      }}>
        {error ? (
          <span style={{ fontSize:11, color:'#e53e3e' }}>{error}</span>
        ) : adminMode ? (
          <>
            <LegendDot color={C.adminSelEnd} label="محدد"   textColor={C.adminSelEnd} />
            <LegendDot color={C.adminSel}    label="النطاق" textColor={C.adminSelEnd} />
            <LegendDot color={C.disabledBg}  label="محجوز"  textColor={C.disabledTxt} strikethrough />
            <span style={{ fontSize:10, color:C.muted, marginRight:'auto' }}>
              اسحب لتحديد نطاق
            </span>
          </>
        ) : (
          <>
            <LegendDot color={C.gold}       label="محدد"    />
            <LegendDot color={C.goldRange}  label="النطاق"  textColor={C.gold} />
            <LegendDot color={C.disabledBg} label="محجوز"   textColor={C.disabledTxt} strikethrough />
          </>
        )}

        {checkIn && (
          <span style={{ fontSize:11, color:C.muted, whiteSpace:'nowrap', marginRight:'auto' }}>
            {fmtDay(checkIn)}{checkOut ? ` ← ${fmtDay(checkOut)}` : ' ← …'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NavBtn({ onClick, label }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width:30, height:30, borderRadius:8, border:'none',
        background: hov ? C.goldDim : 'transparent',
        color:C.gold, fontSize:20, cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'background 0.15s', lineHeight:1,
      }}
    >{label}</button>
  );
}

function LegendDot({ color, label, textColor, strikethrough }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      <div style={{ width:10, height:10, borderRadius:3, background:color, border:'1px solid rgba(0,0,0,0.08)', flexShrink:0 }} />
      <span style={{ fontSize:10, color: textColor ?? C.muted, textDecoration: strikethrough ? 'line-through' : 'none' }}>
        {label}
      </span>
    </div>
  );
}
