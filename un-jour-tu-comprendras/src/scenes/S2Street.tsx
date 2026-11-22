// SCENE 2 — LA SOLITUDE: POV walk in the rain, then he stands still while the city rushes by.
import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { CamRig, Mannequin, walkBody, Buildings, makeBlocks, Rain, LightCone, Glow, WetGround, mat, V3 } from '../three/lib';
import { SC, kf, prog, ease, lerp, rnd, WIDTH, HEIGHT } from '../timeline.js';

const LAMPS = Array.from({ length: 12 }, (_, i) => ({ x: i % 2 ? -4.4 : 4.4, z: 6 - i * 9 }));

const Car: React.FC<{ z: number; x: number; dir: 1 | -1; color: string; trail?: number }> = ({ z, x, dir, color, trail = 0 }) => (
  <group position={[x, 0, z]} rotation={[0, dir > 0 ? 0 : Math.PI, 0]}>
    <Glow position={[0, -0.6, 2.4]} size={2.4} color="#fff1d6" opacity={0.35} />
    <Glow position={[0, -0.65, -2.4]} size={1.6} color="#ff3040" opacity={0.35} />
    <mesh position={[0, 0.55, 0]} material={mat(color, 0.25, 0.7)}>
      <boxGeometry args={[1.8, 0.62, 4.3]} />
    </mesh>
    <mesh position={[0, 1.05, -0.2]} material={mat('#0b0d12', 0.15, 0.8)}>
      <boxGeometry args={[1.55, 0.45, 2.1]} />
    </mesh>
    {[-0.62, 0.62].map((hx) => (
      <group key={hx}>
        {/* headlights (front = +Z) */}
        <mesh position={[hx, 0.6, 2.16]} material={mat('#ffffff', 1, 0, '#fff4dd', 6)}>
          <boxGeometry args={[0.32, 0.12, 0.02]} />
        </mesh>
        <Glow position={[hx, 0.6, 2.3]} size={1.6} color="#fff1d6" opacity={0.9} />
        {/* tail lights */}
        <mesh position={[hx, 0.65, -2.16]} material={mat('#ff2030', 1, 0, '#ff2030', 5)}>
          <boxGeometry args={[0.3, 0.1, 0.02]} />
        </mesh>
        <Glow position={[hx, 0.65, -2.3]} size={0.9} color="#ff3040" opacity={0.8} />
        {trail > 0 ? (
          <>
            <mesh position={[hx, 0.6, 2.16 - trail / 2]} material={mat('#000', 1, 0, '#fff0d0', 3)}>
              <boxGeometry args={[0.08, 0.05, trail]} />
            </mesh>
            <mesh position={[hx, 0.65, -2.16 - trail / 2]} material={mat('#000', 1, 0, '#ff2030', 3)}>
              <boxGeometry args={[0.08, 0.05, trail]} />
            </mesh>
          </>
        ) : null}
      </group>
    ))}
    {[-0.8, 0.8].map((wx) =>
      [-1.4, 1.4].map((wz) => (
        <mesh key={`${wx}${wz}`} position={[wx, 0.33, wz]} rotation={[0, 0, Math.PI / 2]} material={mat('#060708', 0.8)}>
          <cylinderGeometry args={[0.33, 0.33, 0.25, 16]} />
        </mesh>
      )),
    )}
  </group>
);

/** Street, facades, lamps, cars and people at a given (scene) time t in seconds. */
const StreetSet: React.FC<{ f: number; t: number; speed: number; trails?: boolean; camZ: number; crowd?: number; span?: number }> = ({ f, t, speed, trails = false, camZ, crowd = 14, span = 90 }) => {
  const left = useMemo(() => makeBlocks(700, 16, (i) => [-12.5, 20 - i * 14], [10, 13], [14, 48]), []);
  const right = useMemo(() => makeBlocks(800, 16, (i) => [12.5, 20 - i * 14], [10, 13], [14, 48]), []);
  const far = useMemo(() => makeBlocks(900, 30, (i) => [(rnd(i) - 0.5) * 160, -220 - rnd(i + 7) * 200], [30, 30], [60, 190]), []);
  // cars on a loop of 240 m
  const cars = [0, 1, 2, 3, 4, 5].map((i) => {
    const dir: 1 | -1 = i % 2 ? 1 : -1;
    const v = 11 * speed;
    const base = rnd(i + 40) * 240;
    const z = dir > 0 ? -200 + ((base + t * v) % 240) : 40 - ((base + t * v) % 240);
    return { z, x: dir > 0 ? 1.9 : -1.9, dir, color: ['#1a1f2a', '#2a1a1a', '#1c2420'][i % 3] };
  });
  // pedestrians on both sidewalks
  const people = Array.from({ length: crowd }, (_, i) => {
    const dir = i % 2 ? 1 : -1; // +1 walks toward +Z (toward camera)
    const v = 1.35 * speed * (0.85 + rnd(i + 70) * 0.3);
    const base = rnd(i + 60) * span;
    const z = dir > 0 ? camZ - span * 0.75 + ((base + t * v) % span) : camZ + span * 0.25 - ((base + t * v) % span);
    const x = i % 4 < 3 ? 5.0 + (rnd(i + 80) - 0.5) * 2.2 : -5.2 + (rnd(i + 80) - 0.5) * 1.6;
    return { z, x, dir, phase: (t * v) / 0.75 * Math.PI + rnd(i) * 6, umbrella: rnd(i + 90) < 0.55, cloth: ['#1b1f27', '#2a2622', '#1e2429', '#2b2b30'][i % 4] };
  });
  return (
    <group>
      <WetGround size={[60, 400]} position={[0, 0, -120]} opacity={0.78}>
        <Buildings blocks={left} lit={0.35} ei={1.8} />
        <Buildings blocks={right} lit={0.35} ei={1.8} />
        {/* shop fronts */}
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={`s${i}`} position={[i % 2 ? -7.45 : 7.45, 1.4, 14 - i * 13]} rotation={[0, i % 2 ? Math.PI / 2 : -Math.PI / 2, 0]} material={mat('#000', 1, 0, rnd(i) < 0.5 ? '#ffb46b' : '#9fd0ff', 0.9)}>
            <planeGeometry args={[5, 2.2]} />
          </mesh>
        ))}
        {LAMPS.map((l, i) => (
          <group key={`l${i}`} position={[l.x, 0, l.z]}>
            <mesh position={[0, 2.6, 0]} material={mat('#14171c', 0.5, 0.6)}>
              <cylinderGeometry args={[0.06, 0.08, 5.2, 8]} />
            </mesh>
            <mesh position={[l.x > 0 ? -0.5 : 0.5, 5.15, 0]} material={mat('#14171c', 0.5, 0.6)}>
              <boxGeometry args={[1.1, 0.08, 0.12]} />
            </mesh>
            <Glow position={[l.x > 0 ? -0.95 : 0.95, 5.05, 0]} size={2.2} color="#ffd59a" opacity={0.95} />
            {Math.abs(l.z - camZ) < 34 ? <LightCone position={[l.x > 0 ? -0.95 : 0.95, 5.05, 0]} height={5} radius={2.2} opacity={0.16} /> : null}
          </group>
        ))}
      </WetGround>
      {cars.map((c, i) => (
          <Car key={`c${i}`} {...c} trail={trails ? 9 : 0} />
        ))}
        {people.map((p, i) => (
          <Mannequin key={`p${i}`} body={walkBody(p.phase, 0, 0.12)} position={[p.x, 0.14, p.z]} rotY={p.dir > 0 ? 0 : Math.PI} umbrella={p.umbrella} hood={!p.umbrella} cloth={p.cloth} />
        ))}
      {/* sidewalks + curb */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * 5.75, 0.07, -120]} material={mat('#11141a', 0.4, 0.1)}>
          <boxGeometry args={[3.5, 0.14, 400]} />
        </mesh>
      ))}
      {/* lane markings */}
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={`m${i}`} position={[0, 0.012, 20 - i * 8]} rotation-x={-Math.PI / 2} material={mat('#8a8f98', 0.4)}>
          <planeGeometry args={[0.15, 3]} />
        </mesh>
      ))}
      <group position={[0, -10, 0]}>
        <Buildings blocks={far} lit={0.25} ei={1.4} />
      </group>
      <Rain f={f} center={[lerp(5.2, 3, 0.3), 0, camZ - 4]} count={1100} area={14} opacity={0.34} />
    </group>
  );
};

const Lights: React.FC<{ camZ: number }> = ({ camZ }) => (
  <>
    <hemisphereLight args={['#33415e', '#07080b', 1.2]} />
    {LAMPS.filter((l) => Math.abs(l.z - camZ + 6) < 16)
      .slice(0, 3)
      .map((l, i) => (
        <pointLight key={i} position={[l.x > 0 ? l.x - 0.95 : l.x + 0.95, 4.8, l.z]} intensity={40} distance={16} decay={1.7} color="#ffcf8f" />
      ))}
  </>
);

// ------------------------------------------------------------------ S2a POV walk
export const StreetPOV: React.FC<{ f: number }> = ({ f }) => {
  const [a] = SC.street;
  const t = (f - a) / 30;
  const camZ = 2 - t * 1.35;
  const ph = t * 1.35 / 0.75 * Math.PI;
  const bob = Math.sin(ph * 2) * 0.025;
  const sway = Math.sin(ph) * 0.02;
  const look = kf(f, [
    [a, [4.6, 1.45, camZ - 10]],
    [a + 90, [4.4, 1.35, camZ - 10]],
    [a + 140, [3.0, 1.5, camZ - 10]],
    [a + 228, [4.8, 1.2, camZ - 10]],
  ]) as V3;
  const pos: V3 = [5.25 + sway, 1.68 + bob, camZ];
  return (
    <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: false }}>
      <color attach="background" args={['#05070c']} />
      <fog attach="fog" args={['#0e1522', 8, 120]} />
      <Lights camZ={camZ} />
      <CamRig pos={pos} target={[look[0], look[1], camZ - 10]} fov={58} roll={sway * 0.8} exposure={1.35} />
      <StreetSet f={f} t={t + 3} speed={1} camZ={camZ} />
    </ThreeCanvas>
  );
};

// ------------------------------------------------------------------ S2b immobile in the crowd
export const StreetStill: React.FC<{ f: number }> = ({ f }) => {
  const [a, b] = SC.still;
  const t = (f - a) / 30;
  const k = ease(prog(f, a, b));
  const heroZ = -8;
  const heroX = 5.3;
  // slow push-in, three-quarter front, from the street side
  const pos: V3 = [lerp(2.4, 3.3, k), lerp(1.25, 1.5, k), lerp(-1.2, -4.0, k)];
  const breath = Math.sin(t * 1.6) * 0.012;
  return (
    <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: false }}>
      <color attach="background" args={['#05070c']} />
      <fog attach="fog" args={['#0e1522', 8, 120]} />
      <Lights camZ={heroZ + 6} />
      <pointLight position={[heroX - 0.5, 4.5, heroZ + 1]} intensity={14} distance={8} decay={1.6} color="#ffcf8f" />
      <CamRig pos={pos} target={[heroX + 0.2, lerp(1.1, 1.35, k), heroZ - 0.5]} fov={42} exposure={1.35} />
      <Mannequin
        body={{ head: [0.32 + breath, 0], spine: 0.1, shL: [0.05, 0.05], shR: [0.05, 0.05], elL: 0.1, elR: 0.1 }}
        position={[heroX, 0.14, heroZ]}
        rotY={-0.55}
        hood
        cloth="#20252e"
      />
      {/* the world rushes past: sped-up crowd and light trails */}
      <StreetSet f={f} t={t * 3.0 + 10} speed={1} trails camZ={heroZ + 4} crowd={20} span={30} />
    </ThreeCanvas>
  );
};
