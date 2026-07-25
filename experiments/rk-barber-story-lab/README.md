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

## Round 3 (2026-07-24, later still) — the lab validated the engine, not the UX

Salman's real correction after round 2: comparing rendering *techniques* (canvas vs. native vs.
hybrid) validates that the **engine** works — it doesn't validate the **experience** we're trying
to build. Two concrete, unresolved issues remained, and he asked for investigation before any more
technique variants:

1. **Visual clarity / frame density** — round 2's 120-frame (6fps) set was a guess, not validated
   against this footage's actual motion.
2. **Story pacing** — every technique so far binds displayed progress **directly** to scroll
   position (`scrub: true`-equivalent, in GSAP's own vocabulary) — perceived playback speed is
   whatever speed the user happens to scroll at, which doesn't read as "watching a sequence," it
   reads as scrubbing one.

### 1. Frame density — measured, not re-guessed

Extracted a 15fps reference set (300 frames, the closest to "ground truth continuous motion"
practical to work with) and computed real mean-absolute pixel difference between every consecutive
pair (`evidence/measure_motion.py`, full output in `evidence/motion_analysis_output.txt`). Result:
motion is real and substantial (grayscale delta up to 21-24 in the busiest seconds), and it is
**not uniform** across the clip (as low as 1.4 in the first second, over 15x higher by the closing
shot). Simulating what each candidate sampling density actually captures:

| Density | Per-sample motion jump (mean) | vs. true-continuity baseline (11.31) |
|---|---|---|
| 6fps (120 frames, round 2's guess) | 28.02 | ~2.5x |
| 10fps (200 frames) | 16.87 | ~1.5x |
| **12fps (240 frames, chosen)** | **14.05** | **~1.24x** |

12fps is now the evidence-backed density for this footage (real payload: 4.4MB vs. 2.3MB at 6fps —
a real, honest cost, not free). The round-2 120-frame set has been removed from `assets/` since
it's a superseded guess, not a kept alternative. Open question, not resolved this pass: motion is
uneven enough that an *adaptive* density (denser only during the busy segments) would likely beat a
uniform 12fps for the same total payload — flagged, not built.

### 2. Story pacing — direct scrub vs. timeline-driven, implemented and verified

Researched the real, named distinction (GSAP's own vocabulary, not invented here): `scrub: true` is
instant 1:1 scroll-to-progress binding — what every technique tested through round 2 does, canvas
and native alike. `scrub: <seconds>` decouples them — scroll sets a *target*, and a persistent
animation loop eases the *displayed* value toward that target over a fixed real time constant,
independent of how fast or unevenly the user scrolls. Sources below.

Implemented this for real as a new technique, `canvasTimeline` — not a rendering change, an input-
model change: a `requestAnimationFrame` loop runs continuously, exponentially smoothing
`currentProgress` toward `targetProgress` (τ≈0.5s, in GSAP's own documented "cinematic reveal"
range of 0.5-1s) — the canvas draw reads `currentProgress`, never raw scroll position directly.

**Verified, not assumed**: instrumented `window.__timelineDebug` and captured real samples after a
single scroll jump followed by **zero further scroll input**:

```
currentP=0.0873  targetP=0.6998  diff=0.6126
currentP=0.1983  targetP=0.6998  diff=0.5015
...
currentP=0.6082  targetP=0.6998  diff=0.0916   (≈1s later, still closing the gap)
```

`currentP` keeps climbing toward the target for the better part of a second with **no scroll
happening at all** — real, objective proof this is genuinely decoupled from scroll velocity, not a
relabeled direct scrub. Real, honest cost found at the same time: this mode draws continuously
(72 draw calls just reaching one chapter, vs. a handful for direct-scrub's event-driven draws) —
a real performance/battery tradeoff for the smoother feel, not a free upgrade.

Try it: `?source=genuine&technique=canvasTimeline` vs. `?source=genuine&technique=canvas` — same
footage, same density, the only variable is whether progress is scrubbed directly or eased through
a timeline.

### Still not decided here

Whether `canvasTimeline`'s eased feel is actually the "cinematic sequence" feel being aimed for is
a real, human judgment call — the mechanism is now verified to work as designed; whether it's the
*right* design is for watching it live, not for this document to assert. τ (currently 0.5s) is a
starting point from GSAP's own documented range, not tuned against this specific footage yet.

### Sources

- [Scrub | GSAP Scroll — Annnimate](https://annnimate.com/learn/scroll/scrub)
- [ScrollTrigger | GSAP Docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [Easing on ScrollTrigger animations for scrub:true — GSAP forums](https://gsap.com/community/forums/topic/28649-easing-on-scrolltrigger-animations-for-scrub-true/)
- [Animate elements on scroll with Scroll-driven animations — Chrome for Developers](https://developer.chrome.com/docs/css-ui/scroll-driven-animations)

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

## Round 4 (2026-07-25) — product hotspot labels over the real shelf

Salman reviewed Round 3's result ("في تحسن واضح" — clear improvement) and asked for a further,
real feature on top of it: name labels over the actual products on the shelf, revealed as the user
scrolls through the story, matching a reference mockup he designed himself for this tenant (a
static shelf-photo layout with icon+label callouts). He annotated a real screenshot with red lines
over the products he wanted labeled and gave the exact list, top-to-bottom/left-to-right: سبراي,
واكس, ريحة, زيت الشعر, شامبو, القوائم, زيت للعينين والشعر.

Confirmed with him directly before building (two real ambiguities, not assumed): the mockup is his
own reference design for this tenant, not existing code to match pixel-for-pixel; and the labels
belong inside the Story Experience itself (as an extension of the existing `products` chapter), not
a separate new section.

**What changed:**
- The `products` chapter's hold moved from `timeSec: 9.0` (frame_109, a wide angle that happens to
  catch the barber pole, not a usable product shot) to `timeSec: 12.0` (frame_144, a close 4-row
  shelf shot that actually shows every product Salman pointed at) — a deliberate, real trade
  documented in `script.js`'s own comment, not a silent change.
- A new `productLabels` array on that chapter: 7 entries, each `{ label_ar, xPct, yPct }`. The
  `xPct`/`yPct` values were read directly off `frame_144.webp` by viewing the real frame and mapping
  Salman's named order onto the actual visible product clusters (tall blue spray canisters →
  top-left, gold-boxed set → top-right, pink/red small boxes → row 2, black bottles + pink
  Schwarzkopf-style bottles → row 3, black bottle cluster + white dropper bottles → row 4) — not
  guessed off a thumbnail description.
- New `.hotspot-label` (dot + pill badge) rendered per entry, reusing the exact same
  hold/fade-opacity mechanism every other chapter already uses (`updateOverlays`) — no new opacity
  logic. When a chapter has `productLabels`, its big centered heading/CTA block switches to a small
  top caption + bottom-pinned CTA (`.has-hotspots` class) so the seven labels have room across the
  frame instead of competing with one giant centered block.

**Verified, not assumed** (real headless-Chrome + CDP, 430×932 @2x mobile viewport, matching
Salman's own note that this footage is mobile-framed): scrolled to the real hold progress
(`p=0.43`, inside `holdStart 0.36–holdEnd 0.50`), captured a real screenshot — all seven labels land
on their real, correct product clusters (see `products_hotspot_check2.png`, not committed here,
regenerate via the CDP script pattern already established this session). Zero console errors.

**Not done / explicitly deferred**, matching Salman's own scope: no linking labels to real
category/item pages yet ("مستقبلاً فينا نعملهم دغري لينك على الآيتمز والكاتيجوري" — his own words,
future work); this stays lab-only, not wired into `scripts/data/hr/page_content.json` — same
Design Laboratory Protocol gate as every prior round, his live review decides if/when it goes back
to Tenant OS.

## Round 5 (2026-07-25) — a genuinely different footage type: AI-generated, pre-captioned

Salman supplied a third, unrelated video (`storyboard.mp4`, downloaded from Supabase Storage,
`hr/pages/home/try3/Storyboard 1.mp4`) and asked for "a new experience for it" — explicitly framed
as wanting the *methodology* applied again, not a specific technique assumed in advance ("ما بعرف،
انت شوف والعبلي شي حلو على ذوقك").

**Investigated before building anything** (same discipline as every prior round): extracted a 1fps
preview (20 frames) and viewed them directly. Real findings, confirmed by looking, not guessed from
the filename:
- Real portrait 1080×1920, 20.25s, already mobile-native — no crop needed (unlike `genuine.mp4`,
  which needed cropping from a wider aspect).
- A small "AI" watermark visible in the corner of every frame — flagged to Salman before building
  anything, since it changes the right technique; he confirmed it's intentional ("AI-generated
  بقصد").
- The video is **4 distinct, mostly-static ~5s scenes**, each with its own animated caption already
  burned into the pixels: "Step Inside" (0-5s) → "Grooming Musts" (5-10s) → "Where Magic Happens"
  (10-15s) → "Your Chair Awaits" (15-20s).

**Why frame-sequence was the wrong tool here, and hybrid was the right one — not assumed, reasoned
from the real content**: frame-sequence + scroll-scrub exists to solve continuous, uncaptioned
handheld camera motion (rounds 1-4's real problem). This footage is the opposite — discrete,
near-static, already-captioned scenes. Re-running rounds 1-4's technique here would mean (a)
extracting frames and losing real video quality/bitrate for no reason, since there's barely any
motion to sample, and (b) needing our own overlay chapter titles, which would visually duplicate/
clash with the captions already burned into the video. The already-built, already-debugged
`hybrid` technique (native `<video>` plays forward for real between holds, pauses+snaps exactly on
a chapter) fits this footage's real shape with zero new rendering code — reused as-is, only new
`SOURCES.storyboard` chapter data.

**What was added:** `SOURCES.storyboard` (`script.js`) — 4 chapters at the real scene midpoints
(t=2.0/7.0/12.0/18.5s). The first three chapters have no `title_ar` at all (`buildOverlayDom` now
guards against rendering an empty `<h2>` when a chapter has none) — the video's own caption already
carries that beat, adding ours would be redundant. Only the last chapter adds real, useful value the
video can't provide on its own: an actual "جاهز لإطلالتك الجديدة؟" + **Book Now** CTA button.
`storyboard.mp4` was re-encoded 1080×1920 → 810×1440 (crf 23) for a reasonable web payload (30MB →
4.3MB) without touching the AI-generated content itself.

**Verified, not assumed**: real headless-Chrome + CDP, 430×932 @2x mobile viewport, scrolled through
all 4 hold points, real screenshots at each (`sb_entrance.png`, `sb_products.png`,
`sb_stations.png`, `sb_booking.png`, not committed — regenerate via the same CDP script pattern),
zero console errors. Each hold shows the real captioned scene at full quality with no overlay
clutter; the booking hold shows the CTA sitting cleanly above the video's own "Your Chair Awaits"
caption, not fighting it.

**Not done / explicitly deferred**: no product-hotspot labels on this source (would duplicate the
video's own "Grooming Musts" caption for no real benefit — a judgment call, flagged here rather than
silently decided); not wired into production, same Design Laboratory Protocol gate as every prior
round.

## Round 6 (2026-07-25) — corrected: frame images, not native video, and a real mobile bug

Round 5 shipped to production using the `hybrid` technique (real `<video>` playing between
holds), reasoned from the footage's own shape (discrete, already-captioned scenes). Salman's
direct correction, immediately after seeing it live: **"أنا باللاب اللي عملناه اللي أعجبني وطلبته
Native Video. أنت عملتلي Hybrid... بدي صور الفريمات، and scroll يعني ينعرض بس صور، ما بدي
فيديوهات"** — what he actually approved in the lab and asked for was frame images on scroll, no
`<video>` playback anywhere, in any section. My technical reasoning for `hybrid` wasn't wrong on
its own terms, but it wasn't what he'd asked for — a real instance of Architecture Authority
(`rules/engineering-manager-mode.md`: *"The user owns all architectural decisions... Never
silently replace the architecture with your own preferences"*) being the thing that actually
mattered here, not which technique is more "correct" for the footage shape in the abstract.

**Fixed for real, not just reverted**: extracted real frames from `storyboard.mp4` (243 frames,
480×854 WebP, 12fps — same evidence-based density methodology as round 3's `measure_motion.py`,
adapted for this footage's real shape: 4 near-static scenes with 3 hard scene-cut jumps that no
sampling density can smooth, excluding those cuts brings within-scene motion to ~1.2x true
continuity at 12fps, matching round 3's own threshold, not a re-guess). `SOURCES.storyboard` now
has `frameDir`/`frameCount` like `genuine` does; the `canvas`/`canvasTimeline` techniques that were
hidden for this source in round 5 (no frames existed then) are real options again.

**A second real bug, caught in the same message**: "شغلة تانية، على الموبايل مش ضابطة الصفحة
كلها" — on a real phone, the section wasn't filling the screen. Root cause: `100vh` is calculated
against the viewport with the mobile browser's address bar assumed *hidden* — on a real device
with the address bar visible, the true visible area is smaller than `100vh`, so a sticky child
sized at `100vh` overflows what's actually visible. This is exactly the kind of bug headless
Chrome's device-metrics emulation cannot catch (headless has no address bar to show/hide, so `vh`
and `svh` are identical there) — a real gap in this whole session's verification method, not
something any of the many headless screenshots this session could have caught. Fixed in production
(`StoryExperienceSection.jsx`) using `svh` (small viewport height — the guaranteed-smallest real
viewport size) for both the outer scroll-distance height and the inner sticky height, keeping the
`pinnedZoneEnd` ratio between them intact.

## A real bug found and fixed *during* this lab (worth keeping on record)

The hybrid technique's first draft had a genuine self-triggering feedback loop: its `timeupdate`
handler paused the video and re-set `currentTime` to clamp it exactly on target, but setting
`currentTime` itself fires another `timeupdate` event that still satisfied the same trigger
condition — re-entering forever until interrupted. Caught via this lab's own instrumentation
(`pauseCalls` hit 50,000+ within under 2 seconds of scrolling). Fixed by removing the event
listener *before* the clamping `currentTime` assignment, not after. Left in as a real example of
exactly the kind of thing a design lab is supposed to catch before it reaches production.
