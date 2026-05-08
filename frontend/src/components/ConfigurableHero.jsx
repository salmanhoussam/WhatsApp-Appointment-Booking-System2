import { useState, useEffect, Component } from 'react';
import { motion } from 'framer-motion';

// ── ErrorBoundary — ShowcaseHero failures fall back to SimpleHero ─────────────
class HeroErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) return <SimpleHero config={this.props.config} />;
    return this.props.children;
  }
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
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

// Social button sub-component
function SocialBtn({ href, label, accent, mobile }) {
  if (!href) return null;
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noreferrer"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: mobile ? '10px 20px' : '12px 28px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${accent}44`,
        color: 'rgba(255,255,255,0.7)',
        fontSize: mobile ? 12 : 13,
        fontWeight: 600,
        textDecoration: 'none',
        letterSpacing: '0.03em',
        backdropFilter: 'blur(8px)',
      }}
    >
      {label}
    </motion.a>
  );
}

// ── SimpleHero — page_type === 'normal' (default) ─────────────────────────────
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
      position: 'relative',
      minHeight: mobile ? 340 : 420,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderRadius: 24,
      border: '1px solid rgba(255,255,255,0.08)',
      margin: '32px 0',
      // cover image or dark glass
      background: coverUrl
        ? 'transparent'
        : 'rgba(255,255,255,0.03)',
    }}>
      {/* Background image */}
      {coverUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${coverUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.4)',
        }} />
      )}

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 70% 60% at 50% 30%, ${accent}${coverUrl ? '22' : '18'} 0%, transparent 70%)`,
      }} />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 70, damping: 20, mass: 1.5 }}
        style={{
          position: 'relative', zIndex: 1,
          textAlign: 'center',
          padding: mobile ? '40px 24px' : '60px 48px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: mobile ? 14 : 20,
          // glass panel over cover image
          ...(coverUrl ? {
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(16px)',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.1)',
            margin: mobile ? '20px' : '40px',
          } : {}),
        }}
      >
        {/* Color orb — only shown without cover */}
        {!coverUrl && (
          <div style={{
            width: mobile ? 54 : 72,
            height: mobile ? 54 : 72,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}66 100%)`,
            boxShadow: `0 0 40px ${accent}44`,
            marginBottom: 4,
          }} />
        )}

        <h1 style={{
          margin: 0,
          fontSize: mobile ? 'clamp(22px, 7vw, 32px)' : 'clamp(28px, 5vw, 48px)',
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
          direction: 'rtl',
        }}>
          {title}
        </h1>

        {subtitle && (
          <p style={{
            margin: 0,
            fontSize: mobile ? 13 : 15,
            color: 'rgba(255,255,255,0.45)',
            maxWidth: 480,
            lineHeight: 1.6,
            direction: 'rtl',
          }}>
            {subtitle}
          </p>
        )}

        {/* Primary CTA */}
        {config?.whatsapp_number && (
          <motion.a
            href={waLink(config.whatsapp_number)}
            target="_blank" rel="noreferrer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            style={{
              marginTop: 6,
              padding: mobile ? '11px 28px' : '13px 36px',
              borderRadius: 999,
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
              color: '#fff',
              fontWeight: 700,
              fontSize: mobile ? 13 : 14,
              textDecoration: 'none',
              boxShadow: `0 8px 28px ${accent}44`,
              letterSpacing: '0.04em',
            }}
          >
            {ctaText}
          </motion.a>
        )}

        {/* Secondary social links */}
        {(config?.instagram_url || config?.maps_url) && (
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center',
          }}>
            <SocialBtn href={config.instagram_url} label="انستغرام" accent={accent} mobile={mobile} />
            <SocialBtn href={config.maps_url} label="الموقع على الخريطة" accent={accent} mobile={mobile} />
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── ShowcaseHero — page_type === 'showcase' ───────────────────────────────────
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
      position: 'relative',
      minHeight: mobile ? 360 : 500,
      display: 'grid',
      gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
      overflow: 'hidden',
      borderRadius: 24,
      border: '1px solid rgba(255,255,255,0.08)',
      margin: '32px 0',
      direction: 'rtl',
    }}>

      {/* ── Text panel ──────────────────────────────────────────────── */}
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
        {/* Accent line */}
        <div style={{
          width: 40, height: 3, borderRadius: 2,
          background: `linear-gradient(90deg, ${accent}, ${accent}44)`,
        }} />

        <h1 style={{
          margin: 0,
          fontSize: mobile ? 'clamp(26px, 8vw, 38px)' : 'clamp(32px, 4vw, 52px)',
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
        }}>
          {title}
        </h1>

        {subtitle && (
          <p style={{
            margin: 0,
            fontSize: mobile ? 13 : 15,
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.7,
            maxWidth: 360,
          }}>
            {subtitle}
          </p>
        )}

        {/* CTA + social */}
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
                borderRadius: 14,
                background: accent,
                color: '#fff',
                fontWeight: 700,
                fontSize: mobile ? 13 : 14,
                textDecoration: 'none',
                boxShadow: `0 12px 40px ${accent}55`,
                letterSpacing: '0.04em',
              }}
            >
              {ctaText}
              <span style={{ fontSize: 18 }}>←</span>
            </motion.a>
          )}

          {(config?.instagram_url || config?.maps_url) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <SocialBtn href={config.instagram_url} label="انستغرام" accent={accent} mobile={mobile} />
              <SocialBtn href={config.maps_url} label="الخريطة" accent={accent} mobile={mobile} />
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Visual panel ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative', minHeight: mobile ? 220 : 'auto',
          overflow: 'hidden',
          order: mobile ? 0 : 1,
        }}
      >
        {coverUrl ? (
          /* Real image */
          <>
            <img
              src={coverUrl}
              alt={title}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                filter: 'brightness(0.75)',
              }}
            />
            {/* Overlay gradient */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(to left, transparent 40%, #0a0a0f 100%)`,
            }} />
          </>
        ) : (
          /* Animated rings fallback */
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(145deg, ${accent}22 0%, ${accent}08 50%, #0a0a0f 100%)`,
            overflow: 'hidden',
          }}>
            {[200, 300, 400].map((size, i) => (
              <motion.div
                key={size}
                animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                transition={{ duration: 20 + i * 8, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  width: size, height: size,
                  marginLeft: -size / 2, marginTop: -size / 2,
                  borderRadius: '50%',
                  border: `1px solid ${accent}${['33', '1a', '0d'][i]}`,
                }}
              />
            ))}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
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

// ── ConfigurableHero — entry point ────────────────────────────────────────────
export default function ConfigurableHero({ config }) {
  if (config?.page_type === 'showcase') {
    return (
      <HeroErrorBoundary config={config}>
        <ShowcaseHero config={config} />
      </HeroErrorBoundary>
    );
  }
  return <SimpleHero config={config} />;
}
