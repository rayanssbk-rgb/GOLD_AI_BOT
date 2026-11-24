import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { W, H } from './timeline.js';
import { renderFrame } from './draw';

export const Main: React.FC = () => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    renderFrame(ref.current!.getContext('2d')!, f);
  }, [f]);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <canvas ref={ref} width={W} height={H} style={{ width: W, height: H }} />
    </AbsoluteFill>
  );
};
