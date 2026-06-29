import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3  uColor;
  varying vec2  vUv;

  void main() {
    // Animate grid toward camera by scrolling UV on Y
    vec2 uv = vec2(vUv.x * 24.0, vUv.y * 18.0 + uTime * 0.6);

    // Crisp grid lines via derivatives
    vec2 grid = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);
    float line = min(grid.x, grid.y);
    float alpha = 1.0 - clamp(line, 0.0, 1.0);

    // Depth fade: bright near camera (vUv.y → 0), dim at horizon (vUv.y → 1)
    float depth  = 1.0 - vUv.y * 0.92;
    // Edge fade: soften left/right borders
    float xFade  = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);

    alpha *= depth * xFade * 0.6;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

export default function CyberGrid() {
  const matRef = useRef();

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime:  { value: 0 },
          uColor: { value: new THREE.Color('#ff1a55') },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  matRef.current = material;

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh
      rotation={[-Math.PI * 0.42, 0, 0]}
      position={[0, -3.5, -2]}
    >
      <planeGeometry args={[50, 40, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
