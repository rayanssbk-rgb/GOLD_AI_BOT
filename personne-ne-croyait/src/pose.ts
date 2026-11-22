// Skeleton + 2-bone IK + pose library.
// All poses are in FIGURE-LOCAL space: origin on the ground between the feet,
// y grows downward (so the head is around y = -200). A <Figure> places and
// scales the local pose into the scene.

export type Pt = [number, number];

export type Pose = {
  hip: Pt;
  chest: Pt;
  head: Pt;
  hL: Pt;
  hR: Pt;
  fL: Pt;
  fR: Pt;
  poleAL?: Pt;
  poleAR?: Pt;
  poleLL?: Pt;
  poleLR?: Pt;
  thigh?: number; // foreshortening of the thighs (seated, seen from front/back)
};

export const BONE = { upperArm: 38, foreArm: 36, thigh: 48, shin: 46, torso: 62, neck: 27, headR: 15 };

const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const len = (a: Pt) => Math.hypot(a[0], a[1]);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function solveIK(root: Pt, target: Pt, l1: number, l2: number, pole: Pt): [Pt, Pt] {
  let d = sub(target, root);
  if (len(d) < 1e-4) d = [0, 1];
  const dir = mul(d, 1 / len(d));
  const dist = clamp(len(sub(target, root)), Math.abs(l1 - l2) + 0.5, l1 + l2 - 0.5);
  const end = add(root, mul(dir, dist));
  const a = Math.acos(clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1));
  const rot = (v: Pt, t: number): Pt => [v[0] * Math.cos(t) - v[1] * Math.sin(t), v[0] * Math.sin(t) + v[1] * Math.cos(t)];
  const j1 = add(root, mul(rot(dir, a), l1));
  const j2 = add(root, mul(rot(dir, -a), l1));
  const s1 = (j1[0] - root[0]) * pole[0] + (j1[1] - root[1]) * pole[1];
  const s2 = (j2[0] - root[0]) * pole[0] + (j2[1] - root[1]) * pole[1];
  return [s1 >= s2 ? j1 : j2, end];
}

export type Skeleton = Record<'hip' | 'chest' | 'head' | 'shL' | 'shR' | 'hipL' | 'hipR' | 'elL' | 'elR' | 'hL' | 'hR' | 'knL' | 'knR' | 'fL' | 'fR', Pt>;

/** side: 0 = seen from front/back, 1 = seen in profile (narrow torso). */
export function buildSkeleton(p: Pose, side = 0): Skeleton {
  const axis = sub(p.chest, p.hip);
  const al = len(axis) || 1;
  const up = mul(axis, 1 / al);
  // screen-left perpendicular of an upright torso
  const n: Pt = [up[1], -up[0]];
  const sw = lerp(19, 5, side);
  const hw = lerp(10, 4, side);
  const shL = add(add(p.chest, mul(n, sw)), mul(up, -6));
  const shR = add(add(p.chest, mul(n, -sw)), mul(up, -6));
  const hipL = add(p.hip, mul(n, hw));
  const hipR = add(p.hip, mul(n, -hw));
  const [elL, hL] = solveIK(shL, p.hL, BONE.upperArm, BONE.foreArm, p.poleAL ?? [-1, 0.4]);
  const [elR, hR] = solveIK(shR, p.hR, BONE.upperArm, BONE.foreArm, p.poleAR ?? [1, 0.4]);
  const [knL, fL] = solveIK(hipL, p.fL, BONE.thigh * (p.thigh ?? 1), BONE.shin, p.poleLL ?? [-0.4, -1]);
  const [knR, fR] = solveIK(hipR, p.fR, BONE.thigh * (p.thigh ?? 1), BONE.shin, p.poleLR ?? [0.4, -1]);
  return { hip: p.hip, chest: p.chest, head: p.head, shL, shR, hipL, hipR, elL, elR, hL, hR, knL, knR, fL, fR };
}

type PtKey = Exclude<keyof Pose, 'thigh'>;
const KEYS: PtKey[] = ['hip', 'chest', 'head', 'hL', 'hR', 'fL', 'fR', 'poleAL', 'poleAR', 'poleLL', 'poleLR'];

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const o: Partial<Pose> = {};
  for (const k of KEYS) {
    const va = a[k];
    const vb = b[k];
    if (va && vb) o[k] = lerpPt(va, vb, t);
    else if (va || vb) o[k] = (t < 0.5 ? va ?? vb : vb ?? va) as Pt;
  }
  if (a.thigh !== undefined || b.thigh !== undefined) o.thigh = lerp(a.thigh ?? 1, b.thigh ?? 1, t);
  return o as Pose;
}

/** Keyframed pose track with per-segment easing. */
export function track(f: number, keys: [number, Pose][], ease: (t: number) => number): Pose {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, p0] = keys[i];
    const [f1, p1] = keys[i + 1];
    if (f <= f1) return lerpPose(p0, p1, ease(clamp((f - f0) / (f1 - f0))));
  }
  return keys[keys.length - 1][1];
}

export function offset(p: Pose, part: Partial<Record<PtKey, Pt>>): Pose {
  const o: Pose = { ...p };
  for (const k of Object.keys(part) as PtKey[]) {
    const v = part[k]!;
    const base = p[k];
    if (base) o[k] = [base[0] + v[0], base[1] + v[1]];
  }
  return o;
}

// ------------------------------------------------------------ generators

export function stand(o: { breath?: number; look?: Pt; lean?: number; hipDrop?: number } = {}): Pose {
  const b = o.breath !== undefined ? Math.sin(o.breath * 0.11) * 1.3 : 0;
  const hipY = -90 + (o.hipDrop ?? 0);
  const lean = o.lean ?? 0;
  const chest: Pt = [lean, hipY - BONE.torso + b];
  const look = o.look ?? [0, 0];
  return {
    hip: [0, hipY],
    chest,
    head: [chest[0] + look[0] + lean * 0.3, chest[1] - BONE.neck + look[1]],
    hL: [-24 + lean * 0.6, hipY + 14 + b],
    hR: [24 + lean * 0.6, hipY + 14 + b],
    fL: [-11, 0],
    fR: [11, 0],
    poleAL: [-1, 0.2],
    poleAR: [1, 0.2],
    poleLL: [-0.3, -1],
    poleLR: [0.3, -1],
  };
}

/** Standing in profile, facing dir (+1 right, -1 left). */
export function standSide(dir: number, o: { breath?: number; look?: Pt; lean?: number } = {}): Pose {
  const b = o.breath !== undefined ? Math.sin(o.breath * 0.11) * 1.2 : 0;
  const lean = (o.lean ?? 0) * dir;
  const hipY = -91;
  const chest: Pt = [lean, hipY - BONE.torso + b];
  const look = o.look ?? [0, 0];
  return {
    hip: [0, hipY],
    chest,
    head: [chest[0] + 3 * dir + look[0], chest[1] - BONE.neck + look[1]],
    hL: [-4 * dir + lean, hipY + 18],
    hR: [5 * dir + lean, hipY + 18],
    fL: [-5 * dir, 0],
    fR: [7 * dir, 0],
    poleAL: [-dir, 0.3],
    poleAR: [-dir, 0.3],
    poleLL: [dir, 0],
    poleLR: [dir, 0],
  };
}

/** Profile walk cycle. phase in radians; dir = +1 walking right. */
export function walkSide(phase: number, dir: number, o: { stride?: number; headDown?: number; lean?: number } = {}): Pose {
  const A = o.stride ?? 24;
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const fL: Pt = [dir * A * s, -10 * Math.max(0, c)];
  const fR: Pt = [-dir * A * s, -10 * Math.max(0, -c)];
  const bob = -3 * Math.abs(Math.cos(phase));
  const hipY = -88 + bob + 2;
  const lean = (o.lean ?? 4) * dir;
  const chest: Pt = [lean, hipY - BONE.torso];
  const hd = o.headDown ?? 0;
  return {
    hip: [0, hipY],
    chest,
    head: [chest[0] + dir * (3 + hd * 0.4), chest[1] - BONE.neck + hd],
    hL: [-dir * 22 * s + lean, hipY + 22 - Math.abs(s) * 4],
    hR: [dir * 22 * s + lean, hipY + 22 - Math.abs(s) * 4],
    fL,
    fR,
    poleAL: [-dir, 0.2],
    poleAR: [-dir, 0.2],
    poleLL: [dir, 0],
    poleLR: [dir, 0],
  };
}

/** Seated, seen from the front or from behind. seatH = seat height. */
export function sitFront(seatH: number, o: { breath?: number; look?: Pt; slump?: number; lean?: number } = {}): Pose {
  const b = o.breath !== undefined ? Math.sin(o.breath * 0.1) * 1.2 : 0;
  const slump = o.slump ?? 0;
  const lean = o.lean ?? 0;
  const hip: Pt = [0, -seatH];
  const chest: Pt = [lean, hip[1] - BONE.torso + b + slump * 10];
  const look = o.look ?? [0, 0];
  return {
    hip,
    chest,
    head: [chest[0] + look[0], chest[1] - BONE.neck + look[1] + slump * 14],
    hL: [-30, hip[1] - 6 + b],
    hR: [30, hip[1] - 6 + b],
    fL: [-19, 0],
    fR: [19, 0],
    poleAL: [-1, 0.4],
    poleAR: [1, 0.4],
    poleLL: [-1, 0],
    poleLR: [1, 0],
    thigh: 0.3,
  };
}

/** Seated, typing on a keyboard at local point kb. */
export function typing(seatH: number, kb: Pt, f: number, intensity = 1, o: { look?: Pt; lean?: number } = {}): Pose {
  const p = sitFront(seatH, { breath: f, look: o.look ?? [0, 4], lean: o.lean });
  const a = Math.sin(f * 1.9) * 4 * intensity;
  const bb = Math.sin(f * 2.3 + 1.7) * 4 * intensity;
  p.hL = [kb[0] - 18 + bb * 0.6, kb[1] - Math.max(0, a)];
  p.hR = [kb[0] + 18 + a * 0.6, kb[1] - Math.max(0, bb)];
  p.poleAL = [-1, 0.6];
  p.poleAR = [1, 0.6];
  return p;
}

/** Seated, elbows on desk, head in the hands. */
export function headInHands(seatH: number, deskY: number, f: number): Pose {
  const p = sitFront(seatH, { breath: f * 0.6 });
  const chest: Pt = [0, p.hip[1] - BONE.torso + 18];
  const head: Pt = [0, chest[1] - BONE.neck + 30];
  return {
    ...p,
    chest,
    head,
    hL: [-9, head[1] + 12],
    hR: [9, head[1] + 12],
    poleAL: [-1, 0.9],
    poleAR: [1, 0.9],
  };
}

/** Holding a phone in front of the chest (seen from the front). */
export function holdPhone(seatH: number, f: number, scroll = 0, lower = 0): Pose {
  const p = sitFront(seatH, { breath: f, look: [0, 8 + lower * 10], slump: lower * 0.8 });
  const py = lerp(p.chest[1] + 38, p.hip[1] - 6, lower);
  p.hL = [-8, py + 2];
  p.hR = [8 + Math.sin(scroll) * 2, py - 4 - Math.max(0, Math.sin(scroll)) * 4];
  p.poleAL = [-1, 0.8];
  p.poleAR = [1, 0.8];
  return p;
}

/** Laughing at someone in profile (dir = facing). */
export function laughSide(dir: number, f: number, k = 1): Pose {
  const p = standSide(dir, { breath: f });
  const bounce = Math.abs(Math.sin(f * 0.55)) * 5 * k;
  const back = -6 * k * dir;
  p.hip = [p.hip[0], p.hip[1] + bounce * 0.3];
  p.chest = [p.chest[0] + back, p.chest[1] + bounce];
  p.head = [p.chest[0] + back * 0.6 + dir * 2, p.chest[1] - BONE.neck - 2 * k + bounce * 0.2];
  p.hL = [p.chest[0] + 6 * dir, p.hip[1] - 14 + bounce];
  p.hR = [p.chest[0] + 10 * dir, p.hip[1] - 8 + bounce];
  p.poleAL = [dir, 0.6];
  p.poleAR = [dir, 0.6];
  return p;
}

/** Pointing at someone in profile. */
export function pointSide(dir: number, f: number, k = 1): Pose {
  const p = laughSide(dir, f, k * 0.7);
  p.hR = [p.chest[0] + dir * 70, p.chest[1] + 2 + Math.sin(f * 0.55) * 3];
  p.poleAR = [0, 1];
  return p;
}

/** Lying on the back in profile (bed), head toward -dir side. */
export function lieSide(bedH: number, dir: number): Pose {
  const y = -bedH - 8;
  return {
    hip: [0, y],
    chest: [-dir * 62, y - 2],
    head: [-dir * 92, y - 6],
    hL: [-dir * 14, y + 2],
    hR: [-dir * 8, y - 4],
    fL: [dir * 92, y + 2],
    fR: [dir * 90, y - 2],
    poleAL: [0, 1],
    poleAR: [0, 1],
    poleLL: [0, -1],
    poleLR: [0, -1],
  };
}

/** Sitting on the edge of a bed in profile. */
export function sitSide(seatH: number, dir: number, o: { look?: Pt } = {}): Pose {
  const hip: Pt = [0, -seatH];
  const chest: Pt = [dir * 4, hip[1] - BONE.torso];
  const look = o.look ?? [0, 0];
  return {
    hip,
    chest,
    head: [chest[0] + dir * 3 + look[0], chest[1] - BONE.neck + look[1]],
    hL: [dir * 30, hip[1] - 2],
    hR: [dir * 36, hip[1] + 2],
    fL: [dir * 40, 0],
    fR: [dir * 46, 0],
    poleAL: [-dir, 0.4],
    poleAR: [-dir, 0.4],
    poleLL: [dir, -0.2],
    poleLR: [dir, -0.2],
  };
}
