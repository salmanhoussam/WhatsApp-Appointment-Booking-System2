/**
 * OlivelloScene3D.jsx — Phase 72
 *
 * R3F Canvas fixed behind OlivelloStory.
 * - OliveCore: SphereGeometry PBR sphere, all transforms driven by scroll MotionValue
 * - SlotPlane: floating photo plane per SLOTS entry, soft-edge vignette shader
 *
 * Zero-rerender bridge: components read MotionValue via useScrollProgress() inside
 * useFrame — no useState, no props drilling on every scroll tick.
 *
 * SLOTS is a plain JSON config → AI-agent / admin can reposition photos without
 * touching component logic (ai-agent-canvas pattern).
 */

import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { useTexture, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useScrollProgress } from '../context/ScrollProgressContext';

// ── Slot plane material — soft vignette at edges ───────────────────────────
const SlotMat = shaderMaterial(
  { uTexture: null, uOpacity: 0.0 },
  /* vert */
  `varying vec2 vUv;
   void main() {
     vUv = uv;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
   }`,
  /* frag */
  `uniform sampler2D uTexture;
   uniform float uOpacity;
   varying vec2 vUv;
   void main() {
     vec4 c = texture2D(uTexture, vUv);
     vec2 d = vUv - 0.5;
     float v = 1.0 - smoothstep(0.26, 0.50, length(d * vec2(1.0, 1.35)));
     gl_FragColor = vec4(c.rgb, v * uOpacity);
   }`
);
extend({ SlotMat });

// ── SLOTS — JSON-driven config ─────────────────────────────────────────────
const SUPABASE = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties';

const SLOTS = [
  {
    id: 'grove',
    visibleRange: [0.00, 0.22],
    position:  [2.1,  1.0, -0.8],
    rotation:  [0.0, -0.22, 0.08],
    size:      [2.0, 1.34],
    type:      'image',
    src:       `${SUPABASE}/olivello/pages/home/story/01-grove.webp`,
  },
  {
    id: 'harvest',
    visibleRange: [0.14, 0.36],
    position:  [2.4, -0.7, -1.4],
    rotation:  [0.0, -0.28, -0.06],
    size:      [1.9, 1.27],
    type:      'image',
    src:       `${SUPABASE}/olivello/pages/home/story/02-harvest.jpg`,
  },
  {
    id: 'olives',
    visibleRange: [0.28, 0.50],
    position:  [1.9,  0.9, -0.7],
    rotation:  [0.0, -0.18, 0.10],
    size:      [1.9, 1.27],
    type:      'image',
    src:       `${SUPABASE}/olivello/pages/home/story/03-olives.jpg`,
  },
  {
    id: 'press',
    visibleRange: [0.42, 0.64],
    position:  [2.5, -1.0, -1.3],
    rotation:  [0.0, -0.32, -0.05],
    size:      [1.9, 1.27],
    type:      'image',
    src:       `${SUPABASE}/olivello/pages/home/story/04-press.jpg`,
  },
  {
    id: 'stream',
    visibleRange: [0.56, 0.78],
    position:  [2.2,  0.4, -1.7],
    rotation:  [0.0, -0.26, 0.04],
    size:      [1.9, 1.27],
    type:      'image',
    src:       `${SUPABASE}/olivello/pages/home/story/05-stream.jpg`,
  },
  {
    id: 'product',
    visibleRange: [0.70, 0.90],
    position:  [2.0, -0.2, -0.7],
    rotation:  [0.0, -0.15, 0.0],
    size:      [1.7, 1.7],
    type:      'image',
    src:       `${SUPABASE}/olivello/pages/home/story/06-product.png`,
  },
];

// ── Math helpers ───────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t)    { return a + (b - a) * clamp(t, 0, 1); }

function smoothstep(lo, hi, v) {
  const t = clamp((v - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
}

// ── OliveCore — PBR sphere, fully scroll-driven ────────────────────────────
const G_COLOR  = new THREE.Color('#4a5e30'); // ripe olive green
const GO_COLOR = new THREE.Color('#2a301d'); // squish-dark
const AU_COLOR = new THREE.Color('#c8a84b'); // gold
const _col     = new THREE.Color();

function OliveCore() {
  const meshRef = useRef();
  const scroll  = useScrollProgress();

  useFrame(() => {
    if (!meshRef.current || !scroll) return;
    const p   = scroll.get();
    const mat = meshRef.current.material;

    // ── Position: drifts right-to-center horizontally, down vertically ──
    meshRef.current.position.x = lerp(1.4, 1.0, clamp(p / 0.85, 0, 1));
    meshRef.current.position.y = lerp(0.7, -0.9, clamp(p / 0.85, 0, 1));

    // ── Non-uniform scale (olive shape → squish → sphere → explosion) ───
    // Width  (normalised to w=72): 0.97 → 1.00 → 0.94
    const wt =
      p < 0.40 ? lerp(0.97, 1.00, p / 0.40)
    : p < 0.54 ? lerp(1.00, 0.94, (p - 0.40) / 0.14)
    : 0.94;

    // Height (normalised to h=92): 0.98 → 1.00 → 0.39 → 0.72
    const ht =
      p < 0.40 ? lerp(0.98, 1.00, p / 0.40)
    : p < 0.54 ? lerp(1.00, 0.39, (p - 0.40) / 0.14)
    : p < 0.68 ? lerp(0.39, 0.72, (p - 0.54) / 0.14)
    : 0.72;

    // Explosion
    const explodeT  = smoothstep(0.82, 0.96, p);
    const baseScale = 0.38;
    const explosion = lerp(1.0, 14.0, explodeT * explodeT);
    meshRef.current.scale.set(
      baseScale * wt * explosion,
      baseScale * ht * explosion,
      baseScale * wt * explosion,
    );

    // ── Rotation: continuous slow spin + scroll-driven tilt ─────────────
    meshRef.current.rotation.y += 0.006;
    meshRef.current.rotation.z  = lerp(0.0, 0.78, clamp(p / 0.54, 0, 1));

    // ── Color: green → squish-dark → gold ───────────────────────────────
    const darkT  = smoothstep(0.40, 0.52, p);
    const goldT  = smoothstep(0.44, 0.60, p);
    _col.lerpColors(G_COLOR, GO_COLOR, darkT);
    _col.lerpColors(_col,    AU_COLOR, goldT);
    mat.color.copy(_col);

    // ── Emissive glow: builds during stream→product scenes ──────────────
    const glowT = smoothstep(0.60, 0.82, p) * (1 - smoothstep(0.92, 0.98, p));
    mat.emissive.setRGB(0.20 * glowT, 0.13 * glowT, 0.01 * glowT);
    mat.emissiveIntensity = glowT * 1.4;

    // ── Opacity: fade out at very end ────────────────────────────────────
    mat.opacity = 1.0 - smoothstep(0.93, 0.99, p);
  });

  return (
    <mesh ref={meshRef} position={[1.4, 0.7, 0]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#4a5e30"
        roughness={0.38}
        metalness={0.05}
        transparent
        opacity={1}
      />
    </mesh>
  );
}

// ── SlotPlane — floating photo plane with vignette ─────────────────────────
function SlotPlane({ slot, texture }) {
  const matRef = useRef();
  const scroll = useScrollProgress();

  useFrame(() => {
    if (!matRef.current || !scroll) return;
    const p       = scroll.get();
    const [lo, hi] = slot.visibleRange;
    const fadeIn  = smoothstep(lo, lo + 0.05, p);
    const fadeOut = 1 - smoothstep(hi - 0.05, hi, p);
    matRef.current.uOpacity = Math.min(fadeIn, fadeOut) * 0.84;
  });

  return (
    <mesh position={slot.position} rotation={slot.rotation}>
      <planeGeometry args={[slot.size[0], slot.size[1]]} />
      {/* slotMat is registered via extend({ SlotMat }) above */}
      <slotMat
        ref={matRef}
        uTexture={texture}
        uOpacity={0}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── OlivelloScene — full scene (inside Canvas) ─────────────────────────────
function OlivelloScene() {
  const textures = useTexture(SLOTS.map((s) => s.src));

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]}   intensity={1.2} color="#f8f0e0" />
      <directionalLight position={[-4, -2, 2]}  intensity={0.3} color="#3a4a28" />
      <pointLight       position={[1.5, 0, 3]}  intensity={0.8} color="#c8a84b" distance={12} />

      <OliveCore />

      {SLOTS.map((slot, i) => (
        <SlotPlane key={slot.id} slot={slot} texture={textures[i]} />
      ))}
    </>
  );
}

// ── Canvas wrapper (exported) ──────────────────────────────────────────────
export default function OlivelloScene3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 55, near: 0.1, far: 100 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        4,
        pointerEvents: 'none',
      }}
    >
      <Suspense fallback={null}>
        <OlivelloScene />
      </Suspense>
    </Canvas>
  );
}
