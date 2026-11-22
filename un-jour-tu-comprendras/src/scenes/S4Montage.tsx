// SCENE 4 — LA TRANSFORMATION: 9-shot montage, light warming up shot after shot.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill } from 'remotion';
import { CamRig, Hand, mat, Mannequin, walkBody, sitBody, Buildings, makeBlocks, WetGround, Glow, gradientTexture, V3 } from '../three/lib';
import { Phone, drawAlarm, Laptop, drawCode, Notebook, drawNotebook, penUV } from '../three/props';
import { DeskRoom, typingTaps } from './S3Desk';
import { MONTAGE as M, prog, ease, lerp, rnd, WIDTH, HEIGHT } from '../timeline.js';

const Canvas: React.FC<{ children: React.ReactNode; fog?: [string, number, number] }> = ({ children, fog }) => (
  <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: false }}>
    {fog ? <fog attach="fog" args={fog} /> : null}
    {children}
  </ThreeCanvas>
);

// 1) 05:00 — alarm
const Alarm: React.FC<{ f: number }> = ({ f }) => {
  const a = M[0];
  const reach = ease(prog(f, a + 14, a + 34));
  const tap = Math.sin(Math.PI * prog(f, a + 34, a + 42));
  const lit = f < a + 40 ? 1 : 0.4;
  return (
    <Canvas>
      <color attach="background" args={['#030406']} />
      <hemisphereLight args={['#22304a', '#050608', 0.7]} />
      <pointLight position={[0.35, 0.75, -0.2]} intensity={0.25 * lit} distance={2} decay={2} color="#ffb070" />
      <CamRig pos={[0.05, 0.98, 0.3]} target={[0.34, 0.55, -0.26]} fov={50} roll={-0.18} exposure={1.3} />
      {/* bed sheet + pillow */}
      <mesh position={[-0.3, 0.42, 0.2]} material={mat('#2a2f3a', 0.95)} scale={[1, 0.25, 1]}>
        <sphereGeometry args={[0.6, 24, 16]} />
      </mesh>
      {/* nightstand */}
      <mesh position={[0.38, 0.27, -0.3]} material={mat('#241f1b', 0.7)}>
        <boxGeometry args={[0.45, 0.54, 0.4]} />
      </mesh>
      <group position={[0.36, 0.545, -0.28]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <Phone id="alarm" draw={drawAlarm(f)} light={false} />
      </group>
      <Glow position={[0.36, 0.56, -0.28]} size={0.5} color="#ffa060" opacity={0.25 * lit} />
      {/* window, still dark blue */}
      <mesh position={[0.2, 1.3, -1.2]} material={mat('#000', 1, 0, '#1b2b48', 0.8)}>
        <planeGeometry args={[1.2, 1.1]} />
      </mesh>
      <group position={[lerp(0.2, 0.36, reach), lerp(0.5, 0.585 - 0.025 * tap, reach), lerp(0.25, -0.17, reach)]} rotation={[0.25, 0.45, 0.15]}>
        <Hand curl={0.25} tap={[0.6, 0, 0, 0]} />
      </group>
    </Canvas>
  );
};

// 2) dawn work / 5) failure — POV desk
const Work: React.FC<{ f: number; fail?: boolean }> = ({ f, fail = false }) => {
  const a = fail ? M[4] : M[1];
  const slam = fail ? Math.max(0, Math.sin(Math.PI * prog(f, a + 22, a + 30))) : 0;
  const shake = fail && f > a + 28 ? Math.exp(-(f - a - 28) / 4) * Math.sin(f * 3) * 0.01 : 0;
  const err = fail ? ease(prog(f, a + 2, a + 10)) : 0;
  const lux = fail ? 0.45 : 0.25;
  return (
    <Canvas fog={['#0b1220', 200, 1200]}>
      <CamRig pos={[0 + shake, 1.18 + shake, 0.5]} target={[0, 0.86, -0.08]} fov={54} exposure={1.2} />
      <DeskRoom f={f} lux={lux} lamp={1} rain={!fail}>
        <Laptop open={1} id={fail ? 'failLap' : 'dawnLap'} position={[0, 0.75, -0.05]} draw={drawCode(f - a + 200, { error: err, seed: fail ? 9 : 5 })} lightColor={fail ? '#ff5a64' : '#9cc0ff'} />
        {fail ? (
          <>
            <group position={[0.1, 0.79 + 0.12 * (1 - slam) * prog(f, a + 12, a + 22), 0.24]} rotation={[0.2, 0.2, 0]}>
              <Hand curl={1} thumb={0.9} />
            </group>
            <group position={[-0.12, 0.775, 0.2]} rotation={[0.1, -0.2, 0]}>
              <Hand mirror curl={0.3} />
            </group>
          </>
        ) : (
          <>
            <group position={[0.088, 0.79, 0.19]} rotation={[0.25, 0.12, 0]}>
              <Hand curl={0.35} thumb={0.6} tap={typingTaps(f, 1.4)} />
            </group>
            <group position={[-0.088, 0.79, 0.19]} rotation={[0.25, -0.12, 0]}>
              <Hand mirror curl={0.35} thumb={0.6} tap={typingTaps(f + 13, 1.4)} />
            </group>
          </>
        )}
      </DeskRoom>
    </Canvas>
  );
};

// 3) learning — turning the pages of a book
const Learn: React.FC<{ f: number }> = ({ f }) => {
  const a = M[2];
  const page = prog(f, a + 8, a + 30);
  const pageAng = Math.PI * ease(page);
  const paper = mat('#ece6d8', 0.9);
  return (
    <Canvas fog={['#0b1220', 200, 1200]}>
      <CamRig pos={[0.05, 1.12, 0.42]} target={[0, 0.76, 0.05]} fov={50} exposure={1.2} />
      <DeskRoom f={f} lux={0.35} lamp={1} rain={false}>
        <group position={[0, 0.755, 0.05]}>
          <mesh position={[-0.12, 0.012, 0]} material={paper}>
            <boxGeometry args={[0.24, 0.025, 0.32]} />
          </mesh>
          <mesh position={[0.12, 0.012, 0]} material={paper}>
            <boxGeometry args={[0.24, 0.025, 0.32]} />
          </mesh>
          {/* printed lines */}
          {Array.from({ length: 18 }, (_, i) => (
            <mesh key={i} position={[i < 9 ? -0.12 : 0.12, 0.0255, -0.12 + (i % 9) * 0.028]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#5a5852', 0.9)}>
              <planeGeometry args={[0.18 - (i % 3) * 0.02, 0.006]} />
            </mesh>
          ))}
          {/* turning page around the spine */}
          <group position={[0, 0.026, 0]} rotation={[0, 0, pageAng]}>
            <mesh position={[0.12, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} material={new THREE.MeshStandardMaterial({ color: '#f3eee3', side: THREE.DoubleSide, roughness: 0.9 })}>
              <planeGeometry args={[0.235, 0.31]} />
            </mesh>
          </group>
        </group>
        <group position={[lerp(0.2, 0.05, ease(page)) + 0.03, 0.8 + 0.05 * Math.sin(Math.PI * page), 0.16]} rotation={[0.3, 0.3, -0.2]}>
          <Hand curl={0.25} thumb={0.3} />
        </group>
        <Notebook id="learnNb" position={[0.33, 0.752, 0.12]} rotY={-0.3} draw={drawNotebook(200, ['Notes', '— marketing', '— vente', '— code'])} />
      </DeskRoom>
    </Canvas>
  );
};

// 4) & 9) running at dawn
const sky = (k: number) =>
  gradientTexture(
    [
      [0, k > 0.5 ? '#3a5a8c' : '#0b1426'],
      [0.55, k > 0.5 ? '#f0a070' : '#3a4c6e'],
      [1, k > 0.5 ? '#ffd8a0' : '#c98a5a'],
    ],
    `sky${k > 0.5 ? 1 : 0}`,
  );
const Run: React.FC<{ f: number; bright?: boolean }> = ({ f, bright = false }) => {
  const a = bright ? M[8] : M[3];
  const t = (f - a) / 30;
  const city = useMemo(() => makeBlocks(1500, 70, (i) => [(rnd(i) - 0.5) * 700, -120 - rnd(i + 3) * 300], [30, 30], [40, 200]), []);
  const runnerZ = -t * 4.2;
  const ph = (t * 4.2) / 1.6 * Math.PI * 2;
  const camPos: V3 = bright ? [0.6, 0.6, runnerZ - 3.2 + t * 0.4] : [3.2, 1.0, runnerZ - 0.6];
  const camT: V3 = bright ? [0, 1.25, runnerZ] : [0, 1.1, runnerZ - 0.4];
  return (
    <Canvas fog={[bright ? '#f2b07a' : '#3a4c6e', 30, bright ? 420 : 300]}>
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[900, 32, 16]} />
        <meshBasicMaterial map={sky(bright ? 1 : 0)} side={THREE.BackSide} fog={false} toneMapped={false} />
      </mesh>
      <hemisphereLight args={[bright ? '#ffd9b0' : '#8aa0c8', '#202020', bright ? 2.2 : 1.4]} />
      <directionalLight position={[0, 6, -40]} intensity={bright ? 4 : 1.5} color={bright ? '#ffc890' : '#c8d6ff'} />
      <Glow position={[0, bright ? 40 : 8, -600]} size={bright ? 420 : 200} color={bright ? '#ffd28a' : '#ff9a60'} opacity={bright ? 0.95 : 0.5} />
      <CamRig pos={camPos} target={camT} fov={bright ? 55 : 45} exposure={bright ? 1.15 : 1.25} />
      <WetGround size={[40, 1200]} position={[0, 0, -300]} color={bright ? '#3a2e26' : '#141922'} opacity={0.75}>
        <Mannequin body={walkBody(ph, 1, -0.05)} position={[0, 0.02, runnerZ]} rotY={Math.PI} cloth="#20252e" hood />
        {Array.from({ length: 30 }, (_, i) => (
          <group key={i} position={[-3.2, 0, 20 - i * 8]}>
            <mesh position={[0, 0.55, 0]} material={mat('#1c2026', 0.5, 0.7)}>
              <boxGeometry args={[0.05, 1.1, 0.05]} />
            </mesh>
          </group>
        ))}
      </WetGround>
      <mesh position={[-3.2, 1.08, -100]} material={mat('#1c2026', 0.5, 0.7)}>
        <boxGeometry args={[0.06, 0.06, 260]} />
      </mesh>
      {/* river beyond the railing */}
      <mesh rotation-x={-Math.PI / 2} position={[-200, -1, -200]} material={mat(bright ? '#c88a60' : '#2a3850', 0.15, 0.6)}>
        <planeGeometry args={[400, 900]} />
      </mesh>
      <group position={[-200, -1, 0]}>
        <Buildings blocks={city} lit={bright ? 0.08 : 0.25} ei={bright ? 0.6 : 1.4} color={bright ? '#3a3a44' : '#141a26'} />
      </group>
    </Canvas>
  );
};

// 6) start again — notebook, crossed-out versions
const Again: React.FC<{ f: number }> = ({ f }) => {
  const a = M[5];
  const lines = ['Projet', 'Version 1', 'Version 2', 'Version 3', 'Version 4 — on recommence'];
  const chars = 34 + Math.floor((f - a) * 0.9);
  const crossed = f > a + 10 ? 3 : 2;
  const uv = penUV(Math.min(chars, 70), lines);
  const nb: V3 = [0, 0.752, 0.08];
  const tip: V3 = [nb[0] + (uv[0] - 0.5) * 0.21, nb[1] + 0.014, nb[2] + (uv[1] - 0.5) * 0.28];
  return (
    <Canvas fog={['#0b1220', 200, 1200]}>
      <CamRig pos={[0.05, 1.05, 0.38]} target={[0, 0.75, 0.06]} fov={46} exposure={1.2} />
      <DeskRoom f={f} lux={0.5} lamp={1} rain={false}>
        <Notebook id="againNb" position={nb} draw={drawNotebook(chars, lines, crossed)} />
        <group position={[tip[0] + 0.055 + Math.sin(f * 2.2) * 0.003, tip[1] + 0.045, tip[2] + 0.12]} rotation={[0.55, 0.35, -0.25]}>
          <Hand curl={0.7} thumb={0.8} />
          <mesh position={[-0.03, -0.02, -0.11]} rotation={[0.95, 0, 0.25]} material={mat('#16181d', 0.3, 0.5)}>
            <cylinderGeometry args={[0.0045, 0.0035, 0.14, 10]} />
          </mesh>
        </group>
      </DeskRoom>
    </Canvas>
  );
};

// 7) hard day — head down, then he lifts it  /  8) nights fly by (time-lapse)
const Hard: React.FC<{ f: number; timelapse?: boolean }> = ({ f, timelapse = false }) => {
  const a = timelapse ? M[7] : M[6];
  const k = prog(f, a, a + 51);
  const lift = timelapse ? 1 : ease(prog(f, a + 24, a + 46));
  const lux = timelapse ? lerp(0.1, 0.9, ease(k)) : 0.35;
  const seconds = timelapse ? 7200 + k * 3600 * 5 : 50400;
  const body = sitBody(lerp(0.75, 0.05, lift), lerp(0.4, 0.95, lift));
  body.spine = lerp(0.45, 0.12, lift);
  const typing = timelapse ? Math.sin(f * 1.3) * 0.06 : 0;
  if (timelapse) {
    body.elL = 0.8 + typing;
    body.elR = 0.8 - typing;
  }
  return (
    <Canvas fog={['#0b1220', 200, 1200]}>
      <CamRig pos={timelapse ? [-0.9, 1.6, 1.6] : [1.0, 1.15, 1.15]} target={[0, 1.0, 0.1]} fov={timelapse ? 50 : 44} exposure={1.25} />
      <DeskRoom f={f * (timelapse ? 6 : 1)} lux={lux} lamp={timelapse ? 1 - k * 0.6 : 1} rain={!timelapse} seconds={seconds}>
        <Laptop open={1} id={timelapse ? 'tlLap' : 'hardLap'} position={[0, 0.75, -0.05]} draw={drawCode(f * (timelapse ? 4 : 1), { seed: 11 })} light={0.6} />
        <Mannequin body={body} position={[0, 0, 0.55]} rotY={Math.PI} cloth="#262b34" hood />
        <mesh position={[0, 0.47, 0.6]} material={mat('#1a1a1d', 0.7)}>
          <boxGeometry args={[0.45, 0.05, 0.45]} />
        </mesh>
      </DeskRoom>
    </Canvas>
  );
};

export const Montage: React.FC<{ f: number }> = ({ f }) => {
  let i = 0;
  while (i < 8 && f >= M[i + 1]) i++;
  const shots = [
    <Alarm f={f} />,
    <Work f={f} />,
    <Learn f={f} />,
    <Run f={f} />,
    <Work f={f} fail />,
    <Again f={f} />,
    <Hard f={f} />,
    <Hard f={f} timelapse />,
    <Run f={f} bright />,
  ];
  const since = f - M[i];
  // quick light flash on each cut
  const flash = i > 0 ? Math.exp(-since / 2.5) * 0.25 : 0;
  return (
    <AbsoluteFill>
      {shots[i]}
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
    </AbsoluteFill>
  );
};

