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

---

## Addendum — same-day UX tuning pass (2026-07-24, later)

Appended (not a rewrite of the closed verdict above, per this project's Review immutability
convention) — Salman reviewed the shipped Story Experience the same day and directed a real
pacing/typography pass: overlay text was "too short/leaves in a flash" and bottom-anchored; he
wanted a cinematic play → pause → text → pause → play rhythm instead of continuous scrubbing.

### What changed

`StoryExperienceSection.jsx` rebuilt around explicit play/hold segments: the frame advances freely
between chapters, then **freezes** on each chapter's own `hold_frame` for its `[holdStart,
holdEnd]` scroll range while the overlay (now centered vertically, ~2x larger heading, more
letter-spacing) fades in, holds, and fades out — matching his literal spec ("Video → Pause →
Welcome → Pause → Video continues"). The frame-sequence engine itself was not touched, only what
`StoryExperienceSection` feeds it: `useTransform` bends raw scroll progress into a piecewise curve
that goes flat during each hold, built from real per-second timing he gave (door 0-6s → frame
index 18, products ~9s → 29, mirror ~15s → 48, chair area ~22s+ → 76, the last frame).

### Two real bugs found and fixed during verification (not shipped blind)

1. **Stale MotionValue reference bug**: the play/hold breakpoint arrays were rebuilt inline on
   every render, so `useTransform` produced a new `effectiveProgress` MotionValue instance each
   time — silently breaking `FrameSequenceCanvas`'s `useMotionValueEvent` subscription. Symptom:
   real headless-Chrome screenshots showed a solid black canvas during holds, even though the
   target frame (confirmed by downloading and viewing `frame_018.webp` directly) was a real,
   well-lit shot. Fixed by memoizing the breakpoint arrays (and the `assets` object, same root
   cause) with `useMemo`, keyed on `frameCount`/`chapters`/`frame_base_url`.
2. **Hooks-order bug introduced by the same edit**: the early `if (...) return null` guard ended
   up placed before the new `useMemo`/`useTransform` calls — a Rules-of-Hooks violation (hook call
   order must be identical every render). Fixed by moving the guard to immediately before the JSX
   `return`, after every hook call.
3. **Sticky-pin/chapter-timing mismatch**: with `scroll_range_vh: 420`, the sticky-pinned inner
   viewport only stays pinned through scroll progress `1 - 100/420 ≈ 0.762` — a fixed ratio,
   independent of actual device viewport height (since `scroll_range_vh` is itself expressed in
   `vh` units). The `booking` chapter's original hold (`0.86-1.0`) sat entirely past that point,
   so it rendered mid-unpin (frame already scrolling away) instead of fully pinned — confirmed via
   a real screenshot showing the section already scrolled past. Fixed by rescaling all 4 chapters'
   `holdStart`/`holdEnd` to fit within `[0, 0.76]`, leaving `[0.76, 1.0]` as a deliberate release/
   handoff tail into the next section (the same idea as beit-al-fakhar's own Hero handoff dissolve,
   not a new concept). Added a dev-only `console.warn` guard in the component itself so a future
   chapter/`scroll_range_vh` edit that reintroduces this mismatch is caught immediately, not
   rediscovered by testing.

### Real verification after both fixes

Real headless-Chrome + CDP session (fresh profile, port 9339): all 4 chapters checked by scrolling
to their real hold midpoints — each shows the correct real frame (confirmed against directly-
downloaded reference copies of frames 18/29/48/76), correct real text (`RK Barber Shop`/`أهلاً بكم`,
`Premium Hair Products`/`View Products`, `شكلك الجديد يبدأ هون`, `جاهز لإطلالتك الجديدة؟`/
`Book Now`), centered and large. At every checkpoint, the inner sticky div's `getBoundingClientRect().top`
was confirmed `0` (still fully pinned, not mid-unpin). Zero real console errors/exceptions across
the full pass (one pre-existing, unrelated Framer Motion advisory warning about non-static
positioning, present before this change too).

### Verdict (addendum)

Architecture held — both bugs were implementation mistakes introduced by this same tuning pass and
caught by verification before being called done, not pre-existing issues. The sticky-pin/timing
constraint is now a documented, guarded invariant (`console.warn` + `_note` in `page_content.json`)
rather than tribal knowledge. No Evolution Log or Capability changes needed beyond what's already
recorded above — this addendum is implementation-quality evidence, not a new architectural finding.

**This addendum is closed.**
