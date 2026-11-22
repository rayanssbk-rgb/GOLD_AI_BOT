import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {
  WIDTH,
  HEIGHT,
  GY,
  WALL_TOP,
  RED_X,
  T,
  clamp,
  lerp,
  prog,
  easeInOutSine,
  easeInOutCubic,
  easeOutCubic,
} from './timeline.js';
import { Figure } from './Figure';
import { Ladder } from './Ladder';
import { fig1Pose, fig2Pose, redLadder, whiteLadder } from './characters';
import type { Pose } from './pose';

// deterministic pseudo random
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const STARS = Array.from({ length: 90 }, (_, i) => ({
  x: rnd(i) * 1900 - 400,
  y: rnd(i + 100) * 1000 - 560,
  r: 0.6 + rnd(i + 200) * 1.5,
  p: rnd(i + 300) * 6.28,
  s: 0.04 + rnd(i + 400) * 0.08,
}));

const MOTES = Array.from({ length: 46 }, (_, i) => ({
  x: rnd(i + 500) * 1500 - 200,
  y: rnd(i + 600) * 1400 + 300,
  r: 0.8 + rnd(i + 700) * 2,
  v: 0.12 + rnd(i + 800) * 0.35,
  p: rnd(i + 900) * 6.28,
}));

const DUST = Array.from({ length: 34 }, (_, i) => ({
  x: RED_X - 60 - rnd(i + 1000) * 900,
  vx: (rnd(i + 1100) - 0.5) * 3,
  vy: -0.6 - rnd(i + 1200) * 2.4,
  r: 3 + rnd(i + 1300) * 9,
}));

const MOON: [number, number] = [905, 215];

function camera(f: number) {
  // wide, slowly breathing push-in, then an upward crane onto the climber
  const s0 = 1 + 0.05 * easeInOutSine(prog(f, 0, 340));
  const fy0 = 960 + 22 * easeInOutSine(prog(f, 0, 340));
  const t = easeInOutCubic(prog(f, 340, 450));
  let s = lerp(s0, 1.55, t);
  let fx = lerp(540, 812, t);
  let fy = lerp(fy0, 590, t);
  if (f > 450) {
    const d = prog(f, 450, T.black);
    s += 0.07 * easeInOutSine(d);
    fy -= 10 * d;
  }
  // shakes
  let sx = 0;
  let sy = 0;
  if (f >= T.slipStart && f < T.fig1Land) {
    const a = 1.6 * prog(f, T.slipStart, T.fig1Land);
    sx += Math.sin(f * 2.1) * a;
    sy += Math.cos(f * 1.7) * a;
  }
  if (f >= T.ladderThud) {
    const a = 11 * Math.exp(-(f - T.ladderThud) / 5);
    sx += Math.sin(f * 3.3) * a * 0.5;
    sy += Math.sin(f * 4.1) * a;
  }
  if (f >= T.fig1Land && f < T.fig1Land + 10) {
    const a = 4 * Math.exp(-(f - T.fig1Land) / 3);
    sy += Math.sin(f * 4.4) * a;
  }
  return `translate(${WIDTH / 2 + sx} ${HEIGHT / 2 + sy}) scale(${s}) translate(${-fx} ${-fy})`;
}

const FONT_FAMILY = 'Cormorant Garamond Local';

function useFont() {
  const [handle] = useState(() => delayRender('font'));
  useEffect(() => {
    const ff = new FontFace(FONT_FAMILY, `url(${staticFile('CormorantGaramond-Medium.woff2')}) format('woff2')`, {
      weight: '300 700',
    });
    ff.load()
      .then((loaded) => {
        (document.fonts as unknown as { add: (f: FontFace) => void }).add(loaded);
        continueRender(handle);
      })
      .catch((err) => {
        console.error(err);
        continueRender(handle);
      });
  }, [handle]);
}

const LINE1 = ['« Ne cherche pas', 'à aller plus vite', 'que les autres.'];
const LINE2 = ['Assure-toi simplement', 'de ne pas tomber. »'];

const Words: React.FC<{ rows: string[]; start: number; f: number; stagger: number }> = ({ rows, start, f, stagger }) => {
  let idx = 0;
  return (
    <>
      {rows.map((row, r) => (
        <div key={r}>
          {row.split(' ').map((w) => {
        const i = idx++;
        const t = clamp((f - start - i * stagger) / 16);
        const e = easeOutCubic(t);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginRight: '0.26em',
              opacity: e,
              filter: `blur(${(1 - e) * 9}px)`,
              transform: `translateY(${(1 - e) * 14}px)`,
            }}
          >
            {w}
          </span>
        );
          })}
        </div>
      ))}
    </>
  );
};

export const DeuxEchelles: React.FC = () => {
  useFont();
  const f = useCurrentFrame();

  const red = redLadder(f);
  const white = whiteLadder(f);
  const p1 = fig1Pose(f);
  const p2 = fig2Pose(f);

  const fadeIn = 1 - easeInOutSine(prog(f, 0, 26));
  const fadeOut = easeInOutSine(prog(f, T.fadeOutStart, T.black));
  const sceneVisible = f < T.black + 1;

  // light flicker barely perceptible
  const lamp = 0.9 + 0.1 * Math.sin(f * 0.07) * Math.sin(f * 0.031);
  const wallShadowRed = 0.5 * Math.abs(Math.cos((red.angle * Math.PI) / 180));
  const wallShadowWhite = 0.5 * Math.abs(Math.cos((white.angle * Math.PI) / 180));

  const contact = (p: Pose, groundY: number) => {
    const low = Math.max(p.fL[1], p.fR[1]);
    const near = clamp(1 - Math.abs(groundY - low) / 60);
    return near;
  };
  const p2Ground = f >= T.fig2OnTop - 6 ? WALL_TOP : GY;

  const figures = (fill: string, filt?: string) => (
    <>
      <Figure pose={p1} fill={fill} filter={filt} />
      <Figure pose={p2} fill={fill} filter={filt} />
    </>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Audio src={staticFile('soundtrack.wav')} />
      {sceneVisible ? (
        <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#020304" />
              <stop offset="0.7" stopColor="#0a0e14" />
              <stop offset="1" stopColor="#141a22" />
            </linearGradient>
            <radialGradient id="moonHalo">
              <stop offset="0" stopColor="#dfe6ee" stopOpacity="0.35" />
              <stop offset="0.25" stopColor="#9fb0c2" stopOpacity="0.12" />
              <stop offset="1" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#17191d" />
              <stop offset="0.5" stopColor="#101114" />
              <stop offset="1" stopColor="#0a0a0c" />
            </linearGradient>
            <radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.11" />
              <stop offset="0.6" stopColor="#ffffff" stopOpacity="0.03" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0c0d10" />
              <stop offset="0.4" stopColor="#060607" />
              <stop offset="1" stopColor="#020202" />
            </linearGradient>
            <linearGradient id="reflFade" x1="0" y1={GY} x2="0" y2={GY + 380} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="reflMask" maskUnits="userSpaceOnUse" x="-2000" y={GY} width="5000" height="800">
              <rect x="-2000" y={GY} width="5000" height="800" fill="url(#reflFade)" />
            </mask>
            <radialGradient id="vignette" cx="0.5" cy="0.47" r="0.75">
              <stop offset="0.45" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.92" />
            </radialGradient>
            <linearGradient id="redRail" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#d4202f" />
              <stop offset="1" stopColor="#7d0d16" />
            </linearGradient>
            <linearGradient id="whiteRail" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#a9abaf" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
              <feComponentTransfer in="b" result="b2">
                <feFuncA type="linear" slope="0.45" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="b2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="moonGlow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="14" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
            <filter id="softer" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="22" />
            </filter>
            <filter id="reflBlur" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="2.4 5" />
            </filter>
            <filter id="grain" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 12} stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <clipPath id="aboveGround">
              <rect x="-2000" y="-2000" width="5000" height={GY + 2000} />
            </clipPath>
          </defs>

          <g transform={camera(f)}>
            <g id="world">
              {/* sky */}
              <rect x="-2000" y="-1400" width="5000" height={WALL_TOP + 1400} fill="url(#sky)" />
              {STARS.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#dfe7f0" opacity={0.25 + 0.35 * (0.5 + 0.5 * Math.sin(f * s.s + s.p))} />
              ))}
              <circle cx={MOON[0]} cy={MOON[1]} r={420} fill="url(#moonHalo)" />
              <circle cx={MOON[0]} cy={MOON[1]} r={44} fill="#f1eee6" filter="url(#moonGlow)" opacity={0.95} />
              <circle cx={MOON[0] + 14} cy={MOON[1] - 9} r={40} fill="#0b0f15" opacity={0.08} />
              {/* drifting clouds */}
              <ellipse cx={(f * 0.6) % 2200 - 500} cy={250} rx={420} ry={22} fill="#9aa8b8" opacity={0.07} filter="url(#softer)" />
              <ellipse cx={1500 - ((f * 0.35) % 2400)} cy={140} rx={520} ry={16} fill="#9aa8b8" opacity={0.05} filter="url(#softer)" />
              <ellipse cx={540} cy={WALL_TOP - 10} rx={1400} ry={40} fill="#5d6b7a" opacity={0.12} filter="url(#softer)" />

              {/* the immense wall */}
              <rect x="-2000" y={WALL_TOP} width="5000" height={GY - WALL_TOP} fill="url(#wall)" />
              {Array.from({ length: 9 }, (_, r) => (
                <line key={'h' + r} x1="-2000" x2="3000" y1={WALL_TOP + 120 * (r + 1)} y2={WALL_TOP + 120 * (r + 1)} stroke="#ffffff" strokeOpacity={0.025} strokeWidth={2} />
              ))}
              {Array.from({ length: 9 }, (_, r) =>
                Array.from({ length: 14 }, (_, c) => {
                  const x = -600 + c * 240 + (r % 2) * 120;
                  return (
                    <line key={`v${r}-${c}`} x1={x} x2={x} y1={WALL_TOP + 120 * r} y2={WALL_TOP + 120 * (r + 1)} stroke="#ffffff" strokeOpacity={0.018} strokeWidth={2} />
                  );
                }),
              )}
              {/* moonlit coping */}
              <rect x="-2000" y={WALL_TOP - 12} width="5000" height={16} fill="#1d2026" />
              <rect x="-2000" y={WALL_TOP - 12} width="5000" height={2} fill="#c9d3de" opacity={0.35} />
              {/* soft front lamp pool on the wall */}
              <ellipse cx={560} cy={1260} rx={760} ry={640} fill="url(#pool)" opacity={lamp} />

              {/* cast shadows on the wall (light from front-left) */}
              <g clipPath="url(#aboveGround)" filter="url(#soft)" transform="translate(18 9)">
                <g opacity={wallShadowRed}>
                  <Ladder state={red} rail="" rung="" flat="#000" />
                </g>
                <g opacity={wallShadowWhite}>
                  <Ladder state={white} rail="" rung="" flat="#000" />
                </g>
                <g opacity={0.55}>{figures('#000')}</g>
              </g>

              {/* ladders */}
              <Ladder state={red} rail="url(#redRail)" rung="#a8141f" highlight="#ff6b74" />
              <Ladder state={white} rail="url(#whiteRail)" rung="#d8d9dc" highlight="#ffffff" />

              {/* characters */}
              {figures('#f2f2f0', 'url(#glow)')}
            </g>

            {/* reflective floor */}
            <rect x="-2000" y={GY} width="5000" height="1400" fill="url(#floor)" />
            <g mask="url(#reflMask)" filter="url(#reflBlur)" opacity={0.75}>
              <g transform={`translate(0 ${2 * GY}) scale(1 -1)`}>
                <use href="#world" />
              </g>
            </g>
            <rect x="-2000" y={GY} width="5000" height="1.5" fill="#ffffff" opacity={0.08} />
            <ellipse cx={560} cy={GY + 60} rx={700} ry={90} fill="url(#pool)" opacity={lamp * 0.9} />

            {/* contact shadows */}
            <ellipse cx={(p1.fL[0] + p1.fR[0]) / 2} cy={GY + 3} rx={42} ry={7} fill="#000" opacity={0.8 * contact(p1, GY)} filter="url(#soft)" />
            <ellipse cx={(p2.fL[0] + p2.fR[0]) / 2} cy={p2Ground + 3} rx={42} ry={7} fill="#000" opacity={0.8 * contact(p2, p2Ground)} filter="url(#soft)" />

            {/* dust from the fallen ladder */}
            {f >= T.ladderThud
              ? DUST.map((d, i) => {
                  const t = f - T.ladderThud;
                  const life = clamp(1 - t / 70);
                  return (
                    <circle
                      key={i}
                      cx={d.x + d.vx * t}
                      cy={GY - 6 + d.vy * t * (1 - t / 160)}
                      r={d.r * (1 + t / 30)}
                      fill="#c9c9c9"
                      opacity={0.18 * life * life}
                      filter="url(#soft)"
                    />
                  );
                })
              : null}

            {/* floating motes & ground mist */}
            {MOTES.map((m, i) => {
              const y = ((m.y - f * m.v) % 1500 + 1500) % 1500 + 200;
              return (
                <circle key={i} cx={m.x + Math.sin(f * 0.02 + m.p) * 14} cy={y} r={m.r} fill="#fff" opacity={0.06 + 0.1 * (0.5 + 0.5 * Math.sin(f * 0.05 + m.p))} />
              );
            })}
            <ellipse cx={200 + Math.sin(f * 0.01) * 120} cy={GY - 10} rx={700} ry={70} fill="#8e9aa8" opacity={0.07} filter="url(#softer)" />
            <ellipse cx={900 - Math.sin(f * 0.012) * 140} cy={GY + 20} rx={650} ry={60} fill="#8e9aa8" opacity={0.06} filter="url(#softer)" />
          </g>

          {/* cinematic finishing */}
          <rect width={WIDTH} height={HEIGHT} fill="url(#vignette)" />
          <rect width={WIDTH} height={HEIGHT} filter="url(#grain)" opacity={0.06} />
          <rect width={WIDTH} height={HEIGHT} fill="#000" opacity={Math.max(fadeIn, fadeOut)} />
        </svg>
      ) : null}

      {f >= T.text1 - 2 ? (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 80px' }}>
          <div
            style={{
              fontFamily: `'${FONT_FAMILY}', 'Cormorant Garamond', Georgia, serif`,
              color: '#f4f4f2',
              fontSize: 76,
              lineHeight: 1.28,
              textAlign: 'center',
              letterSpacing: '0.01em',
              textShadow: '0 0 24px rgba(255,255,255,0.25)',
              transform: `scale(${1 + 0.035 * easeInOutSine(prog(f, T.text1, 600))})`,
            }}
          >
            <div style={{ marginBottom: 46 }}>
              <Words rows={LINE1} start={T.text1} f={f} stagger={3} />
            </div>
            <div>
              <Words rows={LINE2} start={T.text2} f={f} stagger={3.5} />
            </div>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
