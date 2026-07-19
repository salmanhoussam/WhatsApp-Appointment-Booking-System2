import { motion } from 'framer-motion';

const BASE = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beit-al-fakhar/special/gallery';

const PHOTOS = [
  { src: `${BASE}/01-entrance.jpg`, label: 'المدخل' },
  { src: `${BASE}/03-plates-detail.jpg`, label: 'حائط الأطباق' },
  { src: `${BASE}/05-figurine-table.jpg`, label: 'طاولة التحف' },
  { src: `${BASE}/04-plates-wall.jpg`, label: 'تشكيلة الأطباق' },
  { src: `${BASE}/06-bowls-shelves.jpg`, label: 'رفوف الأواني' },
  { src: `${BASE}/02-vases-wide.jpg`, label: 'داخل المحل' },
];

export default function GallerySection() {
  return (
    <section style={{ background: '#fff', padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <p style={{ color: 'var(--baf-terracotta)', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.24em', marginBottom: '0.75rem' }}>
            جولة بالمحل
          </p>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', color: 'var(--baf-dark)' }}>
            زوروا محلنا
          </h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {PHOTOS.map((p, i) => (
            <motion.div
              key={p.src}
              initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              style={{ borderRadius: 14, overflow: 'hidden', position: 'relative', height: 260 }}
            >
              <img src={p.src} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(20,15,10,0.6) 0%, transparent 40%)',
              }} />
              <span style={{ position: 'absolute', bottom: 12, left: 14, color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
                {p.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
