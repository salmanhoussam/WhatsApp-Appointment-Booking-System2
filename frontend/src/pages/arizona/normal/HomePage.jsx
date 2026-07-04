import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageCircle, ArrowLeft, Star, Clock, MapPin } from 'lucide-react';
import {
  Button,
  Badge,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@relume_io/relume-ui';
import '../arizona.css';

const WA = `https://wa.me/96178727986?text=${encodeURIComponent('مرحباً 👋 أريد أطلب من مطعم أريزونا')}`;

const TICKER = ['🥤 عصائر طازجة', '🍹 كوكتيل', '🧃 فريش يومي', '🥪 سناكات', '🍟 فريز', '🍓 فراولة', '🥭 مانجو', '🍋 ليمون نعنع'];

const GALLERY = [
  'https://images.unsplash.com/photo-1497534446932-c925b458314e?q=80&w=800&fit=crop',
  'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=800&fit=crop',
  'https://images.unsplash.com/photo-1543362906-acfc16c67564?q=80&w=800&fit=crop',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&fit=crop',
  'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=800&fit=crop',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&fit=crop',
];

const FEATURES = [
  { icon: '🥤', label: 'Fresh Daily', title: 'عصائر طازجة', body: 'كل يوم نعصر فريش — فراولة، مانجو، أفوكادو، ليمون نعنع، وأكثر' },
  { icon: '🍹', label: 'Signature', title: 'كوكتيل بارد', body: 'تشكيلة واسعة من الكوكتيل الباردة — موكتيل، فروزن، ومشروبات حصرية' },
  { icon: '🥪', label: 'Snacks', title: 'سناكات لذيذة', body: 'برغر، ساندويشات، فريز، ناجتس — وجبات خفيفة وطازجة على طول' },
];

const STATS = [
  { icon: <Star size={18} />, value: '4.9', label: 'تقييم العملاء' },
  { icon: <Clock size={18} />, value: '10ص–12م', label: 'ساعات العمل' },
  { icon: <MapPin size={18} />, value: 'متوفر', label: 'توصيل واتساب' },
];

export default function ArizonaHomePage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const bgY  = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const fade = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  return (
    <div data-slug="arizona" className="min-h-screen font-cairo overflow-x-hidden" dir="rtl"
      style={{ fontFamily: "'Cairo', sans-serif", background: '#E3E55E' }}>

      <style>{`
        @keyframes az-r { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes az-l { from{transform:translateX(-50%)} to{transform:translateX(0)} }
        .az-ticker-r { animation: az-r 18s linear infinite; }
        .az-ticker-l { animation: az-l 24s linear infinite; }
        [data-slug="arizona"] * { box-sizing: border-box; }
      `}</style>

      {/* ═══ NAV ══════════════════════════════════════════════════ */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 h-14"
        style={{ background: '#2B5454' }}>
        <span className="text-lg font-black tracking-widest" style={{ color: '#E3E55E' }}>أريزونا</span>

        <div className="flex gap-1">
          {[['الرئيسية', '/arizona/home'], ['المنيو', '/arizona/menu']].map(([label, to]) => (
            <Link key={to} to={to}
              className="text-sm font-bold px-4 py-1.5 rounded-full border transition-all"
              style={{ color: '#E3E55E', borderColor: 'rgba(227,229,94,0.3)' }}>
              {label}
            </Link>
          ))}
        </div>

        <a href={WA} target="_blank" rel="noreferrer">
          <Button className="gap-1.5 rounded-full text-xs font-bold h-8 px-4"
            style={{ background: '#25D366', color: '#fff', border: 'none' }}>
            <MessageCircle size={13} /> اطلب الآن
          </Button>
        </a>
      </nav>

      {/* ═══ HERO ═════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative flex items-end overflow-hidden"
        style={{ height: '100vh', minHeight: 560 }}>

        <motion.div className="absolute inset-0" style={{ y: bgY }}>
          <img
            src="https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=2070&fit=crop"
            alt="" className="w-full h-full object-cover object-center scale-110"
          />
        </motion.div>

        {/* gradient scrim */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(43,84,84,0.55) 0%, rgba(0,0,0,0.1) 45%, #E3E55E 100%)' }} />

        {/* floating badge — logo card Burrito Libre style */}
        <motion.div style={{ opacity: fade }}
          className="absolute inset-x-0 bottom-0 flex justify-center pb-10 px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 80, damping: 18 }}
            className="relative bg-white rounded-2xl px-10 py-6 text-center shadow-2xl"
            style={{ outline: '3px dashed #2B5454', outlineOffset: -8, maxWidth: 440 }}>

            {/* eyebrow badge */}
            <div className="flex justify-center mb-3">
              <Badge className="rounded-full text-xs font-bold px-3 py-1"
                style={{ background: '#E3E55E', color: '#2B5454', border: 'none' }}>
                سناكات · عصائر · كوكتيل
              </Badge>
            </div>

            <h1 className="font-black leading-none tracking-tight mb-1"
              style={{ fontSize: 'clamp(3rem, 10vw, 5.5rem)', color: '#4A7A58' }}>
              أريزونا
            </h1>
            <p className="text-sm mb-5" style={{ color: '#6A8888' }}>
              كل شي طازج، كل شي بارد، كل شي بيشهي
            </p>

            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/arizona/menu">
                <Button className="rounded-full font-bold gap-2 px-6"
                  style={{ background: '#2B5454', color: '#E3E55E', border: 'none' }}>
                  شوف المنيو <ArrowLeft size={15} />
                </Button>
              </Link>
              <a href={WA} target="_blank" rel="noreferrer">
                <Button className="rounded-full font-bold gap-2 px-6"
                  style={{ background: '#25D366', color: '#fff', border: 'none' }}>
                  <MessageCircle size={15} /> واتساب
                </Button>
              </a>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ TICKER 1 ═════════════════════════════════════════════ */}
      <div className="overflow-hidden py-2.5" style={{ background: '#2B5454' }}>
        <div className="flex gap-10 whitespace-nowrap az-ticker-r" style={{ width: 'max-content' }}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="text-sm font-bold tracking-wider" style={{ color: '#E3E55E' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ═══ STATS STRIP ══════════════════════════════════════════ */}
      <div className="flex justify-center gap-0 border-b-4" style={{ borderColor: '#2B5454', background: '#fff' }}>
        {STATS.map(({ icon, value, label }, i) => (
          <div key={i} className="flex-1 flex flex-col items-center py-5 gap-1 border-r-2 last:border-r-0"
            style={{ borderColor: '#2B545422' }}>
            <div className="flex items-center gap-1.5" style={{ color: '#E8806E' }}>{icon}</div>
            <span className="text-xl font-black" style={{ color: '#2B5454' }}>{value}</span>
            <span className="text-xs" style={{ color: '#6A8888' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ═══ FEATURES ═════════════════════════════════════════════ */}
      <section className="py-20 px-6" style={{ background: '#E3E55E' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} className="mb-12">
            <p className="text-xs font-bold tracking-[0.22em] uppercase mb-2" style={{ color: '#E8806E' }}>
              ليش تيجي عنا؟
            </p>
            <h2 className="font-black leading-none" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: '#2B5454' }}>
              شو عنا؟
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map(({ icon, label, title, body }, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                whileHover={{ rotate: 1.2, scale: 1.03, y: -4 }}
                className="bg-white rounded-2xl p-7 shadow-sm"
                style={{ outline: '3px dashed #2B5454', outlineOffset: -7 }}>
                <div className="text-5xl mb-4">{icon}</div>
                <Badge className="rounded-full text-xs mb-3 font-bold"
                  style={{ background: '#E3E55E', color: '#2B5454', border: 'none' }}>
                  {label}
                </Badge>
                <h3 className="text-lg font-black mb-2" style={{ color: '#2B5454' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6A8888' }}>{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ GALLERY — Relume Carousel ════════════════════════════ */}
      <section className="py-16 px-6" style={{ background: '#E8806E' }}>
        <div className="max-w-5xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-black text-center mb-10 text-white"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            من مطبخنا 📸
          </motion.h2>

          <Carousel opts={{ align: 'start', loop: true }}
            className="w-full">
            <CarouselContent className="-ml-3">
              {GALLERY.map((src, i) => (
                <CarouselItem key={i} className="pl-3 basis-1/2 md:basis-1/3">
                  <motion.div
                    whileHover={{ scale: 1.04, rotate: i % 2 === 0 ? 1.5 : -1.5 }}
                    className="overflow-hidden rounded-2xl border-4 border-white shadow-lg aspect-square">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center gap-3 mt-6">
              <CarouselPrevious className="static translate-y-0 rounded-full w-10 h-10"
                style={{ background: '#2B5454', color: '#E3E55E', border: 'none' }} />
              <CarouselNext className="static translate-y-0 rounded-full w-10 h-10"
                style={{ background: '#2B5454', color: '#E3E55E', border: 'none' }} />
            </div>
          </Carousel>
        </div>
      </section>

      {/* ═══ TICKER 2 (reverse) ═══════════════════════════════════ */}
      <div className="overflow-hidden py-2.5" style={{ background: '#2B5454' }}>
        <div className="flex gap-10 whitespace-nowrap az-ticker-l" style={{ width: 'max-content' }}>
          {['• سناكات طازجة', '• عصائر طبيعية', '• كوكتيل بارد', '• توصيل واتساب', '• جودة يومية',
            '• سناكات طازجة', '• عصائر طبيعية', '• كوكتيل بارد', '• توصيل واتساب', '• جودة يومية']
            .map((t, i) => (
              <span key={i} className="text-sm font-black tracking-widest" style={{ color: '#E3E55E' }}>{t}</span>
            ))}
        </div>
      </div>

      {/* ═══ CTA SECTION ══════════════════════════════════════════ */}
      <section className="py-24 px-6 text-center border-t-4" style={{ background: '#E3E55E', borderColor: '#2B5454' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Badge className="rounded-full text-xs font-black tracking-widest mb-4 px-4 py-1.5"
            style={{ background: '#2B5454', color: '#E3E55E', border: 'none' }}>
            ARIZONA KITCHEN
          </Badge>
          <h2 className="font-black leading-none mb-3"
            style={{ fontSize: 'clamp(3rem, 9vw, 6rem)', color: '#2B5454' }}>
            جاعان؟ 🤤
          </h2>
          <p className="mb-10 text-base" style={{ color: '#6A8888' }}>
            اطلب هلق عبر واتساب وجهزلك الطلب بأسرع وقت
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <a href={WA} target="_blank" rel="noreferrer">
              <Button size="lg"
                className="rounded-full font-black gap-2.5 px-8 text-base shadow-xl"
                style={{ background: '#25D366', color: '#fff', border: 'none', boxShadow: '0 8px 28px rgba(37,211,102,0.4)' }}>
                <MessageCircle size={20} /> اطلب عبر واتساب
              </Button>
            </a>
            <Link to="/arizona/menu">
              <Button size="lg" variant="outline"
                className="rounded-full font-black gap-2.5 px-8 text-base"
                style={{ background: '#2B5454', color: '#E3E55E', border: 'none', boxShadow: '0 8px 28px rgba(43,84,84,0.35)' }}>
                شوف المنيو الكامل
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ═══ FOOTER ═══════════════════════════════════════════════ */}
      <footer className="py-8 px-6 text-center" style={{ background: '#2B5454' }}>
        <p className="font-black text-xl mb-1" style={{ color: '#E3E55E' }}>أريزونا</p>
        <p className="text-sm mb-3" style={{ color: 'rgba(227,229,94,0.55)' }}>سناكات · عصائر · كوكتيل</p>
        <a href={WA} target="_blank" rel="noreferrer"
          className="text-sm font-bold" style={{ color: '#25D366' }}>
          واتساب: 96178727986
        </a>
      </footer>
    </div>
  );
}
