/**
 * Scene3D.jsx  —  Phase 32: Procedural Terrain + Drone Flight over Beit Smar Estate
 *
 * Estate layout (matches client satellite map, Z-axis = depth into estate):
 *
 *   z: +10   Camera start — above the entrance
 *   z:   0   Frame 1: Villas       (x:+3, right side of estate)
 *   z: -15   Frame 2: Chalets      (x:−2, left / mountain side)
 *   z: -30   Frame 3: Pool & Café  (x:+1, centre pool terrace)
 *   z: -48   Frame 4: Sea Horizon  (x: 0, massive finale frame)
 *   z: -50   Camera end — hovering over the sea
 *
 * Terrain:
 *   PlaneGeometry(100, 150, 64, 64), rotated horizontal via mesh prop.
 *   Vertices animated every frame (useFrame) with multi-octave sin/cos waves
 *   → gentle, living mountain ridges streaming beneath the drone.
 *   Material: gold wireframe (#d4a853), opacity 0.15, transparent.
 *
 * Drone path (camera Y):
 *   Start  Y=2 (above entrance) → dip to Y=0 (low pass over chalets) → rise to Y=3 (sea horizon)
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree }         from '@react-three/fiber';
import { useScroll, Image }           from '@react-three/drei';
import * as THREE                     from 'three';

// ─── Asset URLs ───────────────────────────────────────────────────────────────
const ASSETS = {
  villas:  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/frontveiwvilla.png',
  chalets: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/smar-showcase/chalet-top-view.jpeg',
  pool:    'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/pool.png',
  sea:     'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/beitsmar7.jpg',
};

// ─── Procedural Terrain ───────────────────────────────────────────────────────
// PlaneGeometry lives in local X-Y plane; mesh rotates it horizontal.
// useFrame animates the geometry's Z attribute (= world-Y after rotation)
// producing a living, gently undulating mountain landscape.
function ProceduralTerrain() {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t   = clock.getElapsedTime() * 0.4; // slow drift — feels geological
    const pos = meshRef.current.geometry.attributes.position;
    const n   = pos.count;

    for (let i = 0; i < n; i++) {
      const x = pos.getX(i); // −50 … +50   (estate width)
      const y = pos.getY(i); // −75 … +75   (estate depth)

      // Four-octave fake noise — broad ridges + fine detail + gentle time drift
      const z =
        2.0 * Math.sin(x * 0.13 + t * 0.22 + 1.10) * Math.cos(y * 0.10 + t * 0.16) +
        1.4 * Math.sin(x * 0.31 + t * 0.14 + 2.40) * Math.cos(y * 0.27 + t * 0.20) +
        0.7 * Math.sin(x * 0.68 + t * 0.28 + 0.50) * Math.cos(y * 0.58 + t * 0.24) +
        2.5 * Math.sin(x * 0.08 + 3.00)             * Math.sin(y * 0.06 + 1.90);   // large static ridge

      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    // Skip computeVertexNormals — not needed for wireframe rendering
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -3, -20]}
    >
      <planeGeometry args={[100, 150, 64, 64]} />
      <meshStandardMaterial
        color="#d4a853"
        wireframe={true}
        transparent
        opacity={0.15}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Gallery Frame Border ─────────────────────────────────────────────────────
// Three-layer museum frame: outer glow halo → gold border ring → dark inset mat.
function GalleryFrame({ position, size }) {
  const [w, h]   = size;
  const B        = 0.12; // border width
  const GLOW     = 0.08; // extra halo

  return (
    <group position={position}>
      {/* Outer gold halo */}
      <mesh position={[0, 0, -0.08]}>
        <planeGeometry args={[w + (B + GLOW) * 2, h + (B + GLOW) * 2]} />
        <meshBasicMaterial color="#d4a853" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      {/* Gold border ring */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[w + B * 2, h + B * 2]} />
        <meshBasicMaterial color="#c99a42" transparent opacity={0.80} />
      </mesh>
      {/* Dark mat inset */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[w + B * 0.5, h + B * 0.5]} />
        <meshBasicMaterial color="#05050a" />
      </mesh>
    </group>
  );
}

// ─── Drone Camera Rig ─────────────────────────────────────────────────────────
// Z path:  +10  →  -50   (60 units, entire estate + sea)
// Y path:   2   →  0  →   3  (dip on approach, rise at sea)
// X path:  gentle sin sway (changes direction twice for cinematic feel)
function CameraRig({ onProgress }) {
  const scroll = useScroll();

  useFrame(({ camera }) => {
    const s = scroll.offset; // 0 → 1
    onProgress(s);

    // ── Z: steady flight through the estate ──
    camera.position.z = THREE.MathUtils.lerp(10, -50, s);

    // ── Y: drone dip — piecewise curve ──
    //   s 0.00 → 0.35: descend 2 → 0  (flying in low over the chalets)
    //   s 0.35 → 1.00: ascend  0 → 3  (pulling up to reveal the sea horizon)
    if (s < 0.35) {
      camera.position.y = THREE.MathUtils.lerp(2.0, 0.2, s / 0.35);
    } else {
      camera.position.y = THREE.MathUtils.lerp(0.2, 3.0, (s - 0.35) / 0.65);
    }

    // ── X: two-phase sway — leans toward each frame ──
    camera.position.x = Math.sin(s * Math.PI * 1.6) * 0.75;

    // ── Look slightly ahead + toward frame height ──
    camera.lookAt(
      camera.position.x * 0.30,
      1.8,
      camera.position.z - 10,
    );
  });

  return null;
}

// ─── Scene Fog & Background ───────────────────────────────────────────────────
function SceneEnvironment() {
  const { scene } = useThree();

  useEffect(() => {
    scene.fog        = new THREE.FogExp2('#0a0a0f', 0.030); // softer fog for deeper scene
    scene.background = new THREE.Color('#0a0a0f');
    return () => {
      scene.fog        = null;
      scene.background = null;
    };
  }, [scene]);

  return null;
}

// ─── Gold Particle Corridor ───────────────────────────────────────────────────
// Covers the full drone path Z +12 → -55, clustered tighter around flight axis.
function ParticleCorridor() {
  const COUNT = 3000;
  const ref   = useRef();

  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 20; // X ±10
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12; // Y ±6
      pos[i * 3 + 2] = 12 - Math.random() * 68;     // Z +12 → -56
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * 0.006;
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
        size={0.030}
        color="#d4a853"
        transparent
        opacity={0.32}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ─── Scene3D (default export) ─────────────────────────────────────────────────
export default function Scene3D({ onProgress }) {
  return (
    <>
      <CameraRig    onProgress={onProgress} />
      <SceneEnvironment />

      {/* ── Lighting ──────────────────────────────────────────────── */}
      {/* Warm entrance light — hits the villa frame */}
      <pointLight position={[3,  3,  2]}  color="#d4a853" intensity={4.0} distance={28} />
      {/* Mountain blue accent — mid corridor over chalets */}
      <pointLight position={[-2, 4, -14]} color="#4466cc" intensity={2.0} distance={32} />
      {/* Pool terrace warm fill */}
      <pointLight position={[1,  3, -30]} color="#d4a853" intensity={3.0} distance={28} />
      {/* Grand sea horizon climax — floods the finale frame */}
      <pointLight position={[0,  6, -46]} color="#ffffff" intensity={6.0} distance={30} />
      {/* Global fill — keeps terrain from going pure black */}
      <ambientLight intensity={0.10} />
      {/* Hemisphere: warm sky / cool earth bounce */}
      <hemisphereLight args={['#1a1108', '#060610', 0.28]} />

      {/* ── Animated Wireframe Terrain ────────────────────────────── */}
      <ProceduralTerrain />

      {/* ══════════════════════════════════════════════════════════════
          FRAME 1 — VILLAS   (entrance, right side, z:0, x:+3)
      ══════════════════════════════════════════════════════════════ */}
      <GalleryFrame position={[3, 2.2, 0]}  size={[7, 4.5]} />
      <Image
        url={ASSETS.villas}
        position={[3, 2.2, 0]}
        scale={[7, 4.5]}
        transparent
        toneMapped={false}
      />

      {/* ══════════════════════════════════════════════════════════════
          FRAME 2 — CHALETS   (mountain side, z:−15, x:−2)
      ══════════════════════════════════════════════════════════════ */}
      <GalleryFrame position={[-2, 2.0, -15]} size={[7, 4.5]} />
      <Image
        url={ASSETS.chalets}
        position={[-2, 2.0, -15]}
        scale={[7, 4.5]}
        transparent
        toneMapped={false}
      />

      {/* ══════════════════════════════════════════════════════════════
          FRAME 3 — POOL & CAFETERIA   (centre terrace, z:−30, x:+1)
      ══════════════════════════════════════════════════════════════ */}
      <GalleryFrame position={[1, 2.0, -30]} size={[7, 4.5]} />
      <Image
        url={ASSETS.pool}
        position={[1, 2.0, -30]}
        scale={[7, 4.5]}
        transparent
        toneMapped={false}
      />

      {/* ══════════════════════════════════════════════════════════════
          FRAME 4 — SEA HORIZON   (finale, massive, z:−48, x:0)
      ══════════════════════════════════════════════════════════════ */}
      <GalleryFrame position={[0, 3.0, -48]} size={[24, 14]} />
      <Image
        url={ASSETS.sea}
        position={[0, 3.0, -48]}
        scale={[24, 14]}
        transparent
        toneMapped={false}
      />

      {/* ── Gold particle corridor ──────────────────────────────────── */}
      <ParticleCorridor />
    </>
  );
}
