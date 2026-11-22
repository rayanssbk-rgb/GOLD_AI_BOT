// Skeleton, inverse kinematics and pose generators for the silhouettes.
// A pose is a set of "control points"; elbows and knees are solved with IK.
import {
  RUNG,
  RAIL,
  clamp,
  lerp,
  limbRung,
} from './timeline.js';

export type Pt = [number, number];

export type Pose = {
  hip: Pt;
  chest: Pt;
  head: Pt;
  hL: Pt;
  hR: Pt;
  fL: Pt;
  fR: Pt;
  // optional IK pole hints (direction the elbow / knee should point)
  poleAL?: Pt;
  poleAR?: Pt;
  poleLL?: Pt;
  poleLR?: Pt;
};

export const BONE = {
  upperArm: 38,
  foreArm: 36,
  thigh: 48,
  shin: 46,
  torso: 62,
  neck: 27,
  headR: 15,
};

const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const len = (a: Pt) => Math.hypot(a[0], a[1]);
const lerpPt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Two-bone IK; returns [joint, effector]. */
export function solveIK(root: Pt, target: Pt, l1: number, l2: number, pole: Pt): [Pt, Pt] {
  let d = sub(target, root);
  let dist = len(d);
  const maxR = l1 + l2 - 0.5;
  const minR = Math.abs(l1 - l2) + 0.5;
  if (dist < 1e-4) d = [0, 1];
  const dir = mul(d, 1 / (len(d) || 1));
  dist = clamp(dist, minR, maxR);
  const end = add(root, mul(dir, dist));
  const cosA = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1);
  const a = Math.acos(cosA);
  const rot = (v: Pt, t: number): Pt => [v[0] * Math.cos(t) - v[1] * Math.sin(t), v[0] * Math.sin(t) + v[1] * Math.cos(t)];
  const j1 = add(root, mul(rot(dir, a), l1));
  const j2 = add(root, mul(rot(dir, -a), l1));
  const s1 = (j1[0] - root[0]) * pole[0] + (j1[1] - root[1]) * pole[1];
  const s2 = (j2[0] - root[0]) * pole[0] + (j2[1] - root[1]) * pole[1];
  return [s1 >= s2 ? j1 : j2, end];
}

export type Skeleton = {
  hip: Pt;
  chest: Pt;
  head: Pt;
  shL: Pt;
  shR: Pt;
  hipL: Pt;
  hipR: Pt;
  elL: Pt;
  elR: Pt;
  hL: Pt;
  hR: Pt;
  knL: Pt;
  knR: Pt;
  fL: Pt;
  fR: Pt;
};

export function buildSkeleton(p: Pose): Skeleton {
  const axis = sub(p.chest, p.hip);
  const al = len(axis) || 1;
  const n: Pt = [-axis[1] / al, axis[0] / al]; // perpendicular (points to +x when upright)
  const up: Pt = mul(axis, 1 / al);
  const shL = add(add(p.chest, mul(n, 19)), mul(up, -6));
  const shR = add(add(p.chest, mul(n, -19)), mul(up, -6));
  // n points left when upright (because axis points up = -y); fix orientation
  const leftIsNeg = shL[0] < shR[0];
  const sL = leftIsNeg ? shL : shR;
  const sR = leftIsNeg ? shR : shL;
  const hipL = add(p.hip, mul(n, leftIsNeg ? 10 : -10));
  const hipR = add(p.hip, mul(n, leftIsNeg ? -10 : 10));
  const [elL, hL] = solveIK(sL, p.hL, BONE.upperArm, BONE.foreArm, p.poleAL ?? [-1, 0.4]);
  const [elR, hR] = solveIK(sR, p.hR, BONE.upperArm, BONE.foreArm, p.poleAR ?? [1, 0.4]);
  const [knL, fL] = solveIK(hipL, p.fL, BONE.thigh, BONE.shin, p.poleLL ?? [-0.7, -1]);
  const [knR, fR] = solveIK(hipR, p.fR, BONE.thigh, BONE.shin, p.poleLR ?? [0.7, -1]);
  return { hip: p.hip, chest: p.chest, head: p.head, shL: sL, shR: sR, hipL, hipR, elL, elR, hL, hR, knL, knR, fL, fR };
}

const PTS: (keyof Pose)[] = ['hip', 'chest', 'head', 'hL', 'hR', 'fL', 'fR', 'poleAL', 'poleAR', 'poleLL', 'poleLR'];

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out: Partial<Pose> = {};
  for (const k of PTS) {
    const va = a[k];
    const vb = b[k];
    if (va && vb) out[k] = lerpPt(va, vb, t);
    else if (va || vb) out[k] = (t < 0.5 ? va ?? vb : vb ?? va) as Pt;
  }
  return out as Pose;
}

/** Map every control point through fn (poles are rotated with rotOnly). */
export function mapPose(p: Pose, fn: (q: Pt) => Pt, rotOnly?: (q: Pt) => Pt): Pose {
  const out: Partial<Pose> = {};
  for (const k of PTS) {
    const v = p[k];
    if (!v) continue;
    if (k.startsWith('pole')) out[k] = rotOnly ? rotOnly(v) : v;
    else out[k] = fn(v);
  }
  return out as Pose;
}

/** Rotate a ladder-local pose (origin at ladder base center) into world. */
export function ladderToWorld(p: Pose, baseX: number, baseY: number, pivot: Pt, angleDeg: number): Pose {
  const a = (angleDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const rot = (v: Pt): Pt => [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
  return mapPose(
    p,
    (q) => {
      const w: Pt = [q[0] + baseX - pivot[0], q[1] + baseY - pivot[1]];
      const r = rot(w);
      return [r[0] + pivot[0], r[1] + pivot[1]];
    },
    rot,
  );
}

export const translatePose = (p: Pose, dx: number, dy: number) => mapPose(p, (q) => [q[0] + dx, q[1] + dy]);

// ---------------------------------------------------------------- generators

type StandOpts = {
  breath?: number; // frame for breathing
  look?: Pt; // head offset
  lean?: number; // chest x offset
  hipDrop?: number;
  armSpread?: number;
};

/** Standing pose in world coordinates, feet on groundY. */
export function standPose(x: number, groundY: number, o: StandOpts = {}): Pose {
  const b = o.breath !== undefined ? Math.sin(o.breath * 0.12) * 1.4 : 0;
  const hipY = groundY - 90 + (o.hipDrop ?? 0);
  const lean = o.lean ?? 0;
  const chest: Pt = [x + lean, hipY - BONE.torso + b];
  const look = o.look ?? [0, 0];
  const spread = o.armSpread ?? 0;
  return {
    hip: [x, hipY],
    chest,
    head: [chest[0] + look[0] + lean * 0.3, chest[1] - BONE.neck + look[1]],
    hL: [x - 24 - spread + lean * 0.6, hipY + 14 + b],
    hR: [x + 24 + spread + lean * 0.6, hipY + 14 + b],
    fL: [x - 11, groundY],
    fR: [x + 11, groundY],
    poleAL: [-1, 0.2],
    poleAR: [1, 0.2],
    poleLL: [-0.3, -1],
    poleLR: [0.3, -1],
  };
}

/** Lateral walk / run in world coordinates. dir = -1 moving left, +1 right. */
export function walkPose(x: number, groundY: number, phase: number, amp: number, dir: number, run = false): Pose {
  const s = Math.sin(phase);
  const cs = Math.cos(phase);
  const lift = run ? 16 : 8;
  const fL: Pt = [x - 11 + amp * s, groundY - lift * Math.max(0, cs)];
  const fR: Pt = [x + 11 - amp * s, groundY - lift * Math.max(0, -cs)];
  const bob = Math.abs(Math.sin(phase)) * (run ? 6 : 3);
  const hipY = groundY - 88 - bob + (run ? 6 : 0);
  const lean = dir * (run ? 12 : 4);
  const chest: Pt = [x + lean, hipY - BONE.torso];
  const swing = run ? 22 : 12;
  return {
    hip: [x, hipY],
    chest,
    head: [chest[0] + lean * 0.4, chest[1] - BONE.neck],
    hL: [x - 24 - swing * s + lean * 0.5, hipY + (run ? -6 : 12) - Math.abs(s) * 6],
    hR: [x + 24 + swing * s + lean * 0.5, hipY + (run ? -6 : 12) - Math.abs(s) * 6],
    fL,
    fR,
    poleAL: [-1, run ? 0.6 : 0.2],
    poleAR: [1, run ? 0.6 : 0.2],
    poleLL: [-0.3, -1],
    poleLR: [0.3, -1],
  };
}

/** Climbing pose in ladder-local coordinates (origin = ladder base center). */
export function climbPose(c: number, window: number, ease: (t: number) => number, sway: number): Pose {
  const rL = limbRung(c, 0, window, ease);
  const rR = limbRung(c, 1, window, ease);
  const avg = (rL + rR) / 2;
  const hipY = -(avg * RUNG + 52);
  const sx = Math.sin(Math.PI * c) * sway;
  const chest: Pt = [sx * 0.4, hipY - BONE.torso + 4];
  return {
    hip: [sx, hipY],
    chest,
    head: [chest[0], chest[1] - BONE.neck],
    hL: [-RAIL + 4, -(rR * RUNG + 140)],
    hR: [RAIL - 4, -(rL * RUNG + 140)],
    fL: [-14, -rL * RUNG],
    fR: [14, -rR * RUNG],
    poleAL: [-1, 0.5],
    poleAR: [1, 0.5],
    poleLL: [-1, -0.3],
    poleLR: [1, -0.3],
  };
}

/** Sitting on the ground, knees up, head bowed (world coords). */
export function sitPose(x: number, groundY: number, f: number, bow = 1): Pose {
  const b = Math.sin(f * 0.1) * 1.5;
  const hip: Pt = [x, groundY - 20];
  const chest: Pt = [x - 2, hip[1] - BONE.torso + 6 + b + bow * 4];
  return {
    hip,
    chest,
    head: [chest[0] - 2, chest[1] - BONE.neck + 6 + bow * 12],
    hL: [x - 36, groundY - 62 + b],
    hR: [x + 36, groundY - 62 + b],
    fL: [x - 34, groundY],
    fR: [x + 34, groundY],
    poleAL: [-1, 0.6],
    poleAR: [1, 0.6],
    poleLL: [-0.6, -1],
    poleLR: [0.6, -1],
  };
}

/** Crouching pose (world coords) with hands to given targets. */
export function crouchPose(x: number, groundY: number, depth: number, hL: Pt, hR: Pt, headDown = 0): Pose {
  const hip: Pt = [x, groundY - 90 + depth];
  const chest: Pt = [x, hip[1] - BONE.torso + depth * 0.25];
  return {
    hip,
    chest,
    head: [x, chest[1] - BONE.neck + headDown],
    hL,
    hR,
    fL: [x - 16, groundY],
    fR: [x + 16, groundY],
    poleAL: [-1, 0.3],
    poleAR: [1, 0.3],
    poleLL: [-1, -0.6],
    poleLR: [1, -0.6],
  };
}
