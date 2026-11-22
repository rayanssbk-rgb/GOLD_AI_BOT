// Shared visual building blocks: camera, defs, city skyline, rain, props.
import React from 'react';

export const W = 1080;
export const H = 1920;

export const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const C = {
  bg: '#05070b',
  wallDark: '#0b0f16',
  wall: '#111722',
  floor: '#080a0f',
  blue: '#7fa6d9',
  cold: '#9db8dc',
  screen: '#cfe3ff',
  warm: '#ffc874',
  gold: '#f3c26b',
  red: '#ff4d5a',
  green: '#61e3a1',
  white: '#f3f4f6',
};

/** Shared <defs>: put once per <svg>. */
export const Defs: React.FC<{ f: number }> = ({ f }) => (
  <defs>
    <filter id="figGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
      <feComponentTransfer in="b" result="b2">
        <feFuncA type="linear" slope="0.4" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode in="b2" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="blur4" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" />
    </filter>
    <filter id="blur10" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10" />
    </filter>
    <filter id="blur30" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="30" />
    </filter>
    <filter id="reflBlur" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="2 6" />
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 12} stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <radialGradient id="vignette" cx="0.5" cy="0.46" r="0.78">
      <stop offset="0.45" stopColor="#000" stopOpacity="0" />
      <stop offset="1" stopColor="#000" stopOpacity="0.9" />
    </radialGradient>
    <radialGradient id="glowWhite">
      <stop offset="0" stopColor="#fff" stopOpacity="1" />
      <stop offset="1" stopColor="#fff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="glowScreen">
      <stop offset="0" stopColor="#bcd6ff" stopOpacity="0.55" />
      <stop offset="0.5" stopColor="#7fa6d9" stopOpacity="0.12" />
      <stop offset="1" stopColor="#7fa6d9" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="glowWarm">
      <stop offset="0" stopColor="#ffd08a" stopOpacity="0.6" />
      <stop offset="0.5" stopColor="#ffb85c" stopOpacity="0.14" />
      <stop offset="1" stopColor="#ffb85c" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="glowRed">
      <stop offset="0" stopColor="#ff4d5a" stopOpacity="0.5" />
      <stop offset="1" stopColor="#ff4d5a" stopOpacity="0" />
    </radialGradient>
    <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#03050a" />
      <stop offset="0.6" stopColor="#0a1220" />
      <stop offset="1" stopColor="#16233a" />
    </linearGradient>
    <linearGradient id="dawnSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#0a1426" />
      <stop offset="0.55" stopColor="#3a4c6e" />
      <stop offset="0.85" stopColor="#c98a5a" />
      <stop offset="1" stopColor="#f2b56b" />
    </linearGradient>
    <linearGradient id="textShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#000" stopOpacity="0.75" />
      <stop offset="0.7" stopColor="#000" stopOpacity="0.55" />
      <stop offset="1" stopColor="#000" stopOpacity="0" />
    </linearGradient>
    <linearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
      <stop offset="1" stopColor="#fff" stopOpacity="0" />
    </linearGradient>
  </defs>
);

export const Cam: React.FC<{ x: number; y: number; s: number; children: React.ReactNode; shake?: [number, number] }> = ({ x, y, s, children, shake }) => (
  <g transform={`translate(${W / 2 + (shake?.[0] ?? 0)} ${H / 2 + (shake?.[1] ?? 0)}) scale(${s}) translate(${-x} ${-y})`}>{children}</g>
);

/** Procedural city skyline. lit = fraction of windows on; warm = 0..1 colour temperature. */
export const Skyline: React.FC<{
  x0: number;
  x1: number;
  baseY: number;
  seed: number;
  maxH: number;
  minH?: number;
  lit: number;
  warm?: number;
  f: number;
  fill?: string;
  winScale?: number;
  off?: number; // 0..1 windows switching off progressively (people sleeping)
}> = ({ x0, x1, baseY, seed, maxH, minH = 120, lit, warm = 0, f, fill = '#070a10', winScale = 1, off = 0 }) => {
  const blds: React.ReactNode[] = [];
  let x = x0;
  let i = 0;
  while (x < x1) {
    const w = (70 + rnd(seed + i) * 110) * winScale;
    const h = minH + rnd(seed + i + 50) * (maxH - minH);
    const top = baseY - h;
    blds.push(<rect key={`b${i}`} x={x} y={top} width={w - 4} height={h} fill={fill} />);
    if (rnd(seed + i + 77) > 0.6) blds.push(<rect key={`a${i}`} x={x + w * 0.45} y={top - 30 * winScale} width={2.5} height={30 * winScale} fill={fill} />);
    const cols = Math.max(2, Math.floor(w / (16 * winScale)));
    const rows = Math.floor(h / (22 * winScale));
    for (let r = 1; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const id = seed * 1000 + i * 97 + r * 13 + c;
        const on = rnd(id) < lit;
        const sleeper = rnd(id + 3) < off;
        if (!on || sleeper) continue;
        const flick = 0.75 + 0.25 * Math.sin(f * 0.03 + id);
        const wc = rnd(id + 9) < 0.5 + warm * 0.4 ? C.warm : '#cfe0ff';
        blds.push(
          <rect key={`w${id}`} x={x + 6 * winScale + c * 16 * winScale} y={top + r * 22 * winScale} width={7 * winScale} height={10 * winScale} fill={wc} opacity={(0.35 + 0.5 * rnd(id + 5)) * flick} />,
        );
      }
    }
    x += w;
    i++;
  }
  return <g>{blds}</g>;
};

/** Diagonal rain streaks. */
export const Rain: React.FC<{ f: number; n?: number; opacity?: number; area?: [number, number, number, number] }> = ({ f, n = 90, opacity = 0.18, area = [0, 0, W, H] }) => {
  const [ax, ay, aw, ah] = area;
  return (
    <g opacity={opacity}>
      {Array.from({ length: n }, (_, i) => {
        const sp = 38 + rnd(i) * 20;
        const y = ay + (((rnd(i + 200) * ah + f * sp) % ah) + ah) % ah;
        const x = ax + ((rnd(i + 400) * aw + f * 6) % aw);
        const l = 30 + rnd(i + 600) * 40;
        return <line key={i} x1={x} y1={y} x2={x - l * 0.16} y2={y + l} stroke="#bcd0ea" strokeWidth={1.4} />;
      })}
    </g>
  );
};

/** Window with a city view inside; shows the "outside world" of the room. */
export const CityWindow: React.FC<{ x: number; y: number; w: number; h: number; f: number; lit?: number; warm?: number; dawn?: number; seed?: number; rain?: boolean }> = ({
  x,
  y,
  w,
  h,
  f,
  lit = 0.25,
  warm = 0,
  dawn = 0,
  seed = 3,
  rain = false,
}) => {
  const id = `clip-win-${x}-${y}`;
  return (
    <g>
      <clipPath id={id}>
        <rect x={x} y={y} width={w} height={h} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <rect x={x} y={y} width={w} height={h} fill="url(#nightSky)" />
        <rect x={x} y={y} width={w} height={h} fill="url(#dawnSky)" opacity={dawn} />
        <Skyline x0={x - 40} x1={x + w + 40} baseY={y + h} seed={seed + 10} maxH={h * 0.55} minH={h * 0.2} lit={lit * 0.7} warm={warm} f={f} fill="#0d1420" winScale={0.6} />
        <Skyline x0={x - 20} x1={x + w + 40} baseY={y + h} seed={seed} maxH={h * 0.8} minH={h * 0.3} lit={lit} warm={warm} f={f} fill="#060910" winScale={0.85} />
        {rain ? <Rain f={f} n={40} opacity={0.22} area={[x, y, w + 40, h]} /> : null}
      </g>
      {/* frame + mullions */}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#1a212d" strokeWidth={14} />
      <line x1={x + w / 2} x2={x + w / 2} y1={y} y2={y + h} stroke="#1a212d" strokeWidth={9} />
      <line x1={x} x2={x + w} y1={y + h * 0.42} y2={y + h * 0.42} stroke="#1a212d" strokeWidth={7} />
      <rect x={x - 18} y={y + h} width={w + 36} height={12} fill="#1d2532" />
    </g>
  );
};

/** Laptop seen from behind the user (screen facing camera). open: 0..1 */
export const Laptop: React.FC<{ x: number; y: number; w: number; open: number; children?: React.ReactNode; glow?: number; tint?: string }> = ({ x, y, w, open, children, glow = 1, tint }) => {
  const sh = w * 0.62 * open;
  const id = `lap-${x}-${y}`;
  return (
    <g>
      {open > 0.05 ? <ellipse cx={x} cy={y - sh / 2} rx={w * 1.5} ry={w * 1.1} fill={tint ? `url(#${tint})` : 'url(#glowScreen)'} opacity={glow * open} /> : null}
      <rect x={x - w / 2 - 6} y={y - sh - 6} width={w + 12} height={sh + 6} rx={8} fill="#1c222c" />
      <clipPath id={id}>
        <rect x={x - w / 2} y={y - sh} width={w} height={sh} rx={3} />
      </clipPath>
      <g clipPath={`url(#${id})`} opacity={open}>
        <rect x={x - w / 2} y={y - sh} width={w} height={sh} fill="#0d1726" />
        <g transform={`translate(${x - w / 2} ${y - sh}) scale(${w / 400} ${(sh || 1) / 248})`}>{children}</g>
      </g>
      <rect x={x - w / 2 - 22} y={y} width={w + 44} height={9} rx={4} fill="#2a313c" />
    </g>
  );
};

/** Little UI helpers drawn in a 400x248 "screen space". */
export const CodeLines: React.FC<{ f: number; n?: number; speed?: number; seed?: number; color?: string }> = ({ f, n = 14, speed = 1, seed = 1, color = '#9cc3ff' }) => {
  const shown = Math.floor(f * 0.25 * speed);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const idx = shown - n + i;
        if (idx < 0) return null;
        const ind = Math.floor(rnd(idx + seed) * 3) * 16;
        const wdt = 60 + rnd(idx + seed + 50) * 200;
        const col = rnd(idx + seed + 90) < 0.3 ? '#f3c26b' : rnd(idx + seed + 91) < 0.3 ? '#9ff0c2' : color;
        return <rect key={idx} x={20 + ind} y={18 + i * 16} width={wdt} height={6} rx={3} fill={col} opacity={0.75} />;
      })}
    </g>
  );
};
