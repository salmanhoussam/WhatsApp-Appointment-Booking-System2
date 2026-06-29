/**
 * ActionInbox.jsx — Phase 29.1
 *
 * "Command Center" for pending booking requests.
 * Shows a live CSS-Grid of glassmorphism cards, each with:
 *   - Customer name + clickable WhatsApp phone link
 *   - Unit name + check-in / check-out dates
 *   - Source badge  (🟢 WhatsApp | 🌐 Web)
 *   - Price
 *   - 15-minute soft-lock countdown timer
 *   - Confirm ✅ / Reject ❌ action buttons
 *
 * Auth:  Bearer token from localStorage('admin_access_token')
 * API:   GET  /api/v1/admin/bookings/?status=pending
 *        PATCH /api/v1/admin/bookings/{id}/status  { status: 'confirmed'|'cancelled' }
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import adminApi from '../../../../utils/admin.config';

// ─── Palette (mirrors SmarAdminDashboard) ─────────────────────────────────────
const C = {
  bg:        '#0a0a0f',
  surface:   '#12121a',
  surfaceHi: '#1a1a26',
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.14)',
  textPri:   '#f0f0f5',
  textMuted: '#6b6b80',
  gold:      '#d4a853',
  goldDim:   'rgba(212,168,83,0.12)',
  green:     '#3ecf8e',
  greenDim:  'rgba(62,207,142,0.12)',
  red:       '#f87171',
  redDim:    'rgba(248,113,113,0.12)',
  amber:     '#fbbf24',
  amberDim:  'rgba(251,191,36,0.10)',
  blue:      '#60a5fa',
  blueDim:   'rgba(96,165,250,0.12)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(raw) {
  if (!raw) return '—';
  return String(raw).slice(0, 10);
}

function buildWaLink(phone) {
  if (!phone) return '#';
  // Strip any non-digit chars except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `https://wa.me/${cleaned.replace('+', '')}`;
}

// ─── Timer Hook ───────────────────────────────────────────────────────────────
// Returns { label, isExpired } for a 15-minute countdown from `createdAt`.
function useCountdown(createdAt) {
  const [tick, setTick] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (!createdAt) return { label: '', isExpired: false };

  const elapsed   = Date.now() - new Date(createdAt).getTime();
  const MAX_MS    = 15 * 60 * 1000;
  const remaining = MAX_MS - elapsed;

  if (remaining <= 0) return { label: 'EXPIRED', isExpired: true };

  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return { label: `${m}:${s.toString().padStart(2, '0')}`, isExpired: false };
}

// ─── Source Badge ─────────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  const isWa = source === 'whatsapp';
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          5,
      padding:      '3px 10px',
      borderRadius: 20,
      fontSize:     11,
      fontWeight:   600,
      background:   isWa ? C.greenDim : C.blueDim,
      color:        isWa ? C.green    : C.blue,
      border:       `1px solid ${isWa ? C.green : C.blue}33`,
      whiteSpace:   'nowrap',
    }}>
      {isWa ? '🟢 WhatsApp' : '🌐 Web'}
    </span>
  );
}

// ─── Timer Badge ──────────────────────────────────────────────────────────────
function TimerBadge({ createdAt }) {
  const { label, isExpired } = useCountdown(createdAt);
  if (!label) return null;

  if (isExpired) {
    return (
      <span style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          5,
        padding:      '4px 10px',
        borderRadius: 20,
        fontSize:     11,
        fontWeight:   700,
        background:   C.redDim,
        color:        C.red,
        border:       `1px solid ${C.red}44`,
        animation:    'pulse-red 1.4s ease-in-out infinite',
      }}>
        ⚠️ EXPIRED
      </span>
    );
  }

  // Colour shift: amber when > 5 min, red when ≤ 5 min
  const isUrgent = label.startsWith('0:') || label.startsWith('1:') ||
                   label.startsWith('2:') || label.startsWith('3:') ||
                   label.startsWith('4:') || label.startsWith('5:');
  const fg = isUrgent ? C.red   : C.amber;
  const bg = isUrgent ? C.redDim : C.amberDim;

  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          5,
      padding:      '4px 10px',
      borderRadius: 20,
      fontSize:     11,
      fontWeight:   700,
      background:   bg,
      color:        fg,
      border:       `1px solid ${fg}44`,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '0.02em',
    }}>
      ⏱ {label}
    </span>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionBtn({ label, color, dimColor, disabled, loading, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex:         1,
        padding:      '9px 12px',
        borderRadius: 8,
        border:       `1px solid ${color}55`,
        background:   hover ? dimColor : 'transparent',
        color,
        fontSize:     13,
        fontWeight:   700,
        cursor:       (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity:      (disabled || loading) ? 0.45 : 1,
        transition:   'all 0.15s',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        gap:          5,
      }}
    >
      {loading ? <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> : label}
    </button>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking, onConfirm, onReject, updating }) {
  const name        = booking.customer?.name  || '—';
  const phone       = booking.customer?.phone || '';
  const unitName    = booking.unit?.name_ar   || booking.unit?.name_en || '—';
  const checkIn     = fmtDate(booking.check_in  || booking.checkIn);
  const checkOut    = fmtDate(booking.check_out || booking.checkOut);
  const price       = booking.total_price ?? booking.totalPrice ?? 0;
  const currency    = booking.currency ?? 'SAR';
  const source      = booking.source ?? 'web';
  const createdAt   = booking.created_at ?? booking.createdAt;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: -12, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      style={{
        background:   C.surfaceHi,
        border:       `1px solid ${C.borderHi}`,
        borderRadius: 16,
        padding:      '20px 22px',
        display:      'flex',
        flexDirection:'column',
        gap:          14,
        backdropFilter: 'blur(8px)',
        boxShadow:    '0 4px 24px rgba(0,0,0,0.35)',
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Gold left accent line */}
      <span style={{
        position:    'absolute',
        top:         0,
        left:        0,
        width:       3,
        height:      '100%',
        background:  `linear-gradient(180deg, ${C.gold}, transparent)`,
        borderRadius:'3px 0 0 3px',
      }} />

      {/* ── Row 1: Name + Timer ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ color: C.textPri, fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{name}</div>
          <a
            href={buildWaLink(phone)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              color:          C.green,
              fontSize:       12,
              textDecoration: 'none',
              display:        'inline-flex',
              alignItems:     'center',
              gap:            4,
              marginTop:      3,
            }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
          >
            📱 {phone || 'No phone'}
          </a>
        </div>
        <TimerBadge createdAt={createdAt} />
      </div>

      {/* ── Row 2: Unit + dates ── */}
      <div style={{
        background:   C.bg,
        borderRadius: 8,
        padding:      '10px 12px',
        display:      'grid',
        gridTemplateColumns: '1fr 1fr',
        gap:          8,
      }}>
        <div>
          <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: '0.08em', marginBottom: 3 }}>UNIT</div>
          <div style={{ color: C.textPri, fontSize: 13, fontWeight: 600 }}>{unitName}</div>
        </div>
        <div>
          <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: '0.08em', marginBottom: 3 }}>DATES</div>
          <div style={{ color: C.gold, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {checkIn} → {checkOut}
          </div>
        </div>
      </div>

      {/* ── Row 3: Source + Price ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SourceBadge source={source} />
        <div style={{ color: C.gold, fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>
          {Number(price).toLocaleString()} {currency}
        </div>
      </div>

      {/* ── Row 4: Action buttons ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        <ActionBtn
          label="✅ Confirm"
          color={C.green}
          dimColor={C.greenDim}
          disabled={updating}
          loading={updating === `confirm-${booking.id}`}
          onClick={() => onConfirm(booking.id)}
        />
        <ActionBtn
          label="❌ Reject"
          color={C.red}
          dimColor={C.redDim}
          disabled={updating}
          loading={updating === `reject-${booking.id}`}
          onClick={() => onReject(booking.id)}
        />
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        justifyContent:'center',
        padding:       '80px 20px',
        textAlign:     'center',
        gap:           16,
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
        style={{ fontSize: 56 }}
      >
        ✨
      </motion.div>
      <div style={{
        color:         C.gold,
        fontSize:      20,
        fontWeight:    700,
        letterSpacing: '-0.01em',
      }}>
        All clear — no pending requests
      </div>
      <div style={{ color: C.textMuted, fontSize: 13, maxWidth: 320 }}>
        لا توجد حجوزات معلقة في الوقت الحالي.<br />
        ستظهر الطلبات الجديدة هنا فوراً.
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ActionInbox() {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [updating, setUpdating] = useState(null); // e.g. 'confirm-{id}' | 'reject-{id}'
  const [toast,    setToast]    = useState(null);

  const showToast = useCallback((msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminApi.get('/bookings/', {
        params: { status: 'pending', limit: 50 },
      });
      setBookings(data.data ?? data.items ?? []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load pending bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    // Poll every 30 s to catch new requests without a full page reload
    const poll = setInterval(fetchPending, 30_000);
    return () => clearInterval(poll);
  }, [fetchPending]);

  const handleConfirm = async (id) => {
    setUpdating(`confirm-${id}`);
    try {
      await adminApi.patch(`/bookings/${id}/status`, { status: 'confirmed' });
      setBookings(prev => prev.filter(b => b.id !== id));
      showToast('Booking confirmed ✅', true);
    } catch (e) {
      showToast(e.response?.data?.detail || 'Failed to confirm.', false);
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async (id) => {
    setUpdating(`reject-${id}`);
    try {
      await adminApi.patch(`/bookings/${id}/status`, { status: 'cancelled' });
      setBookings(prev => prev.filter(b => b.id !== id));
      showToast('Booking rejected ❌', false);
    } catch (e) {
      showToast(e.response?.data?.detail || 'Failed to reject.', false);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      {/* ── Keyframe styles (injected once) ── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-red {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: C.textPri, fontSize: 20, fontWeight: 700, margin: 0 }}>
            🛎️ Action Inbox
            {!loading && (
              <span style={{
                marginLeft:   10,
                padding:      '3px 10px',
                borderRadius: 20,
                fontSize:     12,
                fontWeight:   700,
                background:   bookings.length > 0 ? C.amberDim : C.greenDim,
                color:        bookings.length > 0 ? C.amber    : C.green,
                border:       `1px solid ${bookings.length > 0 ? C.amber : C.green}44`,
              }}>
                {bookings.length} pending
              </span>
            )}
          </h2>
          <p style={{ color: C.textMuted, fontSize: 13, margin: '6px 0 0' }}>
            Pending requests need your approval within 15 minutes.
          </p>
        </div>

        <button
          onClick={fetchPending}
          style={{
            padding:      '8px 16px',
            borderRadius: 8,
            border:       `1px solid ${C.gold}33`,
            background:   C.goldDim,
            color:        C.gold,
            fontSize:     13,
            fontWeight:   600,
            cursor:       'pointer',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          background:   C.redDim,
          border:       `1px solid ${C.red}44`,
          borderRadius: 8,
          padding:      '12px 16px',
          color:        C.red,
          fontSize:     13,
          marginBottom: 24,
        }}>
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap:                 20,
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              background:   C.surfaceHi,
              border:       `1px solid ${C.border}`,
              borderRadius: 16,
              padding:      '20px 22px',
              height:       200,
              animation:    'pulse-skeleton 1.4s ease-in-out infinite',
            }} />
          ))}
          <style>{`
            @keyframes pulse-skeleton {
              0%, 100% { opacity: 0.5; }
              50%       { opacity: 0.2; }
            }
          `}</style>
        </div>
      )}

      {/* ── Card grid ── */}
      {!loading && bookings.length === 0 && !error && <EmptyState />}

      {!loading && bookings.length > 0 && (
        <motion.div
          layout
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap:                 20,
          }}
        >
          <AnimatePresence mode="popLayout">
            {bookings.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                updating={updating}
                onConfirm={handleConfirm}
                onReject={handleReject}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{    opacity: 0, y: 20  }}
            style={{
              position:     'fixed',
              bottom:       28,
              right:        28,
              padding:      '12px 20px',
              borderRadius: 10,
              zIndex:       9999,
              backdropFilter: 'blur(12px)',
              background:   toast.ok ? C.greenDim : C.redDim,
              border:       `1px solid ${toast.ok ? C.green : C.red}44`,
              color:        toast.ok ? C.green : C.red,
              fontSize:     14,
              fontWeight:   600,
            }}
          >
            {toast.ok ? '✓' : '✗'} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
