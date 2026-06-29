import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from './scrollState';

// Room: x(-2.2, 2.2), y(-1.5, 1.5), z(-3.5, 1.0)
const COUNT = 600;

export default function RoomReveal({ range, color }) {
  const meshRef = useRef();
  const dummy  = useMemo(() => new THREE.Object3D(), []);

  const { starts, targets } = useMemo(() => {
    const starts  = new Float32Array(COUNT * 3);
    const targets = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      // Chaotic start — scattered in a large volume
      starts[i * 3]     = (Math.random() - 0.5) * 14;
      starts[i * 3 + 1] = (Math.random() - 0.5) * 10;
      starts[i * 3 + 2] = (Math.random() - 0.5) * 14;

      // Target: one of 4 wall planes
      const plane = Math.floor(Math.random() * 4);
      const u = Math.random() - 0.5;
      const v = Math.random() - 0.5;

      switch (plane) {
        case 0: // back wall  z = -3.5
          targets[i * 3]     = u * 4.4;
          targets[i * 3 + 1] = v * 3.0;
          targets[i * 3 + 2] = -3.5;
          break;
        case 1: // left wall  x = -2.2
          targets[i * 3]     = -2.2;
          targets[i * 3 + 1] = v * 3.0;
          targets[i * 3 + 2] = u * 4.5 - 1.25;
          break;
        case 2: // right wall  x = 2.2
          targets[i * 3]     = 2.2;
          targets[i * 3 + 1] = v * 3.0;
          targets[i * 3 + 2] = u * 4.5 - 1.25;
          break;
        case 3: // floor  y = -1.5
          targets[i * 3]     = u * 4.4;
          targets[i * 3 + 1] = -1.5;
          targets[i * 3 + 2] = u * 4.5 - 1.25;
          break;
        default:
          break;
      }
    }

    return { starts, targets };
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;

    const p      = scrollState.progress;
    const [r0, r1] = range;
    const localT = Math.max(0, Math.min(1, (p - r0) / (r1 - r0)));

    // Visible during floor's range; walls form first half
    const visible = localT > 0 && localT < 0.95;
    meshRef.current.visible = visible;
    if (!visible) return;

    // Map first half (0→0.5) of localT to wall-formation t (0→1)
    const wallT = Math.min(localT * 2, 1);
    const t     = wallT * wallT * (3 - 2 * wallT); // smoothstep

    for (let i = 0; i < COUNT; i++) {
      dummy.position.set(
        starts[i * 3]     + (targets[i * 3]     - starts[i * 3])     * t,
        starts[i * 3 + 1] + (targets[i * 3 + 1] - starts[i * 3 + 1]) * t,
        starts[i * 3 + 2] + (targets[i * 3 + 2] - starts[i * 3 + 2]) * t,
      );
      dummy.scale.setScalar(0.035);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
    </instancedMesh>
  );
}
