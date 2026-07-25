---
name: mobile-viewport-quirks
description: Real mobile-browser viewport bugs and their fixes — 100vh overflow from the address bar, position:sticky pin-release math, iOS safe-area insets. Use whenever building or reviewing any full-viewport, pinned/sticky, or edge-to-edge mobile section.
user-invocable: true
---

# Mobile Viewport Quirks

## When to Use This

Any component that sizes itself against the viewport height (`100vh`, a pinned/sticky scroll
section, a full-screen hero, a fixed bottom bar) on a page real users will open on a phone. This
is a real, recurring gap — confirmed 2026-07-25 when RK Barber Shop's `StoryExperienceSection`
(a `position: sticky` pinned scroll section, `frontend/src/components/dynamic-sections/
StoryExperienceSection.jsx`) shipped, passed every headless-Chrome check this project's testing
method uses, and still didn't fill the screen on Salman's real phone.

## Why Headless Chrome Testing Missed It

`Emulation.setDeviceMetricsOverride` (this project's standard mobile-viewport verification method,
established in `rules/investigation-protocol.md`'s "Runtime Before Assumption" practice) emulates
screen *size*, not browser *chrome*. It has no address bar to show or hide, so `100vh` and `100svh`
render identically there. **A passing headless-Chrome mobile check is not proof a `100vh` section
is safe on a real phone** — say that gap out loud rather than letting a green check imply more than
it proves.

## The Bug

`vh` units are computed against the viewport with the mobile browser's address bar assumed
**hidden**. On a real device, with the bar visible (the common case — most scroll positions), the
true visible area is smaller than `100vh`. A `height: 100vh` sticky/pinned/full-screen element is
therefore taller than what's actually on screen — it overflows, gets clipped, or leaves the section
not filling the visible viewport the way it does in every desktop/headless check.

## The Fix

Use `svh` (small viewport height) instead of `vh` for anything that must never overflow the real
visible area — it's the guaranteed-smallest real viewport size, so it can't overshoot. The
trade-off: a little unused space appears once the address bar later collapses. That's the safe
direction to be wrong in (empty space vs. clipped content). `dvh` (dynamic viewport height) is the
other real option — it tracks the address bar live, so there's no unused space ever, but it can
reflow content *while the user is scrolling* as the bar shows/hides, which reads as jank in a
pinned/sticky section. Default to `svh` for pinned/sticky sections; `dvh` is fine for content that
doesn't need to stay visually stable mid-scroll.

```css
/* ❌ overflows the real visible area on a real phone with the address bar showing */
.sticky-stage { height: 100vh; }

/* ✅ guaranteed to fit the smallest real viewport */
.sticky-stage { height: 100svh; }
```

**Every unit in the same layout formula must match.** If a component computes a ratio between two
viewport-based measurements — e.g. `StoryExperienceSection.jsx`'s pinned-zone-end check,
`1 - 100/scrollRangeVh`, comparing the outer scroll-distance height against the inner sticky
height — both sides must use the *same* unit (`svh` and `svh`, not `svh` and `vh`). Mixing units
silently throws the ratio off on exactly the devices the fix is for.

## `position: sticky` + Tall-Container Pin Release

A `position: sticky` child inside a tall parent (`height: NNNvh`/`NNNsvh`) stays pinned only while
the scroll position is within `[containerTop, containerTop + containerHeight - stickyHeight]` —
past that, it detaches and scrolls away normally. In scroll-progress terms (0-1 over the
container), that release point is `1 - stickyHeightUnits / containerHeightUnits`, not `1.0`.
Anything meant to render *while fully pinned* (a chapter overlay, a CTA) must stay before that
point — confirmed the hard way in this same component (`StoryExperienceSection.jsx`'s own
`pinnedZoneEnd` dev-only `console.warn`, 2026-07-24).

## iOS Safe Areas

Full-bleed fixed elements (bottom nav bars, floating CTAs, edge-to-edge heroes) need real inset
padding on iOS devices with a home indicator / notch, or content sits under it:

```css
padding-bottom: env(safe-area-inset-bottom, 0px);
padding-top: env(safe-area-inset-top, 0px);
```

Not yet hit as a real bug on this project (no fixed bottom bars in production today) — included
here so the next one that needs it doesn't rediscover this from scratch.

## Known Limitation

This skill's guidance can be checked by reading the resulting CSS/inline styles for correctness,
but **cannot be verified by this project's own headless-Chrome method** (see "Why Headless Chrome
Testing Missed It" above). Closing the loop on a real mobile-viewport fix always needs either a
real device or a real mobile browser's dev tools (which do simulate the address bar), not another
headless screenshot.
