// SCENE 3 — LE DÉCLIC (POV, one continuous shot): clock hits 02:00, laptop, fists, goals, typing.
import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { CamRig, Hand, mat, Buildings, makeBlocks, Glow, V3 } from '../three/lib';
import { Laptop, drawCode, Notebook, drawNotebook, penUV, WallClock, RainGlass } from '../three/props';
import { SC, BEAT, kf, prog, ease, lerp, rnd, WIDTH, HEIGHT } from '../timeline.js';

export const GOALS = ['Mes objectifs', '1. Me lever à 5 h', '2. Apprendre chaque jour', '3. Construire mon projet', '4. Ne jamais abandonner'];
const NB: V3 = [0.33, 0.752, 0.1];
const NB_ROT = -0.22;

export function nbWorld(uv: [number, number]): V3 {
  const lx = (uv[0] - 0.5) * 0.21;
  const lz = (uv[1] - 0.5) * 0.28;
  const c = Math.cos(NB_ROT);
  const s = Math.sin(NB_ROT);
  return [NB[0] + lx * c + lz * s, NB[1] + 0.014, NB[2] - lx * s + lz * c];
}

export const typingTaps = (f: number, k = 1) => [0, 1, 2, 3].map((i) => k * 0.5 * Math.pow(Math.max(0, Math.sin(f * 1.7 + i * 1.9)), 4));

/** The desk room, reused by the montage. lux: 0 night .. 1 morning. lamp: desk lamp 0..1 */
export const DeskRoom: React.FC<{ f: number; lux?: number; lamp?: number; rain?: boolean; seconds?: number; children?: React.ReactNode }> = ({ f, lux = 0, lamp = 0, rain = true, seconds = 7200, children }) => {
  const city = useMemo(() => makeBlocks(1200, 120, (i) => [80 + rnd(i) * 700, (rnd(i + 3) - 0.5) * 1200], [40, 40], [40, 220]), []);
  const sky = `rgb(${[5, 7, 12].map((v, i) => Math.round(v + ([60, 44, 34][i] - v) * lux)).join(',')})`;
  return (
    <group>
      <color attach="background" args={[sky]} />
      <hemisphereLight args={[lux > 0.5 ? '#ffd9b0' : '#33405c', '#0a0b0e', 0.9 + lux * 1.4]} />
      <directionalLight position={[8, 6, 2]} intensity={0.8 + lux * 4} color={lux > 0.5 ? '#ffc58a' : '#7f9cd0'} />
      {lamp > 0 ? <pointLight position={[-0.42, 1.2, -0.12]} intensity={1.2 * lamp} distance={3} decay={1.6} color="#ffb86b" /> : null}
      {/* walls */}
      <mesh position={[0, 1.35, -0.62]} material={mat(lux > 0.6 ? '#3a3028' : '#1c1f26', 0.95)}>
        <planeGeometry args={[4, 2.7]} />
      </mesh>
      <mesh position={[-1.4, 1.35, 0.8]} rotation-y={Math.PI / 2} material={mat('#1a1d23', 0.95)}>
        <planeGeometry args={[3, 2.7]} />
      </mesh>
      {/* right wall with window */}
      <group position={[1.1, 0, 0.4]} rotation-y={-Math.PI / 2}>
        <mesh position={[-1.2, 1.35, 0]} material={mat('#1a1d23', 0.95)}>
          <boxGeometry args={[1.0, 2.7, 0.05]} />
        </mesh>
        <mesh position={[1.25, 1.35, 0]} material={mat('#1a1d23', 0.95)}>
          <boxGeometry args={[1.0, 2.7, 0.05]} />
        </mesh>
        <mesh position={[0, 0.45, 0]} material={mat('#1a1d23', 0.95)}>
          <boxGeometry args={[1.5, 0.9, 0.05]} />
        </mesh>
        <mesh position={[0, 2.5, 0]} material={mat('#1a1d23', 0.95)}>
          <boxGeometry args={[1.5, 0.4, 0.05]} />
        </mesh>
        {rain ? <RainGlass f={f} w={1.5} h={1.4} position={[0, 1.6, 0.03]} id="glassDesk" /> : null}
      </group>
      <group position={[0, -60, 0]}>
        <Buildings blocks={city} lit={0.3 - lux * 0.15} ei={2 - lux} />
      </group>
      <Glow position={[400, 30, 0]} size={900} color={lux > 0.5 ? '#ffb36b' : '#2c4a80'} opacity={0.25 + 0.5 * lux} />
      {/* desk */}
      <mesh position={[0, 0.73, 0]} material={mat('#2e2620', 0.5)}>
        <boxGeometry args={[1.5, 0.04, 0.75]} />
      </mesh>
      <mesh position={[0, 0.355, -0.33]} material={mat('#1d1916', 0.7)}>
        <boxGeometry args={[1.46, 0.71, 0.03]} />
      </mesh>
      {/* desk lamp */}
      <group position={[-0.45, 0.75, -0.2]}>
        <mesh position={[0, 0.01, 0]} material={mat('#1d2027', 0.4, 0.6)}>
          <cylinderGeometry args={[0.07, 0.08, 0.02, 20]} />
        </mesh>
        <mesh position={[0.02, 0.2, 0]} rotation={[0, 0, -0.2]} material={mat('#1d2027', 0.4, 0.6)}>
          <cylinderGeometry args={[0.01, 0.01, 0.4, 8]} />
        </mesh>
        <mesh position={[0.1, 0.42, 0.04]} rotation={[0.5, 0, -0.9]} material={mat('#23272f', 0.4, 0.6)}>
          <coneGeometry args={[0.07, 0.12, 20, 1, true]} />
        </mesh>
        <Glow position={[0.12, 0.38, 0.06]} size={0.25 + 0.5 * lamp} color="#ffc27a" opacity={0.15 + 0.85 * lamp} />
      </group>
      {/* mug, books */}
      <mesh position={[0.5, 0.8, -0.18]} material={mat('#c9c2b6', 0.5)}>
        <cylinderGeometry args={[0.04, 0.036, 0.1, 16]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-0.55, 0.77 + i * 0.035, 0.12]} rotation={[0, 0.2 * i, 0]} material={mat(['#3a2c26', '#26303a', '#4a3a26'][i], 0.8)}>
          <boxGeometry args={[0.2, 0.033, 0.27]} />
        </mesh>
      ))}
      <WallClock seconds={seconds} position={[-0.35, 1.78, -0.6]} />
      {children}
    </group>
  );
};

export const Desk: React.FC<{ f: number }> = ({ f }) => {
  const a = SC.clock[0];
  const seconds = 7197 + Math.floor((f - a) / 30) + 0; // 01:59:57 -> 02:00:00 at a+90
  const sec = f < a + 96 ? seconds : 7200 + Math.floor((f - a - 96) / 30);
  // camera: clock close-up -> seated POV -> fists -> notebook -> typing
  const pos = kf(f, [
    [a, [-0.35, 1.76, 0.12]],
    [a + 90, [-0.33, 1.74, 0.02]],
    [a + 128, [0, 1.22, 0.55]],
    [BEAT.fist, [0, 1.2, 0.52]],
    [BEAT.fist + 70, [0, 1.1, 0.5]],
    [BEAT.write - 6, [0.1, 1.16, 0.48]],
    [BEAT.write + 10, [0.22, 1.12, 0.45]],
    [BEAT.type - 4, [0.22, 1.12, 0.45]],
    [BEAT.type + 16, [0, 1.2, 0.52]],
    [SC.desk[1], [0, 1.18, 0.45]],
  ]) as V3;
  const target = kf(f, [
    [a, [-0.35, 1.76, -0.6]],
    [a + 90, [-0.35, 1.74, -0.6]],
    [a + 128, [0, 0.82, -0.05]],
    [BEAT.fist, [0, 0.8, 0.0]],
    [BEAT.fist + 70, [0, 0.76, 0.16]],
    [BEAT.write - 6, [0.25, 0.76, 0.1]],
    [BEAT.write + 10, [0.33, 0.75, 0.08]],
    [BEAT.type - 4, [0.33, 0.75, 0.08]],
    [BEAT.type + 16, [0, 0.86, -0.08]],
  ]) as V3;
  const breath = Math.sin(f * 0.07) * 0.004;
  const open = ease(prog(f, a + 136, a + 160));
  const fist = ease(prog(f, BEAT.fist + 10, BEAT.fist + 60)) * (1 - ease(prog(f, BEAT.write - 20, BEAT.write - 4)));
  const tremble = fist > 0.5 ? Math.sin(f * 2.7) * 0.0015 : 0;
  const chars = Math.max(0, Math.floor((f - BEAT.write - 4) * 1.15));
  const writing = f >= BEAT.write - 6 && f < BEAT.type;
  const tip = nbWorld(penUV(chars, GOALS));
  const wob = writing ? Math.sin(f * 2.2) * 0.003 : 0;
  const typing = f >= BEAT.type + 6;
  const lamp = ease(prog(f, BEAT.type + 26, BEAT.type + 34));

  // hands (world space)
  let rightHand: React.ReactNode;
  let leftHand: React.ReactNode;
  if (typing) {
    rightHand = (
      <group position={[0.088, 0.79, 0.19]} rotation={[0.25, 0.12, 0]}>
        <Hand curl={0.35} thumb={0.6} tap={typingTaps(f)} />
      </group>
    );
    leftHand = (
      <group position={[-0.088, 0.79, 0.19]} rotation={[0.25, -0.12, 0]}>
        <Hand mirror curl={0.35} thumb={0.6} tap={typingTaps(f + 13)} />
      </group>
    );
  } else if (writing) {
    rightHand = (
      <group position={[tip[0] + 0.055 + wob, tip[1] + 0.045, tip[2] + 0.12]} rotation={[0.55, 0.35, -0.25]}>
        <Hand curl={0.7} thumb={0.8} />
        <mesh position={[-0.03, -0.02, -0.11]} rotation={[0.95, 0, 0.25]} material={mat('#16181d', 0.3, 0.5)}>
          <cylinderGeometry args={[0.0045, 0.0035, 0.14, 10]} />
        </mesh>
      </group>
    );
    leftHand = (
      <group position={[0.15, 0.775, 0.22]} rotation={[0.05, -0.4, 0]}>
        <Hand mirror curl={0.25} />
      </group>
    );
  } else {
    const opening = f >= a + 128 && f < a + 168;
    rightHand = (
      <group position={opening ? [lerp(0.14, 0.02, ease(prog(f, a + 128, a + 140))) * (1 - ease(prog(f, a + 158, a + 168))) + 0.13 * ease(prog(f, a + 158, a + 168)), 0.79 + 0.12 * open * (f < a + 160 ? 1 : 0), lerp(0.16, 0.0, ease(prog(f, a + 128, a + 140)))] : [0.13 + tremble, 0.775, 0.17]} rotation={[0.08, 0.2, 0]}>
        <Hand curl={0.12 + fist * 0.95} thumb={0.2 + fist * 0.7} />
      </group>
    );
    leftHand = (
      <group position={[-0.13 - tremble, 0.775, 0.17]} rotation={[0.08, -0.2, 0]}>
        <Hand mirror curl={0.12 + fist * 0.95} thumb={0.2 + fist * 0.7} />
      </group>
    );
  }
  const err = 0;
  return (
    <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: false }}>
      <fog attach="fog" args={['#0b1220', 200, 1200]} />
      <CamRig pos={[pos[0], pos[1] + breath, pos[2]]} target={target} fov={f < a + 100 ? 40 : 56} exposure={1.15} />
      <DeskRoom f={f} seconds={sec} lamp={lamp} lux={0.12 * lamp}>
        <Laptop open={open} id="deskLaptop" position={[0, 0.75, -0.05]} draw={drawCode(Math.max(0, f - a - 150), { error: err, seed: 3 })} />
        <Notebook id="goals" position={NB} rotY={NB_ROT} draw={drawNotebook(chars, GOALS)} />
        {rightHand}
        {leftHand}
      </DeskRoom>
    </ThreeCanvas>
  );
};

