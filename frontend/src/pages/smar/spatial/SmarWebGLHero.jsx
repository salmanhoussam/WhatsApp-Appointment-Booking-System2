/**
 * SmarWebGLHero.jsx  —  Active Theory-style WebGL Hero for Beit Smar
 *
 * Architecture (HTML / WebGL Hybrid):
 *   <div relative wrapper>
 *     ├── <Canvas absolute inset-0 z-0>
 *     │     ├── <ChaletPlane>   PlaneGeometry + custom GLSL ShaderMaterial
 *     │     │     • Vertex:   sine-wave ripple centered on mouse (uHover driven)
 *     │     │     • Fragment: UV lens-pull + per-channel RGB split + vignette
 *     │     └── <SceneEffects> EffectComposer → Vignette + ChromaticAberration + Noise
 *     └── <TextOverlay z-10>   Framer Motion stagger — "Creative Digital Experiences"
 *
 * Mouse flow:
 *   onMouseMove → mouseRef (Vec2, UV coords) → lerped into uMouse uniform @ 0.08/frame
 *   onMouseEnter/Leave → hoverRef (0|1)       → lerped into uHover  uniform @ 0.06/frame
 *
 * Perf notes (as per ملاحظة):
 *   - dpr capped at 1.5 to balance quality / GPU load
 *   - This component is intentionally isolated so it can be used only on landing pages
 *   - Booking forms and payment flows must remain in standard DOM
 */

import { Suspense, useRef, useCallback, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree }                        from '@react-three/fiber';
import { useTexture }                                        from '@react-three/drei';
import {
  EffectComposer,
  Vignette,
  Noise,
  ChromaticAberration,
}                                                            from '@react-three/postprocessing';
import { BlendFunction }                                     from 'postprocessing';
import { motion }                                            from 'framer-motion';
import * as THREE                                            from 'three';

// ─── Supabase asset ───────────────────────────────────────────────────────────
const CHALET_IMG =
  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/beitsmar1.jpg';

// ─── GLSL Shaders ─────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2  uMouse;   // UV-space mouse position [0, 1]
  uniform float uHover;   // 0 → 1 (smoothly lerped)
  varying vec2  vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Distance from current vertex UV to mouse UV
    float dist = distance(uv, uMouse);

    // Expanding ripple ring centered on mouse
    float ripple  = sin(dist * 28.0 - uTime * 5.5) * 0.044;
    // Falloff: strong near cursor, zero past 0.42 of UV space
    ripple       *= (1.0 - smoothstep(0.0, 0.42, dist));
    // Gate everything behind hover state
    ripple       *= uHover;

    pos.z += ripple;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform vec2  uMouse;
  uniform float uHover;
  uniform float uTime;
  varying vec2  vUv;

  void main() {
    vec2 uv = vUv;

    // Vector from current UV toward mouse
    vec2  toMouse = uMouse - uv;
    float dist    = length(toMouse);

    // Lens-pull: UVs near mouse warp toward it (like a bulge lens)
    float pull = uHover * 0.065 * (1.0 - smoothstep(0.0, 0.48, dist));
    uv += toMouse * pull;

    // Per-channel chromatic aberration — splits R and B along mouse direction
    float aberration = uHover * 0.009;
    vec2  axis       = normalize(toMouse + vec2(0.0001)); // safe normalize
    float r = texture2D(uTexture, uv + axis * aberration).r;
    float g = texture2D(uTexture, uv                    ).g;
    float b = texture2D(uTexture, uv - axis * aberration).b;

    // Edge vignette (always on, subtle)
    float edgeDist = length(vUv - 0.5);
    float vignette = 1.0 - smoothstep(0.36, 1.1, edgeDist * 1.65);

    gl_FragColor = vec4(r, g, b, 1.0) * (0.78 + vignette * 0.22);
  }
`;

// ─── Chalet Shader Plane ──────────────────────────────────────────────────────
function ChaletPlane({ mouseRef, hoverRef }) {
  const texture  = useTexture(CHALET_IMG);
  const { viewport } = useThree();

  // Build ShaderMaterial once; update texture after load
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime:    { value: 0 },
          uTexture: { value: null },
          uMouse:   { value: new THREE.Vector2(0.5, 0.5) },
          uHover:   { value: 0 },
        },
      }),
    [],
  );

  // Inject texture once it resolves (useTexture suspends, so it's ready here)
  useEffect(() => {
    material.uniforms.uTexture.value = texture;
  }, [texture, material]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime();

    // Smooth mouse tracking (lerp toward real mouse position)
    material.uniforms.uMouse.value.lerp(mouseRef.current, 0.085);

    // Smooth hover state transition
    material.uniforms.uHover.value = THREE.MathUtils.lerp(
      material.uniforms.uHover.value,
      hoverRef.current,
      0.062,
    );
  });

  return (
    // Scale a unit plane to fill the viewport exactly
    <mesh scale={[viewport.width, viewport.height, 1]} material={material}>
      {/*
        128 × 128 segments — enough resolution for the sine-wave ripple
        to look smooth at typical screen sizes.
      */}
      <planeGeometry args={[1, 1, 128, 128]} />
    </mesh>
  );
}

// ─── Post-processing stack ────────────────────────────────────────────────────
function SceneEffects() {
  return (
    <EffectComposer>
      {/* Subtle film grain — adds cinematic texture */}
      <Noise
        premultiply
        blendFunction={BlendFunction.ADD}
        opacity={0.022}
      />
      {/* Post chromatic aberration (scene-wide, always on at low intensity) */}
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(0.0004, 0.0004)}
        radialModulation={false}
      />
      {/* Corner vignette */}
      <Vignette
        eskil={false}
        offset={0.12}
        darkness={0.72}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

// ─── Full R3F scene (inside Suspense boundary) ────────────────────────────────
function ChaletScene({ mouseRef, hoverRef }) {
  return (
    <>
      <ChaletPlane mouseRef={mouseRef} hoverRef={hoverRef} />
      <SceneEffects />
    </>
  );
}

// ─── Framer Motion text overlay ───────────────────────────────────────────────
const WORDS = ['Creative', 'Digital', 'Experiences'];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.14, delayChildren: 0.6 },
  },
};

const wordVariants = {
  hidden:  { opacity: 0, y: 72, rotateX: 30, filter: 'blur(8px)' },
  visible: {
    opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 65, damping: 18, mass: 1.2 },
  },
};

const eyebrowVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: {
    opacity: 1, y: 0,
    transition: { delay: 0.3, duration: 0.7, ease: 'easeOut' },
  },
};

const subVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { delay: 1.05, duration: 0.9 } },
};

function TextOverlay() {
  return (
    <div
      style={{
        position:       'absolute',
        inset:          0,
        zIndex:         10,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        pointerEvents:  'none',
        padding:        '0 24px',
        textAlign:      'center',
      }}
    >
      {/* Eyebrow label */}
      <motion.p
        variants={eyebrowVariants}
        initial="hidden"
        animate="visible"
        style={{
          fontSize:      10,
          letterSpacing: '0.34em',
          color:         'rgba(212,168,83,0.80)',
          textTransform: 'uppercase',
          marginBottom:  22,
        }}
      >
        Beit Smar · Lebanon · Est. WebGL
      </motion.p>

      {/* Staggered headline words */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          display:     'flex',
          gap:         '0.28em',
          flexWrap:    'wrap',
          justifyContent: 'center',
          perspective: '900px',
        }}
      >
        {WORDS.map((word) => (
          <motion.span
            key={word}
            variants={wordVariants}
            style={{
              display:        'inline-block',
              fontSize:       'clamp(44px, 8.5vw, 108px)',
              fontWeight:     900,
              color:          '#ffffff',
              letterSpacing:  '-0.03em',
              lineHeight:     1,
              textShadow:     '0 6px 48px rgba(0,0,0,0.55)',
              transformOrigin: 'top center',
            }}
          >
            {word}
          </motion.span>
        ))}
      </motion.div>

      {/* Sub-line */}
      <motion.p
        variants={subVariants}
        initial="hidden"
        animate="visible"
        style={{
          fontSize:   'clamp(14px, 1.6vw, 17px)',
          color:      'rgba(255,255,255,0.45)',
          marginTop:  28,
          lineHeight: 1.7,
          maxWidth:   480,
        }}
      >
        Where the mountain meets the Mediterranean —
        a private estate carved in Lebanese stone.
      </motion.p>

      {/* Hover hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        style={{
          position:      'absolute',
          bottom:        36,
          fontSize:      9,
          letterSpacing: '0.30em',
          color:         'rgba(255,255,255,0.22)',
          textTransform: 'uppercase',
        }}
      >
        Move cursor to interact
      </motion.p>
    </div>
  );
}

// ─── Default export — page-level compositor ───────────────────────────────────
export default function SmarWebGLHero() {
  // Use refs (not state) so updates never trigger a re-render
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const hoverRef = useRef(0);

  const handleMouseMove = useCallback((e) => {
    // Convert screen pixels → UV [0,1] (Y flipped for GL convention)
    mouseRef.current.set(
      e.clientX / window.innerWidth,
      1 - e.clientY / window.innerHeight,
    );
  }, []);

  return (
    <div
      style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => { hoverRef.current = 1; }}
      onMouseLeave={() => { hoverRef.current = 0; }}
    >
      {/* ── WebGL Canvas — stays behind HTML overlay ── */}
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}  // cap at 1.5× — no need to overdraw on retina for perf
      >
        <Suspense fallback={null}>
          <ChaletScene mouseRef={mouseRef} hoverRef={hoverRef} />
        </Suspense>
      </Canvas>

      {/* ── Framer Motion text — sits above canvas ── */}
      <TextOverlay />
    </div>
  );
}
