import React from 'react';
import { Composition } from 'remotion';
import { Main, FPS, W, H, DUR } from './Main';
import { Marches3D, DUR as MDUR } from './Marches3D';
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Sommet" component={Main} durationInFrames={DUR * FPS} fps={FPS} width={W} height={H} />
    <Composition id="Marches3D" component={Marches3D} durationInFrames={Math.round(MDUR * FPS)} fps={FPS} width={W} height={H} />
  </>
);
