import React from 'react';
import { Composition } from 'remotion';
import { DeuxEchelles } from './DeuxEchelles';
import { FPS, DURATION, WIDTH, HEIGHT } from './timeline.js';

export const RemotionRoot: React.FC = () => (
  <Composition id="DeuxEchelles" component={DeuxEchelles} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
);
