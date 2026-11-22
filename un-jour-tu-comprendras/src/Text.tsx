// Title hook, sentence-by-sentence subtitles (word timing from Whisper) and the final cards.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import subs from './subtitles.json';
import { VOICE, FPS, BEAT, clamp, easeOut, ease, prog } from './timeline.js';

type Word = { w: string; s: number; e: number };
const SUBS = subs as Record<string, Word[]>;
const SERIF = "'CormorantLocal', Georgia, serif";
const SANS = "'Inter700', Inter, Arial, sans-serif";
const shadow = '0 2px 16px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)';
// commas added only to steer the TTS prosody are not shown on screen
const clean = (id: string, w: string) => (id === 'v3b' || id === 'v5b' ? w.replace(/,$/, '') : w);

export const Title: React.FC<{ f: number }> = ({ f }) => {
  const out = 1 - prog(f, 80, 100);
  if (out <= 0) return null;
  const k = easeOut(clamp((f - 4) / 26));
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 380 }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 70% 30% at 50% 40%, rgba(0,0,0,0.7), rgba(0,0,0,0))', opacity: out * k }} />
      <div style={{ textAlign: 'center', opacity: out * k, filter: `blur(${(1 - k) * 8}px)` }}>
        <div style={{ fontFamily: SERIF, fontSize: 92, color: '#f2efe8', letterSpacing: `${0.22 - 0.1 * k}em`, lineHeight: 1.1, textShadow: shadow }}>
          UN JOUR,
          <br />
          TU COMPRENDRAS.
        </div>
        <div style={{ margin: '34px auto 0', height: 2, width: 260 * k, background: '#f2efe8', opacity: 0.6 }} />
      </div>
    </AbsoluteFill>
  );
};

/** Split a line into sentences so long lines never fill the screen. */
function chunks(id: string) {
  const words = SUBS[id];
  const out: Word[][] = [[]];
  words.forEach((w, i) => {
    out[out.length - 1].push(w);
    if (/[.!?]$/.test(w.w) && i < words.length - 1) out.push([]);
  });
  return out;
}

export const Subtitles: React.FC<{ f: number }> = ({ f }) => {
  const t = f / FPS;
  const ids = ['v1', 'v2', 'v3a', 'v3b', 'v4a', 'v4b', 'v4c', 'v5a', 'v5b'] as const;
  return (
    <AbsoluteFill>
      {ids.flatMap((id) =>
        chunks(id).map((ch, ci) => {
          const start = VOICE[id] / FPS;
          const a = start + ch[0].s;
          const z = start + ch[ch.length - 1].e;
          const vis = clamp((t - a + 0.12) / 0.15) * (1 - clamp((t - z - 0.35) / 0.25));
          if (vis <= 0) return null;
          return (
            <div
              key={`${id}-${ci}`}
              style={{ position: 'absolute', top: 1330, left: 90, width: 900, display: 'flex', justifyContent: 'center', opacity: vis }}
            >
              <div style={{ textAlign: 'center', fontFamily: SANS, fontSize: 48, lineHeight: 1.3, color: '#fff', textShadow: shadow, background: 'rgba(5,6,10,0.5)', borderRadius: 18, padding: '14px 26px 18px' }}>
              {ch.map((w, i) => {
                const k = easeOut(clamp((t - start - w.s + 0.05) / 0.15));
                return (
                  <span key={i} style={{ display: 'inline-block', marginRight: '0.24em', opacity: 0.15 + 0.85 * k, transform: `translateY(${(1 - k) * 6}px)` }}>
                    {clean(id, w.w)}
                  </span>
                );
              })}
              </div>
            </div>
          );
        }),
      )}
    </AbsoluteFill>
  );
};

export const Finale: React.FC<{ f: number }> = ({ f }) => {
  if (f < BEAT.black - 30) return null;
  const black = ease(prog(f, BEAT.black - 30, BEAT.black));
  const l1 = easeOut(clamp((f - VOICE.v6a + 2) / 18));
  const l2 = easeOut(clamp((f - VOICE.v6b + 2) / 18));
  const out12 = 1 - ease(prog(f, BEAT.silence[1] - 12, BEAT.silence[1]));
  const sig = easeOut(clamp((f - VOICE.v6c + 4) / 22));
  const drift = 1 + 0.03 * prog(f, BEAT.black, BEAT.end);
  const line = (txt: string, k: number, size: number, color = '#f2efe8') => (
    <div style={{ fontFamily: SERIF, fontSize: size, color, letterSpacing: '0.14em', lineHeight: 1.25, opacity: k, filter: `blur(${(1 - k) * 10}px)`, transform: `translateY(${(1 - k) * 16}px)` }}>{txt}</div>
  );
  return (
    <AbsoluteFill style={{ background: `rgba(0,0,0,${black})` }}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${drift})` }}>
        {out12 > 0 ? (
          <div style={{ textAlign: 'center', opacity: out12, marginTop: -120 }}>
            {line('TA VIE PEUT', l1, 76)}
            {line('CHANGER.', l1, 76)}
            <div style={{ height: 40 }} />
            {line('MAIS PAS SI TU', l2, 76, '#d9d5cc')}
            {line('RESTES LE MÊME.', l2, 76, '#d9d5cc')}
          </div>
        ) : null}
        {f >= VOICE.v6c - 6 ? (
          <div style={{ textAlign: 'center', marginTop: -120, position: 'absolute' }}>
            {line('COMMENCE', sig, 104, '#f6d9a0')}
            {line('AUJOURD’HUI.', sig, 104, '#f6d9a0')}
            <div style={{ margin: '40px auto 0', height: 2, width: 320 * sig, background: '#f6d9a0', opacity: 0.7 }} />
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
