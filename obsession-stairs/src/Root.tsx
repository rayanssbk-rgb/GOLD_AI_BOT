import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { FPS, W, H, DURATION } from './draw';
export const RemotionRoot: React.FC = () => <Composition id="Stairs" component={Main} durationInFrames={DURATION} fps={FPS} width={W} height={H} />;
