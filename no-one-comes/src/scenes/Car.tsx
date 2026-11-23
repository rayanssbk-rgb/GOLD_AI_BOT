// Driver's-seat POV along the coast road. Variant "dusk" (opening) and "night" (ignition + drive off).
import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { CamRig, Hand, mat, basic, Glow, LightCone, sitBody, V3 } from '../three/lib';
import { Sky, Sun, Skyline, Ocean, Palm, useDowntown, talk } from '../world';
import { Knox } from '../cast';
import { SC, LINE, BEAT, tod, kf, prog, ease, lerp, clamp, rnd, WIDTH, HEIGHT } from '../timeline.js';

const ROAD_L = 520; // repeat length of roadside props

/** Moving roadside world. d = distance driven (m). */
const Road: React.FC<{ d: number; t: number; f: number; night: boolean }> = ({ d, t, f, night }) => {
  const wrap = (z0: number, spacing: number) => -(((z0 - d) % spacing) + spacing) % spacing;
  const asphalt = mat(night ? '#0d0f14' : '#2a2430', 0.85);
  return (
    <group>
      {/* asphalt + shoulders */}
      <mesh rotation-x={-Math.PI / 2} position={[1.5, 0, -300]} material={asphalt}>
        <planeGeometry args={[15, 700]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-8.5, 0.05, -300]} material={mat('#3a3234', 0.9)}>
        <planeGeometry args={[5, 700]} />
      </mesh>
      {/* sea wall */}
      <mesh position={[-11, 0.4, -300]} material={mat('#4a4046', 0.9)}>
        <boxGeometry args={[0.6, 0.8, 700]} />
      </mesh>
      {/* lane dashes (moving) */}
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[1.9, 0.01, wrap(i * 12, 480) + 2]} material={basic('#d9d2c4', 0.85)}>
          <planeGeometry args={[0.14, 4]} />
        </mesh>
      ))}
      {/* solid edge lines */}
      {[-5.8, 8.8].map((x) => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.01, -300]} material={basic('#cfc6b4', 0.7)}>
          <planeGeometry args={[0.14, 700]} />
        </mesh>
      ))}
      {/* palms on the right, street lights between them */}
      {Array.from({ length: 20 }, (_, i) => {
        const z = wrap(i * 26 + 10, ROAD_L);
        return <Palm key={i} position={[10.5 + rnd(i) * 3, 0, z]} h={10 + rnd(i + 2) * 4} lean={0.1 + rnd(i + 4) * 0.2} seed={i} f={f} />;
      })}
      {Array.from({ length: 13 }, (_, i) => {
        const z = wrap(i * 40, ROAD_L);
        const on = night || t > 0.25;
        return (
          <group key={i} position={[9.2, 0, z]}>
            <mesh position={[0, 4.5, 0]} material={mat('#1a1a1e', 0.6, 0.5)}>
              <cylinderGeometry args={[0.08, 0.12, 9, 8]} />
            </mesh>
            <mesh position={[-1.2, 8.9, 0]} material={mat('#1a1a1e', 0.6, 0.5)}>
              <boxGeometry args={[2.4, 0.12, 0.2]} />
            </mesh>
            {on ? <Glow position={[-2.2, 8.75, 0]} size={night ? 7 : 4} color="#ffbe78" opacity={night ? 0.95 : 0.5} /> : null}
            {on && night ? <LightCone position={[-2.2, 8.7, 0]} height={8.7} radius={3.4} color="#ffb56b" opacity={0.07} /> : null}
          </group>
        );
      })}
      {/* oncoming traffic on the far lanes: headlights / tail lights */}
      {Array.from({ length: 6 }, (_, i) => {
        const z = -((((i * 90 - d * 2.1) % 540) + 540) % 540);
        return (
          <group key={i} position={[6.5, 0.7, z]}>
            <Glow position={[-0.7, 0, 0]} size={night ? 2.6 : 1.4} color="#fff3dc" opacity={0.9} />
            <Glow position={[0.7, 0, 0]} size={night ? 2.6 : 1.4} color="#fff3dc" opacity={0.9} />
          </group>
        );
      })}
    </group>
  );
};

/** Car interior around the driver's head (left-hand drive), car faces -Z. */
const Cabin: React.FC<{ night: boolean; dash: number }> = ({ night, dash }) => {
  const trim = mat('#121317', 0.7);
  const body = mat('#4a1016', 0.35, 0.4);
  return (
    <group>
      {/* hood */}
      <mesh position={[0, 0.82, -1.75]} rotation-x={0.06} material={body}>
        <boxGeometry args={[1.8, 0.08, 1.6]} />
      </mesh>
      {/* dashboard */}
      <mesh position={[0, 0.88, -0.92]} material={trim}>
        <boxGeometry args={[1.8, 0.22, 0.55]} />
      </mesh>
      <mesh position={[-0.37, 0.97, -0.78]} rotation-x={-0.5} material={trim}>
        <boxGeometry args={[0.5, 0.05, 0.25]} />
      </mesh>
      {/* gauges */}
      {[-0.47, -0.27].map((x) => (
        <group key={x} position={[x, 0.98, -0.79]} rotation-x={-0.5 + Math.PI / 2}>
          <mesh material={basic(night ? '#5fb4ff' : '#3a3f48', 0.25 + 0.75 * dash, true)}>
            <ringGeometry args={[0.042, 0.05, 32]} />
          </mesh>
        </group>
      ))}
      {night ? <Glow position={[-0.37, 0.99, -0.76]} size={0.35} color="#4aa8ff" opacity={0.25 * dash} /> : null}
      {/* centre screen */}
      <mesh position={[0.02, 1.0, -0.8]} rotation-x={-0.35} material={basic(night ? '#1d3a66' : '#22262e', 0.5 + 0.5 * dash)}>
        <planeGeometry args={[0.2, 0.12]} />
      </mesh>
      {/* A-pillars and roof */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[0.74 * sd, 1.18, -0.62]} rotation={[0.72, 0, 0.12 * sd]} material={trim}>
          <boxGeometry args={[0.1, 0.72, 0.08]} />
        </mesh>
      ))}
      <mesh position={[0, 1.48, -0.05]} material={trim}>
        <boxGeometry args={[1.7, 0.05, 0.75]} />
      </mesh>
      {/* rear-view mirror */}
      <mesh position={[0.02, 1.36, -0.42]} material={trim}>
        <boxGeometry args={[0.26, 0.075, 0.03]} />
      </mesh>
      {/* left door */}
      <mesh position={[-0.86, 0.9, -0.2]} material={trim}>
        <boxGeometry args={[0.06, 0.45, 1.3]} />
      </mesh>
      {/* passenger seat back */}
      <mesh position={[0.37, 0.85, 0.35]} rotation-x={-0.15} material={mat('#1a1b20', 0.9)}>
        <boxGeometry args={[0.52, 0.75, 0.12]} />
      </mesh>
      {/* steering wheel */}
      <group position={[-0.37, 1.0, -0.5]} rotation-x={-1.15}>
        <mesh material={mat('#0c0d10', 0.5)}>
          <torusGeometry args={[0.185, 0.019, 10, 40]} />
        </mesh>
        <mesh material={trim}>
          <cylinderGeometry args={[0.055, 0.06, 0.04, 20]} />
        </mesh>
        {[0, 2.2, -2.2].map((a) => (
          <mesh key={a} position={[Math.sin(a) * 0.09, 0, Math.cos(a) * 0.09]} rotation={[0, a, 0]} material={trim}>
            <boxGeometry args={[0.025, 0.015, 0.18]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/** Driver's hands on the wheel at 10 and 2 (world space; forearms run back and down to the body). */
const Hands: React.FC<{ key2?: number; steer: number }> = ({ key2 = 0, steer }) => (
  <group>
    <group position={[-0.55, 1.03 + steer, -0.43]} rotation={[0.75, 0.25, 0.55]}>
      <Hand mirror curl={0.95} thumb={0.8} sleeve="#232c45" />
    </group>
    {key2 < 0.01 ? (
      <group position={[-0.19, 1.03 - steer, -0.43]} rotation={[0.75, -0.25, -0.55]}>
        <Hand curl={0.95} thumb={0.8} sleeve="#232c45" />
      </group>
    ) : null}
  </group>
);

export const Car: React.FC<{ f: number; variant: 'dusk' | 'night' }> = ({ f, variant }) => {
  const night = variant === 'night';
  const t = tod(f);
  const [a] = night ? SC.car2 : SC.car1;
  const secs = (f - a) / 30;
  // distance driven
  const ign = BEAT.ignition;
  const moveT = Math.max(0, (f - ign - 14) / 30);
  const d = night ? Math.min(moveT, 3) ** 2 * 3 + Math.max(0, moveT - 3) * 18 : 200 + secs * 24;
  const vib = night ? (f > ign + 8 ? 0.0012 : 0) : 0.0015;
  const shake = Math.sin(f * 2.3) * vib + Math.sin(f * 1.1) * vib * 0.7;
  // camera: look at the road; glance at the passenger while he talks
  const glance = night
    ? kf(f, [[LINE.k4 - 16, 0], [LINE.k4 - 4, 1], [LINE.k4 + 34, 1], [LINE.k4 + 52, 0]])
    : kf(f, [[LINE.k1 - 14, 0], [LINE.k1 + 4, 1], [LINE.k1 + 46, 1], [LINE.k1 + 66, 0]]);
  const keyLook = 0;
  const head: V3 = [-0.37 - 0.06 * glance, 1.2 + shake, 0.05 + 0.12 * glance];
  const fwd: V3 = [-0.25, 1.05, -8];
  const side: V3 = [0.55, 1.08, -0.28]; // turn to the passenger seat
  const keyT: V3 = [-0.05, 0.86, -0.7];
  let target = fwd.map((v, i) => lerp(v, side[i], ease(glance))) as V3;
  target = target.map((v, i) => lerp(v, keyT[i], ease(keyLook))) as V3;
  // passenger head turns toward the driver when he speaks
  const kLine = night ? 'k4' : 'k1';
  const kStart = LINE[kLine as 'k1'];
  const tk = talk(f, kStart, kLine);
  const turn = kf(f, [[kStart - 12, 0], [kStart, 1], [kStart + 50, 1], [kStart + 70, 0.2]]);
  const knoxBody = { ...sitBody(0.05, 0.55), head: [0.05 - tk * 0.06, -0.9 * turn] as [number, number], spine: 0.05 };
  const dash = night ? ease(prog(f, ign + 2, ign + 12)) : 1;
  const steer = Math.sin(f * 0.03) * 0.03;
  const key2 = 0;
  const keyTurn = night ? ease(prog(f, ign - 2, ign + 6)) * 0.8 : 0;
  const amb = night ? 0.9 : 1.0;
  return (
    <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: false }}>
      <fog attach="fog" args={[night ? '#0a1226' : '#d98a8e', 160, 1400]} />
      <Sky t={t} />
      <Sun t={t} at={[-420, -1500]} />
      <Ocean t={t} f={f} sunX={-420} />
      <group position={[120, 0, -200]}>
        <Skyline t={t} blocks={useDowntown()} />
      </group>
      <hemisphereLight args={[night ? '#3a4a80' : '#ffc2a8', '#1a1420', amb]} />
      {!night ? <directionalLight position={[-6, 3, -10]} intensity={2.2} color="#ffb08a" /> : null}
      {night ? <pointLight position={[-0.2, 1.05, -0.7]} intensity={0.8 * dash + 0.25} distance={2.2} color="#5aa8ff" /> : null}
      {night ? <pointLight position={[1.5, 2.5, -1.5]} intensity={0.9 + 0.6 * Math.max(0, Math.sin(d * 0.157))} distance={8} color="#ffb878" /> : null}
      <CamRig pos={head} target={target} fov={(night ? 62 : 60) + 12 * glance} exposure={night ? 2.0 : 1.0} />
      <group position={[0, 0, 0]}>
        <Road d={d} t={t} f={f} night={night} />
      </group>
      {night && dash > 0 ? (
        <group>
          <LightCone position={[-0.6, 0.65, -2.4]} rotation={[-Math.PI / 2 + 0.06, 0, 0]} height={40} radius={5} color="#e8f0ff" opacity={0.06 * dash} />
          <LightCone position={[0.6, 0.65, -2.4]} rotation={[-Math.PI / 2 + 0.06, 0, 0]} height={40} radius={5} color="#e8f0ff" opacity={0.06 * dash} />
        </group>
      ) : null}
      <Cabin night={night} dash={dash} />
      <Hands key2={key2} steer={steer} />
      {night && key2 > 0 ? (
        <group position={[lerp(0.05, -0.02, key2), lerp(0.95, 0.88, key2), lerp(-0.45, -0.66, key2)]} rotation={[-0.9, 0.4, keyTurn]}>
          <Hand curl={0.55} thumb={0.8} sleeve="#232c45" />
        </group>
      ) : null}
      <Knox body={knoxBody} position={[0.37, 0.12, 0.08]} rotY={Math.PI} />
    </ThreeCanvas>
  );
};

export { ROAD_L, useMemo, clamp };
