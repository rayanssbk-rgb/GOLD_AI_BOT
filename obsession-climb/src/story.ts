// Poses (climber + man in the coat) and camera per shot, all as pure functions of time t (s).
import { B, GAITS, LIMB_WIN, clamp, lerp, smooth, prog, sstep } from './timeline.js';
import { V, Cam, face, LIPX, add, sub, mul, lv, vnoise, rnd } from './world';
import { Rig, mixRig, solve } from './rig';

type G = number[];
const OFFS: Record<string, number> = { hn: 0, hf: 0.5, ff: 0, fn: 0.5 };
function gaitRaw(t: number, g: G) {
  const [a, , cyc, Gm, off] = g;
  const gt = t - a + off;
  const n = Math.floor(gt / cyc);
  const ph = gt / cyc - n;
  const o: Record<string, { y: number; arc: number; mv: boolean }> = {};
  let mean = 0;
  for (const [k, w] of Object.entries(LIMB_WIN)) {
    const s = sstep(ph, w[0], w[1]);
    o[k] = { y: (n + s + OFFS[k]) * Gm, arc: Math.sin(Math.PI * s), mv: s > 0.02 && s < 0.98 };
    mean += o[k].y / 4;
  }
  return { o, mean, ph };
}
/** procedural climbing: limbs move one at a time between holds on the face, pelvis follows */
export function gaitRig(t: number, g: G, y0: number, tired = 0): Rig {
  const base = y0 - gaitRaw(g[0], g).mean;
  const { o, mean, ph } = gaitRaw(t, g);
  const py = base + mean + 0.03 * Math.sin(ph * Math.PI * 4);
  const hand = (k: string): V => {
    const y = base + o[k].y + 0.93;
    return [face(y) + 0.035 + 0.13 * o[k].arc, y];
  };
  const ft = (k: string): V => {
    const y = base + o[k].y - 0.72;
    return [face(y) + 0.075 + 0.1 * o[k].arc, y];
  };
  const px = face(py) + 0.34 + 0.02 * Math.sin(t * 1.3);
  const shx = face(py + 0.5) + 0.2;
  const a = Math.asin(clamp((shx - px) / (-1 * 0.5), -0.9, 0.9));
  return {
    p: [px, py],
    a,
    hd: -0.45 + 0.12 * Math.sin(t * 0.7) + tired * (0.35 + 0.2 * Math.sin(t * 0.9)),
    dir: -1,
    hn: hand('hn'),
    hf: hand('hf'),
    fn: ft('fn'),
    ff: ft('ff'),
    gn: o.hn.mv ? 0.15 : 1,
    gf: o.hf.mv ? 0.15 : 1,
  };
}

const CLIMB_Y0 = 85.0;
let _p0: Rig | null = null;
export const P0 = () => (_p0 ??= gaitRig(B.slip, GAITS.climb, CLIMB_Y0));
const catchY = () => P0().hn[1] - 1.0;
export function gripPoint(t: number): V {
  const y = catchY() - 0.025 * sstep(t, B.slide1, B.slide1 + 0.07) - 0.02 * sstep(t, B.slide2, B.slide2 + 0.07);
  return [face(y) + 0.035, y];
}
const kfn = (t: number, keys: [number, number][]) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, va] = keys[i];
    const [tb, vb] = keys[i + 1];
    if (t <= tb) return lerp(va, vb, smooth((t - ta) / (tb - ta)));
  }
  return keys[keys.length - 1][1];
};

/** hanging from the ledge, the failed reach, the second hand, the pull-up */
function hangRig(t: number): Rig {
  const Hn = gripPoint(t);
  const tau = t - B.catch;
  const theta = 0.12 + 0.34 * Math.exp(-0.75 * Math.max(0, tau)) * Math.sin(4.2 * tau + 0.3) + 0.03 * Math.sin(1.4 * t);
  const drop = kfn(t, [
    [16.0, 0.58],
    [16.9, 0.47],
    [17.5, 0.34],
    [17.95, 0.32],
    [18.45, 0.14],
  ]);
  const pullK = sstep(t, 16.0, 18.4);
  const th = theta * (1 - pullK * 0.8);
  const sh: V = [Hn[0] + Math.sin(th) * drop + 0.04, Hn[1] - Math.cos(th) * drop];
  const phi = th * 1.3 - pullK * 0.25;
  let p: V = [sh[0] + Math.sin(phi) * 0.5, sh[1] - Math.cos(phi) * 0.5];
  p = [Math.max(p[0], face(p[1]) + 0.24), p[1]];
  const a = Math.atan2((sh[0] - p[0]) * -1, sh[1] - p[1]);
  // free hand: dangling, a failed reach, then the slap onto the ledge
  const dangle: V = add(sh, [0.14 + 0.06 * Math.sin(3.1 * t), -0.55]);
  const tryUp = sstep(t, 12.2, 12.6) * (1 - sstep(t, 12.75, 13.2));
  const H2: V = [face(Hn[1] - 0.03) + 0.035, Hn[1] - 0.03];
  let hf = lv(dangle, add(Hn, [0.06, -0.12]), tryUp * 0.85);
  const slap = sstep(t, 14.75, 15.1);
  hf = lv(hf, H2, slap);
  hf = add(hf, [0.14 * Math.sin(Math.PI * slap), 0]);
  // legs: kick, then find the wall
  const kick = 0.13 * Math.sin(5.3 * tau) * Math.exp(-0.25 * Math.max(0, tau)) + 0.05 * Math.sin(2.1 * t);
  const dn: V = add(p, [0.06 + kick, -0.86]);
  const df: V = add(p, [-0.02 - kick * 0.8, -0.85 + 0.05 * Math.sin(3 * t)]);
  const wn: V = [face(p[1] - 0.6) + 0.075, p[1] - 0.6];
  const wf: V = [face(p[1] - 0.72) + 0.075, p[1] - 0.72];
  const hd = kfn(t, [
    [9.5, -0.6],
    [10.5, -0.5],
    [11.0, 0.55],
    [12.0, 0.6],
    [12.3, -0.55],
    [16.0, -0.5],
    [18.4, -0.35],
  ]);
  return {
    p,
    a,
    hd,
    dir: -1,
    hn: Hn,
    hf,
    fn: lv(dn, wn, sstep(t, 17.1, 17.45)),
    ff: lv(df, wf, sstep(t, 17.7, 18.05)),
    gn: 1,
    gf: slap > 0.9 ? 1 : 0.2,
  };
}
function fallRig(t: number): Rig {
  const k = prog(t, B.slip, B.catch);
  const d = 1.0 * k * k;
  const P = P0();
  const hy = P.hn[1] - d;
  const A: Rig = {
    ...P,
    p: add(P.p, [0.07 * k, -d]),
    a: lerp(P.a, -0.1, k),
    hd: -0.2,
    hn: [face(hy) + 0.035, hy],
    hf: add(P.hf, [0.28 * k, -d + 0.15 * k]),
    fn: add(P.fn, [0.25 * k, -d - 0.1 * k]),
    ff: add(P.ff, [0.18 * k, -d - 0.05 * k]),
    gn: 0.3,
    gf: 0.1,
  };
  return mixRig(A, hangRig(B.catch), smooth((k - 0.45) / 0.55));
}

// lip / reach / clasp
const LIP_Y0 = 98.2;
let _lipEnd: Rig | null = null;
const lipEnd = () => (_lipEnd ??= gaitRig(22.3, GAITS.lip, LIP_Y0, 0.6));
let _reachEnd: Rig | null = null;
const reachEnd = () => (_reachEnd ??= gaitRig(GAITS.reach[1], GAITS.reach, lipEnd().p[1], 0.3));
/** where the two hands meet, just outside the lip */
export const CP: V = [LIPX + 0.12, 100.12];

// ---------------------------------------------------------------- the man in the coat (faces +x)
const MS: Rig = { p: [LIPX - 0.42, 100.93], a: 0.12, hd: 0.55, dir: 1, hn: [LIPX - 0.36, 100.2], hf: [LIPX - 0.5, 100.22], fn: [LIPX - 0.34, 100.06], ff: [LIPX - 0.52, 100.06], gn: 0.4, gf: 0.4 };
const MK: Rig = { p: [LIPX - 0.42, 100.38], a: 1.2, hd: 0.3, dir: 1, hn: [LIPX - 0.1, 100.45], hf: [LIPX - 0.2, 100.1], fn: [LIPX - 0.98, 100.06], ff: [LIPX - 0.14, 100.06], kn: 1, kf: 0, gn: 0.3, gf: 1 };
export function mentorRig(t: number): Rig | null {
  if (t < B.reveal - 0.02) return null;
  const breath = 0.01 * Math.sin(t * 1.6);
  if (t < 30) {
    let r = mixRig(MS, MK, sstep(t, B.kneel, B.kneel + 0.95));
    r = { ...r, p: add(r.p, [0, breath]) };
    // reach down: from the side to above the climber's hand, then the clasp
    const reach = sstep(t, 25.0, 26.4);
    let hn = lv(r.hn, add(CP, [-0.08, 0.3]), reach);
    hn = lv(hn, add(CP, [-0.005, 0.035]), sstep(t, 27.2, B.clasp));
    hn = add(hn, [0, -0.04 * sstep(t, B.clasp, B.clasp + 0.3)]);
    return { ...r, hn, gn: lerp(0.1, 1, sstep(t, B.clasp - 0.1, B.clasp + 0.1)) };
  }
  // the pull: rise, lean back, step back, stand
  const M0 = mentorRig(29.999)!;
  const M1: Rig = { p: [LIPX - 0.85, 100.72], a: -0.22, hd: 0.45, dir: 1, hn: [LIPX - 0.3, 100.55], hf: [LIPX - 1.1, 101.0], fn: [LIPX - 0.45, 100.06], ff: [LIPX - 1.15, 100.06], gn: 1, gf: 0.5 };
  const M2: Rig = { p: [LIPX - 1.15, 100.88], a: -0.12, hd: 0.5, dir: 1, hn: [LIPX - 0.6, 100.82], hf: [LIPX - 1.3, 100.45], fn: [LIPX - 0.95, 100.06], ff: [LIPX - 1.35, 100.06], gn: 1, gf: 0.5 };
  const M3: Rig = { p: [LIPX - 1.3, 100.93], a: 0.05, hd: 0.35, dir: 1, hn: [LIPX - 1.24, 100.22], hf: [LIPX - 1.36, 100.24], fn: [LIPX - 1.22, 100.06], ff: [LIPX - 1.42, 100.06], gn: 0.4, gf: 0.4 };
  let r = mixRig(M0, M1, sstep(t, 30.0, B.over));
  r = mixRig(r, M2, sstep(t, B.over, 31.8));
  r = mixRig(r, M3, sstep(t, 31.9, 32.9));
  return { ...r, p: add(r.p, [0, breath]) };
}

export function climberRig(t: number): Rig {
  if (t < B.slip) return gaitRig(t, GAITS.climb, CLIMB_Y0);
  if (t < B.catch) return fallRig(t);
  if (t < 18.3) return hangRig(t);
  if (t < 20.15) {
    const y0 = hangRig(GAITS.haul[0]).p[1];
    return mixRig(hangRig(Math.min(t, 18.45)), gaitRig(t, GAITS.haul, y0), sstep(t, 18.3, 18.75));
  }
  if (t < 24.0) {
    if (t < 22.3) return gaitRig(t, GAITS.lip, LIP_Y0, 0.6);
    const r = lipEnd();
    const br = 0.018 * Math.sin((t - 22.3) * 4.2);
    return { ...r, p: add(r.p, [0, br]), hd: lerp(r.hd, -0.85, sstep(t, 22.25, 22.75)) };
  }
  if (t < 30.0) {
    let r = t < GAITS.reach[1] ? gaitRig(t, GAITS.reach, lipEnd().p[1], 0.3) : reachEnd();
    r = { ...r, hd: lerp(-0.85, -0.7, sstep(t, 24, 25)) };
    // reach up toward the offered hand, trembling
    const trem: V = [0.006 * Math.sin(t * 37), 0.006 * Math.sin(t * 29 + 1)];
    const up = sstep(t, 25.8, 26.6);
    let hn = lv(r.hn, add(CP, [0.02, -0.2]), up);
    hn = lv(hn, CP, sstep(t, 27.3, B.clasp));
    hn = add(hn, mul(trem, 1 - sstep(t, B.clasp - 0.1, B.clasp + 0.1)));
    hn = add(hn, [0, -0.04 * sstep(t, B.clasp, B.clasp + 0.3)]);
    return { ...r, hn, gn: lerp(0.1, 1, sstep(t, B.clasp - 0.1, B.clasp + 0.1)) };
  }
  // pulled over the lip -> kneeling on the summit (still facing the rock side, -x)
  const K0 = climberRig(29.999);
  const m = mentorRig(t)!;
  const gripW = solve(m).wn;
  const K1: Rig = { p: [LIPX + 0.12, 99.75], a: 0.9, hd: 0.2, dir: -1, hn: gripW, hf: [LIPX - 0.4, 100.04], fn: [face(99.1) + 0.075, 99.1], ff: [face(98.95) + 0.075, 98.95], gn: 1, gf: 0.6 };
  const K2: Rig = { p: [LIPX - 0.2, 100.36], a: 1.05, hd: 0.3, dir: -1, hn: gripW, hf: [LIPX - 0.75, 100.04], fn: [LIPX + 0.32, 100.06], ff: [LIPX + 0.3, 99.55], kn: 1, gn: 1, gf: 0.6 };
  const K3: Rig = { p: [LIPX - 0.62, 100.5], a: 0.25, hd: 0.6, dir: -1, hn: [LIPX - 0.88, 100.58], hf: [LIPX - 0.92, 100.56], fn: [LIPX - 0.15, 100.06], ff: [LIPX - 0.2, 100.06], kn: 1, kf: 1, gn: 0.5, gf: 0.5 };
  let r = mixRig({ ...K0, hn: gripW }, K1, sstep(t, 30.0, B.over));
  r = mixRig(r, K2, sstep(t, B.over, B.knee));
  r = mixRig(r, K3, sstep(t, 31.9, 32.8));
  const br = 0.02 * Math.sin(t * 4.0) * sstep(t, 32.5, 33);
  return { ...r, p: add(r.p, [0, br]) };
}

/** dawn: both face the sunrise (+x); the climber gets up, then lifts his head */
export function dawnRigs(t: number): [Rig, Rig] {
  const DK: Rig = { p: [LIPX - 0.55, 100.5], a: 0.25, hd: 0.6, dir: 1, hn: [LIPX - 0.3, 100.58], hf: [LIPX - 0.28, 100.56], fn: [LIPX - 0.98, 100.06], ff: [LIPX - 1.0, 100.06], kn: 1, kf: 1, gn: 0.5, gf: 0.5 };
  const DS: Rig = { p: [LIPX - 0.52, 100.93], a: 0.03, hd: 0.15, dir: 1, hn: [LIPX - 0.46, 100.2], hf: [LIPX - 0.58, 100.22], fn: [LIPX - 0.42, 100.06], ff: [LIPX - 0.62, 100.06], gn: 0.4, gf: 0.4 };
  let c = mixRig(DK, DS, sstep(t, B.stand, B.stand + 1.6));
  const br = 0.012 * Math.sin(t * 2.2);
  c = { ...c, p: add(c.p, [0, br]), hd: lerp(c.hd, -0.32, sstep(t, B.look, B.look + 1.2)) };
  const M: Rig = { p: [LIPX - 1.3, 100.93 + 0.008 * Math.sin(t * 1.6)], a: 0.05, hd: lerp(lerp(0.35, 0.05, sstep(t, 35, 36)), -0.22, sstep(t, 37, 38.2)), dir: 1, hn: [LIPX - 1.24, 100.22], hf: [LIPX - 1.36, 100.24], fn: [LIPX - 1.22, 100.06], ff: [LIPX - 1.42, 100.06], gn: 0.4, gf: 0.4 };
  return [c, M];
}

// ---------------------------------------------------------------- falling rocks
export const ROCKS = Array.from({ length: 16 }, (_, i) => ({
  dx: (rnd(i, 1) - 0.3) * 0.1,
  dy: (rnd(i, 2) - 0.5) * 0.1,
  vx: 0.25 + rnd(i, 3) * 1.1,
  vy: (rnd(i, 4) - 0.2) * 1.4,
  s: 0.015 + Math.pow(rnd(i, 5), 2) * 0.07,
  w: (rnd(i, 6) - 0.5) * 14,
  t0: B.slip + rnd(i, 7) * 0.12,
}));

// ---------------------------------------------------------------- cameras
const ez = (a: number, b: number, k: number) => Math.exp(lerp(Math.log(a), Math.log(b), k));
const shake = (t: number, amp: number): [number, number] => [amp * vnoise(t * 38, 1), amp * vnoise(t * 41, 2)];
export function camera(id: string, t: number): Cam {
  let cx = 0;
  let cy = 0;
  let z = 100;
  let roll = 0;
  let sh = 0;
  const cl = () => climberRig(t);
  switch (id) {
    case 'wide': {
      const k = sstep(t, 0, 3.7);
      z = ez(8.5, 24, k);
      cx = lerp(-8, 0.5, k);
      cy = lerp(66, 85, k);
      sh = 10 * Math.exp(-Math.max(0, t - 0.3) * 4) * (t > 0.3 ? 1 : 0);
      break;
    }
    case 'climb': {
      const r = cl();
      const k = prog(t, 3.6, 8.6);
      z = lerp(270, 320, k);
      cx = r.p[0] + 0.35 + 0.08 * Math.sin(t * 0.5);
      cy = r.p[1] + 0.2;
      roll = -0.035;
      break;
    }
    case 'slip': {
      const P = P0();
      const r = cl();
      z = 285;
      cx = lerp(P.p[0] + 0.35, r.p[0] + 0.35, sstep(t, 9.1, 9.7));
      cy = lerp(P.p[1] + 0.25, r.p[1] + 0.35, sstep(t, 9.12, 9.75));
      roll = -0.06;
      sh = (t > B.slip ? 26 * Math.exp(-(t - B.slip) * 5) : 0) + (t > B.catch ? 22 * Math.exp(-(t - B.catch) * 6) : 0);
      break;
    }
    case 'abyss': {
      const Hn = gripPoint(t);
      const k = prog(t, 9.9, 13.4);
      z = lerp(115, 92, k);
      cx = Hn[0] + 1.6;
      cy = Hn[1] - 4.6 - k * 1.0;
      roll = lerp(0.04, 0.11, k);
      break;
    }
    case 'grip': {
      const Hn = gripPoint(t);
      const k = prog(t, 13.4, 17);
      z = lerp(690, 760, k);
      cx = Hn[0] + 0.08;
      cy = Hn[1] - 0.25 + 0.03 * k;
      roll = -0.045;
      sh = t > B.slap ? 10 * Math.exp(-(t - B.slap) * 7) : 0;
      break;
    }
    case 'haul': {
      const r = cl();
      const k = prog(t, 17, 20.4);
      z = lerp(215, 240, k);
      cx = r.p[0] + 0.55;
      cy = r.p[1] - 0.15;
      roll = -0.03;
      break;
    }
    case 'lip': {
      const k = prog(t, 20.15, 24);
      z = lerp(190, 218, k);
      cx = LIPX + 0.15;
      cy = 99.1 + k * 0.25;
      roll = 0.02;
      sh = t > B.reveal ? 9 * Math.exp(-(t - B.reveal) * 4) : 0;
      break;
    }
    case 'reach': {
      const k = prog(t, 24, 27);
      z = lerp(250, 280, k);
      cx = LIPX - 0.1;
      cy = 99.85 + 0.1 * k;
      roll = -0.02;
      break;
    }
    case 'hands': {
      const k = prog(t, 27, 30);
      z = ez(760, 900, k);
      cx = CP[0] + 0.1;
      cy = CP[1] - 0.12;
      roll = 0.03;
      sh = t > B.clasp ? 5 * Math.exp(-(t - B.clasp) * 5) : 0;
      break;
    }
    case 'pull': {
      const k = prog(t, 30, 33.9);
      z = lerp(232, 205, k);
      cx = LIPX - 0.45 - 0.1 * k;
      cy = 100.4 + 0.2 * k;
      roll = 0;
      break;
    }
    case 'dawn': {
      const k = Math.pow(sstep(t, 34.6, 43), 0.85);
      z = ez(200, 5.5, k);
      // keep the two figures framed while the camera pulls far out
      const ys = lerp(1000, 820, k);
      const xs = lerp(560, 430, k);
      cx = LIPX - 0.85 - (xs - 540) / z;
      cy = 101.0 - (960 - ys) / z;
      roll = 0;
      break;
    }
  }
  const [sx, sy] = shake(t, sh);
  return { cx, cy, z, roll, sx, sy };
}
