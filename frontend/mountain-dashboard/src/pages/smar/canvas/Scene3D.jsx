import { Suspense } from 'react';
import { Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import CameraManager from './CameraManager';

/**
 * Scene3D — the full 3D scene rendered inside the R3F Canvas.
 *
 * Layers:
 *  - Lighting: ambientLight + gold pointLight
 *  - Environment: city preset (reflections)
 *  - CameraManager: reads scrollProgress → drives camera path
 *  - Post-processing: Bloom + Vignette
 */
export default function Scene3D() {
  return (
    <>
      {/* ── Lighting ── */}
      <ambientLight intensity={0.4} />
      <pointLight
        position={[5, 5, 5]}
        intensity={2}
        color="#d4a853"
      />
      <pointLight
        position={[-4, -3, -4]}
        intensity={0.6}
        color="#7a5c2a"
      />

      {/* ── Environment (city HDR for metallic reflections) ── */}
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>

      {/* ── Camera logic (no mesh) ── */}
      <CameraManager />

      {/* ── Post-processing ── */}
      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.1} darkness={0.7} />
      </EffectComposer>
    </>
  );
}
