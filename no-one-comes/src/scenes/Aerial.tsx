// Time-lapse aerial over the bay: the sky turns from violet to deep blue, the city switches on.
import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { CamRig, Glow, makeBlocks } from '../three/lib';
import { Sky, Skyline, Ocean, useDowntown } from '../world';
import { SC, tod, prog, ease, lerp, rnd, WIDTH, HEIGHT } from '../timeline.js';

export const Aerial: React.FC<{ f: number }> = ({ f }) => {
  const [a, b] = SC.aerial;
  const k = ease(prog(f, a, b));
  const t = tod(f);
  const down = useDowntown();
  const shore = useMemo(() => makeBlocks(7300, 120, (i) => [300 + rnd(i) * 900, -200 - rnd(i + 5) * 1100], [30, 30], [10, 60]), []);
  const pos: [number, number, number] = [lerp(-520, -430, k), lerp(190, 165, k), lerp(380, 250, k)];
  const target: [number, number, number] = [lerp(-40, 0, k), 40, -650];
  // coastal road: streams of head / tail lights
  const cars = Array.from({ length: 36 }, (_, i) => {
    const lane = i % 2;
    const zz = -((((i * 61 + (lane ? 1 : -1) * (f - a) * 9) % 1400) + 1400) % 1400) + 200;
    return <Glow key={i} position={[-120 + lane * 6, 2, zz]} size={9} color={lane ? '#ff4a3a' : '#fff1d8'} opacity={t > 0.5 ? 0.9 : 0.55} />;
  });
  return (
    <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: false }}>
      <fog attach="fog" args={[t > 0.55 ? '#0b1330' : '#6a4a7a', 300, 2200]} />
      <Sky t={t} radius={2400} />
      <CamRig pos={pos} target={target} fov={46} exposure={1.25} />
      <Ocean t={t} f={f} />
      <Skyline t={t} blocks={down} />
      <Skyline t={t} blocks={shore} />
      {cars}
      {/* reflections of the towers on the water */}
      {down.slice(-26).map((bl, i) => (
        <Glow key={i} position={[bl.x, -1, bl.z + 240]} size={60} color="#ffb070" opacity={t > 0.55 ? 0.12 : 0.04} />
      ))}
    </ThreeCanvas>
  );
};
