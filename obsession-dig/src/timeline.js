// Single source of timing. 32 s, 30 fps, 1080x1920, synced to public/music.wav (120 BPM, beat = 0.5 s).
export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const DUR = 32;
export const DURATION = DUR * FPS;
export const BEAT = 0.5;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (x) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const sstep = (t, a, b) => smooth((t - a) / (b - a));
export const easeIn = (x) => Math.pow(clamp(x), 2.4);
export const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const rnd = (i, j = 0) => {
  const s = Math.sin(i * 12.9898 + j * 78.233 + 0.5) * 43758.5453123;
  return s - Math.floor(s);
};

export const B = {
  look: 5.0, // looks down at the faint gold far below
  stand: 5.25,
  grab: 5.55, // picks up the pickaxe
  collapse: 8.25, // the floor gives way under him
  impact: 8.5, // lands on his back (music impact)
  up: 9.0, // gets up
  resume: 10.5, // digs again
  crystals: 14.0, // one crystal lights per beat (music bells)
  frenzy: 20.0, // obsession: strikes on every half beat
  breakthrough: 26.0, // the last strike breaks into the gold cavern (the drop)
  land: 26.35,
  rise: 27.0,
  raise: 28.4, // lifts the pickaxe high
  final: 30.0,
};

/** strike impact times + depth removed by each */
export const STRIKES = [];
for (const t of [6.0, 6.5, 7.0, 7.5, 8.0]) STRIKES.push([t, 0.12]);
for (let t = 10.5; t < 14; t += BEAT) STRIKES.push([t, 0.15]);
for (let t = 14; t < 20; t += BEAT) STRIKES.push([t, 0.25]);
for (let t = 20; t < 26; t += BEAT / 2) STRIKES.push([t, 0.28]);
export const COLLAPSE = 1.4;

/** how deep the shaft floor is at time t (m, positive down) */
export function depth(t) {
  let d = 0;
  for (const [ti, dd] of STRIKES) if (t > ti) d += dd * smooth((t - ti) / 0.1);
  d += COLLAPSE * easeIn(prog(t, B.collapse, B.impact));
  return d;
}
export const FINAL_DEPTH = depth(25.99);
export const LEDGE_Y = -(FINAL_DEPTH + 1.25);

/** the cavern (revealed at the breakthrough) */
export const CAVE = { cx: 7, cy: LEDGE_Y - 7.0, rx: 12.5, ry: 8.6 };

/** crystals in the shaft walls: one ignites per beat from 14 s (with the music bells) */
export const CRYSTALS = Array.from({ length: 12 }, (_, k) => {
  const t = B.crystals + k * BEAT;
  const side = k % 2 ? 1 : -1;
  return { t, side, y: -depth(t) + 0.55 + (k % 3) * 0.45, s: 0.12 + rnd(k, 3) * 0.08 };
});

/** warm light of the obsession: grows with the frenzy */
export const heat = (t) => 0.15 * sstep(t, 14, 20) + 0.85 * sstep(t, 20, 25.9);
