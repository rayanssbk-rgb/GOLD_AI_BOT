// POV (10 s): on the deck chair, looking at the island; the phone buzzes, he lifts it: a transfer has arrived,
// he opens the app and the balance counts up to 237.450 €; then a message from his ex: "Hello !" -> a mocking laugh.
// Same 2D glowing-line world (hands, legs, rail, the island at sunset behind); the phone screen is crisp and realistic.
// The banking app is fictional (no real bank name or logo).
import { W, H, FPS, clamp, lerp, smooth, sstep, prog, easeOut, rnd } from './timeline.js';
import { sky, sun, skyline, ocean } from './yacht';

export const POV_FRAMES = 10 * FPS;
// beats (s)
const P = { buzz: 3.0, lift0: 3.2, lift1: 3.95, tap: 5.0, app: 5.15, count0: 5.3, count1: 6.8, ex: 7.0, laugh: 7.3, laughEnd: 9.25, out: 9.6 };
const LINE = '#f6f2ea';
const GREEN = '#2fe07a';
const AMOUNT = 237450;
const fmt = (n: number) => `${Math.round(n).toLocaleString('de-DE')} €`;

let BG: HTMLCanvasElement | null = null;
function background(ctx: CanvasRenderingContext2D, t: number) {
  if (!BG) {
    BG = document.createElement('canvas');
    BG.width = W;
    BG.height = H;
  }
  const g = BG.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.filter = 'none';
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  // looking a bit higher than in the wide shot: the island sits behind the phone, out of focus
  g.save();
  g.translate(0, -60 * sstep(t, P.lift0, P.lift1));
  sky(g, t);
  sun(g, t);
  skyline(g, t);
  ocean(g, t);
  g.restore();
  ctx.save();
  const fk = sstep(t, P.lift0, P.lift1);
  ctx.filter = `blur(${(7 * fk).toFixed(2)}px) brightness(${(1 - 0.38 * fk).toFixed(3)})`;
  ctx.drawImage(BG, 0, 0);
  ctx.restore();
}
function glowLine(ctx: CanvasRenderingContext2D, pts: [number, number][], w: number, a = 1) {
  ctx.strokeStyle = `rgba(246,242,234,${a})`;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255,240,215,0.65)';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.shadowBlur = 0;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** the app screen, drawn in phone-screen pixels (0..SW, 0..SH) */
const SW = 556;
const SH = 1176;
function lockScreen(ctx: CanvasRenderingContext2D, t: number) {
  const g = ctx.createLinearGradient(0, 0, SW, SH);
  g.addColorStop(0, '#1b1626');
  g.addColorStop(0.5, '#0d0b12');
  g.addColorStop(1, '#201509');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SW, SH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4f4f6';
  ctx.font = '500 26px Inter500, Arial';
  ctx.fillText('mardi 24 novembre', SW / 2, 170);
  ctx.font = '700 128px Inter700, Arial';
  ctx.fillText('19:42', SW / 2, 300);
  // transfer notification
  const k = easeOut(prog(t, P.buzz + 0.05, P.buzz + 0.4));
  const press = 1 - 0.03 * Math.sin(Math.PI * prog(t, P.tap - 0.1, P.tap + 0.12));
  const y = lerp(SH * 0.62, 420, k);
  ctx.globalAlpha = k;
  ctx.save();
  ctx.translate(SW / 2, y + 70);
  ctx.scale(press, press);
  ctx.translate(-SW / 2, -(y + 70));
  rr(ctx, 20, y, SW - 40, 150, 32);
  ctx.fillStyle = 'rgba(52,52,60,0.92)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(76, y + 54, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#1f9d55';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 30px Inter700, Arial';
  ctx.fillText('€', 76, y + 65);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#c8c8d0';
  ctx.font = '600 19px Inter700, Arial';
  ctx.fillText('MA BANQUE', 122, y + 46);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9a9aa4';
  ctx.font = '500 19px Inter500, Arial';
  ctx.fillText('maintenant', SW - 44, y + 46);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 26px Inter700, Arial';
  ctx.fillText('Virement reçu', 122, y + 88);
  ctx.fillStyle = '#e4e4ea';
  ctx.font = '500 23px Inter500, Arial';
  ctx.fillText('+237.450,00 € crédité sur votre compte', 52, y + 126);
  ctx.restore();
  ctx.globalAlpha = 1;
  // the tap
  const tp = prog(t, P.tap - 0.12, P.tap + 0.25);
  if (tp > 0 && tp < 1) {
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - tp)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(SW / 2 + 60, y + 80, 18 + 50 * tp, 0, Math.PI * 2);
    ctx.stroke();
  }
  // flashlight / camera shortcuts + home bar, like any lock screen
  for (const x of [80, SW - 80]) {
    ctx.beginPath();
    ctx.arc(x, SH - 110, 38, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(60,60,66,0.7)';
    ctx.fill();
  }
}
function screen(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SW, SH);
  const wake = sstep(t, P.buzz, P.buzz + 0.15);
  if (wake <= 0) return;
  ctx.globalAlpha = wake;
  lockScreen(ctx, t);
  ctx.globalAlpha = 1;
  const on = sstep(t, P.tap, P.app + 0.15);
  if (on <= 0) return;
  ctx.globalAlpha = on;
  ctx.fillStyle = '#0a0a0d';
  ctx.fillRect(0, 0, SW, SH);
  const scroll = 0;
  ctx.save();
  ctx.translate(0, -scroll);
  // header
  ctx.textAlign = 'left';
  ctx.fillStyle = '#26262c';
  ctx.beginPath();
  ctx.arc(70, 130, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8e8ea';
  ctx.font = '600 24px Inter700, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('M', 70, 139);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8c8c94';
  ctx.font = '500 22px Inter500, Arial';
  ctx.fillText('Bonsoir', 114, 122);
  ctx.fillStyle = '#f2f2f4';
  ctx.font = '600 26px Inter700, Arial';
  ctx.fillText('Compte principal', 114, 154);
  // balance
  const k = easeOut(prog(t, P.count0, P.count1));
  const n = AMOUNT * k;
  ctx.fillStyle = '#8c8c94';
  ctx.font = '500 24px Inter500, Arial';
  ctx.fillText('Solde disponible', 44, 250);
  const pulse = sstep(t, P.count1 - 0.05, P.count1 + 0.1) * (1 - 0.6 * sstep(t, P.count1 + 0.1, P.count1 + 1.0));
  ctx.save();
  ctx.shadowColor = `rgba(47,224,122,${0.35 + 0.55 * pulse})`;
  ctx.shadowBlur = 18 + 30 * pulse;
  ctx.fillStyle = GREEN;
  ctx.font = '700 88px Inter700, Arial';
  ctx.fillText(fmt(n), 40, 345);
  ctx.restore();
  ctx.fillStyle = GREEN;
  ctx.font = '600 24px Inter700, Arial';
  const pct = (18.4 * k).toFixed(1).replace('.', ',');
  ctx.fillText(`▲ +${pct} % ce mois-ci`, 44, 392);
  // chart card
  rr(ctx, 30, 430, SW - 60, 300, 28);
  ctx.fillStyle = '#141418';
  ctx.fill();
  const pts: [number, number][] = [];
  const N = 40;
  let v = 0;
  for (let i = 0; i <= N; i++) {
    v += 0.6 + (rnd(i, 7) - 0.35) * 1.6 + (i > 30 ? 1.2 : 0);
    pts.push([60 + (i / N) * (SW - 120), 690 - v * 5.4]);
  }
  const draw = smooth(prog(t, P.count0 + 0.3, P.count1 + 0.3));
  const m = Math.max(2, Math.floor(draw * N) + 1);
  const shown = pts.slice(0, m);
  ctx.beginPath();
  shown.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.lineTo(shown[shown.length - 1][0], 700);
  ctx.lineTo(60, 700);
  ctx.closePath();
  const fg = ctx.createLinearGradient(0, 470, 0, 700);
  fg.addColorStop(0, 'rgba(47,224,122,0.35)');
  fg.addColorStop(1, 'rgba(47,224,122,0)');
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.beginPath();
  shown.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(47,224,122,0.7)';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
  const last = shown[shown.length - 1];
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(last[0], last[1], 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6f6f78';
  ctx.font = '500 19px Inter500, Arial';
  ['Jan', 'Mar', 'Mai', 'Juil', 'Sep', 'Nov'].forEach((mth, i) => ctx.fillText(mth, 56 + i * 86, 718));
  // quick actions
  const acts = ['Virer', 'Payer', 'Cartes', 'Plus'];
  acts.forEach((a, i) => {
    const x = 84 + i * 130;
    ctx.fillStyle = '#1b1b21';
    ctx.beginPath();
    ctx.arc(x, 800, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8e8ea';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (i === 0) {
      ctx.moveTo(x - 12, 800);
      ctx.lineTo(x + 12, 800);
      ctx.moveTo(x + 4, 792);
      ctx.lineTo(x + 12, 800);
      ctx.lineTo(x + 4, 808);
    } else if (i === 1) {
      ctx.rect(x - 13, 791, 26, 18);
    } else if (i === 2) {
      ctx.rect(x - 15, 789, 30, 22);
      ctx.moveTo(x - 15, 797);
      ctx.lineTo(x + 15, 797);
    } else {
      ctx.moveTo(x - 10, 800);
      ctx.lineTo(x + 10, 800);
      ctx.moveTo(x, 790);
      ctx.lineTo(x, 810);
    }
    ctx.stroke();
    ctx.fillStyle = '#b8b8c0';
    ctx.font = '500 19px Inter500, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(a, x, 866);
    ctx.textAlign = 'left';
  });
  // recent activity (fictional, generic)
  ctx.fillStyle = '#f2f2f4';
  ctx.font = '600 25px Inter700, Arial';
  ctx.fillText('Activité récente', 44, 930);
  const rows: [string, string, string, boolean][] = [['Virement reçu', "À l'instant", '+237.450,00 €', true]];
  rows.forEach(([a, d, v2, pos], i) => {
    const y = 990 + i * 92;
    ctx.fillStyle = '#1b1b21';
    ctx.beginPath();
    ctx.arc(72, y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pos ? GREEN : '#e8e8ea';
    ctx.font = '700 24px Inter700, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(pos ? '↓' : '•', 72, y + 9);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f2f2f4';
    ctx.font = '600 23px Inter700, Arial';
    ctx.fillText(a, 118, y - 4);
    ctx.fillStyle = '#7d7d86';
    ctx.font = '500 19px Inter500, Arial';
    ctx.fillText(d, 118, y + 24);
    ctx.textAlign = 'right';
    ctx.fillStyle = pos ? GREEN : '#f2f2f4';
    ctx.font = '600 23px Inter700, Arial';
    ctx.fillText(v2, SW - 40, y + 6);
    ctx.textAlign = 'left';
  });
  ctx.restore();
  ctx.fillStyle = '#0a0a0d';
  ctx.fillRect(0, 0, SW, 80);
  // status bar
  ctx.fillStyle = '#f2f2f2';
  ctx.font = '600 25px Inter700, Arial';
  ctx.textAlign = 'left';
  ctx.fillText('19:42', 44, 54);
  ctx.textAlign = 'right';
  for (let i = 0; i < 4; i++) ctx.fillRect(SW - 150 + i * 10, 46 - i * 5, 6, 8 + i * 5);
  rr(ctx, SW - 84, 34, 44, 22, 6);
  ctx.strokeStyle = '#f2f2f2';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillRect(SW - 80, 38, 30, 14);
  // notification from the ex, sliding down from the top
  const nk = easeOut(prog(t, P.ex, P.ex + 0.3)) * (1 - smooth(prog(t, P.laughEnd + 0.05, P.laughEnd + 0.35)));
  if (nk > 0.001) {
    const by = -140 + nk * 216;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 24;
    rr(ctx, 16, by, SW - 32, 124, 30);
    ctx.fillStyle = 'rgba(38,38,44,0.97)';
    ctx.fill();
    ctx.restore();
    // messages app icon (generic speech bubble)
    ctx.beginPath();
    ctx.arc(71, by + 61, 35, 0, Math.PI * 2);
    const ig = ctx.createLinearGradient(36, by + 26, 106, by + 96);
    ig.addColorStop(0, '#7b5cff');
    ig.addColorStop(1, '#ff5c8a');
    ctx.fillStyle = ig;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(71, by + 58, 22, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(56, by + 68);
    ctx.lineTo(52, by + 80);
    ctx.lineTo(66, by + 72);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 26px Inter700, Arial';
    ctx.fillText('Ex 💔', 124, by + 54);
    ctx.fillStyle = '#d6d6dc';
    ctx.font = '500 25px Inter500, Arial';
    ctx.fillText('Hello !', 124, by + 90);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8c8c94';
    ctx.font = '500 19px Inter500, Arial';
    ctx.fillText('maintenant', SW - 40, by + 50);
    ctx.textAlign = 'left';
  }
  // home indicator
  ctx.fillStyle = 'rgba(240,240,240,0.85)';
  rr(ctx, SW / 2 - 70, SH - 22, 140, 8, 4);
  ctx.fill();
  ctx.globalAlpha = 1;
}

let SC: HTMLCanvasElement | null = null;
export function renderPov(ctx: CanvasRenderingContext2D, f: number) {
  const t = f / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  // gentle rocking of the boat (the whole view)
  const roll = 0.008 * Math.sin(t * 1.25);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(roll);
  ctx.translate(-W / 2, -H / 2 + 5 * Math.sin(t * 1.25 + 0.6));
  background(ctx, t);
  // the stern rail and his legs stretched out on the chair, toward the sea
  glowLine(ctx, [[-40, 1290], [W + 40, 1270]], 5, 0.7);
  glowLine(ctx, [[-40, 1400], [W + 40, 1385]], 5, 0.7);
  for (const x of [120, 470, 820]) glowLine(ctx, [[x, 1290], [x, 1640]], 4, 0.55);
  glowLine(ctx, [[-40, 1640], [W + 40, 1625]], 6, 0.85);
  glowLine(ctx, [[300, H + 40], [430, 1520], [470, 1450]], 20);
  glowLine(ctx, [[470, 1450], [505, 1430]], 20);
  glowLine(ctx, [[640, H + 40], [600, 1530], [585, 1460]], 20);
  glowLine(ctx, [[585, 1460], [622, 1446]], 20);
  ctx.restore();

  // left hand with the glass (lower left), right hand bringing the phone up
  const lift = easeOut(prog(t, P.lift0, P.lift1));
  const laugh = sstep(t, P.laugh, P.laugh + 0.1) * (1 - sstep(t, P.laughEnd - 0.2, P.laughEnd));
  const push = lerp(0.9, 1, lift) * (1 + 0.07 * smooth(prog(t, P.app, 10)));
  const buzz = t > P.buzz && t < P.buzz + 0.35 ? 4 * Math.sin(t * 160) : 0;
  const px = lerp(720, 560, lift) + buzz;
  const py = lerp(1800, 930, lift) + 7 * laugh * Math.sin(t * 31);
  const tilt = lerp(0.32, -0.05, lift) + 0.02 * Math.sin(t * 1.1) + 0.012 * laugh * Math.sin(t * 38);
  // glass
  const gx = 175 + 6 * Math.sin(t * 1.3);
  const gy = 1250;
  glowLine(ctx, [[-30, 1880], [120, 1560], [gx - 10, gy + 170]], 22);
  glowLine(ctx, [[gx - 40, gy + 175], [gx + 20, gy + 150]], 16);
  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(-0.08);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 5;
  ctx.shadowColor = 'rgba(255,240,215,0.6)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(-34, 150);
  ctx.lineTo(34, 150);
  ctx.moveTo(0, 150);
  ctx.lineTo(0, 70);
  ctx.moveTo(-26, -90);
  ctx.lineTo(-16, 70);
  ctx.lineTo(16, 70);
  ctx.lineTo(26, -90);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,205,110,0.85)';
  ctx.beginPath();
  ctx.moveTo(-22, -40);
  ctx.lineTo(-16, 66);
  ctx.lineTo(16, 66);
  ctx.lineTo(22, -40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,245,220,0.95)';
  for (let i = 0; i < 9; i++) {
    const ph = (t * 0.8 + rnd(i, 4)) % 1;
    ctx.fillRect(-12 + rnd(i, 5) * 24, 60 - ph * 100, 3.5, 3.5);
  }
  ctx.restore();

  // forearm holding the phone
  glowLine(ctx, [[W + 60, H + 30], [px + 300 * push, py + 420 * push], [px + 250 * push, py + 260 * push]], 24);
  // phone
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(push, push);
  ctx.rotate(tilt);
  const PW = 600;
  const PH = 1220;
  // arm + hand behind the phone
  glowLine(ctx, [[520, 1100], [330, 640], [250, 420]], 24);
  // body
  rr(ctx, -PW / 2, -PH / 2, PW, PH, 82);
  ctx.fillStyle = '#0b0b0e';
  ctx.fill();
  ctx.strokeStyle = 'rgba(246,242,234,0.9)';
  ctx.lineWidth = 4;
  ctx.shadowColor = 'rgba(255,240,215,0.6)';
  ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.shadowBlur = 0;
  // screen
  if (!SC) {
    SC = document.createElement('canvas');
    SC.width = SW;
    SC.height = SH;
  }
  const s = SC.getContext('2d')!;
  s.setTransform(1, 0, 0, 1, 0, 0);
  screen(s, t);
  ctx.save();
  rr(ctx, -SW / 2, -SH / 2, SW, SH, 62);
  ctx.clip();
  ctx.drawImage(SC, -SW / 2, -SH / 2);
  // glass reflection of the sunset on the screen
  const rg = ctx.createLinearGradient(-SW / 2, -SH / 2, SW / 2, SH / 2);
  rg.addColorStop(0, 'rgba(255,190,110,0.07)');
  rg.addColorStop(0.45, 'rgba(255,190,110,0)');
  rg.addColorStop(1, 'rgba(255,255,255,0.03)');
  ctx.fillStyle = rg;
  ctx.fillRect(-SW / 2, -SH / 2, SW, SH);
  ctx.restore();
  // dynamic island
  ctx.fillStyle = '#000';
  rr(ctx, -64, -SH / 2 + 18, 128, 36, 18);
  ctx.fill();
  // fingers holding it (right edge) and the thumb resting on the side
  glowLine(ctx, [[PW / 2 + 30, 260], [PW / 2 - 6, 230]], 22);
  glowLine(ctx, [[PW / 2 + 30, 340], [PW / 2 - 8, 320]], 22);
  glowLine(ctx, [[PW / 2 + 40, 160], [PW / 2 + 4, 60]], 22);
  glowLine(ctx, [[-PW / 2 - 4, 290], [-PW / 2 + 14, 260]], 20);
  glowLine(ctx, [[-PW / 2 - 4, 380], [-PW / 2 + 14, 352]], 20);
  ctx.restore();

  // the screen lights up his lap when it wakes (before he lifts it)
  const wakeGlow = sstep(t, P.buzz, P.buzz + 0.15) * (1 - lift);
  if (wakeGlow > 0.01) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(px, py - 200, 0, px, py - 200, 600);
    g.addColorStop(0, `rgba(190,170,255,${0.16 * wakeGlow})`);
    g.addColorStop(1, 'rgba(190,170,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  // green light from the screen on the hands when the amount lands
  const pulse = sstep(t, P.count1 - 0.05, P.count1 + 0.1) * (1 - 0.7 * sstep(t, P.count1 + 0.1, P.count1 + 1.2));
  if (pulse > 0.01) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(px, py - 300, 0, px, py - 300, 700);
    g.addColorStop(0, `rgba(47,224,122,${0.14 * pulse})`);
    g.addColorStop(1, 'rgba(47,224,122,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  const fade = Math.max(1 - clamp(t / 0.35), clamp((t - P.out) / 0.4));
  if (fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, W, H);
  }
}
