import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from './scrollState';

const COUNT = 400;

// Render Arabic text to offscreen canvas, sample bright pixel positions
function sampleTextPositions(text) {
  const W = 512, H = 72;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle    = '#fff';
  ctx.font         = 'bold 22px Cairo, Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction    = 'rtl';
  ctx.fillText(text, W / 2, H / 2);

  const { data } = ctx.getImageData(0, 0, W, H);
  const pts = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4] > 100) {
        // Map canvas coords → 3D local space, in front of back wall
        pts.push([
          (x / W - 0.5) * 4.4,   // x: -2.2 … 2.2
          -(y / H - 0.5) * 1.4,  // y: -0.7 … 0.7 (flipped for screen→world)
          -1.6,                    // z: just in front of back wall at -3.5
        ]);
      }
    }
  }

  // Fallback — scattered strip so scene never breaks if font is missing
  if (pts.length < 20) {
    for (let i = 0; i < 200; i++) {
      pts.push([(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 0.5, -1.6]);
    }
  }

  return pts;
}

export default function TextParticles({ range, titleAr, color }) {
  const meshRef = useRef();
  const dummy   = useMemo(() => new THREE.Object3D(), []);

  const { starts, targets } = useMemo(() => {
    const pts     = sampleTextPositions(titleAr);
    const targets = new Float32Array(COUNT * 3);
    const starts  = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      const p = pts[Math.floor(Math.random() * pts.length)];
      targets[i * 3]     = p[0];
      targets[i * 3 + 1] = p[1];
      targets[i * 3 + 2] = p[2];

      // Scattered starting positions inside the room volume
      starts[i * 3]     = (Math.random() - 0.5) * 5;
      starts[i * 3 + 1] = (Math.random() - 0.5) * 3;
      starts[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }

    return { starts, targets };
  }, [titleAr]);

  useFrame(() => {
    if (!meshRef.current) return;

    const p      = scrollState.progress;
    const [r0, r1] = range;
    const localT = Math.max(0, Math.min(1, (p - r0) / (r1 - r0)));

    // Activate only in second half of floor's range
    const active = localT > 0.45 && localT < 1;
    meshRef.current.visible = active;
    if (!active) return;

    const textT = (localT - 0.45) / 0.55;
    const t     = textT * textT * (3 - 2 * textT); // smoothstep

    for (let i = 0; i < COUNT; i++) {
      dummy.position.set(
        starts[i * 3]     + (targets[i * 3]     - starts[i * 3])     * t,
        starts[i * 3 + 1] + (targets[i * 3 + 1] - starts[i * 3 + 1]) * t,
        starts[i * 3 + 2] + (targets[i * 3 + 2] - starts[i * 3 + 2]) * t,
      );
      dummy.scale.setScalar(0.028);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.5}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
