import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useSmarStore } from '../store/useSmarStore';

/**
 * FloatingLogo — smar_logo.png على سطح 3D.
 * يظهر فقط في آخر الصفحة (scrollProgress > 0.75) ويختفي قبلها.
 * opacity: 0→1 بين 0.75 و 0.90
 * scale: ثابت عند ظهوره + طفو خفيف
 */
export default function FloatingLogo() {
  const logoRef = useRef();

  const texture = useTexture(
    'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/smar_logo.png'
  );

  useFrame((_, delta) => {
    if (!logoRef.current) return;
    const { scrollProgress } = useSmarStore.getState();

    // Opacity: غير مرئي حتى 0.75، يظهر تدريجياً حتى 0.90
    const SHOW_START = 0.75;
    const SHOW_FULL  = 0.90;
    const alpha = Math.min(1, Math.max(0, (scrollProgress - SHOW_START) / (SHOW_FULL - SHOW_START)));

    logoRef.current.material.opacity = alpha;

    // إخفاء تام قبل منطقة الظهور (تجنب أي render غير ضروري)
    logoRef.current.visible = alpha > 0;

    // دوران بطيء جداً حول Y
    logoRef.current.rotation.y += delta * 0.15;

    // طفو عمودي خفيف
    logoRef.current.position.y = Math.sin(Date.now() / 1200) * 0.12;
  });

  return (
    <mesh ref={logoRef} position={[0, 0, 0]}>
      <planeGeometry args={[4, 4]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}
