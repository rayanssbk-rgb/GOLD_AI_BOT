import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { Ad, FPS as AFPS, DUR as ADUR } from './Ad';
import { W, H, FPS, DUR } from './draw';
import { Mix, FPS as MFPS, DUR as MDUR } from './Mix';
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Promo" component={Main} durationInFrames={DUR * FPS} fps={FPS} width={W} height={H} />
    <Composition id="Ad" component={Ad} durationInFrames={ADUR * AFPS} fps={AFPS} width={1080} height={1920} />
    <Composition id="Mix" component={Mix} durationInFrames={Math.round(MDUR * MFPS)} fps={MFPS} width={1080} height={1920} />
  </>
);
