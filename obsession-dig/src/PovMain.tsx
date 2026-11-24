import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, continueRender, delayRender, staticFile } from 'remotion';
import { W, H } from './timeline.js';
import { renderPov } from './pov';

export const PovMain: React.FC = () => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender('fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([
      new FontFace('Inter700', `url(${staticFile('Inter-700.woff2')})`).load(),
      new FontFace('Inter500', `url(${staticFile('Inter-500.woff2')})`).load(),
    ]).then((fs) => {
      fs.forEach((x) => (document.fonts as unknown as { add: (y: FontFace) => void }).add(x));
      setReady(true);
    });
  }, []);
  useLayoutEffect(() => {
    if (!ready) return;
    renderPov(ref.current!.getContext('2d')!, f);
    continueRender(h);
  }, [f, ready, h]);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <canvas ref={ref} width={W} height={H} style={{ width: W, height: H }} />
    </AbsoluteFill>
  );
};
