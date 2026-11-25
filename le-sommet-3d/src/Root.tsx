import React from 'react';
import { Composition } from 'remotion';
import { Main, FPS, W, H, DUR } from './Main';
export const RemotionRoot: React.FC = () => <Composition id="Sommet" component={Main} durationInFrames={DUR * FPS} fps={FPS} width={W} height={H} />;
