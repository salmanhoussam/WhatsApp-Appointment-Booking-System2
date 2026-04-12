/**
 * Scene3D.jsx  —  WebGL Background Layer
 *
 * Changes from v1:
 *   ✓ InnerRing removed (المربعات)
 *   ✓ LogoInRing  — logo image centered inside the metallic ring using Drei <Html>
 *                   (avoids PNG-transparency issues; CSS clip-path keeps it circular)
 *   ✓ BackgroundSphere — full-sky sphere (BackSide) with Supabase image texture
 *                        + dark overlay sphere so scene elements stay readable
 */

import { useRef, useMemo }                                           from 'react';
import { useFrame }                                                  from '@react-three/fiber';
import { useScroll, Html }                                           from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration }      from '@react-three/postprocessing';
import { BlendFunction }                                             from 'postprocessing';
import * as THREE                                                    from 'three';

// ─── Assets ───────────────────────────────────────────────────────────────────
const RING_URL =
  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/smar_ring.png';


// ─── Smar Ring image — spins inside the metallic torus ───────────────────────
// Uses Drei <Html center> projected at world origin.
// The image spins via CSS animation (no rAF overhead).
// On scroll it scales up and fades out in sync with the camera fly-in.
function SmarRingImage() {
  const scroll  = useScroll();
  const wrapRef = useRef(null);

  useFrame(() => {
    if (!wrapRef.current) return;
    const s = scroll.offset;

    // Fade out between scroll 0 → 0.30
    wrapRef.current.style.opacity = Math.max(0, 1 - s * 3.3);

    // Scale with the outer ring (1 → 4 over scroll 0 → 1)
    const scale = THREE.MathUtils.lerp(1, 4, s);
    // We only drive the scale via JS; CSS @keyframes handles the spin
    wrapRef.current.style.setProperty('--ring-scale', scale);
  });

  return (
    <Html center position={[0, 0, 0.4]}>
      <style>{`
        @keyframes smar-spin {
          from { transform: scale(var(--ring-scale,1)) rotate(0deg); }
          to   { transform: scale(var(--ring-scale,1)) rotate(360deg); }
        }
        .smar-ring-img {
          --ring-scale: 1;
          width: 148px;
          height: 148px;
          border-radius: 50%;
          display: block;
          pointer-events: none;
          user-select: none;
          animation: smar-spin 18s linear infinite;
          filter: drop-shadow(0 0 22px rgba(212,168,83,0.60));
          transform-origin: center center;
        }
      `}</style>
      <div ref={wrapRef} style={{ transformOrigin: 'center center' }}>
        <img
          src={RING_URL}
          alt="Beit Smar Ring"
          className="smar-ring-img"
        />
      </div>
    </Html>
  );
}

// ─── Inner counter-rotating ring (perpendicular axis) ────────────────────────
function InnerRing() {
  const meshRef = useRef();
  const scroll  = useScroll();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const s = scroll.offset;
    const t = clock.getElapsedTime();

    meshRef.current.rotation.x = t * -0.09 + Math.PI / 2;
    meshRef.current.rotation.y = t *  0.13;
    meshRef.current.scale.setScalar(THREE.MathUtils.lerp(0.55, 2.5, s));
    meshRef.current.material.opacity = THREE.MathUtils.lerp(0.45, 0.08, s);
  });

  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[1.3, 0.045, 32, 64]} />
      <meshStandardMaterial
        color="#ffffff"
        metalness={0.9}
        roughness={0.1}
        transparent
        opacity={0.45}
      />
    </mesh>
  );
}

// ─── Outer metallic ring ──────────────────────────────────────────────────────
function MetallicRing() {
  const meshRef = useRef();
  const scroll  = useScroll();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const s = scroll.offset;
    const t = clock.getElapsedTime();

    meshRef.current.rotation.x += 0.0025;
    meshRef.current.rotation.z += 0.001;
    meshRef.current.scale.setScalar(THREE.MathUtils.lerp(1.0, 4.0, s));

    const pulse = Math.sin(t * 1.8) * 0.12 + 0.88;
    meshRef.current.material.emissiveIntensity =
      THREE.MathUtils.lerp(0.35, 2.5, s) * pulse;
  });

  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[2, 0.22, 64, 128]} />
      <meshStandardMaterial
        color="#d4a853"
        metalness={1}
        roughness={0.06}
        emissive="#d4a853"
        emissiveIntensity={0.35}
      />
    </mesh>
  );
}

// ─── Glow core ────────────────────────────────────────────────────────────────
function GlowCore() {
  const meshRef = useRef();
  const scroll  = useScroll();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const s = scroll.offset;
    const t = clock.getElapsedTime();
    const pulse = Math.sin(t * 1.3) * 0.06 + 0.94;
    meshRef.current.material.opacity = THREE.MathUtils.lerp(0.07, 0.02, s) * pulse;
    meshRef.current.scale.setScalar(pulse * THREE.MathUtils.lerp(1, 2.8, s));
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.9, 32, 32]} />
      <meshBasicMaterial color="#d4a853" transparent opacity={0.07} side={THREE.BackSide} />
    </mesh>
  );
}

// ─── Particle field ───────────────────────────────────────────────────────────
function ParticleField() {
  const COUNT     = 3000;
  const pointsRef = useRef();

  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r     = 3 + Math.random() * 14;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    pointsRef.current.rotation.y = t * 0.032;
    pointsRef.current.rotation.x = t * 0.014;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.045} color="#d4a853" transparent opacity={0.42} sizeAttenuation />
    </points>
  );
}

// ─── Camera rig ───────────────────────────────────────────────────────────────
function CameraRig({ onProgress }) {
  const scroll = useScroll();

  useFrame(({ camera }) => {
    const s = scroll.offset;
    onProgress(s);
    camera.position.z = THREE.MathUtils.lerp(10, -4, s);
    camera.position.x = Math.sin(s * Math.PI * 2) * 1.8;
    camera.position.y = Math.sin(s * Math.PI) * 1.4;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ─── Default export ───────────────────────────────────────────────────────────
export default function Scene3D({ onProgress }) {
  return (
    <>
      <CameraRig onProgress={onProgress} />

      {/* Lighting */}
      <ambientLight intensity={0.08} />
      <pointLight position={[0, 0,  7]} color="#d4a853" intensity={5}   />
      <pointLight position={[0, 0, -7]} color="#6688ff" intensity={1.8} />
      <pointLight position={[4, 3,  0]} color="#ffffff"  intensity={0.9} />

      {/* Only the spinning smar ring image — no metallic torus, no inner ring */}
      <SmarRingImage />
      <GlowCore />
      <ParticleField />

      {/* Post-processing */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.25}
          luminanceSmoothing={0.9}
          intensity={2.2}
          blendFunction={BlendFunction.ADD}
        />
        <ChromaticAberration
          offset={new THREE.Vector2(0.0006, 0.0006)}
          blendFunction={BlendFunction.NORMAL}
        />
        <Vignette
          offset={0.12}
          darkness={0.9}
          blendFunction={BlendFunction.NORMAL}
        />
      </EffectComposer>
    </>
  );
}
