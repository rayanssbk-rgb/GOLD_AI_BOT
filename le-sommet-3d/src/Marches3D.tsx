// "Les marches" in minimalist cinematic 3D: two staircases of stone pillars, DISCIPLINE climbing steadily,
// OBSESSION bleeding with SHADOW right behind her. Same story as the 2D version, with the cold-open hook.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { EffectComposer, Bloom, DepthOfField, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Body, CamRig, Mannequin, V3, camTransform, walkBody } from './three/lib';
import { CROUCH, Env, FALL, KNEEL, LOOK, LOOKUP, P, STAND, add, climbBody, concrete, ease, glowTex, lerp, lv, mixB, prog, rnd, sm } from './Main';

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const HOOK = 2.6;
export const DUR = 31 + HOOK;

// ---------------------------------------------------------------- story (same beats as the 2D version)
function track(keys: [number, number][], t: number) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, s1] = keys[i];
    const [t0, s0] = keys[i - 1];
    if (t <= t1) return lerp(s0, s1, (t - t0) / (t1 - t0));
  }
  return keys[keys.length - 1][1];
}
const TOP = 30;
const DISC: [number, number][] = [[2.6, 0], [27.2, 31.5], [31, 33.6]];
const OBS: [number, number][] = [[2.6, 0], [6, 5.5], [9.2, 10.2], [10.2, 11.0], [15.8, 11.0], [16.8, 11.8], [21, 19.5], [26.6, 31.5], [31, 33.8]];
const SHAD: [number, number][] = [[2.6, -5], [9.5, 3.5], [14.6, 9.3], [16.2, 9.6], [31, 9.6]];
const B = { fall: 10.2, kneel: 10.6, look: 13.0, rise: 15.0, go: 15.8, shadowFade: 17.0, top: 26.6 };

// ---------------------------------------------------------------- world layout
const RISE = 0.3;
const RUN = 0.52;
const SW = 2.0; // staircase width
const XD = 1.35; // discipline staircase centre
const XO = -1.35; // obsession staircase centre
function stairPos(x: number, p: number): V3 {
  if (p <= 0) return [x, 0, 0.26 - p * 0.62];
  if (p <= TOP) return [x, p * RISE, 0.26 - p * RUN];
  return [x, TOP * RISE, 0.26 - TOP * RUN - (p - TOP) * 0.62];
}
function gait(x: number, p: number, tired = 0): { pos: V3; body: Body } {
  const pos = stairPos(x, p);
  if (p <= 0 || p > TOP + 0.5) return { pos, body: walkBody(p * Math.PI, 0, 0.05 + 0.25 * tired) };
  return { pos, body: climbBody(p * Math.PI, tired) };
}
function obsState(t: number) {
  const s = track(OBS, t);
  const walk = gait(XO, s, 0.6);
  if (t < B.fall || t > B.go + 0.6) return walk;
  const base = stairPos(XO, 11);
  if (t < B.kneel) { const k = ease(prog(t, B.fall, B.kneel)); return { pos: lv(walk.pos, base, k), body: mixB(walk.body, FALL, k) }; }
  if (t < B.rise) {
    const k = sm(prog(t, B.kneel, B.kneel + 0.5));
    const look = sm(prog(t, B.look, B.look + 0.5)) * (1 - sm(prog(t, B.rise - 0.4, B.rise)));
    const br = 0.05 * Math.sin(t * 3.4);
    const b = mixB(FALL, KNEEL, k);
    return { pos: base, body: { ...b, spine: b.spine + br - 0.3 * look, head: [b.head[0] - 0.9 * look, 1.2 * look] as [number, number] } };
  }
  const k = prog(t, B.rise, B.go + 0.6);
  return { pos: lv(base, walk.pos, sm(k)), body: k < 0.5 ? mixB(KNEEL, CROUCH, sm(k * 2)) : mixB(CROUCH, walk.body, sm(k * 2 - 1)) };
}
function shadowState(t: number) {
  const s = track(SHAD, t);
  const g = gait(XO, s);
  // reaches toward her while she is down
  const reach = sm(prog(t, 12.2, 13.4)) * (1 - sm(prog(t, 15.4, 16.4)));
  const b = P(g.body);
  return { pos: g.pos, body: { ...b, shR: [lerp(b.shR[0], -1.25, reach), 0.1] as [number, number], elR: lerp(b.elR, 0.15, reach), spine: b.spine + 0.15 * reach } };
}
const discState = (t: number) => gait(XD, track(DISC, t));

// ---------------------------------------------------------------- pieces
const SHADOW_LOOK = { skin: '#0a0a0b', pants: '#0a0a0b', shoe: '#050505', eye: true };
const Fig: React.FC<{ pos: V3; body: Body; dark?: boolean; opacity?: number; blood?: number }> = ({ pos, body, dark = false, opacity = 1, blood = 0 }) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      if (opacity < 1) {
        if (!m.userData.own) { m.material = (m.material as THREE.Material).clone(); m.userData.own = true; }
        const mm = m.material as THREE.Material;
        mm.transparent = true;
        mm.opacity = opacity;
        mm.depthWrite = opacity > 0.6;
      }
    });
  });
  return (
    <group ref={ref} position={pos} rotation={[0, Math.PI, 0]}>
      <Mannequin body={body} cloth={dark ? '#0b0b0c' : '#ebe8e2'} look={dark ? SHADOW_LOOK : LOOK} />
      {blood > 0 ? (
        // wound on her side
        <mesh position={[-0.2, 1.22 * (P(body).pelvisY / 0.95), 0.02]} scale={[0.5, 1, 0.9]}>
          <sphereGeometry args={[0.09, 16, 12]} />
          <meshStandardMaterial color="#8a0f0c" emissive="#5a0503" emissiveIntensity={0.6 * blood} roughness={0.4} />
        </mesh>
      ) : null}
    </group>
  );
};

const numCache = new Map<number, THREE.CanvasTexture>();
function numTex(n: number) {
  if (numCache.has(n)) return numCache.get(n)!;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(0,0,0,0)';
  g.fillRect(0, 0, 128, 128);
  g.font = '700 88px I7, Arial';
  g.textAlign = 'center';
  g.fillStyle = 'rgba(235,230,220,.85)';
  g.fillText(String(n), 64, 98);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  numCache.set(n, tx);
  return tx;
}
const LED = (k: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4 * k + 0.05, 2.5 * k + 0.05, 1.5 * k + 0.05), toneMapped: false });

const Staircase: React.FC<{ x: number; lit: number; numbers: boolean }> = ({ x, lit, numbers }) => {
  const stone = concrete('#8d8b87', 1.2, 2.2, 0.95, 0, 51);
  return (
    <group>
      {Array.from({ length: TOP }, (_, i) => {
        const k = i + 1;
        const top = k * RISE;
        const z = 0.26 - (k - 0.5) * RUN;
        const L = clamp01(lit - k + 1);
        return (
          <group key={k}>
            <mesh position={[x, top / 2, z]} material={stone} castShadow receiveShadow>
              <boxGeometry args={[SW, top, RUN - 0.012]} />
            </mesh>
            {L > 0 ? (
              <mesh position={[x, top - 0.028, z + RUN / 2 + 0.001]} material={LED(L)}>
                <boxGeometry args={[SW - 0.14, 0.022, 0.01]} />
              </mesh>
            ) : null}
            {numbers ? (
              <mesh position={[x + SW / 2 - 0.22, top - 0.2, z + RUN / 2 + 0.002]}>
                <planeGeometry args={[0.24, 0.24]} />
                <meshStandardMaterial map={numTex(k)} transparent roughness={0.9} emissive="#ffd8a6" emissiveMap={numTex(k)} emissiveIntensity={0.4 * L} />
              </mesh>
            ) : null}
          </group>
        );
      })}
      {/* top landing */}
      <mesh position={[x, (TOP * RISE) / 2, 0.26 - TOP * RUN - 3]} material={stone} castShadow receiveShadow>
        <boxGeometry args={[SW, TOP * RISE, 6]} />
      </mesh>
    </group>
  );
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const Blood: React.FC<{ t: number }> = ({ t }) => {
  const s = track(OBS, t);
  const drops = [];
  for (let k = 3; k <= Math.min(TOP, Math.floor(s)); k++) {
    const p = stairPos(XO, k);
    drops.push(
      <mesh key={k} position={[p[0] + (rnd(k, 1) - 0.5) * 0.7, p[1] + 0.004, p[2] - 0.05 - rnd(k, 2) * 0.2]} rotation={[-Math.PI / 2, 0, rnd(k, 3) * 3]} scale={[1, 0.6 + rnd(k, 4) * 0.5, 1]}>
        <circleGeometry args={[0.035 + rnd(k, 5) * 0.025, 12]} />
        <meshStandardMaterial color="#7a0a08" roughness={0.25} metalness={0.1} />
      </mesh>,
    );
  }
  const pool = t > B.kneel ? 0.08 + 0.3 * sm(prog(t, B.kneel, B.rise + 1)) : 0;
  const pp = stairPos(XO, 11);
  return (
    <group>
      {drops}
      {pool > 0 ? (
        <mesh position={[pp[0] - 0.12, pp[1] + 0.005, pp[2] - 0.1]} rotation={[-Math.PI / 2, 0, 0.4]} scale={[1, 0.65, 1]}>
          <circleGeometry args={[pool, 24]} />
          <meshStandardMaterial color="#6e0806" roughness={0.18} metalness={0.15} />
        </mesh>
      ) : null}
    </group>
  );
};

// ---------------------------------------------------------------- camera
type Cam = { pos: V3; target: V3; fov: number; focus: V3 };
function mainCam(t: number): Cam {
  const d = discState(t).pos;
  const o = obsState(t).pos;
  const mid: V3 = [(d[0] + o[0]) / 2, (d[1] + o[1]) / 2 + 0.9, (d[2] + o[2]) / 2];
  const wide = 1 - sm(prog(t, 0, 4.5));
  const close = sm(prog(t, 10.3, 11.6)) * (1 - sm(prog(t, 15.6, 17.4)));
  const end = sm(prog(t, 26.4, 30.5));
  const mid2 = sm(prog(t, 16.5, 18.5)) * (1 - end);
  const z = lerp(1.0, 1.55, wide) * lerp(1, 1.25, end) * lerp(1, 1.45, mid2);
  const base: V3 = add(mid, [6.2 * z, 5.0 * z, 6.6 * z]);
  const obsFocus: V3 = add(o, [0, 0.8, 0]);
  const closePos: V3 = add(obsFocus, [3.4, 2.4, 3.6]);
  const pos = lv(base, closePos, close);
  const target = lv(add(mid, [0, -0.2, -0.6]), add(obsFocus, [-0.4, 0, -0.4]), close);
  const focus = lv(mid, obsFocus, close);
  return { pos, target, fov: 34, focus };
}
function hookCam(h: number): { t: number; cam: Cam } {
  const t = 14.2 + h * 0.15;
  const sh = shadowState(t);
  const eye: V3 = add(sh.pos, [-0.036, 1.62, -0.36]);
  const wide = mainCam(t);
  const k = sm(prog(h, 0.75, 1.8));
  const kk = 1 - Math.pow(1 - k, 3);
  const close: Cam = { pos: add(eye, [0.16, 0.06, -0.6]), target: eye, fov: 30, focus: eye };
  const shake = h > 0.75 && h < 1.4 ? (1.4 - h) * 0.06 : 0;
  return {
    t,
    cam: {
      pos: add(lv(close.pos, wide.pos, kk), [shake * Math.sin(h * 90), shake * Math.cos(h * 70), 0]),
      target: lv(close.target, wide.target, kk),
      fov: lerp(30, 34, kk),
      focus: lv(eye, wide.focus, kk),
    },
  };
}
function project(cam: Cam, p: V3): [number, number] {
  const c = new THREE.PerspectiveCamera(cam.fov, W / H, 0.02, 4000);
  const tr = camTransform(cam.pos, cam.target);
  c.position.copy(tr.position);
  c.quaternion.copy(tr.quaternion);
  c.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(c);
  return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H];
}

// ---------------------------------------------------------------- overlay
const CAPTIONS: [number, number, string][] = [
  [3.6, 7.4, 'Trois forces. Les mêmes marches.'],
  [10.7, 12.6, "L'obsession saigne."],
  [12.7, 14.7, 'Elle veut s’arrêter.'],
  [14.8, 17.4, 'Elle refuse.'],
  [18.6, 22.2, 'La discipline compte chaque marche.'],
  [22.4, 26.0, "L'ombre, elle, reste en bas."],
];
const FONT = `@font-face{font-family:I7;src:url(${staticFile('Inter-700.woff2')})}@font-face{font-family:I5;src:url(${staticFile('Inter-500.woff2')})}`;
const Label: React.FC<{ at: [number, number]; text: string; color: string; glow: string; alpha: number; size: number }> = ({ at, text, color, glow, alpha, size }) =>
  alpha > 0.01 ? (
    <div style={{ position: 'absolute', left: at[0] - 300, width: 600, top: at[1] - size * 1.9, textAlign: 'center', fontFamily: 'I7', fontSize: size, letterSpacing: size * 0.16, color, opacity: alpha, textShadow: `0 0 18px ${glow}, 0 2px 10px rgba(0,0,0,.9)` }}>{text}</div>
  ) : null;

export const Marches3D: React.FC = () => {
  const f = useCurrentFrame();
  const ft = f / FPS;
  const hook = ft < HOOK ? hookCam(ft) : null;
  const t = hook ? hook.t : ft - HOOK;
  const cam = hook ? hook.cam : mainCam(t);
  const focus = useMemo(() => new THREE.Vector3(), []);
  focus.set(...cam.focus);
  const drift: V3 = [0.03 * Math.sin(ft * 0.6), 0.02 * Math.sin(ft * 0.9), 0.03 * Math.cos(ft * 0.5)];

  const d = discState(t);
  const o = obsState(t);
  const sh = shadowState(t);
  const shadowA = 1 - sm(prog(t, B.shadowFade, B.shadowFade + 2.4));
  const lightTop = 0.4 + 0.6 * sm(prog(t, 18, 27));
  const headOf = (s: { pos: V3; body: Body }): V3 => add(s.pos, [0, P(s.body).pelvisY + 0.95, 0]);
  const camFull = { ...cam, pos: add(cam.pos, drift) };
  const lab = (a: number) => (hook ? 0 : sm(prog(t, a, a + 0.5)) * (1 - sm(prog(t, 27.2, 27.8))));
  const labSize = Math.round(lerp(30, 40, sm(prog(t, 0, 4))));
  const eyeOpen = hook ? sm(prog(ft, 0.22, 0.42)) : 1;

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <style>{FONT}</style>
      <ThreeCanvas width={W} height={H} shadows="soft" gl={{ antialias: false, powerPreference: 'high-performance' }}>
        <color attach="background" args={['#0a0a0c']} />
        <fogExp2 attach="fog" args={['#0b0b0e', 0.022]} />
        <Env intensity={0.16} />
        <CamRig pos={camFull.pos} target={camFull.target} fov={cam.fov} exposure={0.92} />
        {/* ground and the dark back wall */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -6]} receiveShadow material={concrete('#5f6068', 10, 10, 0.85, 0.05, 52)}>
          <planeGeometry args={[60, 60]} />
        </mesh>
        <mesh position={[-9, 12, -10]} rotation={[0, Math.PI / 2, 0]} material={concrete('#2a2a2d', 6, 3, 0.95, 0, 53)} receiveShadow>
          <planeGeometry args={[60, 30]} />
        </mesh>
        <mesh position={[0, 12, -26]} material={concrete('#26262a', 6, 3, 0.95, 0, 54)} receiveShadow>
          <planeGeometry args={[60, 30]} />
        </mesh>
        <Staircase x={XO} lit={track(OBS, t)} numbers={false} />
        <Staircase x={XD} lit={track(DISC, t)} numbers />
        <Blood t={t} />
        {/* lights: soft key from the front-right, warm glow at the top, cool fill */}
        <spotLight position={[9, 14, 10]} target-position={[0, 2, -5]} angle={0.55} penumbra={0.9} intensity={420} decay={1.6} distance={0} color="#e9e4dc" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0003} shadow-radius={6} />
        <hemisphereLight args={['#6d7080', '#0b0b0d', 0.35]} />
        <pointLight position={[0, TOP * RISE + 2.5, 0.26 - TOP * RUN - 1.5]} intensity={40 * lightTop} distance={22} decay={1.4} color="#ffcf98" />
        <sprite position={[0, TOP * RISE + 3, 0.26 - TOP * RUN - 4]} scale={[18, 18, 1]}>
          <spriteMaterial map={glowTex()} color="#ffd6a2" transparent opacity={0.55 * lightTop} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} />
        </sprite>
        {/* warm light spilling from the steps they are on */}
        <pointLight position={add(d.pos, [0.4, 0.5, 0.6])} intensity={2.2} distance={3} decay={1.8} color="#ffc98c" />
        <pointLight position={add(o.pos, [0.4, 0.5, 0.6])} intensity={2.2} distance={3} decay={1.8} color="#ffc98c" />
        {shadowA > 0.01 ? <Fig pos={sh.pos} body={sh.body} dark opacity={shadowA} /> : null}
        {/* smoke as the shadow dissolves */}
        {t > B.shadowFade && t < B.shadowFade + 4
          ? Array.from({ length: 26 }, (_, i) => {
              const k = prog(t, B.shadowFade + rnd(i, 3) * 1.6, B.shadowFade + rnd(i, 3) * 1.6 + 1.8);
              if (k <= 0 || k >= 1) return null;
              const p = add(sh.pos, [(rnd(i, 4) - 0.5) * 0.6, 0.3 + rnd(i, 5) * 1.4 + 0.9 * k, (rnd(i, 6) - 0.5) * 0.4]);
              return (
                <sprite key={i} position={p} scale={[0.25 + 0.6 * k, 0.25 + 0.6 * k, 1]}>
                  <spriteMaterial map={glowTex()} color="#000000" transparent opacity={0.85 * (1 - k)} depthWrite={false} />
                </sprite>
              );
            })
          : null}
        <Fig pos={o.pos} body={o.body} blood={1} />
        <Fig pos={d.pos} body={d.body} />
        <EffectComposer multisampling={4}>
          <DepthOfField target={focus} focalLength={0.028} bokehScale={2.6} height={960} />
          <Bloom intensity={0.8} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur radius={0.65} />
          <Noise opacity={0.05} premultiply />
          <Vignette offset={0.3} darkness={0.7} />
        </EffectComposer>
      </ThreeCanvas>

      {/* labels follow the heads */}
      <Label at={project(camFull, headOf(d))} text="DISCIPLINE" color="#ffffff" glow="rgba(255,240,215,.6)" alpha={lab(0.6)} size={labSize} />
      <Label at={project(camFull, headOf(o))} text="OBSESSION" color="#ff4b3e" glow="rgba(255,60,40,.6)" alpha={lab(1.2)} size={labSize} />
      <Label at={project(camFull, headOf(sh))} text="SHADOW" color="#d4d6de" glow="rgba(200,210,255,.4)" alpha={lab(1.8) * shadowA} size={labSize - 2} />

      {/* captions */}
      {!hook
        ? CAPTIONS.map(([a, b, txt], i) => {
            if (t < a || t > b) return null;
            const out = prog(t, b - 0.3, b);
            return (
              <div key={i} style={{ position: 'absolute', left: 50, right: 50, top: 1620, textAlign: 'center', fontFamily: 'I7', fontSize: 58, color: '#fff', textShadow: '0 2px 24px rgba(0,0,0,.9)' }}>
                {txt.split(' ').map((w, j) => {
                  const k = sm(prog(t, a + j * 0.11, a + j * 0.11 + 0.35));
                  return (
                    <span key={j} style={{ display: 'inline-block', marginRight: '0.25em', opacity: k * (1 - out), transform: `translateY(${(1 - k) * 18}px)`, color: /saigne|refuse/.test(w) ? '#ff6a5e' : '#fff' }}>{w}</span>
                  );
                })}
              </div>
            );
          })
        : null}

      {/* cold open */}
      {hook ? (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: '#000', opacity: 1 - sm(prog(ft, 0.12, 0.35)) }} />
          <AbsoluteFill style={{ background: 'rgb(200,10,10)', opacity: ft > 0.75 ? 0.45 * Math.exp(-(ft - 0.75) * 7) : 0 }} />
          {[['SI TU T’ARRÊTES,', '#ffffff', 0.55], ['IL TE RATTRAPE.', '#ff4b3e', 1.05]].map(([txt, col, at], i) => {
            const k = prog(ft, at as number, (at as number) + 0.18);
            if (k <= 0) return null;
            const sc = lerp(1.9, 1, 1 - Math.pow(1 - k, 3));
            return (
              <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: 1380 + i * 135, textAlign: 'center', fontFamily: 'I7', fontSize: 100, color: col as string, transform: `scale(${sc})`, opacity: Math.min(1, k * 2) * (1 - prog(ft, HOOK - 0.25, HOOK)), WebkitTextStroke: '3px rgba(0,0,0,.8)', textShadow: i ? '0 0 30px rgba(255,40,30,.9)' : '0 0 30px rgba(255,255,255,.5)' }}>{txt}</div>
            );
          })}
          {eyeOpen < 1 ? <AbsoluteFill style={{ background: '#000', opacity: (1 - eyeOpen) * 0.9 }} /> : null}
          <AbsoluteFill style={{ background: '#fff6e8', opacity: prog(ft, HOOK - 0.12, HOOK) }} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: '#fff6e8', opacity: 1 - prog(t, 0, 0.25) }} />
      )}

      {/* end card */}
      {t > 27.3 && !hook ? (
        <AbsoluteFill style={{ background: `rgba(0,0,0,${0.55 * sm(prog(t, 27.4, 28.4))})` }}>
          <div style={{ position: 'absolute', top: 820, width: '100%', textAlign: 'center', fontFamily: 'I7', fontSize: 96, lineHeight: 1.12, color: '#fff', opacity: sm(prog(t, 27.4, 28.4)), textShadow: '0 0 30px rgba(255,220,170,.8)' }}>Continue<br />de monter.</div>
          <div style={{ position: 'absolute', top: 1080, width: '100%', textAlign: 'center', fontFamily: 'I7', fontSize: 40, color: 'rgba(255,255,255,.75)', opacity: sm(prog(t, 28.4, 29.2)) }}>Même en saignant.</div>
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{ background: '#000', opacity: hook ? 0 : prog(t, DUR - HOOK - 0.6, DUR - HOOK) }} />
    </AbsoluteFill>
  );
};
