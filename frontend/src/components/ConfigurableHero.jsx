import { motion } from 'framer-motion';

// ── SimpleHero — page_type === 'normal' ──────────────────────────────────────
function SimpleHero({ config }) {
  const accent = config?.primary_color || '#6d28d9';
  const name   = config?.name_ar || config?.name_en || '';

  return (
    <div style={{
      position: 'relative',
      minHeight: 420,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderRadius: 24,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      margin: '32px 0',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 70% 60% at 50% 30%, ${accent}18 0%, transparent 70%)`,
      }} />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 70, damping: 20, mass: 1.5 }}
        style={{
          position: 'relative', zIndex: 1,
          textAlign: 'center', padding: '60px 40px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 20,
        }}
      >
        {/* Color orb */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: `linear-gradient(135deg, ${accent} 0%, ${accent}66 100%)`,
          boxShadow: `0 0 40px ${accent}44`,
          marginBottom: 8,
        }} />

        <h1 style={{
          margin: 0,
          fontSize: 'clamp(28px, 5vw, 48px)',
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
          direction: 'rtl',
        }}>
          {name}
        </h1>

        {config?.service_type && (
          <p style={{
            margin: 0, fontSize: 14,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            {config.service_type.replace('_', ' ')}
          </p>
        )}

        {config?.whatsapp_number && (
          <motion.a
            href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}`}
            target="_blank" rel="noreferrer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            style={{
              marginTop: 8,
              padding: '13px 36px',
              borderRadius: 999,
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
              color: '#fff',
              fontWeight: 700, fontSize: 14,
              textDecoration: 'none',
              boxShadow: `0 8px 28px ${accent}44`,
              letterSpacing: '0.04em',
            }}
          >
            تواصل معنا
          </motion.a>
        )}
      </motion.div>
    </div>
  );
}

// ── ShowcaseHero — page_type === 'showcase' ───────────────────────────────────
function ShowcaseHero({ config }) {
  const accent = config?.primary_color || '#6d28d9';
  const name   = config?.name_ar || config?.name_en || '';

  return (
    <div style={{
      position: 'relative',
      minHeight: 500,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      overflow: 'hidden',
      borderRadius: 24,
      border: '1px solid rgba(255,255,255,0.08)',
      margin: '32px 0',
      direction: 'rtl',
    }}>
      {/* Left — editorial text */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 60, damping: 20, mass: 1 }}
        style={{
          padding: '64px 48px',
          background: '#0a0a0f',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', gap: 24,
        }}
      >
        {/* Accent line */}
        <div style={{
          width: 48, height: 3, borderRadius: 2,
          background: `linear-gradient(90deg, ${accent}, ${accent}44)`,
        }} />

        <h1 style={{
          margin: 0,
          fontSize: 'clamp(32px, 4vw, 52px)',
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
        }}>
          {name}
        </h1>

        {config?.service_type && (
          <p style={{
            margin: 0, fontSize: 13,
            color: `${accent}bb`,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            {config.service_type.replace('_', ' ')}
          </p>
        )}

        {config?.whatsapp_number && (
          <motion.a
            href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}`}
            target="_blank" rel="noreferrer"
            whileHover={{ x: -6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '14px 32px',
              borderRadius: 14,
              background: accent,
              color: '#fff',
              fontWeight: 700, fontSize: 14,
              textDecoration: 'none',
              width: 'fit-content',
              boxShadow: `0 12px 40px ${accent}55`,
              letterSpacing: '0.04em',
            }}
          >
            ابدأ الآن
            <span style={{ fontSize: 18 }}>←</span>
          </motion.a>
        )}
      </motion.div>

      {/* Right — color field */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative',
          background: `linear-gradient(145deg, ${accent}22 0%, ${accent}08 50%, #0a0a0f 100%)`,
          overflow: 'hidden',
        }}
      >
        {/* Rings */}
        {[220, 320, 420].map((size, i) => (
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
              border: `1px solid ${accent}${i === 0 ? '33' : i === 1 ? '1a' : '0d'}`,
            }}
          />
        ))}
        {/* Center dot */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 64, height: 64,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent} 0%, ${accent}66 60%, transparent 100%)`,
          boxShadow: `0 0 60px ${accent}66`,
        }} />
      </motion.div>
    </div>
  );
}

// ── Resolver ──────────────────────────────────────────────────────────────────
export default function ConfigurableHero({ config }) {
  if (config?.page_type === 'showcase') return <ShowcaseHero config={config} />;
  return <SimpleHero config={config} />;
}
