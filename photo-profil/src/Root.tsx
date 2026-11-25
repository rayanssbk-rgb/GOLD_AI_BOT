import React from 'react';
import { Composition } from 'remotion';
import { Pdp, FPS, LOOP, SIZE } from './Pdp';
export const RemotionRoot: React.FC = () => <Composition id="Pdp" component={Pdp} durationInFrames={FPS * LOOP} fps={FPS} width={SIZE} height={SIZE} />;
