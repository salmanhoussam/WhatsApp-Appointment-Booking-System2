/**
 * Scene3D.jsx  —  2.5D Kinetic Parallax Experience
 *
 * Two-depth-plane architecture (no terrain):
 *
 *   z: −30   BackgroundPlane  — vast sea/mountain panorama, slow Y drift (0 → −3)
 *   z: −10   VillaSubject     — transparent PNG cutout, slides up from y:−12 → −0.5
 *                               over scroll s: 0.05 → 0.55, scale 0.80 → 1.0
 *
 * Camera stays fixed at [0, y, 5] — very slight Y rise with scroll.
 * Parallax depth comes from the two planes being at different Z values
 * and moving at different vertical rates.
 *
 * Gold particle field adds atmosphere between the layers.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree }         from '@react-three/fiber';
import { useScroll, Image }           from '@react-three/drei';
import * as THREE                     from 'three';

// ─── Asset URLs ───────────────────────────────────────────────────────────────
const ASSETS = {
  background: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/beitsmar7.jpg',
  villa:      'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/frontveiwvilla.png',
};

// ─── Smoothstep easing ────────────────────────────────────────────────────────
function smoothstep(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// ─── Deep Background Panorama ─────────────────────────────────────────────────
// Massive sea/mountain image at z:−30.
// Drifts down slowly (0 → −3) as user scrolls — creates a strong sense of depth.
function BackgroundPlane() {
  const groupRef = useRef();
  const scroll   = useScroll();

  useFrame(() => {
    if (!groupRef.current) return;
    const s = scroll.offset;
    groupRef.current.position.y = THREE.MathUtils.lerp(0, -3, s);
  });

  return (
    <group ref={groupRef} position={[0, 0, -30]}>
      <Image
        url={ASSETS.background}
        scale={[35, 20]}
        toneMapped={false}
      />
    </group>
  );
}

// ─── Villa Foreground Cutout ──────────────────────────────────────────────────
// Transparent PNG — kinetic slide-up from below the viewport.
// s 0.05 → 0.55 : y lerp −12 → −0.5, scale lerp 0.80 → 1.0  (smoothstepped)
function VillaSubject() {
  const groupRef = useRef();
  const scroll   = useScroll();

  useFrame(() => {
    if (!groupRef.current) return;
    const s = scroll.offset;
    const t = smoothstep((s - 0.05) / 0.50); // clamps to [0,1]

    groupRef.current.position.y = THREE.MathUtils.lerp(-12, -0.5, t);
    const sc = THREE.MathUtils.lerp(0.80, 1.0, t);
    groupRef.current.scale.setScalar(sc);
  });

  return (
    <group ref={groupRef} position={[0, -12, -10]}>
      <Image
        url={ASSETS.villa}
        scale={[16, 9]}
        transparent={true}
        toneMapped={false}
      />
    </group>
  );
}

// ─── Gold Particle Field ──────────────────────────────────────────────────────
// Atmospheric dust suspended between the two depth planes.
function ParticleField() {
  const COUNT = 2200;
  const ref   = useRef();

  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 28; // X ±14
      pos[i * 3 + 1] = (Math.random() - 0.5) * 18; // Y ±9
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 12; // Z −22 → −2
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.006;
    }
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
        size={0.025}
        color="#d4a853"
        transparent
        opacity={0.28}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ─── Scene Fog & Background ───────────────────────────────────────────────────
function SceneEnvironment() {
  const { scene } = useThree();

  useEffect(() => {
    scene.fog        = new THREE.FogExp2('#0a0a0f', 0.018);
    scene.background = new THREE.Color('#0a0a0f');
    return () => {
      scene.fog        = null;
      scene.background = null;
    };
  }, [scene]);

  return null;
}

// ─── Camera Rig ───────────────────────────────────────────────────────────────
// Stays fixed at z:5 — very slight Y rise with scroll (0 → 0.8).
// Parallax is entirely from the two planes, not the camera moving.
function CameraRig({ onProgress }) {
  const scroll = useScroll();

  useFrame(({ camera }) => {
    const s = scroll.offset;
    onProgress(s);
    camera.position.set(0, THREE.MathUtils.lerp(0, 0.8, s), 5);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ─── Scene3D (default export) ─────────────────────────────────────────────────
export default function Scene3D({ onProgress }) {
  return (
    <>
      <CameraRig    onProgress={onProgress} />
      <SceneEnvironment />

      {/* ── Lighting ── */}
      <ambientLight intensity={0.15} />
      {/* Warm gold wash — lights the villa from above-right */}
      <pointLight position={[5,  8,  0]}  color="#d4a853" intensity={3.5} distance={40} />
      {/* Cool blue accent — mountain side */}
      <pointLight position={[-4, 6, -5]}  color="#4466cc" intensity={1.5} distance={35} />
      {/* Soft fill — keeps villa visible against dark bg */}
      <pointLight position={[0,  4, -8]}  color="#ffffff"  intensity={2.0} distance={30} />
      {/* Hemisphere: warm sky / cool ground */}
      <hemisphereLight args={['#1a1108', '#060610', 0.25]} />

      {/* ── 2.5D Depth Layers ── */}
      <BackgroundPlane />   {/* z: −30 — drifts down slowly */}
      <VillaSubject />      {/* z: −10 — kinetic slide-up   */}

      {/* ── Atmospheric particles ── */}
      <ParticleField />
    </>
  );
}
