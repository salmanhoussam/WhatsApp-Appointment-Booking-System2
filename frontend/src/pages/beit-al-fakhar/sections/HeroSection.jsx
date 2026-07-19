import { motion } from 'framer-motion';
import { MessageCircle, ArrowDown } from 'lucide-react';
import { spring } from '../../../design-system/tokens';

const HERO_VIDEO = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beit-al-fakhar/special/hero/WhatsApp%20Video%202026-07-13%20at%2016.31.24.mp4';

export default function HeroSection({ waLink }) {
  return (
    <section style={{ position: 'relative', height: '100vh', minHeight: 560, overflow: 'hidden' }}>
      <video
        src={HERO_VIDEO}
        autoPlay muted loop playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(20,15,10,0.88) 5%, rgba(20,15,10,0.25) 55%, rgba(20,15,10,0.45) 100%)',
      }} />

      <div style={{
        position: 'relative', zIndex: 2, height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        textAlign: 'center', padding: '0 1.5rem 4.5rem',
      }}>
        <motion.p
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring.premium}
          style={{ color: 'var(--baf-terracotta)', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.3em', marginBottom: '1rem' }}
        >
          فخار وسيراميك يدوي
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.premium, delay: 0.1 }}
          style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(2.6rem, 8vw, 5rem)', lineHeight: 1.02, margin: '0 0 1rem' }}
        >
          بيت الفخار
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.premium, delay: 0.2 }}
          style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', maxWidth: 480, margin: '0 0 2rem', lineHeight: 1.7 }}
        >
          قطع سيراميك مرسومة يدوياً — أطباق، أواني، أكواب، وتحف ديكور بروح متوسطية أصيلة
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.premium, delay: 0.3 }}
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <a href="#categories">
            <motion.span
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={spring.snappy}
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
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={spring.snappy}
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
      </div>
    </section>
  );
}
