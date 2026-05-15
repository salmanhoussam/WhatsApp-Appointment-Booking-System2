import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from './scrollState';

// Camera positions at each stage boundary
const WAYPOINTS = [
  new THREE.Vector3(0, 18, 20),  // 0.00 — exterior overview
  new THREE.Vector3(0, 14,  8),  // 0.15 — descending toward floor 1
  new THREE.Vector3(0, 10,  3),  // 0.40 — floor 1 exit / floor 2 entry
  new THREE.Vector3(0,  6,  3),  // 0.65 — floor 2 exit / floor 3 entry
  new THREE.Vector3(0,  2,  3),  // 0.90 — inside floor 3
  new THREE.Vector3(0, -2, 12),  // 1.00 — wide exit shot
];

// Progress values at each waypoint
const STAGE_T = [0.00, 0.15, 0.40, 0.65, 0.90, 1.00];

// Look-at targets per waypoint
const LOOK_AT = [
  new THREE.Vector3(0, 15,  0),  // exterior: roof logo
  new THREE.Vector3(0, 12,  0),  // floor 1 centre
  new THREE.Vector3(0,  6,  0),  // floor 2 centre
  new THREE.Vector3(0,  0,  0),  // floor 3 centre
  new THREE.Vector3(0,  0,  0),  // floor 3 continued
  new THREE.Vector3(0,  6,  0),  // exit: full tower
];

// Pre-allocated vectors — never allocate inside useFrame
const _pos  = new THREE.Vector3();
const _look = new THREE.Vector3();

export default function ShowcaseCameraManager() {
  const { camera } = useThree();

  useFrame(() => {
    const p = Math.max(0, Math.min(1, scrollState.progress));

    // Find active stage
    let stage = STAGE_T.length - 2;
    for (let i = 0; i < STAGE_T.length - 1; i++) {
      if (p <= STAGE_T[i + 1]) { stage = i; break; }
    }

    const t0     = STAGE_T[stage];
    const t1     = STAGE_T[stage + 1];
    const rawT   = (p - t0) / (t1 - t0 || 1);
    const eased  = rawT * rawT * (3 - 2 * rawT); // smoothstep

    // Compute target camera position
    _pos.lerpVectors(WAYPOINTS[stage], WAYPOINTS[stage + 1], eased);

    // Subtle mouse parallax
    _pos.x += scrollState.mouseX * 0.3;
    _pos.y += scrollState.mouseY * -0.2;

    camera.position.lerp(_pos, 0.06);

    // Compute look-at target
    _look.lerpVectors(LOOK_AT[stage], LOOK_AT[stage + 1], eased);
    camera.lookAt(_look);
  });

  return null;
}
