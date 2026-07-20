import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import CaracasSpecialReel from '../spatial/CaracasSpecialReel';

// ── Tokens — matches CaracasSpecialReel.jsx (red/white QSR brand) ──────────
const C = {
  bg:    '#1A1A1A',
  red:   '#CF0F1E',
  white: '#FFFFFF',
  muted: '#8A8484',
};

const WA = `https://wa.me/96178727986?text=${encodeURIComponent('مرحباً 👋 أريد أطلب من كاراكاس')}`;

export default function CaracasSpecialPage() {
  return (
    <div dir="rtl" style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Cairo', sans-serif" }}>
      {/* ═══ NAV ════════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem', height: 56,
        background: 'rgba(26,26,26,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid rgba(255,255,255,0.08)`,
      }}>
        <span style={{ color: C.red, fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.1em' }}>CARACAS</span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {[['المنيو', '/caracas/menu'], ['الرئيسية', '/caracas/home']].map(([label, to]) => (
            <Link key={to} to={to} style={{
              color: C.muted, fontSize: '0.8rem', fontWeight: 600,
              padding: '0.4rem 1rem', borderRadius: 999, textDecoration: 'none',
              border: `1px solid rgba(255,255,255,0.12)`,
            }}>{label}</Link>
          ))}
        </div>
        <a href={WA} target="_blank" rel="noreferrer">
          <span style={{
            background: C.red, color: '#fff', border: 'none', borderRadius: 999,
            height: 34, padding: '0 1.1rem', fontSize: '0.78rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <MessageCircle size={13} /> اطلب الآن
          </span>
        </a>
      </nav>

      {/* ═══ HERO — cinematic scroll-chaptered opening ═════════════ */}
      <CaracasSpecialReel />

      {/* ═══ CTA SECTION ══════════════════════════════════════════ */}
      <section style={{ padding: '7rem 2rem', textAlign: 'center', background: C.bg }}>
        <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p style={{ color: C.red, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.25em', marginBottom: '1rem' }}>
            CARACAS
          </p>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(2.5rem, 7vw, 5rem)', color: C.white, lineHeight: 0.95, marginBottom: '1.25rem' }}>
            جاهزين نجهزلك
          </h2>
          <p style={{ color: C.muted, fontSize: '1rem', marginBottom: '2.5rem' }}>
            اطلب هلق عبر واتساب
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={WA} target="_blank" rel="noreferrer">
              <span style={{
                background: '#25D366', color: '#fff', border: 'none', borderRadius: 999,
                fontWeight: 900, fontSize: '1rem', padding: '0.9rem 2.25rem',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: '0 8px 28px rgba(37,211,102,0.35)',
              }}>
                <MessageCircle size={19} /> احجز عبر واتساب
              </span>
            </a>
            <Link to="/caracas/menu">
              <span style={{
                background: 'transparent', color: C.white, border: `1.5px solid rgba(255,255,255,0.2)`,
                borderRadius: 999, fontWeight: 700, fontSize: '1rem', padding: '0.9rem 2.25rem',
                display: 'inline-flex', alignItems: 'center',
              }}>
                شوف المنيو
              </span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ═══ FOOTER ══════════════════════════════════════════════ */}
      <footer style={{ background: '#111', padding: '2.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid rgba(255,255,255,0.08)`, flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: C.red, fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.08em', margin: 0 }}>CARACAS</p>
          <p style={{ color: C.muted, fontSize: '0.75rem', margin: '4px 0 0' }}>Flavor in every bite, fast.</p>
        </div>
        <a href={WA} target="_blank" rel="noreferrer"
          style={{ color: '#25D366', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
          <MessageCircle size={14} /> 96178727986
        </a>
      </footer>
    </div>
  );
}
