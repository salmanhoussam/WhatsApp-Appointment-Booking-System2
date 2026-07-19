import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

// No real customer reviews have been supplied yet — showing an honest
// "coming soon" state instead of fabricating testimonials that would look real.
export default function ReviewsSection() {
  return (
    <section style={{ background: '#fff', padding: '4.5rem 1.5rem', textAlign: 'center' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: '1rem' }}>
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={20} fill="var(--baf-terracotta)" color="var(--baf-terracotta)" />
          ))}
        </div>
        <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', color: 'var(--baf-dark)', marginBottom: '0.5rem' }}>
          آراء عملائنا — قريباً
        </h2>
        <p style={{ color: '#8a8177', maxWidth: 420, margin: '0 auto' }}>
          رح نضيف هون آراء زبائننا الحقيقيين قريباً
        </p>
      </motion.div>
    </section>
  );
}
