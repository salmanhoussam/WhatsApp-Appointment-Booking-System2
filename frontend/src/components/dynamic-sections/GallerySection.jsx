/**
 * GallerySection — Dynamic Section Renderer
 * data: { heading_ar, images: [{url, caption_ar}] }
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  const img = images[idx]

  const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length) }
  const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % images.length) }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 24,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff', fontSize: 20, width: 40, height: 40,
          borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ✕
      </button>

      {/* Prev */}
      {images.length > 1 && (
        <button onClick={prev} style={{
          position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff', fontSize: 22, width: 44, height: 44,
          borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
      )}

      {/* Image */}
      <motion.div
        key={idx}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
      >
        <img
          src={img.url}
          alt={img.caption_ar || ''}
          style={{ maxWidth: '88vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 10 }}
        />
        {img.caption_ar && (
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: "'Cairo', sans-serif", margin: 0 }}>
            {img.caption_ar}
          </p>
        )}
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: "'Cairo', sans-serif", margin: 0 }}>
          {idx + 1} / {images.length}
        </p>
      </motion.div>

      {/* Next */}
      {images.length > 1 && (
        <button onClick={next} style={{
          position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff', fontSize: 22, width: 44, height: 44,
          borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>›</button>
      )}
    </motion.div>
  )
}

export default function GallerySection({ data, accent }) {
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const images = (data.images ?? []).filter(img => img?.url)

  if (images.length === 0) return null

  return (
    <section style={{ marginBottom: 56, direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{
          margin: 0,
          fontSize: 'clamp(20px, 3vw, 30px)',
          fontWeight: 800,
          color: '#f0f0f5',
          letterSpacing: '-0.01em',
          fontFamily: "'Cairo', sans-serif",
        }}>
          {data.heading_ar || 'معرض الصور'}
        </h2>
        <div style={{ width: 36, height: 3, background: accent, borderRadius: 2 }} />
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 10,
      }}>
        {images.map((img, i) => (
          <motion.button
            key={i}
            onClick={() => setLightboxIdx(i)}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24, delay: i * 0.05 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            style={{
              position: 'relative',
              aspectRatio: '4/3',
              borderRadius: 12,
              overflow: 'hidden',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <img
              src={img.url}
              alt={img.caption_ar || ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {img.caption_ar && (
              <div style={{
                position: 'absolute', bottom: 0, right: 0, left: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)',
                padding: '20px 12px 10px',
                textAlign: 'right',
              }}>
                <span style={{
                  fontSize: 12, color: '#fff',
                  fontFamily: "'Cairo', sans-serif",
                }}>
                  {img.caption_ar}
                </span>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {lightboxIdx !== null && (
          <Lightbox
            images={images}
            startIndex={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
