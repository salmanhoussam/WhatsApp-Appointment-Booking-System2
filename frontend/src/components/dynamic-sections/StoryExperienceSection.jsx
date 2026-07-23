/**
 * StoryExperienceSection — Dynamic Section Renderer
 * data: {
 *   frame_base_url, frame_count, native_width, native_height, scroll_range_vh,
 *   chapters: [{ id, progressStart, progressEnd, title_ar, subtitle_ar,
 *                cta_label_ar, cta_target }]
 * }
 *
 * A video that leads the page's narrative, not a gallery: real footage is
 * preloaded as frames and painted onto a <canvas> in sync with scroll
 * position (the same real-video-frame technique as beit-al-fakhar's Hero,
 * reused via ../frame-sequence/ rather than reinvented). The video never
 * stops scrubbing — only the overlay ("chapter") content changes, fading
 * in/out as scrollYProgress crosses each chapter's own progress range.
 *
 * chapter title/subtitle/cta_label are plain strings, not yet wired to
 * EditableRegion -- no real Admin PATCH endpoint exists for story_experience
 * chapters yet. Wiring it without one would be a click-to-edit affordance
 * that silently does nothing, so it's deferred, not half-built.
 */
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import FrameSequenceCanvas from '../frame-sequence/FrameSequenceCanvas'

const CHAPTER_FADE = 0.03

function ChapterOverlay({ chapter, scrollYProgress, accent }) {
  const opacity = useTransform(
    scrollYProgress,
    [
      chapter.progressStart - CHAPTER_FADE,
      chapter.progressStart,
      chapter.progressEnd,
      chapter.progressEnd + CHAPTER_FADE,
    ],
    [0, 1, 1, 0]
  )

  return (
    <motion.div
      style={{
        position: 'absolute', inset: 0, opacity,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        padding: '0 24px 80px', textAlign: 'center', pointerEvents: 'none',
      }}
    >
      <h3 style={{
        margin: '0 0 8px', fontFamily: "'Cairo', sans-serif",
        fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800, color: '#fff',
        textShadow: '0 2px 16px rgba(0,0,0,0.5)',
      }}>
        {chapter.title_ar}
      </h3>
      {chapter.subtitle_ar && (
        <p style={{
          margin: '0 0 20px', fontFamily: "'Cairo', sans-serif",
          fontSize: 15, color: 'rgba(255,255,255,0.8)',
        }}>
          {chapter.subtitle_ar}
        </p>
      )}
      {chapter.cta_label_ar && (
        <button
          style={{
            pointerEvents: 'auto', background: accent, color: '#fff', border: 'none',
            borderRadius: 999, padding: '12px 32px', fontSize: 15, fontWeight: 700,
            fontFamily: "'Cairo', sans-serif", cursor: 'pointer',
            boxShadow: `0 8px 32px ${accent}55`,
          }}
          onClick={() => {
            if (chapter.cta_target) {
              document.querySelector(chapter.cta_target)?.scrollIntoView({ behavior: 'smooth' })
            }
          }}
        >
          {chapter.cta_label_ar}
        </button>
      )}
    </motion.div>
  )
}

export default function StoryExperienceSection({ data, accent }) {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  const frameCount = data.frame_count ?? 0
  if (!data.frame_base_url || frameCount === 0) return null

  const assets = {
    frameCount,
    frameUrl: (i) => `${data.frame_base_url}/frame_${String(i + 1).padStart(3, '0')}.webp`,
    nativeWidth: data.native_width,
    nativeHeight: data.native_height,
  }

  return (
    <section
      ref={containerRef}
      style={{
        position: 'relative',
        height: `${data.scroll_range_vh ?? 320}vh`,
        marginLeft: -24, marginRight: -24, marginBottom: 56,
      }}
    >
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        <FrameSequenceCanvas assets={assets} progress={scrollYProgress} />

        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.35) 100%)',
        }} />

        {(data.chapters ?? []).map((chapter) => (
          <ChapterOverlay key={chapter.id} chapter={chapter} scrollYProgress={scrollYProgress} accent={accent} />
        ))}
      </div>
    </section>
  )
}
