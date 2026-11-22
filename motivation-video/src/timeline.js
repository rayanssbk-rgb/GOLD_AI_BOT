// Shared timeline: imported by the Remotion composition AND by the audio
// generator, so every sound is frame-locked to the animation.

export const FPS = 30;
export const DURATION = 600; // 20 s
export const WIDTH = 1080;
export const HEIGHT = 1920;

// World geometry (SVG coordinates, y grows downward)
export const GY = 1560; // ground line
export const RUNG = 36; // rung spacing
export const RUNGS = 30;
export const LADDER_LEN = RUNG * RUNGS; // 1080
export const WALL_TOP = GY - LADDER_LEN; // 480
export const RAIL = 42; // half ladder width
export const RED_X = 300;
export const WHITE_X0 = 820; // where the white ladder is first raised
export const WHITE_X = 780; // after being adjusted

// Key moments (frames)
export const T = {
  fig1RunStart: 10,
  fig1ClimbStart: 34,
  fig1FastEnd: 130,
  fig1Reach: 215,
  slipStart: 270,
  slipSlide: 300,
  fig1Land: 338,
  ladderThud: 372,
  fig2WalkStart: 56,
  fig2WalkEnd: 92,
  fig2Grab: 104,
  liftStart: 126,
  liftEnd: 182,
  adjustEnd: 204,
  inspectEnd: 228,
  shakeEnd: 250,
  fig2ClimbStart: 270,
  fig2ClimbEnd: 400,
  fig2OnTop: 436,
  fadeOutStart: 452,
  black: 468,
  text1: 474,
  text2: 528,
};

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeInQuad = (t) => t * t;
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const prog = (f, a, b) => clamp((f - a) / (b - a));

/** Climb progress of the impatient climber, in rungs (body rise). */
export function fig1Climb(f) {
  if (f < T.fig1ClimbStart) return 0;
  if (f < T.fig1FastEnd) {
    // fast, almost linear: ~4 frames per rung
    return 24 * prog(f, T.fig1ClimbStart, T.fig1FastEnd);
  }
  if (f < T.fig1Reach) {
    return 24 + 2.6 * easeOutCubic(prog(f, T.fig1FastEnd, T.fig1Reach));
  }
  return 26.6;
}

/** Climb progress of the patient climber, in rungs. */
export function fig2Climb(f) {
  if (f < T.fig2ClimbStart) return 0;
  // steady, smooth, 5 frames per rung
  return 26 * prog(f, T.fig2ClimbStart, T.fig2ClimbEnd);
}

/**
 * Height (in rungs) of one limb for a given body progress c.
 * Each limb moves 2 rungs per step; o = 0/1 picks which limb leads.
 * window: fraction of the cycle spent moving (smaller = snappier).
 */
export function limbRung(c, o, window, ease) {
  const u = (c + o) / 2;
  const n = Math.floor(u);
  const fr = u - n;
  const m = ease(clamp(fr / window));
  return 2 * (n + m) - o;
}

export const FIG1_WINDOW = 0.42;
export const FIG2_WINDOW = 0.7;

/** Rotation of the red ladder (degrees, negative = tipping left). */
export function redLadderAngle(f) {
  if (f < T.slipStart) {
    // tiny foreshadowing wobble once he hesitates near the top
    const w = prog(f, T.fig1Reach - 20, T.slipStart);
    return w * 0.9 * Math.sin(f * 0.9);
  }
  if (f < T.slipSlide) {
    const t = prog(f, T.slipStart, T.slipSlide);
    return -6 * easeInQuad(t) + 1.6 * Math.sin(f * 1.3) * (1 - t * 0.4);
  }
  if (f < T.fig1Land) {
    const t = prog(f, T.slipSlide, T.fig1Land);
    return -6 - 18 * easeInQuad(t) + 0.8 * Math.sin(f * 1.7) * (1 - t);
  }
  if (f < T.ladderThud) {
    const t = prog(f, T.fig1Land, T.ladderThud);
    return -24 - 66 * easeInCubic(t);
  }
  // small bounce after the impact
  const t = f - T.ladderThud;
  return -90 + 2.2 * Math.exp(-t / 5) * Math.sin(t * 1.4);
}

/** Fig1 progress while sliding down (rungs). */
export function fig1Slide(f) {
  const t = prog(f, T.slipSlide, T.fig1Land);
  return 26.6 * (1 - easeInQuad(t));
}

export const sec = (f) => f / FPS;
