/**
 * VideoStorySection — Dynamic Section Renderer
 * data: { heading_ar, videos: [{ id, url, caption_ar, title, description, cta, target_category_id }] }
 *
 * A video-led narrative block, not a gallery — v1 renders each video in
 * sequence only. title/description/cta/target_category_id are a
 * future-ready metadata model, present but unread by this component until a
 * second real tenant case justifies building segment/CTA navigation on top.
 */
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const S_BLOCK = { type: 'spring', stiffness: 70, damping: 20, mass: 1.2 }

function VideoBlock({ video, delay }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ ...S_BLOCK, delay }}
      style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}
    >
      <video
        src={video.url}
        autoPlay muted loop playsInline
        style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block' }}
      />
      {video.caption_ar && (
        <p style={{
          marginTop: 10, fontSize: 14, color: 'rgba(255,255,255,0.55)',
          fontFamily: "'Cairo', sans-serif", textAlign: 'center',
        }}>
          {video.caption_ar}
        </p>
      )}
    </motion.div>
  )
}

export default function VideoStorySection({ data, accent }) {
  const videos = (data.videos ?? []).filter(v => v?.url)

  if (videos.length === 0) return null

  return (
    <section style={{ marginBottom: 56, direction: 'rtl' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{
          margin: 0,
          fontSize: 'clamp(20px, 3vw, 30px)',
          fontWeight: 800,
          color: '#f0f0f5',
          letterSpacing: '-0.01em',
          fontFamily: "'Cairo', sans-serif",
        }}>
          {data.heading_ar || 'من محلنا'}
        </h2>
        <div style={{ width: 36, height: 3, background: accent, borderRadius: 2 }} />
      </div>

      {videos.map((v, i) => (
        <VideoBlock key={v.id ?? i} video={v} delay={i * 0.1} />
      ))}
    </section>
  )
}
