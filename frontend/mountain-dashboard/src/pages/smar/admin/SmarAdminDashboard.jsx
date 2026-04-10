/**
 * SmarAdminDashboard.jsx
 *
 * Premium dark-theme admin panel for the smar tenant.
 * Fetches bookings from GET /api/v1/admin/bookings/
 * Updates status via PATCH /api/v1/admin/bookings/{id}/status
 *
 * Auth: Bearer token from localStorage('admin_access_token')
 * Tenant: client_slug=smar (injected by adminApi interceptor)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import adminApi from '../../../utils/admin.config';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:        '#0a0a0f',
  surface:   '#12121a',
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
};

// ─── Status badge ──────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  pending:   { fg: C.amber,  bg: C.amberDim  },
  confirmed: { fg: C.green,  bg: C.greenDim  },
  cancelled: { fg: C.red,    bg: C.redDim    },
  completed: { fg: C.textMuted, bg: 'rgba(107,107,128,0.10)' },
};

function StatusBadge({ status, createdAt }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (status !== 'pending' || !createdAt) return;
    
    const calculateTimeLeft = () => {
      // Safely parse timezone string if present, fallback standard
      const createdTime = new Date(createdAt).getTime();
      const now = new Date().getTime();
      const diff = now - createdTime;
      const MAX_TIME = 15 * 60 * 1000; // 15 mins
      const remaining = MAX_TIME - diff;
      
      if (remaining <= 0) {
        setTimeLeft('Expired');
      } else {
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [status, createdAt]);

  const colors = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           6,
      padding:       '3px 10px',
      borderRadius:  20,
      fontSize:      12,
      fontWeight:    600,
      letterSpacing: '0.04em',
      background:    colors.bg,
      color:         colors.fg,
      border:        `1px solid ${colors.fg}22`,
      textTransform: 'uppercase',
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background: colors.fg, display:'inline-block' }} />
      {status} {status === 'pending' && timeLeft && <span style={{ opacity: 0.8, fontSize: 10, letterSpacing: '0px', marginLeft: 2 }}>⏱ {timeLeft}</span>}
    </span>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, setActiveTab, onLogout }) {
  const navItems = [
    { id: 'bookings',  icon: '📋', label: 'Reservations' },
    { id: 'units',     icon: '🗺️', label: 'Map & Chalets' },
    { id: 'dashboard', icon: '📊', label: 'Overview'     },
  ];
  return (
    <div style={{
      width:          220,
      minHeight:      '100vh',
      background:     C.surface,
      borderRight:    `1px solid ${C.border}`,
      display:        'flex',
      flexDirection:  'column',
      padding:        '28px 0',
      flexShrink:     0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 24px 32px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', color: C.textMuted, marginBottom: 4 }}>
          GS MAR ADMIN
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.gold, letterSpacing: '0.06em' }}>
          بيت سمار
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            12,
              width:          '100%',
              padding:        '12px 24px',
              background:     activeTab === item.id ? C.goldDim : 'transparent',
              border:         'none',
              borderLeft:     activeTab === item.id ? `2px solid ${C.gold}` : '2px solid transparent',
              color:          activeTab === item.id ? C.gold : C.textMuted,
              fontSize:       14,
              fontWeight:     activeTab === item.id ? 600 : 400,
              cursor:         'pointer',
              textAlign:      'left',
              transition:     'all 0.18s',
            }}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={onLogout}
        style={{
          margin:       '0 16px',
          padding:      '10px 16px',
          borderRadius: 8,
          background:   'transparent',
          border:       `1px solid ${C.border}`,
          color:        C.textMuted,
          fontSize:     13,
          cursor:       'pointer',
          display:      'flex',
          alignItems:   'center',
          gap:          8,
          transition:   'all 0.18s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
      >
        ↩ Logout
      </button>
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get('/dashboard')
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: C.textMuted, padding: 40 }}>Loading overview…</div>;
  if (!stats)  return <div style={{ color: C.red,      padding: 40 }}>Failed to load dashboard data.</div>;

  const bk = stats.bookings || {};
  const kpis = [
    { label: 'Total Bookings',   value: bk.total ?? '—',           color: C.gold   },
    { label: 'Confirmed Revenue', value: `${bk.confirmed_revenue ?? 0} SAR`, color: C.green  },
    { label: 'Pending',          value: bk.by_status?.pending ?? 0, color: C.amber  },
    { label: 'Cancelled',        value: bk.by_status?.cancelled ?? 0, color: C.red  },
    { label: 'WhatsApp',         value: bk.by_source?.whatsapp ?? 0, color: C.green },
    { label: 'Web Bookings',     value: bk.by_source?.web ?? 0, color: C.textPri  },
  ];

  return (
    <div>
      <h2 style={{ color: C.textPri, fontSize: 20, fontWeight: 700, marginBottom: 28 }}>
        Overview — {stats.period?.month}/{stats.period?.year}
      </h2>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            flex:         '1 1 160px',
            background:   C.surface,
            border:       `1px solid ${C.border}`,
            borderRadius: 12,
            padding:      '20px 24px',
          }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Upcoming check-ins */}
      {stats.upcoming_checkins?.length > 0 && (
        <div>
          <h3 style={{ color: C.textPri, fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
            Upcoming Check-ins (next 7 days)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.upcoming_checkins.map(b => (
              <div key={b.booking_id} style={{
                background:   C.surface,
                border:       `1px solid ${C.border}`,
                borderRadius: 8,
                padding:      '12px 16px',
                display:      'flex',
                gap:          20,
                alignItems:   'center',
              }}>
                <span style={{ color: C.gold, fontSize: 13, minWidth: 120 }}>{b.check_in}</span>
                <span style={{ color: C.textPri, fontSize: 13 }}>{b.customer?.name}</span>
                <span style={{ color: C.textMuted, fontSize: 12 }}>— {b.unit?.name}</span>
                <StatusBadge status={b.status} createdAt={b.created_at ?? b.createdAt} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bookings Tab ──────────────────────────────────────────────────────────────
function BookingsTab() {
  const [bookings, setBookings] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [updating, setUpdating] = useState(null); // booking id currently being updated
  const [toast,    setToast]    = useState(null);  // { msg, ok }
  
  // New Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'pending'

  const LIMIT = 20;

  const fetchPage = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminApi.get('/bookings/', { params: { page: p, limit: LIMIT } });
      setBookings(data.data ?? data.items ?? []);
      setTotal(data.total ?? 0);
      setPage(p);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to fetch bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const updateStatus = async (bookingId, status) => {
    setUpdating(bookingId);
    try {
      await adminApi.patch(`/bookings/${bookingId}/status`, { status });
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
      showToast(`Booking ${status === 'confirmed' ? 'confirmed' : 'cancelled'} successfully.`, true);
    } catch (e) {
      showToast(e.response?.data?.detail || 'Update failed.', false);
    } finally {
      setUpdating(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  // Client-side filtering
  const filteredBookings = bookings.filter(b => {
    // 1. Search Query (Name or Phone)
    const searchMatch = !searchQuery || 
      (b.customer?.phone?.includes(searchQuery)) ||
      (b.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
      
    // 2. Filter Type (Action Inbox)
    const typeMatch = filterType === 'all' || (filterType === 'pending' && b.status === 'pending');
    
    return searchMatch && typeMatch;
  });

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h2 style={{ color: C.textPri, fontSize: 20, fontWeight: 700 }}>
          Reservations
          <span style={{ color: C.textMuted, fontSize: 14, fontWeight: 400, marginLeft: 10 }}>
            {total} total
          </span>
        </h2>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Action Inbox Filter */}
          <div style={{ display: 'flex', background: C.surface, borderRadius: 8, padding: 4, border: `1px solid ${C.border}` }}>
            <button
              onClick={() => setFilterType('all')}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 13, border: 'none', cursor: 'pointer',
                background: filterType === 'all' ? C.borderHi : 'transparent',
                color: filterType === 'all' ? C.textPri : C.textMuted,
                fontWeight: filterType === 'all' ? 600 : 400,
              }}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('pending')}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 13, border: 'none', cursor: 'pointer',
                background: filterType === 'pending' ? C.amberDim : 'transparent',
                color: filterType === 'pending' ? C.amber : C.textMuted,
                fontWeight: filterType === 'pending' ? 600 : 400,
              }}
            >
              <span style={{ marginRight: 6 }}>🛎️</span> Action Inbox
            </button>
          </div>

          {/* Search Phone/Name */}
          <input
            type="text"
            placeholder="Search phone or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: C.surface,
              border: `1px solid ${C.border}`,
              color: C.textPri,
              fontSize: 13,
              outline: 'none',
              minWidth: 220,
            }}
          />

          <button
            onClick={() => fetchPage(page)}
            style={{
              padding:      '8px 16px',
              borderRadius: 8,
              background:   C.goldDim,
              border:       `1px solid ${C.gold}33`,
              color:        C.gold,
              fontSize:     13,
              cursor:       'pointer',
              display:      'flex',
              alignItems:   'center',
              gap:          6,
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 8, padding: '12px 16px', color: C.red, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ color: C.textMuted, padding: 40, textAlign: 'center' }}>Loading reservations…</div>
      ) : filteredBookings.length === 0 ? (
        <div style={{ color: C.textMuted, padding: 40, textAlign: 'center' }}>No reservations found.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.borderHi}` }}>
                {['Customer', 'Phone', 'Unit', 'Source', 'Check-in', 'Check-out', 'Guests', 'Total', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding:       '10px 14px',
                    textAlign:     'left',
                    color:         C.textMuted,
                    fontWeight:    600,
                    letterSpacing: '0.05em',
                    fontSize:      11,
                    textTransform: 'uppercase',
                    whiteSpace:    'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b, i) => {
                const customerName  = b.customer?.name  || '—';
                const customerPhone = b.customer?.phone || '—';
                const unitName      = b.unit?.name_ar   || b.unit?.unitNumber || b.unit_id || '—';
                const checkIn       = b.check_in  ? b.check_in.slice(0,10)  : (b.checkIn  ? String(b.checkIn).slice(0,10)  : '—');
                const checkOut      = b.check_out ? b.check_out.slice(0,10) : (b.checkOut ? String(b.checkOut).slice(0,10) : '—');
                const total_price   = b.total_price ?? b.totalPrice ?? '—';
                const currency      = b.currency ?? 'SAR';
                const sourceBadge   = b.source === 'whatsapp' ? '🟢 WhatsApp' : (b.source === 'web' ? '🌐 Web' : '—');
                const isUpdating    = updating === b.id;
                const rowBg         = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)';

                return (
                  <tr
                    key={b.id}
                    style={{
                      background:    rowBg,
                      borderBottom:  `1px solid ${C.border}`,
                      transition:    'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,168,83,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = rowBg}
                  >
                    <td style={{ padding: '12px 14px', color: C.textPri, fontWeight: 500 }}>{customerName}</td>
                    <td style={{ padding: '12px 14px', color: C.textMuted }}>{customerPhone}</td>
                    <td style={{ padding: '12px 14px', color: C.textPri }}>{unitName}</td>
                    <td style={{ padding: '12px 14px', color: b.source === 'whatsapp' ? C.green : C.textMuted, fontSize: 12 }}>{sourceBadge}</td>
                    <td style={{ padding: '12px 14px', color: C.textMuted, whiteSpace: 'nowrap' }}>{checkIn}</td>
                    <td style={{ padding: '12px 14px', color: C.textMuted, whiteSpace: 'nowrap' }}>{checkOut}</td>
                    <td style={{ padding: '12px 14px', color: C.textMuted, textAlign: 'center' }}>{b.guests}</td>
                    <td style={{ padding: '12px 14px', color: C.gold, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {total_price} {currency}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={b.status} createdAt={b.created_at ?? b.createdAt} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {/* Confirm */}
                        {b.status !== 'confirmed' && b.status !== 'cancelled' && (
                          <ActionButton
                            label="Confirm"
                            color={C.green}
                            dimColor={C.greenDim}
                            disabled={isUpdating}
                            onClick={() => updateStatus(b.id, 'confirmed')}
                          />
                        )}
                        {/* Cancel */}
                        {b.status !== 'cancelled' && b.status !== 'completed' && (
                          <ActionButton
                            label="Cancel"
                            color={C.red}
                            dimColor={C.redDim}
                            disabled={isUpdating}
                            onClick={() => updateStatus(b.id, 'cancelled')}
                          />
                        )}
                        {isUpdating && (
                          <span style={{ color: C.textMuted, fontSize: 11 }}>…</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 28 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => fetchPage(p)}
              style={{
                width:        34,
                height:       34,
                borderRadius: 6,
                border:       `1px solid ${p === page ? C.gold : C.border}`,
                background:   p === page ? C.goldDim : 'transparent',
                color:        p === page ? C.gold : C.textMuted,
                fontSize:     13,
                cursor:       'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position:     'fixed',
              bottom:       28,
              right:        28,
              padding:      '12px 20px',
              borderRadius: 10,
              background:   toast.ok ? C.greenDim : C.redDim,
              border:       `1px solid ${toast.ok ? C.green : C.red}44`,
              color:        toast.ok ? C.green : C.red,
              fontSize:     14,
              fontWeight:   600,
              zIndex:       9999,
              backdropFilter: 'blur(12px)',
            }}
          >
            {toast.ok ? '✓' : '✗'} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({ label, color, dimColor, disabled, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding:      '5px 12px',
        borderRadius: 6,
        border:       `1px solid ${color}44`,
        background:   hover ? dimColor : 'transparent',
        color,
        fontSize:     12,
        fontWeight:   600,
        cursor:       disabled ? 'not-allowed' : 'pointer',
        opacity:      disabled ? 0.4 : 1,
        transition:   'all 0.15s',
        whiteSpace:   'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ─── Units Tab (Map & Chalets) ───────────────────────────────────────────────────
function UnitsTab() {
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState([
    { id: 1, name: 'سويت الكهف', capacity: 2, status: 'active', x: 12.5, y: -4.2 }
  ]);

  const [formData, setFormData] = useState({
    name_ar: '', name_en: '', description: '',
    capacity: 2, bedrooms: 1, bathrooms: 1,
    position_x: 0, position_y: 0,
  });

  const handleSave = () => {
    setSaving(true);
    // Simulate API Call
    setTimeout(() => {
      setSaving(false);
      setIsAdding(false);
      setUnits([...units, { id: Date.now(), name: formData.name_ar || 'شاليه جديد', capacity: formData.capacity, status: 'active', x: formData.position_x, y: formData.position_y }]);
    }, 1200);
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 8, background: C.bg,
    border: `1px solid ${C.border}`, color: C.textPri, fontSize: 14, outline: 'none',
    boxSizing: 'border-box'
  };
  const labelStyle = { display: 'block', color: C.textMuted, fontSize: 12, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' };

  if (isAdding) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => setIsAdding(false)} style={{ background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', marginBottom: 24, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back to Map & Chalets
        </button>
        
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px 40px' }}>
          <h2 style={{ color: C.textPri, fontSize: 20, fontWeight: 700, marginBottom: 32 }}>Add New Chalet / Villa</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {/* Left Col - Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Chalet Name (Arabic)</label>
                <input style={inputStyle} value={formData.name_ar} onChange={e => setFormData({...formData, name_ar: e.target.value})} placeholder="مثال: سويت الكهف" />
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Capacity</label>
                  <input type="number" style={inputStyle} value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Bedrooms</label>
                  <input type="number" style={inputStyle} value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: e.target.value})} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{...inputStyle, height: 100, resize: 'none'}} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="وصف مميزات الشاليه..."></textarea>
              </div>
            </div>

            {/* Right Col - Spatial & Media */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <label style={{...labelStyle, color: C.gold}}>📍 Spatial Coordinates (3D Map)</label>
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{...labelStyle, fontSize: 10}}>Position X</label>
                    <input type="number" style={inputStyle} value={formData.position_x} onChange={e => setFormData({...formData, position_x: e.target.value})} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{...labelStyle, fontSize: 10}}>Position Y</label>
                    <input type="number" style={inputStyle} value={formData.position_y} onChange={e => setFormData({...formData, position_y: e.target.value})} />
                  </div>
                </div>
              </div>

              <div style={{ background: C.bg, border: `1px dashed ${C.borderHi}`, borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <label style={{...labelStyle, color: C.textPri, marginBottom: 4}}>📷 Upload Media</label>
                <span style={{ color: C.textMuted, fontSize: 12 }}>Drag & drop high-res photos & showcase video here</span>
                <input type="file" multiple accept="image/*,video/*" style={{ display: 'block', margin: '16px auto 0', color: C.textMuted, fontSize: 12 }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 40, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 32px', borderRadius: 8, background: C.gold, color: '#000',
                fontSize: 14, fontWeight: 700, border: 'none', cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1, transition: 'all 0.2s'
              }}
            >
              {saving ? 'Saving to Database...' : '+ Publish Chalet'}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: C.textPri, fontSize: 20, fontWeight: 700 }}>Map & Chalets Directory</h2>
        <button
          onClick={() => setIsAdding(true)}
          style={{ padding: '8px 16px', borderRadius: 8, background: C.goldDim, border: `1px solid ${C.gold}33`, color: C.gold, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
        >
          + Add New Chalet
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {units.map(u => (
          <div key={u.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, position: 'relative' }}>
            <div style={{ width: '100%', height: 160, background: C.bg, borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.borderHi }}>
              [ Image Placeholder ]
            </div>
            <h3 style={{ margin: 0, color: C.textPri, fontSize: 16, marginBottom: 8 }}>{u.name}</h3>
            <div style={{ display: 'flex', gap: 12, color: C.textMuted, fontSize: 12 }}>
              <span>👥 {u.capacity} Guests</span>
              <span>📍 X:{u.x} Y:{u.y}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function SmarAdminDashboard() {
  const [activeTab, setActiveTab] = useState('bookings');
  const navigate = useNavigate();

  // Guard: if no token, redirect to login
  useEffect(() => {
    const token = localStorage.getItem('admin_access_token');
    if (!token) navigate('/login', { replace: true });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin_access_token');
    navigate('/login', { replace: true });
  };

  return (
    <div style={{
      display:        'flex',
      minHeight:      '100vh',
      background:     C.bg,
      fontFamily:     "'Inter', 'Segoe UI', sans-serif",
      color:          C.textPri,
    }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      {/* Main content */}
      <div style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
        {/* Top bar */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   40,
          paddingBottom:  20,
          borderBottom:   `1px solid ${C.border}`,
        }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '0.14em', color: C.textMuted, marginBottom: 4 }}>
              SMAR TENANT · ADMIN PORTAL
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: C.textPri, letterSpacing: '-0.02em' }}>
              {activeTab === 'bookings' ? 'Reservations' : activeTab === 'units' ? 'Manage Chalets & Map' : 'Overview'}
            </h1>
          </div>
          <div style={{
            padding:      '8px 16px',
            borderRadius: 20,
            background:   C.greenDim,
            border:       `1px solid ${C.green}33`,
            color:        C.green,
            fontSize:     12,
            fontWeight:   600,
          }}>
            ● Live
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'bookings'  && <BookingsTab  />}
            {activeTab === 'units'     && <UnitsTab     />}
            {activeTab === 'dashboard' && <OverviewTab  />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
