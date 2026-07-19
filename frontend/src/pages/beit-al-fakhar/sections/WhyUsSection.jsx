import { motion } from 'framer-motion';

const POINTS = [
  { icon: '🎨', title: 'مرسوم يدوياً', body: 'كل قطعة فريدة، مرسومة بإيد فنانينا — ما في قطعتين متطابقتين تماماً' },
  { icon: '💰', title: 'أسعار مناسبة', body: 'جودة عالية بأسعار بتناسب كل بيت وكل ميزانية' },
  { icon: '🏺', title: 'تشكيلة واسعة', body: 'أطباق، أواني، أكواب، وتحف ديكور — كل شي بلمسة متوسطية دافئة' },
];

export default function WhyUsSection() {
  return (
    <section style={{ background: 'var(--baf-dark)', padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ color: 'var(--baf-terracotta)', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.24em', marginBottom: '0.75rem' }}>
            ليش تختارونا
          </p>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', color: '#fff' }}>
            صناعة بإيد، بمحبة
          </h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
          {POINTS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{p.icon}</div>
              <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.6rem' }}>{p.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', lineHeight: 1.7 }}>{p.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
