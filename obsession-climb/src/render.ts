// Frame composition: background -> mountain -> figures -> fog -> weather -> light, per shot, with dissolves.
import { W, H, FPS, SHOTS, B, storm, dawn, flash, clamp } from './timeline.js';
import { Cam, Light, V, applyCam, drawSky, drawRanges, drawSpires, drawClouds, drawBolts, drawSun, drawRays, drawRock, drawFog, drawSea, drawMist, drawRain, drawSplashes, drawFlashOverlay, css, tri, face } from './world';
import { drawFigure, CLIMBER, MENTOR, solve } from './rig';
import { camera, climberRig, mentorRig, dawnRigs, ROCKS, P0 } from './story';

function drawRocks(ctx: CanvasRenderingContext2D, c: Cam, L: Light) {
  const t = L.t;
  if (t < B.slip || t > 14) return;
  const P = P0();
  applyCam(ctx, c);
  // dust puff where the hold broke
  const dt = t - B.slip;
  if (dt < 0.9) {
    for (let i = 0; i < 9; i++) {
      const r = 0.05 + dt * (0.25 + (i % 3) * 0.1);
      ctx.fillStyle = `rgba(90,98,112,${0.22 * (1 - dt / 0.9)})`;
      ctx.beginPath();
      ctx.arc(P.hn[0] + 0.05 + Math.cos(i * 2.3) * r * 0.6, P.hn[1] + Math.sin(i * 1.7) * r * 0.5 - dt * 0.2, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const k of ROCKS) {
    const d = t - k.t0;
    if (d < 0) continue;
    const x = P.hn[0] + k.dx + k.vx * d;
    const y = P.hn[1] + k.dy + k.vy * d - 4.9 * d * d;
    const s = Math.max(k.s, 2.2 / c.z);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(k.w * d);
    ctx.beginPath();
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2;
      const rr = s * (0.7 + 0.3 * Math.sin(j * 2.1 + k.w));
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = css(tri('#2b313b', '#6d7891', '#2b313b', L));
    ctx.fill();
    ctx.restore();
  }
}

function drawShot(ctx: CanvasRenderingContext2D, id: string, t: number, f: number) {
  const st = storm(t);
  const L: Light = { fl: flash(t), dn: id === 'dawn' ? Math.max(dawn(t), 0.55 * clamp((t - 33.2) / 0.7)) : 0, st: id === 'dawn' ? st * 0.6 : st, t, f };
  const c = camera(id, t);
  drawSky(ctx, c, L);
  drawSun(ctx, c, L);
  drawRanges(ctx, c, L);
  drawClouds(ctx, c, L);
  drawBolts(ctx, c, L);
  drawSpires(ctx, c, L);
  drawSea(ctx, c, L);
  drawFog(ctx, c, L);
  drawRock(ctx, c, L);
  drawRocks(ctx, c, L);
  const extra: V[] = [];
  if (id === 'dawn') {
    const [cr, mr] = dawnRigs(t);
    drawFigure(ctx, c, L, mr, MENTOR);
    drawFigure(ctx, c, L, cr, CLIMBER);
  } else {
    const m = mentorRig(t);
    const cr = climberRig(t);
    // the man is revealed by the lightning: silhouette first, then rim-lit
    if (m && id !== 'climb') drawFigure(ctx, c, L, m, MENTOR, { rimPx: 3 + 6 * L.fl });
    const J = drawFigure(ctx, c, L, cr, CLIMBER);
    extra.push(J.wn, J.wf, J.head);
    if (m && id === 'hands') {
      // in the close-up the helping hand closes over the climber's hand
      drawFigure(ctx, c, L, m, MENTOR, { rimPx: 3 + 6 * L.fl });
    }
  }
  drawMist(ctx, c, L);
  if (id !== 'dawn') drawFog(ctx, c, { ...L, fl: L.fl * 0.5 });
  drawSplashes(ctx, c, L, extra);
  drawRain(ctx, c, L);
  drawRays(ctx, c, L);
  drawFlashOverlay(ctx, L);
}

let OFF: HTMLCanvasElement | null = null;
export function renderFrame(ctx: CanvasRenderingContext2D, f: number) {
  const t = f / FPS;
  const active = SHOTS.filter(([, a, b]) => t >= (a as number) && t < (b as number));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (!active.length) return;
  const base = active[0];
  drawShot(ctx, base[0] as string, t, f);
  for (const s of active.slice(1)) {
    const [id, a, , fade] = s as [string, number, number, number];
    const k = fade ? clamp((t - a) / fade) : 1;
    if (k >= 1) {
      drawShot(ctx, id, t, f);
      continue;
    }
    if (!OFF) {
      OFF = document.createElement('canvas');
      OFF.width = W;
      OFF.height = H;
    }
    const o = OFF.getContext('2d')!;
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.globalAlpha = 1;
    o.clearRect(0, 0, W, H);
    drawShot(o, id, t, f);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = k * k * (3 - 2 * k);
    ctx.drawImage(OFF, 0, 0);
    ctx.globalAlpha = 1;
  }
  // gentle fade out at the very end
  const out = clamp((t - 42.2) / 0.8);
  if (out > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(0,0,0,${out})`;
    ctx.fillRect(0, 0, W, H);
  }
}
