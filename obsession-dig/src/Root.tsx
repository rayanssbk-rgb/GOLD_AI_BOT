import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { YachtMain } from './YachtMain';
import { YACHT_FRAMES } from './yacht';
import { FPS, W, H, DURATION } from './timeline.js';
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Dig" component={Main} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="Yacht" component={YachtMain} durationInFrames={YACHT_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
