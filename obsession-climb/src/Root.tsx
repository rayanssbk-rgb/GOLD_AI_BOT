import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { Title } from './Title';
import { Subs } from './Subs';
import { FPS, W, H, DURATION } from './timeline.js';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Climb" component={Main} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="Title35" component={Title} durationInFrames={1050} fps={FPS} width={W} height={H} />
    <Composition id="Subs35" component={Subs} durationInFrames={1050} fps={FPS} width={W} height={H} />
  </>
);
