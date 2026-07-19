import { motion } from 'framer-motion';
import { MessageCircle, Clock, MapPin } from 'lucide-react';

// whatsapp/address/hours haven't been provided by the shop owner yet — shown
// as honest "will be added" placeholders rather than invented facts.
export default function ContactSection({ waLink }) {
  return (
    <section style={{ background: 'var(--baf-cream)', padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p style={{ color: 'var(--baf-terracotta)', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.24em', marginBottom: '0.75rem' }}>
            تواصل معنا
          </p>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', color: 'var(--baf-dark)', marginBottom: '2.5rem' }}>
            زورونا أو راسلونا
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div>
            <MessageCircle size={22} color="var(--baf-terracotta)" style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--baf-dark)' }}>واتساب</p>
            <p style={{ margin: 0, color: '#8a8177', fontSize: '0.9rem' }}>{waLink ? 'راسلنا الآن' : 'قريباً'}</p>
          </div>
          <div>
            <MapPin size={22} color="var(--baf-terracotta)" style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--baf-dark)' }}>العنوان</p>
            <p style={{ margin: 0, color: '#8a8177', fontSize: '0.9rem' }}>قريباً</p>
          </div>
          <div>
            <Clock size={22} color="var(--baf-terracotta)" style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--baf-dark)' }}>ساعات العمل</p>
            <p style={{ margin: 0, color: '#8a8177', fontSize: '0.9rem' }}>قريباً</p>
          </div>
        </div>

        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer">
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#25D366', color: '#fff', fontWeight: 800, fontSize: '1rem',
              borderRadius: 999, padding: '0.85rem 2rem',
            }}>
              <MessageCircle size={19} /> راسلنا عبر واتساب
            </span>
          </a>
        )}
      </div>
    </section>
  );
}
