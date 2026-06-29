/**
 * CtaSection — Dynamic Section Renderer
 * data: { text_ar, subtext_ar, link, button_ar }
 */
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CtaSection({ data, accent }) {
  const ref     = useRef(null)
  const inView  = useInView(ref, { once: true, margin: '-40px' })
  const navigate = useNavigate()

  const handleClick = () => {
    if (!data.link) return
    if (data.link.startsWith('http')) {
      window.open(data.link, '_blank', 'noopener noreferrer')
    } else {
      navigate(data.link)
    }
  }

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      style={{
        marginBottom: 56,
        marginLeft: -24,
        marginRight: -24,
        direction: 'rtl',
      }}
    >
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '56px 32px',
        textAlign: 'center',
        background: `linear-gradient(135deg, ${accent}22 0%, ${accent}08 50%, transparent 100%)`,
        borderTop: `1px solid ${accent}33`,
        borderBottom: `1px solid ${accent}22`,
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400, height: 200,
          background: `radial-gradient(ellipse, ${accent}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Text */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {data.text_ar && (
            <h2 style={{
              margin: '0 0 12px',
              fontSize: 'clamp(22px, 4vw, 38px)',
              fontWeight: 900,
              color: '#f0f0f5',
              letterSpacing: '-0.02em',
              fontFamily: "'Cairo', sans-serif",
              lineHeight: 1.2,
            }}>
              {data.text_ar}
            </h2>
          )}

          {data.subtext_ar && (
            <p style={{
              margin: '0 0 32px',
              fontSize: 15,
              color: 'rgba(255,255,255,0.5)',
              fontFamily: "'Cairo', sans-serif",
              lineHeight: 1.7,
              maxWidth: 500,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              {data.subtext_ar}
            </p>
          )}

          {data.link && (
            <motion.button
              onClick={handleClick}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 44px',
                borderRadius: 999,
                background: accent,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "'Cairo', sans-serif",
                boxShadow: `0 8px 32px ${accent}44`,
                letterSpacing: '0.02em',
              }}
            >
              {data.button_ar || 'تواصل معنا'}
            </motion.button>
          )}
        </div>
      </div>
    </motion.section>
  )
}
