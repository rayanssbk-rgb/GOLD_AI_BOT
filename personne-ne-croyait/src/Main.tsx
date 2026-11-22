import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from 'remotion';
import { Defs, W, H } from './kit';
import { SHOTS, BLACK, prog, clamp } from './timeline.js';
import { Room, PhoneFeed } from './scenes/S1';
import { Street, Desk } from './scenes/S2';
import { FailScreen, Despair } from './scenes/S3';
import { Montage } from './scenes/S4';
import { Result, WindowView, City } from './scenes/S5';
import { Title, Subtitles, Moral } from './Text';

const FONTS: [string, string][] = [
  ['Inter500', 'Inter-500.woff2'],
  ['Inter700', 'Inter-700.woff2'],
  ['CormorantLocal', 'CormorantGaramond-Medium.woff2'],
];

function useFonts() {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all(
      FONTS.map(([fam, file]) =>
        new FontFace(fam, `url(${staticFile(file)}) format('woff2')`, { weight: '300 800' }).load().then((ff) => {
          (document.fonts as unknown as { add: (f: FontFace) => void }).add(ff);
        }),
      ),
    )
      .catch((e) => console.error(e))
      .finally(() => continueRender(handle));
  }, [handle]);
}

type ShotDef = { range: number[]; render: (f: number) => React.ReactNode; fadeIn?: number; fadeOut?: number };

const SHOT_LIST: ShotDef[] = [
  { range: SHOTS.room, render: (f) => <Room f={f} mode="phone" />, fadeIn: 0 },
  { range: SHOTS.feed, render: (f) => <PhoneFeed f={f} bank={f >= SHOTS.bank[0]} /> },
  { range: [SHOTS.bank[0], SHOTS.bank[1]], render: (f) => <PhoneFeed f={f} bank />, fadeIn: 0 },
  { range: SHOTS.bow, render: (f) => <Room f={f} mode="bow" /> },
  { range: SHOTS.street, render: (f) => <Street f={f} /> },
  { range: SHOTS.desk, render: (f) => <Desk f={f} /> },
  { range: SHOTS.fail, render: (f) => <FailScreen f={f} /> },
  { range: SHOTS.despair, render: (f) => <Despair f={f} /> },
  { range: SHOTS.montage, render: (f) => <Montage f={f} /> },
  { range: SHOTS.result, render: (f) => <Result f={f} />, fadeIn: 0 },
  { range: SHOTS.window, render: (f) => <WindowView f={f} /> },
  { range: [SHOTS.city[0], BLACK + 2], render: (f) => <City f={f} />, fadeOut: 0 },
];

export const Main: React.FC = () => {
  useFonts();
  const f = useCurrentFrame();
  const visible = SHOT_LIST.filter((s) => f >= s.range[0] && f < s.range[1]);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Audio src={staticFile('soundtrack.wav')} />
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        <Defs f={f} />
        {visible.map((s, i) => {
          const [a, b] = s.range;
          const fi = s.fadeIn ?? 8;
          const fo = s.fadeOut ?? 8;
          const op = Math.min(fi ? clamp((f - a) / fi) : 1, fo ? clamp((b - f) / fo) : 1);
          // first visible shot is drawn opaque underneath; later ones fade over it
          return (
            <g key={s.range.join('-')} opacity={i === 0 ? 1 : op}>
              {s.render(f)}
            </g>
          );
        })}
        <rect width={W} height={H} fill="url(#vignette)" />
        <rect width={W} height={H} filter="url(#grain)" opacity={0.055} />
      </svg>
      <Title f={f} />
      <Subtitles f={f} />
      <Moral f={f} />
      {/* faint drifting embers in the black moments so the screen is never dead */}
      {f >= BLACK ? <Embers f={f} /> : null}
      <AbsoluteFill style={{ background: '#000', opacity: 1 - prog(f, 0, 6), pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

const Embers: React.FC<{ f: number }> = ({ f }) => (
  <svg width={W} height={H} style={{ position: 'absolute' }}>
    {Array.from({ length: 26 }, (_, i) => {
      const r = (x: number) => {
        const v = Math.sin((i + x) * 127.1) * 43758.5453;
        return v - Math.floor(v);
      };
      const y = (((r(1) * H - (f - BLACK) * (0.4 + r(2) * 0.8)) % H) + H) % H;
      return <circle key={i} cx={r(3) * W + Math.sin(f * 0.02 + i) * 20} cy={y} r={1 + r(4) * 2} fill="#f3c26b" opacity={0.08 + 0.12 * r(5)} />;
    })}
  </svg>
);
