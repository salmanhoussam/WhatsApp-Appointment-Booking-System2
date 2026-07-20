import { useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageCircle, ArrowLeft, ChevronDown } from 'lucide-react';
import { Button, Badge } from '@relume_io/relume-ui';
import CaracasStoryReel from '../spatial/CaracasStoryReel';

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  bg:      '#0D0503',
  surface: '#1A0A05',
  card:    '#231008',
  orange:  '#EA580C',
  amber:   '#C8821A',
  cream:   '#F4ECD8',
  muted:   '#7A5A48',
  dim:     '#3A1A0A',
};

const WA = `https://wa.me/96178727986?text=${encodeURIComponent('مرحباً 👋 أريد أحجز طاولة في كراكاس')}`;

const TICKER = [
  'GRILLED TO PERFECTION', 'طازج يومياً', 'FRESH DAILY',
  'مشاوي فاخرة', 'CARACAS KITCHEN', 'طعم لا يُنسى',
];

const GALLERY = [
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=900&fit=crop',
  'https://images.unsplash.com/photo-1559847844-5315695dadae?q=80&w=900&fit=crop',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=900&fit=crop',
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=900&fit=crop',
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CaracasHomePage() {
  const heroRef  = useRef(null);
  const storyRef = useRef(null);

  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroImgY = useTransform(heroScroll, [0, 1], ['0%', '35%']);
  const heroFade = useTransform(heroScroll, [0, 0.6], [1, 0]);

  const { scrollYProgress: storyScroll } = useScroll({ target: storyRef, offset: ['start end', 'end start'] });
  const storyImgX = useTransform(storyScroll, [0, 1], ['8%', '-8%']);

  return (
    <div dir="rtl" style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Cairo', sans-serif" }}>
      <style>{`
        @keyframes crc-ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .crc-ticker { animation: crc-ticker 22s linear infinite; }
        * { box-sizing: border-box; }
      `}</style>

      {/* ═══ NAV ════════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem', height: 56,
        background: 'rgba(13,5,3,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${C.dim}`,
      }}>
        <span style={{ color: C.cream, fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.15em' }}>CARACAS</span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {[['الرئيسية', '/caracas/home'], ['المنيو', '/caracas/menu']].map(([label, to]) => (
            <Link key={to} to={to} style={{
              color: C.muted, fontSize: '0.8rem', fontWeight: 600,
              padding: '0.4rem 1rem', borderRadius: 999, textDecoration: 'none',
              border: `1px solid ${C.dim}`,
              transition: 'color 0.2s',
            }}>{label}</Link>
          ))}
        </div>
        <a href={WA} target="_blank" rel="noreferrer">
          <Button style={{ background: C.orange, color: '#fff', border: 'none', borderRadius: 999, height: 34, padding: '0 1.1rem', fontSize: '0.78rem', fontWeight: 800, gap: 6, display: 'flex', alignItems: 'center' }}>
            <MessageCircle size={13} /> احجز طاولة
          </Button>
        </a>
      </nav>

      {/* ═══ HERO — Typography forward ══════════════════════════ */}
      <section ref={heroRef} style={{ position: 'relative', height: '100vh', minHeight: 600, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>

        {/* Parallax image — right half only */}
        <motion.div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: '60%',
          y: heroImgY,
        }}>
          <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200&fit=crop"
            alt="" style={{ width: '100%', height: '115%', objectFit: 'cover', objectPosition: 'center' }} />
        </motion.div>

        {/* Dark scrims */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to left, ${C.bg} 38%, transparent 75%)` }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg} 15%, transparent 60%)` }} />

        {/* BIG editorial title — right side */}
        <motion.div style={{ position: 'absolute', top: 0, left: '42%', right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 2.5rem', opacity: heroFade }}>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ color: C.orange, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.28em', marginBottom: '1rem' }}>
            SINCE 2020 · مطعم كراكاس
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 70, damping: 18 }}
            style={{ fontWeight: 900, lineHeight: 0.88, margin: '0 0 1.5rem', color: C.cream, fontSize: 'clamp(4rem, 9vw, 7.5rem)' }}>
            كراكاس
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            style={{ color: C.muted, fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem', maxWidth: 300 }}>
            مشاوي وأطباق فاخرة معمولة بيدين شيف متخصص — تجربة أكل ما بتنسى
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
            style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/caracas/menu">
              <Button style={{ background: C.orange, color: '#fff', border: 'none', borderRadius: 999, fontWeight: 800, fontSize: '0.9rem', padding: '0.7rem 1.75rem', display: 'flex', alignItems: 'center', gap: 6, boxShadow: `0 8px 28px ${C.orange}55` }}>
                شوف المنيو <ArrowLeft size={16} />
              </Button>
            </Link>
            <a href={WA} target="_blank" rel="noreferrer">
              <Button style={{ background: 'transparent', color: C.cream, border: `1.5px solid ${C.dim}`, borderRadius: 999, fontWeight: 700, fontSize: '0.9rem', padding: '0.7rem 1.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageCircle size={16} /> تواصل معنا
              </Button>
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          animate={{ y: [0, 10, 0] }} transition={{ duration: 1.8, repeat: Infinity }}
          style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', color: C.muted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: '0.7rem', letterSpacing: '0.1em' }}>
          <span>اكتشف</span>
          <ChevronDown size={14} />
        </motion.div>
      </section>

      {/* ═══ AMBER TICKER ════════════════════════════════════════ */}
      <div style={{ background: C.orange, overflow: 'hidden', padding: '0.65rem 0' }}>
        <div className="crc-ticker" style={{ display: 'flex', gap: '3rem', whiteSpace: 'nowrap', width: 'max-content' }}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.18em' }}>• {t}</span>
          ))}
        </div>
      </div>

      {/* ═══ SIGNATURE DISHES — chaptered scroll reel ═════════════ */}
      <CaracasStoryReel />

      {/* ═══ STORY — editorial split ═════════════════════════════ */}
      <section ref={storyRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 560, overflow: 'hidden' }}>
        {/* Image */}
        <motion.div style={{ position: 'relative', overflow: 'hidden' }}>
          <motion.img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=900&fit=crop"
            alt="" style={{ x: storyImgX, width: '115%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 480 }}
          />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to left, ${C.surface} 0%, transparent 60%)` }} />
        </motion.div>

        {/* Text */}
        <div style={{ background: C.surface, padding: '5rem 3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            <Badge style={{ background: `${C.orange}22`, color: C.orange, border: `1px solid ${C.orange}44`, borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, marginBottom: '1.5rem', display: 'inline-flex' }}>
              قصتنا
            </Badge>
            <h2 style={{ fontWeight: 900, fontSize: 'clamp(2rem, 4vw, 3rem)', color: C.cream, lineHeight: 1.1, marginBottom: '1.25rem' }}>
              طعم أصيل،<br />
              <span style={{ color: C.orange }}>يوم بعد يوم</span>
            </h2>
            <p style={{ color: C.muted, fontSize: '0.92rem', lineHeight: 1.9, marginBottom: '1rem' }}>
              منذ أول يوم فتحنا فيه الأبواب، قررنا إننا ما نتنازل عن الجودة. كل طبق بتشيلو من عنا معمول بمكونات طازجة، ومتبّل بعناية، ومطبوخ بحب.
            </p>
            <p style={{ color: C.dim, fontSize: '0.85rem', lineHeight: 1.8, marginBottom: '2rem' }}>
              مطعم كراكاس مش بس مكان للأكل — هو تجربة. من أول لحظة تدخل فيها حتى آخر لقمة.
            </p>
            <a href={WA} target="_blank" rel="noreferrer">
              <Button style={{ background: C.orange, color: '#fff', border: 'none', borderRadius: 999, fontWeight: 800, fontSize: '0.88rem', padding: '0.7rem 1.75rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <MessageCircle size={15} /> تواصل معنا
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* ═══ PHOTO STRIP ═════════════════════════════════════════ */}
      <section style={{ overflow: 'hidden', display: 'flex', height: 300 }}>
        {GALLERY.map((src, i) => (
          <motion.div key={i} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
            whileHover={{ flex: 2.2 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
            <img src={src} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,5,3,0.35)', transition: 'opacity 0.3s' }} />
          </motion.div>
        ))}
      </section>

      {/* ═══ CTA ════════════════════════════════════════════════ */}
      <section style={{ padding: '7rem 2rem', textAlign: 'center', background: C.surface, position: 'relative', overflow: 'hidden' }}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${C.orange}18 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ position: 'relative' }}>
          <p style={{ color: C.orange, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.25em', marginBottom: '1rem' }}>CARACAS KITCHEN</p>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(3rem, 8vw, 6.5rem)', color: C.cream, lineHeight: 0.92, marginBottom: '1.25rem' }}>
            جاهزين<br />
            <span style={{ color: C.orange }}>نستقبلك</span>
          </h2>
          <p style={{ color: C.muted, fontSize: '1rem', marginBottom: '3rem' }}>
            احجز طاولتك أو اطلب عبر واتساب
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={WA} target="_blank" rel="noreferrer">
              <Button style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 999, fontWeight: 900, fontSize: '1rem', padding: '0.9rem 2.25rem', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 28px rgba(37,211,102,0.35)' }}>
                <MessageCircle size={19} /> احجز عبر واتساب
              </Button>
            </a>
            <Link to="/caracas/menu">
              <Button style={{ background: 'transparent', color: C.cream, border: `1.5px solid ${C.dim}`, borderRadius: 999, fontWeight: 700, fontSize: '1rem', padding: '0.9rem 2.25rem' }}>
                شوف المنيو
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ═══ FOOTER ══════════════════════════════════════════════ */}
      <footer style={{ background: C.bg, padding: '2.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.dim}`, flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: C.cream, fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.12em', margin: 0 }}>CARACAS</p>
          <p style={{ color: C.muted, fontSize: '0.75rem', margin: '4px 0 0' }}>مشاوي · مأكولات فاخرة</p>
        </div>
        <a href={WA} target="_blank" rel="noreferrer"
          style={{ color: '#25D366', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
          <MessageCircle size={14} /> 96178727986
        </a>
      </footer>
    </div>
  );
}
