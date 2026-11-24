// "First victory" (5 s): the same glowing stick figure, reclined on a deck chair at the stern of a yacht,
// raises his glass toward a tropical island with a skyline at sunset. Same 2D line style as the dig scenes:
// near-black background, glowing white lines (#f6f2ea, soft white shadow), gold light.
import { W, H, FPS, clamp, lerp, smooth, sstep, prog, rnd } from './timeline.js';

type V = [number, number];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
const len = (a: V) => Math.hypot(a[0], a[1]);
const lv = (a: V, b: V, k: number): V => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
export const YACHT_FRAMES = 5 * FPS;
const LINE = '#f6f2ea';
const HORIZON = 905;

// ---------------------------------------------------------------- far layer (screen space): sky, sun, skyline, island
function sky(ctx: CanvasRenderingContext2D, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, '#030304');
  g.addColorStop(0.55, '#08070a');
  g.addColorStop(0.85, '#1c1309');
  g.addColorStop(1, '#3a2510');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON);
  for (let i = 0; i < 70; i++) {
    const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * (1 + rnd(i, 3) * 2) + i));
    ctx.fillStyle = `rgba(240,235,225,${a * (1 - rnd(i, 2) * 0.5)})`;
    ctx.fillRect(rnd(i, 1) * W, rnd(i, 2) * 560, 2, 2);
  }
}
const SUN = (t: number): V => [720, HORIZON - 150 + t * 6];
function sun(ctx: CanvasRenderingContext2D, t: number) {
  const [x, y] = SUN(t);
  ctx.globalCompositeOperation = 'lighter';
  for (const [r, a, c] of [
    [620, 0.22, '255,160,60'],
    [300, 0.35, '255,190,100'],
    [140, 0.6, '255,215,150'],
  ] as [number, number, string][]) {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(${c},${a})`);
    rg.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ffd890';
  ctx.beginPath();
  ctx.arc(x, y, 62, 0, Math.PI * 2);
  ctx.fill();
}
// skyline: generic towers with setbacks and spires, drawn as dark shapes with luminous outlines
type Tower = { x: number; w: number; h: number; steps: number; spire: number; win: number };
const TOWERS: Tower[] = (() => {
  const out: Tower[] = [];
  let x = 250;
  let i = 0;
  while (x < 840) {
    const w = 26 + rnd(i, 1) * 44;
    const mid = 1 - Math.abs(x + w / 2 - 548) / 330;
    const h = 90 + mid * 330 * (0.55 + 0.45 * rnd(i, 2)) + (i === 7 ? 140 : 0);
    out.push({ x, w, h, steps: rnd(i, 3) > 0.5 ? 2 : rnd(i, 3) > 0.25 ? 1 : 0, spire: i === 7 || rnd(i, 4) > 0.82 ? 40 + rnd(i, 5) * 70 : 0, win: i });
    x += w + 2 + rnd(i, 6) * 8;
    i++;
  }
  return out;
})();
const ISLAND_Y = HORIZON - 6;
function towerPath(ctx: CanvasRenderingContext2D, T: Tower) {
  const base = ISLAND_Y - 18;
  const top = base - T.h;
  ctx.beginPath();
  ctx.moveTo(T.x, base);
  let y = top + (T.steps ? T.h * 0.18 : 0);
  ctx.lineTo(T.x, y);
  if (T.steps >= 1) {
    ctx.lineTo(T.x + T.w * 0.12, y);
    y -= T.h * 0.1;
    ctx.lineTo(T.x + T.w * 0.12, y);
  }
  if (T.steps >= 2) {
    ctx.lineTo(T.x + T.w * 0.24, y);
    y = top;
    ctx.lineTo(T.x + T.w * 0.24, y);
    ctx.lineTo(T.x + T.w * 0.76, y);
    ctx.lineTo(T.x + T.w * 0.76, top + T.h * 0.08);
  } else {
    ctx.lineTo(T.x + T.w * (T.steps ? 0.12 : 0), top);
    ctx.lineTo(T.x + T.w * (T.steps ? 0.88 : 1), top);
  }
  ctx.lineTo(T.x + T.w * (T.steps ? 0.88 : 1), top + (T.steps ? T.h * 0.08 : 0));
  ctx.lineTo(T.x + T.w * (T.steps ? 0.88 : 1), top + T.h * 0.18);
  ctx.lineTo(T.x + T.w, top + T.h * 0.18);
  ctx.lineTo(T.x + T.w, base);
  ctx.closePath();
}
function skyline(ctx: CanvasRenderingContext2D, t: number) {
  // island hill
  ctx.fillStyle = '#050405';
  ctx.beginPath();
  ctx.moveTo(90, ISLAND_Y);
  ctx.bezierCurveTo(180, ISLAND_Y - 40, 300, ISLAND_Y - 30, 540, ISLAND_Y - 34);
  ctx.bezierCurveTo(780, ISLAND_Y - 36, 900, ISLAND_Y - 42, 1000, ISLAND_Y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(246,242,234,0.55)';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(255,240,215,0.6)';
  ctx.shadowBlur = 8;
  ctx.stroke();
  for (const T of TOWERS) {
    towerPath(ctx, T);
    ctx.fillStyle = '#060507';
    ctx.fill();
    ctx.strokeStyle = 'rgba(246,242,234,0.5)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    if (T.spire) {
      const cx = T.x + T.w / 2;
      const top = ISLAND_Y - 18 - T.h;
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.lineTo(cx, top - T.spire);
      ctx.stroke();
      const blink = Math.sin(t * 3 + T.win) > 0.2 ? 1 : 0.25;
      ctx.fillStyle = `rgba(255,120,90,${blink})`;
      ctx.beginPath();
      ctx.arc(cx, top - T.spire, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.shadowBlur = 0;
  // windows twinkle
  for (const T of TOWERS) {
    const base = ISLAND_Y - 18;
    const cols = Math.max(2, Math.floor(T.w / 9));
    const rows = Math.floor((T.h * 0.8) / 11);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const id = T.win * 997 + r * 31 + c;
        if (rnd(id, 1) > 0.42) continue;
        const flick = rnd(id + Math.floor(t * 3 + rnd(id, 3) * 3), 2) > 0.12 ? 1 : 0.15;
        const gold = rnd(id, 4) > 0.55;
        ctx.fillStyle = gold ? `rgba(255,200,120,${0.85 * flick})` : `rgba(245,240,230,${0.75 * flick})`;
        ctx.fillRect(T.x + 4 + c * ((T.w - 8) / cols), base - 10 - r * 11, 2.6, 3.2);
      }
  }
  palms(ctx, t);
}
function palm(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, lean: number, t: number, s: number) {
  const top: V = [x + lean * h, y - h];
  ctx.strokeStyle = 'rgba(246,242,234,0.75)';
  ctx.lineWidth = 2.2 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * h * 0.2, y - h * 0.6, top[0], top[1]);
  ctx.stroke();
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.48 + Math.sin(t * 1.3 + k + x) * 0.05;
    const L = h * (0.42 + 0.08 * (k % 2));
    const end: V = [top[0] + Math.cos(a) * L, top[1] + Math.sin(a) * L * 0.6 + L * 0.35];
    const ctl: V = [top[0] + Math.cos(a) * L * 0.5, top[1] + Math.sin(a) * L * 0.7 - L * 0.05];
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    ctx.quadraticCurveTo(ctl[0], ctl[1], end[0], end[1]);
    ctx.stroke();
  }
}
function palms(ctx: CanvasRenderingContext2D, t: number) {
  ctx.shadowColor = 'rgba(255,240,215,0.5)';
  ctx.shadowBlur = 6;
  palm(ctx, 130, ISLAND_Y - 6, 95, -0.18, t, 1);
  palm(ctx, 185, ISLAND_Y - 18, 120, 0.12, t, 1);
  palm(ctx, 228, ISLAND_Y - 24, 80, -0.05, t, 0.9);
  palm(ctx, 880, ISLAND_Y - 26, 110, -0.1, t, 1);
  palm(ctx, 935, ISLAND_Y - 18, 85, 0.2, t, 0.9);
  ctx.shadowBlur = 0;
}

// ---------------------------------------------------------------- ocean
function ocean(ctx: CanvasRenderingContext2D, t: number) {
  const g = ctx.createLinearGradient(0, HORIZON, 0, H);
  g.addColorStop(0, '#120c06');
  g.addColorStop(0.25, '#060507');
  g.addColorStop(1, '#020203');
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON, W, H - HORIZON);
  // the sun's path on the water: shimmering gold dashes, wider toward the viewer
  const [sx] = SUN(t);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 120; i++) {
    const v = i / 120;
    const y = HORIZON + 6 + Math.pow(v, 1.6) * 760;
    const spread = 40 + v * 260;
    const ph = t * (1.2 + rnd(i, 1)) + i * 1.7;
    const x = sx + (rnd(i, 2) - 0.5) * spread * 2 + Math.sin(ph) * 12;
    const w = (12 + rnd(i, 3) * 40) * (0.6 + v);
    const a = (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(ph * 1.7))) * (1 - v * 0.55);
    ctx.fillStyle = `rgba(255,${190 + Math.floor(40 * rnd(i, 4))},110,${a})`;
    ctx.fillRect(x - w / 2, y, w, 1.6 + v * 2.4);
  }
  ctx.globalCompositeOperation = 'source-over';
  // gentle swell lines
  ctx.strokeStyle = 'rgba(246,242,234,0.12)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 26; i++) {
    const v = rnd(i, 5);
    const y = HORIZON + 30 + Math.pow(v, 1.3) * 640 + Math.sin(t * 1.4 + i) * 4;
    const x = ((rnd(i, 6) * W + t * (8 + 14 * v)) % (W + 200)) - 100;
    const w = 40 + v * 140;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w / 2, y - 3 - v * 4, x + w, y);
    ctx.stroke();
  }
  // reflected city lights
  for (let i = 0; i < 40; i++) {
    const T = TOWERS[i % TOWERS.length];
    const x = T.x + rnd(i, 7) * T.w;
    const y = HORIZON + 8 + rnd(i, 8) * 70;
    const a = 0.15 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2 + i));
    ctx.fillStyle = `rgba(255,215,160,${a})`;
    ctx.fillRect(x, y, 2, 6 + rnd(i, 9) * 10);
  }
}

// ---------------------------------------------------------------- the yacht and the figure (world metres)
type Cam = { cx: number; cy: number; z: number; roll: number };
function cam(t: number): Cam {
  return { cx: 0.35, cy: 0.62, z: lerp(285, 318, smooth(t / 5)), roll: 0.012 * Math.sin(t * 1.25) };
}
function toWorld(ctx: CanvasRenderingContext2D, c: Cam, bob: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(W / 2, 1450 + bob);
  ctx.rotate(c.roll);
  ctx.scale(c.z, -c.z);
  ctx.translate(-c.cx, -c.cy);
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
const seg = (ctx: CanvasRenderingContext2D, a: V, b: V) => {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
};
function yacht(ctx: CanvasRenderingContext2D) {
  // hull (stern, seen from the side) — dark fill with luminous outline and a gold stripe
  ctx.fillStyle = '#040405';
  ctx.beginPath();
  ctx.moveTo(-3.2, 0);
  ctx.lineTo(3.0, 0);
  ctx.quadraticCurveTo(3.25, -0.2, 3.05, -0.95);
  ctx.lineTo(-3.2, -0.95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,200,110,0.9)';
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.moveTo(-3.2, -0.32);
  ctx.lineTo(3.12, -0.32);
  ctx.stroke();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 0.035;
  // swim platform
  seg(ctx, [3.0, -0.62], [3.55, -0.62]);
  // stern rail
  ctx.lineWidth = 0.016;
  seg(ctx, [-3.2, 0.95], [2.95, 0.95]);
  seg(ctx, [-3.2, 0.5], [2.95, 0.5]);
  for (let x = -3.0; x <= 2.95; x += 0.75) seg(ctx, [x, 0], [x, 0.95]);
  // deck
  ctx.lineWidth = 0.03;
  seg(ctx, [-3.2, 0], [3.0, 0]);
  // small side table with a bottle in an ice bucket
  ctx.lineWidth = 0.022;
  seg(ctx, [1.5, 0], [1.5, 0.5]);
  seg(ctx, [1.25, 0.5], [1.75, 0.5]);
  ctx.beginPath();
  ctx.moveTo(1.38, 0.5);
  ctx.lineTo(1.42, 0.72);
  ctx.lineTo(1.62, 0.72);
  ctx.lineTo(1.66, 0.5);
  ctx.stroke();
  seg(ctx, [1.56, 0.6], [1.6, 0.98]);
  seg(ctx, [1.6, 0.98], [1.61, 1.06]);
}
function chair(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 0.035;
  // reclined deck chair: back, seat, leg rest, legs
  seg(ctx, [-0.62, 1.02], [-0.25, 0.4]);
  seg(ctx, [-0.25, 0.4], [0.45, 0.42]);
  seg(ctx, [0.45, 0.42], [1.02, 0.36]);
  seg(ctx, [-0.2, 0.4], [-0.25, 0]);
  seg(ctx, [0.95, 0.37], [0.98, 0]);
  seg(ctx, [-0.5, 0.82], [-0.38, 0]);
  // cushion (soft, wide, translucent)
  ctx.strokeStyle = 'rgba(246,242,234,0.25)';
  ctx.lineWidth = 0.09;
  ctx.beginPath();
  ctx.moveTo(-0.58, 0.98);
  ctx.lineTo(-0.22, 0.46);
  ctx.lineTo(0.45, 0.48);
  ctx.lineTo(1.0, 0.42);
  ctx.stroke();
}
/** the figure, reclined, raising his glass toward the city */
function figure(ctx: CanvasRenderingContext2D, t: number) {
  const raise = smooth(prog(t, 1.1, 2.7));
  const toast = Math.sin(Math.PI * prog(t, 2.7, 3.2)) * 0.06;
  const sway = 0.01 * Math.sin(t * 1.6);
  const pel: V = [-0.12, 0.6];
  const neck: V = lv([-0.42, 1.12], [-0.36, 1.15], raise);
  const up = mul(sub(neck, pel), 1 / len(sub(neck, pel)));
  const head = add(neck, add(mul(up, 0.17), [0.02 * raise, 0.01 * raise]));
  const sh = add(neck, mul(up, -0.06));
  const glassHand: V = lv([0.2, 0.66], [0.34 + toast, 1.42 + sway], raise);
  const restHand: V = [-0.05, 0.62];
  const feet: V[] = [
    [0.98, 0.5],
    [0.92, 0.6],
  ];
  ctx.strokeStyle = LINE;
  ctx.fillStyle = LINE;
  ctx.lineWidth = 0.07;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255,240,215,0.65)';
  ctx.shadowBlur = 14;
  for (const f of feet) {
    const k = ik(pel, f, 0.46, 0.46, [0.2, 1]);
    seg(ctx, pel, k);
    seg(ctx, k, f);
    seg(ctx, f, add(f, [0.04, 0.09]));
  }
  seg(ctx, pel, neck);
  const e1 = ik(sh, restHand, 0.31, 0.3, [-0.2, -1]);
  seg(ctx, sh, e1);
  seg(ctx, e1, restHand);
  const e2 = ik(sh, glassHand, 0.31, 0.3, [0.3, -1]);
  seg(ctx, sh, e2);
  seg(ctx, e2, glassHand);
  ctx.beginPath();
  ctx.arc(head[0], head[1], 0.12, 0, Math.PI * 2);
  ctx.fill();
  // champagne flute, held upright, a little gold inside
  const g0 = add(glassHand, [0.02, 0.02]);
  ctx.lineWidth = 0.018;
  ctx.shadowBlur = 10;
  seg(ctx, add(g0, [-0.04, 0]), add(g0, [0.04, 0]));
  seg(ctx, g0, add(g0, [0, 0.11]));
  ctx.beginPath();
  ctx.moveTo(g0[0] - 0.035, g0[1] + 0.26);
  ctx.lineTo(g0[0] - 0.02, g0[1] + 0.12);
  ctx.lineTo(g0[0] + 0.02, g0[1] + 0.12);
  ctx.lineTo(g0[0] + 0.035, g0[1] + 0.26);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,205,110,0.85)';
  ctx.beginPath();
  ctx.moveTo(g0[0] - 0.028, g0[1] + 0.21);
  ctx.lineTo(g0[0] - 0.02, g0[1] + 0.13);
  ctx.lineTo(g0[0] + 0.02, g0[1] + 0.13);
  ctx.lineTo(g0[0] + 0.028, g0[1] + 0.21);
  ctx.closePath();
  ctx.fill();
  // bubbles
  ctx.fillStyle = 'rgba(255,245,220,0.9)';
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.9 + rnd(i, 7)) % 1;
    ctx.fillRect(g0[0] - 0.012 + rnd(i, 8) * 0.024, g0[1] + 0.13 + ph * 0.08, 0.006, 0.006);
  }
  ctx.shadowBlur = 0;
  return add(g0, [0, 0.27]);
}

export function renderYacht(ctx: CanvasRenderingContext2D, f: number) {
  const t = f / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  // far layer with a very slow drift (parallax against the boat)
  ctx.save();
  const k = smooth(t / 5);
  ctx.translate(W / 2, HORIZON);
  ctx.scale(1 + 0.03 * k, 1 + 0.03 * k);
  ctx.translate(-W / 2 - 6 * k, -HORIZON);
  sky(ctx, t);
  sun(ctx, t);
  skyline(ctx, t);
  ocean(ctx, t);
  ctx.restore();
  // the boat rocks gently
  const c = cam(t);
  const bob = 7 * Math.sin(t * 1.25 + 0.6);
  toWorld(ctx, c, bob);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 0.04;
  ctx.shadowColor = 'rgba(255,240,215,0.55)';
  ctx.shadowBlur = 12;
  yacht(ctx);
  chair(ctx);
  ctx.shadowBlur = 0;
  const glassTop = figure(ctx, t);
  // warm light on the scene + the glint on the glass when he toasts
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  const [sx, sy] = SUN(t);
  const warm = ctx.createRadialGradient(sx, sy, 0, sx, sy, 1300);
  warm.addColorStop(0, 'rgba(255,170,80,0.10)');
  warm.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);
  const tw = sstep(t, 2.75, 2.95) * (1 - sstep(t, 3.2, 3.9));
  if (tw > 0.01) {
    const p = toScreenW(c, bob, glassTop);
    const r = 46 + 60 * tw;
    const rg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
    rg.addColorStop(0, `rgba(255,236,190,${0.9 * tw})`);
    rg.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
    ctx.strokeStyle = `rgba(255,245,220,${0.85 * tw})`;
    ctx.lineWidth = 2;
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [0.7, 0.7],
      [0.7, -0.7],
    ]) {
      const L = (dx && dy ? 26 : 50) * tw;
      ctx.beginPath();
      ctx.moveTo(p[0] - dx * L, p[1] - dy * L);
      ctx.lineTo(p[0] + dx * L, p[1] + dy * L);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  // fade in from the previous scene's black, fade out at the very end
  const fade = Math.max(1 - clamp(t / 0.45), clamp((t - 4.6) / 0.4));
  if (fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, W, H);
  }
}
function toScreenW(c: Cam, bob: number, p: V): V {
  const x = (p[0] - c.cx) * c.z;
  const y = -(p[1] - c.cy) * c.z;
  const cs = Math.cos(c.roll);
  const sn = Math.sin(c.roll);
  return [W / 2 + x * cs - y * sn, 1450 + bob + x * sn + y * cs];
}
