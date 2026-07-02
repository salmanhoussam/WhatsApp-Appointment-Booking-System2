import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { scrollState } from './scrollState';

// Glass panel that glows when camera approaches / enters
function GlowGlass({ color, range }) {
  const matRef = useRef();
  const [r0, r1] = range;

  useFrame(() => {
    if (!matRef.current) return;
    const p = scrollState.progress;
    // Glow window: start 0.12 before range, peak at r0+0.06, off at r0+0.30
    const gStart = r0 - 0.12;
    const gPeak  = r0 + 0.06;
    const gEnd   = r0 + 0.30;

    let glow = 0;
    if (p >= gStart && p <= gEnd) {
      const t = (p - gStart) / (gEnd - gStart);
      // bell curve: peak at gPeak mapped to t=(gPeak-gStart)/(gEnd-gStart)
      glow = Math.max(0, 1 - Math.pow((t - 0.30) / 0.40, 2)) * 1.6;
    }
    matRef.current.emissiveIntensity = glow;
    matRef.current.opacity = 0.04 + glow * 0.06;
  });

  return (
    <mesh position={[0, 0, 1.04]}>
      <planeGeometry args={[4.4, 3.0]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={0}
        transparent
        opacity={0.04}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ━━━ ABOUT ROOM — 3 module orbs with orbit rings ━━━━━━━━━━━━━━━━━━━━━━━━━
function AboutContent() {
  const MODULES = [
    { x: -1.1, c: '#3b82f6', label: 'Booking'    },
    { x:  0.0, c: '#f59e0b', label: 'Restaurant' },
    { x:  1.1, c: '#8b5cf6', label: 'Store'      },
  ];

  return (
    <Float speed={0.7} floatIntensity={0.22} rotationIntensity={0}>
      <group position={[0, 0.2, -0.9]}>

        {MODULES.map(({ x, c }, i) => (
          <group key={i} position={[x, 0, 0]}>
            {/* Main orb */}
            <mesh>
              <sphereGeometry args={[0.28, 20, 20]} />
              <meshStandardMaterial
                color={c}
                emissive={c}
                emissiveIntensity={0.55}
                metalness={0.65}
                roughness={0.18}
              />
            </mesh>
            {/* Equatorial ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.42, 0.022, 8, 40]} />
              <meshStandardMaterial
                color={c}
                emissive={c}
                emissiveIntensity={0.9}
                transparent
                opacity={0.75}
              />
            </mesh>
            {/* Tilted orbit ring */}
            <mesh rotation={[Math.PI / 3.5, 0.4, 0]}>
              <torusGeometry args={[0.55, 0.012, 6, 40]} />
              <meshStandardMaterial
                color={c}
                emissive={c}
                emissiveIntensity={0.5}
                transparent
                opacity={0.45}
              />
            </mesh>
          </group>
        ))}

        {/* Stats bar below */}
        <mesh position={[0, -0.95, 0]}>
          <boxGeometry args={[2.8, 0.06, 0.02]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={0.4}
            transparent
            opacity={0.55}
          />
        </mesh>

      </group>
    </Float>
  );
}

// ━━━ SERVICES ROOM — 3 card mockups side by side ━━━━━━━━━━━━━━━━━━━━━━━━━
function ServicesContent() {
  const CARDS = [
    { x: -1.1, c: '#3b82f6', lines: [0.46, 0.38, 0.30] },
    { x:  0.0, c: '#f59e0b', lines: [0.44, 0.36, 0.28] },
    { x:  1.1, c: '#8b5cf6', lines: [0.42, 0.34, 0.26] },
  ];

  return (
    <Float speed={1.0} floatIntensity={0.2} rotationIntensity={0}>
      <group position={[0, 0.1, -0.9]}>

        {CARDS.map(({ x, c, lines }, i) => (
          <group key={i} position={[x, 0, 0]}>
            {/* Card body */}
            <mesh>
              <boxGeometry args={[0.78, 1.15, 0.038]} />
              <meshStandardMaterial
                color="#06090f"
                emissive={c}
                emissiveIntensity={0.08}
                metalness={0.2}
                roughness={0.75}
              />
            </mesh>
            {/* Top accent stripe */}
            <mesh position={[0, 0.555, 0.024]}>
              <boxGeometry args={[0.78, 0.055, 0.008]} />
              <meshStandardMaterial
                color={c}
                emissive={c}
                emissiveIntensity={1.4}
                toneMapped={false}
              />
            </mesh>
            {/* Icon circle */}
            <mesh position={[0, 0.26, 0.025]}>
              <cylinderGeometry args={[0.14, 0.14, 0.025, 18]} />
              <meshStandardMaterial
                color={c}
                emissive={c}
                emissiveIntensity={0.85}
                metalness={0.6}
                roughness={0.1}
              />
            </mesh>
            {/* Data lines */}
            {lines.map((w, j) => (
              <mesh key={j} position={[0, -0.05 - j * 0.22, 0.024]}>
                <boxGeometry args={[w, 0.032, 0.008]} />
                <meshStandardMaterial
                  color={c}
                  emissive={c}
                  emissiveIntensity={0.35}
                  transparent
                  opacity={0.75 - j * 0.15}
                />
              </mesh>
            ))}
            {/* CTA button */}
            <mesh position={[0, -0.43, 0.025]}>
              <boxGeometry args={[0.56, 0.16, 0.018]} />
              <meshStandardMaterial
                color={c}
                emissive={c}
                emissiveIntensity={0.45}
                metalness={0.4}
              />
            </mesh>
          </group>
        ))}

      </group>
    </Float>
  );
}

// ━━━ CONTACT ROOM — pricing card (left) + WhatsApp CTA (right) ━━━━━━━━━━━
function ContactContent() {
  return (
    <Float speed={0.85} floatIntensity={0.2} rotationIntensity={0}>
      <group position={[0, 0.1, -0.9]}>

        {/* ── Left: Pricing card ── */}
        <group position={[-1.0, 0, 0]}>
          {/* Card */}
          <mesh>
            <boxGeometry args={[1.45, 1.9, 0.038]} />
            <meshStandardMaterial
              color="#06090f"
              emissive="#8b5cf6"
              emissiveIntensity={0.07}
              metalness={0.15}
              roughness={0.8}
            />
          </mesh>
          {/* Purple top stripe */}
          <mesh position={[0, 0.93, 0.024]}>
            <boxGeometry args={[1.45, 0.05, 0.008]} />
            <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
          {/* Price badge */}
          <mesh position={[0, 0.56, 0.025]}>
            <boxGeometry args={[0.85, 0.36, 0.022]} />
            <meshStandardMaterial color="#3b0e6a" emissive="#7c3aed" emissiveIntensity={0.55} />
          </mesh>
          {/* Feature lines */}
          {[0.22, 0, -0.22, -0.44].map((y, j) => (
            <mesh key={j} position={[0, y - 0.08, 0.025]}>
              <boxGeometry args={[0.95 - j * 0.06, 0.03, 0.008]} />
              <meshStandardMaterial
                color="#8b5cf6"
                emissive="#8b5cf6"
                emissiveIntensity={0.3}
                transparent
                opacity={0.7 - j * 0.12}
              />
            </mesh>
          ))}
          {/* CTA button */}
          <mesh position={[0, -0.74, 0.025]}>
            <boxGeometry args={[1.1, 0.2, 0.022]} />
            <meshStandardMaterial color="#5b21b6" emissive="#8b5cf6" emissiveIntensity={0.5} />
          </mesh>
        </group>

        {/* ── Right: WhatsApp CTA ── */}
        <group position={[1.0, 0, 0]}>
          {/* Main orb */}
          <mesh>
            <cylinderGeometry args={[0.5, 0.5, 0.06, 32]} />
            <meshStandardMaterial
              color="#25d366"
              emissive="#25d366"
              emissiveIntensity={2.0}
              toneMapped={false}
            />
          </mesh>
          {/* Pulse rings */}
          {[0.68, 0.90, 1.12].map((r, j) => (
            <mesh key={j} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r, 0.018 - j * 0.004, 8, 36]} />
              <meshStandardMaterial
                color="#25d366"
                emissive="#25d366"
                emissiveIntensity={0.65 - j * 0.18}
                transparent
                opacity={0.55 - j * 0.14}
                toneMapped={false}
              />
            </mesh>
          ))}
          {/* Phone number plate */}
          <mesh position={[0, -0.82, 0]}>
            <boxGeometry args={[1.2, 0.28, 0.022]} />
            <meshStandardMaterial color="#0a1a10" emissive="#25d366" emissiveIntensity={0.28} />
          </mesh>
        </group>

      </group>
    </Float>
  );
}

// ━━━ VIDEO GENERATION ROOM — AI pipeline: source → process → video ━━━━━━━━━
function VideoContent() {
  const spinRef = useRef();
  useFrame((_, dt) => {
    if (spinRef.current) spinRef.current.rotation.y += dt * 1.2;
  });

  const PURPLE = '#a855f7';
  const STAGES = [
    { x: -1.2, c: '#6366f1', label: 'src'   },
    { x:  0.0, c: PURPLE,    label: 'ai'    },
    { x:  1.2, c: '#06b6d4', label: 'video' },
  ];

  return (
    <Float speed={0.9} floatIntensity={0.22} rotationIntensity={0}>
      <group position={[0, 0.1, -0.9]}>

        {/* Pipeline stages */}
        {STAGES.map(({ x, c }, i) => (
          <group key={i} position={[x, 0.2, 0]}>
            {/* Stage orb */}
            <mesh ref={i === 1 ? spinRef : undefined}>
              <octahedronGeometry args={[0.26, 0]} />
              <meshStandardMaterial
                color={c} emissive={c}
                emissiveIntensity={i === 1 ? 1.1 : 0.6}
                metalness={0.7} roughness={0.12}
                toneMapped={false}
              />
            </mesh>
            {/* Orbit ring */}
            <mesh rotation={[Math.PI / 2.5, i * 0.5, 0]}>
              <torusGeometry args={[0.42, 0.015, 6, 36]} />
              <meshStandardMaterial
                color={c} emissive={c} emissiveIntensity={0.75}
                transparent opacity={0.6} toneMapped={false}
              />
            </mesh>
          </group>
        ))}

        {/* Connector lines */}
        {[-0.6, 0.6].map((x, i) => (
          <mesh key={i} position={[x, 0.2, 0]}>
            <boxGeometry args={[0.55, 0.012, 0.012]} />
            <meshStandardMaterial
              color={PURPLE} emissive={PURPLE}
              emissiveIntensity={0.9} toneMapped={false}
            />
          </mesh>
        ))}

        {/* Film strip below — 5 frame cells */}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} position={[-1.0 + i * 0.52, -0.75, 0]}>
            <boxGeometry args={[0.44, 0.62, 0.022]} />
            <meshStandardMaterial
              color="#0a0010"
              emissive={PURPLE}
              emissiveIntensity={0.06 + (i % 2) * 0.12}
              metalness={0.1} roughness={0.9}
            />
          </mesh>
        ))}
        {/* Film strip perforations */}
        {[-0.74, 0.74].map((y, row) =>
          Array.from({ length: 5 }, (_, i) => (
            <mesh key={`${row}-${i}`} position={[-1.0 + i * 0.52, -0.75 + (row ? 0.24 : -0.24), 0.015]}>
              <boxGeometry args={[0.1, 0.06, 0.006]} />
              <meshStandardMaterial color="#000" />
            </mesh>
          ))
        )}

        {/* Progress bar at bottom */}
        <mesh position={[0, -1.2, 0]}>
          <boxGeometry args={[2.6, 0.04, 0.02]} />
          <meshStandardMaterial color="#0a0010" emissive={PURPLE} emissiveIntensity={0.15} transparent opacity={0.6} />
        </mesh>
        <mesh position={[-0.52, -1.2, 0.015]}>
          <boxGeometry args={[1.56, 0.04, 0.018]} />
          <meshStandardMaterial color={PURPLE} emissive={PURPLE} emissiveIntensity={1.2} toneMapped={false} />
        </mesh>

      </group>
    </Float>
  );
}

// ━━━ ROMANCE ROOM — balloons, rose heart, candles ━━━━━━━━━━━━━━━━━━━━━━━━━━
function RomanceContent() {
  const ROSE    = '#e11d48';
  const CRIMSON = '#be123c';

  const BALLOONS = [
    { x: -0.9, yOff: 0,    c: ROSE    },
    { x:  0.0, yOff: 0.22, c: '#f43f5e' },
    { x:  0.9, yOff: 0.08, c: CRIMSON  },
  ];

  const CANDLES = [-0.9, 0, 0.9];

  return (
    <Float speed={0.6} floatIntensity={0.28} rotationIntensity={0}>
      <group position={[0, 0, -0.9]}>

        {/* Balloons floating high */}
        {BALLOONS.map(({ x, yOff, c }, i) => (
          <group key={i} position={[x, 0.85 + yOff, 0]}>
            {/* Balloon body */}
            <mesh>
              <sphereGeometry args={[0.32, 18, 18]} />
              <meshStandardMaterial
                color={c} emissive={c}
                emissiveIntensity={0.65}
                metalness={0.15} roughness={0.55}
              />
            </mesh>
            {/* String */}
            <mesh position={[0, -0.62, 0]}>
              <cylinderGeometry args={[0.006, 0.006, 0.62, 4]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.3} transparent opacity={0.7} />
            </mesh>
            {/* Tied rose at string bottom */}
            <mesh position={[0, -0.95, 0]}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color="#880022" emissive="#cc0033" emissiveIntensity={0.8} />
            </mesh>
          </group>
        ))}

        {/* Rose-petal heart on "bed" surface */}
        <group position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          {/* Heart left lobe */}
          <mesh position={[-0.24, 0.14, 0]}>
            <torusGeometry args={[0.28, 0.07, 8, 24, Math.PI]} />
            <meshStandardMaterial color={ROSE} emissive={ROSE} emissiveIntensity={1.1} toneMapped={false} />
          </mesh>
          {/* Heart right lobe */}
          <mesh position={[0.24, 0.14, 0]}>
            <torusGeometry args={[0.28, 0.07, 8, 24, Math.PI]} />
            <meshStandardMaterial color={ROSE} emissive={ROSE} emissiveIntensity={1.1} toneMapped={false} />
          </mesh>
          {/* Heart bottom V */}
          <mesh position={[0, -0.1, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.55, 0.08, 0.08]} />
            <meshStandardMaterial color={ROSE} emissive={ROSE} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
        </group>

        {/* Bed surface */}
        <mesh position={[0, -0.56, 0]}>
          <boxGeometry args={[2.6, 0.04, 1.6]} />
          <meshStandardMaterial
            color="#f8f4ee" emissive="#ffffff"
            emissiveIntensity={0.04} roughness={0.95}
          />
        </mesh>

        {/* Candles */}
        {CANDLES.map((x, i) => (
          <group key={i} position={[x, -0.55, -0.55]}>
            {/* Wax body */}
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.045, 0.05, 0.24, 8]} />
              <meshStandardMaterial color="#fffce8" roughness={0.8} />
            </mesh>
            {/* Flame */}
            <mesh position={[0, 0.28, 0]}>
              <coneGeometry args={[0.038, 0.12, 6, 1]} />
              <meshStandardMaterial
                color="#ffcc44" emissive="#ff8800"
                emissiveIntensity={2.2} toneMapped={false}
                transparent opacity={0.9}
              />
            </mesh>
            {/* Flame glow */}
            <mesh position={[0, 0.28, 0]}>
              <sphereGeometry args={[0.09, 6, 6]} />
              <meshStandardMaterial
                color="#ff6600" emissive="#ff4400"
                emissiveIntensity={0.5} transparent opacity={0.18}
                depthWrite={false} toneMapped={false}
              />
            </mesh>
          </group>
        ))}

      </group>
    </Float>
  );
}

// ── Room content registry ───────────────────────────────────────────────────
const ROOM_CONTENT = {
  about:    <AboutContent />,
  services: <ServicesContent />,
  contact:  <ContactContent />,
  video:    <VideoContent />,
  romance:  <RomanceContent />,
};

// ── Pillar corner positions (room frame) ─────────────────────────────────────
const PILLARS = [
  [-2.2, -3.5],
  [ 2.2, -3.5],
  [-2.2,  1.0],
  [ 2.2,  1.0],
];

export default function TowerFloor({ y, range, color, serviceKey }) {
  return (
    <group position={[0, y, 0]}>

      {/* Thin corner rails (architectural lines, not cage) */}
      {PILLARS.map(([px, pz], i) => (
        <mesh key={i} position={[px, 0, pz]}>
          <boxGeometry args={[0.04, 3.2, 0.04]} />
          <meshStandardMaterial
            color="#0e1520"
            emissive={color}
            emissiveIntensity={0.1}
            metalness={0.95}
            roughness={0.04}
          />
        </mesh>
      ))}

      {/* Floor slab — ultra-thin, barely visible */}
      <mesh position={[0, -1.56, -1.25]}>
        <boxGeometry args={[4.6, 0.018, 4.5]} />
        <meshStandardMaterial
          color="#050810"
          emissive={color}
          emissiveIntensity={0.04}
          transparent
          opacity={0.55}
          metalness={0.9}
        />
      </mesh>

      {/* Ceiling slab — ultra-thin */}
      <mesh position={[0, 1.56, -1.25]}>
        <boxGeometry args={[4.6, 0.018, 4.5]} />
        <meshStandardMaterial
          color="#050810"
          emissive={color}
          emissiveIntensity={0.03}
          transparent
          opacity={0.35}
          metalness={0.9}
        />
      </mesh>

      {/* Front edge glow strip */}
      <mesh position={[0, -1.56, 1.03]}>
        <boxGeometry args={[4.6, 0.028, 0.04]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>

      {/* Glass front panel — glows as camera approaches, transparent otherwise */}
      <GlowGlass color={color} range={range} />

      {/* Section content — 3D orbs/cards, faint at 0.12 opacity when room photo is active */}
      {ROOM_CONTENT[serviceKey]}

    </group>
  );
}
