import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils } from 'three';
import { useSmarStore } from '../store/useSmarStore';

/**
 * CameraManager — reads scrollProgress each frame and drives the camera
 * through a keyframe path.  Zero re-renders: uses Zustand's getState().
 *
 * Keyframes (scrollProgress → camera position):
 *   0.00  hero          z=10, y=0,  x=0
 *   0.25  architecture  z=5,  y=1,  x=-2
 *   0.50  gardens       z=3,  y=3,  x=1
 *   0.75  pool          z=2,  y=5,  x=0  (top-down)
 *   1.00  cta           z=6,  y=0,  x=0
 */

const KEYFRAMES = [
  { progress: 0.00, x:  0, y: 0, z: 10, section: 'hero'         },
  { progress: 0.25, x: -2, y: 1, z:  5, section: 'architecture' },
  { progress: 0.50, x:  1, y: 3, z:  3, section: 'gardens'      },
  { progress: 0.75, x:  0, y: 5, z:  2, section: 'pool'         },
  { progress: 1.00, x:  0, y: 0, z:  6, section: 'cta'          },
];

function lerpKeyframes(progress) {
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];
    if (progress >= a.progress && progress <= b.progress) {
      const t = (progress - a.progress) / (b.progress - a.progress);
      return {
        x:       MathUtils.lerp(a.x, b.x, t),
        y:       MathUtils.lerp(a.y, b.y, t),
        z:       MathUtils.lerp(a.z, b.z, t),
        section: t < 0.5 ? a.section : b.section,
      };
    }
  }
  // fallback: last keyframe
  const last = KEYFRAMES[KEYFRAMES.length - 1];
  return { x: last.x, y: last.y, z: last.z, section: last.section };
}

export default function CameraManager() {
  const { camera } = useThree();

  useFrame(() => {
    const { scrollProgress, setActiveSection } = useSmarStore.getState();
    const target = lerpKeyframes(scrollProgress);

    // Smooth lerp toward target each frame (0.05 = gentle follow)
    camera.position.x = MathUtils.lerp(camera.position.x, target.x, 0.05);
    camera.position.y = MathUtils.lerp(camera.position.y, target.y, 0.05);
    camera.position.z = MathUtils.lerp(camera.position.z, target.z, 0.05);

    camera.lookAt(0, 0, 0);

    // Update active section (only calls set when it actually changes)
    const current = useSmarStore.getState().activeSection;
    if (current !== target.section) {
      setActiveSection(target.section);
    }
  });

  return null; // no mesh — pure logic component
}
