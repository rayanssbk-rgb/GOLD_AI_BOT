// World: math helpers, the mountain, sky, far ranges, clouds, lightning, sun, fog, rain, particles.
import { W, H, BOLTS, clamp, lerp, smooth, sstep } from './timeline.js';

export type V = [number, number];
export type RGB = [number, number, number];
export type Cam = { cx: number; cy: number; z: number; roll: number; sx: number; sy: number };
export type Light = { fl: number; dn: number; st: number; t: number; f: number };

export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
export const len = (a: V) => Math.hypot(a[0], a[1]);
export const lv = (a: V, b: V, k: number): V => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
export const norm = (a: V): V => mul(a, 1 / (len(a) || 1));
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};
export const rnd = (i: number, j = 0) => hash(i * 12.9898 + j * 78.233 + 0.5);
export function vnoise(x: number, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 131.7), hash(i + 1 + seed * 131.7), u) * 2 - 1;
}
export function fbm(x: number, seed: number, oct = 4) {
  let a = 0;
  let amp = 0.5;
  let fr = 1;
  for (let o = 0; o < oct; o++) {
    a += amp * vnoise(x * fr, seed + o * 7);
    fr *= 2.07;
    amp *= 0.5;
  }
  return a;
}
export const hex = (s: string): RGB => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
export const mixc = (a: RGB, b: RGB, k: number): RGB => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
/** storm colour -> lightning flash colour -> dawn colour */
export const tri = (s: string, f: string, d: string, L: Light): RGB => mixc(mixc(hex(s), hex(f), L.fl), hex(d), L.dn);

// ---------------------------------------------------------------- the mountain
/** x of the climbing face (abyss on the right, rock on the left) at height y (m). Summit plateau at y = 100. */
export function face(y: number) {
  let x = 0.06 * (100 - y) + 0.42 * fbm(y * 0.45, 3) + 0.1 * fbm(y * 2.2, 9, 2);
  x += 0.5 * smooth((y - 97) / 3); // overhanging lip
  if (y < 40) x += (40 - y) * 0.35;
  return x;
}
export const LIPX = face(100);

let ROCK: V[] | null = null;
function rockPoly() {
  if (ROCK) return ROCK;
  const p: V[] = [];
  for (let x = -4.4; x < LIPX; x += 0.1) p.push([x, 100]);
  for (let y = 100; y > 80; y -= 0.04) p.push([face(y), y]);
  for (let y = 80; y > 40; y -= 0.2) p.push([face(y), y]);
  for (let y = 40; y >= -700; y -= 2) p.push([face(y) + 6 * fbm(y * 0.03, 5), y]);
  p.push([-2600, -700]);
  for (let y = -700; y <= 100; y += 2) p.push([-9.5 - (101.5 - y) * (y > 30 ? 0.45 : 0.45 + (30 - y) * 0.004) - 18 * Math.abs(fbm(y * 0.03, 13)) * smooth((100 - y) / 25) - 4 * fbm(y * 0.2, 17) * smooth((100 - y) / 10), y]);
  p.push([-9, 101.5], [-7.6, 101.25], [-6.3, 100.9], [-5.2, 100.45], [-4.6, 100.15]);
  ROCK = p;
  return p;
}
type Crack = { pts: V[]; w: number; light: boolean; big: boolean };
let CRACKS: Crack[] | null = null;
function cracks() {
  if (CRACKS) return CRACKS;
  const out: Crack[] = [];
  const mk = (i: number, y0: number, L: number, big: boolean) => {
    const pts: V[] = [[face(y0) - 0.005, y0]];
    let ang = Math.PI + (rnd(i, 3) - 0.5) * 0.7 - 0.12;
    const n = 6;
    for (let k = 0; k < n; k++) {
      ang += (rnd(i, 10 + k) - 0.5) * 0.6;
      const q = pts[pts.length - 1];
      pts.push([q[0] + Math.cos(ang) * (L / n), q[1] + Math.sin(ang) * (L / n)]);
    }
    out.push({ pts, w: big ? 2.2 : 1.4, light: rnd(i, 4) > 0.55, big });
  };
  for (let i = 0; i < 260; i++) mk(i, 76 + rnd(i, 1) * 23.8, 0.15 + Math.pow(rnd(i, 2), 2) * 2.4, false);
  for (let i = 0; i < 90; i++) mk(1000 + i, -180 + rnd(i, 5) * 260, 4 + rnd(i, 6) * 36, true);
  CRACKS = out;
  return out;
}

export function applyCam(ctx: CanvasRenderingContext2D, c: Cam) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(W / 2 + c.sx, H / 2 + c.sy);
  ctx.rotate(c.roll);
  ctx.scale(c.z, -c.z);
  ctx.translate(-c.cx, -c.cy);
}
/** world -> screen for a layer Δ metres behind the subject plane (dolly model, F = 1500) */
const F = 1500;
export function layerZ(c: Cam, d: number) {
  return c.z / (1 + (c.z * d) / F);
}
export function proj(c: Cam, d: number, X: number, Y: number): V {
  const zl = layerZ(c, d);
  const x = (X - c.cx) * zl;
  const y = -(Y - c.cy) * zl;
  const cs = Math.cos(c.roll);
  const sn = Math.sin(c.roll);
  return [W / 2 + c.sx + x * cs - y * sn, H / 2 + c.sy + x * sn + y * cs];
}

export function drawRock(ctx: CanvasRenderingContext2D, c: Cam, L: Light) {
  const P = rockPoly();
  applyCam(ctx, c);
  ctx.beginPath();
  ctx.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
  ctx.closePath();
  ctx.fillStyle = css(tri('#0b0d11', '#2b3240', '#2a2026', L));
  ctx.fill();
  ctx.save();
  ctx.clip();
  // rounded, wet edge of the face: soft inner sheen bands
  const facePath = () => {
    ctx.beginPath();
    ctx.moveTo(LIPX, 100);
    for (let y = 100; y > -300; y -= y > 80 ? 0.05 : 1) ctx.lineTo(face(y), y);
  };
  const sheen = tri('#1d232c', '#5a6680', '#a8703f', L);
  ctx.lineJoin = 'round';
  facePath();
  ctx.strokeStyle = css(sheen, 0.22 + 0.25 * L.dn);
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.strokeStyle = css(sheen, 0.35 + 0.3 * L.dn);
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.strokeStyle = css(sheen, 0.5 + 0.3 * L.dn);
  ctx.lineWidth = 0.22;
  ctx.stroke();
  // plateau top catches the sky / sun
  ctx.beginPath();
  ctx.moveTo(-12, 100);
  ctx.lineTo(LIPX, 100);
  ctx.strokeStyle = css(tri('#2b3340', '#6b7792', '#c48a52', L), 0.6);
  ctx.lineWidth = 0.18;
  ctx.stroke();
  // strata and cracks
  const cr = cracks();
  const px = 1 / c.z;
  for (const k of cr) {
    if (!k.big && c.z < 30) continue;
    ctx.beginPath();
    ctx.moveTo(k.pts[0][0], k.pts[0][1]);
    for (let i = 1; i < k.pts.length; i++) ctx.lineTo(k.pts[i][0], k.pts[i][1]);
    ctx.lineWidth = Math.max(k.w * px, k.big ? 0.06 : 0.004);
    ctx.strokeStyle = k.light ? css(tri('#232a34', '#606c85', '#7a5236', L), 0.35) : 'rgba(0,0,0,0.35)';
    ctx.stroke();
  }
  ctx.restore();
  // crisp rim light along the edge
  ctx.beginPath();
  ctx.moveTo(-6, 100);
  ctx.lineTo(LIPX, 100);
  for (let y = 100; y > -300; y -= y > 80 ? 0.05 : 1) ctx.lineTo(face(y), y);
  ctx.strokeStyle = css(tri('#4a5568', '#b4c2de', '#ffd08a', L), 0.55 + 0.35 * L.dn);
  ctx.lineWidth = Math.max(2.2 * px, 0.004);
  ctx.stroke();
}

// ---------------------------------------------------------------- sky + far layers
export function horizonY(c: Cam) {
  return proj(c, 20000, 0, 0)[1];
}
export function drawSky(ctx: CanvasRenderingContext2D, c: Cam, L: Light) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const hy = horizonY(c);
  const g = ctx.createLinearGradient(0, hy - 1300, 0, hy + 500);
  g.addColorStop(0, css(tri('#080b11', '#26304a', '#14264a', L)));
  g.addColorStop(0.45, css(tri('#18202d', '#4b5675', '#5c5a86', L)));
  g.addColorStop(0.68, css(tri('#2a3444', '#76839f', '#e08f63', L)));
  g.addColorStop(0.73, css(tri('#323d4e', '#8a97b3', '#ffcf86', L)));
  g.addColorStop(1, css(tri('#202836', '#4d5770', '#d99a6c', L)));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

const RANGES = [
  { d: 14000, amp: 210, base: -60, seed: 3, col: ['#121823', '#5d6984', '#b494a6'] },
  { d: 7000, amp: 290, base: -40, seed: 5, col: ['#0f141d', '#4c5770', '#7f6c93'] },
  { d: 3200, amp: 330, base: -20, seed: 8, col: ['#0c1018', '#3d4760', '#544774'] },
];
export function drawRanges(ctx: CanvasRenderingContext2D, c: Cam, L: Light) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const r of RANGES) {
    const z0 = F / r.d;
    ctx.beginPath();
    let first = true;
    for (let sx = -300; sx <= W + 300; sx += 6) {
      // invert screen x to world X on this layer, then ridge height in "reference pixels"
      const zl = layerZ(c, r.d);
      const X = c.cx + (sx - W / 2) / zl;
      const u = X * z0;
      const hpx = r.amp * (0.55 + 0.45 * fbm(u / 260, r.seed, 5)) + 60 * Math.abs(fbm(u / 70, r.seed + 3, 3));
      const Y = (hpx + r.base) / z0;
      const p = proj(c, r.d, X, Y);
      if (first) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
      first = false;
    }
    ctx.lineTo(W + 300, H + 300);
    ctx.lineTo(-300, H + 300);
    ctx.closePath();
    ctx.fillStyle = css(tri(r.col[0], r.col[1], r.col[2], L), 1);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- clouds (pre-rendered sprites)
const SPR: Record<string, HTMLCanvasElement[]> = {};
function sprites(kind: 'storm' | 'lit' | 'dawnLow' | 'dawnHigh' | 'mist') {
  if (SPR[kind]) return SPR[kind];
  const pal: Record<string, [string, string]> = {
    storm: ['#3a4250', '#11151c'],
    lit: ['#cad4e8', '#5c6680'],
    dawnLow: ['#ffe2ae', '#a8697a'],
    dawnHigh: ['#7f6b93', '#ffb26c'],
    mist: ['#ffffff', '#ffffff'],
  };
  SPR[kind] = [0, 1, 2, 3].map((v) => {
    const cv = document.createElement('canvas');
    cv.width = 640;
    cv.height = 320;
    const g = cv.getContext('2d')!;
    for (let i = 0; i < 18; i++) {
      const x = 320 + (rnd(v * 50 + i, 1) - 0.5) * 380;
      const y = 175 + (rnd(v * 50 + i, 2) - 0.5) * 110 - Math.max(0, 140 - Math.abs(x - 320)) * 0.35;
      const r = 55 + rnd(v * 50 + i, 3) * 85;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(255,255,255,0.9)');
      rg.addColorStop(0.55, 'rgba(255,255,255,0.55)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalCompositeOperation = 'source-in';
    const lg = g.createLinearGradient(0, 40, 0, 300);
    lg.addColorStop(0, pal[kind][0]);
    lg.addColorStop(1, pal[kind][1]);
    g.fillStyle = lg;
    g.fillRect(0, 0, 640, 320);
    return cv;
  });
  return SPR[kind];
}
type Cloud = { X: number; Y: number; s: number; v: number; d: number; a: number; drift: number };
const mkClouds = (n: number, seed: number, f: (i: number) => Cloud) => Array.from({ length: n }, (_, i) => f(i + seed * 1000));
const DECK = mkClouds(54, 1, (i) => ({ X: -1100 + rnd(i, 1) * 2200, Y: 140 + Math.pow(rnd(i, 2), 0.8) * 520, s: 160 + rnd(i, 3) * 320, v: i % 4, d: 600, a: 0.95, drift: -4 - rnd(i, 4) * 4 }));
const SCUD = mkClouds(22, 2, (i) => ({ X: -180 + rnd(i, 1) * 360, Y: 92 + rnd(i, 2) * 70, s: 25 + rnd(i, 3) * 55, v: i % 4, d: 140, a: 0.75, drift: -7 - rnd(i, 4) * 6 }));
const HIGH = mkClouds(26, 3, (i) => ({ X: -2600 + rnd(i, 1) * 5200, Y: 180 + rnd(i, 2) * 650, s: 350 + rnd(i, 3) * 600, v: i % 4, d: 2000, a: 0.85, drift: -2 }));
const SEA = mkClouds(46, 4, (i) => ({ X: -420 + rnd(i, 1) * 840, Y: 70 + rnd(i, 2) * 20, s: 30 + rnd(i, 3) * 90, v: i % 4, d: 220, a: 0.95, drift: -1.2 }));
const MIST = mkClouds(16, 5, (i) => ({ X: -25 + rnd(i, 1) * 60, Y: 62 + rnd(i, 2) * 42, s: 7 + rnd(i, 3) * 16, v: i % 4, d: 0, a: 0.12 + rnd(i, 4) * 0.1, drift: -1.6 - rnd(i, 5) }));

function drawCloudSet(ctx: CanvasRenderingContext2D, c: Cam, L: Light, set: Cloud[], kind: Parameters<typeof sprites>[0], alpha: number, part = 0, wrap = 0) {
  if (alpha <= 0.003) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sp = sprites(kind);
  for (const k of set) {
    const zl = layerZ(c, k.d);
    let X = k.X + k.drift * L.t + Math.sign(k.X || 1) * part * (300 + Math.abs(k.X) * 0.8);
    if (wrap) X = ((((X + wrap) % (2 * wrap)) + 2 * wrap) % (2 * wrap)) - wrap;
    const p = proj(c, k.d, X, k.Y);
    const w = k.s * zl;
    if (p[0] + w < -50 || p[0] - w > W + 50 || p[1] + w * 0.5 < -50 || p[1] - w * 0.5 > H + 50) continue;
    ctx.globalAlpha = clamp(alpha * k.a);
    ctx.drawImage(sp[k.v], p[0] - w, p[1] - w * 0.5, w * 2, w);
  }
  ctx.globalAlpha = 1;
}
export function drawClouds(ctx: CanvasRenderingContext2D, c: Cam, L: Light) {
  const storm = 1 - L.dn;
  const part = L.dn;
  drawCloudSet(ctx, c, L, HIGH, 'dawnHigh', L.dn * 0.9);
  drawCloudSet(ctx, c, L, DECK, 'storm', storm, part);
  if (L.fl > 0.02) drawCloudSet(ctx, c, L, DECK, 'lit', L.fl * 0.8 * storm, part);
  drawCloudSet(ctx, c, L, SCUD, 'storm', storm * 0.9, part, 0);
  if (L.fl > 0.02) drawCloudSet(ctx, c, L, SCUD, 'lit', L.fl * 0.6 * storm, part);
}
export function drawSea(ctx: CanvasRenderingContext2D, c: Cam, L: Light) {
  drawCloudSet(ctx, c, L, SEA, 'dawnLow', L.dn);
}
export function drawMist(ctx: CanvasRenderingContext2D, c: Cam, L: Light) {
  if (c.z > 400) return;
  drawCloudSet(ctx, c, L, MIST, 'mist', (0.5 + 0.5 * L.fl) * (1 - L.dn) * 0.5, 0, 40);
}

/** abyss fog (storm) / golden cloud sea (dawn), world space, over the lower mountain */
export function drawFog(ctx: CanvasRenderingContext2D, c: Cam, L: Light) {
  applyCam(ctx, c);
  const top = lerp(60, 92, L.dn);
  const bot = lerp(-30, 80, L.dn);
  const g = ctx.createLinearGradient(0, top, 0, bot);
  const col = tri('#263042', '#6a7896', '#f2b98a', L);
  g.addColorStop(0, css(col, 0));
  g.addColorStop(0.5, css(col, 0.55));
  g.addColorStop(1, css(col, lerp(0.93, 1, L.dn)));
  ctx.fillStyle = g;
  ctx.fillRect(-5000, -800, 10000, top + 800);
}

// ---------------------------------------------------------------- lightning
function boltPath(seed: number, x0: number, y0: number, x1: number, y1: number, depth: number, out: V[][]) {
  let pts: V[] = [
    [x0, y0],
    [x1, y1],
  ];
  let disp = Math.abs(y1 - y0) * 0.22;
  for (let it = 0; it < depth; it++) {
    const np: V[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const m: V = [(a[0] + b[0]) / 2 + (rnd(seed, it * 97 + i) - 0.5) * disp, (a[1] + b[1]) / 2 + (rnd(seed + 5, it * 31 + i) - 0.5) * disp * 0.3];
      np.push(m, b);
    }
    pts = np;
    disp *= 0.55;
  }
  out.push(pts);
  return pts;
}
export function drawBolts(ctx: CanvasRenderingContext2D, c: Cam, L: Light) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const hy = horizonY(c);
  for (const [bt, st, bx, seed] of BOLTS) {
    const d = L.t - bt;
    if (d < 0 || d > 0.3) continue;
    const vis = d < 0.05 ? 1 : d < 0.1 ? 0.2 : d < 0.17 ? 0.9 : d < 0.3 ? 0.35 * (1 - (d - 0.17) / 0.13) : 0;
    if (vis <= 0) continue;
    const paths: V[][] = [];
    const x0 = bx * W + (rnd(seed, 1) - 0.5) * 200;
    const main = boltPath(seed, x0, -60, x0 + (rnd(seed, 2) - 0.5) * 420, hy + 80 + rnd(seed, 3) * 260, 7, paths);
    for (let b = 0; b < 3; b++) {
      const k = 20 + Math.floor(rnd(seed, 10 + b) * 60);
      const s = main[Math.min(k, main.length - 1)];
      boltPath(seed * 7 + b, s[0], s[1], s[0] + (rnd(seed, 20 + b) - 0.5) * 500, s[1] + 150 + rnd(seed, 30 + b) * 300, 5, paths);
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    paths.forEach((p, pi) => {
      const w = pi === 0 ? 1 : 0.5;
      for (const [lw, a] of [
        [34, 0.05],
        [14, 0.12],
        [6, 0.35],
        [2.2, 1],
      ]) {
        ctx.beginPath();
        ctx.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
        ctx.strokeStyle = `rgba(220,230,255,${a * vis * st * w})`;
        ctx.lineWidth = lw * w;
        ctx.stroke();
      }
    });
    // glow in the clouds where the bolt starts
    const rg = ctx.createRadialGradient(x0, 120, 0, x0, 120, 700);
    rg.addColorStop(0, `rgba(170,190,240,${0.45 * vis * st})`);
    rg.addColorStop(1, 'rgba(170,190,240,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ---------------------------------------------------------------- dawn sun
export function sunPos(c: Cam, t: number): V {
  return proj(c, 20000, 2900, lerp(-1500, 1700, sstep(t, 33.2, 43)));
}
export function drawSun(ctx: CanvasRenderingContext2D, c: Cam, L: Light) {
  if (L.dn <= 0.01) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const [x, y] = sunPos(c, L.t);
  ctx.globalCompositeOperation = 'lighter';
  const halo = (r: number, col: string, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a * L.dn})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  halo(1400, '255,170,90', 0.35);
  halo(520, '255,205,130', 0.55);
  halo(170, '255,235,190', 0.8);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(255,248,226,${L.dn})`;
  ctx.beginPath();
  ctx.arc(x, y, 46, 0, Math.PI * 2);
  ctx.fill();
}
/** god rays + warm haze over the whole frame */
export function drawRays(ctx: CanvasRenderingContext2D, c: Cam, L: Light) {
  if (L.dn <= 0.01) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const [x, y] = sunPos(c, L.t);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * Math.PI * 2 + L.t * 0.012 + rnd(i, 1) * 0.3;
    const wdt = 0.03 + rnd(i, 2) * 0.05;
    const g = ctx.createRadialGradient(x, y, 30, x, y, 2300);
    const al = (0.05 + rnd(i, 3) * 0.06) * L.dn;
    g.addColorStop(0, `rgba(255,210,140,${al})`);
    g.addColorStop(1, 'rgba(255,210,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, 2300, a0, a0 + wdt);
    ctx.closePath();
    ctx.fill();
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, 1500);
  g.addColorStop(0, `rgba(255,190,110,${0.28 * L.dn})`);
  g.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- rain + splashes
const RAIN = [
  { n: 460, len: 30, w: 1.1, a: 0.2, sp: 50, k: 0.08 },
  { n: 280, len: 58, w: 1.7, a: 0.28, sp: 70, k: 0.16 },
  { n: 80, len: 120, w: 3.2, a: 0.22, sp: 110, k: 0.3 },
];
export function drawRain(ctx: CanvasRenderingContext2D, c: Cam, L: Light) {
  if (L.st <= 0.01) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const slant = -0.3;
  ctx.lineCap = 'round';
  RAIN.forEach((r, li) => {
    ctx.beginPath();
    const n = Math.round(r.n * L.st);
    const oy = c.cy * c.z * r.k;
    const ox = c.cx * c.z * r.k;
    for (let i = 0; i < n; i++) {
      const sp = r.sp * (0.8 + 0.4 * rnd(i, li * 3 + 1));
      const y = ((((rnd(i, li * 3 + 2) * (H + 200) + L.f * sp + oy) % (H + 200)) + H + 200) % (H + 200)) - 150;
      const x = ((((rnd(i, li * 3 + 3) * (W + 600) + y * slant + ox) % (W + 600)) + W + 600) % (W + 600)) - 300;
      ctx.moveTo(x, y);
      ctx.lineTo(x + r.len * slant, y + r.len);
    }
    ctx.strokeStyle = `rgba(185,198,220,${r.a * (1 + 1.6 * L.fl)})`;
    ctx.lineWidth = r.w;
    ctx.stroke();
  });
}
/** tiny splashes on the rock face (and on given points) in close shots */
export function drawSplashes(ctx: CanvasRenderingContext2D, c: Cam, L: Light, extra: V[] = []) {
  if (c.z < 150 || L.st < 0.2) return;
  applyCam(ctx, c);
  const hh = H / 2 / c.z;
  ctx.beginPath();
  const n = Math.round(46 * L.st);
  for (let i = 0; i < n; i++) {
    const age = (L.f + i) % 4;
    const id = Math.floor((L.f + i) / 4) * 101 + i;
    let p: V;
    if (extra.length && i % 3 === 0) {
      const e = extra[i % extra.length];
      p = [e[0] + (rnd(id, 1) - 0.5) * 0.08, e[1] + (rnd(id, 2) - 0.2) * 0.06];
    } else {
      const y = c.cy + (rnd(id, 3) - 0.5) * 2 * hh;
      p = [face(y) + 0.004, y];
    }
    const s = (0.01 + rnd(id, 4) * 0.018) * (0.5 + age * 0.35);
    for (let k = 0; k < 3; k++) {
      const a = Math.PI * (0.15 + 0.35 * k) + (rnd(id, 5 + k) - 0.5) * 0.4;
      ctx.moveTo(p[0] + Math.cos(a) * s * 0.4, p[1] + Math.sin(a) * s * 0.4);
      ctx.lineTo(p[0] + Math.cos(a) * s, p[1] + Math.sin(a) * s);
    }
  }
  ctx.strokeStyle = `rgba(200,212,232,${0.45 * L.st})`;
  ctx.lineWidth = 1.6 / c.z;
  ctx.stroke();
}

// ---------------------------------------------------------------- screen overlays
export function drawFlashOverlay(ctx: CanvasRenderingContext2D, L: Light) {
  if (L.fl <= 0.01) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = `rgba(150,168,205,${0.16 * L.fl})`;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- distant spires (give the mountain a range around it)
const SPIRES = [
  { d: 120, X: -75, base: -60, h: 150, w: 26, seed: 1 },
  { d: 200, X: 75, base: -60, h: 125, w: 30, seed: 4 },
  { d: 280, X: 150, base: -90, h: 205, w: 44, seed: 2 },
  { d: 420, X: -190, base: -110, h: 250, w: 60, seed: 3 },
  { d: 650, X: 320, base: -140, h: 260, w: 80, seed: 5 },
];
export function drawSpires(ctx: CanvasRenderingContext2D, c: Cam, L: Light) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const s of [...SPIRES].sort((a, b) => b.d - a.d)) {
    const pts: V[] = [];
    const n = 60;
    for (let i = 0; i <= n; i++) {
      const u = i / n; // 0 left foot -> 0.5 tip -> 1 right foot
      const side = u < 0.5 ? u / 0.5 : (1 - u) / 0.5;
      const Y = s.base + s.h * Math.pow(side, 1.6) + s.h * 0.06 * fbm(u * 9, s.seed * 7) * side;
      const X = s.X + (u - 0.5) * 2 * s.w * (1.8 - side * 0.8) + s.w * 0.25 * fbm(u * 5, s.seed);
      pts.push(proj(c, s.d, X, Y));
    }
    const depth = Math.min(1, s.d / 700);
    const col = mixc(tri('#0d1118', '#3a445a', '#3b2a33', L), tri('#283242', '#6d7a96', '#b58a86', L), depth * 0.75);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fillStyle = css(col);
    ctx.fill();
    if (L.dn > 0.02) {
      ctx.beginPath();
      pts.slice(n / 2).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.strokeStyle = `rgba(255,205,130,${0.6 * L.dn * (1 - depth * 0.5)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
