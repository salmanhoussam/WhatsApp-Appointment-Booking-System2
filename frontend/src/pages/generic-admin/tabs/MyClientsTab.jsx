import { useState, useEffect } from 'react'
import adminApi from '../../../utils/admin.config'
import { T, FONT } from '../theme'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'

// Staff Scoped Access Phase D (2026-08-09,
// .claudedocs/implementation/STAFF_SCOPED_ACCESS_CONTRACT.md) -- reads
// GET /reservations/my-clients (Phase C), already fully scoped server-side to the authenticated
// STAFF user's own barberId. This component does no filtering of its own -- there is nothing to
// filter, the backend never sends another staff member's clients in the first place.
export default function MyClientsTab({ color }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    adminApi.get('/reservations/my-clients')
      .then(({ data }) => {
        if (!mounted) return
        setClients(data?.data ?? [])
      })
      .catch(() => {
        if (mounted) setError('تعذّر تحميل قائمة العملاء.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, marginBottom: 16 }}>
        عملائي
      </div>

      <Card padding={0}>
        {loading ? (
          <EmptyState message="جارٍ التحميل..." />
        ) : error ? (
          <EmptyState message={error} />
        ) : clients.length === 0 ? (
          <EmptyState message="لا يوجد عملاء بعد" subMessage="سيظهر هنا كل عميل لديه حجز معك" />
        ) : (
          <div>
            {clients.map((c, i) => (
              <div
                key={`${c.customer_phone}-${i}`}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: i < clients.length - 1 ? `1px solid ${T.border}` : 'none',
                }}
              >
                <div style={{ fontSize: 14, color: T.textPrimary }}>{c.customer_name}</div>
                <div style={{ fontSize: 13, color: T.textMuted, direction: 'ltr' }}>{c.customer_phone}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
