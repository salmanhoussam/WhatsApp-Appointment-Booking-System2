---
name: frame-sequence-canvas
description: Scroll-scrubbed real-video technique — preload extracted video frames as images and paint whichever one matches scroll position on a <canvas>, instead of seeking a <video> element's currentTime (which stutters on seek). Use for cinematic Hero/product walkthroughs that must scrub in lockstep with scroll using real footage.
user-invocable: true
---

# Frame Sequence Canvas — Scroll-Scrubbed Real Video

## When to Use This

A Hero (or any section) needs **real footage that scrubs in lockstep with scroll position** — the Apple-product-page effect, where scrolling forward plays the video forward and scrolling back plays it back, frame-accurately, with zero stutter.

This is a different requirement from `rules/frontend/animations.md` §4's "Cinematic Video Experience" (autoplay background video + chapter/timestamp buttons that jump `currentTime`). That guidance is still correct for its own case — a product-detail page where the video just plays and the user can jump to a labeled moment. Use *this* skill only when scroll itself must drive playback continuously.

## Why Not `<video>.currentTime`

Seeking a `<video>` element is bounded by the source's keyframe interval — the decoder can only start cleanly at a keyframe, not an arbitrary timestamp. Scroll-speed seeking (many seeks per second, in either direction) stutters badly and inconsistently across browsers and devices. This was tried and rejected on this exact project (see Known Limitations) — the first instinct here was actually to paper over bad footage with AI-generated still frames, which was the wrong fix for the wrong problem. The right fix was always this technique.

## The Technique — 5 Files, One Concern Each

Reference implementation: `frontend/src/pages/beit-al-fakhar/sections/hero/`. Each file has exactly one job, so any one of them can change without touching the others:

1. **`walkthroughAssets.js`** — the *only* file that knows frame URLs, frame count, and native frame size. Swapping footage (different video, more/fewer frames, different numbering) means editing this file only.
2. **`useFrameSequence.js`** — a pure preload hook. Decodes every frame as a real `<img>` element up front (`img.decoding = 'async'`), exposes `imagesRef`, `loadedCount`, `isReady`. Zero knowledge of scroll or canvas — reusable for any future frame sequence, not just a Hero.
3. **`FrameSequenceCanvas.jsx`** — the renderer. Maps progress to a frame index (`index = round(clamp(progress, 0, 1) * (frameCount - 1))`), then draws that frame onto a `<canvas>` with manual "cover" crop math (source rect computed from the canvas's aspect ratio vs. the frame's native aspect ratio, so it fills the box without distortion — canvas has no `object-fit`). If the exact frame isn't loaded yet, it searches outward for the nearest already-loaded frame instead of leaving a blank flash. Resize handling is DPR-aware and redraws the last-shown frame instead of blanking.
4. **`useHeroSequence.js`** — derives the *overlay* motion values (title/CTA fade-out, final hand-off dissolve into the next section) from `scrollYProgress`. Kept separate from frame selection because real footage already supplies its own motion — the overlay only needs a few extra keyframes layered on top.
5. **`HeroExperience.jsx`** — the orchestrator. Owns a single `useScroll({ target, offset: ['start start', 'end start'] })` over a tall pinned section (`position: sticky` inner container), and composes the pieces above.

## Precondition — Extracting Frames

The frame sequence is prepared once, offline, from a real source video:

```bash
ffmpeg -i source.mp4 -vf "fps=3.2,scale=640:-1" -q:v 4 "frame_%03d.jpg"
```

`fps=3.2` (not the source framerate) is deliberate — scroll-driven playback doesn't need real video framerate; a few frames per second of source footage is plenty smooth once scroll interpolates between them. Convert to WebP for smaller payload, then upload as a flat numbered sequence (`frame_001.webp`, `frame_002.webp`, ...) to storage. Re-run this recipe rather than rediscovering it per-tenant.

## Integration Constraints

This uses `useScroll`/`useTransform`/`useMotionValueEvent` — the FM12 rule applies (`.claude/rules/smar-tenant.md` §"CRITICAL — FM12 Rule"): any component using Framer Motion scroll hooks must only ever be mounted from a lazy-loaded route, never imported directly at chunk-load time, or it crashes blank in React 19 StrictMode.

## Known Limitations

- This proves the *architecture* — output quality is bounded by source footage quality, which this pattern does not and cannot fix. Low-resolution or poorly-lit source video still looks low-resolution and poorly-lit, just smoothly scrubbable.
- Not for a simple autoplay background loop with no scroll-scrubbing requirement — that's the simpler, still-correct case in `rules/frontend/animations.md` §4.
- Preloading N frames as full `<img>` elements has a real payload cost (grows with frame count × resolution) — keep frame count and dimensions as low as the desired smoothness allows, per the extraction recipe above.

## Reference Implementation

- `frontend/src/pages/beit-al-fakhar/sections/hero/walkthroughAssets.js`
- `frontend/src/pages/beit-al-fakhar/sections/hero/useFrameSequence.js`
- `frontend/src/pages/beit-al-fakhar/sections/hero/FrameSequenceCanvas.jsx`
- `frontend/src/pages/beit-al-fakhar/sections/hero/useHeroSequence.js`
- `frontend/src/pages/beit-al-fakhar/sections/hero/HeroExperience.jsx`
