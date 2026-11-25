import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, continueRender, delayRender, staticFile } from 'remotion';
import { W, H } from './draw';
import { renderFrame } from './draw';

export const Main: React.FC = () => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender('font'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    new FontFace('Inter700', `url(${staticFile('Inter-700.woff2')})`).load().then((ff) => {
      (document.fonts as unknown as { add: (x: FontFace) => void }).add(ff);
      setReady(true);
    });
  }, []);
  useLayoutEffect(() => {
    if (!ready) return;
    renderFrame(ref.current!.getContext('2d')!, f);
    continueRender(h);
  }, [f, ready, h]);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <canvas ref={ref} width={W} height={H} style={{ width: W, height: H }} />
    </AbsoluteFill>
  );
};
