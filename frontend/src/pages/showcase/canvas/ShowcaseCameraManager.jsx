import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from './scrollState';

const START  = new THREE.Vector3(0, 2.5, 10);
const END    = new THREE.Vector3(0, 0,   6);
const TARGET = new THREE.Vector3(0, 0,   0);
const _pos   = new THREE.Vector3();

export default function ShowcaseCameraManager() {
  const { camera } = useThree();

  useFrame(() => {
    const t = scrollState.progress;

    // Lerp along the camera path
    _pos.lerpVectors(START, END, t);

    // Subtle mouse parallax (dampened)
    _pos.x += scrollState.mouseX * 0.25;
    _pos.y += scrollState.mouseY * -0.15;

    camera.position.lerp(_pos, 0.05);
    camera.lookAt(TARGET);
  });

  return null;
}
