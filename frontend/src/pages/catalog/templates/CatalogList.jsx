import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '../../../design-system/tokens';

function ListRow({ item, accent, onAddToCart }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={spring.snappy}
      whileHover={{ x: 4 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 18px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        cursor: 'default',
        transition: 'border-color 0.2s, background 0.2s',
        direction: 'rtl',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${accent}44`;
        e.currentTarget.style.background = `${accent}0a`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
      }}
    >
      {/* صورة مربعة */}
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={item.name_ar || item.name_en}
          style={{
            width: 80, height: 80, borderRadius: 10,
            objectFit: 'cover', flexShrink: 0,
          }}
        />
      ) : (
        <div style={{
          width: 80, height: 80, borderRadius: 10, flexShrink: 0,
          background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 24, opacity: 0.3 }}>◈</span>
        </div>
      )}

      {/* معلومات */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#fff' }}>
            {item.name_ar || item.name_en}
          </h3>
          {item.is_featured && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px',
              borderRadius: 999, background: `${accent}22`, color: accent,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              مميز
            </span>
          )}
        </div>
        {(item.description_ar || item.description_en) && (
          <p style={{
            margin: '0 0 6px', fontSize: 12,
            color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {item.description_ar || item.description_en}
          </p>
        )}
      </div>

      {/* السعر + زر الإضافة */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        {item.price != null && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: accent, lineHeight: 1 }}>
              {Number(item.price).toLocaleString('ar-SA')}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {item.currency}
            </div>
          </div>
        )}
        {onAddToCart && (
          <motion.button
            onClick={() => onAddToCart(item)}
            whileTap={{ scale: 0.90 }}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              border: `1.5px solid ${accent}`, background: 'transparent',
              color: accent, fontSize: 22, lineHeight: 1,
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
    </motion.div>
  );
}

export default function CatalogList({ items = [], accent = '#6d28d9', onAddToCart }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <AnimatePresence mode="popLayout">
        {items.map(item => (
          <ListRow key={item.id} item={item} accent={accent} onAddToCart={onAddToCart} />
        ))}
      </AnimatePresence>
    </div>
  );
}
