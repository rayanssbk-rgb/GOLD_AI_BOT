import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { W, H, FPS, DUR } from './draw';
export const RemotionRoot: React.FC = () => <Composition id="Promo" component={Main} durationInFrames={DUR * FPS} fps={FPS} width={W} height={H} />;
