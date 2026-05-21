# Phase 71 — Olivello Story Redesign
# Created: 2026-05-22

## Goal
Replace the current 8-section olivello showcase with a single continuous
"journey of an olive" scroll story, inspired by tests/olivello.html.

## Concept
A morphing olive shape (fixed layer) travels, transforms, and reveals
real photos as the user scrolls. Background color shifts with the story.

## Scroll Map (7 scenes × 120vh = ~840vh total)

| Progress | Scene | Image | Shape State | BG Color |
|----------|-------|-------|-------------|----------|
| 0–12% | Intro: "من الجبل" | olive grove | Green oval | oklch(14% 0.04 130) |
| 12–28% | القطاف — Harvest | hands + olives | Oval with leaf | oklch(18% 0.06 115) |
| 28–44% | الزيتون الطازج | olives in crate | Rotating oval | oklch(20% 0.07 105) |
| 44–58% | المعصرة — Press | oil pouring close | Squishes flat | oklch(22% 0.05 95) |
| 58–72% | الزيت يتدفق | oil stream golden | Morphs to drop ◉ | oklch(24% 0.08 80) |
| 72–86% | القطرة الذهبية | studio olive+bottle | Golden drop grows | oklch(28% 0.12 72) |
| 86–100% | المنتج — CTA | full bottle hero | Drop explodes → CTA | oklch(20% 0.06 85) |

## Shape Morphing (Framer Motion useTransform)

```
Progress 0%:   width:70px, height:90px, borderRadius:'50%', color:oklch(46% 0.14 128)
Progress 30%:  width:70px, height:90px, rotate:-15, slight wiggle
Progress 45%:  width:100px, height:45px, scaleY:0.5 — squished under press
Progress 60%:  width:65px, height:65px, borderRadius:'0 50% 50% 50%', rotate:45 — drop
Progress 75%:  scale:2.5, golden glow, opacity:1
Progress 90%:  scale:8, opacity:0 — explodes to reveal CTA
```

## Image Upload Paths (Supabase)
```
olivello/pages/home/story/01-grove.jpg        → الشجرة / Grove
olivello/pages/home/story/02-harvest.jpg      → "في كل حبة زيتون" harvest photo
olivello/pages/home/story/03-olives.jpg       → 572485352 (green olives crate)
olivello/pages/home/story/04-press.jpg        → 576931129 (oil pouring pour)
olivello/pages/home/story/05-stream.jpg       → 573611932 (oil stream machine)
olivello/pages/home/story/06-product.jpg      → NoteGPT_Image_20260522000832 (bowl+bottle)
olivello/pages/home/story/07-bottle.jpg       → 576995405 (hero bottle)
```

## Source Files (Downloads)
```
C:\Users\Lenovo\Downloads\572485352_3383603875123916_2529170526937959883_n.jpg  → 03-olives
C:\Users\Lenovo\Downloads\573611932_3383603278457309_2095620574164676374_n.jpg  → 05-stream
C:\Users\Lenovo\Downloads\576931129_3383603218457315_8836865869596729984_n.jpg  → 04-press
C:\Users\Lenovo\Downloads\576995405_3383603675123936_3730630462861168544_n.jpg  → 07-bottle
C:\Users\Lenovo\Downloads\NoteGPT_Image_20260522000832.png                      → 06-product
C:\Users\Lenovo\Downloads\في كل حبة زيتون...jpg                                → 02-harvest
C:\Users\Lenovo\Downloads\من شجرةٍ لا شرقية...webp                            → 01-grove (or find better)
```

## Architecture

### New file: OlivelloStory.jsx
Replaces OlivelloShowcase.jsx as the main showcase page.

```
OlivelloStory.jsx
├── Fixed: <MorphingOlive /> — shape that transforms with scroll
├── Fixed: <BackgroundLayer /> — color shifts with scroll
├── Scrollable: 7 × <StoryScene /> — 120vh each
│   ├── Left: text narrative (Arabic + English)
│   └── Right: photo reveal (clip-path opacity)
└── Final: CTA section
```

### Per-agent division:

**Frontend-Architect-Agent:**
- OlivelloStory.jsx — main scroll container + scene structure
- useOlivelloScrollStore → scrollProgress from useScroll
- MorphingOlive component (scroll-driven shape transforms)
- BackgroundLayer (scroll-driven color)
- Update olivello.routes.jsx to use OlivelloStory instead of OlivelloShowcase

**impeccable craft:**
- StoryScene layout: text + image composition
- Typography hierarchy: Arabic title + English subtitle
- Image reveal: clip-path slide-in per scene
- CTA finale: bottle hero + buttons

## Success Criteria
- [ ] Images uploaded to Supabase (7 images)
- [ ] demo.salmansaas.com/olivello shows story (not old sections)
- [ ] Morphing olive travels and transforms correctly 0→100%
- [ ] Each scene reveals its photo as you scroll into it
- [ ] Background smoothly shifts through 7 colors
- [ ] CTA visible at the end with links to /olivello/store
