import { useMemo } from 'react';
import * as THREE from 'three';
import TowerFloor from './TowerFloor';

// ── Section registry ──────────────────────────────────────────────────────────
const SECTIONS = [
  { y: 12, range: [0.28, 0.50], color: '#3b82f6', sectionKey: 'about',    titleAr: 'من نحن'      },
  { y: 6,  range: [0.52, 0.67], color: '#f59e0b', sectionKey: 'services', titleAr: 'خدماتنا'     },
  { y: 0,  range: [0.67, 0.78], color: '#22c55e', sectionKey: 'contact',  titleAr: 'تواصل'       },
  { y: -6, range: [0.79, 0.89], color: '#a855f7', sectionKey: 'video',    titleAr: 'فيديو AI'    },
  { y:-12, range: [0.90, 0.97], color: '#e11d48', sectionKey: 'romance',  titleAr: 'مفاجآت'      },
];

// ── Building geometry ─────────────────────────────────────────────────────────
const BW = 2.3;
const CZ = -1.25;
const BD = 4.5;
const BODY_Y_BOT = -16.0;
const BODY_Y_TOP =  15.0;
const BODY_H     = BODY_Y_TOP - BODY_Y_BOT;   // 31
const BODY_CY    = (BODY_Y_BOT + BODY_Y_TOP) / 2;  // -0.5

// ── Vertex shader (shared) ────────────────────────────────────────────────────
const vertGLSL = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv         = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ── Curtain-wall facade shader ────────────────────────────────────────────────
// Target: Saudi glass tower aesthetic — large reflective blue panels + golden aluminum frame grid
// Like Kingdom Tower / Riyadh office towers in the reference photos
const fragGLSL = /* glsl */ `
  varying vec2 vUv;

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    // Curtain-wall grid: 4 columns × 20 rows (large architectural glass panels)
    vec2  grid = vec2(vUv.x * 4.0, vUv.y * 20.0);
    vec2  cell = floor(grid);
    vec2  fr   = fract(grid);

    // Aluminum extrusion frame thickness
    float fw = 0.13;   // left/right frame
    float fh = 0.10;   // top/bottom frame

    // Is this pixel inside the glass area (1) or in the frame (0)?
    float inGlass = step(fw, fr.x) * step(fr.x, 1.0 - fw)
                  * step(fh, fr.y) * step(fr.y, 1.0 - fh);

    // Normalised position within each glass panel (0-1), clamped — pow(negative, frac) is undefined in WebGL
    float gy = clamp((fr.y - fh) / max(1.0 - 2.0 * fh, 0.001), 0.0, 1.0);

    // Per-panel variation seed
    float r = rand(cell);
    float r2 = rand(cell + vec2(33.7, 11.2));

    // ── Glass color: blue-tinted reflective curtain wall ──
    // Top of panel: sky/city reflection (lighter, more saturated)
    // Bottom: darker interior absorption
    vec3 glassTop = vec3(0.22, 0.38, 0.60) + r * vec3(0.05, 0.05, 0.10);
    vec3 glassBot = vec3(0.06, 0.14, 0.28) + r * vec3(0.02, 0.02, 0.04);
    vec3 glassCol = mix(glassBot, glassTop, pow(gy, 0.55));

    // Subtle horizontal stripe variation (floor reflections)
    float stripe  = sin(fr.y * 3.14159) * 0.035;
    glassCol     += stripe;

    // Occasional slightly lit interior (warm office light bleed-through)
    float hasLight = step(0.72, rand(cell + vec2(7.3)));
    glassCol       = mix(glassCol, glassCol + vec3(0.08, 0.07, 0.02), hasLight * 0.35);

    // ── Golden aluminum frame color ──
    // Matches the Saudi office tower aesthetic: warm anodised aluminium
    vec3 frameLight = vec3(0.56, 0.42, 0.20);   // highlight edge
    vec3 frameDark  = vec3(0.34, 0.25, 0.09);   // shadow cavity
    float fGrad     = fh + fr.y * (1.0 - 2.0 * fh); // full-face gradient
    vec3 frameCol   = mix(frameDark, frameLight, pow(fGrad, 0.6));
    frameCol       += r2 * 0.04; // subtle variation per panel

    gl_FragColor = vec4(mix(frameCol, glassCol, inGlass), 1.0);
  }
`;

// ── Cap shader: golden aluminum for top/bottom faces ─────────────────────────
const capGLSL = /* glsl */ `
  varying vec2 vUv;
  void main() {
    // Brushed aluminium cap — slightly lighter in the middle
    float t      = sin(vUv.x * 3.14159);
    vec3  col    = mix(vec3(0.30, 0.22, 0.08), vec3(0.52, 0.40, 0.18), t * 0.6 + 0.2);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Thin edge helper ─────────────────────────────────────────────────────────
function Edge({ pos, size, col = '#3b82f6', intensity = 0.7 }) {
  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={col} emissive={col} emissiveIntensity={intensity} toneMapped={false} />
    </mesh>
  );
}

export default function BuildingTower() {
  const curtainMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   vertGLSL,
    fragmentShader: fragGLSL,
    side: THREE.DoubleSide,
  }), []);

  const capMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   vertGLSL,
    fragmentShader: capGLSL,
    side: THREE.DoubleSide,
  }), []);

  return (
    <group>

      {/* ══════════════════════════════════════════════════════════
          MAIN BUILDING BODY
          Curtain-wall glass on all vertical faces, aluminium cap on top/bottom
          ══════════════════════════════════════════════════════════ */}
      <mesh position={[0, BODY_CY, CZ]}>
        <boxGeometry args={[BW * 2, BODY_H, BD]} />
        {/* R3F slots: +x / -x / +y(top) / -y(bot) / +z(front) / -z(back) */}
        <primitive object={curtainMat} attach="material-0" />
        <primitive object={curtainMat} attach="material-1" />
        <primitive object={capMat}     attach="material-2" />
        <primitive object={capMat}     attach="material-3" />
        <primitive object={curtainMat} attach="material-4" />
        <primitive object={curtainMat} attach="material-5" />
      </mesh>

      {/* ── PBR glass sheen overlay — front face ─────────────────────── */}
      {/* Sits just in front of the shader mesh, adds environment reflection */}
      <mesh position={[0, BODY_CY, 1.04]}>
        <planeGeometry args={[BW * 2, BODY_H]} />
        <meshStandardMaterial
          color="#2a5080"
          metalness={0.90}
          roughness={0.04}
          envMapIntensity={2.4}
          transparent
          opacity={0.12}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>

      {/* ══════════════════════════════════════════════════════════
          CROWN SECTION — slightly set back, same materials
          ══════════════════════════════════════════════════════════ */}
      <mesh position={[0, BODY_Y_TOP + 1.5, CZ]}>
        <boxGeometry args={[3.8, 3.0, 3.8]} />
        <primitive object={curtainMat} attach="material-0" />
        <primitive object={curtainMat} attach="material-1" />
        <primitive object={capMat}     attach="material-2" />
        <primitive object={capMat}     attach="material-3" />
        <primitive object={curtainMat} attach="material-4" />
        <primitive object={curtainMat} attach="material-5" />
      </mesh>

      {/* ══════════════════════════════════════════════════════════
          SPIRE — gold shaft, blue emissive tip (tech contrast)
          ══════════════════════════════════════════════════════════ */}
      <mesh position={[0, BODY_Y_TOP + 0.5, CZ]}>
        <cylinderGeometry args={[0.18, 0.30, 1.0, 8]} />
        <meshStandardMaterial
          color="#5a3e10"
          metalness={0.98}
          roughness={0.04}
          emissive="#3a2808"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[0, BODY_Y_TOP + 3.5, CZ]}>
        <cylinderGeometry args={[0.055, 0.18, 5.0, 8]} />
        <meshStandardMaterial
          color="#4a3408"
          metalness={0.98}
          roughness={0.03}
          emissive="#2a1c04"
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[0, BODY_Y_TOP + 7.8, CZ]}>
        <coneGeometry args={[0.04, 3.5, 8, 1]} />
        <meshStandardMaterial
          color="#060a12"
          metalness={0.98}
          roughness={0.01}
          emissive="#3b82f6"
          emissiveIntensity={0.55}
        />
      </mesh>

      {/* ══════════════════════════════════════════════════════════
          TOP PERIMETER GLOW — blue tech highlight (cool vs warm gold)
          ══════════════════════════════════════════════════════════ */}
      <Edge pos={[0,   BODY_Y_TOP,  1.0 ]} size={[BW*2,  0.022, 0.022]} col="#3b82f6" intensity={0.9} />
      <Edge pos={[0,   BODY_Y_TOP, -3.5 ]} size={[BW*2,  0.022, 0.022]} col="#3b82f6" intensity={0.9} />
      <Edge pos={[-BW, BODY_Y_TOP,  CZ  ]} size={[0.022, 0.022, 4.5  ]} col="#3b82f6" intensity={0.9} />
      <Edge pos={[ BW, BODY_Y_TOP,  CZ  ]} size={[0.022, 0.022, 4.5  ]} col="#3b82f6" intensity={0.9} />

      {/* ══════════════════════════════════════════════════════════
          HORIZONTAL FLOOR BANDS — golden aluminum extrusion lines
          Matches the visible floor separators on Saudi glass towers
          ══════════════════════════════════════════════════════════ */}
      {Array.from({ length: 46 }, (_, i) => {
        const y = BODY_Y_BOT + (i + 1) * (BODY_H / 47);
        return (
          <mesh key={i} position={[0, y, CZ]}>
            <boxGeometry args={[BW * 2 + 0.06, 0.022, BD + 0.06]} />
            <meshStandardMaterial
              color="#5a3c10"
              emissive="#3a2408"
              emissiveIntensity={0.18}
              metalness={0.88}
              roughness={0.18}
              transparent
              opacity={0.80}
            />
          </mesh>
        );
      })}

      {/* ══════════════════════════════════════════════════════════
          CORNER COLUMNS — thick gold anodised aluminium extrusions
          ══════════════════════════════════════════════════════════ */}
      {[[-BW, 1.0], [BW, 1.0], [-BW, -3.5], [BW, -3.5]].map(([cx, cz], i) => (
        <mesh key={i} position={[cx, BODY_CY, cz]}>
          <boxGeometry args={[0.08, BODY_H + 0.1, 0.08]} />
          <meshStandardMaterial
            color="#6a4c1a"
            metalness={0.96}
            roughness={0.08}
            emissive="#2a1c04"
            emissiveIntensity={0.25}
          />
        </mesh>
      ))}

      {/* ══════════════════════════════════════════════════════════
          BASE PLATE — dark podium with purple tech glow
          ══════════════════════════════════════════════════════════ */}
      <mesh position={[0, BODY_Y_BOT - 0.18, CZ]}>
        <boxGeometry args={[5.4, 0.35, 5.2]} />
        <meshStandardMaterial
          color="#04060c"
          emissive="#6020a0"
          emissiveIntensity={0.25}
          metalness={0.95}
          roughness={0.08}
        />
      </mesh>
      <Edge pos={[0, BODY_Y_BOT - 0.02, 1.1]} size={[BW*2 + 0.2, 0.022, 0.022]} col="#8b5cf6" intensity={1.1} />

      {/* ══════════════════════════════════════════════════════════
          WEBSITE SECTION FLOORS
          ══════════════════════════════════════════════════════════ */}
      {SECTIONS.map(s => (
        <TowerFloor
          key={s.sectionKey}
          y={s.y}
          range={s.range}
          color={s.color}
          serviceKey={s.sectionKey}
          titleAr={s.titleAr}
        />
      ))}

    </group>
  );
}
