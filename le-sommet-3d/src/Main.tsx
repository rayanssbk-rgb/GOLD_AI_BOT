// "Le sommet" — minimalist cinematic 3D (36 s, 1080x1920, 30 fps).
// White faceless figures in monumental concrete architecture, practical warm lights, DOF, bloom, grain.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, DepthOfField, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Body, CamRig, Glow, Mannequin, V3, walkBody } from './three/lib';

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const DUR = 36;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const sm = (x: number) => { const k = clamp(x); return k * k * (3 - 2 * k); };
export const ease = (x: number) => { const k = clamp(x); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
export const lv = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const rnd = (i: number, j = 0) => { const s = Math.sin(i * 12.9898 + j * 78.233 + 0.5) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------- poses
export type RB = Required<Body>;
export const STAND: RB = { pelvisY: 0.95, spine: 0.03, head: [0, 0], shL: [0, 0.07], shR: [0, 0.07], elL: 0.14, elR: 0.14, hipL: [0, 0.03], hipR: [0, 0.03], knL: 0.04, knR: 0.04 };
export const P = (b: Body): RB => ({ ...STAND, ...b });
export const LOOKUP = P({ spine: -0.06, head: [-0.62, 0], shL: [0.05, 0.12], shR: [0.05, 0.12], elL: 0.2, elR: 0.2 });
const LOOKDOWN = P({ spine: 0.12, head: [0.62, 0], shL: [0.02, 0.1], shR: [0.02, 0.1] });
const SITG = P({ pelvisY: 0.17, spine: 0.35, head: [0.55, 0], shL: [-0.7, 0.15], shR: [-0.7, 0.15], elL: 0.9, elR: 0.9, hipL: [-1.35, 0.1], hipR: [-1.3, 0.1], knL: 1.9, knR: 2.0 });
const SEIZA = P({ pelvisY: 0.3, spine: 0.75, head: [0.8, 0], shL: [-0.9, 0.12], shR: [-0.9, 0.12], elL: 1.6, elR: 1.6, hipL: [-1.45, 0.09], hipR: [-1.45, 0.09], knL: 2.85, knR: 2.85 });
export const FALL = P({ pelvisY: 0.7, spine: 0.95, head: [0.2, 0], shL: [-1.3, 0.2], shR: [-1.1, 0.2], elL: 0.2, elR: 0.3, hipL: [-1.3, 0.05], hipR: [0.2, 0.05], knL: 1.6, knR: 0.9 });
export const KNEEL = P({ pelvisY: 0.5, spine: 0.7, head: [0.75, 0], shL: [-1.05, 0.15], shR: [-0.15, 0.2], elL: 0.25, elR: 0.6, hipL: [-1.55, 0.06], hipR: [0.15, 0.06], knL: 1.65, knR: 2.0 });
export const CROUCH = P({ pelvisY: 0.66, spine: 0.55, head: [-0.1, 0], shL: [0.4, 0.1], shR: [0.3, 0.1], elL: 0.3, elR: 0.3, hipL: [-1.2, 0.05], hipR: [-0.5, 0.05], knL: 1.8, knR: 1.0 });
export function mixB(a: Body, b: Body, k: number): RB {
  const A = P(a);
  const Bb = P(b);
  if (k <= 0) return A;
  if (k >= 1) return Bb;
  const o: Record<string, unknown> = {};
  for (const key of Object.keys(A) as (keyof RB)[]) {
    const va = A[key] as number | number[];
    const vb = Bb[key] as number | number[];
    o[key] = Array.isArray(va) ? va.map((x, i) => lerp(x, (vb as number[])[i], k)) : lerp(va, vb as number, k);
  }
  return o as RB;
}
/** stair climbing cycle; ph advances by PI per step */
export function climbBody(ph: number, tired = 0): RB {
  const leg = (p: number): [number, number] => {
    const q = ((p % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (q < Math.PI) { const u = q / Math.PI; return [lerp(-0.6, 0.12, u), lerp(0.8, 0.05, u)]; }
    const u = (q - Math.PI) / Math.PI;
    return [-0.6 - 0.5 * Math.sin(Math.PI * u), lerp(0.05, 0.8, u) + 1.0 * Math.sin(Math.PI * u)];
  };
  const [hl, kl] = leg(ph);
  const [hr, kr] = leg(ph + Math.PI);
  const s = Math.sin(ph);
  return P({ pelvisY: 0.93 - 0.02 * Math.abs(Math.cos(ph)), spine: 0.2 + 0.15 * tired, head: [0.05 + 0.3 * tired, 0], hipL: [hl, 0.03], hipR: [hr, 0.03], knL: kl, knR: kr, shL: [0.3 * s, 0.08], shR: [-0.3 * s, 0.08], elL: 0.35, elR: 0.35 });
}

// ---------------------------------------------------------------- materials
const texCache = new Map<string, THREE.CanvasTexture>();
export function concreteTex(seed: number) {
  const key = `c${seed}`;
  if (texCache.has(key)) return texCache.get(key)!;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    const x = rnd(i, seed) * 512;
    const y = rnd(i, seed + 1) * 512;
    const r = 10 + rnd(i, seed + 2) * 90;
    const v = rnd(i, seed + 3) > 0.5 ? 255 : 0;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(${v},${v},${v},0.05)`);
    rg.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const id = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < id.data.length; i += 4) {
    const n = (rnd(i, seed + 7) - 0.5) * 26 + (rnd(i, seed + 8) > 0.997 ? -70 : 0);
    id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n;
  }
  g.putImageData(id, 0, 0);
  // formwork lines
  g.strokeStyle = 'rgba(0,0,0,.10)';
  g.lineWidth = 2;
  for (let y = 0; y <= 512; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  const tx = new THREE.CanvasTexture(c);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 8;
  texCache.set(key, tx);
  return tx;
}
const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function concrete(color: string, ru: number, rv: number, rough = 0.9, metal = 0.0, seed = 1) {
  const key = `${color}|${ru}|${rv}|${rough}|${metal}|${seed}`;
  if (matCache.has(key)) return matCache.get(key)!;
  const base = concreteTex(seed);
  const map = base.clone();
  map.repeat.set(ru, rv);
  map.needsUpdate = true;
  const m = new THREE.MeshStandardMaterial({ color, map, bumpMap: map, bumpScale: 1.2, roughness: rough, metalness: metal });
  matCache.set(key, m);
  return m;
}
export const LIGHT = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.35, 1.5), toneMapped: false });
export const LIGHT_DIM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, 0.7), toneMapped: false });
const GATE = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4.6, 3.1), toneMapped: false });
const DOOR = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.3, 3.4), toneMapped: false });

export const Env: React.FC<{ intensity: number }> = ({ intensity }) => {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => { scene.environment = null; pm.dispose(); };
  }, [gl, scene]);
  (scene as unknown as { environmentIntensity: number }).environmentIntensity = intensity;
  return null;
};

// ---------------------------------------------------------------- figures
export const LOOK = { skin: '#ece9e3', pants: '#e2dfd9', shoe: '#cfcbc4', face: true };
export const Fig: React.FC<{ pos: V3; rotY: number; body: Body; pitch?: number }> = ({ pos, rotY, body, pitch = 0 }) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  });
  return (
    <group ref={ref} position={pos} rotation={[0, rotY, 0]}>
      <group rotation={[pitch, 0, 0]}>
        <Mannequin body={body} cloth="#ebe8e2" look={LOOK} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- SET A — the endless corridor
const A_END = 6.6;
const heroA = (t: number) => {
  const d = Math.max(0, t - 0.2) * 1.2;
  return { pos: [0, 0, -d] as V3, body: walkBody((d / 0.68) * Math.PI, 0, 0.04) };
};
const Corridor: React.FC<{ t: number }> = ({ t }) => {
  const h = heroA(t);
  const hz = h.pos[2];
  const near = Math.round(-hz / 5);
  return (
    <group>
      <fogExp2 attach="fog" args={['#0b0b0c', 0.014]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -50]} receiveShadow material={concrete('#77746f', 2, 50, 0.42, 0.15, 3)}>
        <planeGeometry args={[4.4, 130]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[2.2 * s, 2.9, -50]} rotation={[0, -s * Math.PI / 2, 0]} receiveShadow material={concrete('#6d6a65', 40, 2.3, 0.95, 0, 5)}>
          <planeGeometry args={[130, 5.8]} />
        </mesh>
      ))}
      <mesh position={[0, 5.8, -50]} rotation={[Math.PI / 2, 0, 0]} material={concrete('#3a3936', 2, 50, 0.95, 0, 6)}>
        <planeGeometry args={[4.4, 130]} />
      </mesh>
      {Array.from({ length: 24 }, (_, k) => (
        <group key={k} position={[0, 5.74, 4 - k * 5]}>
          <mesh material={LIGHT}><boxGeometry args={[2.6, 0.05, 0.16]} /></mesh>
        </group>
      ))}
      {/* side floor light lines */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[2.12 * s, 0.03, -50]} material={LIGHT_DIM}><boxGeometry args={[0.03, 0.03, 130]} /></mesh>
      ))}
      {[near - 1, near, near + 1, near + 2].map((k) => (
        <pointLight key={k} position={[0, 5.3, 4 - k * 5]} intensity={7} distance={11} decay={1.6} color="#ffd2a0" />
      ))}
      <spotLight position={[0, 5.4, hz - 1.2]} target-position={[0, 0, hz - 0.8]} angle={0.8} penumbra={0.9} intensity={24} decay={1.6} distance={9} color="#ffd8ad" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.0004} />
      {/* the door of light at the far end */}
      <mesh position={[0, 2.1, -105]} material={DOOR}><planeGeometry args={[2.4, 4.2]} /></mesh>
      <sprite position={[0, 2.1, -104]} scale={[26, 26, 1]}>
        <spriteMaterial map={glowTex()} color="#ffd9a8" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} />
      </sprite>
      <hemisphereLight args={['#5a554d', '#000000', 0.15]} />
      <Fig pos={h.pos} rotY={Math.PI} body={h.body} />
    </group>
  );
};

// ---------------------------------------------------------------- SET B/C — the monumental staircase
const RISE = 0.2;
const RUN = 0.36;
const NSTEP = 72;
const stairPos = (p: number): V3 => [0, Math.max(0, p) * RISE, -Math.max(0, p) * RUN + 0.12];
const CROWD = [-3.3, -2.2, -1.1, 0, 1.1, 2.2, 3.3].map((x, i) => ({ x, z: 1.5 + rnd(i, 4) * 0.9, i }));
// what each of the six others does: [time, kind]
const QUIT: Record<number, [number, 'walk' | 'sit' | 'seiza']> = { 1: [8.5, 'walk'], 5: [9.0, 'sit'], 0: [9.5, 'walk'], 4: [10.0, 'seiza'], 6: [10.4, 'walk'], 2: [10.9, 'sit'] };

function heroB(t: number) {
  // walks to the first step, then climbs (scene B)
  if (t < 10.9) return { pos: [0, 0, 1.9] as V3, body: mixB(LOOKUP, STAND, sm(prog(t, 10.4, 10.9))), pitch: 0 };
  if (t < 11.8) {
    const k = prog(t, 10.9, 11.8);
    const z = lerp(1.9, 0.2, k);
    return { pos: [0, 0, z] as V3, body: walkBody(((1.9 - z) / 0.6) * Math.PI, 0, 0), pitch: 0 };
  }
  const p = (t - 11.8) * 1.6;
  return { pos: stairPos(p), body: climbBody(p * Math.PI), pitch: 0 };
}
const C_FALL = 15.3;
const C_DOWN = 15.75;
const C_PUSH = 18.0;
const C_UP = 19.1;
function heroC(t: number) {
  // mid-staircase: tired climb, the fall, the long pause, getting up
  const p0 = 24;
  if (t < C_FALL) { const p = p0 + (t - 13) * 1.45; return { pos: stairPos(p), body: climbBody(p * Math.PI, sm(prog(t, 13.5, C_FALL))), pitch: 0 }; }
  const pf = p0 + (C_FALL - 13) * 1.45;
  const base = stairPos(Math.round(pf));
  if (t < C_DOWN) { const k = ease(prog(t, C_FALL, C_DOWN)); return { pos: lv(stairPos(pf), base, k), body: mixB(climbBody(pf * Math.PI, 1), FALL, k), pitch: 0.15 * k }; }
  if (t < C_PUSH) {
    const k = sm(prog(t, C_DOWN, C_DOWN + 0.5));
    const br = 0.05 * Math.sin(t * 3.2);
    const b = mixB(FALL, KNEEL, k);
    return { pos: base, body: { ...b, spine: b.spine + br, head: [b.head[0] + br, 0] as [number, number] }, pitch: 0.15 * (1 - k) };
  }
  if (t < C_UP) {
    const k = prog(t, C_PUSH, C_UP);
    return { pos: base, body: k < 0.5 ? mixB(KNEEL, CROUCH, sm(k * 2)) : mixB(CROUCH, climbBody(0), sm(k * 2 - 1)), pitch: 0 };
  }
  const p = Math.round(pf) + (t - C_UP) * 1.5;
  return { pos: stairPos(p), body: climbBody(p * Math.PI, 0.2), pitch: 0 };
}
function others(t: number) {
  return CROWD.filter((c) => c.x !== 0).map((c) => {
    const q = QUIT[c.i];
    const sway = 0.02 * Math.sin(t * 1.3 + c.i);
    if (!q || t < q[0]) return { pos: [c.x, 0, c.z] as V3, rotY: Math.PI, body: { ...LOOKUP, spine: LOOKUP.spine + sway } as Body };
    const k = t - q[0];
    if (q[1] === 'walk') {
      const turn = sm(k / 0.7);
      const d = Math.max(0, k - 0.5) * 1.15;
      return { pos: [c.x + 0.1 * Math.sin(c.i), 0, c.z + d] as V3, rotY: lerp(Math.PI, 0.1 * (c.x > 0 ? 1 : -1), turn), body: k < 0.5 ? mixB(LOOKUP, STAND, sm(k / 0.5)) : walkBody((d / 0.65) * Math.PI, 0, 0.35) };
    }
    const target = q[1] === 'sit' ? SITG : SEIZA;
    return { pos: [c.x, 0, c.z] as V3, rotY: Math.PI + (q[1] === 'sit' ? 0.4 * Math.sign(c.x) : 0), body: mixB(LOOKUP, target, sm(k / 1.1)) };
  });
}
const Staircase: React.FC<{ t: number; hero: { pos: V3; body: Body; pitch: number }; crowd: boolean }> = ({ t, hero, crowd }) => {
  const stepMat = concrete('#7a7772', 6, 0.4, 0.88, 0, 11);
  const sideMat = concrete('#4e4c48', 3, 0.3, 0.95, 0, 12);
  const hp = hero.pos;
  const hs = Math.max(0, Math.round(-(hp[2] - 0.12) / RUN));
  return (
    <group>
      <fogExp2 attach="fog" args={['#0a0a0b', 0.03]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 14]} receiveShadow material={concrete('#6e6b66', 6, 10, 0.5, 0.12, 13)}>
        <planeGeometry args={[40, 30]} />
      </mesh>
      {Array.from({ length: NSTEP }, (_, i) => {
        const top = (i + 1) * RISE;
        return (
          <group key={i}>
            <mesh position={[0, top / 2, -(i + 0.5) * RUN]} material={stepMat} receiveShadow castShadow>
              <boxGeometry args={[16, top, RUN]} />
            </mesh>
            <mesh position={[0, top - 0.035, -i * RUN + 0.004]} material={LIGHT_DIM}>
              <boxGeometry args={[15.6, 0.018, 0.012]} />
            </mesh>
          </group>
        );
      })}
      {/* monumental side walls with light slits */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[9.5 * s, 22, -12]} material={sideMat} receiveShadow>
            <boxGeometry args={[3, 44, 60]} />
          </mesh>
          {Array.from({ length: 7 }, (_, k) => (
            <mesh key={k} position={[8 * s - 0.01 * s, 12 + k * 0.5, 8 - k * 6]} material={LIGHT_DIM}>
              <boxGeometry args={[0.02, 22, 0.08]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* the light at the top */}
      <sprite position={[0, NSTEP * RISE + 3, -NSTEP * RUN - 6]} scale={[30, 30, 1]}>
        <spriteMaterial map={glowTex()} color="#ffd6a0" transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} />
      </sprite>
      <spotLight position={[0, NSTEP * RISE + 6, -NSTEP * RUN - 4]} target-position={[0, 0, 2]} angle={0.42} penumbra={0.8} intensity={380} decay={1.7} distance={0} color="#ffe1bf" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0003} />
      <pointLight position={[hp[0] + 1.2, hp[1] + 2.2, hp[2] + 1.5]} intensity={2.2} distance={6} decay={1.6} color="#ffd2a0" />
      <hemisphereLight args={['#4c4944', '#000000', 0.2]} />
      {/* steps near the hero glow a bit brighter */}
      {[hs - 1, hs, hs + 1, hs + 2].filter((i) => i >= 0).map((i) => (
        <pointLight key={i} position={[0.6, (i + 1) * RISE + 0.05, -i * RUN + 0.25]} intensity={0.8} distance={1.6} decay={2} color="#ffc88a" />
      ))}
      {crowd ? others(t).map((o, i) => <Fig key={i} pos={o.pos} rotY={o.rotY} body={o.body} />) : null}
      <Fig pos={hero.pos} rotY={Math.PI} body={hero.body} pitch={hero.pitch} />
    </group>
  );
};

// ---------------------------------------------------------------- SET D/E — suspended platforms and the gate
const D0 = 21.0;
function heroD(t: number) {
  const v = 1.15;
  const z0 = -6;
  const walk1 = Math.min(t, 25.0) - D0;
  const pause0 = 25.0;
  const pause1 = 26.6;
  const stop = 31.0;
  if (t < pause0) { const z = z0 - walk1 * v; return { pos: [0, 0, z] as V3, body: walkBody((-z / 0.68) * Math.PI, 0, 0.05) }; }
  const zp = z0 - (pause0 - D0) * v;
  if (t < pause1) {
    const k = sm(prog(t, pause0, pause0 + 0.5)) * (1 - sm(prog(t, pause1 - 0.4, pause1)));
    return { pos: [0, 0, zp] as V3, body: mixB(STAND, { ...LOOKDOWN, head: [0.75, -0.35] }, k) };
  }
  if (t < stop) { const z = zp - (t - pause1) * v; return { pos: [0, 0, z] as V3, body: walkBody((-z / 0.68) * Math.PI, 0, 0.05) }; }
  const zs = zp - (stop - pause1) * v;
  if (t < 32.6) return { pos: [0, 0, zs] as V3, body: mixB(STAND, LOOKUP, sm(prog(t, stop, stop + 0.8))) };
  const z = zs - (t - 32.6) * 0.95;
  return { pos: [0, 0, z] as V3, body: walkBody((-z / 0.68) * Math.PI, 0, -0.1) };
}
const FLOATERS = Array.from({ length: 14 }, (_, i) => ({
  p: [(rnd(i, 21) - 0.5) * 60 + (rnd(i, 21) > 0.5 ? 10 : -10), -6 + rnd(i, 22) * 26, -10 - rnd(i, 23) * 60] as V3,
  s: [2 + rnd(i, 24) * 8, 0.6 + rnd(i, 25) * 1.5, 2 + rnd(i, 26) * 8] as V3,
}));
const Platforms: React.FC<{ t: number }> = ({ t }) => {
  const h = heroD(t);
  const gateK = 1 + 0.6 * sm(prog(t, 31, 35.5));
  const slab = concrete('#75726d', 2, 2, 0.85, 0, 31);
  return (
    <group>
      <fogExp2 attach="fog" args={['#09090a', 0.022]} />
      {/* first platform, the bridge, the last platform */}
      <mesh position={[0, -0.6, 4]} material={slab} receiveShadow castShadow><boxGeometry args={[5, 1.2, 5]} /></mesh>
      <mesh position={[0, -0.13, -6.5]} material={concrete('#6f6c67', 0.3, 6, 0.85, 0, 32)} receiveShadow castShadow><boxGeometry args={[0.9, 0.26, 16]} /></mesh>
      <mesh position={[0, -0.9, -19.5]} material={concrete('#77746f', 3, 3, 0.75, 0.05, 33)} receiveShadow castShadow><boxGeometry args={[10, 1.8, 10]} /></mesh>
      {/* edge light lines */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.44 * s, 0.005, -6.5]} material={LIGHT_DIM}><boxGeometry args={[0.015, 0.015, 16]} /></mesh>
      ))}
      {/* the gate */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[2.7 * s, 4.6, -23]} material={concrete('#5f5c58', 1, 4, 0.9, 0, 34)} castShadow receiveShadow><boxGeometry args={[1.2, 9.2, 1.4]} /></mesh>
      ))}
      <mesh position={[0, 9.8, -23]} material={concrete('#5f5c58', 4, 1, 0.9, 0, 35)} castShadow><boxGeometry args={[6.6, 1.2, 1.4]} /></mesh>
      <mesh position={[0, 4.6, -23.3]} material={GATE} scale={[gateK, 1, 1]}><planeGeometry args={[4.2, 9.2]} /></mesh>
      <sprite position={[0, 4.6, -22.6]} scale={[22 * gateK, 22 * gateK, 1]}>
        <spriteMaterial map={glowTex()} color="#ffd39a" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} />
      </sprite>
      <spotLight position={[0, 4.2, -22.2]} target-position={[0, 0, 4]} angle={0.5} penumbra={0.6} intensity={260 * gateK} decay={1.7} distance={0} color="#ffd6a2" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0003} />
      {/* other suspended blocks in the void */}
      {FLOATERS.map((f, i) => (
        <group key={i} position={f.p}>
          <mesh material={concrete('#55524e', 1, 1, 0.92, 0, 40 + (i % 3))} receiveShadow><boxGeometry args={f.s} /></mesh>
          <mesh position={[0, f.s[1] / 2 + 0.01, f.s[2] / 2]} material={LIGHT_DIM}><boxGeometry args={[f.s[0], 0.02, 0.02]} /></mesh>
        </group>
      ))}
      <hemisphereLight args={['#4a4741', '#0b0b0c', 0.55]} />
      <pointLight position={[h.pos[0] - 1.5, h.pos[1] + 2.5, h.pos[2] + 2]} intensity={3} distance={6} decay={1.6} color="#ffe2c0" />
      <Fig pos={h.pos} rotY={Math.PI} body={h.body} />
    </group>
  );
};

let GLOW: THREE.CanvasTexture | null = null;
export function glowTex() {
  if (GLOW) return GLOW;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, 'rgba(255,255,255,1)');
  rg.addColorStop(0.2, 'rgba(255,255,255,0.35)');
  rg.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 256, 256);
  GLOW = new THREE.CanvasTexture(c);
  return GLOW;
}

// ---------------------------------------------------------------- shots
type Shot = { pos: V3; target: V3; fov: number; focus: V3 };
function shot(t: number): { set: 'A' | 'B' | 'C' | 'D'; cam: Shot; hero: { pos: V3; body: Body; pitch: number } } {
  if (t < A_END) {
    const h = heroA(t);
    const k = ease(t / A_END);
    const hz = h.pos[2];
    return { set: 'A', hero: { ...h, pitch: 0 }, cam: { pos: [lerp(0.5, 0.25, k), lerp(1.2, 1.5, k), hz + lerp(4.8, 3.2, k)], target: [0, 1.35, hz - 8], fov: 36, focus: add(h.pos, [0, 1.2, 0]) } };
  }
  if (t < 13.0) {
    const h = heroB(t);
    const k = ease(prog(t, A_END, 13));
    const fol = sm(prog(t, 11.5, 13));
    const pos: V3 = lv([0.4, 0.55, 9.5], [0.2, 2.6, 6.4], k);
    const tgt: V3 = lv(lv([0, 3.2, -6], [0, 4.4, -10], k), add(h.pos, [0, 1.6, -2]), fol * 0.6);
    return { set: 'B', hero: h, cam: { pos, target: tgt, fov: 38, focus: add(h.pos, [0, 1.1, 0]) } };
  }
  if (t < D0) {
    const h = heroC(t);
    const hp = h.pos;
    const push = sm(prog(t, 15.0, 17.5)) * (1 - sm(prog(t, 18.6, 20.0)));
    const wide = sm(prog(t, 19.4, 21));
    const orbit = (t - 13) * 0.04;
    const off: V3 = lv(lv([3.3 + orbit, 1.5, 1.5], [2.0, 1.0, 1.1], push), [6.5, 4.2, 6.5], wide);
    return { set: 'C', hero: h, cam: { pos: add(hp, off), target: add(hp, [0, lerp(1.0, 0.75, push) + wide * 1.5, -0.2 - wide * 3]), fov: lerp(34, 40, wide), focus: add(hp, [0, 0.9, 0]) } };
  }
  const h = heroD(t);
  const hp = h.pos;
  if (t < 24.6) {
    const k = ease(prog(t, D0, 24.6));
    return { set: 'D', hero: { ...h, pitch: 0 }, cam: { pos: [lerp(10, 7.5, k), lerp(5.5, 4.2, k), lerp(9, 5, k)], target: [lerp(-0.5, 0, k), lerp(1.2, 1.6, k), lerp(-13, -14, k)], fov: 38, focus: add(hp, [0, 1, 0]) } };
  }
  if (t < 27.4) {
    const k = ease(prog(t, 24.6, 27.4));
    return { set: 'D', hero: { ...h, pitch: 0 }, cam: { pos: add(hp, [lerp(2.6, 2.0, k), lerp(2.6, 2.1, k), lerp(3.2, 2.6, k)]), target: add(hp, [-0.3, lerp(0.4, 0.7, k), -1.2]), fov: 36, focus: add(hp, [0, 1, 0]) } };
  }
  if (t < 31.2) {
    const k = ease(prog(t, 27.4, 31.2));
    return { set: 'D', hero: { ...h, pitch: 0 }, cam: { pos: add(hp, [lerp(0.7, 0.35, k), lerp(1.0, 1.3, k), lerp(4.5, 3.2, k)]), target: [0, 3.6, -23], fov: 38, focus: add(hp, [0, 1.2, 0]) } };
  }
  const k = ease(prog(t, 31.2, DUR));
  return { set: 'D', hero: { ...h, pitch: 0 }, cam: { pos: [0, lerp(1.3, 1.6, k), lerp(-5.5, -9.5, k)], target: [0, lerp(3.4, 4.2, k), -23], fov: 40, focus: add(hp, [0, 1.2, 0]) } };
}

// ---------------------------------------------------------------- overlay: captions, transitions
const CAPS: [number, number, string, number][] = [
  [1.4, 5.8, 'Tout le monde veut le sommet.', 0],
  [8.0, 12.4, 'Peu acceptent les marches.', 0],
  [15.9, 17.9, 'Chaque marche coûte.', 0],
  [18.3, 20.6, 'Mais il se relève.', 0],
  [25.1, 28.6, 'Seul. En silence.', 0],
];
const Overlay: React.FC<{ t: number }> = ({ t }) => {
  // dips between scenes
  const dip = Math.max(
    1 - Math.abs(t - A_END) / 0.4,
    1 - Math.abs(t - 13.0) / 0.25,
  );
  const flash = Math.max(0, 1 - Math.abs(t - D0) / 0.35);
  const endWhite = sm(prog(t, 34.3, 35.3));
  const endBlack = sm(prog(t, 35.4, 36));
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <style>{`@font-face{font-family:I7;src:url(${staticFile('Inter-700.woff2')})}@font-face{font-family:I5;src:url(${staticFile('Inter-500.woff2')})}`}</style>
      {CAPS.map(([a, b, txt], i) => {
        if (t < a - 0.01 || t > b + 0.01) return null;
        const k = sm(prog(t, a, a + 0.9)) * (1 - sm(prog(t, b - 0.7, b)));
        return (
          <div key={i} style={{ position: 'absolute', left: 60, right: 60, top: 1500, textAlign: 'center', fontFamily: 'I5', fontSize: 54, color: '#f1ede6', letterSpacing: 1, opacity: k, filter: `blur(${(1 - k) * 6}px)`, transform: `translateY(${(1 - k) * 12}px)`, textShadow: '0 2px 30px rgba(0,0,0,.9)' }}>{txt}</div>
        );
      })}
      {/* title */}
      {t > 32.4 ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1380, textAlign: 'center', color: '#1a1815', opacity: 1 }}>
          <div style={{ fontFamily: 'I5', fontSize: 56, color: '#fbf6ee', opacity: sm(prog(t, 32.4, 33.3)) * (1 - endBlack), textShadow: '0 2px 30px rgba(0,0,0,.6)' }}>Personne ne voit les marches.</div>
          <div style={{ fontFamily: 'I7', fontSize: 64, marginTop: 20, color: '#ffffff', opacity: sm(prog(t, 33.4, 34.2)) * (1 - endBlack), textShadow: '0 2px 30px rgba(0,0,0,.6)' }}>Seulement le sommet.</div>
        </div>
      ) : null}
      <AbsoluteFill style={{ background: '#000', opacity: Math.max(0, dip) }} />
      <AbsoluteFill style={{ background: '#fff1dc', opacity: flash * 0.9 }} />
      <AbsoluteFill style={{ background: '#fff4e4', opacity: endWhite * 0.85 * (1 - endBlack) }} />
      <AbsoluteFill style={{ background: '#000', opacity: endBlack + (t < 0.6 ? 1 - t / 0.6 : 0) }} />
    </AbsoluteFill>
  );
};

export const Main: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const s = shot(t);
  const focus = useMemo(() => new THREE.Vector3(), []);
  focus.set(...s.cam.focus);
  // handheld micro-drift
  const drift: V3 = [0.02 * Math.sin(t * 0.9), 0.015 * Math.sin(t * 1.3), 0.02 * Math.cos(t * 0.7)];
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <ThreeCanvas width={W} height={H} shadows="soft" gl={{ antialias: false, powerPreference: 'high-performance' }}>
        <color attach="background" args={['#09090a']} />
        <Env intensity={0.12} />
        <CamRig pos={add(s.cam.pos, drift)} target={s.cam.target} fov={s.cam.fov} exposure={0.88} />
        {s.set === 'A' ? <Corridor t={t} /> : null}
        {s.set === 'B' ? <Staircase t={t} hero={s.hero} crowd /> : null}
        {s.set === 'C' ? <Staircase t={t} hero={s.hero} crowd={false} /> : null}
        {s.set === 'D' ? <Platforms t={t} /> : null}
        <EffectComposer multisampling={4}>
          <DepthOfField target={focus} focalLength={0.03} bokehScale={3.2} height={960} />
          <Bloom intensity={0.85} luminanceThreshold={0.8} luminanceSmoothing={0.2} mipmapBlur radius={0.7} />
          <Noise opacity={0.05} premultiply />
          <Vignette offset={0.28} darkness={0.75} />
        </EffectComposer>
      </ThreeCanvas>
      <Overlay t={t} />
    </AbsoluteFill>
  );
};
