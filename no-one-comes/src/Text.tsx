// Title card, theatrical English subtitles (word-synced), end card.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import words from '../scripts/words.json';
import { LINE, BEAT, FPS, clamp, easeOut, prog } from './timeline.js';

const W = words as unknown as Record<string, { dur: number; words: [string, number, number][] }>;
const SANS = "'Inter500', 'Helvetica Neue', Arial, sans-serif";
const BOLD = "'Inter700', 'Helvetica Neue', Arial, sans-serif";

// [line, first word, last word, text]: one speaker per cue, max two lines, natural breaks
const CUES: [keyof typeof LINE, number, number, string][] = [
  ['k1', 0, 5, 'Still waiting on a miracle, kid?'],
  ['d0', 0, 3, 'I’m just tired, man.'],
  ['d1', 0, 4, 'Everybody out there is winning.'],
  ['d1', 5, 8, 'And I’m still stuck.'],
  ['v1', 0, 3, 'Stuck is a choice.'],
  ['v2', 0, 4, 'I was broke at thirty.'],
  ['v2', 5, 8, 'Nobody believed in me.'],
  ['k2', 0, 2, 'Nobody’s coming, Dre.'],
  ['k2', 3, 8, 'Not luck. Not your family.\nNobody.'],
  ['k3', 0, 1, 'Only you.'],
  ['v3', 0, 6, 'Every night you quit,\nsomebody else doesn’t.'],
  ['d2', 0, 3, 'Then I start tonight.'],
  ['k4', 0, 1, 'About time.'],
];
export const TIMED = CUES.map(([id, a, b, text]) => {
  const t0 = LINE[id] / FPS;
  const ws = W[id].words;
  return { text, start: t0 + ws[Math.min(a, ws.length - 1)][1], spoken: t0 + ws[Math.min(b, ws.length - 1)][2] };
}).map((c, i, all) => {
  const next = all[i + 1]?.start ?? Infinity;
  return { ...c, end: Math.min(Math.max(c.spoken + 0.4, c.start + 1.0), next - 0.08) };
});

const SHADOW = ['0 0 1px rgba(0,0,0,0.95)', '0 0 1.5px rgba(0,0,0,0.8)', '0 1px 2px rgba(0,0,0,0.6)', '0 3px 10px rgba(0,0,0,0.55)', '0 0 18px rgba(0,0,0,0.35)'].join(', ');

export const Subtitles: React.FC<{ f: number }> = ({ f }) => {
  const t = f / FPS;
  const cue = TIMED.find((c) => t >= c.start && t < c.end);
  if (!cue) return null;
  const op = clamp((t - cue.start) / 0.12) * clamp((cue.end - t) / 0.2);
  return (
    <div style={{ position: 'absolute', left: 0, width: 1080, bottom: 470, textAlign: 'center', fontFamily: SANS, fontSize: 43, lineHeight: 1.32, letterSpacing: '0.01em', color: '#f7f7f5', textShadow: SHADOW, whiteSpace: 'pre', opacity: op }}>
      {cue.text}
    </div>
  );
};

/** Opening title: tracked-out caps, clean fade with a slow letter-spacing drift. */
export const Title: React.FC<{ f: number }> = ({ f }) => {
  const [a, b] = BEAT.title;
  if (f < a || f > b) return null;
  const k = easeOut(prog(f, a, a + 14)) * (1 - prog(f, b - 12, b));
  const drift = prog(f, a, b);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 520 }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 22% at 50% 36%, rgba(0,0,0,0.55), rgba(0,0,0,0))', opacity: k }} />
      <div style={{ textAlign: 'center', opacity: k, color: '#fbf7f2', fontFamily: BOLD, textShadow: '0 2px 24px rgba(0,0,0,0.6)' }}>
        <div style={{ fontSize: 30, letterSpacing: `${0.5 + 0.1 * drift}em`, marginBottom: 18, fontFamily: SANS, opacity: 0.85 }}>NO ONE</div>
        <div style={{ fontSize: 92, letterSpacing: `${0.08 + 0.04 * drift}em`, lineHeight: 1.0 }}>COMES TO</div>
        <div style={{ fontSize: 92, letterSpacing: `${0.08 + 0.04 * drift}em`, lineHeight: 1.0 }}>SAVE YOU</div>
        <div style={{ margin: '28px auto 0', height: 3, width: 220 * k, background: '#ff8fa3' }} />
      </div>
    </AbsoluteFill>
  );
};

/** End card on black with the call to comment. */
export const EndCard: React.FC<{ f: number; start: number }> = ({ f, start }) => {
  if (f < start) return null;
  const bg = easeOut(prog(f, start, start + 12));
  const q = easeOut(prog(f, LINE.v4 + 2, LINE.v4 + 18));
  const sub = easeOut(prog(f, LINE.v4 + 40, LINE.v4 + 56));
  const out = 1 - prog(f, 1200 - 12, 1200);
  return (
    <AbsoluteFill style={{ background: `rgba(0,0,0,${bg})`, alignItems: 'center', justifyContent: 'center', opacity: out }}>
      <div style={{ textAlign: 'center', marginTop: -160 }}>
        <div style={{ fontFamily: BOLD, color: '#fbf7f2', fontSize: 96, lineHeight: 1.02, letterSpacing: '0.04em', opacity: q, transform: `translateY(${(1 - q) * 18}px)` }}>
          WHAT’S YOUR
          <br />
          EXCUSE?
        </div>
        <div style={{ margin: '34px auto 0', height: 3, width: 220 * q, background: '#ff8fa3' }} />
        <div style={{ fontFamily: SANS, color: '#c9c3cf', fontSize: 34, marginTop: 34, letterSpacing: '0.18em', opacity: sub }}>TELL ME IN THE COMMENTS</div>
      </div>
    </AbsoluteFill>
  );
};
