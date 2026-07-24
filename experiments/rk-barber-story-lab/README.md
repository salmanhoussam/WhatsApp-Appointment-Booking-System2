# RK Barber Story Experience — Design Lab

**Status: experiment, not production. Nothing here is wired into Tenant OS, the Editing Engine,
or any Dashboard/API.** Built per Salman's explicit instruction (2026-07-24): before investing
further in Story Experience *inside* Tenant OS, answer the UX/rendering-technique question in
total isolation — no Section System, no Schema, no Registry, no architecture constraints — so a
new experience isn't prematurely bent to fit an architecture that may not suit it.

## Round 2 (2026-07-24, later same day) — new footage, same methodology

Round 1 (below) concluded that none of the 4 rendering techniques were the real problem — the
original footage (a casual, undeliberate phone pan) was the ceiling. Salman then supplied new,
deliberately re-edited footage (`new-matirial/barbershop_genuine.mp4`, edited via CapCut — calmer
camera movement, better lighting, real distinct beats: entrance → waiting area → products →
service area → a well-lit arch/counter closing shot) and asked to repeat the same rigorous
process, not skip straight back to production, this time also checking on a mobile viewport since
the footage is itself framed for mobile (portrait, exported inside a blurred-fill landscape
container — cropped clean via `ffmpeg -vf "crop=405:720:438:0"` for the lab).

**What changed in the lab**: `index.html`/`script.js` now support a **footage source selector**
alongside the technique selector (`?source=original|genuine&technique=canvas|nativeSeek|hybrid`),
so both rounds stay comparable side by side rather than round 2 replacing round 1's evidence.
Also fixed a real oversight from round 1: Cairo was referenced in CSS but never actually loaded —
added a real Google Fonts `<link>` this round, so Arabic text now renders in the correct typeface
instead of a silent system fallback.

**Real result**: tested `genuine` footage across all 3 real techniques (canvas frame-sequence,
native continuous seek, hybrid play/pause) at both desktop (1280×800) and mobile (390×844, 2x DPR)
viewports — zero console errors on any combination, real screenshots confirm calm, well-lit,
readable results at every chapter (entrance / products / service / booking), Cairo rendering
correctly. Both canvas and hybrid produced a genuinely premium-feeling result on mobile — a clear,
visible improvement over round 1, and this time the improvement is coming from the footage itself,
not a rendering trick, matching round 1's own conclusion.

New real content mapping for `genuine.mp4` (20s, established by direct frame review, distinct from
round 1's timing): 0-3s entrance (door), 4-6s waiting area, 7-10s products/barber pole, 11-14s
more shelf + chair, 15-19s arch/counter + chair (closing shot) — chapters retimed accordingly in
`script.js`'s `SOURCES.genuine.chapters`.

**Still not decided here, on purpose**: which single technique (canvas vs. hybrid) and exact
chapter timing to bring back to production is a real choice worth watching live, not read off this
document — same discipline as round 1. What round 2 *does* establish with real evidence: the
footage-suitability problem round 1 identified is fixable with the right source material, and this
new material clears that bar.

---

## Round 1 (original) findings below

## How to run it

```bash
cd experiments/rk-barber-story-lab
python3 -m http.server 8899
# open http://localhost:8899/index.html
```

Pure static files (`index.html`, `style.css`, `script.js`) plus real assets under `assets/`
(the real Video 1 footage, and two pre-extracted WebP frame sets at different densities). No
build step, no npm, no React. A dropdown in the top-left switches between 4 rendering techniques
live, with a real-time stats panel (draw/seek/play/pause call counts, measured fps).

## The 4 techniques compared

| | Technique | Mechanism |
|---|---|---|
| A | Canvas · 77 frames | Current production approach — 3.2fps WebP stills, painted on `<canvas>`, frame index driven by scroll |
| B | Canvas · 230 frames | Same mechanism, 9.5fps — the density validated earlier this session to fix visible frame-skipping on fast pans |
| C | Native `<video>` · continuous seek | Real MP4, `video.currentTime = f(scrollProgress)` on every scroll event — no frames, no canvas |
| D | Hybrid · native play/pause | Real MP4; scroll only *triggers* zone transitions — `video.play()` runs the real decoder forward naturally between chapters, `video.pause()` + a single precise seek snaps to the hold frame. Scroll doesn't scrub continuously; it starts/stops native playback. |

All 4 share the identical HTML/CSS chrome (hero, chapter overlay text, fade timing, chapter
content) — only the "how does the background visual advance" mechanism differs, so the comparison
is apples-to-apples.

## Real findings

### Payload size

| Asset | Size |
|---|---|
| 77-frame WebP set (current production) | 2.4 MB |
| 230-frame WebP set (validated-fix density) | 7.0 MB |
| Real source video (H.264+AAC, full 30fps, 24s, with audio) | 4.9 MB |

The 230-frame still-image set is already **larger than the entire original compressed video** —
a real, concrete cost of the canvas/stills approach that grows linearly with density, while native
video's payload is fixed regardless of how "densely" you need to sample it.

### Operation cost during a real continuous scroll (120-step simulated scroll, ~6s)

| Technique | Draw calls | Seek calls | Play/Pause calls |
|---|---|---|---|
| Canvas · 77 | 42 | 0 | 0 |
| Canvas · 230 | 42 | 0 | 0 |
| Native · continuous seek | 0 | **121** (essentially every scroll tick) | 0 |
| Hybrid · play/pause | 0 | 4 | 4 / 8 |

Canvas techniques only redraw when the target frame index actually changes (this session's earlier
production fix, reused here). Continuous native seeking does real work on *every* scroll event —
by far the most expensive per-tick technique. The hybrid technique does the least total work of
all four, by a wide margin — it treats scroll as a small number of discrete triggers, not a
continuous drive signal.

### Real seek-completion latency (native video, the actual bottleneck the research flagged)

Instrumented `seeking` → `seeked` event timing during a realistic fast-scroll simulation
(continuous seek technique, ~8 scroll updates/sec):

```
51 completed seeks — latency: min=0.0ms, median=0.2ms, p90=54.0ms, max=95.6ms
```

Most seeks resolve near-instantly, but roughly 1 in 10 took 50-95ms on this dev machine — a real,
measurable stall, not a theoretical one. `ffprobe` confirms why: Video 1's own encoding has **25
keyframes across 725 real frames** (~1 keyframe/second). Seeking to a non-keyframe timestamp — most
of the time, on this footage — requires the decoder to reconstruct forward from the last keyframe.
This is exactly the mechanism the research below describes, confirmed against this project's own
real file, not assumed. On a slower/mobile device this would very plausibly be worse, per the same
sources' own explicit warning that backward/arbitrary scrubbing is "inconsistent across devices,"
worst on mobile.

### Visual quality

Native video decode is **visibly sharper** than the WebP stills at the same moment (compare
`assets/frames-230` output against the native `<video>` element rendering the same timestamp) —
expected, since a still image re-compresses a frame independently, while the H.264 stream carries
full temporal-prediction detail. Not a huge gap at these resolutions, but real and visible on close
inspection.

### Browser compatibility

- **Canvas 2D + `<img>` preloading**: universal, has worked in every real browser for over a
  decade. Zero compatibility risk.
- **Native `<video>` + `currentTime` seeking**: universal (HTML5 video itself), but *performance*
  of arbitrary seeking is genuinely device/browser/codec-dependent — this is a real-world quality
  risk, not a support risk.
- **`requestVideoFrameCallback`** (mentioned in Salman's original question, not actually used in
  this lab's hybrid technique — see below): shipped in Chrome/Edge/Safari, expected to reach formal
  Baseline "Widely Available" status ~April 2027, per current web-platform tracking. This lab's
  hybrid technique deliberately uses the older, universally-supported `timeupdate` event instead —
  a more conservative choice, since `requestVideoFrameCallback` doesn't solve the seek-latency
  problem anyway (see below); it's for a different job.

### On `requestVideoFrameCallback` specifically — real research, not assumption

Investigated directly (sources below) before writing any code: `requestVideoFrameCallback` is a
callback for reacting efficiently to frames a video is **already playing or has already sought
to** (useful for syncing canvas painting or analysis to playback) — it does **not** bypass or
shorten keyframe-driven seek latency. Multiple independent sources confirm the underlying fix for
smooth arbitrary seeking is either encoding every frame as a keyframe (impractically large files)
or exactly the "preload frames as bitmaps, paint to canvas" technique this project already built.
Switching to raw `currentTime` scrubbing would very likely be a real regression, not a fix — this
matches the reason the canvas technique was chosen for beit-al-fakhar in the first place, now
re-confirmed rather than re-assumed.

## Which approach produced the best experience, and why

**No single technique wins outright — the real finding is that two different techniques win on
different axes, and the honest answer depends on what's prioritized:**

- **Canvas · 230 frames (B)** is the safest, most predictable choice: universal compatibility,
  zero seek-latency risk (already-decoded bitmaps, no decoder involved at redraw time), and it
  directly fixes the frame-skipping problem that started this whole investigation. Its real cost
  is payload (7MB) and slightly softer image quality.

- **Hybrid native play/pause (D)** produced the smoothest *feeling* motion during actual playback
  segments (real 30fps decode, not 9.5 sampled frames) and the best image quality, at a fraction of
  the payload (4.9MB, one file, no per-density re-extraction ever needed again) and the least
  total work per scroll tick of any technique tested. Its real, honest costs: (1) scroll no longer
  continuously scrubs the video — it triggers segments, which is a **different interaction model**,
  not a strictly worse one, but a real change from "video position is scroll position" to "scroll
  starts/stops the story"; (2) backward scrolling falls back to a hard seek (no reverse playback
  exists in any browser), so backward motion doesn't get native playback's smoothness benefit;
  (3) playback speed during a "play" segment isn't scroll-speed-synced — it plays at a fixed real
  rate once triggered, which can feel decoupled from an unusually fast or slow scroll gesture.

- **Native continuous seek (C)** is the one real recommendation against: it inherits video's real
  seek-latency cost (measured, not assumed) on every single scroll tick, for no corresponding
  benefit over the hybrid approach — the hybrid gets native video's quality and payload advantages
  *without* paying the continuous-seek latency cost. There's no real scenario where C beats D.

**My recommendation, stated as a recommendation, not a decision**: the hybrid approach (D) is
worth taking seriously as a real production candidate specifically *because* it changes the
question from "how many frames do we need" to "do we need frames at all" — but it requires an
explicit, separate decision about whether the changed interaction model (segment-triggered, not
continuously-scrubbed) still reads as "scroll-driven" enough for this product's intent. That's a
real UX judgment call, best made watching it live rather than from this document — the lab is
running at the path above for exactly that reason.

## Should the current Story Experience engine evolve, be replaced, or stay as-is?

**Not decided here — that's explicitly the next question, only after this experiment is reviewed
live, per Salman's own framing ("إذا نجحت التجربة، بعدها نسأل: كيف نرجعها إلى Tenant OS؟").** What
this lab does establish with real evidence:

- The canvas engine does not need to be discarded — Technique B proves it already solves the
  reported stutter, with zero architecture risk, if a fast, safe fix is what's wanted.
- The hybrid technique is real, working, and measurably cheaper/sharper — not a hypothetical.
  Bringing it back into Tenant OS would mean a real architecture conversation (a new
  `story_experience` rendering mode, not sourced from a `frame_base_url` + `frame_count` but from
  a single video URL + chapter timestamps) — a bigger change than swapping a frame count, deferred
  intentionally until the UX itself is confirmed worth it.
- Nothing here should be copy-pasted directly into production — this is vanilla JS with no
  Tenant-OS conventions (no `EditableRegion`, no `SectionType`, no multi-tenant scoping); it's a
  answer to "which technique," not a drop-in replacement for `StoryExperienceSection.jsx`.

## Sources

- [The secrets for an optimized scroll-based HTML5 video](https://blog.yoanngueny.com/the-secrets-for-an-optimized-scroll-based-html5-video/)
- [Scrubbing videos using JavaScript · Muffin Man](https://muffinman.io/blog/scrubbing-videos-using-javascript/)
- [Perform efficient per-video-frame operations — web.dev](https://web.dev/articles/requestvideoframecallback-rvfc)
- [HTMLVideoElement.requestVideoFrameCallback() — MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)
- [Web platform features explorer — requestVideoFrameCallback()](https://web-platform-dx.github.io/web-features-explorer/features/request-video-frame-callback/)

## A real bug found and fixed *during* this lab (worth keeping on record)

The hybrid technique's first draft had a genuine self-triggering feedback loop: its `timeupdate`
handler paused the video and re-set `currentTime` to clamp it exactly on target, but setting
`currentTime` itself fires another `timeupdate` event that still satisfied the same trigger
condition — re-entering forever until interrupted. Caught via this lab's own instrumentation
(`pauseCalls` hit 50,000+ within under 2 seconds of scrolling). Fixed by removing the event
listener *before* the clamping `currentTime` assignment, not after. Left in as a real example of
exactly the kind of thing a design lab is supposed to catch before it reaches production.
