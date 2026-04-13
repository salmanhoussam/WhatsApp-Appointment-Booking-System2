/**
 * Scene3D.jsx  —  Phase 30: Z-Axis Cinematic Flight
 *
 * Step 1: Camera Rig — z=5 → z=-35 via scroll.
 * Step 2: Supabase image planes placed along the Z corridor.
 *
 * Scene layout:
 *   z:  0   Ring portal (4×4, transparent PNG)
 *   z: -10  Chalets top view (8×5, offset left)
 *   z: -20  Pool & terrace (8×5, offset right)
 *   z: -32  Grand finale sea view (20×12, centered)
 *
 * FogExp2 hides far planes until the camera approaches.
 */

import { useRef, useMemo, useEffect }  from 'react';
import { useFrame, useThree }          from '@react-three/fiber';
import { useScroll, Image }            from '@react-three/drei';
import * as THREE                      from 'three';

// ─── Camera Rig ───────────────────────────────────────────────────────────────
// Drives camera.position.z from +5 to -35 based on scroll offset.
// Also reports progress back to the parent via onProgress callback.
function CameraRig({ onProgress }) {
  const scroll = useScroll();

  useFrame(({ camera }) => {
    const s = scroll.offset; // 0 → 1
    onProgress(s);

    // Z-axis flight path: 5 → -35
    camera.position.z = THREE.MathUtils.lerp(5, -35, s);

    // Gentle X/Y sway for cinematic feel
    camera.position.x = Math.sin(s * Math.PI * 0.8) * 0.6;
    camera.position.y = Math.sin(s * Math.PI * 0.5) * 0.3;

    // Always look slightly ahead of current position
    camera.lookAt(camera.position.x * 0.3, 0, camera.position.z - 8);
  });

  return null;
}

// ─── Fog injector ─────────────────────────────────────────────────────────────
// Sets FogExp2 on the scene so distant planes fade to black naturally.
function SceneFog() {
  const { scene } = useThree();

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#0a0a0f', 0.045);
    scene.background = new THREE.Color('#0a0a0f');
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene]);

  return null;
}

// ─── Gold particle corridor ──────────────────────────────────────────────────
// Particles distributed along Z=-5 to Z=-40 so they stream past during flight.
function ParticleCorridor() {
  const COUNT = 2500;
  const ref   = useRef();

  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // Spread in a wide tunnel around the flight path
      pos[i * 3]     = (Math.random() - 0.5) * 16;   // X: ±8
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;   // Y: ±6
      pos[i * 3 + 2] = 5 - Math.random() * 50;        // Z: +5 → -45
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    // Very slow rotation so particles feel alive but not distracting
    ref.current.rotation.z = clock.getElapsedTime() * 0.008;
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
        size={0.035}
        color="#d4a853"
        transparent
        opacity={0.38}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ─── Supabase asset URLs ──────────────────────────────────────────────────────
const ASSETS = {
  ring:    'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/smar_ring.png',
  chalets: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/smar-showcase/chalet-top-view.jpeg',
  pool:    'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/pool.png',
  finale:  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/beitsmar3.jpg',
};

// ─── Default export ───────────────────────────────────────────────────────────
export default function Scene3D({ onProgress }) {
  return (
    <>
      <CameraRig onProgress={onProgress} />
      <SceneFog />

      {/* Lighting — warm gold front, cool blue back, soft ambient */}
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 6]}   color="#d4a853" intensity={3}   />
      <pointLight position={[0, 0, -20]} color="#6688ff" intensity={1.5} />
      <pointLight position={[0, 0, -34]} color="#d4a853" intensity={4}   />

      {/* ── Plane 1: The Portal — Smar Ring (z: 0) ── */}
      <Image
        url={ASSETS.ring}
        position={[0, 0, 0]}
        scale={[4, 4]}
        transparent
        toneMapped={false}
      />

      {/* ── Plane 2: The Chalets — top view (z: -10, offset left) ── */}
      <Image
        url={ASSETS.chalets}
        position={[-3.5, 0.5, -10]}
        scale={[8, 5]}
        transparent
        toneMapped={false}
      />

      {/* ── Plane 3: The Pool & Terrace (z: -20, offset right) ── */}
      <Image
        url={ASSETS.pool}
        position={[3.5, -0.5, -20]}
        scale={[8, 5]}
        transparent
        toneMapped={false}
      />

      {/* ── Plane 4: Grand Finale — Sea & Mountains (z: -32, massive) ── */}
      <Image
        url={ASSETS.finale}
        position={[0, 0, -32]}
        scale={[20, 12]}
        transparent
        toneMapped={false}
      />

      {/* Gold dust corridor — spatial depth cues */}
      <ParticleCorridor />
    </>
  );
}
