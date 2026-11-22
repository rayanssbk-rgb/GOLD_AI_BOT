import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { useFonts } from './fonts';
import { SC } from './timeline.js';
import { Apartment } from './scenes/S1Apartment';
import { StreetPOV, StreetStill } from './scenes/S2Street';
import { Desk } from './scenes/S3Desk';
import { Montage } from './scenes/S4Montage';
import { Sunrise } from './scenes/S5Sunrise';
import { Title, Subtitles, Finale } from './Text';

const inR = (f: number, r: number[]) => f >= r[0] && f < r[1];
/** Shot wrapper: fades in over the previous shot (overlap = crossfade). */
const Shot: React.FC<{ f: number; r: number[]; fade?: number; children: React.ReactNode }> = ({ f, r, fade = 12, children }) =>
  inR(f, r) ? <AbsoluteFill style={{ opacity: fade ? Math.min(1, (f - r[0]) / fade) : 1 }}>{children}</AbsoluteFill> : null;

export const Main: React.FC = () => {
  useFonts();
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Shot f={f} r={SC.apartment} fade={0}>
        <Apartment f={f} />
      </Shot>
      <Shot f={f} r={SC.street}>
        <StreetPOV f={f} />
      </Shot>
      <Shot f={f} r={SC.still}>
        <StreetStill f={f} />
      </Shot>
      <Shot f={f} r={[SC.clock[0], SC.desk[1]]}>
        <Desk f={f} />
      </Shot>
      <Shot f={f} r={SC.montage} fade={4}>
        <Montage f={f} />
      </Shot>
      <Shot f={f} r={SC.sunrise} fade={6}>
        <Sunrise f={f} />
      </Shot>
      <Title f={f} />
      <Subtitles f={f} />
      <Finale f={f} />
      <Audio src={staticFile('soundtrack.wav')} />
    </AbsoluteFill>
  );
};
