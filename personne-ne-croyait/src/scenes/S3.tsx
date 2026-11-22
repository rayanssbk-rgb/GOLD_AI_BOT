// SCENE 3 — Les échecs: errors on screen, he gives up... then looks at his goal.
import React from 'react';
import { Cam, W, H, CodeLines } from '../kit';
import { typing, headInHands, lerpPose, offset, sitFront } from '../pose';
import { DeskSet, KB, SEAT } from './S2';
import { SHOTS, FAILS, prog, lerp, easeInOutSine, easeInOutCubic, easeOutBack, clamp } from '../timeline.js';

const ERR = [
  { t: 'Erreur', m: 'Échec de la compilation' },
  { t: 'Erreur 500', m: 'Le serveur ne répond pas' },
  { t: 'Échec', m: 'Impossible de lancer le projet' },
];

/** Error dialog in 400x248 screen space. */
const ErrorBox: React.FC<{ i: number; k: number }> = ({ i, k }) => (
  <g transform={`translate(${70 + i * 22} ${40 + i * 30}) scale(${0.6 + 0.4 * easeOutBack(clamp(k))})`} opacity={clamp(k * 3)}>
    <rect width={260} height={120} rx={8} fill="#1a0f14" stroke="#ff4d5a" strokeWidth={2} />
    <rect width={260} height={30} rx={8} fill="#ff4d5a" />
    <text x={12} y={21} fill="#fff" fontFamily="Inter700" fontSize={15}>
      ✕ {ERR[i].t}
    </text>
    <text x={14} y={66} fill="#ffc2c7" fontFamily="Inter500" fontSize={15}>
      {ERR[i].m}
    </text>
    <rect x={160} y={84} width={84} height={24} rx={5} fill="#3a1a22" />
    <text x={202} y={101} textAnchor="middle" fill="#ffc2c7" fontFamily="Inter500" fontSize={13}>
      Réessayer
    </text>
  </g>
);

export const FailScreen: React.FC<{ f: number }> = ({ f }) => {
  const [a, b] = SHOTS.fail;
  const t = easeInOutSine(prog(f, a, b));
  let shake = 0;
  let flash = 0;
  FAILS.forEach((ff) => {
    if (f >= ff) {
      const d = f - ff;
      shake += Math.exp(-d / 4) * Math.sin(d * 2.4) * 10;
      flash += Math.exp(-d / 5);
    }
  });
  const sw = 960;
  const sh = 600;
  return (
    <g>
      <rect width={W} height={H} fill="#040509" />
      <ellipse cx={W / 2} cy={H / 2} rx={800} ry={800} fill="url(#glowRed)" opacity={clamp(flash) * 0.7} />
      <g transform={`translate(${W / 2 + shake} ${H / 2 - 60}) scale(${lerp(1.0, 1.08, t)})`}>
        <rect x={-sw / 2 - 22} y={-sh / 2 - 22} width={sw + 44} height={sh + 44} rx={22} fill="#1c222c" />
        <g transform={`translate(${-sw / 2} ${-sh / 2}) scale(${sw / 400} ${sh / 248})`}>
          <rect width={400} height={248} fill="#0d1726" />
          <CodeLines f={f - a + 60} speed={2} seed={7} />
          {FAILS.map((ff, i) => (f >= ff - 2 ? <ErrorBox key={i} i={i} k={(f - ff + 2) / 8} /> : null))}
          <rect width={400} height={248} fill="#ff4d5a" opacity={clamp(flash) * 0.12} />
        </g>
        {/* keyboard edge + his fingers */}
        <rect x={-sw / 2 - 60} y={sh / 2 + 22} width={sw + 120} height={60} rx={16} fill="#232a35" />
        {[-1, 1].map((s) => (
          <ellipse key={s} cx={s * 150 + Math.sin(f * (s > 0 ? 1.9 : 2.3)) * 12} cy={sh / 2 + 70 - Math.max(0, Math.sin(f * 2.1 + s)) * 8} rx={70} ry={38} fill="#f3f4f6" filter="url(#figGlow)" />
        ))}
      </g>
    </g>
  );
};

export const Despair: React.FC<{ f: number }> = ({ f }) => {
  const [a] = SHOTS.despair;
  const k = {
    closeA: a + 22,
    closeB: a + 40,
    handsA: a + 40,
    handsB: a + 58,
    lookA: a + 104,
    lookB: a + 124,
    photoA: a + 116,
    photoB: a + 150,
    reopenA: a + 160,
    reopenB: a + 182,
  };
  // laptop lid
  const open =
    f < k.closeA ? 1 : f < k.reopenA ? 1 - easeInOutCubic(prog(f, k.closeA, k.closeB)) : easeInOutCubic(prog(f, k.reopenA, k.reopenB));
  // poses
  const typingP = typing(SEAT, KB, f, 1.6);
  const closing = sitFront(SEAT, { breath: f, look: [0, 6] });
  closing.hL = [KB[0] - 20, KB[1] - 50 * (1 - open)];
  closing.hR = [KB[0] + 20, KB[1] - 50 * (1 - open)];
  const hands = headInHands(SEAT, 0, f);
  const shaking = Math.sin(f * 0.35) * 1.5;
  const handsP = offset(hands, { chest: [shaking, 0], head: [shaking, 0] });
  const lookP = sitFront(SEAT, { breath: f, look: [-14, -6] });
  // hands resting on his lap (hidden by the chair) while he stares at the photo
  lookP.hL = [-22, -SEAT - 2];
  lookP.hR = [22, -SEAT - 2];
  let pose;
  if (f < k.closeA) pose = typingP;
  else if (f < k.handsA) pose = lerpPose(typingP, closing, easeInOutSine(prog(f, k.closeA, k.closeA + 10)));
  else if (f < k.lookA) pose = lerpPose(closing, handsP, easeInOutSine(prog(f, k.handsA, k.handsB)));
  else if (f < k.reopenA) pose = lerpPose(handsP, lookP, easeInOutSine(prog(f, k.lookA, k.lookB)));
  else pose = lerpPose(lookP, typing(SEAT, KB, f, 0.8), easeInOutSine(prog(f, k.reopenA, k.reopenB + 6)));
  // camera: rack toward the photo then back
  const toPhoto = easeInOutCubic(prog(f, k.photoA, k.photoB)) - easeInOutCubic(prog(f, k.photoB + 12, k.reopenB));
  const breathe = easeInOutSine(prog(f, a, k.photoA));
  const cam = {
    x: lerp(lerp(560, 520, breathe), 270, toPhoto),
    y: lerp(lerp(1220, 1250, breathe), 850, toPhoto),
    s: lerp(lerp(1.05, 1.18, breathe), 2.0, toPhoto),
  };
  const photoGlow = easeInOutSine(prog(f, k.photoA, k.photoB));
  return (
    <Cam x={cam.x} y={cam.y} s={cam.s}>
      <DeskSet f={f} pose={pose} behind={f >= k.handsA + 8 && f < k.lookA + 8} open={open} clock="03:12" photoGlow={photoGlow} screen={<CodeLines f={f - a + 90} speed={2} seed={13} />} />
    </Cam>
  );
};
