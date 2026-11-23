// Single source of timing for picture and sound. 43 s, 30 fps, 1080x1920. All times in seconds.
export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const DUR = 43;
export const DURATION = DUR * FPS;

// narration paragraph starts (clips in public/voice/p*.wav)
export const VO = { p1: 1.5, p2: 10.3, p3: 17.3, p4: 24.4, p5: 35.6 };

// shots: [id, start, end, fadeIn]  (fadeIn > 0 = dissolve over the previous shot)
export const SHOTS = [
  ['wide', 0, 3.6, 0],
  ['climb', 3.6, 8.6, 0],
  ['slip', 8.6, 9.9, 0],
  ['abyss', 9.9, 13.4, 0],
  ['grip', 13.4, 17.0, 0],
  ['haul', 17.0, 20.4, 0],
  ['lip', 20.15, 24.0, 0.25],
  ['reach', 24.0, 27.0, 0],
  ['hands', 27.0, 30.0, 0],
  ['pull', 30.0, 33.9, 0],
  ['dawn', 33.2, 43.0, 0.7],
];

// story beats
export const B = {
  slip: 9.0, // the hold breaks
  catch: 9.45, // one hand catches the ledge
  slide1: 13.9,
  slide2: 14.45,
  slap: 15.1, // second hand slaps onto the ledge
  pullStart: 16.0,
  reveal: 22.6, // lightning reveals the man at the summit
  kneel: 24.1,
  clasp: 28.5,
  over: 31.0, // chest over the lip
  knee: 31.6, // knee onto the summit
  stand: 34.2, // climber stands at dawn
  look: 36.6, // looks up into the sunrise
};

// climbing gait segments: [start, end, cycle s, gain per cycle m, gait time offset]
export const GAITS = {
  climb: [3.6, 9.0, 2.3, 0.42, 1.845],
  haul: [18.4, 20.4, 1.7, 0.42, 0.3],
  lip: [20.15, 22.3, 2.8, 0.36, 0.9],
  reach: [24.0, 25.6, 1.6, 0.6, 0.0],
};
export const LIMB_WIN = { hn: [0, 0.22], ff: [0.25, 0.45], hf: [0.5, 0.72], fn: [0.75, 0.95] };

// lightning: [time, strength 0..1, screen x 0..1, seed, thunder delay s]
export const BOLTS = [
  [0.25, 1.0, 0.72, 11, 0.15],
  [3.55, 0.85, 0.25, 23, 0.6],
  [6.4, 0.35, 0.8, 37, 2.2],
  [9.0, 1.0, 0.65, 41, 0.1],
  [11.9, 0.4, 0.2, 53, 1.8],
  [14.1, 0.7, 0.78, 67, 0.7],
  [18.2, 0.35, 0.3, 71, 2.0],
  [22.6, 1.0, 0.55, 83, 0.25],
  [26.0, 0.3, 0.2, 97, 2.4],
  [28.5, 0.45, 0.7, 101, 1.2],
  [31.2, 0.25, 0.85, 113, 2.6],
];

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (x) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const sstep = (t, a, b) => smooth((t - a) / (b - a));

/** storm intensity (rain, wind) */
export const storm = (t) => 1 - sstep(t, 30.8, 34.6);
/** dawn light */
export const dawn = (t) => sstep(t, 33.0, 38.0);

/** lightning flash brightness at time t (flicker envelope) */
export function flash(t) {
  let v = 0;
  for (const [bt, st] of BOLTS) {
    const d = t - bt;
    if (d < -0.02 || d > 0.9) continue;
    const fl = d < 0 ? 0 : d < 0.05 ? 1 : d < 0.1 ? 0.25 : d < 0.17 ? 0.85 : d < 0.22 ? 0.2 : 0.55 * Math.exp(-(d - 0.22) * 7);
    v = Math.max(v, fl * st);
  }
  return v;
}

/** contact events of a gait (for footstep/grip sounds) */
export function gaitEvents(g) {
  const [a, b, cyc, , off] = g;
  const ev = [];
  for (let n = -2; n < 20; n++) {
    for (const [limb, w] of Object.entries(LIMB_WIN)) {
      const t = a + (n + w[1]) * cyc - off;
      if (t > a + 0.05 && t < b) ev.push([+t.toFixed(3), limb[0] === 'h' ? 'hand' : 'foot']);
    }
  }
  return ev.sort((x, y) => x[0] - y[0]);
}
