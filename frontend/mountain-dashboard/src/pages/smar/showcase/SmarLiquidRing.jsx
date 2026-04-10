/**
 * SmarLiquidRing.jsx
 *
 * - خلفية سوداء
 * - الخاتم صغير (scale 0.55) مثبّت في مركز الشاشة
 * - يبرم فقط عند السكرول، ثابت تماماً بدونه
 * - لامع: MeshPhysicalMaterial + environment map
 * - الباكغراوند (صورة الجبل) تصعد للأعلى مع السكرول
 */

import { useRef, useEffect, useMemo, Suspense }      from 'react';
import { Canvas, useFrame }                           from '@react-three/fiber';
import { useTexture, Environment }                    from '@react-three/drei';
import { EffectComposer, Bloom, Vignette }            from '@react-three/postprocessing';
import { BlendFunction }                              from 'postprocessing';
import * as THREE                                     from 'three';

const RING_URL =
  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/smar_ring.png';

const BG_URL =
  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/beitsmar7.jpg';

// ─── Background plane — يصعد مع السكرول ──────────────────────────────────────
function BackgroundPlane({ scrollRef }) {
  const meshRef = useRef();
  const bgTex   = useTexture(BG_URL);

  useFrame(({ viewport }) => {
    if (!meshRef.current) return;
    const s = scrollRef.current; // 0 → 1
    // يصعد من y=0 إلى y=+4 مع السكرول
    meshRef.current.position.y = s * 4;
    meshRef.current.scale.set(viewport.width, viewport.height, 1);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -6]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={bgTex} depthWrite={false} />
    </mesh>
  );
}

// ─── Ring mesh — مثبّت في المركز، لامع ───────────────────────────────────────
function RingMesh({ scrollRef }) {
  const meshRef    = useRef();
  const ringTex    = useTexture(RING_URL);
  const rotationY  = useRef(0);

  useFrame(({ pointer }) => {
    if (!meshRef.current) return;

    const s = scrollRef.current; // 0 → 1

    // دوران Y فقط عند السكرول (0 = ثابت تماماً)
    rotationY.current += s * 0.06;
    meshRef.current.rotation.y = rotationY.current;

    // ميلان ناعم نحو الماوس دائماً (إحساس بالحياة)
    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      pointer.y * -0.15 + 0.18,
      0.04,
    );

    // الخاتم يبقى في المركز تماماً — لا حركة position
  });

  return (
    // scale 0.55 = 80% أصغر من الحجم الأصلي (3.4)
    <mesh ref={meshRef} position={[0, 0, 0]} scale={0.55}>
      <planeGeometry args={[3.4, 3.4]} />
      <meshStandardMaterial
        map={ringTex}
        transparent
        alphaTest={0.02}
        metalness={0.85}
        roughness={0.05}
        envMapIntensity={2.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── Particles ────────────────────────────────────────────────────────────────
function Particles() {
  const ref = useRef();

  const positions = useMemo(() => {
    const arr = new Float32Array(1600 * 3);
    for (let i = 0; i < 1600; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 14;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.010;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={1600}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#d4a853" transparent opacity={0.28} sizeAttenuation />
    </points>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function Scene({ scrollRef }) {
  return (
    <>
      {/* Environment map — يعطي الخاتم انعكاسات حقيقية */}
      <Environment preset="city" />

      <ambientLight intensity={0.06} />
      {/* ضوء ذهبي قوي من الأمام يجعل الخاتم لامعاً */}
      <pointLight position={[0,  0,  4]} color="#ffeecc" intensity={14} />
      <pointLight position={[2,  2,  3]} color="#d4a853" intensity={8}  />
      <pointLight position={[-2, -1,  2]} color="#8899ff" intensity={3}  />

      <BackgroundPlane scrollRef={scrollRef} />
      <RingMesh        scrollRef={scrollRef} />
      <Particles />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.15}
          intensity={2.0}
          blendFunction={BlendFunction.ADD}
        />
        <Vignette offset={0.20} darkness={0.88} />
      </EffectComposer>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SmarLiquidRing() {
  const scrollRef = useRef(0);

  useEffect(() => {
    document.body.style.height   = '400vh';
    document.body.style.overflow = 'auto';

    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      scrollRef.current = max > 0 ? window.scrollY / max : 0;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.body.style.height   = '';
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000' }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [0, 0, 5], fov: 68 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <Scene scrollRef={scrollRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}
