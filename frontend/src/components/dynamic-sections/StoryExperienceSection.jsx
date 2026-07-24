/**
 * StoryExperienceSection — Dynamic Section Renderer
 * data: {
 *   frame_base_url, frame_count, native_width, native_height, scroll_range_vh,
 *   chapters: [{ id, holdStart, holdEnd, hold_frame, title_ar, subtitle_ar,
 *                cta_label_ar, cta_target }]
 * }
 *
 * Directed as a cinematic sequence, not a rendering section (2026-07-24 UX
 * tuning pass, per Salman's direct review): the video plays freely between
 * chapters, then FREEZES on each chapter's `hold_frame` for the
 * [holdStart, holdEnd] scroll range while that chapter's overlay fades in,
 * holds, and fades out — text is never scrubbing past over a moving image.
 * Once the overlay finishes, frame progression resumes into the next
 * chapter's hold frame.
 *
 * The frame-sequence ENGINE itself (../frame-sequence/FrameSequenceCanvas)
 * is untouched and still just maps a linear 0-1 `progress` value to a frame
 * index — this file bends time before handing progress to it: `useTransform`
 * turns raw scroll progress into a piecewise curve that goes flat during
 * each hold window, built from the chapters' own hold_frame values below.
 *
 * chapter title/subtitle/cta_label are plain strings, not yet wired to
 * EditableRegion -- no real Admin PATCH endpoint exists for story_experience
 * chapters yet. Wiring it without one would be a click-to-edit affordance
 * that silently does nothing, so it's deferred, not half-built.
 */
import { useMemo, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import FrameSequenceCanvas from '../frame-sequence/FrameSequenceCanvas'

const HOLD_FADE = 0.025

function ChapterOverlay({ chapter, scrollYProgress, accent }) {
  const opacity = useTransform(
    scrollYProgress,
    [
      chapter.holdStart - HOLD_FADE,
      chapter.holdStart,
      chapter.holdEnd,
      chapter.holdEnd + HOLD_FADE,
    ],
    [0, 1, 1, 0]
  )

  return (
    <motion.div
      style={{
        position: 'absolute', inset: 0, opacity,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 32px', textAlign: 'center', pointerEvents: 'none',
      }}
    >
      <h3 style={{
        margin: '0 0 18px', fontFamily: "'Cairo', sans-serif",
        fontSize: 'clamp(34px, 7vw, 68px)', fontWeight: 900, color: '#fff',
        letterSpacing: '0.01em', lineHeight: 1.15,
        textShadow: '0 4px 32px rgba(0,0,0,0.65)',
      }}>
        {chapter.title_ar}
      </h3>
      {chapter.subtitle_ar && (
        <p style={{
          margin: '0 0 32px', fontFamily: "'Cairo', sans-serif",
          fontSize: 'clamp(15px, 2vw, 20px)', color: 'rgba(255,255,255,0.85)',
          letterSpacing: '0.02em',
        }}>
          {chapter.subtitle_ar}
        </p>
      )}
      {chapter.cta_label_ar && (
        <button
          style={{
            pointerEvents: 'auto', background: accent, color: '#fff', border: 'none',
            borderRadius: 999, padding: '14px 40px', fontSize: 16, fontWeight: 700,
            fontFamily: "'Cairo', sans-serif", cursor: 'pointer',
            boxShadow: `0 8px 32px ${accent}66`,
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
  const chapters = data.chapters ?? []
  const frameBaseUrl = data.frame_base_url

  // Memoized for the same reason as the breakpoints below: FrameSequenceCanvas's
  // preload effect (useFrameSequence.js) keys off `frameUrl` reference identity --
  // a fresh closure every render would re-trigger a full 77-image reload loop.
  const assets = useMemo(() => ({
    frameCount,
    frameUrl: (i) => `${frameBaseUrl}/frame_${String(i + 1).padStart(3, '0')}.webp`,
    nativeWidth: data.native_width,
    nativeHeight: data.native_height,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [frameCount, frameBaseUrl, data.native_width, data.native_height])

  // Build the piecewise play/hold curve: frame advances freely between
  // chapters, then goes flat (frozen) across each chapter's own
  // [holdStart, holdEnd] range at its hold_frame. useTransform interpolates
  // linearly between each (input, output) breakpoint pair, so a repeated
  // output value across two consecutive inputs is exactly a hold.
  //
  // Memoized: useTransform must receive the SAME array references across
  // renders. Rebuilding fresh arrays inline (as this originally did) makes
  // useTransform hand back a new MotionValue instance every render, which
  // silently breaks FrameSequenceCanvas's useMotionValueEvent subscription
  // (found via real headless-Chrome testing -- the canvas rendered nothing
  // during a hold because the 'change' event it needed never fired against
  // the stale, orphaned prior instance).
  const { inputBreakpoints, outputBreakpoints } = useMemo(() => {
    const lastFrame = Math.max(frameCount - 1, 1)
    const input = [0]
    const output = [0]
    let prevFrame = 0
    for (const ch of chapters) {
      const frameFrac = (ch.hold_frame ?? prevFrame) / lastFrame
      input.push(ch.holdStart, ch.holdEnd)
      output.push(frameFrac, frameFrac)
      prevFrame = ch.hold_frame ?? prevFrame
    }
    if (input[input.length - 1] < 1) {
      input.push(1)
      output.push(output[output.length - 1])
    }
    return { inputBreakpoints: input, outputBreakpoints: output }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameCount, JSON.stringify(chapters)])

  const effectiveProgress = useTransform(scrollYProgress, inputBreakpoints, outputBreakpoints)

  // The inner sticky viewport only stays pinned while scrollY is within
  // [top, top + height - 100vh] -- past that the CSS `position: sticky`
  // detaches and the section scrolls away normally (an inherent property
  // of the tall-container-plus-sticky-child pattern, same as
  // beit-al-fakhar's Hero). In useScroll's own 0-1 progress terms that's
  // [0, 1 - 100/scroll_range_vh] -- a fixed ratio, independent of actual
  // viewport pixel size. Any chapter hold placed after this point will
  // render mid-unpin instead of fully pinned (found via real headless-
  // Chrome testing, 2026-07-24) -- warn in dev rather than fail silently.
  const scrollRangeVh = data.scroll_range_vh ?? 320
  const pinnedZoneEnd = 1 - 100 / scrollRangeVh
  if (import.meta.env?.DEV) {
    for (const ch of chapters) {
      if (ch.holdEnd > pinnedZoneEnd) {
        // eslint-disable-next-line no-console
        console.warn(
          `StoryExperienceSection: chapter "${ch.id}" holdEnd=${ch.holdEnd} is past the ` +
          `pinned-zone end (${pinnedZoneEnd.toFixed(3)}) for scroll_range_vh=${scrollRangeVh} -- ` +
          `it will render while the section is already unpinning. Lower holdEnd or raise scroll_range_vh.`
        )
      }
    }
  }

  // Guard placed after every hook call above (never before) -- hooks must
  // run in the same order on every render, so this can't be an early return
  // ahead of useMemo/useTransform.
  if (!frameBaseUrl || frameCount === 0) return null

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
        <FrameSequenceCanvas assets={assets} progress={effectiveProgress} />

        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.55) 100%)',
        }} />

        {chapters.map((chapter) => (
          <ChapterOverlay key={chapter.id} chapter={chapter} scrollYProgress={scrollYProgress} accent={accent} />
        ))}
      </div>
    </section>
  )
}
