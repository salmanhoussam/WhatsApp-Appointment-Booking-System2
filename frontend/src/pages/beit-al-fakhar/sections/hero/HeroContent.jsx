import { motion } from 'framer-motion';
import { MessageCircle, ArrowDown } from 'lucide-react';
import { spring } from '../../../../design-system/tokens';

/**
 * HeroContent — the title/tagline/CTA overlay. Fades and lifts out of the
 * way as the door starts opening (driven by contentOpacity/contentY from
 * useDoorSequence), so it never fights the door-opening motion for
 * attention once the crossfade begins.
 */
export default function HeroContent({ waLink, opacity, y }) {
  return (
    <motion.div
      style={{
        position: 'relative',
        zIndex: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        textAlign: 'center',
        padding: '0 1.5rem 4.5rem',
        opacity,
        y,
      }}
    >
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.premium}
        style={{ color: 'var(--baf-terracotta)', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.3em', marginBottom: '1rem' }}
      >
        فخار وسيراميك يدوي
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.premium, delay: 0.1 }}
        style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(2.6rem, 8vw, 5rem)', lineHeight: 1.02, margin: '0 0 1rem' }}
      >
        بيت الفخار
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.premium, delay: 0.2 }}
        style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', maxWidth: 480, margin: '0 0 2rem', lineHeight: 1.7 }}
      >
        قطع سيراميك مرسومة يدوياً — أطباق، أواني، أكواب، وتحف ديكور بروح متوسطية أصيلة
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.premium, delay: 0.3 }}
        style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}
      >
        <a href="#categories">
          <motion.span
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            transition={spring.snappy}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--baf-terracotta)', color: '#fff', fontWeight: 800, fontSize: '0.95rem',
              borderRadius: 999, padding: '0.8rem 1.75rem',
            }}
          >
            تصفح المنتجات <ArrowDown size={16} />
          </motion.span>
        </a>
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer">
            <motion.span
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.snappy}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#25D366', color: '#fff', fontWeight: 800, fontSize: '0.95rem',
                borderRadius: 999, padding: '0.8rem 1.75rem',
              }}
            >
              <MessageCircle size={17} /> تواصل واتساب
            </motion.span>
          </a>
        )}
      </motion.div>

      <div style={{ position: 'absolute', bottom: -60, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.7)' }}>
        <span style={{ fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase' }}>مرر للدخول</span>
        <div style={{ position: 'relative', height: 48, width: 1, overflow: 'hidden' }}>
          <motion.div
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '40%', background: 'rgba(255,255,255,0.7)' }}
            animate={{ y: ['0%', '100%', '0%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}
