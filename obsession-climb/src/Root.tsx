import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { FPS, W, H, DURATION } from './timeline.js';

export const RemotionRoot: React.FC = () => (
  <Composition id="Climb" component={Main} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
);
