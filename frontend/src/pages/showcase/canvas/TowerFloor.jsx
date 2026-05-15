import RoomReveal    from './RoomReveal';
import TextParticles from './TextParticles';

// Room bounds: x(-2.2, 2.2)  y(-1.5, 1.5)  z(-3.5, 1.0)
// Pillar corners align with the room footprint
const PILLARS = [
  [-2.2, -3.5],
  [ 2.2, -3.5],
  [-2.2,  1.0],
  [ 2.2,  1.0],
];

export default function TowerFloor({ y, range, color, titleAr }) {
  return (
    <group position={[0, y, 0]}>
      {/* Structural skeleton — corner pillars */}
      {PILLARS.map(([px, pz], i) => (
        <mesh key={i} position={[px, 0, pz]}>
          <boxGeometry args={[0.13, 3.2, 0.13]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.7}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      ))}

      {/* Floor slab */}
      <mesh position={[0, -1.56, -1.25]}>
        <boxGeometry args={[4.6, 0.08, 4.5]} />
        <meshStandardMaterial
          color="#0d0d0d"
          emissive={color}
          emissiveIntensity={0.12}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Ceiling slab */}
      <mesh position={[0, 1.56, -1.25]}>
        <boxGeometry args={[4.6, 0.08, 4.5]} />
        <meshStandardMaterial
          color="#0d0d0d"
          emissive={color}
          emissiveIntensity={0.07}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Neon front-edge glow — entrance lip */}
      <mesh position={[0, -1.56, 1.03]}>
        <boxGeometry args={[4.6, 0.04, 0.06]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.8}
          toneMapped={false}
        />
      </mesh>

      {/* Particle wall reveal (600 particles → room walls) */}
      <RoomReveal range={range} color={color} />

      {/* Particle text (400 particles → Arabic service title) */}
      <TextParticles range={range} titleAr={titleAr} color={color} />
    </group>
  );
}
