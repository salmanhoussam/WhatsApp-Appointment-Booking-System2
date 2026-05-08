import { useState, useEffect, useCallback, useMemo } from 'react'
import { AnimatePresence, motion }           from 'framer-motion'
import adminApi          from '../../utils/admin.config'
import useTenantConfig   from '../../hooks/useTenantConfig'
import CatalogTab        from './tabs/CatalogTab'
import SettingsTab       from './tabs/SettingsTab'
import OverviewTab       from './tabs/OverviewTab'
import OrdersTab         from './tabs/OrdersTab'
import ReservationsTab   from './tabs/ReservationsTab'

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

function IconOverview({ size = 18, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )
}

function IconOrders({ size = 18, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  )
}

function IconCalendar({ size = 18, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function IconCatalog({ size = 18, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8"    y1="6"  x2="21" y2="6"/>
      <line x1="8"    y1="12" x2="21" y2="12"/>
      <line x1="8"    y1="18" x2="21" y2="18"/>
      <circle cx="3"  cy="6"  r="1" fill={color}/>
      <circle cx="3"  cy="12" r="1" fill={color}/>
      <circle cx="3"  cy="18" r="1" fill={color}/>
    </svg>
  )
}

function IconSettings({ size = 18, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83
               2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33
               1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09
               A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06
               a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15
               a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09
               A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06
               a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68
               a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09
               a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06
               a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9
               a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09
               a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )
}

function IconLogout({ size = 18, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive module key from the active service list.
 * Matches the same logic used by backend endpoints.
 */
function deriveModuleKey(activeServices = []) {
  if (activeServices.includes('restaurant')) return 'restaurant'
  if (activeServices.includes('store'))      return 'store'
  return 'catalog'
}

/**
 * Build the nav array. "reservations" tab is conditional.
 */
function buildNav(hasReservations) {
  const base = [
    { id: 'overview',  labelAr: 'نظرة عامة', Icon: IconOverview  },
    { id: 'orders',    labelAr: 'الطلبات',   Icon: IconOrders    },
    { id: 'catalog',   labelAr: 'الكتالوج',  Icon: IconCatalog   },
    { id: 'settings',  labelAr: 'الإعدادات', Icon: IconSettings  },
  ]
  if (hasReservations) {
    base.splice(2, 0, { id: 'reservations', labelAr: 'الحجوزات', Icon: IconCalendar })
  }
  return base
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FullScreenSpinner({ color }) {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0d0d14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: `3px solid ${color}33`,
        borderTopColor: color,
        animation: 'spin .8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ComingSoonTab({ label, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: 400, gap: 14,
      color: 'rgba(255,255,255,0.25)',
      fontFamily: "'Cairo', sans-serif",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: `${color}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none"
          stroke={color} strokeWidth={1.6} strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div style={{ fontSize: 15 }}>{label}</div>
      <div style={{ fontSize: 12, opacity: 0.55 }}>سيُتاح قريباً</div>
    </div>
  )
}

// Sidebar nav item — defined outside main component to avoid re-creation on render
function NavItem({ item, isActive, color, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.5 }}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '10px 14px', borderRadius: 10,
        border: 'none', cursor: 'pointer',
        // active highlight
        background:   isActive ? `${color}16` : 'transparent',
        borderLeft:   isActive ? `3px solid ${color}` : '3px solid transparent',
        color:        isActive ? color : 'rgba(255,255,255,0.42)',
        fontFamily:   "'Cairo', sans-serif",
        fontSize:     14, fontWeight: isActive ? 600 : 400,
        direction:    'ltr', textAlign: 'left',
        transition:   'color .15s, background .15s',
      }}
    >
      <item.Icon size={18} color={isActive ? color : 'rgba(255,255,255,0.32)'} />
      <span style={{ direction: 'rtl' }}>{item.labelAr}</span>
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Spring presets
// ─────────────────────────────────────────────────────────────────────────────
const SPRING_SNAPPY = { type: 'spring', stiffness: 300, damping: 25, mass: 0.5 }

// ─────────────────────────────────────────────────────────────────────────────
// GenericAdminDashboard
// ─────────────────────────────────────────────────────────────────────────────

const SIDEBAR_W = 240

export default function GenericAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [settings,  setSettings]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [isMobile,  setIsMobile]  = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)

  // ── Public config — for active_services (admin/settings doesn't return it) ──
  const { config } = useTenantConfig()

  // ── Admin branding fetch ────────────────────────────────────────────────────
  useEffect(() => {
    adminApi.get('/settings')
      .then(r => setSettings(r.data?.data ?? r.data))
      .catch(err => {
        if (err?.response?.status === 401) {
          localStorage.removeItem('admin_access_token')
          window.location.href = '/login'
          return
        }
        setSettings({ name_ar: 'لوحة التحكم', primary_color: '#6366f1' })
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Responsive breakpoint ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // ── Derived values ──────────────────────────────────────────────────────────
  const color           = settings?.primary_color  ?? '#6366f1'
  const tenantName      = settings?.name_ar        ?? 'لوحة التحكم'
  const currency        = settings?.currency       ?? config?.currency ?? 'USD'
  const activeServices  = config?.active_services  ?? []
  const moduleKey       = deriveModuleKey(activeServices)
  const hasReservations = activeServices.includes('reservations')
  const NAV             = useMemo(() => buildNav(hasReservations), [hasReservations])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('admin_access_token')
    window.location.href = '/login'
  }, [])

  // ── Tab renderer ────────────────────────────────────────────────────────────
  function renderTab() {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            color={color}
            moduleKey={moduleKey}
            hasReservations={hasReservations}
            currency={currency}
          />
        )
      case 'orders':
        return <OrdersTab moduleKey={moduleKey} color={color} currency={currency} />
      case 'reservations':
        return <ReservationsTab color={color} />
      case 'catalog':
        return <CatalogTab color={color} />
      case 'settings':
        return <SettingsTab settings={settings} onUpdated={setSettings} color={color} />
      default:
        return null
    }
  }

  if (loading) return <FullScreenSpinner color={color} />

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#0d0d14', color: '#fff',
      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
    }}>

      {/* ════════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR
      ════════════════════════════════════════════════════════════════ */}
      {!isMobile && (
        <aside style={{
          width: SIDEBAR_W, flexShrink: 0,
          position: 'fixed', top: 0, left: 0,
          height: '100vh',
          display: 'flex', flexDirection: 'column',
          background: '#090910',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          zIndex: 100,
          padding: '28px 16px 24px',
          boxSizing: 'border-box',
        }}>
          {/* Logo / tenant name */}
          <div style={{ paddingLeft: 14, marginBottom: 36 }}>
            <div style={{
              fontSize: 17, fontWeight: 700, color,
              lineHeight: 1.3, direction: 'rtl',
            }}>
              {tenantName}
            </div>
            <div style={{
              fontSize: 11, marginTop: 5,
              color: 'rgba(255,255,255,0.24)',
              letterSpacing: '0.1em',
            }}>
              DASHBOARD
            </div>
          </div>

          {/* Navigation */}
          <nav style={{
            flex: 1, display: 'flex',
            flexDirection: 'column', gap: 3,
            overflowY: 'auto',
          }}>
            {NAV.map(item => (
              <NavItem
                key={item.id}
                item={item}
                isActive={activeTab === item.id}
                color={color}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </nav>

          {/* Logout */}
          <motion.button
            onClick={handleLogout}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRING_SNAPPY}
            style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '10px 14px', borderRadius: 10,
              border: 'none', cursor: 'pointer',
              background: 'transparent',
              color: 'rgba(255,255,255,0.28)',
              fontFamily: "'Cairo', sans-serif",
              fontSize: 14, direction: 'ltr', textAlign: 'left',
              marginTop: 8,
            }}
          >
            <IconLogout size={17} color="rgba(255,255,255,0.25)" />
            <span style={{ direction: 'rtl' }}>خروج</span>
          </motion.button>

          {/* Divider accent at top */}
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: 1, height: '100%',
            background: `linear-gradient(to bottom, transparent, ${color}40, transparent)`,
          }} />
        </aside>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════════════════════ */}
      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : SIDEBAR_W,
        display: 'flex', flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {/* ── Mobile top header ─────────────────────────────────────── */}
        {isMobile && (
          <header style={{
            padding: '14px 20px',
            background: '#090910',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, zIndex: 50,
            direction: 'rtl',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color }}>{tenantName}</div>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent', border: 'none',
                cursor: 'pointer', color: 'rgba(255,255,255,0.35)',
                fontFamily: "'Cairo', sans-serif", fontSize: 13,
              }}
            >
              خروج
            </button>
          </header>
        )}

        {/* ── Desktop top bar (breadcrumb + tenant hint) ───────────── */}
        {!isMobile && (
          <div style={{
            padding: '16px 32px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            direction: 'rtl',
          }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
              {tenantName}
              <span style={{ margin: '0 8px', opacity: 0.4 }}>›</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                {NAV.find(n => n.id === activeTab)?.labelAr ?? ''}
              </span>
            </div>
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.18)',
              letterSpacing: '0.08em', fontFamily: 'monospace',
            }}>
              {moduleKey.toUpperCase()} · {currency}
            </div>
          </div>
        )}

        {/* ── Tab content ──────────────────────────────────────────── */}
        <div style={{
          flex: 1,
          padding: isMobile ? '20px 16px 100px' : '28px 32px',
          direction: 'rtl',
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0, y: -6  }}
              transition={SPRING_SNAPPY}
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ════════════════════════════════════════════════════════════════
          MOBILE BOTTOM NAV
      ════════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#090910',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          zIndex: 100,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {NAV.map(item => {
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  flex: 1, padding: '10px 4px 12px',
                  border: 'none', cursor: 'pointer',
                  background: 'transparent',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 4,
                  color: active ? color : 'rgba(255,255,255,0.3)',
                  borderTop: active ? `2px solid ${color}` : '2px solid transparent',
                  transition: 'color .15s, border-color .15s',
                }}
              >
                <item.Icon size={20} color={active ? color : 'rgba(255,255,255,0.3)'} />
                <span style={{
                  fontSize: 10, fontFamily: "'Cairo', sans-serif",
                  fontWeight: active ? 600 : 400,
                }}>
                  {item.labelAr}
                </span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}
