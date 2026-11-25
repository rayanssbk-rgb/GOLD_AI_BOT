// "Lance ta boutique" — 21 s vertical motion-design piece presenting Shopify (no voice, no music).
// Original visuals: violet/pink glow on black, a floating phone, product cards, a live globe of visitors,
// the first-order notification. "Shopify" appears as plain text next to an original shopping-bag icon.
export const W = 1080;
export const H = 1920;
export const FPS = 60;
export const DUR = 21;

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const easeInOut = (x: number) => { const t = clamp(x); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const back = (x: number) => { const t = clamp(x); const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const rnd = (i: number, j = 0) => { const s = Math.sin(i * 12.9898 + j * 78.233 + 0.5) * 43758.5453; return s - Math.floor(s); };
const VIOLET = '#95BF47';
const PINK = '#5E8E3E';

// scenes [start, end]
export const SC = { idea: [0, 3.4], phone: [3.2, 7.4], products: [7.2, 11.2], live: [11.0, 15.2], sale: [15.0, 18.6], end: [18.4, 21] };
const vis = (t: number, [a, b]: number[], fin = 0.35, fout = 0.35) => clamp((t - a) / fin) * clamp((b - t) / fout);

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}
function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a: number) {
  if (a <= 0.001) return;
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, col.replace('A', String(a)));
  rg.addColorStop(1, col.replace('A', '0'));
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = rg;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.globalCompositeOperation = 'source-over';
}

/** Shopify bag logo: green bag, darker side panel, handle, white S */
function bag(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, a = 1) {
  g.save();
  g.globalAlpha *= a;
  g.translate(cx, cy);
  g.scale(s / 100, s / 100);
  // handle
  g.strokeStyle = '#95BF47';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-14, -24); g.bezierCurveTo(-14, -52, 10, -52, 12, -24);
  g.stroke();
  // front body
  g.fillStyle = '#95BF47';
  g.beginPath();
  g.moveTo(-40, -26); g.lineTo(22, -30); g.lineTo(30, 52); g.lineTo(-46, 44); g.closePath();
  g.fill();
  // darker right side panel
  g.fillStyle = '#5E8E3E';
  g.beginPath();
  g.moveTo(22, -30); g.lineTo(38, -26); g.lineTo(48, 46); g.lineTo(30, 52); g.closePath();
  g.fill();
  // white S
  g.fillStyle = '#fff';
  g.font = '700 64px Inter700, Arial';
  g.textAlign = 'center';
  g.save();
  g.transform(1, 0, -0.12, 1, 0, 0);
  g.fillText('S', 0, 36);
  g.restore();
  g.textAlign = 'left';
  g.restore();
}
function star(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.beginPath();
  g.moveTo(x, y - s);
  g.quadraticCurveTo(x + s * 0.12, y - s * 0.12, x + s, y);
  g.quadraticCurveTo(x + s * 0.12, y + s * 0.12, x, y + s);
  g.quadraticCurveTo(x - s * 0.12, y + s * 0.12, x - s, y);
  g.quadraticCurveTo(x - s * 0.12, y - s * 0.12, x, y - s);
  g.fill();
}

/** kinetic caption: words rise and un-blur one after another */
function caption(g: CanvasRenderingContext2D, text: string, t: number, t0: number, y: number, size = 64, step = 0.12, out = Infinity, color = '#ffffff') {
  if (t < t0) return;
  const words = text.split(' ');
  g.font = `700 ${size}px Inter700, Arial`;
  g.textBaseline = 'alphabetic';
  // wrap into lines that fit 900px
  const lines: string[][] = [[]];
  for (const w of words) {
    const test = [...lines[lines.length - 1], w].join(' ');
    if (g.measureText(test).width > 900 && lines[lines.length - 1].length) lines.push([w]);
    else lines[lines.length - 1].push(w);
  }
  const fo = clamp((out - t) / 0.3);
  let wi = 0;
  lines.forEach((line, li) => {
    const full = line.join(' ');
    let x = W / 2 - g.measureText(full).width / 2;
    const ly = y + li * size * 1.18;
    for (const w of line) {
      const k = easeOut(prog(t, t0 + wi * step, t0 + wi * step + 0.45));
      g.save();
      g.globalAlpha = k * fo;
      g.filter = k < 1 ? `blur(${((1 - k) * 10).toFixed(1)}px)` : 'none';
      g.fillStyle = color;
      g.fillText(w, x, ly + (1 - k) * 26);
      g.restore();
      x += g.measureText(w + ' ').width;
      wi++;
    }
  });
}

// ---------------------------------------------------------------- background
let GRAIN: HTMLCanvasElement | null = null;
function background(g: CanvasRenderingContext2D, t: number) {
  g.fillStyle = '#030604';
  g.fillRect(0, 0, W, H);
  const blobs = [
    [0.3 + 0.08 * Math.sin(t * 0.4), 0.32 + 0.05 * Math.cos(t * 0.3), 900, 'rgba(110,200,60,A)', 0.32],
    [0.75 + 0.06 * Math.cos(t * 0.35), 0.62 + 0.06 * Math.sin(t * 0.25), 850, 'rgba(0,128,96,A)', 0.22],
    [0.5, 0.95, 700, 'rgba(110,200,60,A)', 0.14],
  ] as [number, number, number, string, number][];
  for (const [x, y, r, c, a] of blobs) glow(g, x * W, y * H, r, c, a);
  if (!GRAIN) {
    GRAIN = document.createElement('canvas');
    GRAIN.width = GRAIN.height = 256;
    const q = GRAIN.getContext('2d')!;
    const id = q.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) { const v = rnd(i, 3) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 18; }
    q.putImageData(id, 0, 0);
  }
  g.save();
  g.globalAlpha = 0.5;
  const ox = Math.floor(rnd(Math.floor(t * 24), 1) * 256);
  const oy = Math.floor(rnd(Math.floor(t * 24), 2) * 256);
  g.translate(-ox, -oy);
  g.fillStyle = g.createPattern(GRAIN, 'repeat')!;
  g.fillRect(0, 0, W + 256, H + 256);
  g.restore();
}

// ---------------------------------------------------------------- scene 1: the idea
function sceneIdea(g: CanvasRenderingContext2D, t: number) {
  const v = vis(t, SC.idea, 0.01, 0.4);
  if (v <= 0) return;
  g.save();
  g.globalAlpha = v;
  const pop = back(prog(t, 0.25, 0.95));
  const zoomOut = 1 + 1.6 * Math.pow(prog(t, 3.0, 3.4), 2);
  const cy = 820;
  glow(g, W / 2, cy, 520 + 40 * Math.sin(t * 3), 'rgba(110,200,60,A)', 0.55 * pop);
  glow(g, W / 2, cy + 40, 300, 'rgba(0,128,96,A)', 0.35 * pop);
  g.translate(W / 2, cy);
  g.scale(pop * zoomOut, pop * zoomOut);
  bag(g, 0, 0, 300);
  g.restore();
  g.save();
  g.globalAlpha = v * easeOut(prog(t, 0.9, 1.5));
  g.font = '700 86px Inter700, Arial';
  g.textAlign = 'center';
  g.fillStyle = '#fff';
  g.fillText('shopify', W / 2, 1150 + (1 - easeOut(prog(t, 0.9, 1.5))) * 20);
  g.textAlign = 'left';
  g.restore();
  caption(g, "Tout part d'une idée.", t, 1.5, 1480, 66, 0.12, SC.idea[1]);
  // sparkles
  for (let i = 0; i < 14; i++) {
    const a = rnd(i, 4) * Math.PI * 2;
    const d = 260 + rnd(i, 5) * 260;
    const k = prog(t, 0.4 + rnd(i, 6) * 0.6, 2.6);
    if (k <= 0 || k >= 1) continue;
    g.globalAlpha = Math.sin(Math.PI * k) * v;
    g.fillStyle = i % 2 ? '#fff' : '#D7F5A8';
    star(g, W / 2 + Math.cos(a) * d * (0.6 + k * 0.5), cy + Math.sin(a) * d * (0.6 + k * 0.5), 8 + rnd(i, 7) * 14);
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- scene 2: phone + store opens
function phoneScreen(g: CanvasRenderingContext2D, t: number, sw: number, sh: number) {
  // home screen with app icons, then a tap opens the store
  const open = easeInOut(prog(t, 5.1, 5.6));
  const grad = g.createLinearGradient(0, 0, sw, sh);
  grad.addColorStop(0, '#0f2414');
  grad.addColorStop(1, '#050a06');
  g.fillStyle = grad;
  g.fillRect(0, 0, sw, sh);
  const cols = 4;
  const size = 82;
  const gap = (sw - cols * size) / (cols + 1);
  const palette = ['#1f2a20', '#2f4a2a', '#3d5f30', '#1a1d1b', '#4d6b3a', '#262b27', '#355a3c', '#2b332c'];
  for (let i = 0; i < 16; i++) {
    const cx = gap + (i % cols) * (size + gap);
    const cy = 120 + Math.floor(i / cols) * (size + 56);
    const k = back(prog(t, 3.7 + i * 0.05, 4.1 + i * 0.05));
    if (k <= 0) continue;
    g.save();
    g.translate(cx + size / 2, cy + size / 2);
    g.scale(k, k);
    if (i === 9) {
      g.fillStyle = '#fff';
      rr(g, -size / 2, -size / 2, size, size, 22);
      g.fill();
      bag(g, 0, 4, size * 0.78);
    } else {
      g.fillStyle = palette[i % palette.length];
      rr(g, -size / 2, -size / 2, size, size, 22);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath();
      g.arc(0, 0, size * (0.14 + 0.1 * rnd(i, 9)), 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  // tap ripple on the store icon
  const tapX = gap + (9 % cols) * (size + gap) + size / 2;
  const tapY = 120 + Math.floor(9 / cols) * (size + 56) + size / 2;
  const tp = prog(t, 4.85, 5.35);
  if (tp > 0 && tp < 1) {
    g.strokeStyle = `rgba(255,255,255,${0.8 * (1 - tp)})`;
    g.lineWidth = 4;
    g.beginPath();
    g.arc(tapX, tapY, 20 + 90 * tp, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = `rgba(255,255,255,${0.35 * (1 - tp)})`;
    g.beginPath();
    g.arc(tapX, tapY, 34, 0, Math.PI * 2);
    g.fill();
  }
  if (open <= 0) return;
  // storefront zooms out of the icon
  g.save();
  const s = lerp(0.12, 1, open);
  g.translate(lerp(tapX, sw / 2, open), lerp(tapY, sh / 2, open));
  g.scale(s, s);
  g.translate(-sw / 2, -sh / 2);
  g.globalAlpha = clamp(open * 1.6);
  g.fillStyle = '#EEEBE5';
  g.fillRect(0, 0, sw, sh);
  g.fillStyle = '#0B0B0C';
  g.fillRect(0, 0, sw, 70);
  g.fillStyle = '#fff';
  g.font = '700 30px Inter700, Arial';
  g.textAlign = 'center';
  g.fillText('ECLAIRE', sw / 2, 46);
  const hero = g.createLinearGradient(0, 70, 0, 470);
  hero.addColorStop(0, '#0B0B0C');
  hero.addColorStop(1, '#2f5a22');
  g.fillStyle = hero;
  g.fillRect(0, 70, sw, 400);
  g.fillStyle = '#fff';
  g.font = '700 44px Inter700, Arial';
  g.fillText('NOUVEAU DROP', sw / 2, 300);
  g.font = '500 20px Inter500, Arial';
  g.fillText('Oversize · Gen Z · Paris', sw / 2, 340);
  g.fillStyle = '#fff';
  rr(g, sw / 2 - 110, 370, 220, 50, 25);
  g.fill();
  g.fillStyle = '#0B0B0C';
  g.font = '700 18px Inter700, Arial';
  g.fillText('DÉCOUVRIR', sw / 2, 402);
  const tees = ['#E9A7B8', '#1E2740', '#141416', '#D9306E'];
  tees.forEach((c, i) => {
    const x = 24 + (i % 2) * ((sw - 72) / 2 + 24);
    const y = 500 + Math.floor(i / 2) * 300;
    const w = (sw - 72) / 2;
    g.fillStyle = '#D8D3CA';
    rr(g, x, y, w, 220, 14);
    g.fill();
    tee(g, x + w / 2, y + 110, 150, c);
    g.fillStyle = '#0E0E0F';
    g.textAlign = 'left';
    g.font = '700 16px Inter700, Arial';
    g.fillText(['T-SHIRT ECLAIRE', 'HOODIE OBSESSION', 'TEE CHROME', 'TEE PARIS'][i], x, y + 250);
    g.font = '500 16px Inter500, Arial';
    g.fillText(['39,00 €', '79,00 €', '45,00 €', '39,00 €'][i], x, y + 274);
  });
  g.textAlign = 'left';
  g.restore();
}
/** small oversize tee silhouette (product thumbnail) */
function tee(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, fill: string) {
  g.save();
  g.translate(cx, cy);
  g.scale(s / 160, s / 160);
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(-30, -70); g.quadraticCurveTo(0, -60, 30, -70); g.lineTo(62, -62); g.lineTo(88, -10); g.lineTo(64, -2); g.lineTo(58, -18);
  g.lineTo(58, 70); g.lineTo(-58, 70); g.lineTo(-58, -18); g.lineTo(-64, -2); g.lineTo(-88, -10); g.lineTo(-62, -62); g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.font = '700 16px Inter700, Arial';
  g.textAlign = 'center';
  g.fillText('ECLAIRE', 0, -14);
  g.restore();
}
function scenePhone(g: CanvasRenderingContext2D, t: number) {
  const v = vis(t, SC.phone);
  if (v <= 0) return;
  const rise = easeOut(prog(t, 3.2, 4.0));
  const ang = lerp(0.55, -0.12, easeOut(prog(t, 3.2, 4.6))) + 0.05 * Math.sin(t * 1.3);
  const pw = 560;
  const ph = 1130;
  const cx = W / 2;
  const cy = 860 + (1 - rise) * 700 + 14 * Math.sin(t * 1.7);
  glow(g, cx, cy, 760, 'rgba(110,200,60,A)', 0.5 * v);
  glow(g, cx + 120, cy + 300, 500, 'rgba(0,128,96,A)', 0.28 * v);
  // shadow
  g.save();
  g.globalAlpha = 0.5 * v;
  g.filter = 'blur(30px)';
  g.fillStyle = '#000';
  g.beginPath();
  g.ellipse(cx, cy + ph / 2 + 60, pw * 0.45, 40, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // fake 3D: horizontal squash + vertical skew driven by the angle
  g.save();
  g.globalAlpha = v;
  g.translate(cx, cy);
  g.transform(Math.cos(ang), Math.sin(ang) * 0.22, 0, 1, 0, 0);
  g.fillStyle = '#0d0d12';
  rr(g, -pw / 2, -ph / 2, pw, ph, 78);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.lineWidth = 4;
  g.stroke();
  // screen
  const sw = pw - 36;
  const sh = ph - 36;
  g.save();
  rr(g, -sw / 2, -sh / 2, sw, sh, 62);
  g.clip();
  g.translate(-sw / 2, -sh / 2);
  phoneScreen(g, t, sw, sh);
  g.restore();
  // dynamic island + glass sheen
  g.fillStyle = '#000';
  rr(g, -70, -sh / 2 + 18, 140, 38, 19);
  g.fill();
  const sheen = g.createLinearGradient(-pw / 2, -ph / 2, pw / 2, ph / 2);
  sheen.addColorStop(0, 'rgba(255,255,255,.10)');
  sheen.addColorStop(0.4, 'rgba(255,255,255,0)');
  g.fillStyle = sheen;
  rr(g, -pw / 2, -ph / 2, pw, ph, 78);
  g.fill();
  g.restore();
  caption(g, 'Un tap…', t, 4.1, 1600, 66, 0.12, 5.3);
  caption(g, 'et ta boutique est en ligne.', t, 5.4, 1600, 66, 0.1, SC.phone[1]);
}

// ---------------------------------------------------------------- scene 3: products
const PRODUCTS = [
  ['Hoodie Obsession', '79,00 €', '#1E2740'],
  ['T-shirt Eclaire Paris', '39,00 €', '#E9A7B8'],
  ['Cargo Technique', '89,00 €', '#2c2a24'],
  ['Tee Chrome Y2K', '45,00 €', '#D9306E'],
] as const;
function card(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  g.fillStyle = 'rgba(255,255,255,.06)';
  rr(g, x, y, w, h, 36);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 2;
  g.stroke();
}
function sceneProducts(g: CanvasRenderingContext2D, t: number) {
  const v = vis(t, SC.products);
  if (v <= 0) return;
  g.save();
  g.globalAlpha = v;
  const enter = easeOut(prog(t, 7.2, 7.8));
  const x = 90;
  const y = 380 + (1 - enter) * 120;
  const w = W - 180;
  glow(g, W / 2, 800, 800, 'rgba(110,200,60,A)', 0.35);
  card(g, x, y, w, 1010);
  g.fillStyle = '#fff';
  g.font = '700 46px Inter700, Arial';
  g.fillText('Produits', x + 50, y + 96);
  g.fillStyle = 'rgba(255,255,255,.5)';
  g.font = '500 24px Inter500, Arial';
  g.fillText(`${Math.round(4 * easeOut(prog(t, 7.6, 9.6)))} produits`, x + 50, y + 140);
  // "+ Ajouter" button
  g.fillStyle = '#fff';
  rr(g, x + w - 250, y + 52, 200, 64, 32);
  g.fill();
  g.fillStyle = '#0b0b0c';
  g.font = '700 24px Inter700, Arial';
  g.fillText('+ Ajouter', x + w - 210, y + 94);
  PRODUCTS.forEach(([name, price, col], i) => {
    const t0 = 7.7 + i * 0.42;
    const k = easeOut(prog(t, t0, t0 + 0.5));
    if (k <= 0) return;
    const ry = y + 190 + i * 196;
    g.save();
    g.globalAlpha = v * k;
    g.translate((1 - k) * 160, 0);
    g.fillStyle = 'rgba(255,255,255,.05)';
    rr(g, x + 30, ry, w - 60, 168, 26);
    g.fill();
    g.fillStyle = '#D8D3CA';
    rr(g, x + 50, ry + 20, 128, 128, 20);
    g.fill();
    tee(g, x + 114, ry + 86, 110, col);
    g.fillStyle = '#fff';
    g.font = '700 30px Inter700, Arial';
    g.fillText(name, x + 206, ry + 72);
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.font = '500 26px Inter500, Arial';
    g.fillText(price, x + 206, ry + 114);
    // status pill: Brouillon -> Actif
    const on = prog(t, t0 + 0.55, t0 + 0.75);
    const pw = 150;
    const px = x + w - 60 - pw - 10;
    g.fillStyle = on > 0.5 ? 'rgba(110,200,60,.28)' : 'rgba(255,255,255,.1)';
    rr(g, px, ry + 58, pw, 52, 26);
    g.fill();
    g.fillStyle = on > 0.5 ? '#D7F5A8' : 'rgba(255,255,255,.55)';
    g.font = '700 22px Inter700, Arial';
    g.textAlign = 'center';
    g.fillText(on > 0.5 ? '● Actif' : 'Brouillon', px + pw / 2, ry + 92);
    g.textAlign = 'left';
    g.restore();
  });
  g.restore();
  caption(g, 'Hoodies, t-shirts, cargos.', t, 7.8, 1560, 66, 0.3, SC.products[1]);
  caption(g, 'Tes produits sont en vente.', t, 9.6, 1660, 48, 0.08, SC.products[1], 'rgba(255,255,255,.75)');
}

// ---------------------------------------------------------------- scene 4: live visitors on a dotted globe
const GLOBE = Array.from({ length: 5200 }, (_, i) => {
  const lat = Math.asin(2 * rnd(i, 11) - 1);
  const lon = rnd(i, 12) * Math.PI * 2;
  // keep dots that fall on "land": a blobby noise field (stylised, not a real map)
  const n = Math.sin(lon * 2.1 + 0.6) * Math.cos(lat * 2.6) + 0.6 * Math.sin(lon * 4.7 + lat * 3.1) + 0.3 * Math.cos(lon * 7.3 - lat * 5.2);
  return { lat, lon, land: n > -0.15 };
}).filter((p) => p.land);
const PINS = Array.from({ length: 9 }, (_, i) => ({ lat: (rnd(i, 21) - 0.5) * 1.6, lon: -(11.9 + i * 0.32) * 0.35 + (rnd(i, 22) - 0.5) * 1.6, t: 11.9 + i * 0.32 }));
function sceneLive(g: CanvasRenderingContext2D, t: number) {
  const v = vis(t, SC.live);
  if (v <= 0) return;
  g.save();
  g.globalAlpha = v;
  const x = 90;
  const y = 380 + (1 - easeOut(prog(t, 11, 11.6))) * 120;
  const w = W - 180;
  card(g, x, y, w, 1000);
  g.fillStyle = '#fff';
  g.font = '700 42px Inter700, Arial';
  g.fillText('Visiteurs en direct', x + 50, y + 90);
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  g.fillStyle = `rgba(150,230,90,${0.6 + 0.4 * pulse})`;
  g.beginPath();
  g.arc(x + w - 70, y + 76, 10, 0, Math.PI * 2);
  g.fill();
  // globe
  const gx = W / 2;
  const gy = y + 470;
  const R = 300;
  glow(g, gx, gy, 430, 'rgba(110,200,60,A)', 0.5);
  const rot = t * 0.35;
  for (const p of GLOBE) {
    const lon = p.lon + rot;
    const cz = Math.cos(p.lat) * Math.cos(lon);
    if (cz < -0.05) continue;
    const px = gx + R * Math.cos(p.lat) * Math.sin(lon);
    const py = gy - R * Math.sin(p.lat);
    g.fillStyle = `rgba(200,240,160,${0.25 + 0.6 * cz})`;
    g.beginPath();
    g.arc(px, py, 1.6 + 1.6 * cz, 0, Math.PI * 2);
    g.fill();
  }
  let count = 0;
  for (const p of PINS) {
    if (t < p.t) continue;
    count++;
    const lon = p.lon + rot;
    const cz = Math.cos(p.lat) * Math.cos(lon);
    if (cz < 0) continue;
    const px = gx + R * Math.cos(p.lat) * Math.sin(lon);
    const py = gy - R * Math.sin(p.lat);
    const k = prog(t, p.t, p.t + 0.8);
    g.strokeStyle = `rgba(0,128,96,${(1 - k) * 0.9})`;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(px, py, 6 + 40 * k, 0, Math.PI * 2);
    g.stroke();
    glow(g, px, py, 40, 'rgba(0,128,96,A)', 0.8 * cz);
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(px, py, 6, 0, Math.PI * 2);
    g.fill();
  }
  // counters
  const sessions = Math.round(count * 3 + 2 * easeOut(prog(t, 11.6, 14)));
  g.fillStyle = 'rgba(255,255,255,.55)';
  g.font = '500 24px Inter500, Arial';
  g.fillText('En ce moment', x + 50, y + 860);
  g.fillText('Sessions aujourd’hui', x + w / 2 + 20, y + 860);
  g.fillStyle = '#fff';
  g.font = '700 64px Inter700, Arial';
  g.fillText(String(count), x + 50, y + 940);
  g.fillText(String(sessions), x + w / 2 + 20, y + 940);
  g.restore();
  caption(g, 'Quelque part, quelqu’un découvre ta marque.', t, 11.7, 1520, 60, 0.1, SC.live[1]);
}

// ---------------------------------------------------------------- scene 5: the first sale
function sceneSale(g: CanvasRenderingContext2D, t: number) {
  const v = vis(t, SC.sale);
  if (v <= 0) return;
  g.save();
  g.globalAlpha = v;
  caption(g, 'Et puis…', t, 15.2, 760, 96, 0.15, 16.2);
  const drop = back(prog(t, 16.3, 16.9));
  const burst = prog(t, 16.45, 17.4);
  if (t > 16.3) {
    glow(g, W / 2, 900, 700 + 200 * burst, 'rgba(0,128,96,A)', 0.55 * (1 - 0.5 * burst));
    glow(g, W / 2, 900, 520, 'rgba(110,200,60,A)', 0.5);
    // sparkles burst
    for (let i = 0; i < 26; i++) {
      const a = rnd(i, 31) * Math.PI * 2;
      const d = (180 + rnd(i, 32) * 420) * easeOut(burst);
      g.globalAlpha = v * (1 - burst);
      g.fillStyle = i % 3 ? '#D7F5A8' : '#fff';
      star(g, W / 2 + Math.cos(a) * d, 900 + Math.sin(a) * d * 0.8, 6 + rnd(i, 33) * 14);
    }
    g.globalAlpha = v;
    // notification banner
    const ny = lerp(-260, 820, drop);
    const sh = t > 16.45 && t < 16.75 ? 6 * Math.sin(t * 90) : 0;
    g.save();
    g.translate(sh, 0);
    g.shadowColor = 'rgba(0,0,0,.5)';
    g.shadowBlur = 40;
    g.fillStyle = 'rgba(22,30,22,.96)';
    rr(g, 70, ny, W - 140, 190, 44);
    g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#fff';
    rr(g, 104, ny + 40, 110, 110, 26);
    g.fill();
    bag(g, 159, ny + 98, 92);
    g.fillStyle = '#fff';
    g.font = '700 34px Inter700, Arial';
    g.fillText('Nouvelle commande', 244, ny + 84);
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.font = '500 28px Inter500, Arial';
    g.fillText('N°1001 · 79,00 € · Hoodie Obsession', 244, ny + 128);
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.font = '500 22px Inter500, Arial';
    g.textAlign = 'right';
    g.fillText('maintenant', W - 104, ny + 70);
    g.textAlign = 'left';
    g.restore();
  }
  g.restore();
  caption(g, 'ta première vente.', t, 16.9, 1180, 96, 0.14, SC.sale[1], '#D7F5A8');
}

// ---------------------------------------------------------------- scene 6: end card
function sceneEnd(g: CanvasRenderingContext2D, t: number) {
  const v = vis(t, SC.end, 0.4, 0.01);
  if (v <= 0) return;
  g.save();
  g.globalAlpha = v;
  const k = back(prog(t, 18.5, 19.2));
  glow(g, W / 2, 760, 620, 'rgba(110,200,60,A)', 0.55);
  glow(g, W / 2, 800, 380, 'rgba(0,128,96,A)', 0.35);
  g.save();
  g.translate(W / 2, 760);
  g.scale(k, k);
  bag(g, 0, 0, 260);
  g.restore();
  g.font = '700 96px Inter700, Arial';
  g.textAlign = 'center';
  g.fillStyle = '#fff';
  g.globalAlpha = v * easeOut(prog(t, 18.9, 19.4));
  g.fillText('shopify', W / 2, 1080);
  g.textAlign = 'left';
  g.restore();
  caption(g, 'Lance ta boutique.', t, 19.3, 1250, 64, 0.12);
  const pk = easeOut(prog(t, 19.9, 20.3));
  if (pk > 0) {
    g.save();
    g.globalAlpha = v * pk;
    g.fillStyle = '#fff';
    rr(g, W / 2 - 170, 1340 + (1 - pk) * 20, 340, 84, 42);
    g.fill();
    g.fillStyle = '#0b0b0c';
    g.font = '700 32px Inter700, Arial';
    g.textAlign = 'center';
    g.fillText('Lien en bio ↗', W / 2, 1394 + (1 - pk) * 20);
    g.restore();
  }
}

export function renderFrame(g: CanvasRenderingContext2D, f: number) {
  const t = f / FPS;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.filter = 'none';
  background(g, t);
  sceneIdea(g, t);
  scenePhone(g, t);
  sceneProducts(g, t);
  sceneLive(g, t);
  sceneSale(g, t);
  sceneEnd(g, t);
  // vignette
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  const out = clamp((t - (DUR - 0.35)) / 0.35);
  if (out > 0) {
    g.fillStyle = `rgba(0,0,0,${out})`;
    g.fillRect(0, 0, W, H);
  }
}
