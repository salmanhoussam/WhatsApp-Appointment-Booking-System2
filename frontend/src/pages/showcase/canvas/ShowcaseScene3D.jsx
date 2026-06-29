import { Suspense } from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import CyberGrid             from './CyberGrid';
import BuildingTower         from './BuildingTower';
import ShowcaseCameraManager from './ShowcaseCameraManager';

export default function ShowcaseScene3D() {
  return (
    <>
      <color attach="background" args={['#050505']} />

      {/* Ambient fill — kept very low so emissive colours dominate */}
      <ambientLight intensity={0.08} />

      {/* Per-floor key lights — fixed positions, always on */}
      <pointLight position={[0, 14, 2]} intensity={5}   color="#ff1a55" />
      <pointLight position={[0,  6, 2]} intensity={4}   color="#f59e0b" />
      <pointLight position={[0,  0, 2]} intensity={4}   color="#8b5cf6" />

      {/* Exit-CTA fill — bottom wide */}
      <pointLight position={[0, -3, 8]} intensity={2} color="#ffffff" />

      <Suspense fallback={null}>
        <CyberGrid />
        <BuildingTower />
        <ShowcaseCameraManager />
      </Suspense>

      <EffectComposer>
        <Bloom
          intensity={1.8}
          luminanceThreshold={0.28}
          luminanceSmoothing={0.85}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.15} darkness={0.92} />
      </EffectComposer>
    </>
  );
}
