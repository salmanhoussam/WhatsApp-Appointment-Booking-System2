import { useState, useEffect, Component } from 'react';
import { motion } from 'framer-motion';

// ── ErrorBoundary ─────────────────────────────────────────────────────────────
class HeroErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { crashed: false }; }
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) return <SimpleHero config={this.props.config} />;
    return this.props.children;
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function useMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

function waLink(num) {
  if (!num) return null;
  return `https://wa.me/${String(num).replace(/\D/g, '')}`;
}

function SocialBtn({ href, label, accent, mobile }) {
  if (!href) return null;
  return (
    <motion.a
      href={href} target="_blank" rel="noreferrer"
      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: mobile ? '10px 20px' : '12px 28px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${accent}44`,
        color: 'rgba(255,255,255,0.7)',
        fontSize: mobile ? 12 : 13, fontWeight: 600,
        textDecoration: 'none', letterSpacing: '0.03em',
        backdropFilter: 'blur(8px)',
      }}
    >{label}</motion.a>
  );
}

// ── T1: SimpleHero — page_type === 'normal' ───────────────────────────────────
function SimpleHero({ config }) {
  const mobile   = useMobile();
  const accent   = config?.primary_color || '#6d28d9';
  const hero     = config?.config?.hero ?? {};
  const title    = hero.title_ar    || config?.name_ar    || config?.name_en    || '';
  const subtitle = hero.subtitle_ar || config?.service_type?.replace(/_/g, ' ') || '';
  const ctaText  = hero.cta_ar      || 'تواصل معنا';
  const coverUrl = config?.hero_image_url || config?.cover_url || null;

  return (
    <div style={{
      position: 'relative', minHeight: mobile ? 340 : 420,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', borderRadius: 24,
      border: '1px solid rgba(255,255,255,0.08)', margin: '32px 0',
      background: coverUrl ? 'transparent' : 'rgba(255,255,255,0.03)',
    }}>
      {coverUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${coverUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'brightness(0.4)',
        }} />
      )}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 70% 60% at 50% 30%, ${accent}${coverUrl ? '22' : '18'} 0%, transparent 70%)`,
      }} />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 70, damping: 20, mass: 1.5 }}
        style={{
          position: 'relative', zIndex: 1, textAlign: 'center',
          padding: mobile ? '40px 24px' : '60px 48px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: mobile ? 14 : 20,
          ...(coverUrl ? {
            background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(16px)',
            borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
            margin: mobile ? '20px' : '40px',
          } : {}),
        }}
      >
        {!coverUrl && (
          <div style={{
            width: mobile ? 54 : 72, height: mobile ? 54 : 72,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}66 100%)`,
            boxShadow: `0 0 40px ${accent}44`, marginBottom: 4,
          }} />
        )}
        <h1 style={{
          margin: 0,
          fontSize: mobile ? 'clamp(22px,7vw,32px)' : 'clamp(28px,5vw,48px)',
          fontWeight: 800, color: '#fff',
          letterSpacing: '-0.03em', lineHeight: 1.15, direction: 'rtl',
        }}>{title}</h1>
        {subtitle && (
          <p style={{
            margin: 0, fontSize: mobile ? 13 : 15,
            color: 'rgba(255,255,255,0.45)', maxWidth: 480,
            lineHeight: 1.6, direction: 'rtl',
          }}>{subtitle}</p>
        )}
        {config?.whatsapp_number && (
          <motion.a
            href={waLink(config.whatsapp_number)}
            target="_blank" rel="noreferrer"
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            style={{
              marginTop: 6, padding: mobile ? '11px 28px' : '13px 36px',
              borderRadius: 999,
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
              color: '#fff', fontWeight: 700, fontSize: mobile ? 13 : 14,
              textDecoration: 'none', boxShadow: `0 8px 28px ${accent}44`,
              letterSpacing: '0.04em',
            }}
          >{ctaText}</motion.a>
        )}
        {(config?.instagram_url || config?.maps_url) && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <SocialBtn href={config.instagram_url} label="انستغرام" accent={accent} mobile={mobile} />
            <SocialBtn href={config.maps_url} label="الموقع على الخريطة" accent={accent} mobile={mobile} />
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── T2: ShowcaseHero — page_type === 'showcase' ───────────────────────────────
function ShowcaseHero({ config }) {
  const mobile   = useMobile();
  const accent   = config?.primary_color || '#6d28d9';
  const hero     = config?.config?.hero ?? {};
  const title    = hero.title_ar    || config?.name_ar    || config?.name_en    || '';
  const subtitle = hero.subtitle_ar || null;
  const ctaText  = hero.cta_ar      || 'ابدأ الآن';
  const coverUrl = config?.hero_image_url || config?.cover_url || null;

  return (
    <div style={{
      position: 'relative', minHeight: mobile ? 360 : 500,
      display: 'grid',
      gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
      overflow: 'hidden', borderRadius: 24,
      border: '1px solid rgba(255,255,255,0.08)',
      margin: '32px 0', direction: 'rtl',
    }}>
      {/* Text panel */}
      <motion.div
        initial={{ opacity: 0, x: mobile ? 0 : 40, y: mobile ? 20 : 0 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ type: 'spring', stiffness: 60, damping: 20, mass: 1 }}
        style={{
          padding: mobile ? '44px 28px 36px' : '64px 48px',
          background: '#0a0a0f',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', gap: mobile ? 18 : 24,
          order: mobile ? 1 : 0,
        }}
      >
        <div style={{ width: 40, height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${accent}, ${accent}44)` }} />
        <h1 style={{
          margin: 0,
          fontSize: mobile ? 'clamp(26px,8vw,38px)' : 'clamp(32px,4vw,52px)',
          fontWeight: 900, color: '#fff',
          letterSpacing: '-0.04em', lineHeight: 1.1,
        }}>{title}</h1>
        {subtitle && (
          <p style={{ margin: 0, fontSize: mobile ? 13 : 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 360 }}>{subtitle}</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          {config?.whatsapp_number && (
            <motion.a
              href={waLink(config.whatsapp_number)}
              target="_blank" rel="noreferrer"
              whileHover={{ x: -6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: mobile ? '11px 24px' : '14px 32px',
                borderRadius: 14, background: accent, color: '#fff',
                fontWeight: 700, fontSize: mobile ? 13 : 14,
                textDecoration: 'none', boxShadow: `0 12px 40px ${accent}55`,
                letterSpacing: '0.04em',
              }}
            >{ctaText}<span style={{ fontSize: 18 }}>←</span></motion.a>
          )}
          {(config?.instagram_url || config?.maps_url) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <SocialBtn href={config.instagram_url} label="انستغرام" accent={accent} mobile={mobile} />
              <SocialBtn href={config.maps_url} label="الخريطة" accent={accent} mobile={mobile} />
            </div>
          )}
        </div>
      </motion.div>

      {/* Visual panel */}
      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'relative', minHeight: mobile ? 220 : 'auto', overflow: 'hidden', order: mobile ? 0 : 1 }}
      >
        {coverUrl ? (
          <>
            <img src={coverUrl} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.75)' }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to left, transparent 40%, #0a0a0f 100%)` }} />
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(145deg, ${accent}22 0%, ${accent}08 50%, #0a0a0f 100%)`, overflow: 'hidden' }}>
            {[200, 300, 400].map((size, i) => (
              <motion.div
                key={size}
                animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                transition={{ duration: 20 + i * 8, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2,
                  borderRadius: '50%', border: `1px solid ${accent}${['33','1a','0d'][i]}`,
                }}
              />
            ))}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 64, height: 64, borderRadius: '50%',
              background: `radial-gradient(circle, ${accent} 0%, ${accent}66 60%, transparent 100%)`,
              boxShadow: `0 0 60px ${accent}66`,
            }} />
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── T3: LandingHero — page_type === 'landing' ─────────────────────────────────
function LandingHero({ config }) {
  const mobile   = useMobile();
  const accent   = config?.primary_color || '#6d28d9';
  const hero     = config?.config?.hero ?? {};
  const title    = hero.title_ar    || config?.name_ar    || config?.name_en    || '';
  const subtitle = hero.subtitle_ar || config?.service_type?.replace(/_/g, ' ') || '';
  const ctaText  = hero.cta_ar      || 'ابدأ الآن';

  return (
    <div style={{
      position: 'relative', minHeight: mobile ? 480 : 580,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', borderRadius: 24, margin: '32px 0',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Deep background */}
      <div style={{ position: 'absolute', inset: 0, background: '#050508' }} />

      {/* Mesh gradients */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 80% 60% at 20% 50%, ${accent}28 0%, transparent 60%),
          radial-gradient(ellipse 60% 80% at 80% 20%, ${accent}18 0%, transparent 55%),
          radial-gradient(ellipse 40% 40% at 60% 80%, ${accent}12 0%, transparent 50%)
        `,
      }} />

      {/* Animated glow blobs */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '15%', right: mobile ? '5%' : '12%',
          width: mobile ? 180 : 260, height: mobile ? 180 : 260,
          borderRadius: '50%', filter: 'blur(60px)',
          background: `radial-gradient(circle, ${accent}55 0%, transparent 70%)`,
        }}
      />
      <motion.div
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.38, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'absolute', bottom: '10%', left: mobile ? '5%' : '15%',
          width: mobile ? 140 : 200, height: mobile ? 140 : 200,
          borderRadius: '50%', filter: 'blur(50px)',
          background: `radial-gradient(circle, ${accent}44 0%, transparent 70%)`,
        }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 60, damping: 20, mass: 1.5 }}
        style={{
          position: 'relative', zIndex: 1, textAlign: 'center',
          padding: mobile ? '52px 28px' : '80px 60px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: mobile ? 18 : 26,
          maxWidth: 740, width: '100%',
        }}
      >
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 20 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 16px', borderRadius: 999,
            background: `${accent}18`, border: `1px solid ${accent}33`,
            fontSize: 11, letterSpacing: '0.12em', fontWeight: 700,
            color: accent, textTransform: 'uppercase',
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, display: 'inline-block' }} />
          {config?.service_type?.replace(/_/g, ' ') || 'منصة سالمان'}
        </motion.div>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 70, damping: 18 }}
          style={{
            margin: 0,
            fontSize: mobile ? 'clamp(36px,10vw,56px)' : 'clamp(52px,7vw,80px)',
            fontWeight: 900, color: '#fff',
            letterSpacing: '-0.05em', lineHeight: 1.05, direction: 'rtl',
          }}
        >{title}</motion.h1>

        {/* Subtitle */}
        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{
              margin: 0, fontSize: mobile ? 14 : 17,
              color: 'rgba(255,255,255,0.42)',
              maxWidth: 500, lineHeight: 1.65, direction: 'rtl',
            }}
          >{subtitle}</motion.p>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 20 }}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}
        >
          {config?.whatsapp_number && (
            <motion.a
              href={waLink(config.whatsapp_number)}
              target="_blank" rel="noreferrer"
              whileHover={{ scale: 1.05, boxShadow: `0 20px 60px ${accent}66` }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: mobile ? '13px 32px' : '16px 44px',
                borderRadius: 999,
                background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`,
                color: '#fff', fontWeight: 800,
                fontSize: mobile ? 14 : 15,
                textDecoration: 'none',
                boxShadow: `0 12px 40px ${accent}55`,
                letterSpacing: '0.02em',
              }}
            >{ctaText}</motion.a>
          )}
          {(config?.instagram_url || config?.maps_url) && (
            <SocialBtn
              href={config.instagram_url || config.maps_url}
              label={config.instagram_url ? 'انستغرام' : 'الموقع على الخريطة'}
              accent={accent} mobile={mobile}
            />
          )}
        </motion.div>

        {/* Decorative divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: mobile ? 60 : 80, height: 1, marginTop: 8,
            background: `linear-gradient(90deg, transparent, ${accent}66, transparent)`,
          }}
        />
      </motion.div>
    </div>
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────
export default function ConfigurableHero({ config }) {
  if (config?.page_type === 'showcase') {
    return (
      <HeroErrorBoundary config={config}>
        <ShowcaseHero config={config} />
      </HeroErrorBoundary>
    );
  }
  if (config?.page_type === 'landing') {
    return (
      <HeroErrorBoundary config={config}>
        <LandingHero config={config} />
      </HeroErrorBoundary>
    );
  }
  return <SimpleHero config={config} />;
}
