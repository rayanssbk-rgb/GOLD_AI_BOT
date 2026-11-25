// "Les marches" — 2D take on the three-forces staircase concept (31 s, 1080x1920, 30 fps).
// DISCIPLINE climbs steadily on the front staircase; OBSESSION, wounded, climbs the back one with
// SHADOW right behind her. She falls, bleeds, wants to stop — and refuses. Flat 2D, oblique projection.
export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const DUR = 31;
export const DURATION = DUR * FPS;

type V = [number, number];
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const sm = (x: number) => { const k = clamp(x); return k * k * (3 - 2 * k); };
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
const len = (a: V) => Math.hypot(a[0], a[1]);
const lv = (a: V, b: V, k: number): V => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const rnd = (i: number, j = 0) => { const s = Math.sin(i * 12.9898 + j * 78.233 + 0.5) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------- stairs (meters)
const R = 0.26; // rise
const D = 0.4; // run
const TOP = 30; // last step, then a landing
const DEPTH = 1.1; // staircase width (into the screen)
const OBX = 0.32; // oblique projection of depth
const OBY = 0.22;
const BACK = { x: -2.5, z: 1.9 }; // back staircase offset
const tread = (k: number) => clamp(k, 0, TOP) * R;
function footPos(k: number): V {
  if (k <= 0) return [0.5 * D + k * 0.55, 0];
  if (k <= TOP) return [k * D + 0.5 * D, k * R];
  return [TOP * D + 0.5 * D + (k - TOP) * 0.55, TOP * R];
}

// ---------------------------------------------------------------- story timing (progress in steps)
function track(keys: [number, number][], t: number) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, s1] = keys[i];
    const [t0, s0] = keys[i - 1];
    if (t <= t1) return lerp(s0, s1, (t - t0) / (t1 - t0));
  }
  return keys[keys.length - 1][1];
}
const DISC: [number, number][] = [[2.6, 0], [27.2, 31.5], [31, 33.6]];
const OBS: [number, number][] = [[2.6, 0], [6, 5.5], [9.2, 10.2], [10.2, 11.0], [15.8, 11.0], [16.8, 11.8], [21, 19.5], [26.6, 31.5], [31, 33.8]];
const SHAD: [number, number][] = [[2.6, -5], [9.5, 3.5], [14.6, 9.3], [16.2, 9.6], [31, 9.6]];
const B = { fall: 10.2, kneel: 10.6, look: 13.0, rise: 15.0, go: 15.8, shadowFade: 17.0, top: 26.6 };
const sDisc = (t: number) => track(DISC, t);
const sObs = (t: number) => track(OBS, t);
const sShad = (t: number) => track(SHAD, t);

// ---------------------------------------------------------------- figure rig
type Pose = { pel: V; neck: V; hands: [V, V]; feet: [V, V] };
function walkPose(s: number, style: 'disc' | 'obs' | 'shadow', t: number): Pose {
  const n = Math.floor(s);
  const f = s - n;
  const e = sm(f);
  const planted = footPos(n);
  const swing0 = footPos(n - 1);
  const swing1 = footPos(n + 1);
  const lift = 0.2 * Math.sin(Math.PI * f);
  const swing = add(lv(swing0, swing1, e), [0, lift]);
  const feet: [V, V] = n % 2 === 0 ? [planted, swing] : [swing, planted];
  const base = lv(planted, footPos(n + 1), e);
  const bob = 0.025 * Math.cos(2 * Math.PI * f);
  const pel: V = add(base, [-0.12, 0.84 + bob]);
  const lean = style === 'obs' ? 0.2 : style === 'shadow' ? 0.14 : 0.07;
  const neck: V = add(pel, [lean, 0.56]);
  const sh = add(neck, [0, -0.05]);
  const ph = Math.PI * (s % 2);
  const swingA = 0.2 * Math.sin(ph);
  let hands: [V, V] = [add(sh, [swingA, -0.52]), add(sh, [-swingA, -0.52])];
  if (style === 'obs') hands = [add(pel, [0.16, 0.24]), add(sh, [-swingA * 0.6, -0.5])]; // one hand pressed on the wound
  if (style === 'shadow') hands = [add(sh, [0.26 + 0.05 * Math.sin(t * 2), -0.32]), add(sh, [-swingA * 0.5, -0.5])]; // reaching
  return { pel, neck, hands, feet };
}
function kneelPose(n: number, t: number): Pose {
  const k = footPos(n);
  const k1 = footPos(n + 1);
  const breathe = 0.02 * Math.sin(t * 5);
  const pel: V = add(k, [-0.05, 0.5 + breathe]);
  const neck: V = add(pel, [0.3, 0.38 + breathe]);
  return { pel, neck, hands: [add(pel, [0.18, 0.18]), add(k1, [0.02, 0.02])], feet: [add(k, [-0.28, 0]), add(k1, [-0.05, 0])] };
}
function mixP(a: Pose, b: Pose, k: number): Pose {
  return {
    pel: lv(a.pel, b.pel, k),
    neck: lv(a.neck, b.neck, k),
    hands: [lv(a.hands[0], b.hands[0], k), lv(a.hands[1], b.hands[1], k)],
    feet: [lv(a.feet[0], b.feet[0], k), lv(a.feet[1], b.feet[1], k)],
  };
}
function obsPose(t: number): Pose {
  const s = sObs(t);
  const walk = walkPose(s, 'obs', t);
  if (t < B.fall || t > B.go + 0.6) return walk;
  const kn = kneelPose(11, t);
  if (t < B.kneel) return mixP(walk, kn, sm(prog(t, B.fall, B.kneel)));
  if (t < B.rise) {
    // looks back at the shadow
    const look = sm(prog(t, B.look, B.look + 0.4)) * (1 - sm(prog(t, B.rise - 0.4, B.rise)));
    return { ...kn, neck: add(kn.neck, [-0.22 * look, 0.08 * look]) };
  }
  return mixP(kn, walk, sm(prog(t, B.rise, B.go + 0.6)));
}
function ik(root: V, tgt: V, l1: number, l2: number, pref: V): V {
  const d = sub(tgt, root);
  const L = Math.min(len(d), l1 + l2 - 1e-4);
  const u = mul(d, 1 / (len(d) || 1));
  const a = (l1 * l1 - l2 * l2 + L * L) / (2 * L);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let nrm: V = [-u[1], u[0]];
  if (nrm[0] * pref[0] + nrm[1] * pref[1] < 0) nrm = mul(nrm, -1);
  return add(add(root, mul(u, a)), mul(nrm, h));
}

// ---------------------------------------------------------------- camera / projection
type Cam = { x: number; y: number; s: number };
function proj(c: Cam, p: V, z: number): V {
  const x = p[0] + OBX * z;
  const y = p[1] + OBY * z;
  return [W / 2 + (x - c.x) * c.s, H * 0.56 - (y - c.y) * c.s];
}
function camera(t: number): Cam {
  const d = footPos(sDisc(t));
  const o = footPos(sObs(t));
  const cx = (d[0] + OBX * 0.55 + o[0] + BACK.x + OBX * (BACK.z + 0.55)) / 2;
  const cy = (d[1] + OBY * 0.55 + o[1] + OBY * (BACK.z + 0.55)) / 2 + 0.6;
  const wide = 1 - sm(prog(t, 2.2, 5));
  const close = sm(prog(t, 10.4, 11.4)) * (1 - sm(prog(t, 15.6, 17)));
  const end = sm(prog(t, 26.6, 30));
  let s = lerp(240, 150, wide);
  s = lerp(s, 330, close);
  s = lerp(s, 200, end);
  // during the fall, frame Obsession and the Shadow
  const ox = o[0] + BACK.x + OBX * (BACK.z + 0.55) - 0.4;
  const oy = o[1] + OBY * (BACK.z + 0.55) + 0.7;
  return { x: lerp(cx, ox, close) + 0.04 * Math.sin(t * 0.7), y: lerp(cy, oy, close) + 0.03 * Math.sin(t * 0.9), s };
}

// ---------------------------------------------------------------- drawing
const CREAM = '#f6f2ea';
const RED = '#ff4b3e';
function background(g: CanvasRenderingContext2D, t: number, c: Cam) {
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#08080b');
  bg.addColorStop(0.6, '#121217');
  bg.addColorStop(1, '#0a0a0d');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // faint wall panels with parallax
  g.strokeStyle = 'rgba(255,255,255,.035)';
  g.lineWidth = 2;
  for (let i = -10; i < 30; i++) {
    const x = W / 2 + (i * 2.2 - c.x * 0.35) * c.s * 0.6;
    if (x < -10 || x > W + 10) continue;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
  }
  // floor glow at the top landing (the light they climb toward)
  const top = proj(c, footPos(TOP + 2), 1.5);
  const k = 0.5 + 0.5 * sm(prog(t, 20, 27));
  const rg = g.createRadialGradient(top[0], top[1] - 200, 0, top[0], top[1] - 200, 900);
  rg.addColorStop(0, `rgba(255,232,190,${0.5 * k})`);
  rg.addColorStop(0.4, `rgba(255,214,150,${0.12 * k})`);
  rg.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, W, H);
}

function staircase(g: CanvasRenderingContext2D, c: Cam, ox: number, z0: number, lit: number, dim: number, numbers: boolean, t: number) {
  const P = (x: number, y: number, z: number) => proj(c, [x + ox, y], z0 + z);
  const poly = (pts: V[], fill: string | CanvasGradient) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  const shade = (v: number) => { const x = Math.round(v * dim); return `rgb(${x},${x},${x + 4})`; };
  // landing block
  const lx0 = (TOP + 1) * D;
  const lx1 = lx0 + 9;
  const ly = TOP * R;
  poly([P(lx0, ly, 0), P(lx1, ly, 0), P(lx1, ly, DEPTH), P(lx0, ly, DEPTH)], shade(70));
  for (let k = 1; k <= TOP; k++) {
    const x0 = k * D;
    const x1 = (k + 1) * D;
    const y = k * R;
    const yb = (k - 1) * R;
    const L = clamp(lit - k + 1);
    // riser (faces left, visible thanks to the oblique depth)
    poly([P(x0, yb, 0), P(x0, y, 0), P(x0, y, DEPTH), P(x0, yb, DEPTH)], shade(38 + 10 * L));
    // tread top
    poly([P(x0, y, 0), P(x1, y, 0), P(x1, y, DEPTH), P(x0, y, DEPTH)], shade(78 + 25 * L));
    if (L > 0) {
      // warm LED strip under the nose of the step
      const a = P(x0, y - 0.02, 0);
      const b = P(x0, y - 0.02, DEPTH);
      g.save();
      g.strokeStyle = `rgba(255,226,170,${0.9 * L * dim})`;
      g.lineWidth = 5 * c.s / 240;
      g.shadowColor = 'rgba(255,214,150,.95)';
      g.shadowBlur = 26;
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      g.restore();
      const glowA = P(x0 - 0.2, yb + 0.05, DEPTH / 2);
      const rg = g.createRadialGradient(glowA[0], glowA[1], 0, glowA[0], glowA[1], 70 * c.s / 240);
      rg.addColorStop(0, `rgba(255,220,160,${0.18 * L * dim})`);
      rg.addColorStop(1, 'rgba(255,220,160,0)');
      g.fillStyle = rg;
      g.fillRect(glowA[0] - 80, glowA[1] - 80, 160, 160);
    }
  }
  // front profile (solid step blocks down to the floor)
  for (let k = 1; k <= TOP; k++) {
    const x0 = k * D;
    const x1 = (k + 1) * D;
    const y = k * R;
    const L = clamp(lit - k + 1);
    const a = P(x0, y, 0);
    const b = P(x1, -0.6, 0);
    const gr = g.createLinearGradient(0, a[1], 0, b[1]);
    gr.addColorStop(0, shade(60 + 14 * L));
    gr.addColorStop(1, shade(22));
    poly([P(x0, y, 0), P(x1, y, 0), P(x1, -0.6, 0), P(x0, -0.6, 0)], gr);
    g.strokeStyle = `rgba(0,0,0,${0.5})`;
    g.lineWidth = 1.5;
    const e0 = P(x0, y, 0);
    const e1 = P(x0, -0.6, 0);
    g.beginPath(); g.moveTo(e0[0], e0[1]); g.lineTo(e1[0], e1[1]); g.stroke();
    if (numbers && k <= 99) {
      const pn = P(x0 + D / 2, y - 0.17, 0);
      g.save();
      g.font = `700 ${Math.round(0.13 * c.s)}px Inter700, Arial`;
      g.textAlign = 'center';
      g.fillStyle = L > 0 ? `rgba(255,236,205,${0.85 * dim})` : `rgba(255,255,255,${0.22 * dim})`;
      if (L > 0) { g.shadowColor = 'rgba(255,214,150,.8)'; g.shadowBlur = 12; }
      g.fillText(String(k), pn[0], pn[1]);
      g.restore();
    }
  }
}

function drawFigure(g: CanvasRenderingContext2D, c: Cam, ox: number, z: number, p: Pose, style: 'disc' | 'obs' | 'shadow', alpha: number, t: number) {
  const S = (q: V) => proj(c, [q[0] + ox, q[1]], z);
  const up = mul(sub(p.neck, p.pel), 1 / len(sub(p.neck, p.pel)));
  const head = add(p.neck, mul(up, 0.17));
  const sh = add(p.neck, mul(up, -0.05));
  const knees = p.feet.map((f) => ik(p.pel, f, 0.46, 0.46, [1, 0.25]));
  const elbows = p.hands.map((h) => ik(sh, h, 0.3, 0.3, [-0.3, -1]));
  g.save();
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const lw = (style === 'shadow' ? 0.12 : 0.07) * c.s;
  if (style === 'shadow') {
    g.shadowColor = 'rgba(200,210,255,.35)';
    g.shadowBlur = 18;
    g.strokeStyle = '#040405';
    g.fillStyle = '#040405';
  } else {
    g.shadowColor = style === 'obs' ? 'rgba(255,200,190,.7)' : 'rgba(255,240,215,.75)';
    g.shadowBlur = 16;
    g.strokeStyle = CREAM;
    g.fillStyle = CREAM;
  }
  g.lineWidth = lw;
  const seg = (a: V, b: V) => { const A = S(a); const Bq = S(b); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(Bq[0], Bq[1]); g.stroke(); };
  // far limbs first, a bit dimmer
  const order = [1, 0];
  for (const i of order) {
    g.globalAlpha = alpha * (i === 1 ? 0.75 : 1);
    seg(p.pel, knees[i]); seg(knees[i], p.feet[i]);
    seg(p.feet[i], add(p.feet[i], [0.1, 0]));
  }
  g.globalAlpha = alpha;
  seg(p.pel, p.neck);
  for (const i of order) {
    g.globalAlpha = alpha * (i === 1 ? 0.75 : 1);
    seg(sh, elbows[i]); seg(elbows[i], p.hands[i]);
  }
  g.globalAlpha = alpha;
  const hp = S(head);
  g.beginPath(); g.arc(hp[0], hp[1], 0.12 * c.s, 0, Math.PI * 2); g.fill();
  if (style === 'shadow') {
    g.shadowBlur = 10; g.shadowColor = '#fff';
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.beginPath(); g.ellipse(hp[0] + 0.05 * c.s, hp[1] - 0.01 * c.s, 0.028 * c.s, 0.016 * c.s, 0, 0, Math.PI * 2); g.fill();
  }
  if (style === 'obs') {
    // wound
    const w = S(add(lv(p.pel, p.neck, 0.35), [0.05, 0]));
    const pulse = 0.85 + 0.15 * Math.sin(t * 6);
    const rg = g.createRadialGradient(w[0], w[1], 0, w[0], w[1], 0.14 * c.s);
    rg.addColorStop(0, `rgba(255,40,30,${0.95 * pulse})`);
    rg.addColorStop(1, 'rgba(255,40,30,0)');
    g.shadowBlur = 0;
    g.fillStyle = rg;
    g.fillRect(w[0] - 0.2 * c.s, w[1] - 0.2 * c.s, 0.4 * c.s, 0.4 * c.s);
  }
  g.restore();
  return S(head);
}

function blood(g: CanvasRenderingContext2D, c: Cam, t: number) {
  const ox = BACK.x;
  const z = BACK.z;
  const s = sObs(t);
  // a drop on every step she has climbed since the wound opened
  for (let k = 3; k <= Math.min(TOP, Math.floor(s)); k++) {
    const p = footPos(k);
    const q = proj(c, [p[0] + ox + (rnd(k, 1) - 0.5) * 0.2, p[1] + 0.005], z + 0.3 + rnd(k, 2) * 0.5);
    g.fillStyle = 'rgba(200,20,18,.85)';
    g.beginPath(); g.ellipse(q[0], q[1], (0.035 + 0.02 * rnd(k, 3)) * c.s, 0.014 * c.s, 0, 0, Math.PI * 2); g.fill();
  }
  // the pool where she knelt
  if (t > B.kneel) {
    const p = footPos(11);
    const q = proj(c, [p[0] + ox + 0.05, p[1] + 0.004], z + 0.55);
    const r = 0.06 + 0.14 * sm(prog(t, B.kneel, B.rise));
    g.fillStyle = 'rgba(170,12,12,.9)';
    g.beginPath(); g.ellipse(q[0], q[1], r * c.s, r * 0.35 * c.s, 0, 0, Math.PI * 2); g.fill();
  }
  // drips falling from the wound while she kneels
  if (t > B.kneel && t < B.go) {
    const kn = kneelPose(11, t);
    const w = add(lv(kn.pel, kn.neck, 0.35), [0.05, 0]);
    for (let i = 0; i < 5; i++) {
      const ph = ((t * 1.3 + i / 5) % 1);
      const y = lerp(w[1], footPos(11)[1], ph * ph);
      const q = proj(c, [w[0] + ox + 0.02, y], z + 0.55);
      g.fillStyle = `rgba(230,30,25,${1 - ph * 0.5})`;
      g.beginPath(); g.ellipse(q[0], q[1], 0.012 * c.s, 0.022 * c.s, 0, 0, Math.PI * 2); g.fill();
    }
  }
}

function label(g: CanvasRenderingContext2D, at: V, text: string, col: string, glow: string, alpha: number, size: number) {
  if (alpha <= 0.01) return;
  g.save();
  g.globalAlpha = alpha;
  g.font = `700 ${size}px Inter700, Arial`;
  g.textAlign = 'center';
  g.fillStyle = col;
  g.shadowColor = glow;
  g.shadowBlur = 14;
  const spaced = text.split('').join('  ');
  g.fillText(spaced, at[0], at[1] - 70 + (1 - alpha) * 14);
  g.restore();
}

const CAPTIONS: [number, number, string][] = [
  [3.6, 7.4, 'Trois forces. Les mêmes marches.'],
  [10.7, 12.6, "L'obsession saigne."],
  [12.7, 14.7, 'Elle veut s’arrêter.'],
  [14.8, 17.4, 'Elle refuse.'],
  [18.6, 22.2, 'La discipline compte chaque marche.'],
  [22.4, 26.0, "L'ombre, elle, reste en bas."],
];
function caption(g: CanvasRenderingContext2D, t: number) {
  for (const [a, b, txt] of CAPTIONS) {
    if (t < a || t > b) continue;
    const words = txt.split(' ');
    const out = prog(t, b - 0.3, b);
    g.save();
    g.font = '700 62px Inter700, Arial';
    g.textAlign = 'left';
    let full = g.measureText(txt).width;
    if (full > 940) { g.font = `700 ${Math.floor(62 * 940 / full)}px Inter700, Arial`; full = g.measureText(txt).width; }
    let x = W / 2 - full / 2;
    words.forEach((w, i) => {
      const k = sm(prog(t, a + i * 0.11, a + i * 0.11 + 0.35));
      g.globalAlpha = k * (1 - out);
      g.fillStyle = w.includes('saigne') || w === 'refuse.' ? '#ff6a5e' : '#ffffff';
      g.shadowColor = 'rgba(0,0,0,.8)';
      g.shadowBlur = 20;
      g.fillText(w, x, 1660 + (1 - k) * 18);
      x += g.measureText(w + ' ').width;
    });
    g.restore();
  }
}

let GRAIN: HTMLCanvasElement | null = null;
function finish(g: CanvasRenderingContext2D, t: number) {
  const vg = g.createRadialGradient(W / 2, H * 0.5, H * 0.3, W / 2, H * 0.5, H * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.7)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  if (!GRAIN) {
    GRAIN = document.createElement('canvas');
    GRAIN.width = GRAIN.height = 256;
    const q = GRAIN.getContext('2d')!;
    const id = q.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) { const v = rnd(i, 9) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 16; }
    q.putImageData(id, 0, 0);
  }
  g.save();
  const f = Math.floor(t * 24);
  g.translate(-Math.floor(rnd(f, 1) * 256), -Math.floor(rnd(f, 2) * 256));
  g.fillStyle = g.createPattern(GRAIN, 'repeat')!;
  g.fillRect(0, 0, W + 256, H + 256);
  g.restore();
}

function endCard(g: CanvasRenderingContext2D, t: number) {
  const k = sm(prog(t, 27.4, 28.4));
  if (k <= 0) return;
  g.save();
  g.fillStyle = `rgba(0,0,0,${0.55 * k})`;
  g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.globalAlpha = k;
  g.font = '700 96px Inter700, Arial';
  g.fillStyle = '#fff';
  g.shadowColor = 'rgba(255,220,170,.8)';
  g.shadowBlur = 30;
  g.fillText('Continue', W / 2, 900);
  g.fillText('de monter.', W / 2, 1010);
  g.shadowBlur = 0;
  g.globalAlpha = k * sm(prog(t, 28.4, 29.2));
  g.font = '700 40px Inter700, Arial';
  g.fillStyle = 'rgba(255,255,255,.75)';
  g.fillText('Même en saignant.', W / 2, 1110);
  g.restore();
}

export function renderFrame(g: CanvasRenderingContext2D, f: number) {
  const t = f / FPS;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.shadowBlur = 0;
  const c = camera(t);
  background(g, t, c);
  // floor
  const fl = proj(c, [0, 0], 0);
  g.fillStyle = '#0c0c0f';
  g.fillRect(0, fl[1], W, H - fl[1]);

  // back staircase: obsession + shadow
  const so = sObs(t);
  staircase(g, c, BACK.x, BACK.z, so, 0.72, false, t);
  blood(g, c, t);
  const shadowA = 1 - sm(prog(t, B.shadowFade, B.shadowFade + 2.4));
  let shHead: V | null = null;
  if (shadowA > 0.01) {
    const sp = walkPose(sShad(t), 'shadow', t);
    shHead = drawFigure(g, c, BACK.x, BACK.z + 0.55, sp, 'shadow', shadowA, t);
    // dissolving into smoke
    if (t > B.shadowFade) {
      for (let i = 0; i < 40; i++) {
        const k = prog(t, B.shadowFade + rnd(i, 3) * 1.5, B.shadowFade + rnd(i, 3) * 1.5 + 1.6);
        if (k <= 0 || k >= 1) continue;
        const base = add(sp.pel, [(rnd(i, 4) - 0.5) * 0.5, rnd(i, 5) * 0.9]);
        const q = proj(c, add(base, [0.2 * k, 0.6 * k]), BACK.z + 0.55);
        g.fillStyle = `rgba(10,10,12,${0.8 * (1 - k)})`;
        g.beginPath(); g.arc(q[0], q[1], (0.03 + 0.05 * k) * c.s, 0, Math.PI * 2); g.fill();
      }
    }
  }
  const obsHead = drawFigure(g, c, BACK.x, BACK.z + 0.55, obsPose(t), 'obs', 0.92, t);

  // front staircase: discipline
  const sd = sDisc(t);
  staircase(g, c, 0, 0, sd, 1, true, t);
  const dHead = drawFigure(g, c, 0, 0.55, walkPose(sd, 'disc', t), 'disc', 1, t);

  // labels (appear one by one at the start)
  const lab = (a: number) => sm(prog(t, a, a + 0.5)) * (1 - sm(prog(t, 27.2, 27.8)));
  label(g, dHead, 'DISCIPLINE', '#ffffff', 'rgba(255,240,215,.7)', lab(0.6), Math.round(c.s * 0.13));
  label(g, obsHead, 'OBSESSION', RED, 'rgba(255,60,40,.7)', lab(1.2), Math.round(c.s * 0.13));
  if (shHead) label(g, shHead, 'SHADOW', '#cfd2da', 'rgba(200,210,255,.5)', lab(1.8) * shadowA, Math.round(c.s * 0.12));

  caption(g, t);
  finish(g, t);
  endCard(g, t);
  const out = prog(t, DUR - 0.6, DUR);
  if (out > 0) { g.fillStyle = `rgba(0,0,0,${out})`; g.fillRect(0, 0, W, H); }
}
