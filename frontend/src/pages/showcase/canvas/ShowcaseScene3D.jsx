import { Suspense, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import AtmosphericClouds     from './AtmosphericClouds';
import BackgroundLife        from './BackgroundLife';
import BuildingTower         from './BuildingTower';
import ShowcaseCameraManager from './ShowcaseCameraManager';
import { scrollState }       from './scrollState';

// ── Smooth-step helper ────────────────────────────────────────────────────────
const ss = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ── Room Atmosphere — drives fog + canvas background + ambient per room ───────
//
// Room weights:
//   r1 = About    (blue)    p 0.28 → 0.50
//   r2 = Services (amber)   p 0.52 → 0.72
//   r3 = Contact  (green)   p 0.74 → 0.94
//
// The transition into each room is a smooth bell: ramp-in × ramp-out.
// Colors are blended as weighted sums so transitions are seamless.
// ─────────────────────────────────────────────────────────────────────────────
function RoomAtmosphere() {
  const { scene } = useThree();
  const ambRef = useRef();
  const _c = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const p = scrollState.progress;

    const r1 = ss(0.28, 0.36, p) * (1 - ss(0.44, 0.50, p)); // About   — blue
    const r2 = ss(0.52, 0.58, p) * (1 - ss(0.66, 0.72, p)); // Services— amber
    const r3 = ss(0.74, 0.79, p) * (1 - ss(0.89, 0.94, p)); // Contact — green
    const r0 = Math.max(0, 1 - r1 - r2 - r3);                // idle

    // ── Fog color ─────────────────────────────────────────────────────────────
    // idle #060b18 | about #030b2a | services #180800 | contact #010e06
    const fR = r0 * 0.024 + r1 * 0.012 + r2 * 0.094 + r3 * 0.004;
    const fG = r0 * 0.044 + r1 * 0.044 + r2 * 0.032 + r3 * 0.055;
    const fB = r0 * 0.094 + r1 * 0.165 + r2 * 0.000 + r3 * 0.024;

    if (scene.fog) {
      _c.setRGB(fR, fG, fB);
      scene.fog.color.lerp(_c, 0.05);
    }

    // ── Canvas clear color (slightly darker than fog for depth) ───────────────
    if (scene.background) {
      _c.setRGB(fR * 0.38, fG * 0.38, fB * 0.38);
      scene.background.lerp(_c, 0.05);
    }

    // ── Ambient light ─────────────────────────────────────────────────────────
    if (ambRef.current) {
      // idle=cool blue | about=deep blue | services=warm amber | contact=emerald
      const aR = r0 * 0.165 + r1 * 0.07  + r2 * 0.60  + r3 * 0.06;
      const aG = r0 * 0.29  + r1 * 0.20  + r2 * 0.32  + r3 * 0.45;
      const aB = r0 * 0.54  + r1 * 0.88  + r2 * 0.02  + r3 * 0.14;
      _c.setRGB(aR, aG, aB);
      ambRef.current.color.lerp(_c, 0.04);

      const iTarget = r0 * 0.22 + r1 * 0.70 + r2 * 0.60 + r3 * 0.65;
      ambRef.current.intensity += (iTarget - ambRef.current.intensity) * 0.04;
    }
  });

  return <ambientLight ref={ambRef} intensity={0.22} color="#2a4a8a" />;
}

// ── Scene ─────────────────────────────────────────────────────────────────────
export default function ShowcaseScene3D() {
  return (
    <>
      <color attach="background" args={['#060b18']} />
      <fogExp2 attach="fog" args={['#060b18', 0.01]} />

      {/* Dynamic atmosphere — replaces static ambientLight, drives room color floods */}
      <RoomAtmosphere />

      {/* Per-floor accent lights */}
      <pointLight position={[0, 14, 2]} intensity={2.5} color="#3b82f6" />
      <pointLight position={[0,  6, 2]} intensity={2.2} color="#f59e0b" />
      <pointLight position={[0,  0, 2]} intensity={2.2} color="#22c55e" />
      <pointLight position={[0, 28, 0]} intensity={1.5} color="#1a4aaa" />
      <pointLight position={[0, -3, 8]} intensity={1.2} color="#c0d8ff" />

      <Suspense fallback={null}>
        <Environment preset="night" />
        <BackgroundLife />
        <AtmosphericClouds />
        <BuildingTower />
        <ShowcaseCameraManager />
      </Suspense>

      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.30}
          luminanceSmoothing={0.85}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.18} darkness={0.80} />
      </EffectComposer>
    </>
  );
}
