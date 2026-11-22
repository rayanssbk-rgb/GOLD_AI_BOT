// SCENE 1 — Le rêve: dark room, phone feed of luxury, almost-empty bank account.
import React from 'react';
import { Cam, CityWindow, C, W, H } from '../kit';
import { Figure } from '../Figure';
import { holdPhone, lerpPose } from '../pose';
import { SHOTS, prog, lerp, easeInOutSine, easeInOutCubic, clamp } from '../timeline.js';

const GY = 1520;
const K = 2.15;
const SEAT = 46; // local seat height
const HX = 430;

export const Room: React.FC<{ f: number; mode: 'phone' | 'bow' }> = ({ f, mode }) => {
  // camera: slow push-in (phone) / closer, slow drift (bow)
  const t = mode === 'phone' ? easeInOutSine(prog(f, SHOTS.room[0], SHOTS.room[1])) : easeInOutSine(prog(f, SHOTS.bow[0], SHOTS.bow[1]));
  const cam = mode === 'phone' ? { x: lerp(540, 500, t), y: lerp(1060, 1120, t), s: lerp(1.0, 1.15, t) } : { x: lerp(470, 455, t), y: lerp(1250, 1270, t), s: lerp(1.42, 1.52, t) };

  let pose;
  let phoneGlow = 1;
  if (mode === 'phone') {
    pose = holdPhone(SEAT, f, f * 0.5);
  } else {
    const k = easeInOutCubic(prog(f, SHOTS.bow[0] + 4, SHOTS.bow[1] - 6));
    pose = lerpPose(holdPhone(SEAT, f, 0), holdPhone(SEAT, f, 0, 1), k);
    phoneGlow = 1 - 0.6 * k;
  }
  // phone position in world (between the hands)
  const ph: [number, number] = [HX + ((pose.hL[0] + pose.hR[0]) / 2) * K, GY + ((pose.hL[1] + pose.hR[1]) / 2) * K - 14];
  const flick = 0.85 + 0.15 * Math.sin(f * 0.9) * Math.sin(f * 0.37);

  return (
    <Cam x={cam.x} y={cam.y} s={cam.s}>
      {/* back wall + floor */}
      <rect x={-500} y={-200} width={2100} height={GY + 200} fill={C.wallDark} />
      <rect x={-500} y={GY} width={2100} height={800} fill={C.floor} />
      <rect x={-500} y={GY} width={2100} height={2} fill="#1a2230" />
      {/* window with rainy city */}
      <CityWindow x={600} y={560} w={330} h={430} f={f} lit={0.22} rain seed={5} />
      {/* cold moonlight patch from the window */}
      <polygon points={`600,990 930,990 1060,${GY} 560,${GY}`} fill="#9db8dc" opacity={0.045} />
      <ellipse cx={780} cy={GY + 40} rx={260} ry={40} fill="#9db8dc" opacity={0.05} filter="url(#blur10)" />
      {/* small poster frame on the wall (empty dreams) */}
      <rect x={140} y={760} width={150} height={110} fill="none" stroke="#1b2230" strokeWidth={6} />
      {/* bed */}
      <rect x={110} y={GY - SEAT * K - 26} width={560} height={30} rx={10} fill="#2a3548" />
      <rect x={110} y={GY - SEAT * K + 2} width={560} height={SEAT * K - 2} fill="#141b27" />
      <rect x={96} y={GY - SEAT * K - 150} width={22} height={150 + SEAT * K} rx={6} fill="#121823" />
      <rect x={130} y={GY - SEAT * K - 62} width={120} height={40} rx={16} fill="#1a2230" />
      {/* the dreamer */}
      <Figure pose={pose} x={HX} y={GY} k={K} />
      {/* phone: back side faces camera, light spills on him */}
      <ellipse cx={ph[0]} cy={ph[1] - 40} rx={260} ry={300} fill="url(#glowScreen)" opacity={0.9 * phoneGlow * flick} />
      <rect x={ph[0] - 17} y={ph[1] - 30} width={34} height={60} rx={7} fill="#1d2430" stroke="#3a4558" strokeWidth={2} />
      {/* floor reflection of the figure */}
      <g transform={`translate(0 ${2 * GY}) scale(1 -1)`} opacity={0.12} filter="url(#reflBlur)">
        <Figure pose={pose} x={HX} y={GY} k={K} glow={false} />
      </g>
    </Cam>
  );
};

// ---------------------------------------------------------------- phone UI
const PW = 600;
const PHH = 1180;

const Car: React.FC = () => (
  <g>
    <rect width={520} height={300} fill="#1b2738" />
    <circle cx={420} cy={70} r={36} fill="#f3c26b" opacity={0.9} />
    <rect y={230} width={520} height={70} fill="#0f1621" />
    <path d="M70 230 L110 180 Q170 140 260 140 Q350 140 400 180 L455 200 Q470 205 470 230 Z" fill="#e8ecf2" />
    <path d="M140 182 Q190 152 255 152 L300 152 L330 182 Z" fill="#1b2738" />
    <circle cx={150} cy={232} r={26} fill="#0b0f15" stroke="#9aa5b5" strokeWidth={6} />
    <circle cx={390} cy={232} r={26} fill="#0b0f15" stroke="#9aa5b5" strokeWidth={6} />
  </g>
);
const Villa: React.FC = () => (
  <g>
    <rect width={520} height={300} fill="#24324a" />
    <circle cx={110} cy={80} r={40} fill="#ffcf8a" opacity={0.85} />
    <rect x={150} y={120} width={300} height={110} fill="#e9edf3" />
    <rect x={120} y={110} width={360} height={14} fill="#cfd6e0" />
    <rect x={180} y={150} width={60} height={50} fill="#ffd28c" />
    <rect x={260} y={150} width={60} height={50} fill="#ffd28c" />
    <rect x={340} y={150} width={80} height={80} fill="#ffd28c" />
    <rect y={240} width={520} height={60} fill="#3d8fd1" opacity={0.85} />
    <rect y={230} width={520} height={10} fill="#d9dee6" />
  </g>
);
const Travel: React.FC = () => (
  <g>
    <rect width={520} height={300} fill="#3a5a80" />
    <rect y={180} width={520} height={120} fill="#2a83b8" />
    <rect y={250} width={520} height={50} fill="#e8d3a6" />
    <circle cx={380} cy={120} r={44} fill="#ffe2a8" />
    <path d="M90 250 Q100 170 120 120" stroke="#13202e" strokeWidth={9} fill="none" />
    <path d="M120 120 q-40 -10 -70 10 M120 120 q40 -20 70 0 M120 120 q-20 -30 -50 -40 M120 120 q30 -30 60 -30" stroke="#13202e" strokeWidth={8} fill="none" strokeLinecap="round" />
    <path d="M250 70 l60 10 l20 -14 l8 4 l-12 16 l40 8 l-4 6 l-46 -2 l-22 18 l-8 -2 l12 -20 l-50 -10 z" fill="#f2f2f2" />
  </g>
);

const Heart: React.FC<{ x: number; y: number; on: boolean }> = ({ x, y, on }) => (
  <path transform={`translate(${x} ${y}) scale(1.3)`} d="M12 21 C-6 9 3 -2 12 6 C21 -2 30 9 12 21 Z" fill={on ? '#ff4d6d' : 'none'} stroke={on ? '#ff4d6d' : '#c9d1dc'} strokeWidth={2.5} />
);

const Post: React.FC<{ y: number; kind: number; user: string; likes: string; liked: boolean }> = ({ y, kind, user, likes, liked }) => (
  <g transform={`translate(40 ${y})`}>
    <circle cx={22} cy={22} r={20} fill="#3a4558" />
    <rect x={54} y={10} width={user.length * 11} height={10} rx={5} fill="#cfd6e0" opacity={0.0} />
    <text x={54} y={30} fill="#e6ebf2" fontFamily="Inter500" fontSize={22}>
      {user}
    </text>
    <g transform="translate(0 56)">{kind === 0 ? <Car /> : kind === 1 ? <Villa /> : <Travel />}</g>
    <Heart x={4} y={372} on={liked} />
    <text x={52} y={398} fill="#e6ebf2" fontFamily="Inter700" fontSize={22}>
      {likes}
    </text>
  </g>
);

export const PhoneFeed: React.FC<{ f: number; bank: boolean }> = ({ f, bank }) => {
  const [a] = SHOTS.feed;
  // flick scrolling: three quick swipes
  const sc = [0, 1, 2, 3].reduce((acc, i) => acc + 470 * easeInOutCubic(prog(f, a + 6 + i * 16, a + 18 + i * 16)), 0);
  const posts = [
    { kind: 0, user: 'alex.luxe', likes: '48,2 k' },
    { kind: 1, user: 'villa.dreams', likes: '112 k' },
    { kind: 2, user: 'jet.lifestyle', likes: '87,9 k' },
    { kind: 0, user: 'supercars.daily', likes: '230 k' },
    { kind: 1, user: 'maison.de.reve', likes: '64,1 k' },
  ];
  const [b0] = SHOTS.bank;
  const swipe = easeInOutCubic(prog(f, b0 - 2, b0 + 12));
  const amount = lerp(212.47, 12.47, easeInOutCubic(prog(f, b0 + 8, b0 + 30)));
  const push = 1 + 0.05 * prog(f, a, SHOTS.bank[1]);
  const tilt = Math.sin(f * 0.05) * 1.2;
  const x0 = (W - PW) / 2;
  const y0 = (H - PHH) / 2 - 150;
  return (
    <g>
      <rect width={W} height={H} fill="#04060a" />
      <ellipse cx={W / 2} cy={H / 2} rx={700} ry={900} fill="url(#glowScreen)" opacity={0.6} />
      <g transform={`translate(${W / 2} ${H / 2}) scale(${push}) rotate(${tilt}) translate(${-W / 2} ${-H / 2})`}>
        {/* phone body */}
        <rect x={x0 - 18} y={y0 - 18} width={PW + 36} height={PHH + 36} rx={64} fill="#11161f" stroke="#2b3443" strokeWidth={4} />
        <clipPath id="phoneScreen">
          <rect x={x0} y={y0} width={PW} height={PHH} rx={48} />
        </clipPath>
        <g clipPath="url(#phoneScreen)">
          <rect x={x0} y={y0} width={PW} height={PHH} fill="#0b0f16" />
          {/* feed */}
          <g transform={`translate(${x0 - swipe * PW} ${y0 + 90 - sc})`}>
            {posts.map((p, i) => (
              <Post key={i} y={i * 470} {...p} liked={i % 2 === 0} />
            ))}
          </g>
          {/* bank app slides in */}
          {swipe > 0 ? (
            <g transform={`translate(${x0 + (1 - swipe) * PW} ${y0})`}>
              <rect width={PW} height={PHH} fill="#0d1219" />
              <text x={40} y={130} fill="#9aa6b6" fontFamily="Inter500" fontSize={26}>
                Mon compte
              </text>
              <text x={40} y={250} fill="#c4ccd8" fontFamily="Inter500" fontSize={26}>
                Solde disponible
              </text>
              <text x={40} y={350} fill={amount < 50 ? '#ff6b75' : '#f3f4f6'} fontFamily="Inter700" fontSize={92}>
                {amount.toFixed(2).replace('.', ',')} €
              </text>
              <rect x={40} y={400} width={PW - 80} height={2} fill="#232c3a" />
              {[
                ['Loyer', '− 450,00 €'],
                ['Courses', '− 63,20 €'],
                ['Transport', '− 75,00 €'],
                ['Abonnement', '− 9,99 €'],
              ].map(([l, v], i) => (
                <g key={i} opacity={clamp((f - b0 - 14 - i * 4) / 8)}>
                  <text x={40} y={480 + i * 80} fill="#c4ccd8" fontFamily="Inter500" fontSize={30}>
                    {l}
                  </text>
                  <text x={PW - 40} y={480 + i * 80} textAnchor="end" fill="#ff8a92" fontFamily="Inter500" fontSize={30}>
                    {v}
                  </text>
                </g>
              ))}
            </g>
          ) : null}
          {/* status bar */}
          <rect x={x0} y={y0} width={PW} height={70} fill="#0b0f16" opacity={0.92} />
          <text x={x0 + 50} y={y0 + 48} fill="#e6ebf2" fontFamily="Inter700" fontSize={24}>
            23:47
          </text>
          <rect x={x0 + PW - 100} y={y0 + 30} width={44} height={20} rx={5} fill="none" stroke="#e6ebf2" strokeWidth={2} />
          <rect x={x0 + PW - 97} y={y0 + 33} width={8} height={14} rx={2} fill="#ff6b75" />
          {/* screen glare */}
          <rect x={x0} y={y0} width={PW} height={PHH} fill="url(#fadeDown)" opacity={0.05} />
        </g>
        {/* thumbs holding the phone; right thumb swipes up */}
        <g filter="url(#figGlow)">
          <rect x={x0 - 64} y={y0 + PHH - 120} width={92} height={340} rx={46} fill={C.white} />
          <rect x={x0 + PW - 28} y={y0 + PHH - 120} width={92} height={340} rx={46} fill={C.white} />
          <rect
            x={x0 + PW - 150}
            y={y0 + PHH - 150 - (bank ? 30 : Math.max(0, Math.sin((f - a) * 0.39)) * 90)}
            width={70}
            height={190}
            rx={35}
            fill={C.white}
            transform={`rotate(-24 ${x0 + PW - 115} ${y0 + PHH})`}
          />
        </g>
      </g>
    </g>
  );
};

