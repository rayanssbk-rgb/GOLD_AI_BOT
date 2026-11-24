// Single source of timing for picture and music. 32 s, 30 fps, 1080x1920, 120 BPM (beat = 0.5 s, bar = 2 s).
export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const DUR = 32;
export const DURATION = DUR * FPS;
export const BPM = 120;
export const BEAT = 60 / BPM;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (x) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const sstep = (t, a, b) => smooth((t - a) / (b - a));
export const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = (x) => Math.pow(clamp(x), 3);
export const rnd = (i, j = 0) => {
  const s = Math.sin(i * 12.9898 + j * 78.233 + 0.5) * 43758.5453123;
  return s - Math.floor(s);
};

// chapters (s): departure, work, progression, obsession, result
export const CH = { depart: [0, 6], work: [6, 14], progress: [14, 20], obsession: [20, 26], result: [26, 32] };

// story beats (all on the 120 BPM grid)
export const B = {
  look: 5.0, // lifts his head toward the far light
  rise: 5.25,
  jump1: 7.0, // first attempt: grabs the ledge of the first giant block
  slip: 8.0, // loses grip
  impact: 8.5, // hits the floor on his back
  up: 9.0, // starts getting up
  jump2: 10.75, // second attempt
  top1: 12.0, // stands on the first block
  jump2b: 12.5, // grabs the second block
  top2: 13.5, // stands on the second block -> the stairs
  floorLight: 13.5, // light starts running along the floor
  pillars: 14.0, // pillar lights ignite one pair per beat
  sprint: 20.0, // obsession: sprint
  leap: 25.5, // last stride onto the platform
  touch: 26.0, // hand on the monolith -> eruption (the drop)
  open: 26.25, // monolith splits
  final: 30.0, // last hit
};

// architecture (m)
export const BLOCK1 = { z0: 4, z1: 7, h: 2.2 };
export const BLOCK2 = { z0: 7, z1: 10, h: 4.4 };
export const STAIRS = { z0: 10, z1: 54, y0: 4.4, rise: 0.25, n: 96 };
export const RUN = (STAIRS.z1 - STAIRS.z0) / STAIRS.n;
export const PLAT_Y = STAIRS.y0 + STAIRS.n * STAIRS.rise; // 28.4
export const MONO = { z: 62, w: 5, h: 15, d: 1.2 };
export const STOP_Z = MONO.z - MONO.d / 2 - 0.62;

/** walking surface height at z (ramp on the stairs) */
export function groundY(z) {
  if (z < STAIRS.z0) return z >= BLOCK2.z0 ? BLOCK2.h : z >= BLOCK1.z0 ? BLOCK1.h : 0;
  return Math.min(PLAT_Y, STAIRS.y0 + ((z - STAIRS.z0) / RUN) * STAIRS.rise);
}

// ---------------------------------------------------------------- run along the stairs (13.5 .. 26)
const RUN_T0 = 13.6;
const RUN_T1 = B.touch - 0.05;
export const RUN_Z0 = 7.45;
function vRaw(t) {
  if (t < RUN_T0) return 0;
  if (t < 14.6) return lerp(0.2, 2.0, sstep(t, RUN_T0, 14.6));
  if (t < 20.0) return lerp(2.0, 3.4, prog(t, 14.6, 20.0));
  if (t < 21.0) return lerp(3.4, 6.2, sstep(t, 20.0, 21.0));
  if (t < 25.45) return 6.2;
  return lerp(6.2, 0, sstep(t, 25.45, RUN_T1));
}
const RT = [];
{
  const dt = 1 / 600;
  let z = 0;
  let ph = 0;
  for (let t = RUN_T0; t <= RUN_T1 + 1e-9; t += dt) {
    RT.push([t, z, ph]);
    const v = vRaw(t);
    z += v * dt;
    ph += ((2 * Math.PI * v) / (1.45 + 0.3 * v)) * dt;
  }
}
const RAW_LEN = RT[RT.length - 1][1];
export const RUN_SCALE = (STOP_Z - RUN_Z0) / RAW_LEN;
/** position along z, gait phase and speed on the stairs */
export function runState(t) {
  const tt = clamp(t, RUN_T0, RUN_T1);
  const i = Math.min(RT.length - 1, Math.max(0, Math.round((tt - RUN_T0) * 600)));
  const [, z, ph] = RT[i];
  return { z: RUN_Z0 + z * RUN_SCALE, phase: ph, v: vRaw(tt) * RUN_SCALE };
}
export const RUN_START = RUN_T0;

// ---------------------------------------------------------------- lights
export const PILLAR_Z = Array.from({ length: 15 }, (_, i) => -70 + i * 10); // -70 .. 70
/** ignition time of a pillar strip (inner rows ignite one pair per beat ahead of him; outer rows follow) */
export function pillarIgnite(z, outer) {
  if (z < 0 || z > 60) return B.touch + Math.abs(z - MONO.z) / 70; // wave from the monolith
  const k = Math.round(z / 10);
  return outer ? B.pillars + 3.0 + k * BEAT : B.pillars + k * BEAT;
}
/** time the runner passes z (inverse of runState) */
export function timeAtZ(z) {
  if (z <= RUN_Z0) return RUN_T0;
  for (let i = 0; i < RT.length; i++) if (RUN_Z0 + RT[i][1] * RUN_SCALE >= z) return RT[i][0];
  return RUN_T1;
}
/** progression 0..1 for colour temperature (cold blue -> gold) */
export const warmth = (t) => sstep(t, 18, 25.5);
/** inner fire of the character */
export const core = (t) => lerp(0.06, 0.3, sstep(t, 5, 6)) + 0.35 * sstep(t, 12, 16) + 0.5 * sstep(t, 20, 24) + 1.2 * sstep(t, 26, 26.6);
