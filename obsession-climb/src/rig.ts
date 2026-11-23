// Faceless 2D figures: a side-view skeleton solved with 2-bone IK, drawn as smooth tapered capsules,
// with a rim light (shape-offset trick) and, for the man in the coat, a long coat with gold details.
import { W, H, clamp, lerp } from './timeline.js';
import { V, RGB, Cam, Light, add, sub, mul, len, lv, norm, applyCam, css, hex, mixc, tri } from './world';

export type Rig = {
  p: V; // pelvis
  a: number; // torso lean (rad, + = toward facing direction)
  hd: number; // head tilt relative to torso (+ = down/forward, - = looking up)
  dir: number; // facing: 1 = +x, -1 = -x
  hn: V; // near hand target
  hf: V; // far hand target
  fn: V; // near ankle target
  ff: V; // far ankle target
  gn?: number; // near hand grip 0 open .. 1 closed
  gf?: number;
  kn?: number; // near knee: 0 forward-up (default) .. 1 down (kneeling)
  kf?: number;
};
export function mixRig(a: Rig, b: Rig, k: number): Rig {
  if (k <= 0) return a;
  if (k >= 1) return b;
  return {
    p: lv(a.p, b.p, k),
    a: lerp(a.a, b.a, k),
    hd: lerp(a.hd, b.hd, k),
    dir: k < 0.5 ? a.dir : b.dir,
    hn: lv(a.hn, b.hn, k),
    hf: lv(a.hf, b.hf, k),
    fn: lv(a.fn, b.fn, k),
    ff: lv(a.ff, b.ff, k),
    gn: lerp(a.gn ?? 1, b.gn ?? 1, k),
    gf: lerp(a.gf ?? 1, b.gf ?? 1, k),
    kn: lerp(a.kn ?? 0, b.kn ?? 0, k),
    kf: lerp(a.kf ?? 0, b.kf ?? 0, k),
  };
}

const UA = 0.3;
const FA = 0.28;
const TH = 0.45;
const SH = 0.44;
function ik(root: V, tgt: V, l1: number, l2: number, pref: V): [V, V] {
  const d = sub(tgt, root);
  let L = len(d);
  const u = norm(d);
  L = clamp(L, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  const end = add(root, mul(u, L));
  const a = Math.acos(clamp((l1 * l1 + L * L - l2 * l2) / (2 * l1 * L), -1, 1));
  const rot = (s: number): V => [u[0] * Math.cos(s) - u[1] * Math.sin(s), u[0] * Math.sin(s) + u[1] * Math.cos(s)];
  const j1 = add(root, mul(rot(a), l1));
  const j2 = add(root, mul(rot(-a), l1));
  const mid = mul(add(root, end), 0.5);
  const s1 = (j1[0] - mid[0]) * pref[0] + (j1[1] - mid[1]) * pref[1];
  const s2 = (j2[0] - mid[0]) * pref[0] + (j2[1] - mid[1]) * pref[1];
  return [s1 >= s2 ? j1 : j2, end];
}
export type Joints = ReturnType<typeof solve>;
export function solve(r: Rig) {
  const tv: V = [Math.sin(r.a) * r.dir, Math.cos(r.a)];
  const fwd: V = [Math.cos(r.a) * r.dir, -Math.sin(r.a)];
  const sh = add(r.p, mul(tv, 0.5));
  const nk = add(r.p, mul(tv, 0.55));
  const ha = r.a + r.hd;
  const hv: V = [Math.sin(ha) * r.dir, Math.cos(ha)];
  const head = add(add(nk, mul(hv, 0.15)), mul([Math.cos(ha) * r.dir, -Math.sin(ha)], 0.012));
  const armPref: V = [-r.dir, -0.8];
  const legPref = (k: number): V => [r.dir * (1 - k * 0.6), lerp(0.25, -1, k)];
  const [en, wn] = ik(sh, r.hn, UA, FA, armPref);
  const [ef, wf] = ik(sh, r.hf, UA, FA, armPref);
  const [kn, an] = ik(r.p, r.fn, TH, SH, legPref(r.kn ?? 0));
  const [kf, af] = ik(r.p, r.ff, TH, SH, legPref(r.kf ?? 0));
  return { tv, fwd, sh, nk, head, ha, hv, en, wn, ef, wf, kn, an, kf, af };
}

// ---------------------------------------------------------------- primitives (world units)
function cap(ctx: CanvasRenderingContext2D, a: V, b: V, ra: number, rb: number) {
  const d = sub(b, a);
  const ang = Math.atan2(d[1], d[0]);
  ctx.beginPath();
  ctx.arc(a[0], a[1], ra, ang + Math.PI / 2, ang + (3 * Math.PI) / 2);
  ctx.arc(b[0], b[1], rb, ang - Math.PI / 2, ang + Math.PI / 2);
  ctx.closePath();
  ctx.fill();
}
function ell(ctx: CanvasRenderingContext2D, c: V, rx: number, ry: number, rot: number) {
  ctx.beginPath();
  ctx.ellipse(c[0], c[1], rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}
const rotv = (v: V, s: number): V => [v[0] * Math.cos(s) - v[1] * Math.sin(s), v[0] * Math.sin(s) + v[1] * Math.cos(s)];
function hand(ctx: CanvasRenderingContext2D, el: V, w: V, grip: number, dir: number, k = 1) {
  const d = norm(sub(w, el));
  const c = add(w, mul(d, 0.032 * k));
  ell(ctx, c, 0.042 * k, 0.032 * k, Math.atan2(d[1], d[0]));
  // fingers curl toward the palm (front) when gripping
  const side = -dir * Math.sign(d[1] || 1);
  const fd = rotv(d, side * grip * 1.25);
  cap(ctx, c, add(c, mul(fd, (0.06 - 0.022 * grip) * k)), 0.026 * k, 0.019 * k);
  const td = rotv(d, -side * 0.9);
  cap(ctx, add(w, mul(d, 0.02 * k)), add(add(w, mul(d, 0.02 * k)), mul(td, 0.04 * k)), 0.013 * k, 0.011 * k);
}
function foot(ctx: CanvasRenderingContext2D, kn: V, an: V, dir: number) {
  const sd = norm(sub(an, kn));
  const flat = 1 - Math.abs(sd[1]);
  const fv = norm(lv([dir, -0.08], sd, clamp(flat * 1.3)));
  ell(ctx, add(an, mul(fv, 0.06)), 0.11, 0.042, Math.atan2(fv[1], fv[0]));
}

export type Look = {
  kind: 'climber' | 'mentor';
  body: string;
  legs: string;
  far: string;
  head: string;
};
export const CLIMBER: Look = { kind: 'climber', body: '#5a5f68', legs: '#4d515a', far: '#41454d', head: '#5d626b' };
export const MENTOR: Look = { kind: 'mentor', body: '#0d0d10', legs: '#0b0b0d', far: '#08080a', head: '#16161a' };

function coatSkirt(r: Rig, J: Joints, t: number, wind: number) {
  const waist = add(r.p, mul(J.tv, 0.12));
  const wb = add(waist, mul(J.fwd, -0.12));
  const wfr = add(waist, mul(J.fwd, 0.12));
  const knees = [J.kn, J.kf];
  const front = knees.reduce((m, k) => (k[0] * r.dir > m[0] * r.dir ? k : m), knees[0]);
  const back = knees.reduce((m, k) => (k[0] * r.dir < m[0] * r.dir ? k : m), knees[0]);
  const flap = Math.sin(t * 7.3) * 0.6 + Math.sin(t * 12.9 + 1) * 0.3 + Math.sin(t * 3.1) * 0.4;
  let hemF = add(add(front, mul(norm(sub(r.dir > 0 ? J.an : J.af, front)), 0.12)), mul(J.fwd, 0.06));
  hemF = add(front, [r.dir * 0.07, -0.13]);
  let hemB: V = add(r.p, [-r.dir * 0.22, -0.64]);
  hemB = add(hemB, [-wind * (0.18 + 0.07 * flap), 0.05 * wind * flap]);
  const bk = add(back, [-r.dir * 0.08, -0.1]);
  const g = 100.012;
  const cl = (p: V): V => [p[0], Math.max(p[1], g)];
  return { wb, wfr, hemF: cl(hemF), hemB: cl(hemB), bk: cl(bk), flap };
}

/** draw the whole silhouette with one fill colour (flat) or with its own colours */
function body(ctx: CanvasRenderingContext2D, r: Rig, J: Joints, look: Look, flat: string | null, t: number, wind: number) {
  const C = (c: string) => (ctx.fillStyle = flat ?? c);
  const m = look.kind === 'mentor';
  const k = m ? 1.08 : 1;
  // far arm + far leg
  C(look.far);
  cap(ctx, J.sh, J.ef, 0.05 * k, 0.042 * k);
  cap(ctx, J.ef, J.wf, 0.04 * k, 0.032);
  hand(ctx, J.ef, J.wf, r.gf ?? 1, r.dir);
  cap(ctx, r.p, J.kf, 0.078, 0.056);
  cap(ctx, J.kf, J.af, 0.053, 0.038);
  foot(ctx, J.kf, J.af, r.dir);
  if (m) {
    C(look.legs);
    cap(ctx, r.p, J.kn, 0.078, 0.056);
    cap(ctx, J.kn, J.an, 0.053, 0.038);
    foot(ctx, J.kn, J.an, r.dir);
    // the long coat
    const s = coatSkirt(r, J, t, wind);
    C(look.body);
    ctx.beginPath();
    ctx.moveTo(s.wb[0], s.wb[1]);
    const cb = add(add(r.p, mul(J.fwd, -0.2)), mul(J.tv, -0.3));
    ctx.quadraticCurveTo(cb[0], cb[1], s.hemB[0], s.hemB[1]);
    ctx.quadraticCurveTo(lerp(s.hemB[0], s.bk[0], 0.5), Math.min(s.hemB[1], s.bk[1]) - 0.03, s.bk[0], s.bk[1]);
    ctx.lineTo(s.hemF[0], s.hemF[1]);
    const cf = add(J.kn[0] * r.dir > J.kf[0] * r.dir ? J.kn : J.kf, [r.dir * 0.09, 0.08]);
    ctx.quadraticCurveTo(cf[0], cf[1], s.wfr[0], s.wfr[1]);
    ctx.closePath();
    ctx.fill();
  }
  // torso
  C(look.body);
  const chest = add(add(r.p, mul(J.tv, 0.32)), mul(J.fwd, 0.015));
  const top = add(r.p, mul(J.tv, 0.48));
  cap(ctx, r.p, chest, 0.1 * k, 0.125 * k);
  cap(ctx, chest, top, 0.125 * k, 0.1 * k);
  if (!m) {
    C(look.legs);
    cap(ctx, r.p, J.kn, 0.08, 0.058);
    cap(ctx, J.kn, J.an, 0.055, 0.04);
    foot(ctx, J.kn, J.an, r.dir);
  }
  // neck + head (faceless)
  C(look.head);
  cap(ctx, add(J.nk, mul(J.tv, -0.05)), add(J.nk, mul(J.hv, 0.07)), 0.047, 0.043);
  ell(ctx, J.head, 0.094, 0.118, J.ha * -r.dir);
  if (m) {
    // upturned collar
    C(look.body);
    ctx.beginPath();
    const c0 = add(J.nk, mul(J.fwd, -0.075));
    ctx.moveTo(c0[0], c0[1] - 0.05);
    const c1 = add(add(J.nk, mul(J.tv, 0.1)), mul(J.fwd, -0.07));
    ctx.lineTo(c1[0], c1[1]);
    const c2 = add(J.nk, mul(J.fwd, 0.035));
    ctx.lineTo(c2[0], c2[1]);
    ctx.closePath();
    ctx.fill();
  }
  // near arm
  C(m ? look.body : look.body);
  cap(ctx, J.sh, J.en, 0.055 * k, 0.045 * k);
  cap(ctx, J.en, J.wn, 0.043 * k, 0.034);
  C(look.head);
  hand(ctx, J.en, J.wn, r.gn ?? 1, r.dir);
}

function gold(ctx: CanvasRenderingContext2D, r: Rig, J: Joints, t: number, wind: number, col: string) {
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineCap = 'round';
  // front edge of the coat: collar -> waist -> hem
  const s = coatSkirt(r, J, t, wind);
  const n0 = add(J.nk, mul(J.fwd, 0.035));
  const c1 = add(add(r.p, mul(J.tv, 0.3)), mul(J.fwd, 0.128));
  ctx.beginPath();
  ctx.moveTo(n0[0], n0[1]);
  ctx.quadraticCurveTo(c1[0], c1[1], s.wfr[0], s.wfr[1]);
  const cf = add(J.kn[0] * r.dir > J.kf[0] * r.dir ? J.kn : J.kf, [r.dir * 0.09, 0.08]);
  ctx.quadraticCurveTo(cf[0], cf[1], s.hemF[0], s.hemF[1]);
  ctx.lineWidth = 0.009;
  ctx.stroke();
  // hem line
  ctx.beginPath();
  ctx.moveTo(s.hemF[0], s.hemF[1]);
  ctx.lineTo(s.bk[0], s.bk[1]);
  ctx.quadraticCurveTo(lerp(s.hemB[0], s.bk[0], 0.5), Math.min(s.hemB[1], s.bk[1]) - 0.03, s.hemB[0], s.hemB[1]);
  ctx.lineWidth = 0.006;
  ctx.stroke();
  // collar edge
  const c0 = add(J.nk, mul(J.fwd, -0.075));
  const ct = add(add(J.nk, mul(J.tv, 0.1)), mul(J.fwd, -0.07));
  ctx.beginPath();
  ctx.moveTo(c0[0], c0[1] - 0.05);
  ctx.lineTo(ct[0], ct[1]);
  ctx.lineWidth = 0.007;
  ctx.stroke();
  // buttons
  for (const h of [0.2, 0.29, 0.38]) {
    const b = add(add(r.p, mul(J.tv, h)), mul(J.fwd, 0.118));
    ctx.beginPath();
    ctx.arc(b[0], b[1], 0.0095, 0, Math.PI * 2);
    ctx.fill();
  }
  // cuffs
  for (const [e, w] of [
    [J.en, J.wn],
    [J.ef, J.wf],
  ] as [V, V][]) {
    const d = norm(sub(w, e));
    const q = lv(e, w, 0.86);
    const nrm: V = [-d[1], d[0]];
    ctx.beginPath();
    ctx.moveTo(q[0] + nrm[0] * 0.044, q[1] + nrm[1] * 0.044);
    ctx.lineTo(q[0] - nrm[0] * 0.044, q[1] - nrm[1] * 0.044);
    ctx.lineWidth = 0.012;
    ctx.stroke();
  }
}

// one reusable offscreen canvas for the rim-light pass
let OFF: HTMLCanvasElement | null = null;
function off() {
  if (!OFF) {
    OFF = document.createElement('canvas');
    OFF.width = W;
    OFF.height = H;
  }
  return OFF;
}

/** draw a figure with a rim light coming from direction `ld` (world, unit) */
export function drawFigure(ctx: CanvasRenderingContext2D, c: Cam, L: Light, r: Rig, look: Look, opts: { rimPx?: number; ld?: V; rim?: RGB; alpha?: number } = {}) {
  const J = solve(r);
  const o = off().getContext('2d')!;
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(0, 0, W, H);
  applyCam(o, c);
  const wind = lerp(1, 0.35, L.dn);
  const rimCol = opts.rim ?? tri(look.kind === 'mentor' ? '#4b566b' : '#7c8aa3', '#dbe4f7', '#ffcf7c', L);
  const rimPx = opts.rimPx ?? lerp(2.6 + 5 * L.fl, 5.5, L.dn);
  const ld = opts.ld ?? norm(lv([0.45, 1], [1, 0.12], L.dn));
  body(o, r, J, look, css(rimCol), L.t, wind);
  o.globalCompositeOperation = 'source-atop';
  const w = Math.max(rimPx, 1.2) / c.z;
  o.translate(-ld[0] * w, -ld[1] * w);
  // base colours darken in the storm, warm up a touch at dawn
  const shade = (s: string) => css(mixc(mixc(hex(s), [0, 0, 0], 0.08 * (1 - L.dn)), [255, 190, 120], 0.04 * L.dn));
  const lk: Look = { ...look, body: shade(look.body), legs: shade(look.legs), far: shade(look.far), head: shade(look.head) };
  body(o, r, J, lk, null, L.t, wind);
  o.translate(ld[0] * w, ld[1] * w);
  o.globalCompositeOperation = 'source-over';
  if (look.kind === 'mentor') {
    const gc = tri('#8a6a2c', '#e8c46e', '#ffd47a', L);
    gold(o, r, J, L.t, wind, css(gc, 0.95));
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.drawImage(off(), 0, 0);
  ctx.globalAlpha = 1;
  return J;
}
