// Theatrical English subtitles. Rendered as a transparent overlay and composited AFTER the grade,
// so the text stays crisp (no bloom, no grain) like burned-in release subtitles.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import subs from './subtitles.json';
import { useFonts } from './fonts';
import { VOICE, FPS, clamp } from './timeline.js';

type Word = { w: string; s: number; e: number };
const W = subs as Record<string, Word[]>;

type Cue = [keyof typeof VOICE, number, number, string];
// [voice line, first word, last word, text ("\n" = line break)]
const CUES_EN: Cue[] = [
  ['v1', 0, 5, 'Sometimes, you watch\nothers succeed.'],
  ['v1', 6, 14, 'And you wonder why your life\nisn’t moving forward.'],
  ['v2', 0, 4, 'You smile in front of everyone.'],
  ['v2', 5, 16, 'But deep down, you know\nyou want so much more.'],
  ['v3a', 0, 6, 'Then one day,\nyou realize something.'],
  ['v3b', 0, 4, 'No one is coming to save you.'],
  ['v4a', 0, 6, 'So you stop making excuses.'],
  ['v4b', 0, 2, 'You stop waiting.'],
  ['v4c', 0, 3, 'You start building.'],
  ['v5a', 0, 6, 'And one day, you’ll look back.'],
  ['v5b', 0, 8, 'You’ll understand that every\nhard night had a reason.'],
  ['v6a', 0, 3, 'Your life can change.'],
  ['v6b', 0, 6, 'But not if you stay the same.'],
  ['v6c', 0, 1, 'Start today.'],
];
// French: same dialogue as the voice. The final lines are already on screen as title cards,
// so (as in films) they are not subtitled a second time.
const CUES_FR: Cue[] = [
  ['v1', 0, 5, 'Parfois, tu regardes\nles autres réussir.'],
  ['v1', 6, 14, 'Et tu te demandes pourquoi\nta vie n’avance pas.'],
  ['v2', 0, 4, 'Tu souris devant les autres.'],
  ['v2', 5, 16, 'Mais au fond de toi, tu sais\nque tu veux tellement plus.'],
  ['v3a', 0, 6, 'Puis un jour,\ntu comprends une chose.'],
  ['v3b', 0, 4, 'Personne ne viendra te sauver.'],
  ['v4a', 0, 6, 'Alors, tu arrêtes\nde chercher des excuses.'],
  ['v4b', 0, 2, 'Tu arrêtes d’attendre.'],
  ['v4c', 0, 3, 'Tu commences à construire.'],
  ['v5a', 0, 6, 'Et un jour,\ntu regarderas derrière toi.'],
  ['v5b', 0, 8, 'Tu comprendras que chaque nuit\ndifficile avait une raison.'],
];

const FADE_IN = 0.12;
const FADE_OUT = 0.2;
const MIN_DUR = 1.1; // shortest time on screen
const HOLD = 0.45; // linger after the last word, natural reading pause

// absolute timings: appear exactly when the first word starts, never before
const timed = (cues: Cue[]) => cues.map(([id, a, b, text]) => {
  const t0 = VOICE[id] / FPS;
  return { text, start: t0 + W[id][a].s, spoken: t0 + W[id][b].e };
}).map((c, i, all) => {
  const next = all[i + 1]?.start ?? Infinity;
  const end = Math.min(Math.max(c.spoken + HOLD, c.start + MIN_DUR), next - 0.08);
  return { ...c, end };
});
export const TIMED = { en: timed(CUES_EN), fr: timed(CUES_FR) };

const FONT = "'Inter500', 'Helvetica Neue', Arial, sans-serif";
// very thin dark outline (tight shadows) + soft drop shadow
const SHADOW = [
  '0 0 1px rgba(0,0,0,0.95)',
  '0 0 1.5px rgba(0,0,0,0.8)',
  '0 1px 2px rgba(0,0,0,0.6)',
  '0 3px 10px rgba(0,0,0,0.55)',
  '0 0 18px rgba(0,0,0,0.35)',
].join(', ');

// Lower third, above TikTok's caption/username block and left of the action rail.
export const SUB_BOTTOM = 470; // px from the bottom edge (1920 tall frame)

export const SubtitlesEN: React.FC<{ lang?: 'en' | 'fr' }> = ({ lang = 'en' }) => {
  useFonts();
  const t = useCurrentFrame() / FPS;
  const cue = TIMED[lang].find((c) => t >= c.start && t < c.end);
  if (!cue) return null;
  const op = clamp((t - cue.start) / FADE_IN) * clamp((cue.end - t) / FADE_OUT);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: 1080,
          bottom: SUB_BOTTOM,
          textAlign: 'center',
          fontFamily: FONT,
          fontSize: 43,
          lineHeight: 1.32,
          letterSpacing: '0.01em',
          color: '#f7f7f5',
          textShadow: SHADOW,
          whiteSpace: 'pre',
          opacity: op,
        }}
      >
        {cue.text}
      </div>
    </AbsoluteFill>
  );
};
