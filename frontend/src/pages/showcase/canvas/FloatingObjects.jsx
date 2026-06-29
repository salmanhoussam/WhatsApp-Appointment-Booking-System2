import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from './scrollState';

const BRAND = '#ff1a55';
const ACCENT = '#ff3377';

// Primary hero cube — large, front and centre
function HeroCube() {
  const ref = useRef();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = scrollState.progress;
    ref.current.rotation.x = -0.4 + t * 0.08 + p * 0.6;
    ref.current.rotation.y = t * 0.14;
    ref.current.rotation.z = scrollState.mouseX * 0.18;
    ref.current.position.y = 0.3 + Math.sin(t * 0.6) * 0.25 - p * 3;
    ref.current.position.x = 2.6 + scrollState.mouseX * -0.4;
    ref.current.position.z = -3 - p * 4;
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[2.2, 2.2, 2.2]} />
      <meshStandardMaterial
        color={BRAND}
        emissive={BRAND}
        emissiveIntensity={0.45}
        roughness={0.08}
        metalness={0.92}
      />
    </mesh>
  );
}

// Secondary torus — left of hero
function FloatingTorus() {
  const ref = useRef();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = scrollState.progress;
    ref.current.rotation.x = t * 0.22;
    ref.current.rotation.z = t * 0.14;
    ref.current.position.y = 0.5 + Math.sin(t * 0.4 + 1.2) * 0.3 - p * 2;
    ref.current.position.z = -5 - p * 3;
  });

  return (
    <mesh ref={ref} position={[-3, 0.5, -5]}>
      <torusGeometry args={[1.1, 0.28, 16, 60]} />
      <meshStandardMaterial
        color={ACCENT}
        emissive={ACCENT}
        emissiveIntensity={0.3}
        roughness={0.1}
        metalness={0.85}
        wireframe
      />
    </mesh>
  );
}

// Accent icosahedron — bottom right
function FloatingGem() {
  const ref = useRef();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = scrollState.progress;
    ref.current.rotation.y = t * 0.3;
    ref.current.rotation.x = t * 0.18;
    ref.current.position.y = -1.5 + Math.sin(t * 0.35 + 2.5) * 0.2 - p * 2;
    ref.current.position.z = -7 - p * 2;
  });

  return (
    <mesh ref={ref} position={[3.8, -1.5, -7]}>
      <icosahedronGeometry args={[0.9, 0]} />
      <meshStandardMaterial
        color="#cc0033"
        emissive="#cc0033"
        emissiveIntensity={0.5}
        roughness={0.0}
        metalness={1}
      />
    </mesh>
  );
}

export default function FloatingObjects() {
  return (
    <group>
      <HeroCube />
      <FloatingTorus />
      <FloatingGem />
    </group>
  );
}
