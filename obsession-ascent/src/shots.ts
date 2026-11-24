// Camera per shot (pos, target, roll, fov). Cuts land on the beat grid; some shots track the character.
import { V3 } from './three/lib';
import { hero } from './hero';
import { B, PLAT_Y, MONO, STOP_Z, lerp, sstep, prog, smooth, easeIn } from './timeline.js';

export const SHOTS: [string, number, number][] = [
  ['A', 0, 4], ['B', 4, 6], ['C', 6, 9], ['D', 9, 12], ['E', 12, 14], ['F', 14, 20], ['G', 20, 23], ['H', 23, 26], ['I', 26, 32],
];
/** short light flashes on some cuts (beat-synced) */
export const FLASH_AT = [4, 14, 20, 26];
export const shotAt = (t: number) => SHOTS.find(([, a, b]) => t >= a && t < b) ?? SHOTS[SHOTS.length - 1];

const L = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const A3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// a lagged hero position for smoother tracking
const lag = (t: number): V3 => {
  let x: V3 = [0, 0, 0];
  for (let i = 0; i < 6; i++) x = A3(x, hero(t - i * 0.04).pos);
  return [x[0] / 6, x[1] / 6, x[2] / 6];
};
export type Cam = { pos: V3; target: V3; roll: number; fov: number };
export function camera(t: number): Cam {
  const [id, a, b] = shotAt(t);
  const k = prog(t, a, b);
  switch (id) {
    case 'A': {
      const e = smooth(k);
      return { pos: L([-3.5, 40, -24], [-4.2, 6.2, -9.5], e), target: L([0, 0, 1], [0, 0.6, 0.8], e), roll: 0, fov: lerp(36, 44, e) };
    }
    case 'B': {
      const up = sstep(t, B.rise, 5.9);
      const surge = easeIn(prog(t, 5.65, 6.0));
      return { pos: [0.7 - 0.1 * up, 0.55 + 0.8 * up, -1.75 + 1.6 * surge], target: [0, 0.9 + 0.6 * up, 6], roll: 0, fov: 50 };
    }
    case 'C': {
      const h = lag(t);
      const shake = t > B.impact ? 0.06 * Math.exp(-(t - B.impact) * 7) * Math.sin((t - B.impact) * 60) : 0;
      const down = sstep(t, 8.2, 8.5) * (1 - sstep(t, 9.6, 10.2));
      return { pos: [5.0, 1.45 + 1.1 * down + shake, h[2] - 0.4 - 0.6 * down], target: [0, 1.15 + h[1] * 0.55 - 1.0 * down + shake, h[2] + 0.6 - 0.9 * down], roll: shake * 0.5, fov: 40 };
    }
    case 'D': {
      const e = smooth(k);
      return { pos: L([3.0, 0.45, 1.2], [3.3, 3.5, 2.6], e), target: L([0, 0.8, 3.2], [0, 2.9, 4.7], e), roll: 0, fov: 46 };
    }
    case 'E': {
      const h = lag(t);
      return { pos: [lerp(-2.2, -1.6, k), h[1] + 5.0, h[2] - 3.0], target: [0, h[1] + 1.0, h[2] + 0.8], roll: 0, fov: 50 };
    }
    case 'F': {
      const h = lag(t);
      return { pos: [-6.4, h[1] + 3.4, h[2] - 1.6], target: [0, h[1] + 1.0, h[2] + 2.0], roll: 0, fov: 48 };
    }
    case 'G': {
      const h = lag(t);
      return { pos: A3(h, [0.4, 0.6, -1.75]), target: A3(h, [0, 1.45, 5]), roll: 0.035 * Math.sin(t * 9), fov: 64 };
    }
    case 'H': {
      const h = lag(t);
      const th = lerp(-0.7, 1.7, smooth(k));
      const r = lerp(2.8, 2.3, k);
      return { pos: A3(h, [Math.sin(th) * r, 1.25, -Math.cos(th) * r]), target: A3(h, [0, 1.2, 0.4]), roll: 0, fov: 52 };
    }
    default: {
      const e = Math.pow(smooth(prog(t, 26.25, 31.8)), 0.8);
      const shake = t > B.touch ? 0.05 * Math.exp(-(t - B.touch) * 4) * Math.sin((t - B.touch) * 55) : 0;
      return {
        pos: L([1.5, PLAT_Y + 1.25 + shake, STOP_Z - 3.4], [-6.5, PLAT_Y + 16, 22], e),
        target: L([0, PLAT_Y + 3.6, MONO.z], [0, PLAT_Y + 6, 58], e),
        roll: shake,
        fov: lerp(46, 58, e),
      };
    }
  }
}
