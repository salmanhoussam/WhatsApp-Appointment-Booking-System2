import TowerFloor from './TowerFloor';

// Floor-to-service mapping — titles from translations.js, colors from brand palette
const FLOORS = [
  {
    y:          12,
    range:      [0.15, 0.40],
    color:      '#ff1a55',
    serviceKey: 'booking',
    titleAr:    'نظام الحجز الذكي المربوط بواتساب',
  },
  {
    y:          6,
    range:      [0.40, 0.65],
    color:      '#f59e0b',
    serviceKey: 'restaurant',
    titleAr:    'المنيو الذكي',
  },
  {
    y:          0,
    range:      [0.65, 0.90],
    color:      '#8b5cf6',
    serviceKey: 'store',
    titleAr:    'المتجر الإلكتروني',
  },
];

// Spine column Y range: base(-2) to below roof(14.5)
const SPINE_Y = 6.25; // centre
const SPINE_H = 16.5;

export default function BuildingTower() {
  return (
    <group>
      {/* ── Structural spine (back-centre column) ── */}
      <mesh position={[0, SPINE_Y, -3.5]}>
        <boxGeometry args={[0.22, SPINE_H, 0.22]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ── Roof slab ── */}
      <mesh position={[0, 14.6, -1.25]}>
        <boxGeometry args={[5.0, 0.35, 4.7]} />
        <meshStandardMaterial
          color="#080808"
          emissive="#ff1a55"
          emissiveIntensity={0.35}
          metalness={0.9}
          roughness={0.05}
        />
      </mesh>

      {/* ── "SS" neon — two block letters on the roof face ── */}
      <group position={[0, 15.3, 1.08]}>
        <mesh position={[-0.55, 0, 0]}>
          <boxGeometry args={[0.55, 0.75, 0.06]} />
          <meshStandardMaterial color="#ff1a55" emissive="#ff1a55" emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
        <mesh position={[0.55, 0, 0]}>
          <boxGeometry args={[0.55, 0.75, 0.06]} />
          <meshStandardMaterial color="#ff1a55" emissive="#ff1a55" emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
      </group>

      {/* ── Base plate ── */}
      <mesh position={[0, -2.05, -1.25]}>
        <boxGeometry args={[5.4, 0.3, 5.0]} />
        <meshStandardMaterial color="#080808" emissive="#8b5cf6" emissiveIntensity={0.2} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ── The three service floors ── */}
      {FLOORS.map((f) => (
        <TowerFloor key={f.serviceKey} {...f} />
      ))}
    </group>
  );
}
