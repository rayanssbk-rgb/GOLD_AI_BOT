// Rooftop above the city. "dusk": Dre on the ledge, Vince walks up. "night": the decision.
import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { CamRig, mat, sitBody, walkBody, Glow, Body, V3 } from '../three/lib';
import { Sky, Sun, Skyline, useDowntown, talk } from '../world';
import { Dre, Vince } from '../cast';
import { SC, LINE, BEAT, tod, kf, prog, ease, lerp, WIDTH, HEIGHT } from '../timeline.js';

const LEDGE_Z = -1.05;

/** blend two poses */
function mixBody(a: Body, b: Body, k: number): Body {
  const out: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.forEach((key) => {
    const va = (a as Record<string, unknown>)[key] ?? (b as Record<string, unknown>)[key];
    const vb = (b as Record<string, unknown>)[key] ?? va;
    out[key] = Array.isArray(va) ? (va as number[]).map((x, i) => lerp(x, (vb as number[])[i], k)) : lerp(va as number, vb as number, k);
  });
  return out as Body;
}
const STAND: Body = { pelvisY: 0.96, spine: 0.04, head: [0, 0], shL: [0, 0.06], shR: [0, 0.06], elL: 0.15, elR: 0.15, hipL: [0, 0.02], hipR: [0, 0.02], knL: 0.05, knR: 0.05 };

export const Roof: React.FC<{ f: number; variant: 'dusk' | 'night' }> = ({ f, variant }) => {
  const night = variant === 'night';
  const t = tod(f);
  const [a, b] = night ? SC.roof2 : SC.roof1;
  const blocks = useDowntown(5200);

  // ---- Dre on the ledge (sitting, legs over the city), talks with small head moves
  const dTalk = night ? talk(f, LINE.d2, 'd2') : talk(f, LINE.d1, 'd1');
  const vTalk = night ? talk(f, LINE.v3, 'v3') : Math.max(talk(f, LINE.v1, 'v1'), talk(f, LINE.v2, 'v2'));
  const breath = Math.sin(f * 0.07) * 0.015;
  const sit = { ...sitBody(0.18 + breath, 0.35), shL: [-0.35, 0.18] as [number, number], shR: [-0.35, 0.18] as [number, number], elL: 0.4, elR: 0.4, knL: 1.35, knR: 1.25 };
  let dreBody: Body = { ...sit, head: [0.15 - 0.08 * dTalk + breath, 0.25 * vTalk] };
  let drePos: V3 = [0, 0.08, LEDGE_Z];
  let dreRot = Math.PI;
  if (night) {
    // stands up, steps back onto the roof and turns to Vince
    const up = ease(prog(f, BEAT.dreStand, BEAT.dreStand + 24));
    const turn = ease(prog(f, BEAT.dreStand + 14, BEAT.dreStand + 36));
    dreBody = mixBody(dreBody, { ...STAND, head: [0.02 - 0.06 * dTalk, 0] }, up);
    drePos = [0, lerp(0.08, 0, up), lerp(LEDGE_Z, -0.5, up)];
    dreRot = lerp(Math.PI, Math.PI / 2 + 0.35, turn);
  }

  // ---- Vince: walks in (dusk) / stands beside him
  const vStop = LINE.v1 - 10;
  let vBody: Body;
  let vPos: V3;
  if (!night && f < vStop) {
    const k = prog(f, vStop - 70, vStop);
    vPos = [lerp(2.4, 0.95, k), 0, lerp(3.2, -0.45, k)];
    vBody = walkBody(f * 0.27, 0, 0.05);
  } else {
    vPos = [0.95, 0, -0.45];
    vBody = { ...STAND, spine: 0.02, head: [0.12 - 0.07 * vTalk, -0.25 + 0.05 * Math.sin(f * 0.05)], shL: [0.05, 0.1], shR: [0.05, 0.1], elL: 0.25, elR: 0.25 };
  }
  const vRot = night ? Math.PI + 0.35 : f < vStop ? Math.PI - 0.38 : Math.PI + 0.25;

  // ---- camera
  const pos = (night
    ? kf(f, [
        [a, [-0.9, 1.3, 2.6]],
        [LINE.d2 - 20, [-0.7, 1.3, 2.0]],
        [LINE.d2 + 10, [-1.7, 1.4, 2.1]],
        [b, [-2.0, 1.5, 2.5]],
      ])
    : kf(f, [
        [a, [-1.5, 1.1, 3.4]],
        [LINE.v1 - 6, [-1.2, 1.2, 2.6]],
        [LINE.v2 + 10, [-0.9, 1.35, 2.3]],
        [b, [-0.3, 1.8, 3.4]],
      ])) as V3;
  const target = (night
    ? kf(f, [
        [a, [0.5, 0.95, -1.4]],
        [LINE.d2 - 20, [0.5, 1.1, -1.0]],
        [LINE.d2 + 10, [0.5, 1.25, -0.6]],
        [b, [0.5, 1.25, -0.7]],
      ])
    : kf(f, [
        [a, [0.3, 0.85, -1.4]],
        [LINE.v1 - 6, [0.55, 1.0, -1.2]],
        [LINE.v2 + 10, [0.6, 1.05, -1.1]],
        [b, [0.6, 1.0, -8]],
      ])) as V3;

  const roofMat = mat(night ? '#15161c' : '#3a3036', 0.92);
  return (
    <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: false }}>
      <fog attach="fog" args={[night ? '#0a1226' : '#c97a8e', 140, 1500]} />
      <Sky t={t} />
      <Sun t={t} at={[-260, -1500]} />
      <hemisphereLight args={[night ? '#40508a' : '#ffb7b0', '#1a1420', night ? 0.8 : 1.2]} />
      <directionalLight position={night ? [6, 8, -6] : [-6, 3, -12]} intensity={night ? 0.7 : 2.4} color={night ? '#7f9cd0' : '#ff9e86'} />
      {/* rim light from the city glow at night */}
      {night ? <directionalLight position={[0, 3, -12]} intensity={1.1} color="#ffb070" /> : null}
      <CamRig pos={pos} target={target} fov={54} exposure={night ? 1.6 : 1.05} />
      {/* roof slab, parapet, details */}
      <mesh position={[0, -0.1, 4]} material={roofMat}>
        <boxGeometry args={[18, 0.2, 10]} />
      </mesh>
      <mesh position={[0, 0.25, LEDGE_Z]} material={mat(night ? '#1d1e25' : '#4a3d40', 0.85)}>
        <boxGeometry args={[18, 0.5, 0.3]} />
      </mesh>
      <mesh position={[-4.5, 0.7, 4.5]} material={mat('#24222a', 0.8)}>
        <boxGeometry args={[2.2, 1.4, 1.8]} />
      </mesh>
      <mesh position={[5, 1.6, 6]} material={mat('#24222a', 0.6, 0.4)}>
        <cylinderGeometry args={[1, 1, 3.2, 20]} />
      </mesh>
      {/* antenna with a red beacon */}
      <mesh position={[-6.5, 2.5, 1.5]} material={mat('#1c1c20', 0.5, 0.6)}>
        <cylinderGeometry args={[0.04, 0.06, 5, 6]} />
      </mesh>
      <Glow position={[-6.5, 5.05, 1.5]} size={0.6} color="#ff3030" opacity={(Math.sin(f * 0.2) > 0.3 ? 1 : 0.15) * (night ? 1 : 0.6)} />
      {/* city far below */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -70, -700]} material={mat(night ? '#070910' : '#3a2c3a', 0.95)}>
        <planeGeometry args={[4000, 2400]} />
      </mesh>
      <Skyline t={t} blocks={blocks} y={-70} />
      {/* street grid lights far below at night */}
      {t > 0.5
        ? Array.from({ length: 24 }, (_, i) => <Glow key={i} position={[-600 + i * 52, -68, -260 - (i % 5) * 140]} size={30} color="#ffb060" opacity={0.35} />)
        : null}
      <Dre body={dreBody} position={drePos} rotY={dreRot} hood={night} />
      <Vince body={vBody} position={vPos} rotY={vRot} />
    </ThreeCanvas>
  );
};
