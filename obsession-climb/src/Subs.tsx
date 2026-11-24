// French subtitles for the 35 s cut (word-synced from the narration take), transparent overlay.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, continueRender, delayRender, staticFile } from 'remotion';
import { FPS, clamp } from './timeline.js';
import cues from './subs_v3.json';

const GOLD = /^(l’)?(obsession|silence|résultats|construis|progresses|abandonner|motivation|continuer)[,.]?$/i;

export const Subs: React.FC = () => {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all([
      new FontFace('Inter600', `url(${staticFile('Inter-700.woff2')})`).load(),
      new FontFace('Inter500', `url(${staticFile('Inter-500.woff2')})`).load(),
    ]).then((fs) => {
      fs.forEach((f) => (document.fonts as unknown as { add: (x: FontFace) => void }).add(f));
      continueRender(h);
    });
  }, [h]);
  const t = useCurrentFrame() / FPS;
  const c = (cues as { text: string; start: number; end: number }[]).find((q) => t >= q.start && t < q.end);
  if (!c) return <AbsoluteFill />;
  const k = clamp((t - c.start) / 0.12) * clamp((c.end - t) / 0.15);
  const words = c.text.split(' ');
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 90,
          width: 900,
          bottom: 430,
          textAlign: 'center',
          fontFamily: 'Inter600, Arial, sans-serif',
          fontSize: 54,
          lineHeight: 1.22,
          letterSpacing: '0.005em',
          color: '#ffffff',
          opacity: k,
          transform: `translateY(${(1 - clamp((t - c.start) / 0.12)) * 10}px)`,
          textShadow: '0 0 2px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.8), 0 4px 18px rgba(0,0,0,0.6)',
          textWrap: 'balance',
        } as React.CSSProperties}
      >
        {words.map((w, i) => (
          <span key={i} style={{ color: GOLD.test(w) ? '#f2c96b' : '#ffffff' }}>
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
