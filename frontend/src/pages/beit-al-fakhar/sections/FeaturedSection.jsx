import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useBeitAlFakharFeatured } from '../hooks/useBeitAlFakharCatalog';

export default function FeaturedSection() {
  const { data: items = [], isLoading } = useBeitAlFakharFeatured();

  if (!isLoading && items.length === 0) {
    // Owner hasn't added products via the admin dashboard yet — graceful
    // empty state instead of an empty grid or fabricated placeholder items.
    return (
      <section style={{ background: 'var(--baf-cream)', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--baf-terracotta)', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.24em', marginBottom: '0.75rem' }}>
          منتجات مميزة
        </p>
        <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', color: 'var(--baf-dark)', marginBottom: '0.75rem' }}>
          قريباً — أحدث القطع المختارة
        </h2>
        <p style={{ color: '#8a8177' }}>تصفح كل التشكيلة من صفحة المتجر</p>
        <Link to="/beit-al-fakhar/store">
          <span style={{
            display: 'inline-block', marginTop: '1.25rem',
            background: 'var(--baf-terracotta)', color: '#fff', fontWeight: 800,
            borderRadius: 999, padding: '0.7rem 1.6rem', textDecoration: 'none',
          }}>
            شوف المتجر
          </span>
        </Link>
      </section>
    );
  }

  return (
    <section style={{ background: 'var(--baf-cream)', padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <p style={{ color: 'var(--baf-terracotta)', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.24em', marginBottom: '0.75rem' }}>
            منتجات مميزة
          </p>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', color: 'var(--baf-dark)' }}>
            الأكثر طلباً
          </h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {items.map((item) => (
            <div key={item.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 24px rgba(42,36,32,0.1)' }}>
              <img src={item.image_url} alt={item.name_ar} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
              <div style={{ padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.4rem', fontWeight: 700, color: 'var(--baf-dark)' }}>{item.name_ar}</h4>
                {item.price != null && (
                  <p style={{ margin: 0, color: 'var(--baf-terracotta)', fontWeight: 800 }}>${item.price}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
