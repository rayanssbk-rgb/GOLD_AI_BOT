// Original coastal city "at golden hour into night": sky, sun, skyline, ocean, palms, road.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Buildings, makeBlocks, Glow, gradientTexture, mat, basic, V3 } from './three/lib';
import { lerp, clamp, rnd } from './timeline.js';
import words from '../scripts/words.json';

// ---------- colour over the day ----------
const mix = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp(t)).getHexString();
const SUNSET = { top: '#2b2f6e', mid: '#c4659a', low: '#ff8f86', hor: '#ffc08a' };
const DUSK = { top: '#141a46', mid: '#4a3f86', low: '#a35c8e', hor: '#e08a7a' };
const NIGHT = { top: '#03050c', mid: '#0a1430', low: '#142650', hor: '#24386a' };
export function skyCols(t: number) {
  const a = t < 0.45 ? SUNSET : DUSK;
  const b = t < 0.45 ? DUSK : NIGHT;
  const k = t < 0.45 ? t / 0.45 : (t - 0.45) / 0.55;
  return { top: mix(a.top, b.top, k), mid: mix(a.mid, b.mid, k), low: mix(a.low, b.low, k), hor: mix(a.hor, b.hor, k) };
}

/** Sky dome with the pink-to-blue gradient; texture quantised so it is cached. */
export const Sky: React.FC<{ t: number; radius?: number }> = ({ t, radius = 1900 }) => {
  const q = Math.round(t * 60) / 60;
  const c = skyCols(q);
  const tex = gradientTexture(
    [
      [0, c.top],
      [0.3, c.mid],
      [0.44, c.low],
      [0.5, c.hor],
      [0.53, c.low],
      [1, '#05060a'],
    ],
    `sky${q}`,
  );
  return (
    <mesh>
      <sphereGeometry args={[radius, 48, 24]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} toneMapped={false} />
    </mesh>
  );
};

/** Low sun that sinks below the horizon as t grows. */
export const Sun: React.FC<{ t: number; at?: [number, number] }> = ({ t, at = [-300, -1500] }) => {
  const y = lerp(70, -60, clamp(t / 0.5));
  if (t > 0.6) return null;
  const k = 1 - clamp((t - 0.35) / 0.25);
  return (
    <group>
      <Glow position={[at[0], y, at[1]]} size={140} color="#fff1d6" opacity={k} />
      <Glow position={[at[0], y, at[1]]} size={900} color="#ff9a7a" opacity={0.55 * k} />
      <Glow position={[at[0], 0, at[1]]} size={2600} color="#ff7f8a" opacity={0.25 * k} />
    </group>
  );
};

/** Skyline. Lit windows step up with the night (discrete steps read as a time-lapse). */
export const Skyline: React.FC<{ t: number; blocks: ReturnType<typeof makeBlocks>; y?: number }> = ({ t, blocks, y = 0 }) => {
  const lit = [0.04, 0.12, 0.24, 0.38, 0.5][Math.min(4, Math.floor(clamp(t) * 5))];
  const facade = t < 0.4 ? '#6a4a62' : t < 0.7 ? '#2a2846' : '#0c1020';
  return (
    <group position={[0, y, 0]}>
      <Buildings blocks={blocks} lit={lit} warm={0.75} color={facade} ei={t < 0.4 ? 0.8 : 1.6} />
    </group>
  );
};

export const useDowntown = (seed = 4100) =>
  useMemo(
    () => [
      ...makeBlocks(seed, 160, (i) => [(rnd(i) - 0.5) * 1400, -350 - rnd(i + 3) * 900], [34, 34], [20, 120]),
      // downtown towers
      ...makeBlocks(seed + 900, 26, (i) => [(rnd(i + 50) - 0.5) * 420, -520 - rnd(i + 53) * 360], [40, 40], [150, 320]),
    ],
    [seed],
  );

/** Ocean: dark water with a sun glitter path and a horizon sheen. */
export const Ocean: React.FC<{ t: number; f: number; sunX?: number }> = ({ t, f, sunX = -300 }) => {
  const c = skyCols(t);
  const glit = 1 - clamp((t - 0.3) / 0.3);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.6, -900]} material={basic(mix('#0b1020', c.mid, 0.35))}>
        <planeGeometry args={[6000, 2400]} />
      </mesh>
      {/* horizon sheen */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.5, -1600]} material={basic(c.hor, 0.35, true)}>
        <planeGeometry args={[6000, 500]} />
      </mesh>
      {/* glitter path towards the sun */}
      {glit > 0
        ? Array.from({ length: 70 }, (_, i) => {
            const z = -60 - i * 22;
            const w = 6 + i * 1.6;
            const x = sunX * (-z / 1500) + Math.sin(f * 0.21 + i * 1.7) * w * 0.4;
            return (
              <mesh key={i} rotation-x={-Math.PI / 2} position={[x, -0.4, z]} material={basic('#ffd6a8', (0.18 + 0.25 * rnd(i + Math.floor(f / 3))) * glit, true)}>
                <planeGeometry args={[w * (0.4 + rnd(i * 3 + Math.floor(f / 4))), 1.4 + i * 0.05]} />
              </mesh>
            );
          })
        : null}
    </group>
  );
};

/** A palm tree silhouette (curved trunk + fronds). */
export const Palm: React.FC<{ position: V3; h?: number; lean?: number; seed?: number; f?: number }> = ({ position, h = 11, lean = 0.15, seed = 1, f = 0 }) => {
  const trunk = mat('#2a1f1c', 0.9);
  const leaf = mat('#1c2a20', 0.9);
  const segs = 8;
  const sway = Math.sin(f * 0.05 + seed) * 0.03;
  let x = 0;
  let y = 0;
  const parts: React.ReactNode[] = [];
  for (let i = 0; i < segs; i++) {
    const a = (lean + sway) * (i / segs);
    const l = h / segs;
    parts.push(
      <mesh key={i} position={[x + Math.sin(a) * l * 0.5, y + Math.cos(a) * l * 0.5, 0]} rotation={[0, 0, -a]} material={trunk}>
        <cylinderGeometry args={[0.16 - i * 0.008, 0.2 - i * 0.008, l, 8]} />
      </mesh>,
    );
    x += Math.sin(a) * l;
    y += Math.cos(a) * l;
  }
  return (
    <group position={position} rotation={[0, rnd(seed) * 6.28, 0]}>
      {parts}
      {Array.from({ length: 9 }, (_, i) => {
        const ang = (i / 9) * Math.PI * 2;
        return (
          <group key={i} position={[x, y, 0]} rotation={[0, ang, 0]}>
            <mesh position={[1.6, -0.5, 0]} rotation={[0, 0, -0.55 - 0.15 * rnd(seed + i) + sway * 3]} scale={[1, 0.08, 0.28]} material={leaf}>
              <sphereGeometry args={[1.8, 10, 6]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ---------- dialogue helpers ----------
type W = { dur: number; words: [string, number, number][] };
const WORDS = words as unknown as Record<string, W>;
/** 0..1 "speaking" envelope for a line (per-word pulses), drives head nods / gestures. */
export function talk(f: number, start: number, id: string) {
  const t = (f - start) / 30;
  const w = WORDS[id];
  if (!w || t < 0 || t > w.dur + 0.2) return 0;
  let v = 0;
  for (const [, a, b] of w.words) if (t >= a - 0.04 && t <= b + 0.04) v = Math.max(v, Math.sin(Math.PI * clamp((t - a + 0.04) / (b - a + 0.08))));
  return v;
}
export const lineDur = (id: string) => WORDS[id]?.dur ?? 0;
