// SCENE 4 — La discipline: rhythmic montage, the world gets brighter.
import React from 'react';
import { Cam, W, H, C, rnd, CityWindow, CodeLines } from '../kit';
import { Figure } from '../Figure';
import { lieSide, lerpPose, sitFront, typing, Pose, offset } from '../pose';
import { DeskSet, KB, SEAT, Clock } from './S2';
import { MONTAGE_CUTS as M, prog, lerp, easeInOutSine, easeInOutCubic, easeOutBack, easeOutCubic, clamp } from '../timeline.js';

export const lux = (f: number) => easeInOutSine(prog(f, M[0], M[6]));

// a) 05:00 — the alarm, he gets up
const Alarm: React.FC<{ f: number }> = ({ f }) => {
  const a = M[0];
  const GY = 1480;
  const K = 1.7;
  const BED = 44;
  const lie = lieSide(BED, 1);
  const up: Pose = {
    hip: [0, -BED - 8],
    chest: [6, -BED - 8 - 62],
    head: [14, -BED - 8 - 88],
    hL: [26, -BED - 10],
    hR: [34, -BED - 4],
    fL: [92, -BED - 6],
    fR: [90, -BED - 2],
    poleAL: [-1, 0.3],
    poleAR: [-1, 0.3],
    poleLL: [0, -1],
    poleLR: [0, -1],
  };
  const t = easeInOutCubic(prog(f, a + 18, a + 40));
  const pose = lerpPose(lie, up, t);
  const blink = Math.floor((f - a) / 8) % 2 === 0;
  const cam = easeInOutSine(prog(f, a, a + 60));
  return (
    <Cam x={445} y={lerp(1330, 1315, cam)} s={lerp(1.42, 1.5, cam)}>
      <rect x={-300} y={-200} width={1700} height={GY + 200} fill="#0a0f18" />
      <rect x={-300} y={GY} width={1700} height={800} fill="#06080d" />
      <CityWindow x={560} y={700} w={330} h={420} f={f} lit={0.15} dawn={0.18} seed={31} />
      {/* bed */}
      <rect x={260} y={GY - BED * K - 22} width={560} height={26} rx={10} fill="#18202c" />
      <rect x={260} y={GY - BED * K + 4} width={560} height={BED * K - 4} fill="#0d121b" />
      <rect x={244} y={GY - BED * K - 140} width={22} height={140 + BED * K} rx={6} fill="#141b26" />
      <rect x={280} y={GY - BED * K - 52} width={110} height={34} rx={14} fill="#222b39" />
      {/* nightstand + clock */}
      <rect x={90} y={GY - 120} width={130} height={120} fill="#111722" />
      <g transform={`translate(155 ${GY - 150})`}>
        <rect x={-62} y={-30} width={124} height={54} rx={9} fill="#090c12" stroke="#1d2431" strokeWidth={3} />
        <text x={0} y={10} textAnchor="middle" fill="#ff5a64" fontFamily="Inter700" fontSize={30} opacity={blink ? 1 : 0.35}>
          05:00
        </text>
        <ellipse cx={0} cy={0} rx={90} ry={70} fill="url(#glowRed)" opacity={blink ? 0.5 : 0.15} />
      </g>
      {/* blanket over the legs */}
      <Figure pose={pose} x={420} y={GY} k={K} side={1} />
      <path d={`M ${420 + 20 * K} ${GY - BED * K - 26} Q ${640} ${GY - BED * K - 60} ${820} ${GY - BED * K - 20} L 820 ${GY - BED * K + 4} L ${420 + 10 * K} ${GY - BED * K + 4} Z`} fill="#1d2633" />
      {/* alarm vibration lines */}
      {blink ? (
        <g stroke="#ff5a64" strokeWidth={3} opacity={0.6} fill="none">
          <path d={`M ${155 - 80} ${GY - 175} q -14 14 0 28`} />
          <path d={`M ${155 + 80} ${GY - 175} q 14 14 0 28`} />
        </g>
      ) : null}
    </Cam>
  );
};

// b) Everybody sleeps — his window is the only one still lit
const Facade: React.FC<{ f: number }> = ({ f }) => {
  const a = M[1];
  const t = easeInOutSine(prog(f, a, a + 60));
  const cols = 6;
  const rows = 9;
  const ww = 92;
  const wh = 120;
  const gx = 140;
  const gy = 165;
  const x0 = 540 - ((cols - 1) * gx) / 2;
  const y0 = 300;
  const hero = { c: 3, r: 5 };
  return (
    <Cam x={lerp(540, x0 + hero.c * gx, t * 0.7)} y={lerp(1000, y0 + hero.r * gy, t * 0.7)} s={lerp(1.0, 1.55, t)}>
      <rect x={-500} y={-600} width={2100} height={3100} fill="url(#nightSky)" />
      <circle cx={900} cy={120} r={40} fill="#e9edf3" opacity={0.9} filter="url(#figGlow)" />
      <rect x={x0 - 110} y={y0 - 130} width={(cols - 1) * gx + 220} height={rows * gy + 300} fill="#0b1019" />
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const id = r * cols + c;
          const isHero = r === hero.r && c === hero.c;
          const offAt = a + 6 + rnd(id + 7) * 48;
          const onInit = rnd(id + 3) < 0.7;
          const on = isHero || (onInit && f < offAt);
          const x = x0 + c * gx - ww / 2;
          const y = y0 + r * gy;
          return (
            <g key={id}>
              <rect x={x} y={y} width={ww} height={wh} fill={on ? (isHero ? '#bcd6ff' : C.warm) : '#121925'} opacity={on ? (isHero ? 0.95 : 0.55) : 1} />
              {isHero ? (
                <g>
                  <ellipse cx={x + ww / 2} cy={y + wh / 2} rx={140} ry={140} fill="url(#glowScreen)" />
                  <rect x={x} y={y} width={ww} height={wh} fill="#203450" opacity={0.6} />
                  <rect x={x + 54} y={y + 70} width={26} height={18} fill="#e6f0ff" />
                  <Figure pose={typing(SEAT, [16, -98], f, 1)} x={x + 38} y={y + wh + 6} k={0.42} glow={false} />
                  <rect x={x} y={y + wh - 18} width={ww} height={18} fill="#0b1019" />
                </g>
              ) : null}
              <rect x={x} y={y} width={ww} height={wh} fill="none" stroke="#070a10" strokeWidth={6} />
            </g>
          );
        }),
      )}
    </Cam>
  );
};

// c) Learning new skills
const SKILLS = [
  { t: '</>', l: 'Code', x: -250, y: -330 },
  { t: '↗', l: 'Marketing', x: 250, y: -360 },
  { t: '€', l: 'Vente', x: -300, y: -60 },
  { t: '⚙', l: 'Automatisation', x: 290, y: -90 },
  { t: '✦', l: 'Design', x: 0, y: -520 },
];
const Learn: React.FC<{ f: number }> = ({ f }) => {
  const a = M[2];
  const GY = 1560;
  const K = 2.4;
  const L = lux(f);
  const p = sitFront(SEAT, { breath: f, look: [0, 12] });
  const page = Math.floor((f - a) / 14) % 2;
  p.hL = [-26, -SEAT - 64];
  p.hR = [26, -SEAT - 64];
  p.poleAL = [-1, 0.7];
  p.poleAR = [1, 0.7];
  const bx = 540;
  const by = GY - (SEAT + 64) * K;
  const t = easeInOutSine(prog(f, a, a + 60));
  return (
    <Cam x={540} y={lerp(1180, 1160, t)} s={lerp(1.0, 1.08, t)}>
      <rect x={-300} y={-300} width={1700} height={2600} fill="#0e131c" />
      <rect x={-300} y={-300} width={1700} height={2600} fill="#3a2e1c" opacity={0.25 * L} />
      <ellipse cx={540} cy={1050} rx={620} ry={520} fill="url(#glowWarm)" opacity={0.55} />
      {/* bookshelf */}
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} x={120 + i * 22} y={700 - (i % 3) * 8} width={18} height={90 + (i % 3) * 8} fill={['#2a3448', '#3a2c26', '#26353a'][i % 3]} />
      ))}
      <rect x={100} y={790} width={330} height={10} fill="#1c2330" />
      <Figure pose={p} x={540} y={GY} k={K} />
      {/* open book */}
      <g transform={`translate(${bx} ${by})`}>
        <path d="M0 10 L-80 -6 L-80 70 L0 86 Z" fill="#e9e4d8" />
        <path d="M0 10 L80 -6 L80 70 L0 86 Z" fill="#f6f2e8" />
        {Array.from({ length: 5 }, (_, i) => (
          <line key={i} x1={-66} x2={-12} y1={10 + i * 12} y2={16 + i * 12} stroke="#9a9384" strokeWidth={3} />
        ))}
        {page ? <path d="M0 10 L60 -20 L60 50 L0 86 Z" fill="#fffaf0" opacity={0.9} /> : null}
      </g>
      {/* desk in front of him (camera side) */}
      <rect x={-100} y={GY - 120} width={1300} height={24} fill="#1a2230" />
      <rect x={-100} y={GY - 96} width={1300} height={600} fill="#0b0f16" />
      {SKILLS.map((s, i) => {
        const k = clamp((f - a - 6 - i * 8) / 10);
        const e = easeOutBack(k);
        return (
          <g key={i} transform={`translate(${540 + s.x} ${1050 + s.y + Math.sin(f * 0.08 + i) * 6}) scale(${0.3 + 0.7 * e})`} opacity={k}>
            <circle r={58} fill="#121a26" stroke={C.gold} strokeWidth={3} />
            <text y={18} textAnchor="middle" fill={C.gold} fontFamily="Inter700" fontSize={46}>
              {s.t}
            </text>
            <text y={98} textAnchor="middle" fill="#e6ebf2" fontFamily="Inter500" fontSize={30}>
              {s.l}
            </text>
          </g>
        );
      })}
    </Cam>
  );
};

// d) Building the project (screen insert)
const BLOCKS = [
  { x: 20, y: 20, w: 360, h: 26 },
  { x: 20, y: 56, w: 170, h: 90 },
  { x: 200, y: 56, w: 180, h: 40 },
  { x: 200, y: 104, w: 180, h: 42 },
  { x: 20, y: 156, w: 110, h: 50 },
  { x: 140, y: 156, w: 110, h: 50 },
  { x: 260, y: 156, w: 120, h: 50 },
];
const Build: React.FC<{ f: number }> = ({ f }) => {
  const a = M[3];
  const t = prog(f, a, a + 60);
  const progress = easeInOutCubic(prog(f, a + 4, a + 50));
  const sw = 960;
  const sh = 600;
  return (
    <g>
      <rect width={W} height={H} fill="#070a10" />
      <ellipse cx={W / 2} cy={H / 2} rx={760} ry={760} fill="url(#glowScreen)" opacity={0.7} />
      <g transform={`translate(${W / 2} ${H / 2 - 120}) scale(${lerp(1.0, 1.06, t)})`}>
        <rect x={-sw / 2 - 22} y={-sh / 2 - 22} width={sw + 44} height={sh + 44} rx={22} fill="#1c222c" />
        <g transform={`translate(${-sw / 2} ${-sh / 2}) scale(${sw / 400} ${sh / 248})`}>
          <rect width={400} height={248} fill="#0d1726" />
          {BLOCKS.map((b, i) => {
            const k = clamp((f - a - 2 - i * 5) / 8);
            return <rect key={i} x={b.x} y={b.y + (1 - easeOutCubic(k)) * 12} width={b.w} height={b.h} rx={4} fill={i === 1 ? '#3b6db3' : '#22324a'} stroke="#7fa6d9" strokeWidth={0.8} opacity={k} />;
          })}
          <rect x={20} y={222} width={360} height={10} rx={5} fill="#1c2738" />
          <rect x={20} y={222} width={360 * progress} height={10} rx={5} fill={progress >= 1 ? C.green : '#7fa6d9'} />
        </g>
      </g>
      {/* checklist */}
      {['Site web', 'Paiement', 'Lancement'].map((l, i) => {
        const k = clamp((f - a - 18 - i * 10) / 8);
        return (
          <g key={l} transform={`translate(${170} ${1330 + i * 92})`} opacity={k}>
            <circle cx={22} cy={-12} r={22} fill={C.green} opacity={0.9} />
            <path d="M11 -12 l8 8 l15 -16" stroke="#06231a" strokeWidth={5} fill="none" strokeLinecap="round" />
            <text x={66} y={0} fill="#e6ebf2" fontFamily="Inter500" fontSize={44}>
              {l}
            </text>
          </g>
        );
      })}
      <text x={W / 2} y={360} textAnchor="middle" fill="#9fb3cf" fontFamily="Inter700" fontSize={40} letterSpacing={6}>
        PROJET · V1.0 — {Math.round(progress * 100)} %
      </text>
    </g>
  );
};

// e) A setback — he refuses to stop
const Setback: React.FC<{ f: number }> = ({ f }) => {
  const a = M[4];
  const err = clamp(1 - (f - a - 4) / 18) * (f >= a + 4 ? 1 : 0);
  const back = sitFront(SEAT, { breath: f, look: [0, -10], lean: 0 });
  back.hL = [-14, -SEAT - 62 - 30];
  back.hR = [14, -SEAT - 62 - 30];
  back.poleAL = [-1, -0.3];
  back.poleAR = [1, -0.3];
  const fist = sitFront(SEAT, { breath: f, look: [0, 2] });
  fist.hL = [KB[0] - 20, KB[1] + 4];
  fist.hR = [30, -SEAT - 70];
  fist.poleAR = [1, 0.8];
  const keys: [number, Pose][] = [
    [a, typing(SEAT, KB, f, 1)],
    [a + 8, back],
    [a + 26, back],
    [a + 34, fist],
    [a + 42, fist],
    [a + 50, typing(SEAT, KB, f, 1.8)],
  ];
  let pose = keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (f >= keys[i][0]) pose = lerpPose(keys[i][1], keys[i + 1][1], easeInOutSine(prog(f, keys[i][0], keys[i + 1][0])));
  }
  if (f >= a + 50) pose = typing(SEAT, KB, f, 1.8);
  const L = lux(f);
  const t = easeInOutSine(prog(f, a, a + 60));
  return (
    <Cam x={lerp(560, 575, t)} y={1220} s={lerp(1.12, 1.2, t)} shake={[Math.sin(f * 3) * err * 6, 0]}>
      <DeskSet
        f={f}
        pose={offset(pose, {})}
        open={1}
        lux={L}
        clock="14:20"
        tint={err > 0.05 ? 'glowRed' : undefined}
        screen={
          <g>
            <CodeLines f={f - a + 120} speed={2.4} seed={19} color="#9ff0c2" />
            <rect width={400} height={248} fill="#ff4d5a" opacity={err * 0.55} />
          </g>
        }
      />
    </Cam>
  );
};

// f) Days and months fly by — morning light floods in
const MONTHS = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE'];
const Calendar: React.FC<{ f: number }> = ({ f }) => {
  const a = M[5];
  const n = M[6] - a;
  const pos = easeInOutSine(prog(f, a + 2, a + n - 10)) * (MONTHS.length - 1);
  const idx = Math.floor(pos);
  const flip = pos - idx;
  const L = lux(f);
  const sun = easeInOutSine(prog(f, a, a + n));
  return (
    <Cam x={540} y={980} s={lerp(1.0, 1.06, sun)}>
      <rect x={-300} y={-300} width={1700} height={2600} fill="#141a24" />
      <rect x={-300} y={-300} width={1700} height={2600} fill="#6a4a2a" opacity={0.3 * L} />
      {/* window with sunrise */}
      <g>
        <rect x={160} y={260} width={760} height={560} fill="url(#nightSky)" />
        <rect x={160} y={260} width={760} height={560} fill="url(#dawnSky)" opacity={0.35 + 0.65 * sun} />
        <circle cx={540} cy={lerp(900, 640, sun)} r={70} fill="#ffd79a" opacity={0.9} filter="url(#figGlow)" />
        <rect x={160} y={700} width={760} height={120} fill="#1a1f29" opacity={0.85} />
        <rect x={160} y={260} width={760} height={560} fill="none" stroke="#1d2532" strokeWidth={16} />
        <line x1={540} x2={540} y1={260} y2={820} stroke="#1d2532" strokeWidth={10} />
      </g>
      {/* sun rays into the room */}
      <polygon points="160,820 920,820 1200,1900 -120,1900" fill="#ffd08a" opacity={0.08 + 0.12 * sun} />
      {/* wall calendar */}
      <g transform="translate(540 1130)">
        <rect x={-260} y={-170} width={520} height={460} rx={14} fill="#f2efe8" />
        <rect x={-260} y={-170} width={520} height={110} rx={14} fill={C.red} opacity={0.9} />
        <circle cx={-150} cy={-170} r={10} fill="#333" />
        <circle cx={150} cy={-170} r={10} fill="#333" />
        <text y={-98} textAnchor="middle" fill="#fff" fontFamily="Inter700" fontSize={54} letterSpacing={3}>
          {MONTHS[Math.min(idx + 1, MONTHS.length - 1)]}
        </text>
        {Array.from({ length: 28 }, (_, i) => (
          <g key={i}>
            <rect x={-230 + (i % 7) * 66} y={-40 + Math.floor(i / 7) * 70} width={56} height={56} rx={6} fill="#ddd7cb" />
            {i < 20 + idx ? <path d={`M ${-224 + (i % 7) * 66} ${-34 + Math.floor(i / 7) * 70} l 44 44 M ${-180 + (i % 7) * 66} ${-34 + Math.floor(i / 7) * 70} l -44 44`} stroke="#c23a44" strokeWidth={5} opacity={0.7} /> : null}
          </g>
        ))}
        {/* page flipping */}
        {idx < MONTHS.length - 1 ? (
            <g transform={`translate(0 ${-170}) scale(1 ${Math.max(0, 1 - flip * 1.6)}) translate(0 170)`}>
              <rect x={-260} y={-170} width={520} height={460} rx={14} fill="#f7f4ee" />
              <rect x={-260} y={-170} width={520} height={110} rx={14} fill={C.red} />
              <text y={-98} textAnchor="middle" fill="#fff" fontFamily="Inter700" fontSize={54} letterSpacing={3}>
                {MONTHS[idx]}
              </text>
              {Array.from({ length: 28 }, (_, i) => (
                <rect key={i} x={-230 + (i % 7) * 66} y={-40 + Math.floor(i / 7) * 70} width={56} height={56} rx={6} fill="#ddd7cb" />
              ))}
            </g>
        ) : null}
      </g>
      <Clock x={900} y={1500} text={['06:00', '22:40', '05:30', '23:15'][Math.floor((f - a) / 8) % 4]} color={C.warm} />
    </Cam>
  );
};

export const Montage: React.FC<{ f: number }> = ({ f }) => {
  const parts = [Alarm, Facade, Learn, Build, Setback, Calendar];
  let i = 0;
  while (i < 5 && f >= M[i + 1]) i++;
  const Part = parts[i];
  const since = f - M[i];
  const flash = i > 0 ? Math.exp(-since / 3) * 0.35 : 0;
  const punch = 1 + 0.05 * Math.exp(-since / 5);
  return (
    <g>
      <g transform={`translate(${W / 2} ${H / 2}) scale(${punch}) translate(${-W / 2} ${-H / 2})`}>
        <Part f={f} />
      </g>
      <rect width={W} height={H} fill="#fff" opacity={flash} />
    </g>
  );
};

