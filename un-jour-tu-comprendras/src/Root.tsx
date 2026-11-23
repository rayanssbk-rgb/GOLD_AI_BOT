import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { Profile } from './Profile';
import { SubtitlesEN } from './SubtitlesEN';
import { FPS, DURATION, WIDTH, HEIGHT } from './timeline.js';

export const RemotionRoot: React.FC = () => (
  <>
  <Composition id="UnJour" component={Main} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
  <Composition id="UnJourClean" component={Main} defaultProps={{ subs: false }} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
  <Composition id="SubsEN" component={SubtitlesEN} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
  <Composition id="SubsFR" component={SubtitlesEN} defaultProps={{ lang: 'fr' as const }} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
  <Composition id="Profile" component={Profile} durationInFrames={1} fps={FPS} width={1080} height={1080} />
  </>
);
