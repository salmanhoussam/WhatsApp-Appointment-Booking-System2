import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import useTenantConfig from '../../../hooks/useTenantConfig'
import { useTenantBase } from '../../../hooks/useTenantSlug'
import TenantModuleNav from '../../../design-system/organisms/TenantModuleNav'
import CartBadge from '../../../design-system/molecules/CartBadge'
import CatalogGrid from '../../catalog/templates/CatalogGrid'
import useGenericStore from '../../generic/store/useGenericStore'
import { fetchItem, fetchItems } from '../../../services/catalogApi'
import ProductImage from './ProductImage'

const BADGES = [
  { icon: '🖐', label: 'صناعة يدوية' },
  { icon: '🎨', label: 'مرسومة يدوياً' },
  { icon: '🏺', label: 'قطعة فريدة' },
]

// Beit Al Fakhar's own fallback story line — lives here, not in the shared
// backend endpoint, since /store/products is used by every store tenant.
const DEFAULT_STORY_AR = 'رسمت هذه القطعة يدوياً داخل بيت الفخار، لذلك لا توجد قطعتان متطابقتان.'

function LoadingDot({ accent }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: accent,
        boxShadow: `0 0 20px 4px ${accent}66`,
        animation: 'pf-pulse 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes pf-pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  )
}

export default function ProductPage() {
  const { itemId } = useParams()
  const { config } = useTenantConfig()
  const base = useTenantBase()
  const navigate = useNavigate()
  const { addItem, totalItems } = useGenericStore()

  const accent = config?.primary_color ?? '#C1683A'

  const [item, setItem] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setNotFound(false)
    setQty(1)

    fetchItem('store', 'beit-al-fakhar', itemId)
      .then(({ data }) => {
        if (!mounted) return
        const p = data?.data
        if (!p) { setNotFound(true); return }
        setItem(p)
        if (p.category_id) {
          fetchItems('store', 'beit-al-fakhar', p.category_id)
            .then(({ data }) => {
              if (!mounted) return
              const siblings = (data?.data ?? []).filter((i) => i.id !== p.id)
              setRelated(siblings.slice(0, 4))
            })
            .catch(() => { if (mounted) setRelated([]) })
        }
      })
      .catch(() => { if (mounted) setNotFound(true) })
      .finally(() => { if (mounted) setLoading(false) })

    return () => { mounted = false }
  }, [itemId])

  const handleAdd = useCallback(() => {
    if (!item) return
    addItem(item, qty)
  }, [item, qty, addItem])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
        <TenantModuleNav />
        <LoadingDot accent={accent} />
      </div>
    )
  }

  if (notFound || !item) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', direction: 'rtl' }}>
        <TenantModuleNav />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '140px 20px 80px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Cairo', sans-serif" }}>
            لم يتم العثور على هذه القطعة
          </p>
          <Link to={`${base}/store`} style={{ color: accent, fontFamily: "'Cairo', sans-serif" }}>
            العودة إلى المنتجات ←
          </Link>
        </div>
      </div>
    )
  }

  const categoryName = item.category?.name_ar
  const storyText = item.story_ar || DEFAULT_STORY_AR
  const hasRealPrice = item.price != null

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', direction: 'rtl' }}>
      <TenantModuleNav />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '88px 20px 100px' }}>

        {/* Breadcrumb — brand / category / piece, gallery language not a filesystem path */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          marginBottom: 28, fontSize: 12.5, color: 'rgba(255,255,255,0.4)',
          fontFamily: "'Cairo', sans-serif",
        }}>
          <Link to={`${base}/home`} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
            بيت الفخار
          </Link>
          {categoryName && (
            <>
              <span>—</span>
              <Link to={`${base}/store`} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
                {categoryName}
              </Link>
            </>
          )}
          <span>—</span>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>{item.name_ar}</span>
        </div>

        {/* Piece — image + panel */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 48, alignItems: 'start', marginBottom: 72,
        }}>
          {/* Image + badges */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 20 }}>
            <ProductImage src={item.image_url} alt={item.name_ar} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              {BADGES.map((b) => (
                <span key={b.label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: 11.5, color: 'rgba(255,255,255,0.55)', fontFamily: "'Cairo', sans-serif",
                }}>
                  <span style={{ fontSize: 13 }}>{b.icon}</span> {b.label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Name -> Story -> Description -> Price -> Quantity -> Add to Cart */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.08 }}>
            {categoryName && (
              <span style={{
                display: 'inline-block', marginBottom: 10, fontSize: 11, fontWeight: 700,
                color: accent, letterSpacing: '0.12em', textTransform: 'uppercase',
                fontFamily: "'Cairo', sans-serif",
              }}>
                {categoryName}
              </span>
            )}

            <h1 style={{
              margin: '0 0 18px', fontSize: 'clamp(24px, 3.4vw, 34px)', fontWeight: 800,
              color: '#f0f0f5', lineHeight: 1.25, fontFamily: "'Cairo', sans-serif",
            }}>
              {item.name_ar}
            </h1>

            {/* Story — above description, deliberately, per the piece-as-story framing */}
            <p style={{
              margin: '0 0 16px', fontSize: 14.5, lineHeight: 1.85, color: `${accent}dd`,
              fontStyle: 'italic', fontFamily: "'Cairo', sans-serif",
            }}>
              {storyText}
            </p>

            {item.description_ar && (
              <p style={{
                margin: '0 0 28px', fontSize: 14.5, lineHeight: 1.85,
                color: 'rgba(255,255,255,0.55)', fontFamily: "'Cairo', sans-serif",
              }}>
                {item.description_ar}
              </p>
            )}

            {/* Price — never hidden; a graceful message when none is set */}
            <div style={{ marginBottom: 28 }}>
              {hasRealPrice ? (
                <span style={{ fontSize: 26, fontWeight: 800, color: accent }}>
                  {Number(item.price).toLocaleString('ar-SA')}
                  <span style={{ fontSize: 13, fontWeight: 400, marginRight: 5, color: 'rgba(255,255,255,0.4)' }}>
                    {config?.currency ?? 'USD'}
                  </span>
                </span>
              ) : (
                <span style={{
                  fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
                  fontFamily: "'Cairo', sans-serif",
                }}>
                  السعر يُحدد حسب الطلب
                </span>
              )}
            </div>

            {/* Quantity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', fontFamily: "'Cairo', sans-serif" }}>
                الكمية
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  style={qtyBtnStyle()}
                >−</button>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', minWidth: 18, textAlign: 'center' }}>
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  style={qtyBtnStyle(accent)}
                >+</button>
              </div>
            </div>

            {/* Add to Cart — deliberately secondary in visual weight, not the loudest element on the page */}
            <motion.button
              onClick={handleAdd}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '11px 28px', borderRadius: 999,
                background: 'transparent', border: `1.5px solid ${accent}`,
                color: accent, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif",
              }}
            >
              + أضف للسلة
            </motion.button>
          </motion.div>
        </div>

        {/* Related — "قد يعجبك أيضاً", framed as taste, not a query */}
        {related.length > 0 && (
          <div>
            <h2 style={{
              margin: '0 0 24px', fontSize: 18, fontWeight: 800, color: '#f0f0f5',
              fontFamily: "'Cairo', sans-serif",
            }}>
              قد يعجبك أيضاً
            </h2>
            <CatalogGrid
              items={related}
              accent={accent}
              onAddToCart={(i) => addItem(i, 1)}
              onItemClick={(i) => navigate(`${base}/store/${i.id}`)}
            />
          </div>
        )}
      </div>

      {totalItems() > 0 && (
        <CartBadge count={totalItems()} accent={accent} onClick={() => navigate(`${base}/cart`)} />
      )}
    </div>
  )
}

function qtyBtnStyle(accent) {
  return {
    width: 30, height: 30, borderRadius: '50%',
    border: `1px solid ${accent ? `${accent}66` : 'rgba(255,255,255,0.2)'}`,
    background: accent ? `${accent}18` : 'rgba(255,255,255,0.05)',
    color: accent ?? 'rgba(255,255,255,0.7)',
    fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
