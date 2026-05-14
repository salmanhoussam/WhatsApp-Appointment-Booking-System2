/**
 * HeroSection — Dynamic Section Renderer
 * data: { title_ar, subtitle_ar, cta_text_ar, bg_image_url, bg_type }
 */
import { motion } from 'framer-motion'

const S_TITLE  = { type: 'spring', stiffness: 80,  damping: 18, mass: 1.2 }
const S_BODY   = { type: 'spring', stiffness: 70,  damping: 18, mass: 1.2, delay: 0.12 }
const S_CTA    = { type: 'spring', stiffness: 280, damping: 24, mass: 0.6, delay: 0.26 }

export default function HeroSection({ data, accent }) {
  const isVideo = data.bg_image_url?.match(/\.(mp4|webm|mov)$/i)
  const hasBg   = !!data.bg_image_url

  const scrollDown = () => window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' })

  return (
    <section style={{
      position: 'relative',
      minHeight: '82vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: 56,
      marginLeft: -24,
      marginRight: -24,
    }}>

      {/* Background */}
      {isVideo ? (
        <video
          src={data.bg_image_url}
          autoPlay muted loop playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : hasBg ? (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${data.bg_image_url})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 60% 40%, ${accent}28 0%, transparent 70%),
                       linear-gradient(160deg, oklch(0.13 0.03 280) 0%, oklch(0.08 0.01 260) 100%)`,
        }} />
      )}

      {/* Overlay — stronger on bg-media, subtle on color-only */}
      <div style={{
        position: 'absolute', inset: 0,
        background: hasBg || isVideo
          ? 'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.65) 100%)'
          : `linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)`,
      }} />

      {/* Accent horizontal rule */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: 80, height: 2, background: accent,
        boxShadow: `0 0 16px ${accent}88`,
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        textAlign: 'center',
        padding: '100px 32px 80px',
        maxWidth: 800, margin: '0 auto',
      }}>
        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={S_TITLE}
          style={{
            margin: '0 0 20px',
            fontSize: 'clamp(32px, 6vw, 68px)',
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            fontFamily: "'Cairo', 'Segoe UI', sans-serif",
            textShadow: '0 2px 20px rgba(0,0,0,0.4)',
          }}
        >
          {data.title_ar || 'مرحباً بكم'}
        </motion.h1>

        {data.subtitle_ar && (
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={S_BODY}
            style={{
              margin: '0 0 40px',
              fontSize: 'clamp(15px, 2.2vw, 22px)',
              color: 'rgba(255,255,255,0.72)',
              lineHeight: 1.7,
              fontFamily: "'Cairo', 'Segoe UI', sans-serif",
              maxWidth: 580, marginLeft: 'auto', marginRight: 'auto',
            }}
          >
            {data.subtitle_ar}
          </motion.p>
        )}

        {data.cta_text_ar && (
          <motion.button
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={S_CTA}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={scrollDown}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '14px 40px',
              borderRadius: 999,
              background: accent,
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "'Cairo', 'Segoe UI', sans-serif",
              boxShadow: `0 8px 32px ${accent}55`,
              letterSpacing: '0.02em',
            }}
          >
            {data.cta_text_ar}
          </motion.button>
        )}
      </div>
    </section>
  )
}
