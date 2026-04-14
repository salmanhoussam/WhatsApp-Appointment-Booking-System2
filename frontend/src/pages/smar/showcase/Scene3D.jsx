/**
 * Scene3D.jsx  —  Option C: Cinematic Spatial Diorama
 *
 * A drone flies through an elegant dark void where 3 floating stations
 * are placed at their exact real-world map coordinates.
 *
 *   No terrain. No wireframe. Just darkness, gold dust, and floating art.
 *
 * Station layout (from client satellite map):
 *   z:   0   Station 1 — Villas       RIGHT  (x: +4, y: +1)
 *   z: -15   Station 2 — Pool/Café    CENTER (x:  0, y:  0)
 *   z: -30   Station 3 — Chalets      LEFT   (x: -4, y: -1)
 *   z: -50   Finale    — Sea Horizon  MASSIVE background plane
 *
 * Camera drone path:
 *   Z: +10 → -45   (55-unit flight)
 *   X: sways right (Villas) → center (Pool) → left (Chalets) → center
 *   Y: gentle descent 2 → 0
 *
 * Soft-edge shader:
 *   Each station image fades smoothly into the void via a UV-space
 *   rectangular vignette (hFade × vFade smoothstep). No hard squares.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import { useScroll, useTexture, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ─── Asset URLs ───────────────────────────────────────────────────────────────
const ASSETS = {
  villas:  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/frontveiwvilla.png',
  pool:    'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/pool.png',
  chalets: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/smar-showcase/chalet-top-view.jpeg',
  sea:     'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/beitsmar7.jpg',
};

// ─── Soft-Edge Shader Material ────────────────────────────────────────────────
// UV-space rectangular vignette: edges dissolve into the dark void.
// hFade = horizontal edge ramp, vFade = vertical edge ramp, combined via multiply.
const SoftImageMaterial = shaderMaterial(
  { map: new THREE.Texture(), uOpacity: 1.0 },

  /* ── vertex ── */
  `varying vec2 vUv;
   void main() {
     vUv = uv;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
   }`,

  /* ── fragment ── */
  `uniform sampler2D map;
   uniform float      uOpacity;
   varying vec2       vUv;

   void main() {
     vec4  tex    = texture2D(map, vUv);
     // Soft edge amount — 0.20 gives a gentle 20% fade band on each side
     float edge   = 0.20;
     float hFade  = smoothstep(0.0,  edge,        vUv.x)
                  * smoothstep(1.0,  1.0 - edge,  vUv.x);
     float vFade  = smoothstep(0.0,  edge,        vUv.y)
                  * smoothstep(1.0,  1.0 - edge,  vUv.y);
     float fade   = hFade * vFade;
     gl_FragColor = vec4(tex.rgb, tex.a * fade * uOpacity);
   }`,
);
extend({ SoftImageMaterial });

// ─── Floating Station ─────────────────────────────────────────────────────────
// Plane geometry at 3D map coordinates with the soft-edge shader applied.
function FloatingStation({ url, position, size }) {
  const texture = useTexture(url);
  const [w, h]  = size;

  return (
    <mesh position={position}>
      <planeGeometry args={[w, h, 1, 1]} />
      <softImageMaterial
        map={texture}
        uOpacity={1.0}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Background Sea Panorama ──────────────────────────────────────────────────
// Massive hard-edge plane at journey's end — it IS the horizon, so it
// should fill the viewport completely. No edge fade needed.
function BackgroundSea() {
  const texture = useTexture(ASSETS.sea);
  return (
    <mesh position={[0, 0, -50]}>
      <planeGeometry args={[72, 40, 1, 1]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

// ─── Gold Particle Corridor ───────────────────────────────────────────────────
// 2 500 gold dust motes distributed along the full 55-unit flight path.
function ParticleCorridor() {
  const COUNT = 2500;
  const ref   = useRef();

  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 24; // X ±12
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14; // Y ±7
      pos[i * 3 + 2] = 12 - Math.random() * 68;    // Z +12 → -56
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = clock.getElapsedTime() * 0.005;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.028}
        color="#d4a853"
        transparent
        opacity={0.30}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ─── Scene Environment (fog + bg) ────────────────────────────────────────────
function SceneEnvironment() {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog        = new THREE.FogExp2('#0a0a0f', 0.022);
    scene.background = new THREE.Color('#0a0a0f');
    return () => { scene.fog = null; scene.background = null; };
  }, [scene]);
  return null;
}

// ─── Drone Camera Rig ─────────────────────────────────────────────────────────
// Z: +10 → -45 (55 units, maps to scroll 0→1)
//
// X sway toward the active station:
//   s ≈ 0.18  Villas  (x:+4)  → lean RIGHT  (+0.9)
//   s ≈ 0.45  Pool    (x: 0)  → CENTER
//   s ≈ 0.73  Chalets (x:-4)  → lean LEFT   (−0.9)
//   s = 1.00  Finale          → CENTER
//
// Y: subtle descent 2.0 → 0 (feels like a real drone dip on approach)
function CameraRig({ onProgress }) {
  const scroll = useScroll();

  useFrame(({ camera }) => {
    const s = scroll.offset;
    onProgress(s);

    // ── Z: steady forward flight ──
    camera.position.z = THREE.MathUtils.lerp(10, -45, s);

    // ── Y: gentle drone dip ──
    camera.position.y = THREE.MathUtils.lerp(2.0, 0.0, Math.min(s * 1.6, 1));

    // ── X: cinematic sway toward each station ──
    if      (s < 0.18) camera.position.x = THREE.MathUtils.lerp(0,    0.9,  s / 0.18);
    else if (s < 0.45) camera.position.x = THREE.MathUtils.lerp(0.9,  0,   (s - 0.18) / 0.27);
    else if (s < 0.73) camera.position.x = THREE.MathUtils.lerp(0,   -0.9, (s - 0.45) / 0.28);
    else               camera.position.x = THREE.MathUtils.lerp(-0.9, 0,   (s - 0.73) / 0.27);

    // ── Look slightly ahead and slightly upward ──
    camera.lookAt(
      camera.position.x * 0.25,
      camera.position.y * 0.35,
      camera.position.z - 8,
    );
  });

  return null;
}

// ─── Scene3D (default export) ─────────────────────────────────────────────────
export default function Scene3D({ onProgress }) {
  return (
    <>
      <CameraRig    onProgress={onProgress} />
      <SceneEnvironment />

      {/* ── Lighting ────────────────────────────────────────────── */}
      <ambientLight intensity={0.12} />
      {/* Warm gold wash — villa entrance */}
      <pointLight position={[4,  5,  2]}  color="#d4a853" intensity={5.0} distance={30} />
      {/* Neutral fill — pool/cafeteria */}
      <pointLight position={[0,  3, -14]} color="#ffffff"  intensity={3.0} distance={28} />
      {/* Cool blue — mountain/chalet side */}
      <pointLight position={[-4, 3, -28]} color="#4466cc" intensity={3.0} distance={28} />
      {/* Grand flood — sea horizon finale */}
      <pointLight position={[0,  5, -46]} color="#ffffff"  intensity={6.0} distance={36} />
      {/* Warm sky / cool earth */}
      <hemisphereLight args={['#1a1108', '#060610', 0.30]} />

      {/* ══ Station 1: Villas — RIGHT (x:+4, z:0) ══════════════════ */}
      <FloatingStation
        url={ASSETS.villas}
        position={[4, 1, 0]}
        size={[9, 5.5]}
      />

      {/* ══ Station 2: Pool / Cafeteria — CENTER (x:0, z:-15) ══════ */}
      <FloatingStation
        url={ASSETS.pool}
        position={[0, 0, -15]}
        size={[9, 5.5]}
      />

      {/* ══ Station 3: Chalets — LEFT (x:-4, z:-30) ════════════════ */}
      <FloatingStation
        url={ASSETS.chalets}
        position={[-4, -1, -30]}
        size={[9, 5.5]}
      />

      {/* ══ Finale: Sea Horizon — MASSIVE backdrop (z:-50) ═════════ */}
      <BackgroundSea />

      {/* ── Gold dust corridor ─────────────────────────────────────── */}
      <ParticleCorridor />
    </>
  );
}
