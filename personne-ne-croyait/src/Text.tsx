// Title hook, synced subtitles and the final moral.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import subs from './subtitles.json';
import { VOICE, FPS, clamp, easeOutCubic, easeInOutSine, prog, SILENCE, FINAL_BOOM } from './timeline.js';

type Word = { w: string; s: number; e: number };
const SUBS = subs as Record<string, Word[]>;

export const SERIF = "'CormorantLocal', 'Cormorant Garamond', Georgia, serif";
export const SANS = "'Inter700', Inter, Arial, sans-serif";

const shadow = '0 2px 18px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)';

export const Title: React.FC<{ f: number }> = ({ f }) => {
  const out = 1 - prog(f, 58, 78);
  if (out <= 0) return null;
  const rows = ['PERSONNE', 'NE CROYAIT', 'EN LUI.'];
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 330 }}>
      <div style={{ textAlign: 'center', opacity: out }}>
        {rows.map((r, i) => {
          const k = easeOutCubic(clamp((f - i * 5) / 14));
          return (
            <div
              key={i}
              style={{
                fontFamily: SANS,
                fontSize: i === 2 ? 104 : 84,
                color: i === 2 ? '#ffffff' : '#e9edf3',
                letterSpacing: `${0.34 - 0.2 * k}em`,
                lineHeight: 1.12,
                opacity: k,
                filter: `blur(${(1 - k) * 10}px)`,
                textShadow: shadow,
              }}
            >
              {r}
            </div>
          );
        })}
        <div style={{ margin: '34px auto 0', height: 3, width: 220 * easeOutCubic(clamp((f - 12) / 20)), background: '#e9edf3', opacity: 0.7 }} />
      </div>
    </AbsoluteFill>
  );
};

/** Lower-third subtitles: words appear exactly when spoken. */
export const Subtitles: React.FC<{ f: number }> = ({ f }) => {
  const ids = ['n1a', 'n1b', 'n2a', 'n2b', 'n3a', 'n3b', 'n4a', 'n4b', 'n5a'] as const;
  const t = f / FPS;
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 1490 }}>
      {ids.map((id) => {
        const start = VOICE[id] / FPS;
        const words = SUBS[id];
        const end = start + words[words.length - 1].e;
        const vis = clamp((t - start + 0.15) / 0.2) * (1 - clamp((t - end - 0.45) / 0.3));
        if (vis <= 0) return null;
        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              top: 1490,
              width: 880,
              textAlign: 'center',
              fontFamily: SANS,
              fontSize: 50,
              lineHeight: 1.28,
              color: '#ffffff',
              textShadow: shadow,
              opacity: vis,
            }}
          >
            {words.map((w, i) => {
              const k = easeOutCubic(clamp((t - start - w.s + 0.06) / 0.16));
              return (
                <span key={i} style={{ display: 'inline-block', marginRight: '0.24em', opacity: 0.12 + 0.88 * k, transform: `translateY(${(1 - k) * 8}px)` }}>
                  {w.w}
                </span>
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Reveal: React.FC<{ id: keyof typeof VOICE; f: number; size: number; accent?: string[]; breaks?: number[]; style?: React.CSSProperties }> = ({ id, f, size, accent = [], breaks = [], style }) => {
  const t = f / FPS;
  const start = VOICE[id] / FPS;
  return (
    <div style={{ fontFamily: SERIF, fontSize: size, lineHeight: 1.18, color: '#f5f5f3', textAlign: 'center', textShadow: '0 0 30px rgba(0,0,0,0.6)', ...style }}>
      {SUBS[id].map((w, i) => {
        const k = easeOutCubic(clamp((t - start - w.s + 0.05) / 0.35));
        const acc = accent.some((a) => w.w.toLowerCase().startsWith(a));
        return (
          <React.Fragment key={i}>
          {breaks.includes(i) ? <br /> : null}
          <span
            style={{
              display: 'inline-block',
              marginRight: '0.24em',
              opacity: k,
              filter: `blur(${(1 - k) * 8}px)`,
              transform: `translateY(${(1 - k) * 14}px)`,
              color: acc ? '#f3c26b' : undefined,
            }}
          >
            {w.w}
          </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const Moral: React.FC<{ f: number }> = ({ f }) => {
  if (f < VOICE.n6a - 4) return null;
  const outA = 1 - easeInOutSine(prog(f, SILENCE[0] - 18, SILENCE[0]));
  const boom = f >= FINAL_BOOM ? Math.exp(-(f - FINAL_BOOM) / 10) : 0;
  return (
    <AbsoluteFill>
      {outA > 0 ? (
        <AbsoluteFill style={{ alignItems: 'center', opacity: outA, padding: '0 90px' }}>
          <div style={{ position: 'absolute', top: 440, left: 90, width: 900 }}>
            <Reveal id="n6a" f={f} size={78} accent={['personne']} breaks={[2, 5]} />
          </div>
          <div style={{ position: 'absolute', top: 900, left: 90, width: 900 }}>
            <Reveal id="n6b" f={f} size={70} accent={['silence']} breaks={[4, 6]} style={{ color: '#d9dde3' }} />
          </div>
        </AbsoluteFill>
      ) : null}
      {f >= VOICE.n6c - 4 ? (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 80px' }}>
          <div style={{ width: 920, marginTop: -120, transform: `scale(${1 + 0.03 * easeInOutSine(prog(f, VOICE.n6c, 1845)) + boom * 0.02})` }}>
            <Reveal id="n6c" f={f} size={96} accent={['bruit']} breaks={[3, 6]} style={{ fontWeight: 600, textShadow: `0 0 ${30 + boom * 60}px rgba(243,194,107,${0.15 + boom * 0.5})` }} />
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
