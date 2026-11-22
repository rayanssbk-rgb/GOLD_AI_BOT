// SCENE 5 — Le résultat + SCENE 6 visuals (city pull-back).
import React from 'react';
import { Cam, W, H, C, Skyline, CityWindow } from '../kit';
import { Figure } from '../Figure';
import { sitFront, sitSide, standSide, walkSide, stand, lerpPose } from '../pose';
import { DeskSet, KB, SEAT } from './S2';
import { SHOTS, RESULT_HIT, BLACK, prog, lerp, easeInOutSine, easeInOutCubic, easeOutBack, clamp } from '../timeline.js';

/** Growing revenue chart in 400x248 screen space. */
const Chart: React.FC<{ k: number }> = ({ k }) => {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const x = 20 + i * 32;
    const v = Math.pow(i / 11, 1.8) * 150 + Math.sin(i * 1.7) * 8 + 10;
    return [x, 228 - v * clamp(k * 12 - i, 0, 1)] as [number, number];
  });
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  return (
    <g>
      <path d={`${d} L${pts[11][0]} 232 L20 232 Z`} fill={C.green} opacity={0.15} />
      <path d={d} stroke={C.green} strokeWidth={3} fill="none" />
    </g>
  );
};

const Dashboard: React.FC<{ f: number }> = ({ f }) => {
  const a = RESULT_HIT;
  const sw = 960;
  const sh = 600;
  const growth = easeInOutCubic(prog(f, a + 4, a + 56));
  const revenue = Math.round(3480 * growth);
  const t = prog(f, a, a + 64);
  const toasts = [
    { at: a + 8, txt: 'Nouvelle vente', v: '+ 49,00 €' },
    { at: a + 22, txt: 'Nouveau client', v: '+ 1' },
    { at: a + 34, txt: 'Nouvelle vente', v: '+ 129,00 €' },
  ];
  return (
    <g>
      <rect width={W} height={H} fill="#06080c" />
      <ellipse cx={W / 2} cy={H / 2} rx={900} ry={900} fill="url(#glowWarm)" opacity={0.45 + 0.3 * growth} />
      <g transform={`translate(${W / 2} ${H / 2 - 160}) scale(${lerp(1.0, 1.07, easeInOutSine(t))})`}>
        <rect x={-sw / 2 - 22} y={-sh / 2 - 22} width={sw + 44} height={sh + 44} rx={22} fill="#1c222c" />
        <g transform={`translate(${-sw / 2} ${-sh / 2}) scale(${sw / 400} ${sh / 248})`}>
          <rect width={400} height={248} fill="#0b1420" />
          <text x={20} y={30} fill="#9fb3cf" fontFamily="Inter500" fontSize={13}>
            Tableau de bord
          </text>
          <text x={20} y={66} fill="#f3f4f6" fontFamily="Inter700" fontSize={30}>
            {revenue.toLocaleString('fr-FR').replace(/ | /g, ' ')} €
          </text>
          <text x={20} y={84} fill={C.green} fontFamily="Inter500" fontSize={12}>
            ▲ Revenus du mois
          </text>
          <Chart k={growth} />
        </g>
      </g>
      {toasts.map((o, i) => {
        const k = clamp((f - o.at) / 10);
        const e = easeOutBack(k);
        return (
          <g key={i} transform={`translate(${W / 2 + (1 - e) * 500} ${1180 + i * 130})`} opacity={k}>
            <rect x={-380} y={-50} width={760} height={104} rx={26} fill="#121a24" stroke="#2c3a4c" strokeWidth={2} />
            <circle cx={-320} cy={2} r={30} fill={C.green} opacity={0.9} />
            <text x={-320} y={14} textAnchor="middle" fill="#06231a" fontFamily="Inter700" fontSize={32}>
              €
            </text>
            <text x={-270} y={14} fill="#e6ebf2" fontFamily="Inter500" fontSize={36}>
              {o.txt}
            </text>
            <text x={350} y={14} textAnchor="end" fill={C.green} fontFamily="Inter700" fontSize={36}>
              {o.v}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const Still: React.FC<{ f: number }> = ({ f }) => {
  const a = RESULT_HIT + 56;
  const pose = sitFront(SEAT, { breath: f * 0.5, look: [0, 0] });
  pose.hL = [KB[0] - 30, KB[1] + 6];
  pose.hR = [KB[0] + 10, KB[1] + 6];
  const t = easeInOutSine(prog(f, a, a + 90));
  return (
    <Cam x={lerp(560, 575, t)} y={lerp(1220, 1235, t)} s={lerp(1.08, 1.24, t)}>
      <DeskSet
        f={f}
        pose={pose}
        open={1}
        lux={1}
        dawn={0.9}
        clock="07:30"
        tint="glowWarm"
        screen={
          <g>
            <rect width={400} height={248} fill="#0b1420" />
            <text x={20} y={66} fill="#f3f4f6" fontFamily="Inter700" fontSize={30}>
              3 480 €
            </text>
            <Chart k={1} />
          </g>
        }
      />
    </Cam>
  );
};

export const Result: React.FC<{ f: number }> = ({ f }) => {
  const cross = clamp((f - (RESULT_HIT + 52)) / 10);
  return (
    <g>
      {cross < 1 ? <Dashboard f={f} /> : null}
      {cross > 0 ? (
        <g opacity={cross}>
          <Still f={f} />
        </g>
      ) : null}
    </g>
  );
};

// ------------------------------------------------------------ window
export const WindowView: React.FC<{ f: number }> = ({ f }) => {
  const [a, b] = SHOTS.window;
  const GY = 1500;
  const K = 1.6;
  const SEATS = 44;
  const k = { up0: a + 14, up1: a + 40, turn: a + 44, walk0: a + 48, walk1: a + 112, back0: a + 112, back1: a + 128 };
  const x0 = 330;
  const x1 = 700;
  let pose;
  let x = x0;
  let side = 1;
  if (f < k.up0) pose = sitSide(SEATS, -1, { look: [0, 2] });
  else if (f < k.turn) pose = lerpPose(sitSide(SEATS, -1), standSide(-1, { breath: f }), easeInOutCubic(prog(f, k.up0, k.up1)));
  else if (f < k.walk0) pose = standSide(1, { breath: f });
  else if (f < k.walk1) {
    const t = prog(f, k.walk0, k.walk1);
    x = lerp(x0, x1, easeInOutSine(t));
    const w = walkSide((f - k.walk0) * 0.26, 1, { stride: 18 });
    const blend = Math.min(prog(f, k.walk0, k.walk0 + 8), 1 - prog(f, k.walk1 - 8, k.walk1));
    pose = lerpPose(standSide(1), w, blend);
  } else {
    x = x1;
    const t = easeInOutSine(prog(f, k.back0, k.back1));
    pose = lerpPose(standSide(1, { breath: f }), stand({ breath: f, look: [0, -3] }), t);
    side = 1 - t;
  }
  const t = easeInOutSine(prog(f, a, b));
  return (
    <Cam x={lerp(540, 650, t)} y={lerp(1120, 1100, t)} s={lerp(1.0, 1.22, t)}>
      <rect x={-300} y={-300} width={1700} height={GY + 300} fill="#1a1712" />
      <rect x={-300} y={GY} width={1700} height={700} fill="#0d0c0a" />
      <CityWindow x={520} y={440} w={460} h={820} f={f} lit={0.6} warm={0.8} dawn={1} seed={55} />
      {/* warm light pouring in */}
      <polygon points={`520,1260 980,1260 1250,${GY + 400} 300,${GY + 400}`} fill="#ffcf8a" opacity={0.14} />
      <ellipse cx={750} cy={GY + 30} rx={420} ry={70} fill="url(#glowWarm)" opacity={0.7} />
      {/* desk in profile with open laptop glowing */}
      <rect x={40} y={GY - 160} width={210} height={14} fill="#2a2a2e" />
      <rect x={60} y={GY - 146} width={12} height={146} fill="#232326" />
      <rect x={220} y={GY - 146} width={12} height={146} fill="#232326" />
      <path d={`M120 ${GY - 162} L180 ${GY - 162} L160 ${GY - 250}`} stroke="#9aa5b5" strokeWidth={6} fill="none" strokeLinejoin="round" />
      <ellipse cx={175} cy={GY - 210} rx={90} ry={80} fill="url(#glowScreen)" opacity={0.6} />
      {/* chair */}
      <rect x={x0 - 40} y={GY - SEATS * K - 6} width={90} height={12} rx={4} fill="#2a2a2e" />
      <rect x={x0 + 40} y={GY - SEATS * K - 110} width={12} height={116} rx={4} fill="#2a2a2e" />
      <rect x={x0 - 2} y={GY - SEATS * K + 6} width={8} height={SEATS * K - 6} fill="#232326" />
      <g transform={`translate(0 ${2 * GY}) scale(1 -1)`} opacity={0.16} filter="url(#reflBlur)">
        <Figure pose={pose} x={x} y={GY} k={K} side={side} glow={false} />
      </g>
      <Figure pose={pose} x={x} y={GY} k={K} side={side} />
    </Cam>
  );
};

// ------------------------------------------------------------ city pull-back
export const City: React.FC<{ f: number }> = ({ f }) => {
  const [a] = SHOTS.city;
  const t = easeInOutSine(prog(f, a, BLACK));
  const dark = easeInOutSine(prog(f, BLACK - 56, BLACK));
  const GY = 1560;
  return (
    <g>
      <Cam x={540} y={lerp(1300, 1000, t)} s={lerp(2.1, 1.0, t)}>
        <rect x={-600} y={-600} width={2300} height={3200} fill="url(#nightSky)" />
        <rect x={-600} y={700} width={2300} height={700} fill="url(#dawnSky)" opacity={0.45} />
        <circle cx={820} cy={330} r={34} fill="#eef2f7" filter="url(#figGlow)" opacity={0.9} />
        <Skyline x0={-500} x1={1600} baseY={1290} seed={71} maxH={720} minH={260} lit={0.5} warm={0.7} f={f} fill="#0c1220" winScale={0.8} />
        <Skyline x0={-520} x1={1620} baseY={1330} seed={93} maxH={560} minH={200} lit={0.6} warm={0.8} f={f} fill="#070b13" winScale={1} />
        {/* river with light reflections */}
        <rect x={-600} y={1330} width={2300} height={250} fill="#05080e" />
        {Array.from({ length: 60 }, (_, i) => {
          const x = -400 + ((i * 97) % 1900);
          const y = 1345 + ((i * 53) % 200);
          return <rect key={i} x={x + Math.sin(f * 0.05 + i) * 6} y={y} width={30 + (i % 5) * 12} height={3} fill={i % 3 ? C.warm : '#cfe0ff'} opacity={0.25 + 0.2 * Math.sin(f * 0.09 + i)} />;
        })}
        {/* rooftop */}
        <rect x={-600} y={GY} width={2300} height={900} fill="#040508" />
        <rect x={-600} y={GY - 6} width={2300} height={8} fill="#1b2230" />
        <Figure pose={stand({ breath: f, look: [0, -2] })} x={540} y={GY - 4} k={1.15} />
        <ellipse cx={540} cy={GY} rx={60} ry={8} fill="#000" opacity={0.8} filter="url(#blur4)" />
      </Cam>
      {/* darken the sky area so the moral text stays readable */}
      <rect width={W} height={1300} fill="url(#textShade)" />
      <rect width={W} height={H} fill="#000" opacity={dark} />
    </g>
  );
};

