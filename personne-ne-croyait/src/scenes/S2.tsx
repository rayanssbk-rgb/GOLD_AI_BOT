// SCENE 2 — Les moqueries: night street, two mockers; back home he opens his laptop.
import React from 'react';
import { Cam, C, Skyline, Rain, Laptop, CodeLines, CityWindow } from '../kit';
import { Figure } from '../Figure';
import { walkSide, standSide, laughSide, pointSide, lerpPose, typing, sitFront, Pose } from '../pose';
import { SHOTS, prog, lerp, easeInOutSine, easeInOutCubic, clamp } from '../timeline.js';

const SGY = 1460;
const SK = 1.25;

const Lamp: React.FC<{ x: number; f: number; on?: number }> = ({ x, f, on = 1 }) => (
  <g>
    <polygon points={`${x - 22},${SGY - 470} ${x + 22},${SGY - 470} ${x + 190},${SGY} ${x - 190},${SGY}`} fill="#ffdca3" opacity={0.06 * on} />
    <ellipse cx={x} cy={SGY + 8} rx={210} ry={26} fill="#ffdca3" opacity={0.12 * on} filter="url(#blur10)" />
    <rect x={x - 4} y={SGY - 500} width={8} height={500} fill="#151b25" />
    <rect x={x - 26} y={SGY - 506} width={52} height={12} rx={4} fill="#1c2330" />
    <ellipse cx={x} cy={SGY - 490} rx={30} ry={10} fill="#ffe2b0" opacity={0.9 * on * (0.95 + 0.05 * Math.sin(f * 0.6))} filter="url(#blur4)" />
  </g>
);

export function heroStreet(f: number) {
  const [a] = SHOTS.street;
  const x = 200 + (f - a) * 6.3;
  const passing = clamp(1 - Math.abs(x - 720) / 220);
  return { x, pose: walkSide((f - a) * 0.33, 1, { headDown: 6 + 8 * passing, lean: 3 }) };
}

export const Street: React.FC<{ f: number }> = ({ f }) => {
  const [a, b] = SHOTS.street;
  const hero = heroStreet(f);
  const camX = clamp(hero.x + 120, 540, 980);
  const camS = lerp(1.04, 1.1, easeInOutSine(prog(f, a, b)));
  // mockers: A (left, initially facing right to chat), B (right, facing left)
  const AX = 690;
  const BX = 770;
  const notice = easeInOutCubic(prog(f, a + 18, a + 30));
  const mock = prog(f, a + 26, a + 36);
  let A: Pose;
  if (f < a + 24) A = standSide(1, { breath: f, look: [0, Math.sin(f * 0.2) * 2] });
  else {
    // turns around toward the hero
    A = lerpPose(standSide(-1, { breath: f }), laughSide(-1, f, 1), mock);
  }
  const B = f < a + 20 ? standSide(-1, { breath: f, look: [-2, 0] }) : lerpPose(standSide(-1, { breath: f }), pointSide(-1, f, 1), notice);
  // after he passes, they turn to keep watching him
  const after = hero.x > BX + 60;
  const Bp = after ? laughSide(1, f, 1) : B;
  const Ap = after ? laughSide(1, f, 0.8) : A;
  const haha = mock > 0 ? clamp(Math.sin(((f - a - 26) / 60) * Math.PI)) : 0;
  return (
    <Cam x={camX} y={1180} s={camS}>
      <rect x={-200} y={-400} width={2400} height={SGY + 400} fill="url(#nightSky)" />
      <Skyline x0={-200} x1={2200} baseY={SGY - 120} seed={21} maxH={900} minH={300} lit={0.12} f={f} fill="#0b111b" winScale={1} />
      <Skyline x0={-260} x1={2200} baseY={SGY} seed={42} maxH={620} minH={260} lit={0.18} f={f} fill="#070a11" winScale={1.2} />
      {/* wet street */}
      <rect x={-200} y={SGY} width={2400} height={700} fill="#06080c" />
      <rect x={-200} y={SGY} width={2400} height={3} fill="#2a3444" />
      <g transform={`translate(0 ${2 * SGY}) scale(1 -1)`} opacity={0.22} filter="url(#reflBlur)">
        <Lamp x={680} f={f} />
        <Lamp x={1500} f={f} />
        <Figure pose={Ap} x={AX} y={SGY} k={SK} side={1} glow={false} />
        <Figure pose={Bp} x={BX} y={SGY} k={SK} side={1} glow={false} />
        <Figure pose={hero.pose} x={hero.x} y={SGY} k={SK} side={1} glow={false} />
      </g>
      <Lamp x={680} f={f} />
      <Lamp x={1500} f={f} />
      <Figure pose={Ap} x={AX} y={SGY} k={SK} side={1} fill="#c9ced6" far="#8f96a1" />
      <Figure pose={Bp} x={BX} y={SGY} k={SK} side={1} fill="#c9ced6" far="#8f96a1" />
      {/* "ha ha" */}
      {[0, 1, 2].map((i) => (
        <text
          key={i}
          x={(i === 1 ? BX : AX) + (i - 1) * 30 + 10}
          y={SGY - 290 - ((f - a - 26 - i * 8) * 1.2)}
          fill="#c9ced6"
          fontFamily="Inter500"
          fontStyle="italic"
          fontSize={42}
          opacity={haha * clamp((f - a - 26 - i * 8) / 6) * 0.7}
        >
          ha ha
        </text>
      ))}
      {/* the hero walks past, closer to camera */}
      <Figure pose={hero.pose} x={hero.x} y={SGY + 24} k={SK * 1.05} side={1} />
      <Rain f={f} n={110} opacity={0.14} area={[camX - 700, 0, 1500, 1920]} />
    </Cam>
  );
};

// ---------------------------------------------------------------- home desk
export const DGY = 1650; // figure origin (hidden below the chair)
export const DK = 2.3;
export const HX = 410;
export const LX = 580;
export const DESK = 1418;
export const SEAT = 50;
export const KB: [number, number] = [(LX - 70 - HX) / DK, -SEAT - 50];

export const Clock: React.FC<{ x: number; y: number; text: string; color?: string }> = ({ x, y, text, color = '#ff5a64' }) => (
  <g>
    <rect x={x - 70} y={y - 34} width={140} height={60} rx={10} fill="#0a0d13" stroke="#1d2431" strokeWidth={3} />
    <text x={x} y={y + 12} textAnchor="middle" fill={color} fontFamily="Inter700" fontSize={34} opacity={0.9}>
      {text}
    </text>
  </g>
);

export const DeskSet: React.FC<{
  f: number;
  pose: Pose;
  open: number;
  screen: React.ReactNode;
  clock: string;
  lux?: number; // 0 dark night .. 1 bright morning
  photoGlow?: number;
  dawn?: number;
  tint?: string;
  behind?: boolean;
}> = ({ f, pose, open, screen, clock, lux = 0, photoGlow = 0, dawn = 0, tint, behind = false }) => (
  <g>
    <rect x={-400} y={-300} width={1900} height={2400} fill={C.wallDark} />
    <rect x={-400} y={-300} width={1900} height={2400} fill="#3a3020" opacity={lux * 0.35} />
    <CityWindow x={640} y={560} w={380} h={560} f={f} lit={0.25 + lux * 0.3} warm={lux} dawn={dawn} seed={8} rain={lux < 0.3} />
    {/* photo of his goal */}
    <g>
      <rect x={150} y={760} width={210} height={160} fill="#0d121a" stroke="#2a3240" strokeWidth={8} />
      <g opacity={0.35 + 0.65 * photoGlow}>
        <rect x={158} y={768} width={194} height={144} fill="#2d3f5c" />
        <rect x={158} y={850} width={194} height={62} fill="#2f7fb0" />
        <circle cx={300} cy={830} r={26} fill="#ffcf8a" />
        <rect x={180} y={812} width={80} height={44} fill="#eef1f5" />
        <polygon points="172,814 220,786 268,814" fill="#dfe4ea" />
        <rect x={200} y={826} width={16} height={14} fill="#ffd28c" />
        <rect x={228} y={826} width={16} height={14} fill="#ffd28c" />
      </g>
      <rect x={196} y={936} width={120} height={36} fill="#f3e38a" opacity={0.75 + 0.25 * photoGlow} transform="rotate(-3 256 954)" />
      <text x={256} y={962} textAnchor="middle" fill="#3a2f10" fontFamily="Inter700" fontSize={20} transform="rotate(-3 256 954)">
        OBJECTIF
      </text>
      <ellipse cx={255} cy={840} rx={220} ry={180} fill="url(#glowWarm)" opacity={photoGlow * 0.8} />
    </g>
    <Clock x={455} y={640} text={clock} color={lux > 0.5 ? '#ffd18a' : '#ff5a64'} />
    {/* desk */}
    <rect x={-100} y={DESK} width={1300} height={26} fill="#161c26" />
    <rect x={-100} y={DESK + 26} width={1300} height={600} fill="#0a0d13" />
    <rect x={-100} y={DESK} width={1300} height={2} fill="#2c3646" />
    {/* desk lamp */}
    <g opacity={0.3 + lux * 0.7}>
      <rect x={880} y={DESK - 8} width={70} height={10} rx={4} fill="#222a36" />
      <path d={`M915 ${DESK - 8} L885 ${DESK - 150} L950 ${DESK - 210}`} stroke="#222a36" strokeWidth={8} fill="none" />
      <path d={`M930 ${DESK - 228} L990 ${DESK - 190} L960 ${DESK - 170} Z`} fill="#2a3240" />
      <ellipse cx={940} cy={DESK - 40} rx={260} ry={200} fill="url(#glowWarm)" opacity={lux} />
    </g>
    <Laptop x={LX} y={DESK} w={380} open={open} glow={1} tint={tint}>
      {screen}
    </Laptop>
    {/* him, from behind */}
    <Figure pose={pose} x={HX} y={DGY} k={DK} handsBehindHead={behind} />
    {/* chair back in the foreground */}
    <rect x={HX - 130} y={DGY - 118} width={260} height={520} rx={40} fill="#0d1118" stroke="#1e2633" strokeWidth={4} />
    <rect x={HX - 130} y={DGY - 118} width={260} height={10} rx={5} fill="#2b3444" opacity={0.6} />
  </g>
);

export const Desk: React.FC<{ f: number }> = ({ f }) => {
  const [a, b] = SHOTS.desk;
  // sits down already, opens the laptop, starts typing
  const open = easeInOutCubic(prog(f, a + 22, a + 50));
  const wait = sitFront(SEAT, { breath: f, look: [0, 2] });
  wait.hL = [KB[0] - 30, KB[1] + 6];
  wait.hR = [KB[0] + 12, KB[1] - 30 + 30 * open];
  const pose = f < a + 54 ? wait : lerpPose(wait, typing(SEAT, KB, f), easeInOutSine(prog(f, a + 54, a + 66)));
  const t = easeInOutSine(prog(f, a, b));
  return (
    <Cam x={lerp(560, 580, t)} y={lerp(1180, 1210, t)} s={lerp(1.0, 1.1, t)}>
      <DeskSet f={f} pose={pose} open={open} clock="23:58" screen={<CodeLines f={Math.max(0, f - a - 54)} speed={1.4} />} />
    </Cam>
  );
};
