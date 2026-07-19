import { motion } from 'framer-motion';

const INTERIOR_IMG = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beit-al-fakhar/special/gallery/02-vases-wide.jpg';

export default function AboutSection() {
  return (
    <section style={{ background: 'var(--baf-cream)', padding: '5rem 1.5rem' }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center',
      }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p style={{ color: 'var(--baf-terracotta)', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.24em', marginBottom: '1rem' }}>
            قصتنا
          </p>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', color: 'var(--baf-dark)', lineHeight: 1.2, marginBottom: '1.25rem' }}>
            كل قطعة، حكاية مرسومة بإيد
          </h2>
          <p style={{ color: '#5c5148', fontSize: '1rem', lineHeight: 1.9 }}>
            في بيت الفخار، كل طبق وكل كوب وكل تحفة مرسومة يدوياً بألوان مستوحاة من الطبيعة —
            الكوبالت الأزرق، الأخضر الزيتي، والتراكوتا الدافئة. تشكيلة واسعة تجمع بين الأصالة
            والجودة، بأسعار بتناسب الكل.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 50px rgba(42,36,32,0.18)' }}
        >
          <img src={INTERIOR_IMG} alt="داخل محل بيت الفخار" style={{ width: '100%', height: 380, objectFit: 'cover', display: 'block' }} />
        </motion.div>
      </div>
    </section>
  );
}
