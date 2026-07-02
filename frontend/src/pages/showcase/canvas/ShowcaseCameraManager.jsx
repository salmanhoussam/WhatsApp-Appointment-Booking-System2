import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from './scrollState';

// ── Camera waypoints ──────────────────────────────────────────────────────────
// Pattern: full exterior → approach → zoom-into-window × 5 floors → exit
const WAYPOINTS = [
  new THREE.Vector3(0,  18,  22  ),  // 0.00 — INTRO: full exterior
  new THREE.Vector3(0,  18,  22  ),  // 0.07 — static hold (hero text fades in)
  new THREE.Vector3(0,  14,  14  ),  // 0.20 — APPROACH building
  new THREE.Vector3(0,  12,   2.0),  // 0.30 — at About window
  new THREE.Vector3(0,  12,   0.3),  // 0.43 — INSIDE About
  new THREE.Vector3(0,  15,  18  ),  // 0.49 — ZOOM OUT exterior
  new THREE.Vector3(0,   6,   2.0),  // 0.56 — at Services window
  new THREE.Vector3(0,   6,   0.3),  // 0.65 — INSIDE Services
  new THREE.Vector3(0,   0,   2.0),  // 0.69 — at Contact window
  new THREE.Vector3(0,   0,   0.3),  // 0.76 — INSIDE Contact
  new THREE.Vector3(0,  -6,   2.0),  // 0.80 — at Video window
  new THREE.Vector3(0,  -6,   0.3),  // 0.87 — INSIDE Video
  new THREE.Vector3(0, -12,   2.0),  // 0.91 — at Romance window
  new THREE.Vector3(0, -12,   0.3),  // 0.96 — INSIDE Romance
  new THREE.Vector3(0,  -4,  16  ),  // 1.00 — WIDE EXIT
];

const STAGE_T = [0.00, 0.07, 0.20, 0.30, 0.43, 0.49, 0.56, 0.65, 0.69, 0.76, 0.80, 0.87, 0.91, 0.96, 1.00];

const LOOK_AT = [
  new THREE.Vector3(0,  14,  0   ),  // 0.00
  new THREE.Vector3(0,  14,  0   ),  // 0.07
  new THREE.Vector3(0,  12,  0   ),  // 0.20
  new THREE.Vector3(0,  12, -0.4 ),  // 0.30
  new THREE.Vector3(0,  12, -1.4 ),  // 0.43
  new THREE.Vector3(0,   8,  0   ),  // 0.49
  new THREE.Vector3(0,   6, -0.4 ),  // 0.56
  new THREE.Vector3(0,   6, -1.4 ),  // 0.65
  new THREE.Vector3(0,   0, -0.4 ),  // 0.69
  new THREE.Vector3(0,   0, -1.4 ),  // 0.76
  new THREE.Vector3(0,  -6, -0.4 ),  // 0.80
  new THREE.Vector3(0,  -6, -1.4 ),  // 0.87
  new THREE.Vector3(0, -12, -0.4 ),  // 0.91
  new THREE.Vector3(0, -12, -1.4 ),  // 0.96
  new THREE.Vector3(0,   2,  0   ),  // 1.00
];

// Pre-allocated vectors — never allocate inside useFrame
const _pos  = new THREE.Vector3();
const _look = new THREE.Vector3();

export default function ShowcaseCameraManager() {
  const { camera } = useThree();

  useFrame(() => {
    const p = Math.max(0, Math.min(1, scrollState.progress));

    // Track which floor the camera is in — read by RoomEnvironment overlays
    const newRoom = (p > 0.30 && p < 0.48) ? 'about'
                  : (p > 0.57 && p < 0.68) ? 'services'
                  : (p > 0.70 && p < 0.80) ? 'contact'
                  : (p > 0.81 && p < 0.90) ? 'video'
                  : (p > 0.92 && p < 0.97) ? 'romance'
                  : null;
    if (scrollState.room !== newRoom) scrollState.room = newRoom;

    // Find active stage
    let stage = STAGE_T.length - 2;
    for (let i = 0; i < STAGE_T.length - 1; i++) {
      if (p <= STAGE_T[i + 1]) { stage = i; break; }
    }

    const t0    = STAGE_T[stage];
    const t1    = STAGE_T[stage + 1];
    const rawT  = (p - t0) / (t1 - t0 || 1);
    const eased = rawT * rawT * (3 - 2 * rawT); // smoothstep

    _pos.lerpVectors(WAYPOINTS[stage], WAYPOINTS[stage + 1], eased);

    // Subtle mouse parallax (disabled when inside room)
    const isZoomedIn = (p > 0.30 && p < 0.49) || (p > 0.56 && p < 0.68)
                    || (p > 0.70 && p < 0.80) || (p > 0.81 && p < 0.90)
                    || (p > 0.92 && p < 0.97);
    const parallaxScale = isZoomedIn ? 0.05 : 0.3;
    _pos.x += scrollState.mouseX * parallaxScale;
    _pos.y += scrollState.mouseY * -parallaxScale * 0.7;

    camera.position.lerp(_pos, 0.07);

    _look.lerpVectors(LOOK_AT[stage], LOOK_AT[stage + 1], eased);
    camera.lookAt(_look);
  });

  return null;
}
