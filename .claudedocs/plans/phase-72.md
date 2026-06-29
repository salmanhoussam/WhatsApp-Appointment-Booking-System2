# Phase 72 — 3D Olive R3F + Slot System

**Date:** 2026-05-26  
**Agent:** Frontend-Architect-Agent  
**Target tenant:** olivello  

---

## Objective

Replace the CSS `div` morphing olive in `OlivelloStory.jsx` with a real R3F sphere
(SphereGeometry + PBR MeshStandardMaterial), and introduce a **SLOTS** system that
places floating photo planes (and, later, GLB models) at fixed 3D positions around
the olive, driven entirely by scroll progress — zero React re-renders.

---

## Level

**Level 2** (agreed 2026-05-22):
- R3F Canvas `position:fixed`, small (covers full viewport, transparent bg)
- Olive = `SphereGeometry(1, 64, 64)` with PBR roughness/metalness
- Photo planes (`PlaneGeometry`) per slot with soft-edge vignette
- GLB slots: scaffold only (type: `'model'` in config) — actual .glb loading Phase 73+

---

## Architecture

```
OlivelloStory.jsx                     ← scroll container + context provider
  └── ScrollProgressContext.Provider  ← passes MotionValue p (not a value)
       ├── OlivelloScene3D.jsx         ← R3F Canvas, position:fixed z:4
       │     ├── OliveCore             ← SphereGeometry driven by scroll
       │     └── SlotPlane ×6          ← PlaneGeometry + vignette shader
       └── <div ref={containerRef}>   ← 1010vh scroll space + CSS layers
```

### Zero-Rerender Bridge

```js
// OlivelloStory provides:
<ScrollProgressContext.Provider value={p}> // p = MotionValue

// OliveCore / SlotPlane consume:
const scroll = useScrollProgress(); // gets MotionValue
useFrame(() => {
  const progress = scroll.get(); // read without subscribing → no renders
  mesh.scale.setScalar(lerp(...));
});
```

Source: awwwards-animations skill — "Zero-rerender R3F+FM bridge pattern"

---

## SLOTS Config (JSON-driven, ai-agent-canvas pattern)

```js
const SLOTS = [
  { id, visibleRange:[lo,hi], position:[x,y,z], rotation:[rx,ry,rz],
    size:[w,h], type:'image'|'model', src },
  ...
]
```

An AI agent or admin panel can modify this JSON to reposition/add/remove
photo planes without touching component logic. Canvas re-reads from config
on next frame.

### Slot layout (initial)

| Scene | id | position (x,y,z) | visible range |
|---|---|---|---|
| 0 Grove    | grove   | [3.8, 1.4, -1.2] | 0.00–0.22 |
| 1 Harvest  | harvest | [4.0, -0.6, -2.0]| 0.14–0.36 |
| 2 Olives   | olives  | [3.5, 1.0, -0.9] | 0.28–0.50 |
| 3 Press    | press   | [4.1, -1.2, -1.6]| 0.42–0.64 |
| 4 Stream   | stream  | [3.7, 0.6, -2.4] | 0.56–0.78 |
| 5 Product  | product | [3.2, -0.2, -1.0]| 0.70–0.90 |

---

## Olive 3D Behavior (mapped from Phase 71 CSS)

| Scroll p | CSS behavior | 3D equivalent |
|---|---|---|
| 0.00–0.40 | olive shape (w70, h90) | scale.y > scale.x (elongated) |
| 0.40–0.54 | squish (w68, h36)     | scale.y drops sharply |
| 0.54–0.68 | teardrop-ish (w68, h66) | scale.y recovers to ≈ scale.x |
| 0.68–0.82 | stable, gold color    | emissive glow ramps up |
| 0.82–0.96 | explosion (scale 1→9) | scale 0.68→9+ |
| 0.93–0.99 | fade out             | material.opacity → 0 |

Rotation: `rotation.y` += 0.006/frame (continuous), `rotation.z` lerps 0→0.78 by p=0.54

Color: `#4a5e30` (green) → `#2a301d` (squish-dark) → `#c8a84b` (gold)

---

## Z-Stack (unchanged from Phase 71)

| z-index | Layer | Source |
|---|---|---|
| 0 | Background color | CSS (motion.div) |
| 1 | Full-bleed photo cross-fades | CSS (PhotoLayer) |
| 2 | Dark vignette overlay | CSS |
| 3 | Film grain | CSS |
| **4** | **R3F Canvas (olive + slots)** | **R3F (this phase)** |
| 6 | Story text + CTA | CSS |
| 8 | OLIVELLO wordmark + scroll cue | CSS |

---

## SlotPlane Shader

Soft-edge vignette so planes "float" without hard rectangular edges:

```glsl
// fragment
uniform sampler2D uTexture;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  vec4 c = texture2D(uTexture, vUv);
  vec2 d = vUv - 0.5;
  float v = 1.0 - smoothstep(0.26, 0.50, length(d * vec2(1.0, 1.35)));
  gl_FragColor = vec4(c.rgb, v * uOpacity);
}
```

---

## Lighting

```
ambientLight         intensity=0.6
directionalLight     pos=[3,5,4]    intensity=1.2  color=#f8f0e0  (warm key)
directionalLight     pos=[-4,-2,2]  intensity=0.3  color=#3a4a28  (cool fill)
pointLight           pos=[1.5,0,3]  intensity=0.8  color=#c8a84b  dist=12  (gold rim)
```

---

## Files

| File | Action |
|---|---|
| `pages/olivello/context/ScrollProgressContext.jsx` | CREATE |
| `pages/olivello/canvas/OlivelloScene3D.jsx` | CREATE |
| `pages/olivello/sections/OlivelloStory.jsx` | UPDATE — add Provider + canvas, remove CSS olive div |

---

## Phase 73 (next)

- Load actual `.glb` olive model via `useGLTF` from drei
- Morph target animation (squish → teardrop) via `useFrame` + morphTargetInfluences
- Admin slot editor UI: drag-drop slots in 3D viewport

---

## Success Criteria

- [ ] CSS olive div removed from OlivelloStory
- [ ] R3F sphere visible at right-center of viewport at p=0
- [ ] Sphere changes color green→gold as scroll progresses
- [ ] Sphere scale explodes to fill screen at p≈0.90
- [ ] Photo planes appear/fade per SLOTS visibleRange
- [ ] No React re-renders on scroll (only useFrame reads MotionValue)
- [ ] Canvas transparent bg (CSS photo layers visible through it)
