import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useBeitAlFakharCategories } from '../hooks/useBeitAlFakharCatalog';

export default function CategoriesSection() {
  const { data: categories = [], isLoading } = useBeitAlFakharCategories();

  return (
    <section id="categories" style={{ background: '#fff', padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <p style={{ color: 'var(--baf-terracotta)', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.24em', marginBottom: '0.75rem' }}>
            تسوّق حسب الفئة
          </p>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', color: 'var(--baf-dark)' }}>
            شو بتدوّر عليه؟
          </h2>
        </motion.div>

        {isLoading ? (
          <p style={{ textAlign: 'center', color: '#8a8177' }}>جاري التحميل...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6 }}
              >
                <Link to={`/beit-al-fakhar/store?category=${cat.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    position: 'relative', borderRadius: 18, overflow: 'hidden', height: 280,
                    boxShadow: '0 12px 34px rgba(42,36,32,0.16)',
                  }}>
                    <img src={cat.image_url} alt={cat.name_ar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(20,15,10,0.75) 15%, transparent 55%)',
                    }} />
                    <div style={{ position: 'absolute', bottom: '1.25rem', left: 0, right: 0, textAlign: 'center' }}>
                      <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>{cat.name_ar}</h3>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
