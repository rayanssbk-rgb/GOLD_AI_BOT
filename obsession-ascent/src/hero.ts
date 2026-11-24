// The character's whole performance as a pure function of time: root position, heading, whole-body pitch, pose, inner light.
import { Body, V3, walkBody } from './three/lib';
import { B, BLOCK1, BLOCK2, STOP_Z, RUN_START, runState, groundY, core, clamp, lerp, smooth, sstep, prog, easeIn, easeOut } from './timeline.js';

type RB = Required<Body>;
const STAND: RB = { pelvisY: 0.95, spine: 0.03, head: [0, 0], shL: [0, 0.07], shR: [0, 0.07], elL: 0.14, elR: 0.14, hipL: [0, 0.03], hipR: [0, 0.03], knL: 0.04, knR: 0.04 };
const P = (b: Body): RB => ({ ...STAND, ...b });
const SEIZA = P({ pelvisY: 0.27, spine: 0.55, head: [0.6, 0], shL: [-0.35, 0.12], shR: [-0.35, 0.12], elL: 0.4, elR: 0.4, hipL: [-1.45, 0.09], hipR: [-1.45, 0.09], knL: 2.85, knR: 2.85 });
const KNEEL1 = P({ pelvisY: 0.52, spine: 0.3, head: [0.1, 0], shL: [-0.5, 0.1], shR: [-0.2, 0.12], elL: 0.6, elR: 0.3, hipL: [-1.5, 0.06], hipR: [0.35, 0.05], knL: 1.55, knR: 1.95 });
const CROUCH = P({ pelvisY: 0.62, spine: 0.55, head: [-0.15, 0], shL: [0.5, 0.1], shR: [0.5, 0.1], elL: 0.3, elR: 0.3, hipL: [-1.25, 0.05], hipR: [-1.25, 0.05], knL: 1.9, knR: 1.9 });
const HANG = P({ pelvisY: 0.95, spine: 0.05, head: [-0.4, 0], shL: [-2.95, 0.15], shR: [-2.95, 0.15], elL: 0.15, elR: 0.15, hipL: [0.05, 0.04], hipR: [-0.15, 0.04], knL: 0.35, knR: 0.55 });
const PULL = P({ pelvisY: 0.95, spine: 0.15, head: [-0.2, 0], shL: [-1.9, 0.25], shR: [-1.9, 0.25], elL: 2.0, elR: 2.0, hipL: [-0.55, 0.04], hipR: [0.1, 0.04], knL: 1.0, knR: 0.4 });
const MANTLE = P({ pelvisY: 0.8, spine: 0.95, head: [-0.3, 0], shL: [0.35, 0.2], shR: [0.35, 0.2], elL: 0.25, elR: 0.25, hipL: [-1.9, 0.05], hipR: [-0.3, 0.05], knL: 2.3, knR: 0.6 });
const FLAIL = P({ pelvisY: 0.92, spine: -0.25, head: [-0.5, 0], shL: [-2.4, 0.5], shR: [-2.2, 0.6], elL: 0.4, elR: 0.6, hipL: [-0.4, 0.05], hipR: [0.1, 0.05], knL: 0.5, knR: 0.2 });
const LYING = P({ pelvisY: 0.95, spine: -0.05, head: [0.25, 0.3], shL: [-0.25, 0.6], shR: [-0.1, 0.75], elL: 0.4, elR: 0.25, hipL: [-0.15, 0.08], hipR: [0.05, 0.08], knL: 0.35, knR: 0.1 });
const SITG = P({ pelvisY: 0.17, spine: 0.25, head: [0.15, 0], shL: [0.5, 0.2], shR: [0.5, 0.2], elL: 0.15, elR: 0.15, hipL: [-1.45, 0.06], hipR: [-1.3, 0.06], knL: 0.35, knR: 0.9 });
const TOUCH = P({ pelvisY: 0.94, spine: 0.08, head: [-0.12, 0], shR: [-1.45, 0.06], elR: 0.12, shL: [0.05, 0.1], elL: 0.2, hipL: [-0.25, 0.03], hipR: [0.15, 0.03], knL: 0.2, knR: 0.08 });
const LOOKUP = P({ pelvisY: 0.95, spine: -0.06, head: [-0.6, 0], shL: [0.05, 0.2], shR: [0.05, 0.2], elL: 0.2, elR: 0.2 });
const HERO = P({ pelvisY: 0.95, spine: -0.05, head: [-0.42, 0], shL: [0.08, 0.42], shR: [0.08, 0.42], elL: 0.12, elR: 0.12, hipL: [0, 0.07], hipR: [0, 0.07] });

function mixB(a: RB, b: RB, k: number): RB {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const o: Record<string, unknown> = {};
  for (const key of Object.keys(a) as (keyof RB)[]) {
    const va = a[key] as number | number[];
    const vb = b[key] as number | number[];
    o[key] = Array.isArray(va) ? va.map((x, i) => lerp(x, (vb as number[])[i], k)) : lerp(va, vb as number, k);
  }
  return o as RB;
}
/** right-hand position relative to the root (side view, facing +z) */
function handFK(b: RB): [number, number] {
  const s = b.spine;
  const a1 = s + b.shR[0];
  const a2 = a1 - b.elR;
  const y = b.pelvisY + 0.43 * Math.cos(s) + 0.29 * -Math.cos(a1) + 0.3 * -Math.cos(a2);
  const z = 0.43 * Math.sin(s) + 0.29 * -Math.sin(a1) + 0.3 * -Math.sin(a2);
  return [y, z];
}
const hangRoot = (b: RB, ledgeY: number, ledgeZ: number): V3 => {
  const [y, z] = handFK(b);
  return [0, ledgeY - y, ledgeZ - z - 0.05];
};
const lv3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

export type HeroState = { pos: V3; rotY: number; pitch: number; body: Body; core: number };

/** one climb onto a block: jump -> hang -> pull -> mantle -> stand. Returns null outside [tj, tEnd]. */
function climb(t: number, tj: number, tPull: number, tMant: number, tEnd: number, fromZ: number, baseY: number, ledgeY: number, ledgeZ: number, fail = false) {
  const hangR = hangRoot(HANG, ledgeY, ledgeZ);
  if (t < tj + 0.2) {
    const k = prog(t, tj, tj + 0.2);
    const from: V3 = [0, baseY, fromZ];
    const p = lv3(from, hangR, easeOut(k));
    p[1] += Math.sin(Math.PI * k) * 0.25;
    return { pos: p, body: mixB(CROUCH, HANG, easeOut(k)) };
  }
  if (t < tPull) {
    // pull up (with a struggle when it fails)
    const k = prog(t, tj + 0.2, tPull);
    const kk = fail ? 0.75 * smooth(k) + 0.05 * Math.sin(k * 18) * k : smooth(k);
    const b = mixB(HANG, PULL, kk);
    return { pos: hangRoot(b, ledgeY, ledgeZ), body: b };
  }
  if (fail) return null;
  if (t < tMant) return { pos: hangRoot(PULL, ledgeY, ledgeZ), body: PULL };
  // mantle onto the top
  const k = prog(t, tMant, tEnd);
  const a = hangRoot(PULL, ledgeY, ledgeZ);
  const mid: V3 = [0, ledgeY - 0.55, ledgeZ + 0.05];
  const end: V3 = [0, ledgeY, ledgeZ + 0.45];
  const p = k < 0.5 ? lv3(a, mid, smooth(k * 2)) : lv3(mid, end, smooth(k * 2 - 1));
  const b = k < 0.5 ? mixB(PULL, MANTLE, smooth(k * 2)) : mixB(MANTLE, STAND, smooth(k * 2 - 1));
  return { pos: p, body: b };
}

export function hero(t: number): HeroState {
  const c = core(t);
  const st = (pos: V3, body: RB, pitch = 0): HeroState => ({ pos, rotY: 0, pitch, body, core: c });
  const breath = Math.sin(t * 2.2) * 0.02;
  // 1. departure: kneeling, head down, then looks up and rises
  if (t < B.rise) {
    let b = { ...SEIZA, spine: SEIZA.spine + breath };
    b = mixB(b, { ...SEIZA, spine: 0.3, head: [-0.25, 0] }, sstep(t, B.look, B.look + 0.22));
    return st([0, 0, 0], b);
  }
  if (t < 5.75) {
    const k = prog(t, B.rise, 5.75);
    const b = k < 0.5 ? mixB({ ...SEIZA, spine: 0.3, head: [-0.25, 0] }, KNEEL1, smooth(k * 2)) : mixB(KNEEL1, STAND, smooth(k * 2 - 1));
    return st([0, 0, 0], b);
  }
  // 2. work: run at the first block, grab, slip, fall
  const runTo = BLOCK1.z0 - 0.58;
  if (t < B.jump1 - 0.05) {
    const k = prog(t, 5.75, B.jump1 - 0.05);
    const z = runTo * Math.pow(k, 1.5);
    const b = mixB(walkBody((z / 2.4) * Math.PI * 2, 0.75, -0.1) as RB, CROUCH, sstep(k, 0.85, 1));
    return st([0, 0, z], b);
  }
  if (t < B.slip) return { ...(climb(t, B.jump1 - 0.05, B.slip, 0, 0, runTo, 0, BLOCK1.h, BLOCK1.z0, true) as { pos: V3; body: RB }), rotY: 0, pitch: 0, core: c };
  const failPose = mixB(HANG, PULL, 0.75);
  const failRoot = hangRoot(failPose, BLOCK1.h, BLOCK1.z0);
  if (t < 8.32) {
    const k = prog(t, B.slip, 8.32);
    return st([0, lerp(failRoot[1], 0, easeIn(k)), failRoot[2] - 0.2 * k], mixB(failPose, FLAIL, smooth(k * 1.6)));
  }
  const fz = failRoot[2] - 0.2;
  if (t < B.impact) {
    const k = prog(t, 8.32, B.impact);
    return st([0, 0.1 * Math.sin(Math.PI * k), fz], mixB(FLAIL, LYING, smooth(k)), -1.52 * easeIn(k));
  }
  if (t < B.up) {
    const bounce = 0.06 * Math.exp(-(t - B.impact) * 14) * Math.sin((t - B.impact) * 40);
    return st([0, 0.02, fz], LYING, -1.52 + bounce);
  }
  // getting up: lying -> sitting -> one knee -> standing
  const sitZ = fz - 0.9;
  if (t < 9.45) {
    const k = smooth(prog(t, B.up, 9.45));
    return st([0, 0.02, lerp(fz, sitZ, k)], mixB(LYING, SITG, k), lerp(-1.52, 0, k));
  }
  if (t < 9.8) return st([0, 0, sitZ + 0.2 * prog(t, 9.45, 9.8)], mixB(SITG, KNEEL1, smooth(prog(t, 9.45, 9.8))));
  if (t < 10.15) return st([0, 0, sitZ + 0.2], mixB(KNEEL1, STAND, smooth(prog(t, 9.8, 10.15))));
  // second attempt
  const z2a = sitZ + 0.2;
  if (t < B.jump2 - 0.05) {
    const k = prog(t, 10.15, B.jump2 - 0.05);
    const z = lerp(z2a, runTo, smooth(k));
    const b = mixB(walkBody(((z - z2a) / 1.8) * Math.PI * 2, 0.4, -0.15) as RB, CROUCH, sstep(k, 0.7, 1));
    return st([0, 0, z], b);
  }
  if (t < B.top1) return { ...(climb(t, B.jump2 - 0.05, 11.4, 11.45, B.top1, runTo, 0, BLOCK1.h, BLOCK1.z0) as { pos: V3; body: RB }), rotY: 0, pitch: 0, core: c };
  // across block 1 and up block 2
  const top1Z = BLOCK1.z0 + 0.45;
  const run2 = BLOCK2.z0 - 0.58;
  if (t < B.jump2b - 0.05) {
    const k = prog(t, B.top1, B.jump2b - 0.05);
    const z = lerp(top1Z, run2, smooth(k));
    return st([0, BLOCK1.h, z], mixB(walkBody(((z - top1Z) / 2.0) * Math.PI * 2, 0.6, -0.15) as RB, CROUCH, sstep(k, 0.75, 1)));
  }
  if (t < B.top2) return { ...(climb(t, B.jump2b - 0.05, 12.95, 13.0, B.top2, run2, BLOCK1.h, BLOCK2.h, BLOCK2.z0) as { pos: V3; body: RB }), rotY: 0, pitch: 0, core: c };
  // 3-4. the stairs: walk -> run -> sprint
  if (t < B.touch - 0.12) {
    const r = runState(Math.max(t, RUN_START));
    const run = clamp((r.v - 1.6) / 3.8);
    let b = walkBody(r.phase, run, -0.12 + 0.1 * run) as RB;
    b = { ...b, spine: b.spine + 0.12 + 0.12 * run, knL: b.knL + 0.25, knR: b.knR + 0.25 };
    if (t < RUN_START + 0.3) b = mixB(STAND, b, prog(t, B.top2, RUN_START + 0.3));
    // decelerate into the touch
    b = mixB(b, TOUCH, sstep(t, 25.75, B.touch - 0.12));
    return st([0, groundY(r.z), r.z], b);
  }
  // 5. result: hand on the monolith, steps back, looks up, stands tall
  if (t < 26.6) return st([0, groundY(STOP_Z), STOP_Z], TOUCH);
  if (t < 27.4) {
    const k = smooth(prog(t, 26.6, 27.4));
    return st([0, groundY(STOP_Z), STOP_Z - 0.75 * k], mixB(TOUCH, LOOKUP, k));
  }
  const b = mixB(LOOKUP, HERO, sstep(t, 27.4, 28.6));
  return st([0, groundY(STOP_Z), STOP_Z - 0.75], { ...b, spine: b.spine + breath * 0.5 });
}
