/**
 * StoryExperienceSection — Dynamic Section Renderer
 *
 * Two rendering modes, chosen by which data shape is present:
 *
 * 1. Frame-sequence mode (`frame_base_url` + `frame_count`): the ORIGINAL
 *    mode, still used when real footage needs true scroll-scrubbed frame
 *    control. data: {
 *      frame_base_url, frame_count, native_width, native_height, scroll_range_vh,
 *      chapters: [{ id, holdStart, holdEnd, hold_frame, title_ar, subtitle_ar,
 *                   cta_label_ar, cta_target }]
 *    }
 *
 * 2. Native-video mode (`video_url`): added 2026-07-25 after the RK Barber
 *    Story Experience lab (`experiments/rk-barber-story-lab/`, rounds 1-5)
 *    found real footage that's the OPPOSITE shape -- discrete, mostly-static,
 *    already-captioned scenes (an AI-generated walkthrough) rather than
 *    continuous handheld motion. Frame-sequence exists to solve continuous
 *    motion; for discrete scenes it would mean extracting frames and losing
 *    real video quality for no reason. This mode instead plays the real
 *    <video> forward between chapters and pauses+snaps on each chapter's
 *    own [holdStart, holdEnd) scroll range -- the lab's "hybrid" technique,
 *    ported as-is (ported, not reinvented -- ~20 lines of real, already-
 *    debugged zone-transition logic, ../../experiments/rk-barber-story-lab/
 *    script.js's makeHybridTechnique). data: {
 *      video_url, video_duration_sec, scroll_range_vh,
 *      chapters: [{ id, timeSec, holdStart, holdEnd, title_ar?, subtitle_ar?,
 *                   cta_label_ar?, cta_target? }]
 *    }
 *    Salman's explicit call after watching the lab live: chapters may omit
 *    title_ar entirely when the video's own baked-in caption already carries
 *    that beat -- ChapterOverlay below already renders nothing for a missing
 *    title_ar, so no extra guard is needed here.
 *
 * Both modes share the exact same ChapterOverlay (fade-in/hold/fade-out
 * driven by [holdStart, holdEnd], nothing else) and the exact same pinned-
 * zone dev warning below -- the only real difference between the two modes
 * is what paints the pixels behind the overlays.
 *
 * chapter title/subtitle/cta_label are plain strings, not yet wired to
 * EditableRegion -- no real Admin PATCH endpoint exists for story_experience
 * chapters yet. Wiring it without one would be a click-to-edit affordance
 * that silently does nothing, so it's deferred, not half-built.
 */
import { useMemo, useRef } from 'react'
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion'
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
      {chapter.title_ar && (
        <h3 style={{
          margin: '0 0 18px', fontFamily: "'Cairo', sans-serif",
          fontSize: 'clamp(34px, 7vw, 68px)', fontWeight: 900, color: '#fff',
          letterSpacing: '0.01em', lineHeight: 1.15,
          textShadow: '0 4px 32px rgba(0,0,0,0.65)',
        }}>
          {chapter.title_ar}
        </h3>
      )}
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

// Native-video mode's play/hold engine -- ported from the lab's
// makeHybridTechnique (experiments/rk-barber-story-lab/script.js), same
// zone-transition logic, just driven by a Framer Motion scrollYProgress
// subscription instead of a raw `scroll` DOM listener. Always called (hook
// order must stay identical across renders); it's a real no-op whenever
// `chapters` is empty, which is exactly what frame-sequence mode passes.
function useHybridVideoPlayback(videoRef, scrollYProgress, chapters, videoDuration) {
  const currentZoneRef = useRef(null)
  const timeUpdateHandlerRef = useRef(null)

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const video = videoRef.current
    if (!video || chapters.length === 0) return

    let zone = null
    for (const ch of chapters) {
      if (p >= ch.holdStart && p <= ch.holdEnd) { zone = { kind: 'hold', chapter: ch }; break }
    }
    if (!zone) {
      for (let i = 0; i < chapters.length; i += 1) {
        if (p < chapters[i].holdStart) {
          const prevTime = i === 0 ? 0 : chapters[i - 1].timeSec
          zone = { kind: 'play', fromTime: prevTime, toTime: chapters[i].timeSec, index: i }
          break
        }
      }
    }
    if (!zone) {
      const last = chapters[chapters.length - 1]
      zone = { kind: 'play', fromTime: last?.timeSec ?? 0, toTime: videoDuration, index: chapters.length }
    }

    const zoneKey = zone.kind === 'hold' ? `hold:${zone.chapter.id}` : `play:${zone.index}`
    if (zoneKey === currentZoneRef.current) return
    currentZoneRef.current = zoneKey

    if (zone.kind === 'hold') {
      video.pause()
      video.currentTime = zone.chapter.timeSec
    } else {
      if (video.currentTime < zone.fromTime - 0.05 || video.currentTime > zone.toTime + 0.05) {
        video.currentTime = zone.fromTime
      }
      video.playbackRate = 1
      video.play().catch(() => {})
      const targetTime = zone.toTime
      if (timeUpdateHandlerRef.current) video.removeEventListener('timeupdate', timeUpdateHandlerRef.current)
      const handler = () => {
        if (video.currentTime >= targetTime - 0.03) {
          video.removeEventListener('timeupdate', handler)
          timeUpdateHandlerRef.current = null
          video.pause()
          video.currentTime = targetTime
        }
      }
      timeUpdateHandlerRef.current = handler
      video.addEventListener('timeupdate', handler)
    }
  })
}

export default function StoryExperienceSection({ data, accent }) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  const isVideoMode = !!data.video_url
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
  // Frame-sequence mode only -- harmless no-op work in video mode (chapters
  // there lack hold_frame, so every breakpoint just collapses to 0), kept
  // unconditional so hook order never depends on which mode is active.
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

  useHybridVideoPlayback(videoRef, scrollYProgress, isVideoMode ? chapters : [], data.video_duration_sec ?? 0)

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
  // ahead of useMemo/useTransform/useMotionValueEvent.
  if (!isVideoMode && (!frameBaseUrl || frameCount === 0)) return null
  if (isVideoMode && !data.video_url) return null

  return (
    <section
      ref={containerRef}
      style={{
        position: 'relative',
        // `svh` (small viewport height), not `vh` -- 2026-07-25, real mobile
        // bug: `vh` is calculated against the viewport with the browser's
        // address bar HIDDEN, so on a real phone (address bar visible,
        // shrinking the true visible area) a plain `100vh` sticky child is
        // taller than what's actually visible, cutting the section off /
        // leaving it not filling the screen. `svh` uses the smallest-ever
        // viewport size instead, so it never overshoots what's really
        // visible. Both the outer scroll-distance height and the inner
        // sticky height must use the SAME unit -- pinnedZoneEnd above is a
        // ratio between them (`1 - 100/scrollRangeVh`), and mixing vh/svh
        // would silently throw that ratio off on exactly the devices this
        // is fixing for.
        height: `${data.scroll_range_vh ?? 320}svh`,
        marginLeft: -24, marginRight: -24, marginBottom: 56,
      }}
    >
      <div style={{ position: 'sticky', top: 0, height: '100svh', overflow: 'hidden' }}>
        {isVideoMode ? (
          <video
            ref={videoRef}
            src={data.video_url}
            muted playsInline preload="auto"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <FrameSequenceCanvas assets={assets} progress={effectiveProgress} />
        )}

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
