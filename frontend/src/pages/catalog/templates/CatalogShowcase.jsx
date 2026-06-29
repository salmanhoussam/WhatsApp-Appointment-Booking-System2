import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '../../../design-system/tokens';

function ShowcaseCard({ item, accent, index, onAddToCart }) {
  const isWide = index % 3 === 0;   // كل 3 بطاقات، الأولى تأخذ عرض كامل

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ ...spring.premium, delay: index * 0.04 }}
      style={{
        gridColumn: isWide ? '1 / -1' : 'span 1',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.03)',
        display: 'flex',
        flexDirection: isWide ? 'row' : 'column',
        minHeight: isWide ? 220 : 300,
        direction: 'rtl',
      }}
    >
      {/* الصورة */}
      {item.image_url ? (
        <div style={{
          width: isWide ? '40%' : '100%',
          height: isWide ? '100%' : 200,
          flexShrink: 0,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <motion.img
            src={item.image_url}
            alt={item.name_ar || item.name_en}
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.5 }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {item.is_featured && (
            <div style={{
              position: 'absolute', top: 14, right: 14,
              background: accent, color: '#fff',
              fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
              padding: '4px 12px', borderRadius: 999,
              textTransform: 'uppercase',
              boxShadow: `0 4px 16px ${accent}66`,
            }}>
              مميز
            </div>
          )}
        </div>
      ) : (
        <div style={{
          width: isWide ? '40%' : '100%',
          height: isWide ? 'auto' : 160,
          flexShrink: 0,
          background: `${accent}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 48, opacity: 0.2 }}>◈</span>
        </div>
      )}

      {/* المحتوى */}
      <div style={{
        flex: 1,
        padding: isWide ? '28px 32px' : '20px 22px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 12,
      }}>
        <h2 style={{
          margin: 0,
          fontSize: isWide ? 22 : 18,
          fontWeight: 700,
          color: '#fff',
          lineHeight: 1.3,
        }}>
          {item.name_ar || item.name_en}
        </h2>

        {(item.description_ar || item.description_en) && (
          <p style={{
            margin: 0,
            fontSize: 13,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.7,
            maxWidth: 480,
          }}>
            {item.description_ar || item.description_en}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
          {item.price != null && (
            <div>
              <span style={{ fontSize: 24, fontWeight: 800, color: accent }}>
                {Number(item.price).toLocaleString('ar-SA')}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginRight: 5 }}>
                {item.currency}
              </span>
            </div>
          )}

          <motion.button
            onClick={onAddToCart ? () => onAddToCart(item) : undefined}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '9px 22px',
              borderRadius: 999,
              border: `1.5px solid ${accent}`,
              background: onAddToCart ? `${accent}22` : 'transparent',
              color: accent,
              fontSize: 13,
              fontWeight: 600,
              cursor: onAddToCart ? 'pointer' : 'default',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${accent}2a`; }}
            onMouseLeave={e => { e.currentTarget.style.background = onAddToCart ? `${accent}22` : 'transparent'; }}
          >
            {onAddToCart ? 'أضف للسلة' : 'تفاصيل أكثر'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function CatalogShowcase({ items = [], accent = '#6d28d9', onAddToCart }) {
  return (
    <motion.div
      layout
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 20,
      }}
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, idx) => (
          <ShowcaseCard key={item.id} item={item} accent={accent} index={idx} onAddToCart={onAddToCart} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
