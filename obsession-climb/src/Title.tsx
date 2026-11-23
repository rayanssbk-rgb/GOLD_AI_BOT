// "OBSESSION" title layer for the 35 s cut: follows the head of the man in the coat (transparent overlay).
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, continueRender, delayRender, staticFile } from 'remotion';
import { FPS, SHOTS, W, H, clamp, sstep } from './timeline.js';
import { proj } from './world';
import { camera, mentorRig, dawnRigs } from './story';
import { solve } from './rig';

// must match scripts/cut35.py
const SEG = [[0, 6.6], [8.6, 12.8], [13.4, 16.4], [17.0, 23.4], [24.0, 26.4], [27.0, 29.3], [30.0, 32.3], [33.9, 42.2]];
const XF = 0.5;
export const CUT_LEN = SEG.reduce((s, [a, b]) => s + b - a, 0) - XF;
/** cut time -> [[original time, weight]] (two entries during the final dissolve) */
function toOrig(u: number): [number, number][] {
  const out: [number, number][] = [];
  let cs = 0;
  SEG.forEach(([a, b], i) => {
    const last = i === SEG.length - 1;
    const start = last ? cs - XF : cs;
    const end = start + (b - a);
    if (u >= start && u < end) {
      let w = 1;
      if (last) w = clamp((u - start) / XF);
      if (i === SEG.length - 2) w = 1 - clamp((u - (end - XF)) / XF);
      out.push([a + (u - start), w]);
    }
    cs += b - a;
  });
  return out;
}
function shotAt(t: number) {
  const act = SHOTS.filter(([, a, b]) => t >= (a as number) && t < (b as number));
  return act.length ? (act[act.length - 1][0] as string) : null;
}
function titleAt(t: number) {
  const id = shotAt(t);
  if (!id || id === 'climb') return null;
  const m = id === 'dawn' ? dawnRigs(t)[1] : mentorRig(t);
  if (!m) return null;
  const c = camera(id, t);
  const J = solve(m);
  const top = proj(c, 0, J.head[0], J.head[1] + 0.125);
  const size = clamp(c.z * 0.17, 54, 104);
  const gap = clamp(c.z * 0.09, 22, 70);
  return { x: top[0], y: top[1] - gap, size, roll: c.roll, a: sstep(t, 22.75, 23.4) };
}

export const Title: React.FC = () => {
  const [h] = useState(() => delayRender('font'));
  useEffect(() => {
    const ff = new FontFace('Cormorant', `url(${staticFile('CormorantGaramond-Medium.woff2')})`);
    ff.load().then((f) => {
      (document.fonts as unknown as { add: (x: FontFace) => void }).add(f);
      continueRender(h);
    });
  }, [h]);
  const u = useCurrentFrame() / FPS;
  const end = clamp((CUT_LEN - u) / 0.8);
  return (
    <AbsoluteFill>
      {toOrig(u).map(([t, w], i) => {
        const p = titleAt(t);
        if (!p || p.a * w * end <= 0.001) return null;
        const y = clamp(p.y, p.size + 70, H - 200);
        const half = p.size * 3.9 + 40;
        const x = clamp(p.x, half, W - half);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - 600,
              top: y - p.size,
              width: 1200,
              textAlign: 'center',
              fontFamily: 'Cormorant, Georgia, serif',
              fontSize: p.size,
              lineHeight: 1,
              letterSpacing: '0.3em',
              paddingLeft: '0.3em',
              color: '#f7ecd2',
              opacity: p.a * w * end,
              transform: `rotate(${p.roll}rad)`,
              textShadow: '0 0 2px rgba(0,0,0,0.95), 0 2px 10px rgba(0,0,0,0.8), 0 0 28px rgba(30,16,0,0.7), 0 0 22px rgba(214,168,76,0.45)',
            }}
          >
            OBSESSION
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
