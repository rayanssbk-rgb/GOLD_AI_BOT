import React from 'react';
import { Composition } from 'remotion';
import { Main, SubsLayer } from './Main';
import { FPS, DURATION, WIDTH, HEIGHT } from './timeline.js';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="NoOneComes" component={Main} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="Subs" component={SubsLayer} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="Preview" component={Main} defaultProps={{ subs: true }} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
