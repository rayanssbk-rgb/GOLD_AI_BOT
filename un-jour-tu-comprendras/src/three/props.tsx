// Shared props: phone, laptop, notebook, clock, desk room, rainy glass.
import React from 'react';
import { Screen, mat, V3, Glow } from './lib';
import { rnd } from '../timeline.js';

// ------------------------------------------------------------------ phone feed (canvas)
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

const POSTS = [
  { user: 'alex.invest', cap: 'Premier million à 24 ans.', kind: 'car', likes: '214 k' },
  { user: 'sarah.voyage', cap: 'Bali, encore. Merci la vie.', kind: 'beach', likes: '98,4 k' },
  { user: 'mehdi.business', cap: '+12 450 € ce mois-ci', kind: 'chart', likes: '57,1 k' },
  { user: 'lea.home', cap: 'On a signé pour la maison !', kind: 'house', likes: '143 k' },
  { user: 'yanis.lifestyle', cap: 'Dubaï, vue du 62e étage.', kind: 'city', likes: '301 k' },
];

function drawArt(g: CanvasRenderingContext2D, kind: string, x: number, y: number, w: number, h: number) {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  if (kind === 'beach') {
    gr.addColorStop(0, '#ffb470');
    gr.addColorStop(0.55, '#ff7e6b');
    gr.addColorStop(0.56, '#2a8fb8');
    gr.addColorStop(1, '#1a5f84');
  } else if (kind === 'city') {
    gr.addColorStop(0, '#1d2a4a');
    gr.addColorStop(1, '#e0965a');
  } else if (kind === 'chart') {
    gr.addColorStop(0, '#0f1a17');
    gr.addColorStop(1, '#0b2a20');
  } else {
    gr.addColorStop(0, '#2b3d5c');
    gr.addColorStop(1, '#c98a5a');
  }
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,230,180,0.9)';
  if (kind === 'beach' || kind === 'house' || kind === 'car') {
    g.beginPath();
    g.arc(x + w * 0.72, y + h * 0.42, h * 0.12, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#0b0d12';
  if (kind === 'car') {
    g.fillStyle = '#e9edf2';
    g.beginPath();
    g.moveTo(x + w * 0.1, y + h * 0.82);
    g.quadraticCurveTo(x + w * 0.2, y + h * 0.6, x + w * 0.45, y + h * 0.58);
    g.quadraticCurveTo(x + w * 0.7, y + h * 0.58, x + w * 0.9, y + h * 0.75);
    g.lineTo(x + w * 0.9, y + h * 0.82);
    g.fill();
    g.fillStyle = '#0b0d12';
    [0.25, 0.75].forEach((p) => {
      g.beginPath();
      g.arc(x + w * p, y + h * 0.84, h * 0.07, 0, Math.PI * 2);
      g.fill();
    });
  } else if (kind === 'house') {
    g.fillStyle = '#eef1f5';
    g.fillRect(x + w * 0.2, y + h * 0.5, w * 0.55, h * 0.35);
    g.fillStyle = '#ffd28c';
    g.fillRect(x + w * 0.27, y + h * 0.58, w * 0.12, h * 0.12);
    g.fillRect(x + w * 0.5, y + h * 0.58, w * 0.18, h * 0.27);
  } else if (kind === 'chart') {
    g.strokeStyle = '#43e39a';
    g.lineWidth = 8;
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const px = x + w * 0.08 + (i / 10) * w * 0.84;
      const py = y + h * 0.85 - Math.pow(i / 10, 1.7) * h * 0.65 + Math.sin(i * 2.1) * 10;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.stroke();
  } else if (kind === 'city') {
    for (let i = 0; i < 12; i++) {
      const bw = w / 12;
      const bh = h * (0.3 + rnd(i + 50) * 0.6);
      g.fillStyle = '#0d1220';
      g.fillRect(x + i * bw, y + h - bh, bw - 4, bh);
    }
  } else if (kind === 'beach') {
    g.strokeStyle = '#10161c';
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(x + w * 0.2, y + h);
    g.quadraticCurveTo(x + w * 0.22, y + h * 0.6, x + w * 0.3, y + h * 0.35);
    g.stroke();
  }
}

export function drawFeed(scroll: number, time: string) {
  return (g: CanvasRenderingContext2D, W: number, H: number) => {
    g.fillStyle = '#0a0c11';
    g.fillRect(0, 0, W, H);
    const postH = 760;
    g.save();
    g.translate(0, 120 - scroll * postH);
    POSTS.forEach((p, i) => {
      const y = i * postH;
      g.fillStyle = '#2c3442';
      g.beginPath();
      g.arc(70, y + 50, 34, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#e8ecf2';
      g.font = '600 34px Inter700';
      g.fillText(p.user, 122, y + 62);
      drawArt(g, p.kind, 0, y + 110, W, 500);
      g.fillStyle = '#ff4d6d';
      g.font = '40px Inter700';
      g.fillText('♥', 30, y + 680);
      g.fillStyle = '#e8ecf2';
      g.font = '32px Inter700';
      g.fillText(p.likes, 82, y + 678);
      g.font = '32px Inter500';
      g.fillStyle = '#c9d1dc';
      g.fillText(p.cap, 30, y + 730);
    });
    g.restore();
    g.fillStyle = '#0a0c11';
    g.fillRect(0, 0, W, 100);
    g.fillStyle = '#e8ecf2';
    g.font = '600 34px Inter700';
    g.fillText(time, 50, 66);
    roundRect(g, W - 120, 36, 64, 30, 8);
    g.strokeStyle = '#e8ecf2';
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = '#ff6b75';
    g.fillRect(W - 115, 41, 12, 20);
  };
}

export function drawAlarm(f: number) {
  return (g: CanvasRenderingContext2D, W: number, H: number) => {
    g.fillStyle = '#05070b';
    g.fillRect(0, 0, W, H);
    const pulse = 0.5 + 0.5 * Math.sin(f * 0.5);
    g.fillStyle = '#e8ecf2';
    g.font = '200px Inter500';
    g.textAlign = 'center';
    g.fillText('05:00', W / 2, H * 0.36);
    g.font = '44px Inter500';
    g.fillStyle = '#9aa6b6';
    g.fillText('Réveil', W / 2, H * 0.43);
    roundRect(g, W * 0.15, H * 0.72, W * 0.7, 130, 65);
    g.fillStyle = `rgba(255,140,60,${0.6 + 0.4 * pulse})`;
    g.fill();
    g.fillStyle = '#111';
    g.font = '600 52px Inter700';
    g.fillText('Arrêter', W / 2, H * 0.72 + 84);
  };
}

export const Phone: React.FC<{ draw: (g: CanvasRenderingContext2D, W: number, H: number) => void; id: string; light?: boolean }> = ({ draw, id, light = true }) => (
  <group>
    <mesh material={mat('#101318', 0.3, 0.6)}>
      <boxGeometry args={[0.074, 0.155, 0.008]} />
    </mesh>
    <Screen id={id} w={0.068} h={0.148} px={[540, 1160]} position={[0, 0, 0.0042]} draw={draw} glow={0.95} />
    {light ? <pointLight position={[0, 0, 0.12]} color="#a9c4ff" intensity={0.25} distance={1.2} decay={2} /> : null}
  </group>
);

// ------------------------------------------------------------------ laptop
export const Laptop: React.FC<{ open: number; draw: (g: CanvasRenderingContext2D, W: number, H: number) => void; id: string; position?: V3; rotY?: number; light?: number; lightColor?: string }> = ({ open, draw, id, position = [0, 0, 0], rotY = 0, light = 1, lightColor = '#9cc0ff' }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <mesh position={[0, 0.009, 0]} material={mat('#2a2f37', 0.35, 0.7)}>
      <boxGeometry args={[0.34, 0.018, 0.235]} />
    </mesh>
    {/* keyboard */}
    <mesh position={[0, 0.0185, 0.01]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#111419', 0.8)}>
      <planeGeometry args={[0.29, 0.1]} />
    </mesh>
    {Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 12 }, (_, c) => (
        <mesh key={`${r}-${c}`} position={[-0.13 + c * 0.0236, 0.0195, -0.03 + r * 0.022]} material={mat('#1f242c', 0.7)}>
          <boxGeometry args={[0.019, 0.003, 0.018]} />
        </mesh>
      )),
    )}
    <mesh position={[0, 0.0186, 0.085]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#23282f', 0.5)}>
      <planeGeometry args={[0.1, 0.055]} />
    </mesh>
    {/* lid */}
    <group position={[0, 0.018, -0.115]} rotation={[-(Math.PI / 2) * (1 - open) - 0.25 * open + 0.0, 0, 0]}>
      <group rotation={[0, 0, 0]}>
        <mesh position={[0, 0.115, -0.004]} material={mat('#2a2f37', 0.35, 0.7)}>
          <boxGeometry args={[0.34, 0.232, 0.008]} />
        </mesh>
        {open > 0.02 ? <Screen id={id} w={0.315} h={0.198} px={[1024, 640]} position={[0, 0.117, 0.0005]} draw={draw} glow={open} /> : null}
      </group>
    </group>
    {open > 0.02 ? <pointLight position={[0, 0.25, 0.1]} color={lightColor} intensity={0.22 * open * light} distance={2.5} decay={2} /> : null}
    {open > 0.02 ? <Glow position={[0, 0.13, -0.08]} size={0.9} color={lightColor} opacity={0.12 * open * light} /> : null}
  </group>
);

export function drawCode(f: number, opts: { error?: number; seed?: number; title?: string; ok?: number } = {}) {
  return (g: CanvasRenderingContext2D, W: number, H: number) => {
    g.fillStyle = '#0c1422';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#141e30';
    g.fillRect(0, 0, W, 40);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(24 + i * 26, 20, 8, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = '#7f8ea6';
    g.font = '22px Inter500';
    g.fillText(opts.title ?? 'projet / main.ts', 110, 28);
    const lines = Math.floor(f * 0.45);
    for (let i = 0; i < 26; i++) {
      const idx = lines - 26 + i;
      if (idx < 0) continue;
      const sd = (opts.seed ?? 1) * 100 + idx;
      const ind = Math.floor(rnd(sd) * 4) * 30;
      const w = 120 + rnd(sd + 3) * 520;
      g.fillStyle = rnd(sd + 7) < 0.3 ? '#f3c26b' : rnd(sd + 8) < 0.35 ? '#8ff0c0' : '#8fb4ff';
      g.globalAlpha = 0.85;
      roundRect(g, 40 + ind, 60 + i * 22, w, 10, 5);
      g.fill();
    }
    g.globalAlpha = 1;
    const e = opts.error ?? 0;
    if (e > 0) {
      g.fillStyle = `rgba(255,60,70,${0.18 * e})`;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = Math.min(1, e * 2);
      roundRect(g, W / 2 - 300, H / 2 - 110, 600, 220, 16);
      g.fillStyle = '#1b0d12';
      g.fill();
      g.strokeStyle = '#ff4d5a';
      g.lineWidth = 4;
      g.stroke();
      g.fillStyle = '#ff4d5a';
      g.font = '600 44px Inter700';
      g.textAlign = 'center';
      g.fillText('✕  Échec', W / 2, H / 2 - 20);
      g.font = '28px Inter500';
      g.fillStyle = '#ffc2c7';
      g.fillText('Le déploiement a échoué', W / 2, H / 2 + 40);
      g.textAlign = 'left';
      g.globalAlpha = 1;
    }
    const ok = opts.ok ?? 0;
    if (ok > 0) {
      g.globalAlpha = ok;
      roundRect(g, W / 2 - 300, H / 2 - 90, 600, 180, 16);
      g.fillStyle = '#0d1b15';
      g.fill();
      g.strokeStyle = '#43e39a';
      g.lineWidth = 4;
      g.stroke();
      g.fillStyle = '#43e39a';
      g.font = '600 44px Inter700';
      g.textAlign = 'center';
      g.fillText('✓  En ligne', W / 2, H / 2 + 15);
      g.textAlign = 'left';
      g.globalAlpha = 1;
    }
  };
}

// ------------------------------------------------------------------ notebook
export function drawNotebook(chars: number, lines: string[], crossed = -1) {
  return (g: CanvasRenderingContext2D, W: number, H: number) => {
    g.fillStyle = '#ece6d8';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(80,110,160,0.35)';
    g.lineWidth = 2;
    for (let y = 150; y < H; y += 74) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
    g.strokeStyle = 'rgba(200,70,70,0.4)';
    g.beginPath();
    g.moveTo(90, 0);
    g.lineTo(90, H);
    g.stroke();
    let left = chars;
    g.fillStyle = '#1d2433';
    lines.forEach((ln, i) => {
      if (left <= 0) return;
      const txt = ln.slice(0, Math.max(0, left));
      left -= ln.length;
      g.font = i === 0 ? 'italic 600 70px CormorantLocal' : 'italic 58px CormorantLocal';
      g.fillText(txt, 120, 130 + i * 74 + (i === 0 ? 0 : 10));
      if (i === crossed) {
        g.strokeStyle = '#b3262f';
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(115, 120 + i * 74);
        g.lineTo(130 + g.measureText(ln).width, 112 + i * 74);
        g.stroke();
      }
    });
  };
}
/** Pen tip position (0..1 UV) for the character currently being written. */
export function penUV(chars: number, lines: string[]): [number, number] {
  let left = chars;
  for (let i = 0; i < lines.length; i++) {
    if (left <= lines[i].length) {
      const x = (120 + left * (i === 0 ? 30 : 23)) / 1024;
      const y = (130 + i * 74 + (i === 0 ? 0 : 10)) / 1024;
      return [Math.min(0.95, x), y];
    }
    left -= lines[i].length;
  }
  return [0.6, 0.6];
}

export const Notebook: React.FC<{ draw: (g: CanvasRenderingContext2D, W: number, H: number) => void; id: string; position?: V3; rotY?: number }> = ({ draw, id, position = [0, 0, 0], rotY = 0 }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <mesh position={[0, 0.006, 0]} material={mat('#2b2420', 0.8)}>
      <boxGeometry args={[0.235, 0.012, 0.3]} />
    </mesh>
    <Screen id={id} w={0.21} h={0.28} px={[1024, 1365]} position={[0, 0.0125, 0]} rotation={[-Math.PI / 2, 0, 0]} draw={draw} glow={0.85} />
  </group>
);

// ------------------------------------------------------------------ wall clock
export const WallClock: React.FC<{ seconds: number; position?: V3; rotY?: number; r?: number }> = ({ seconds, position = [0, 0, 0], rotY = 0, r = 0.17 }) => {
  const h = (seconds / 3600) % 12;
  const m = (seconds / 60) % 60;
  const s = Math.floor(seconds % 60);
  const hand = (ang: number, len: number, w: number, color: string, z: number) => (
    <group rotation={[0, 0, -ang]} position={[0, 0, z]}>
      <mesh position={[0, len / 2 - 0.015, 0]} material={mat(color, 0.5)}>
        <boxGeometry args={[w, len, 0.004]} />
      </mesh>
    </group>
  );
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={mat('#1a1d23', 0.4, 0.5)}>
        <cylinderGeometry args={[r * 1.08, r * 1.08, 0.03, 48]} />
      </mesh>
      <mesh position={[0, 0, 0.016]} material={mat('#d9d4c8', 0.8)}>
        <circleGeometry args={[r, 48]} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[Math.sin((i / 12) * Math.PI * 2) * r * 0.86, Math.cos((i / 12) * Math.PI * 2) * r * 0.86, 0.018]} rotation={[0, 0, -(i / 12) * Math.PI * 2]} material={mat('#1d2027', 0.6)}>
          <boxGeometry args={[i % 3 === 0 ? 0.012 : 0.006, i % 3 === 0 ? 0.035 : 0.02, 0.002]} />
        </mesh>
      ))}
      {hand((h / 12) * Math.PI * 2, r * 0.55, 0.012, '#15171c', 0.02)}
      {hand((m / 60) * Math.PI * 2, r * 0.8, 0.008, '#15171c', 0.023)}
      {hand((s / 60) * Math.PI * 2, r * 0.88, 0.003, '#c3262f', 0.026)}
      <mesh position={[0, 0, 0.028]} material={mat('#c3262f', 0.5)}>
        <circleGeometry args={[0.008, 16]} />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------ rain on glass
export function drawRainGlass(f: number) {
  return (g: CanvasRenderingContext2D, W: number, H: number) => {
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) {
      const x = rnd(i) * W;
      const sp = rnd(i + 3) < 0.15 ? 2 + rnd(i + 4) * 4 : 0;
      const y = ((rnd(i + 1) * H + f * sp) % H);
      const r = 1.2 + rnd(i + 2) * 2.6;
      g.fillStyle = 'rgba(200,220,255,0.18)';
      g.beginPath();
      g.ellipse(x, y, r * 0.8, r, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath();
      g.arc(x - r * 0.25, y - r * 0.3, r * 0.25, 0, Math.PI * 2);
      g.fill();
      if (sp > 0) {
        g.strokeStyle = 'rgba(200,220,255,0.12)';
        g.lineWidth = r * 0.6;
        g.beginPath();
        g.moveTo(x, y - 60);
        g.lineTo(x, y);
        g.stroke();
      }
    }
  };
}

export const RainGlass: React.FC<{ f: number; w: number; h: number; position: V3; rotY?: number; id: string }> = ({ f, w, h, position, rotY = 0, id }) => (
  <Screen id={id} w={w} h={h} px={[512, 384]} position={position} rotation={[0, rotY, 0]} draw={drawRainGlass(f)} glow={1} transparent />
);

