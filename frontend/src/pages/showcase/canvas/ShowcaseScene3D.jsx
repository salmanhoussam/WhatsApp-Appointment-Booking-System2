import { Suspense } from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import CyberGrid from './CyberGrid';
import FloatingObjects from './FloatingObjects';
import ShowcaseCameraManager from './ShowcaseCameraManager';

export default function ShowcaseScene3D() {
  return (
    <>
      <color attach="background" args={['#050505']} />

      {/* Ambient fill */}
      <ambientLight intensity={0.15} />

      {/* Key neon light — in front, slightly above */}
      <pointLight position={[0, 4, 6]}  intensity={3}   color="#ff1a55" />
      {/* Fill from left */}
      <pointLight position={[-5, 2, 4]} intensity={1.2} color="#ff3366" />
      {/* Rim from behind */}
      <pointLight position={[0, -2, -8]} intensity={0.8} color="#220011" />

      <Suspense fallback={null}>
        <CyberGrid />
        <FloatingObjects />
        <ShowcaseCameraManager />
      </Suspense>

      <EffectComposer>
        <Bloom
          intensity={1.4}
          luminanceThreshold={0.35}
          luminanceSmoothing={0.85}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.15} darkness={0.85} />
      </EffectComposer>
    </>
  );
}
