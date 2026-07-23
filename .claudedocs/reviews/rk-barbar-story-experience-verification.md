# RK Barber Shop — "Story Experience" Verification

Follow-up to `.claudedocs/reviews/rk-barbar-verification.md` (closed 2026-07-23) — a new,
independent Review per this project's immutability rule, not an edit to the closed one.

**Tenant:** slug `hr` — **Date:** 2026-07-24 — **Status:** Built and verified with real evidence.

## 1. What Made This Different

The day after `video_story` shipped (a simple sequential `<video>` block for Video 1 and Video 2),
Salman reviewed the real output and pushed further: Video 1 specifically ("جولة داخل المحل," the
24.2s casual shop tour) deserved to *lead the page*, not just play in a box. He asked for the same
real, already-proven scroll-driven frame-sequence technique built for beit-al-fakhar's Hero, with
"chapters" — overlay text/CTA blocks that fade in/out as the user scrolls, timed against real
footage content he'd watched frame-by-frame himself.

## 2. Confirmed Findings

**Real per-second content mapping, from Salman watching the actual footage** (not guessed):
0-6s door opens/camera approaches, 6-12s hair-care product shelf, 12-16s mostly filler with the
mirror appearing ~15s, 16-20s transition, 20-24.16s chair + more products (final frames). This
replaced an earlier, provisional even-thirds chapter split with real content-accurate timing.

**Shared rendering engine, extracted and reused, not duplicated**: `useFrameSequence.js` and
`FrameSequenceCanvas.jsx` (confirmed generic — props-driven, zero beit-al-fakhar-specific
hardcoding) moved from `frontend/src/pages/beit-al-fakhar/sections/hero/` to
`frontend/src/components/frame-sequence/`, with beit-al-fakhar's own `HeroExperience.jsx` updated
to import from the new shared location — one line changed. Confirmed via a real regression check:
`localhost:5173/beit-al-fakhar/home` still renders its Hero identically (real screenshot, real
canvas present, zero console errors) after the move.

**New `story_experience` SectionType, registered end-to-end**: `app/schemas/page_content.py`
enum, `frontend/src/components/dynamic-sections/StoryExperienceSection.jsx` (new, data-driven,
follows the existing sibling convention), `dynamic-sections/index.js` export,
`DynamicPage.jsx`'s `SECTION_MAP`. `DynamicPage.jsx` also gained `id={section.id}` on each
rendered section wrapper (previously missing entirely) — needed so chapter CTAs can
`scrollIntoView` a real target section elsewhere on the same page.

**77 real frames extracted and uploaded** — `ffmpeg -vf "fps=3.2,scale=640:-1" -q:v 4` (same
settings as beit-al-fakhar's own real pipeline) against the real, already-downloaded Video 1
(`24.163s`, confirmed via `ffprobe`), converted to WebP (640×1148, matches ffmpeg's real reported
output dimensions), uploaded to `properties/hr/pages/home/story/frame_001.webp` … `frame_077.webp`
— confirmed reachable via real HEAD requests (HTTP 200, correct `Content-Length`) on both the
first and last frame.

**Real DB read after reseeding** `scripts/data/hr/page_content.json`: `hr`'s `config.content.
sections` has 10 sections, `story_experience` at `order=2` with `frame_count=77` and 4 real
chapters (`entrance`, `products`, `mirror`, `booking`) — matches the file exactly, not just the
seed script's own success message.

**Real headless-Chrome + CDP verification** (fresh isolated profile, port 9338,
`--remote-allow-origins=*`): canvas present and painting real frames at every scroll checkpoint
(door-opening frame at the `entrance` chapter, real product-shelf frame at `products`, a
mirror/archway frame at `mirror`, chair-area frame at `booking`) — confirmed via real screenshots,
not assumed from code. All 4 chapters' real text (`RK Barber Shop`/`أهلاً بكم`, `Premium Hair
Products`/`View Products`, `شكلك الجديد يبدأ هون`, `جاهز لإطلالتك الجديدة؟`/`Book Now`) present in
`document.body.innerText`. Clicking the `products` chapter's "View Products" button real-world
`scrollIntoView`'d to `#s_featured` (confirmed via before/after `getBoundingClientRect()` — target
section's top landed at ~0px after the click). Zero console errors/exceptions across the full
verification pass.

**Honest tuning finding, not a defect**: with `scroll_range_vh: 320` and a real viewport
meaningfully shorter than the section's total scroll height, the CSS `position: sticky` pin
releases before `useScroll`'s progress reaches 1.0 — the last chapter (`booking`) can appear
mid-unpin (transitioning out) rather than fully centered-pinned, confirmed via a real screenshot at
progress≈0.9. This is an inherent property of the tall-container-plus-sticky-child pattern already
used (and already accepted) for beit-al-fakhar's Hero — not something `story_experience`
introduced. `scroll_range_vh` and chapter boundaries are tuning parameters meant to be adjusted
against a real device/viewport, same as beit-al-fakhar's own `contentFadeEnd`/`handoffStart`
constants were tuned by review, not fixed abstractly. Logged in
`.claudedocs/evolution/content-sections.md`'s 2026-07-24 entry so it isn't silently rediscovered.

**Canvas taint is expected, not a bug**: frame `<img>` elements are loaded cross-origin from
Supabase without `crossOrigin="anonymous"` (matching beit-al-fakhar's own existing implementation,
unchanged) — this taints the canvas for JS-level readback (`getImageData` throws a
`SecurityError`), but does **not** affect `drawImage()` or visual/compositor rendering, confirmed
by the fact that real frames render correctly in every screenshot despite this. Verification
switched from a pixel-readback check to screenshot-based visual confirmation once this was
understood — not a product defect, a verification-methodology correction.

## 3. Side Findings

None beyond what's already logged in `.claudedocs/evolution/content-sections.md` (the rendering
engine's real shareability, and the sticky-pin/progress tuning note above) — both are genuine
architecture-adjacent findings, not incidental noise, so they're recorded there rather than here.

## 4. Unknowns

None — every claim above was verified with real evidence this session (file existence, HTTP
reachability, DB reads, screenshots, click-behavior checks). Chapter boundary *exactness*
(whether 0.58-0.68 is precisely where the mirror looks best on a real device) is explicitly a
tuning judgment call for Salman to make by eye, not an unresolved technical unknown.

## 5. Verdict

- [ ] No — the architecture held, as-is.
- [x] Yes — Capability/pattern tracking affected: `.claudedocs/evolution/content-sections.md`
  updated with a second real data point (rendering engine confirmed shared across 2 tenants;
  Chapters/Overlay-Blocks pattern still at 1 real case, not promoted).
- [ ] Yes — ADR(s) affected: not checked — nothing has stabilized through multiple independently-
  motivated tenant types yet, per Salman's own explicit instruction not to generalize this pass.
- [ ] Yes — Principle(s) affected: none found.
- [ ] Yes — Implementation Contract structure needs a change: none found.

**This review is closed.**
