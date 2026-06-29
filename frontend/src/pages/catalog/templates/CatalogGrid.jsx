import { motion, AnimatePresence } from 'framer-motion'
import { CatalogItemCard } from '../../../design-system/molecules'

export default function CatalogGrid({ items = [], accent = '#d4a853', onAddToCart }) {
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
        {items.map((item) => (
          <CatalogItemCard key={item.id} item={item} accent={accent} onAddToCart={onAddToCart} />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
