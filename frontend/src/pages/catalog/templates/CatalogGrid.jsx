import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../../design-system/atoms/GlassCard';
import { spring } from '../../../design-system/tokens';

function GridCard({ item, accent, onAddToCart }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={spring.smooth}
      whileHover={{ y: -4 }}
    >
      <GlassCard style={{ overflow: 'hidden', borderRadius: 16, height: '100%' }}>
        {item.image_url ? (
          <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
            <img
              src={item.image_url}
              alt={item.name_ar || item.name_en}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            />
            {item.is_featured && (
              <div style={{
                position: 'absolute', top: 10, right: 10,
                background: accent, color: '#fff',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                padding: '3px 8px', borderRadius: 999,
                textTransform: 'uppercase',
              }}>
                مميز
              </div>
            )}
          </div>
        ) : (
          <div style={{
            height: 120, background: `${accent}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 32, opacity: 0.3 }}>◈</span>
          </div>
        )}

        <div style={{ padding: '14px 16px 18px' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
            {item.name_ar || item.name_en}
          </h3>
          {(item.description_ar || item.description_en) && (
            <p style={{
              margin: '0 0 10px', fontSize: 12,
              color: 'rgba(255,255,255,0.5)', lineHeight: 1.6,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {item.description_ar || item.description_en}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {item.price != null && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: accent }}>
                  {Number(item.price).toLocaleString('ar-SA')}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {item.currency}
                </span>
              </div>
            )}
            {onAddToCart && (
              <motion.button
                onClick={() => onAddToCart(item)}
                whileTap={{ scale: 0.90 }}
                style={{
                  flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
                  border: `1.5px solid ${accent}`, background: 'transparent',
                  color: accent, fontSize: 20, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${accent}1a` }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                +
              </motion.button>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function CatalogGrid({ items = [], accent = '#6d28d9', onAddToCart }) {
  return (
    <motion.div
      layout
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 20,
      }}
    >
      <AnimatePresence mode="popLayout">
        {items.map(item => (
          <GridCard key={item.id} item={item} accent={accent} onAddToCart={onAddToCart} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
