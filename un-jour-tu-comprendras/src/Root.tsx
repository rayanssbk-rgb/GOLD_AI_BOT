import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { FPS, DURATION, WIDTH, HEIGHT } from './timeline.js';

export const RemotionRoot: React.FC = () => (
  <Composition id="UnJour" component={Main} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
);
