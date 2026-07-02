import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Cloud, Clouds, Sparkles, Float, Text } from '@react-three/drei';
import { scrollState } from './scrollState';

// Fades out as scroll approaches 0.07 (hero HTML text fade-in point) to prevent overlap.
// Uses fillOpacity — the correct troika-three-text property (not material.opacity).
function FadingText({ children, ...props }) {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    const p = scrollState.progress;
    // 1 → 0 between p=0.04 and p=0.08
    const opacity = p < 0.04 ? 1 : p > 0.08 ? 0 : 1 - (p - 0.04) / 0.04;
    ref.current.fillOpacity    = opacity;
    ref.current.outlineOpacity = opacity;
  });
  return <Text ref={ref} {...props}>{children}</Text>;
}

export default function AtmosphericClouds() {
  return (
    <group>
      {/* Volumetric cloud layer — camera starts inside this at y=18 */}
      <Clouds material={THREE.MeshLambertMaterial}>
        {/* Lower band — camera starts INSIDE these */}
        <Cloud
          position={[-5, 17, -4]}
          segments={16}
          bounds={[10, 4, 6]}
          volume={5}
          color="#0e1d3a"
          opacity={0.45}
          speed={0.08}
        />
        <Cloud
          position={[6, 16, -7]}
          segments={14}
          bounds={[8, 3, 5]}
          volume={4}
          color="#0b1830"
          opacity={0.35}
          speed={0.06}
        />
        <Cloud
          position={[0, 18, -12]}
          segments={12}
          bounds={[9, 3.5, 6]}
          volume={4}
          color="#0f2040"
          opacity={0.4}
          speed={0.1}
        />
        {/* Upper band — background depth */}
        <Cloud
          position={[-4, 24, -10]}
          segments={18}
          bounds={[9, 4, 7]}
          volume={5}
          color="#1a3566"
          opacity={0.55}
          speed={0.12}
        />
        <Cloud
          position={[5, 22, -16]}
          segments={14}
          bounds={[7, 3, 6]}
          volume={4}
          color="#0e1f4a"
          opacity={0.4}
          speed={0.07}
        />
        <Cloud
          position={[0, 27, -20]}
          segments={16}
          bounds={[13, 5, 9]}
          volume={6}
          color="#13295c"
          opacity={0.5}
          speed={0.15}
        />
      </Clouds>

      {/* Star field — ambient depth particles */}
      <Sparkles
        count={250}
        size={0.5}
        scale={[32, 38, 22]}
        position={[0, 18, -10]}
        color="#5a9eff"
        speed={0.04}
        opacity={0.45}
        noise={0.3}
      />

      {/* Secondary sparkle cluster closer to the scene */}
      <Sparkles
        count={80}
        size={0.3}
        scale={[14, 12, 8]}
        position={[0, 22, -5]}
        color="#8ab8ff"
        speed={0.06}
        opacity={0.3}
        noise={0.5}
      />

      {/* Company name — floats in front of the building crown, fades before HTML hero appears */}
      <Float speed={0.6} floatIntensity={0.45} rotationIntensity={0.04}>
        <FadingText
          position={[0, 20.5, 3.5]}
          fontSize={2.4}
          color="#d4e8ff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.06}
          outlineWidth={0.012}
          outlineColor="#0a1628"
        >
          SalmanSaaS
        </FadingText>
      </Float>

      {/* Tagline — smaller, dimmer, floats slower */}
      <Float speed={0.45} floatIntensity={0.28} rotationIntensity={0.025}>
        <FadingText
          position={[0, 18.5, 3.5]}
          fontSize={0.58}
          color="#4a78bb"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.2}
        >
          ARABIC SAAS PLATFORM
        </FadingText>
      </Float>

      {/* Downward scroll hint — gently pulsing cone */}
      <Float speed={2} floatIntensity={0.6} rotationIntensity={0}>
        <mesh position={[0, 15.5, 3.5]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.12, 0.35, 8]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={1.2}
            toneMapped={false}
          />
        </mesh>
      </Float>
    </group>
  );
}
