// 2D cross-section of the earth: a white stick figure digs a shaft toward a cavern of gold.
// Everything is a pure function of time (deterministic frames).
import { W, H, FPS, B, STRIKES, CRYSTALS, CAVE, LEDGE_Y, FINAL_DEPTH, depth, heat, clamp, lerp, smooth, prog, sstep, easeIn, easeOut, rnd } from './timeline.js';

type V = [number, number];
type Cam = { cx: number; cy: number; z: number; roll: number; sx: number; sy: number };
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
const len = (a: V) => Math.hypot(a[0], a[1]);
const lv = (a: V, b: V, k: number): V => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const dirv = (deg: number): V => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
const noise1 = (x: number, s: number) => {
  const i = Math.floor(x);
  const f = x - i;
  return lerp(rnd(i, s), rnd(i + 1, s), f * f * (3 - 2 * f)) * 2 - 1;
};

function applyCam(ctx: CanvasRenderingContext2D, c: Cam) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(W / 2 + c.sx, H / 2 + c.sy);
  ctx.rotate(c.roll);
  ctx.scale(c.z, -c.z);
  ctx.translate(-c.cx, -c.cy);
}
/** draw something placed at world x = ox in its own local coordinates */
const shift = (c: Cam, ox: number): Cam => ({ ...c, cx: c.cx - ox });
const OX = 3; // OBSESSION digs on the right
type Dg = { x: number; strikes: [number, number][]; quit: number; name: string };
const sched = (a: number, b: number, step: number, dd: number) => {
  const o: [number, number][] = [];
  for (let t = a; t < b - 1e-6; t += step) o.push([+t.toFixed(3), dd]);
  return o;
};
const AMB: Dg = { x: -3, strikes: [...sched(6, 9, 0.25, 0.12), ...sched(9, 11.01, 0.5, 0.1)], quit: 11.5, name: 'AMBITION' };
const PRE: Dg = { x: 0, strikes: sched(6, 19.01, 0.5, 0.14), quit: 19.5, name: 'PRÉCISION' };
const depthOf = (d: Dg, t: number) => d.strikes.reduce((s, [ti, dd]) => (t > ti ? s + dd * smooth((t - ti) / 0.1) : s), 0);
const PRE_END = depthOf(PRE, 40);
const toScreen = (c: Cam, p: V): V => {
  const x = (p[0] - c.cx) * c.z;
  const y = -(p[1] - c.cy) * c.z;
  const cs = Math.cos(c.roll);
  const sn = Math.sin(c.roll);
  return [W / 2 + c.sx + x * cs - y * sn, H / 2 + c.sy + x * sn + y * cs];
};

// ---------------------------------------------------------------- the ground
const STRATA = (() => {
  const cols = ['#3b2b21', '#2f241d', '#43311f', '#2a201a', '#382a1f', '#251c17', '#3f2e1c', '#2d221b', '#33261b', '#231a15'];
  const out: { y0: number; y1: number; c: string }[] = [];
  let y = 0;
  let i = 0;
  while (y > -60) {
    const th = 1.2 + rnd(i, 1) * 3.2;
    out.push({ y0: y, y1: y - th, c: cols[i % cols.length] });
    y -= th;
    i++;
  }
  return out;
})();
const SPECKS = Array.from({ length: 2600 }, (_, i) => ({
  x: (rnd(i, 1) - 0.5) * 60,
  y: -rnd(i, 2) * 58,
  r: 0.02 + Math.pow(rnd(i, 3), 3) * 0.1,
  a: 0.06 + rnd(i, 4) * 0.12,
  light: rnd(i, 5) > 0.5,
  gold: rnd(i, 6) > 0.93,
}));
const wallX = (y: number, side: number) => (side < 0 ? -0.95 : 1.35) + side * 0.12 * noise1(y * 2.3, side > 0 ? 5 : 9) + side * 0.05 * noise1(y * 9, side > 0 ? 7 : 3);

function drawGround(ctx: CanvasRenderingContext2D, c: Cam, t: number) {
  applyCam(ctx, c);
  const vh = H / 2 / c.z + 2;
  for (const s of STRATA) {
    if (s.y0 < c.cy - vh || s.y1 > c.cy + vh) continue;
    ctx.fillStyle = s.c;
    ctx.fillRect(-80, s.y1, 160, s.y0 - s.y1 + 0.01);
  }
  const vw = W / 2 / c.z + 2;
  for (const p of SPECKS) {
    if (Math.abs(p.x - c.cx) > vw || Math.abs(p.y - c.cy) > vh) continue;
    ctx.fillStyle = p.gold ? `rgba(214,168,80,${p.a * 2})` : p.light ? `rgba(120,96,72,${p.a})` : `rgba(10,7,5,${p.a * 1.5})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r * 1.6, p.r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // surface + night sky
  const g = ctx.createLinearGradient(0, 30, 0, 0);
  g.addColorStop(0, '#05070c');
  g.addColorStop(1, '#141b29');
  ctx.fillStyle = g;
  ctx.fillRect(-80, 0, 160, 60);
  ctx.fillStyle = 'rgba(220,230,255,0.7)';
  for (let i = 0; i < 160; i++) {
    const x = (rnd(i, 21) - 0.5) * 120;
    const y = 2 + rnd(i, 22) * 50;
    ctx.fillRect(x, y, 0.06 + rnd(i, 23) * 0.06, 0.06 + rnd(i, 23) * 0.06);
  }
  ctx.fillStyle = '#4a382a';
  ctx.fillRect(-80, -0.12, 160, 0.12);
}

/** the cavern of gold (revealed at the breakthrough; a faint glimmer before) */
function drawCave(ctx: CanvasRenderingContext2D, c: Cam, t: number) {
  const open = t >= B.breakthrough;
  applyCam(ctx, c);
  if (open) {
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const r = 1 + 0.08 * noise1(a * 6, 31) + 0.04 * noise1(a * 19, 33);
      ctx.lineTo(CAVE.cx + Math.cos(a) * CAVE.rx * r, CAVE.cy + Math.sin(a) * CAVE.ry * r);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(CAVE.cx, CAVE.cy - 4, 0, CAVE.cx, CAVE.cy - 2, CAVE.rx);
    g.addColorStop(0, '#5a3d17');
    g.addColorStop(0.6, '#2b1d10');
    g.addColorStop(1, '#130d08');
    ctx.fillStyle = g;
    ctx.fill();
    // gold crystals on the floor and walls
    for (let i = 0; i < 70; i++) {
      const a = Math.PI * (1.05 + rnd(i, 41) * 0.9);
      const r = 0.9 + rnd(i, 42) * 0.1;
      const bx = CAVE.cx + Math.cos(a) * CAVE.rx * r;
      const by = CAVE.cy + Math.sin(a) * CAVE.ry * r;
      const h = 0.6 + Math.pow(rnd(i, 43), 2) * 3.2;
      const w = h * (0.22 + rnd(i, 44) * 0.15);
      const tilt = (rnd(i, 45) - 0.5) * 0.9 + (bx - CAVE.cx) * -0.03;
      crystal(ctx, [bx, by], w, h, tilt, 1);
    }
    // the great cluster at the bottom centre
    for (let i = 0; i < 9; i++) crystal(ctx, [CAVE.cx + (i - 4) * 0.7, CAVE.cy - CAVE.ry * 0.93], 0.8 + rnd(i, 50) * 0.5, 3 + rnd(i, 51) * 4.5, (i - 4) * 0.12, 1.3);
  }
  // the ledge he lands on
  ctx.fillStyle = '#1d150f';
  ctx.beginPath();
  ctx.moveTo(-1.6, LEDGE_Y);
  ctx.lineTo(2.3, LEDGE_Y);
  ctx.lineTo(2.0, LEDGE_Y - 0.5);
  ctx.lineTo(0.4, LEDGE_Y - 1.4);
  ctx.lineTo(-1.6, LEDGE_Y - 2.2);
  ctx.closePath();
  if (open) ctx.fill();
}
function crystal(ctx: CanvasRenderingContext2D, base: V, w: number, h: number, tilt: number, glow: number) {
  ctx.save();
  ctx.translate(base[0], base[1]);
  ctx.rotate(tilt);
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, '#8a5a1c');
  g.addColorStop(0.5, `rgba(255,${200 + 30 * glow > 255 ? 255 : 200 + 30 * glow},120,1)`);
  g.addColorStop(1, '#b07524');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w / 2, h * 0.75);
  ctx.lineTo(0, h);
  ctx.lineTo(w / 2, h * 0.75);
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** the shaft dug so far (and the hole it breaks into the cavern) */
function drawShaft(ctx: CanvasRenderingContext2D, c: Cam, t: number, dOver?: number) {
  const d = dOver ?? depth(t);
  const floor = -d;
  applyCam(ctx, c);
  const pts: V[] = [];
  const bottom = dOver === undefined && t >= B.breakthrough ? LEDGE_Y : floor;
  for (let y = 0.05; y >= bottom; y -= 0.1) pts.push([wallX(y, -1), y]);
  // uneven floor
  for (let i = 0; i <= 10; i++) {
    const x = lerp(wallX(bottom, -1), wallX(bottom, 1), i / 10);
    pts.push([x, bottom + 0.04 * noise1(x * 5 + Math.floor(t * 2), 13)]);
  }
  for (let y = bottom; y <= 0.05; y += 0.1) pts.push([wallX(y, 1), y]);
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  ctx.fillStyle = '#0d0907';
  ctx.fill();
  // pick marks on the walls
  ctx.strokeStyle = 'rgba(90,70,52,0.35)';
  ctx.lineWidth = 0.025;
  for (let i = 0; i < 160; i++) {
    const y = -rnd(i, 61) * Math.max(0.1, -bottom);
    const side = i % 2 ? 1 : -1;
    const x = wallX(y, side) - side * 0.03;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - side * (0.08 + rnd(i, 62) * 0.12), y - 0.08 - rnd(i, 63) * 0.1);
    ctx.stroke();
  }
  // wall rims
  ctx.strokeStyle = 'rgba(150,115,80,0.5)';
  ctx.lineWidth = 0.03;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    for (let y = 0.05; y >= bottom; y -= 0.1) ctx.lineTo(wallX(y, side), y);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- the stick figure
type Pose = { pel: V; neck: V; hands: [V, V]; feet: [V, V]; g?: V; ang?: number };
const SIT: Pose = { pel: [0, 0.16], neck: [0.12, 0.68], hands: [[0.42, 0.42], [0.38, 0.38]], feet: [[0.46, 0], [0.4, 0]] };
const SIT_LOOK: Pose = { ...SIT, neck: [0.28, 0.62], hands: [[0.44, 0.36], [0.4, 0.34]] };
const STAND: Pose = { pel: [0, 0.92], neck: [0.03, 1.47], hands: [[-0.04, 0.6], [0.12, 0.62]], feet: [[-0.1, 0], [0.13, 0]] };
const WIND: Pose = { pel: [-0.05, 0.9], neck: [-0.13, 1.45], hands: [[0, 0], [0, 0]], feet: [[-0.28, 0], [0.32, 0]], g: [-0.2, 1.72], ang: 100 };
const HIT: Pose = { pel: [0.06, 0.82], neck: [0.3, 1.3], hands: [[0, 0], [0, 0]], feet: [[-0.28, 0], [0.32, 0]], g: [0.32, 0.76], ang: -56 };
const FLAIL: Pose = { pel: [0, 0.9], neck: [-0.12, 1.44], hands: [[-0.45, 1.65], [0.42, 1.6]], feet: [[-0.22, 0.12], [0.28, 0.22]] };
const LYING: Pose = { pel: [0, 0.12], neck: [-0.56, 0.16], hands: [[-0.42, 0.05], [0.12, 0.08]], feet: [[0.55, 0.05], [0.4, 0.3]] };
const SITUP: Pose = { pel: [0, 0.12], neck: [0.12, 0.65], hands: [[-0.22, 0.04], [0.3, 0.3]], feet: [[0.56, 0.04], [0.5, 0.04]] };
const KNEEL: Pose = { pel: [0, 0.5], neck: [0.12, 1.05], hands: [[0.38, 0.5], [0.25, 0.48]], feet: [[0.36, 0.02], [-0.45, 0.02]] };
const LAND: Pose = { pel: [0, 0.55], neck: [0.25, 1.0], hands: [[0.45, 0.2], [0.35, 0.25]], feet: [[-0.22, 0], [0.26, 0]] };
const TRIUMPH: Pose = { pel: [0, 0.93], neck: [-0.02, 1.48], hands: [[0, 0], [0, 0]], feet: [[-0.16, 0], [0.2, 0]], g: [0.02, 1.9], ang: 88 };

function mixP(a: Pose, b: Pose, k: number): Pose {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const o: Pose = { pel: lv(a.pel, b.pel, k), neck: lv(a.neck, b.neck, k), hands: [lv(a.hands[0], b.hands[0], k), lv(a.hands[1], b.hands[1], k)], feet: [lv(a.feet[0], b.feet[0], k), lv(a.feet[1], b.feet[1], k)] };
  if (a.g && b.g) {
    o.g = lv(a.g, b.g, k);
    o.ang = lerp(a.ang!, b.ang!, k);
  } else if (b.g && k > 0.5) {
    o.g = b.g;
    o.ang = b.ang;
  } else if (a.g && k <= 0.5) {
    o.g = a.g;
    o.ang = a.ang;
  }
  return o;
}
/** hands follow the pickaxe grip when it is held */
function withGrip(p: Pose): Pose {
  if (!p.g) return p;
  const d = dirv(p.ang!);
  return { ...p, hands: [p.g, add(p.g, mul(d, 0.2))] };
}

/** digging cycle between strikes */
function digPose(t: number, strikes: [number, number][] = STRIKES as [number, number][]): Pose {
  let prev = -1;
  let next = 1e9;
  for (const [ti] of strikes) {
    if (ti <= t) prev = Math.max(prev, ti);
    else next = Math.min(next, ti);
  }
  const P = next - prev;
  const swing = Math.min(0.13, P * 0.42);
  if (t >= next - swing) return withGrip(mixP(WIND, HIT, easeIn((t - (next - swing)) / swing)));
  if (prev < 0) return withGrip(WIND);
  const k = sstep(t, prev + 0.05, next - swing);
  const wk = mixP(HIT, WIND, k);
  return withGrip(wk);
}

type Figure = { root: V; pose: Pose; dir: number; pick?: { g: V; ang: number } };
/** where the pickaxe is when nobody holds it */
function loosePick(t: number, root: V): { g: V; ang: number } | undefined {
  if (t < B.grab) return { g: [-0.7, 0.03], ang: 4 };
  if (t >= B.collapse && t < 10.0) {
    const k = prog(t, B.collapse, B.impact + 0.1);
    const from: V = [0.55, -depth(B.collapse - 0.01) + 0.6];
    const to: V = [0.75, -depth(B.impact) + 0.03];
    return { g: lv(from, to, easeIn(k)), ang: lerp(-50, -190, k) };
  }
  return undefined;
}
export function figure(t: number): Figure {
  const floorY = -depth(t);
  // 1. departure
  if (t < B.stand) return { root: [0, 0], pose: mixP(SIT, SIT_LOOK, sstep(t, B.look, B.look + 0.2)), dir: 1 };
  if (t < B.grab) return { root: [0, 0], pose: mixP(SIT_LOOK, STAND, smooth(prog(t, B.stand, B.grab))), dir: 1 };
  if (t < 5.75) {
    const k = smooth(prog(t, B.grab, 5.75));
    return { root: [0, 0], pose: withGrip(mixP({ ...STAND, g: [-0.55, 0.1], ang: 10 }, WIND, k)), dir: 1 };
  }
  // 2. digging, then the collapse
  if (t < B.collapse) return { root: [0, floorY], pose: digPose(t), dir: 1 };
  if (t < B.impact) {
    const k = prog(t, B.collapse, B.impact);
    const p = k < 0.55 ? mixP(HIT, FLAIL, smooth(k / 0.55)) : mixP(FLAIL, LYING, smooth((k - 0.55) / 0.45));
    return { root: [0, floorY], pose: p, dir: 1 };
  }
  if (t < B.up) {
    const b = 0.04 * Math.exp(-(t - B.impact) * 12) * Math.sin((t - B.impact) * 40);
    return { root: [0, floorY + Math.abs(b)], pose: LYING, dir: 1 };
  }
  if (t < 9.45) return { root: [0, floorY], pose: mixP(LYING, SITUP, smooth(prog(t, B.up, 9.45))), dir: 1 };
  if (t < 9.8) return { root: [0, floorY], pose: mixP(SITUP, KNEEL, smooth(prog(t, 9.45, 9.8))), dir: 1 };
  if (t < 10.05) return { root: [0, floorY], pose: mixP(KNEEL, STAND, smooth(prog(t, 9.8, 10.05))), dir: 1 };
  if (t < 10.25) {
    const k = smooth(prog(t, 10.05, 10.25));
    return { root: [0, floorY], pose: mixP(STAND, { ...KNEEL, hands: [[0.72, 0.1], [0.62, 0.15]] }, Math.sin(Math.PI * k) * 0.8), dir: 1 };
  }
  if (t < B.breakthrough) return { root: [0, floorY], pose: digPose(Math.max(t, 10.26)), dir: 1 };
  // 5. breakthrough: drops onto the ledge, rises, lifts the pickaxe
  if (t < B.land) {
    const k = prog(t, B.breakthrough, B.land);
    const y = lerp(-FINAL_DEPTH, LEDGE_Y, easeIn(k));
    return { root: [0.1 * k, y], pose: withGrip(mixP(HIT, { ...LAND, g: [0.45, 0.5], ang: -30 }, smooth(k))), dir: 1 };
  }
  const base: V = [0.1, LEDGE_Y];
  if (t < B.rise) return { root: base, pose: withGrip({ ...LAND, g: [0.45, 0.25], ang: -20 }), dir: 1 };
  if (t < B.raise) {
    const k = smooth(prog(t, B.rise, 27.8));
    return { root: base, pose: withGrip(mixP({ ...LAND, g: [0.45, 0.25], ang: -20 }, { ...STAND, g: [0.12, 0.62], ang: -80 }, k)), dir: 1 };
  }
  const k = easeOut(prog(t, B.raise, 29.6));
  const breath = 0.01 * Math.sin(t * 2.4);
  const p = withGrip(mixP({ ...STAND, g: [0.12, 0.62], ang: -80 }, TRIUMPH, k));
  return { root: [base[0], base[1] + breath], pose: p, dir: 1 };
}

function ik(root: V, tgt: V, l1: number, l2: number, pref: V): V {
  const d = sub(tgt, root);
  let L = len(d);
  const u = mul(d, 1 / (L || 1));
  L = clamp(L, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  const a = Math.acos(clamp((l1 * l1 + L * L - l2 * l2) / (2 * l1 * L), -1, 1));
  const r = (s: number): V => [u[0] * Math.cos(s) - u[1] * Math.sin(s), u[0] * Math.sin(s) + u[1] * Math.cos(s)];
  const j1 = add(root, mul(r(a), l1));
  const j2 = add(root, mul(r(-a), l1));
  const mid = add(root, mul(u, L / 2));
  return (j1[0] - mid[0]) * pref[0] + (j1[1] - mid[1]) * pref[1] >= (j2[0] - mid[0]) * pref[0] + (j2[1] - mid[1]) * pref[1] ? j1 : j2;
}

function drawPick(ctx: CanvasRenderingContext2D, g: V, ang: number) {
  const d = dirv(ang);
  const end = add(g, mul(d, 0.9));
  ctx.strokeStyle = '#d8cdbd';
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.moveTo(g[0], g[1]);
  ctx.lineTo(end[0], end[1]);
  ctx.stroke();
  // curved head, perpendicular to the handle
  const n: V = [-d[1], d[0]];
  const a = add(end, mul(n, 0.3));
  const b = add(end, mul(n, -0.3));
  const ctl = add(end, mul(d, 0.12));
  ctx.strokeStyle = '#f1eee8';
  ctx.lineWidth = 0.055;
  ctx.beginPath();
  ctx.moveTo(add(a, mul(d, -0.08))[0], add(a, mul(d, -0.08))[1]);
  ctx.quadraticCurveTo(ctl[0], ctl[1], add(b, mul(d, -0.08))[0], add(b, mul(d, -0.08))[1]);
  ctx.stroke();
}
export function drawFigure(ctx: CanvasRenderingContext2D, c: Cam, t: number) {
  drawFig(ctx, c, figure(t), loosePick(t, figure(t).root), 1);
}
function drawFig(ctx: CanvasRenderingContext2D, c: Cam, F: Figure, lp2: { g: V; ang: number } | undefined, glow: number) {
  const o = F.root;
  const P = (p: V): V => [o[0] + p[0] * F.dir, o[1] + p[1]];
  const pel = P(F.pose.pel);
  const neck = P(F.pose.neck);
  const up = mul(sub(neck, pel), 1 / len(sub(neck, pel)));
  const head = add(neck, mul(up, 0.18));
  const sh = add(neck, mul(up, -0.06));
  applyCam(ctx, c);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = `rgba(255,240,215,${0.65 * glow})`;
  ctx.shadowBlur = 14 * glow;
  ctx.globalAlpha = 0.55 + 0.45 * glow;
  const lp = F.pose.g ? withGrip(F.pose) : F.pose;
  const hands = lp.hands.map(P) as [V, V];
  const feet = lp.feet.map(P) as [V, V];
  // pickaxe behind the near arm
  if (F.pose.g) drawPick(ctx, P(F.pose.g), F.pose.ang!);
  if (lp2) drawPick(ctx, lp2.g, lp2.ang);
  ctx.strokeStyle = '#f6f2ea';
  ctx.fillStyle = '#f6f2ea';
  ctx.lineWidth = 0.07;
  const seg = (a: V, b: V) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  for (const f of feet) {
    const k = ik(pel, f, 0.46, 0.46, [F.dir, 0.3]);
    seg(pel, k);
    seg(k, f);
    seg(f, add(f, [0.1 * F.dir, 0]));
  }
  seg(pel, neck);
  for (const h of hands) {
    const e = ik(sh, h, 0.31, 0.3, [-F.dir * 0.3, -1]);
    seg(sh, e);
    seg(e, h);
  }
  ctx.beginPath();
  ctx.arc(head[0], head[1], 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the two who give up
const DEFEAT: Pose = { pel: [-0.2, 0.14], neck: [0.16, 0.52], hands: [[0.32, 0.3], [0.28, 0.28]], feet: [[0.45, 0], [0.4, 0]] };
const DROP: Pose = { ...STAND, neck: [0.1, 1.42], g: [0.12, 0.62], ang: -80 };
function quitter(d: Dg, t: number): { F: Figure; loose?: { g: V; ang: number }; glow: number } {
  const fy = -depthOf(d, t);
  const pick0: V = [-0.7, 0.03];
  if (t < B.stand) return { F: { root: [0, 0], pose: mixP(SIT, SIT_LOOK, sstep(t, B.look, B.look + 0.2)), dir: 1 }, loose: { g: pick0, ang: 4 }, glow: 1 };
  if (t < B.grab) return { F: { root: [0, 0], pose: mixP(SIT_LOOK, STAND, smooth(prog(t, B.stand, B.grab))), dir: 1 }, loose: { g: pick0, ang: 4 }, glow: 1 };
  if (t < 5.75) return { F: { root: [0, 0], pose: withGrip(mixP({ ...STAND, g: [-0.55, 0.1], ang: 10 }, WIND, smooth(prog(t, B.grab, 5.75)))), dir: 1 }, glow: 1 };
  if (t < d.quit) return { F: { root: [0, fy], pose: digPose(t, d.strikes), dir: 1 }, glow: 1 };
  const q = t - d.quit;
  const glow = lerp(1, 0.35, smooth(q / 1.5));
  if (q < 0.45) return { F: { root: [0, fy], pose: withGrip(mixP(digPose(d.quit, d.strikes), DROP, smooth(q / 0.45))), dir: 1 }, glow };
  const fallK = easeIn(prog(q, 0.45, 0.75));
  const loose = { g: lv([0.12, fy + 0.62], [0.55, fy + 0.03], fallK), ang: lerp(-80, -175, fallK) };
  const pose = mixP({ ...STAND, neck: [0.1, 1.42] }, DEFEAT, smooth(prog(q, 0.5, 1.4)));
  const br = 0.008 * Math.sin(t * 2);
  return { F: { root: [0, fy + br], pose, dir: 1 }, loose, glow };
}
function drawQuitters(ctx: CanvasRenderingContext2D, c: Cam, t: number) {
  for (const d of [AMB, PRE]) {
    const cc = shift(c, d.x);
    drawShaft(ctx, cc, t, depthOf(d, t));
    // chips + dust of their strikes
    applyCam(ctx, cc);
    d.strikes.forEach(([ti], si) => {
      const dt = t - ti;
      if (dt < 0 || dt > 0.9) return;
      const fy = -depthOf(d, ti - 0.001);
      for (let i = 0; i < 6; i++) {
        const x = 0.82 + (rnd(si + 500, i * 3) - 0.35) * 2.2 * dt;
        const y = fy + (1.1 + rnd(si + 500, i * 3 + 1) * 2.2) * dt - 4.9 * dt * dt;
        if (y < fy - 0.02) continue;
        const sz = 0.025 + rnd(si + 500, i * 3 + 2) * 0.035;
        ctx.fillStyle = '#6b5440';
        ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
    });
    const q = quitter(d, t);
    drawFig(ctx, cc, q.F, q.loose, q.glow);
  }
}
/** the gold PRÉCISION never reached: just under where he stopped */
function drawVein(ctx: CanvasRenderingContext2D, c: Cam, t: number) {
  applyCam(ctx, shift(c, PRE.x));
  const y = -PRE_END - 0.75;
  for (let i = 0; i < 5; i++) crystal(ctx, [-0.4 + i * 0.32, y + (i % 2) * 0.12], 0.09, 0.22 + 0.08 * (i % 3), (i - 2) * 0.35, 1);
}

// ---------------------------------------------------------------- particles: chips, dust, sparks, collapse rubble
function drawImpacts(ctx: CanvasRenderingContext2D, c: Cam, t: number) {
  applyCam(ctx, c);
  STRIKES.forEach(([ti], si) => {
    const d = t - ti;
    if (d < 0 || d > 1.2) return;
    const fy = -depth(ti - 0.001);
    const hx = 0.82;
    const frenzy = ti >= B.frenzy;
    // chips
    for (let i = 0; i < 9; i++) {
      const vx = (rnd(si, i * 3) - 0.35) * 2.4;
      const vy = 1.2 + rnd(si, i * 3 + 1) * 2.6;
      const x = hx + vx * d;
      const y = fy + vy * d - 4.9 * d * d;
      if (y < fy - 0.02) continue;
      const s = 0.025 + rnd(si, i * 3 + 2) * 0.04;
      ctx.fillStyle = '#6b5440';
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
    // dust puff
    const r = 0.1 + d * 0.6;
    const dg = ctx.createRadialGradient(hx, fy + 0.1 + d * 0.3, 0, hx, fy + 0.1 + d * 0.3, r);
    dg.addColorStop(0, `rgba(150,120,90,${0.22 * (1 - d / 1.2)})`);
    dg.addColorStop(1, 'rgba(150,120,90,0)');
    ctx.fillStyle = dg;
    ctx.fillRect(hx - r, fy + 0.1 + d * 0.3 - r, r * 2, r * 2);
    // sparks (from the progression on)
    if (ti >= 14 && d < 0.35) {
      ctx.strokeStyle = `rgba(255,${frenzy ? 200 : 225},120,${1 - d / 0.35})`;
      ctx.lineWidth = 0.018;
      for (let i = 0; i < (frenzy ? 14 : 7); i++) {
        const a = Math.PI * (0.05 + rnd(si, 100 + i) * 0.9);
        const sp = 2 + rnd(si, 120 + i) * 4;
        const p0: V = [hx + Math.cos(a) * sp * d, fy + Math.sin(a) * sp * d - 2 * d * d];
        const p1: V = [p0[0] - Math.cos(a) * 0.12, p0[1] - Math.sin(a) * 0.12];
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.stroke();
      }
    }
  });
  // collapse rubble
  const dc = t - B.collapse;
  if (dc > 0 && dc < 1.6) {
    const top = -depth(B.collapse - 0.001);
    for (let i = 0; i < 22; i++) {
      const x = lerp(-0.9, 1.3, rnd(i, 201));
      const s = 0.06 + rnd(i, 202) * 0.12;
      const y = Math.max(-depth(B.impact) + s / 2, top - 0.1 - rnd(i, 203) * 0.3 - 4.9 * dc * dc * (0.8 + 0.4 * rnd(i, 204)));
      ctx.fillStyle = '#4a3828';
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rnd(i, 205) * 3 + dc * (rnd(i, 206) - 0.5) * 6);
      ctx.fillRect(-s / 2, -s / 2, s, s * 0.7);
      ctx.restore();
    }
    const rr = 0.4 + Math.max(0, t - B.impact) * 1.2;
    const cyy = -depth(B.impact) + 0.3;
    const cg = ctx.createRadialGradient(0.2, cyy, 0, 0.2, cyy, rr);
    cg.addColorStop(0, `rgba(140,110,80,${0.35 * Math.max(0, 1 - Math.abs(t - B.impact) / 1.0)})`);
    cg.addColorStop(1, 'rgba(140,110,80,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(0.2 - rr, cyy - rr, rr * 2, rr * 2);
  }
  // breakthrough: the floor shatters into the cavern
  const db = t - B.breakthrough;
  if (db > 0 && db < 3) {
    for (let i = 0; i < 40; i++) {
      const x = lerp(-0.9, 1.3, rnd(i, 301)) + (rnd(i, 302) - 0.3) * 3 * db;
      const y = -FINAL_DEPTH - 4.9 * db * db * (0.7 + 0.6 * rnd(i, 303)) + 1.2 * db;
      const s = 0.06 + rnd(i, 304) * 0.18;
      ctx.fillStyle = '#3f2f22';
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rnd(i, 305) * 3 + db * 4 * (rnd(i, 306) - 0.5));
      ctx.fillRect(-s / 2, -s / 2, s, s * 0.7);
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------- light: darkness with light holes + additive glows
let LM: HTMLCanvasElement | null = null;
function lights(t: number): { p: V; r: number; a: number; col: string }[] {
  const F = figure(t);
  const L: { p: V; r: number; a: number; col: string }[] = [];
  const fig = add(F.root, [0.2, 1.0]);
  L.push({ p: fig, r: 2.4 + 0.8 * heat(t), a: 0.85, col: '255,220,170' });
  for (const k of CRYSTALS) {
    if (t < k.t) continue;
    const d = t - k.t;
    const a = d < 0.08 ? d / 0.08 : 0.65 + 0.35 * Math.exp(-(d - 0.08) * 4);
    L.push({ p: [k.side < 0 ? -0.9 : 1.3, k.y], r: 1.4, a, col: '255,190,110' });
  }
  // flash of each strike
  for (const [ti] of STRIKES) {
    const d = t - ti;
    if (d >= 0 && d < 0.25) L.push({ p: [0.82, -depth(ti - 0.001) + 0.1], r: 1.2 + (ti >= 20 ? 0.8 : 0), a: (1 - d / 0.25) * (ti >= 14 ? 0.9 : 0.5), col: '255,210,140' });
  }
  // the gold below: a faint glimmer, growing, then the cavern
  const glim = 0.55 + 0.3 * heat(t);
  L.push({ p: [CAVE.cx - 2, CAVE.cy - 3], r: 3.5 + 3 * heat(t), a: glim * (t < B.breakthrough ? 1 : 0), col: '255,185,80' });
  if (t >= B.breakthrough) {
    const k = easeOut(prog(t, B.breakthrough, B.breakthrough + 0.8));
    L.push({ p: [CAVE.cx, CAVE.cy - 3], r: 4 + 22 * k, a: 1, col: '255,200,110' });
    L.push({ p: [0.5, -FINAL_DEPTH + 3], r: 1 + 8 * k, a: 0.8 * k, col: '255,210,140' });
  }
  for (const l of L) l.p = [l.p[0] + OX, l.p[1]];
  for (const d of [AMB, PRE]) {
    const q = quitter(d, t);
    L.push({ p: [d.x + q.F.root[0] + 0.2, q.F.root[1] + 0.9], r: 2.2, a: 0.85 * (0.4 + 0.6 * q.glow), col: '255,220,170' });
    for (const [ti] of d.strikes) {
      const dt = t - ti;
      if (dt >= 0 && dt < 0.2) L.push({ p: [d.x + 0.82, -depthOf(d, ti - 0.001) + 0.1], r: 1.0, a: (1 - dt / 0.2) * 0.45, col: '255,210,140' });
    }
  }
  L.push({ p: [PRE.x + 0.1, -PRE_END - 0.7], r: 1.1, a: t > PRE.quit ? 0.35 + 0.25 * Math.sin(t * 3) ** 2 : 0.15, col: '255,190,90' });
  return L;
}
function drawLight(ctx: CanvasRenderingContext2D, c: Cam, t: number) {
  if (!LM) {
    LM = document.createElement('canvas');
    LM.width = W / 2;
    LM.height = H / 2;
  }
  const g = LM.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, W / 2, H / 2);
  // darkness only underground (the sky stays as is)
  const sy = toScreen(c, [0, 0])[1] / 2;
  g.fillStyle = `rgba(3,2,2,${lerp(0.9, 0.86, heat(t))})`;
  g.fillRect(0, Math.max(0, sy), W / 2, H / 2);
  g.globalCompositeOperation = 'destination-out';
  const L = lights(t);
  for (const l of L) {
    const [x, y] = toScreen(c, l.p);
    const r = (l.r * c.z) / 2;
    const rg = g.createRadialGradient(x / 2, y / 2, 0, x / 2, y / 2, r);
    rg.addColorStop(0, `rgba(0,0,0,${l.a})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(x / 2 - r, y / 2 - r, r * 2, r * 2);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(LM, 0, 0, W, H);
  // additive coloured glows
  ctx.globalCompositeOperation = 'lighter';
  for (const l of L) {
    const [x, y] = toScreen(c, l.p);
    const r = l.r * c.z * 0.8;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(${l.col},${(l.r > 5 ? 0.12 : 0.2) * l.a})`);
    rg.addColorStop(1, `rgba(${l.col},0)`);
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // crystals themselves (small, bright)
  applyCam(ctx, shift(c, OX));
  for (const k of CRYSTALS) {
    if (t < k.t) continue;
    const x = k.side < 0 ? wallX(k.y, -1) + 0.02 : wallX(k.y, 1) - 0.02;
    crystal(ctx, [x, k.y], k.s * 0.8, k.s * 2, k.side < 0 ? -1.1 : 1.1, 1);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- camera
const ez = (a: number, b: number, k: number) => Math.exp(lerp(Math.log(a), Math.log(b), k));
function camera(t: number): Cam {
  const fy = figure(t).root[1];
  const ya = quitter(AMB, t).F.root[1];
  const yp = quitter(PRE, t).F.root[1];
  let cx = 0.5;
  let cy = fy + 0.9;
  let z = 100;
  let roll = 0;
  let sh = 0;
  const hits = (from: number, to: number, amp: number, dec: number) => STRIKES.reduce((m, [ti]) => (t >= ti && ti >= from && ti < to ? Math.max(m, amp * Math.exp(-(t - ti) * dec)) : m), 0);
  if (t < 6) {
    const k = sstep(t, 0, 6);
    z = ez(30, 100, Math.pow(k, 1.4));
    cx = lerp(4, 0.5, k);
    cy = lerp(-8, 1.1, Math.pow(k, 1.3));
  } else if (t < 14) {
    z = 100;
    cy = (ya + yp + fy) / 3 + 1.1;
    sh = (t > B.impact ? 22 * Math.exp(-(t - B.impact) * 6) : 0) + hits(0, 14, 3, 20);
  } else if (t < 20) {
    const k = prog(t, 14, 20);
    z = lerp(100, 118, k);
    cx = lerp(0.6, 1.7, smooth(k));
    cy = (yp + fy) / 2 + 1.2;
    sh = hits(14, 20, 5, 18);
  } else if (t < 26) {
    const k = prog(t, 20, 26);
    const f = smooth(k * 2.5);
    z = lerp(lerp(118, 220, f), 310, k);
    cx = lerp(1.7, OX + 0.45, f);
    cy = lerp((yp + fy) / 2 + 1.2, fy + 0.85 - 0.2 * k, f);
    roll = 0.04 * Math.sin(t * 2.1) * k;
    sh = hits(20, 27, 8 + 12 * k, 22);
  } else {
    const k = sstep(t, 26.1, 31.5);
    z = ez(230, 27, Math.pow(k, 0.6));
    cx = lerp(OX + 0.6, 3.6, k);
    cy = lerp(LEDGE_Y + 1.0, LEDGE_Y + 6.8, k);
    sh = 30 * Math.exp(-(t - B.breakthrough) * 4) + (t > B.final ? 16 * Math.exp(-(t - B.final) * 5) : 0);
  }
  const sx = sh * (rnd(Math.floor(t * 60), 1) - 0.5) * 2;
  const sy = sh * (rnd(Math.floor(t * 60), 2) - 0.5) * 2;
  return { cx, cy, z, roll, sx, sy };
}

// ---------------------------------------------------------------- frame
export function renderFrame(ctx: CanvasRenderingContext2D, f: number) {
  const t = f / FPS;
  const c = camera(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  drawGround(ctx, c, t);
  const co = shift(c, OX);
  drawCave(ctx, co, t);
  drawVein(ctx, c, t);
  drawShaft(ctx, co, t);
  drawQuitters(ctx, c, t);
  drawImpacts(ctx, co, t);
  drawFigure(ctx, co, t);
  drawLight(ctx, c, t);
  // beat-synced flashes on the section changes (no black frames)
  const fl = [14, 20, 26, 30].reduce((m, x) => Math.max(m, t >= x ? Math.exp(-(t - x) * (x === 26 ? 4.5 : 11)) * (x === 26 ? 0.55 : 0.2) : 0), 0);
  if (fl > 0.005) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,214,150,${fl})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  drawTitle(ctx, c, t);
  const out = clamp((t - 31.3) / 0.7);
  if (out > 0) {
    ctx.fillStyle = `rgba(0,0,0,${out})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------------------------------------------------------------- names above the three diggers
function label(ctx: CanvasRenderingContext2D, c: Cam, F: Figure, ox: number, text: string, col: string, glow: string, alpha: number) {
  if (alpha <= 0.01) return;
  const pel = add(F.root, F.pose.pel);
  const neck = add(F.root, F.pose.neck);
  const [x, y] = toScreen(c, [ox + (pel[0] + neck[0]) / 2, Math.max(pel[1], neck[1]) + 0.34]);
  if (x < -200 || x > W + 200 || y < -100 || y > H + 100) return;
  const size = clamp(c.z * 0.27, 26, 50);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.font = `700 ${size}px Inter700, Arial, sans-serif`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${(size * 0.24).toFixed(1)}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const tw = ctx.measureText(text).width;
  const sx = clamp(x + size * 0.12, tw / 2 + 30, W - tw / 2 - 30);
  const sy = clamp(y - 22, size + 110, H - 280);
  ctx.shadowColor = glow;
  ctx.shadowBlur = 16;
  ctx.fillStyle = col;
  ctx.fillText(text, sx, sy);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
}
function drawTitle(ctx: CanvasRenderingContext2D, c: Cam, t: number) {
  const on = sstep(t, 3.6, 4.2);
  for (const d of [AMB, PRE]) {
    const q = quitter(d, t);
    const dim = smooth((t - d.quit) / 1.2);
    label(ctx, c, q.F, d.x, d.name, dim > 0 ? 'rgba(150,145,138,1)' : '#f4efe6', 'rgba(0,0,0,0.9)', on * lerp(1, 0.55, dim));
  }
  const gold = sstep(t, B.frenzy - 0.2, B.frenzy + 0.2);
  label(ctx, c, figure(t), OX, 'OBSESSION', gold > 0.5 ? '#ffc35e' : '#f4efe6', gold > 0.5 ? 'rgba(255,180,70,0.9)' : 'rgba(0,0,0,0.9)', on);
}
