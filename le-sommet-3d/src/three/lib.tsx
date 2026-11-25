// Procedural 3D building blocks (Three.js via React Three Fiber).
// Everything is deterministic: given a frame number, the scene is fully defined.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const PALM = new RoundedBoxGeometry(0.078, 0.024, 0.09, 4, 0.011);
import { rnd } from '../timeline.js';

export type V3 = [number, number, number];

// ------------------------------------------------------------------ camera
/** Computes a camera transform (position + look-at target + roll). */
export function camTransform(pos: V3, target: V3, roll = 0) {
  // a camera looks down its -Z axis (Object3D.lookAt would aim +Z)
  const o = new THREE.PerspectiveCamera();
  o.position.set(...pos);
  o.lookAt(new THREE.Vector3(...target));
  o.rotateZ(roll);
  return { position: o.position.clone(), quaternion: o.quaternion.clone() };
}

/** Drives the R3F default camera; children are attached to the camera (POV hands). */
export const CamRig: React.FC<{ pos: V3; target: V3; roll?: number; fov?: number; exposure?: number; children?: React.ReactNode }> = ({ pos, target, roll = 0, fov = 50, exposure = 1.0, children }) => {
  const { camera, gl } = useThree();
  gl.toneMappingExposure = exposure;
  const t = camTransform(pos, target, roll);
  camera.position.copy(t.position);
  camera.quaternion.copy(t.quaternion);
  const pc = camera as THREE.PerspectiveCamera;
  if (pc.fov !== fov) {
    pc.fov = fov;
    pc.updateProjectionMatrix();
  }
  pc.near = 0.02;
  pc.far = 4000;
  pc.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return (
    <group position={t.position} quaternion={t.quaternion}>
      {children}
    </group>
  );
};

// ------------------------------------------------------------------ materials
const matCache = new Map<string, THREE.Material>();
export function mat(color: string, rough = 0.8, metal = 0, emissive?: string, ei = 1): THREE.MeshStandardMaterial {
  const key = `${color}|${rough}|${metal}|${emissive}|${ei}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive: emissive ?? '#000', emissiveIntensity: ei }));
  }
  return matCache.get(key) as THREE.MeshStandardMaterial;
}
export const basic = (color: string, opacity = 1, additive = false) =>
  new THREE.MeshBasicMaterial({ color, transparent: opacity < 1 || additive, opacity, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !additive && opacity >= 1, toneMapped: false });

// ------------------------------------------------------------------ textures
const texCache = new Map<string, THREE.Texture>();
/** Window grid texture for buildings. */
export function windowTexture(seed: number, lit: number, warm = 0.6, bg = '#000', gain = 1): THREE.CanvasTexture {
  const key = `win${seed}-${lit}-${warm}-${bg}-${gain}`;
  if (texCache.has(key)) return texCache.get(key) as THREE.CanvasTexture;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 512);
  // subtle floor slabs / mullions on the facade
  g.fillStyle = 'rgba(255,255,255,0.025)';
  for (let r = 0; r < 32; r++) g.fillRect(0, r * 16 + 15, 256, 1);
  for (let r = 0; r < 32; r++) {
    for (let k = 0; k < 8; k++) {
      const id = seed * 1000 + r * 17 + k;
      if (rnd(id) > lit) continue;
      const w = rnd(id + 3) < warm;
      const b = Math.min(1, (0.45 + 0.55 * rnd(id + 5)) * gain);
      g.fillStyle = w ? `rgba(255,${180 + 40 * b},${110 + 40 * b},${b})` : `rgba(${170 + 40 * b},${200 + 30 * b},255,${b})`;
      g.fillRect(6 + k * 31, 6 + r * 16, 20, 9);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

/** Vertical gradient texture (sky). */
export function gradientTexture(stops: [number, string][], key: string): THREE.CanvasTexture {
  if (texCache.has(key)) return texCache.get(key) as THREE.CanvasTexture;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 512;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 512);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

/** Soft radial sprite (glows, light halos). */
export function glowTexture(): THREE.CanvasTexture {
  const key = 'glow';
  if (texCache.has(key)) return texCache.get(key) as THREE.CanvasTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  texCache.set(key, t);
  return t;
}

export const Glow: React.FC<{ position: V3; size: number; color: string; opacity?: number }> = ({ position, size, color, opacity = 1 }) => (
  <sprite position={position} scale={[size, size, 1]}>
    <spriteMaterial map={glowTexture()} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
  </sprite>
);

// ------------------------------------------------------------------ volumetric light cone
const coneMat = (color: string, opacity: number) =>
  new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float edge=pow(abs(dot(vN,vV)),1.6); float fall=pow(vUv.y,1.4); gl_FragColor=vec4(uColor, uOpacity*edge*fall); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
export const LightCone: React.FC<{ position: V3; height: number; radius: number; color?: string; opacity?: number; rotation?: V3 }> = ({ position, height, radius, color = '#ffd9a0', opacity = 0.25, rotation = [0, 0, 0] }) => {
  const m = useMemo(() => coneMat(color, opacity), [color, opacity]);
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, -height / 2, 0]} material={m}>
        <cylinderGeometry args={[0.04, radius, height, 32, 1, true]} />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------ rain
export const Rain: React.FC<{ f: number; center: V3; count?: number; area?: number; height?: number; opacity?: number; speed?: number }> = ({ f, center, count = 1400, area = 14, height = 9, opacity = 0.35, speed = 0.55 }) => {
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const pos = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const x = center[0] + (rnd(i) - 0.5) * area;
    const z = center[2] + (rnd(i + 9000) - 0.5) * area;
    const y = height - ((rnd(i + 5000) * height + f * speed) % height);
    const l = 0.25 + rnd(i + 7000) * 0.2;
    pos.set([x, y, z, x - 0.02, y - l, z + 0.01], i * 6);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#b9cbe6" transparent opacity={opacity} depthWrite={false} />
    </lineSegments>
  );
};

// ------------------------------------------------------------------ city
export type Bld = { x: number; z: number; w: number; d: number; h: number; seed: number };
export function makeBlocks(seed: number, n: number, place: (i: number) => [number, number], size: [number, number], hRange: [number, number]): Bld[] {
  return Array.from({ length: n }, (_, i) => {
    const [x, z] = place(i);
    return {
      x,
      z,
      w: size[0] * (0.7 + rnd(seed + i) * 0.6),
      d: size[1] * (0.7 + rnd(seed + i + 11) * 0.6),
      h: hRange[0] + rnd(seed + i + 23) * (hRange[1] - hRange[0]),
      seed: seed + i,
    };
  });
}

export const Buildings: React.FC<{ blocks: Bld[]; lit?: number; warm?: number; color?: string; ei?: number }> = ({ blocks, lit = 0.35, warm = 0.6, color = '#0c1018', ei = 1.6 }) => {
  // Unlit material: facades carry their own lit windows, so no per-pixel lighting is needed
  // (this is ~5x cheaper in software WebGL than a lit MeshStandardMaterial).
  const mats = useMemo(
    () =>
      [0, 1, 2, 3].map((v) => {
        const t = windowTexture(v + 1, lit, warm, color, Math.min(1.6, ei / 1.6));
        return new THREE.MeshBasicMaterial({ map: t, color: '#ffffff' });
      }),
    [lit, warm, color, ei],
  );
  const perBlock = useMemo(
    () =>
      blocks.map((b, i) => {
        const m = mats[i % 4].clone();
        const t = (m.map as THREE.Texture).clone();
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        // one texture tile = 8 columns x 32 floors ~ 24 m x 96 m (3 m per floor)
        t.repeat.set(Math.max(0.25, b.w / 24), Math.max(0.25, b.h / 96));
        t.offset.set(rnd(b.seed), rnd(b.seed + 1));
        t.needsUpdate = true;
        m.map = t;
        return m;
      }),
    [blocks, mats],
  );
  return (
    <group>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} material={perBlock[i]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
        </mesh>
      ))}
    </group>
  );
};

/** Renders children + a mirrored copy under a semi-transparent wet ground. */
export const WetGround: React.FC<{ size: [number, number]; position?: V3; color?: string; opacity?: number; children: React.ReactNode }> = ({ size, position = [0, 0, 0], color = '#07090d', opacity = 0.8, children }) => (
  <group>
    {children}
    <group scale={[1, -1, 1]} position={[0, position[1] * 2, 0]}>
      {children}
    </group>
    <mesh rotation-x={-Math.PI / 2} position={position} renderOrder={1}>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.35} metalness={0.2} transparent opacity={opacity} />
    </mesh>
  </group>
);

// ------------------------------------------------------------------ mannequin
export type Body = {
  pelvisY?: number;
  spine?: number; // forward lean (rad)
  head?: [number, number]; // pitch, yaw
  shL?: [number, number]; // swing (x), abduction (z)
  shR?: [number, number];
  elL?: number;
  elR?: number;
  hipL?: [number, number];
  hipR?: [number, number];
  knL?: number;
  knR?: number;
};

const CLOTH = '#1b1f27';
const PANTS = '#15171c';
const SKIN = '#7d5f4f';

const Cap: React.FC<{ r: number; l: number; material: THREE.Material; y?: number }> = ({ r, l, material, y }) => (
  <mesh position={[0, y ?? -l / 2, 0]} material={material}>
    <capsuleGeometry args={[r, l, 6, 14]} />
  </mesh>
);

/** Faceless, realistically proportioned mannequin (1.78 m), +Z forward. */
export type Look = { skin?: string; pants?: string; beanie?: string; beard?: string; hair?: string; collar?: boolean; shoulders?: number; shoe?: string; face?: boolean; eye?: boolean };
export const Mannequin: React.FC<{ body: Body; position?: V3; rotY?: number; hood?: boolean; cloth?: string; umbrella?: boolean; scale?: number; look?: Look; core?: number; coreColor?: string }> = ({
  body,
  position = [0, 0, 0],
  rotY = 0,
  hood = false,
  cloth = CLOTH,
  umbrella = false,
  scale = 1,
  look = {},
  core = 0,
  coreColor = '#ffb25a',
}) => {
  const top = mat(cloth, 0.85);
  const legs = mat(look.pants ?? PANTS, 0.85);
  const skin = mat(look.skin ?? SKIN, 0.65);
  const sh = look.shoulders ?? 1;
  const shoe = mat(look.shoe ?? '#0b0c0f', 0.5);
  const b: Required<Body> = {
    pelvisY: 0.96,
    spine: 0.04,
    head: [0, 0],
    shL: [0, 0.06],
    shR: [0, 0.06],
    elL: 0.15,
    elR: 0.15,
    hipL: [0, 0.02],
    hipR: [0, 0.02],
    knL: 0.05,
    knR: 0.05,
    ...body,
  };
  const leg = (side: 1 | -1, hip: [number, number], kn: number) => (
    <group position={[0.095 * side, 0, 0]} rotation={[hip[0], 0, hip[1] * side]}>
      <Cap r={0.075} l={0.36} material={legs} />
      <group position={[0, -0.44, 0]} rotation={[kn, 0, 0]}>
        <Cap r={0.06} l={0.36} material={legs} />
        <mesh position={[0, -0.45, 0.05]} material={shoe}>
          <boxGeometry args={[0.1, 0.07, 0.26]} />
        </mesh>
      </group>
    </group>
  );
  const arm = (side: 1 | -1, sh: [number, number], el: number) => (
    <group position={[0.205 * side, 0.43, 0]} rotation={[sh[0], 0, sh[1] * side]}>
      <Cap r={0.052} l={0.24} material={top} />
      <group position={[0, -0.29, 0]} rotation={[-el, 0, 0]}>
        <Cap r={0.046} l={0.22} material={top} />
        <mesh position={[0, -0.3, 0]} material={skin} scale={[0.8, 1.2, 0.5]}>
          <sphereGeometry args={[0.05, 12, 10]} />
        </mesh>
      </group>
    </group>
  );
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      <group position={[0, b.pelvisY, 0]}>
        {leg(-1, b.hipL, b.knL)}
        {leg(1, b.hipR, b.knR)}
        <mesh material={legs} scale={[1.25, 0.6, 0.85]}>
          <sphereGeometry args={[0.15, 16, 12]} />
        </mesh>
        <group rotation={[b.spine, 0, 0]}>
          <mesh position={[0, 0.27, 0]} material={top} scale={[1.3 * sh, 1, 0.78]}>
            <capsuleGeometry args={[0.16, 0.3, 6, 16]} />
          </mesh>
          {look.collar ? (
            <mesh position={[0, 0.55, -0.01]} material={top} rotation={[-0.15, 0, 0]}>
              <cylinderGeometry args={[0.085, 0.11, 0.1, 16, 1, true]} />
            </mesh>
          ) : null}
          {core > 0 ? (
            <group position={[0, 0.34, 0.118]}>
              <mesh material={basic(coreColor, 1, false)} scale={[1, 1, 0.5]}>
                <capsuleGeometry args={[0.011 + 0.004 * Math.min(core, 1.5), 0.2, 4, 8]} />
              </mesh>
              <Glow position={[0, 0, 0.03]} size={0.18 + 0.45 * core} color={coreColor} opacity={Math.min(1, 0.25 + 0.5 * core)} />
              <pointLight position={[0, 0, 0.12]} intensity={1.6 * core} distance={2.5 + 2 * core} decay={1.8} color={coreColor} />
            </group>
          ) : null}
          {arm(-1, b.shL, b.elL)}
          {arm(1, b.shR, b.elR)}
          <group position={[0, 0.56, 0]} rotation={[b.head[0], b.head[1], 0]}>
            <mesh position={[0, 0.03, 0]} material={skin}>
              <cylinderGeometry args={[0.045, 0.05, 0.1, 12]} />
            </mesh>
            <mesh position={[0, 0.16, 0.01]} material={skin} scale={[0.95, 1.05, 1]} castShadow>
              <sphereGeometry args={[0.1, 32, 24]} />
            </mesh>
            {look.face ? (
              <group>
                {[-1, 1].map((sd) => (
                  <mesh key={sd} position={[0.034 * sd, 0.172, 0.104]} material={mat('#9a958d', 0.9)} scale={[1, 0.55, 0.4]}>
                    <sphereGeometry args={[0.011, 10, 8]} />
                  </mesh>
                ))}
              </group>
            ) : null}
            {look.eye ? (
              <mesh position={[0.036, 0.175, 0.1]} scale={[1, 0.6, 0.45]}>
                <sphereGeometry args={[0.016, 12, 10]} />
                <meshBasicMaterial color={new THREE.Color(3, 3, 3)} toneMapped={false} />
              </mesh>
            ) : null}
            {look.hair ? (
              <mesh position={[0, 0.2, -0.008]} material={mat(look.hair, 0.95)} scale={[0.95, 0.75, 1.03]}>
                <sphereGeometry args={[0.1, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              </mesh>
            ) : null}
            {look.beanie ? (
              <mesh position={[0, 0.21, -0.005]} material={mat(look.beanie, 0.95)} scale={[0.98, 0.9, 1.04]}>
                <sphereGeometry args={[0.105, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
              </mesh>
            ) : null}
            {look.beard ? (
              <mesh position={[0, 0.115, 0.02]} material={mat(look.beard, 0.95)} scale={[0.92, 0.75, 0.95]}>
                <sphereGeometry args={[0.1, 18, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55]} />
              </mesh>
            ) : null}
            {hood ? (
              <group>
                {/* hood shell covering top/back/sides, face left in shadow */}
                <mesh position={[0, 0.17, -0.02]} material={top} scale={[1.12, 1.2, 1.15]}>
                  <sphereGeometry args={[0.115, 22, 16]} />
                </mesh>
                <mesh position={[0, 0.15, 0.078]} material={mat('#07080a', 0.9)} scale={[0.6, 0.82, 0.32]}>
                  <sphereGeometry args={[0.1, 18, 14]} />
                </mesh>
              </group>
            ) : null}
          </group>
          {umbrella ? (
            <group position={[0.22, 0.7, 0.12]}>
              <mesh material={mat('#222', 0.4, 0.6)}>
                <cylinderGeometry args={[0.01, 0.01, 0.9, 6]} />
              </mesh>
              <mesh position={[0, 0.45, 0]} material={mat('#0e1116', 0.5)}>
                <coneGeometry args={[0.55, 0.22, 16, 1, true]} />
              </mesh>
            </group>
          ) : null}
        </group>
      </group>
    </group>
  );
};

/** Walk / run cycle. phase in radians. */
export function walkBody(phase: number, run = 0, headDown = 0): Body {
  const A = 0.42 + 0.28 * run;
  const s = Math.sin(phase);
  const kneeL = 0.12 + (0.6 + 0.7 * run) * Math.max(0, Math.sin(phase + 1.2));
  const kneeR = 0.12 + (0.6 + 0.7 * run) * Math.max(0, Math.sin(phase + Math.PI + 1.2));
  return {
    pelvisY: 0.95 - 0.025 * Math.abs(Math.cos(phase)) - 0.05 * run,
    spine: 0.05 + 0.18 * run,
    head: [headDown, 0],
    hipL: [-A * s, 0.02],
    hipR: [A * s, 0.02],
    knL: kneeL,
    knR: kneeR,
    shL: [0.35 * s * (1 + run), 0.08],
    shR: [-0.35 * s * (1 + run), 0.08],
    elL: 0.25 + 1.0 * run,
    elR: 0.25 + 1.0 * run,
  };
}
export const sitBody = (headDown = 0.1, armsFwd = 0.9): Body => ({
  pelvisY: 0.52,
  spine: 0.12,
  head: [headDown, 0],
  hipL: [-1.45, 0.06],
  hipR: [-1.45, 0.06],
  knL: 1.5,
  knR: 1.5,
  shL: [-armsFwd, 0.1],
  shR: [-armsFwd, 0.1],
  elL: 0.7,
  elR: 0.7,
});

// ------------------------------------------------------------------ POV hands
const SKIN_POV = '#7a5442';
const NAIL = new THREE.MeshStandardMaterial({ color: '#b89484', roughness: 0.35 });
/** Right hand (use mirror for left). Fingers along -Z, palm facing -Y.
 *  curl: 0 open .. 1 fist. tap: per-finger extra curl (typing). */
export const Hand: React.FC<{ curl?: number; tap?: number[]; thumb?: number; mirror?: boolean; sleeve?: string; spread?: number }> = ({ curl = 0.15, tap = [0, 0, 0, 0], thumb = 0.2, mirror = false, sleeve = '#1b1f27', spread = 0.05 }) => {
  const skin = mat(SKIN_POV, 0.55);
  const cuff = mat(sleeve, 0.85);
  const fingers = [
    { x: -0.03, l: [0.042, 0.026, 0.02], r: 0.0095 },
    { x: -0.01, l: [0.046, 0.029, 0.021], r: 0.01 },
    { x: 0.01, l: [0.043, 0.027, 0.02], r: 0.0095 },
    { x: 0.029, l: [0.034, 0.021, 0.018], r: 0.0085 },
  ];
  const seg = (l: number, r: number) => (
    <mesh position={[0, 0, -l / 2]} rotation={[Math.PI / 2, 0, 0]} material={skin}>
      <capsuleGeometry args={[r, l, 4, 10]} />
    </mesh>
  );
  return (
    <group scale={[mirror ? -1 : 1, 1, 1]}>
      {/* forearm in a sleeve, going back toward the body */}
      <mesh position={[0, 0.005, 0.22]} rotation={[Math.PI / 2, 0, 0]} material={cuff}>
        <cylinderGeometry args={[0.05, 0.058, 0.34, 16]} />
      </mesh>
      <mesh position={[0, 0, 0.045]} rotation={[Math.PI / 2, 0, 0]} material={skin}>
        <cylinderGeometry args={[0.032, 0.035, 0.06, 14]} />
      </mesh>
      {/* palm */}
      <mesh position={[0, 0, -0.042]} material={skin} geometry={PALM} />
      {fingers.map((fg, i) => {
        const c = Math.min(1.4, curl * 1.4 + (tap[i] ?? 0));
        return (
          <group key={i} position={[fg.x * 0.93, 0, -0.083]} rotation={[-c * 0.9, (i - 1.5) * spread, 0]}>
            {/* knuckle */}
            <mesh position={[0, 0.004, 0]} material={skin} scale={[1, 0.8, 1]}>
              <sphereGeometry args={[fg.r * 1.18, 10, 8]} />
            </mesh>
            {seg(fg.l[0], fg.r)}
            <group position={[0, 0, -fg.l[0]]} rotation={[-c * 1.1, 0, 0]}>
              {seg(fg.l[1], fg.r * 0.95)}
              <group position={[0, 0, -fg.l[1]]} rotation={[-c * 0.8, 0, 0]}>
                {seg(fg.l[2], fg.r * 0.88)}
                {/* nail */}
                <mesh position={[0, fg.r * 0.72, -fg.l[2] * 0.62]} material={NAIL} scale={[0.85, 0.28, 1.25]}>
                  <sphereGeometry args={[fg.r * 0.95, 10, 6]} />
                </mesh>
              </group>
            </group>
          </group>
        );
      })}
      {/* thumb */}
      <group position={[-0.042, -0.006, -0.02]} rotation={[-thumb * 0.6, 0.7 - thumb * 0.5, 0.3]}>
        {seg(0.035, 0.011)}
        <group position={[0, 0, -0.035]} rotation={[-thumb * 0.7, 0, 0]}>
          {seg(0.03, 0.0105)}
        </group>
      </group>
    </group>
  );
};

// ------------------------------------------------------------------ canvas screen
/** A plane showing a canvas drawn every frame by `draw`. */
export const Screen: React.FC<{ w: number; h: number; px: [number, number]; draw: (g: CanvasRenderingContext2D, W: number, H: number) => void; position?: V3; rotation?: V3; glow?: number; id: string; transparent?: boolean }> = ({ w, h, px, draw, position = [0, 0, 0], rotation = [0, 0, 0], glow = 1, id, transparent = false }) => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = px[0];
    c.height = px[1];
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const c = tex.image as HTMLCanvasElement;
  const g = c.getContext('2d')!;
  g.save();
  draw(g, c.width, c.height);
  g.restore();
  tex.needsUpdate = true;
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} color={new THREE.Color(glow, glow, glow)} transparent={transparent} depthWrite={!transparent} />
    </mesh>
  );
};
