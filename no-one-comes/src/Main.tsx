import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { useFonts } from './fonts';
import { SC } from './timeline.js';
import { Car } from './scenes/Car';
import { Roof } from './scenes/Roof';
import { Aerial } from './scenes/Aerial';
import { Pier } from './scenes/Pier';
import { Title, Subtitles, EndCard } from './Text';

const inR = (f: number, r: number[]) => f >= r[0] && f < r[1];
/** Shot wrapper: fades in over the previous shot (overlap = crossfade). */
const Shot: React.FC<{ f: number; r: number[]; fade?: number; children: React.ReactNode }> = ({ f, r, fade = 8, children }) =>
  inR(f, r) ? <AbsoluteFill style={{ opacity: fade ? Math.min(1, (f - r[0]) / fade) : 1 }}>{children}</AbsoluteFill> : null;

/** subs = false renders picture only (subtitles are composited after the grade). */
export const Main: React.FC<{ subs?: boolean }> = ({ subs = false }) => {
  useFonts();
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Shot f={f} r={SC.car1} fade={0}>
        <Car f={f} variant="dusk" />
      </Shot>
      <Shot f={f} r={SC.roof1}>
        <Roof f={f} variant="dusk" />
      </Shot>
      <Shot f={f} r={SC.aerial}>
        <Aerial f={f} />
      </Shot>
      <Shot f={f} r={SC.pier}>
        <Pier f={f} />
      </Shot>
      <Shot f={f} r={SC.roof2}>
        <Roof f={f} variant="night" />
      </Shot>
      <Shot f={f} r={SC.car2}>
        <Car f={f} variant="night" />
      </Shot>
      <Title f={f} />
      <EndCard f={f} start={SC.end[0]} />
      {subs ? <Subtitles f={f} /> : null}
    </AbsoluteFill>
  );
};

/** Transparent subtitle layer for compositing after the grade. */
export const SubsLayer: React.FC = () => {
  useFonts();
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Subtitles f={f} />
    </AbsoluteFill>
  );
};
