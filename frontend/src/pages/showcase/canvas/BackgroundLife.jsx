import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from './scrollState';

const CZ = -1.25; // matches BuildingTower z-centre

// ── City silhouette data ──────────────────────────────────────────────────────
const CITY = [
  { x: -7.0, z: -13, h: 14, w: 0.80 },
  { x: -9.5, z: -11, h: 19, w: 0.60 },
  { x: -11,  z: -15, h:  9, w: 0.95 },
  { x: -6.2, z: -17, h: 11, w: 0.70 },
  { x: -13,  z: -12, h: 16, w: 0.55 },
  { x: -8.0, z: -19, h:  7, w: 0.85 },
  { x:  7.0, z: -13, h: 13, w: 0.80 },
  { x:  9.5, z: -11, h: 20, w: 0.60 },
  { x:  11,  z: -15, h:  8, w: 0.95 },
  { x:  6.2, z: -17, h: 12, w: 0.70 },
  { x:  13,  z: -12, h: 17, w: 0.55 },
  { x:  8.2, z: -19, h:  6, w: 0.85 },
];

// Smooth-step
const ss = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ── Animated city silhouette — emissive colour shifts with room ───────────────
//
// Idle:     cold dark navy    #0a1830
// About:    deep cerulean     #0a2460
// Services: warm amber glow   #4a1c00
// Contact:  emerald night     #003a14
//
// As camera enters each room the city behind the tower floods with that room's
// palette — making the whole skyline feel like a living art installation.
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedCity() {
  const meshRefs = useRef([]);
  const _c = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const p = scrollState.progress;

    const r1 = ss(0.25, 0.38, p) * (1 - ss(0.47, 0.53, p)); // About
    const r2 = ss(0.52, 0.60, p) * (1 - ss(0.68, 0.74, p)); // Services
    const r3 = ss(0.74, 0.81, p) * (1 - ss(0.91, 0.96, p)); // Contact
    const r0 = Math.max(0, 1 - r1 - r2 - r3);

    // Emissive RGB — city buildings glow with the active room's hue
    const eR = r0 * 0.040 + r1 * 0.040 + r2 * 0.290 + r3 * 0.020;
    const eG = r0 * 0.094 + r1 * 0.141 + r2 * 0.110 + r3 * 0.230;
    const eB = r0 * 0.188 + r1 * 0.376 + r2 * 0.000 + r3 * 0.082;
    // Intensity: idle subtle → room entry dramatic
    const ei = r0 * 0.22 + r1 * 1.60 + r2 * 2.00 + r3 * 1.70;

    _c.setRGB(eR, eG, eB);

    meshRefs.current.forEach((mesh) => {
      if (!mesh?.material) return;
      mesh.material.emissive.lerp(_c, 0.03);
      mesh.material.emissiveIntensity +=
        (ei - mesh.material.emissiveIntensity) * 0.03;
    });
  });

  return (
    <>
      {CITY.map(({ x, z, h, w }, i) => (
        <mesh
          key={i}
          ref={(el) => (meshRefs.current[i] = el)}
          position={[x, h / 2 - 5, z]}
        >
          <boxGeometry args={[w, h, w * 0.88]} />
          <meshStandardMaterial
            color="#03050a"
            emissive="#0a1830"
            emissiveIntensity={0.22}
            metalness={0.5}
            roughness={0.88}
          />
        </mesh>
      ))}
    </>
  );
}

// ── City window positions ─────────────────────────────────────────────────────
const CITY_WINS = (() => {
  const pts = [];
  CITY.forEach(({ x, z, h }) => {
    const rows = Math.floor(h / 1.4);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 2; c++) {
        const h2   = Math.sin(x * 127.1 + z * 311.7 + r * 74.7 + c * 53.5) * 43758.5453;
        const frac = h2 - Math.floor(h2);
        if (frac < 0.42) continue;
        pts.push([x + (c - 0.5) * 0.36, -5 + r * 1.4 + 0.5, z + 0.06]);
      }
    }
  });
  return pts;
})();

// ── City windows — also colour-shifted with the room ─────────────────────────
function CityWindows() {
  const ref   = useRef();
  const colRef = useRef();
  const count = CITY_WINS.length;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const _c    = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    if (!ref.current) return;
    CITY_WINS.forEach(([px, py, pz], i) => {
      dummy.position.set(px, py, pz);
      dummy.scale.set(0.12, 0.18, 0.02);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  useFrame(() => {
    if (!ref.current?.material) return;
    const p  = scrollState.progress;
    const r1 = ss(0.25, 0.42, p) * (1 - ss(0.47, 0.53, p));
    const r2 = ss(0.52, 0.62, p) * (1 - ss(0.68, 0.74, p));
    const r3 = ss(0.74, 0.82, p) * (1 - ss(0.91, 0.96, p));
    const r0 = Math.max(0, 1 - r1 - r2 - r3);

    // Window glow: idle=cool blue | about=electric blue | services=gold | contact=mint
    const wR = r0 * 0.40 + r1 * 0.20 + r2 * 0.90 + r3 * 0.30;
    const wG = r0 * 0.55 + r1 * 0.50 + r2 * 0.72 + r3 * 0.92;
    const wB = r0 * 0.90 + r1 * 0.98 + r2 * 0.10 + r3 * 0.55;
    const ei  = r0 * 0.55 + r1 * 1.20 + r2 * 1.60 + r3 * 1.30;

    _c.setRGB(wR, wG, wB);
    ref.current.material.color.lerp(_c, 0.04);
    _c.setRGB(wR * 0.7, wG * 0.7, wB * 0.7);
    ref.current.material.emissive.lerp(_c, 0.04);
    ref.current.material.emissiveIntensity +=
      (ei - ref.current.material.emissiveIntensity) * 0.04;
  });

  return (
    <instancedMesh ref={ref} args={[null, null, count]}>
      <boxGeometry />
      <meshStandardMaterial
        color="#8ab0f0"
        emissive="#6a90e8"
        emissiveIntensity={0.55}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

// ── Floating upward particles ─────────────────────────────────────────────────
const PARTICLE_COUNT = 180;

function FloatingParticles() {
  const ref   = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const data = useMemo(() => {
    const px = new Float32Array(PARTICLE_COUNT);
    const py = new Float32Array(PARTICLE_COUNT);
    const pz = new Float32Array(PARTICLE_COUNT);
    const vy = new Float32Array(PARTICLE_COUNT);
    const sz = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const radius = 3.5 + Math.random() * 10;
      px[i] = Math.cos(angle) * radius;
      py[i] = (Math.random() - 0.25) * 32;
      pz[i] = CZ + Math.sin(angle) * radius;
      vy[i] = 0.12 + Math.random() * 0.28;
      sz[i] = 0.006 + Math.random() * 0.014;
    }
    return { px, py, pz, vy, sz };
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const dt = Math.min(delta, 0.05);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      data.py[i] += data.vy[i] * dt * 7;
      if (data.py[i] > 26) data.py[i] = -10;

      dummy.position.set(data.px[i], data.py[i], data.pz[i]);
      dummy.scale.setScalar(data.sz[i]);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[null, null, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial
        color="#4a80ff"
        emissive="#3060e0"
        emissiveIntensity={1.4}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

// ── Data-flow lines ───────────────────────────────────────────────────────────
const LINE_COUNT = 28;

function DataLines() {
  const ref   = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const data = useMemo(() => {
    const px = new Float32Array(LINE_COUNT);
    const py = new Float32Array(LINE_COUNT);
    const pz = new Float32Array(LINE_COUNT);
    const vy = new Float32Array(LINE_COUNT);
    const lw = new Float32Array(LINE_COUNT);

    for (let i = 0; i < LINE_COUNT; i++) {
      px[i] = (i % 2 === 0 ? -1 : 1) * (4.5 + Math.random() * 5.5);
      py[i] = (Math.random() - 0.3) * 28;
      pz[i] = CZ - 3 - Math.random() * 5;
      vy[i] = 0.06 + Math.random() * 0.16;
      lw[i] = 0.4 + Math.random() * 1.1;
    }
    return { px, py, pz, vy, lw };
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const dt = Math.min(delta, 0.05);

    for (let i = 0; i < LINE_COUNT; i++) {
      data.py[i] += data.vy[i] * dt * 5;
      if (data.py[i] > 22) data.py[i] = -12;

      dummy.position.set(data.px[i], data.py[i], data.pz[i]);
      dummy.scale.set(data.lw[i], 0.016, 0.016);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[null, null, LINE_COUNT]}>
      <boxGeometry />
      <meshStandardMaterial
        color="#1a3888"
        emissive="#2050cc"
        emissiveIntensity={0.85}
        transparent
        opacity={0.32}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function BackgroundLife() {
  return (
    <group>
      <AnimatedCity />
      <CityWindows />
      <FloatingParticles />
      <DataLines />
    </group>
  );
}
