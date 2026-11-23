// Single source of timing for picture, dialogue, subtitles and sound effects. 40 s at 30 fps.
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION = 1200; // 40 s
const s = (x) => Math.round(x * FPS);
export const sec = (f) => f / FPS;

// dialogue start frames (durations come from scripts/words.json)
export const LINE = {
  k1: s(0.35), // KNOX  Still waiting on a miracle, kid?
  d0: s(2.6), //  DRE   I'm just tired, man.
  d1: s(7.8), //  DRE   Everybody out there is winning. And I'm still stuck.
  v1: s(11.4), // VINCE Stuck is a choice.
  v2: s(13.6), // VINCE I was broke at thirty. Nobody believed in me.
  k2: s(20.3), // KNOX  Nobody's coming, Dre. Not luck. Not your family. Nobody.
  k3: s(24.6), // KNOX  Only you.
  v3: s(27.4), // VINCE Every night you quit, somebody else doesn't.
  d2: s(31.2), // DRE   Then I start tonight.
  k4: s(35.4), // KNOX  About time.
  v4: s(37.7), // VINCE So... what's your excuse?
};

// shots [start, end) in frames; neighbours overlap for crossfades
export const SC = {
  car1: [0, s(7.0)],
  roof1: [s(6.8), s(17.2)],
  aerial: [s(17.0), s(19.7)],
  pier: [s(19.5), s(26.7)],
  roof2: [s(26.5), s(33.7)],
  car2: [s(33.5), s(37.3)],
  end: [s(37.0), DURATION],
};
export const BEAT = {
  title: [s(4.5), s(6.8)],
  dreStand: s(30.6),
  ignition: s(33.9),
};

/** time of day: 0 pink sunset .. 1 deep night, continuous over the film */
export const tod = (f) => {
  const k = [
    [0, 0.0],
    [s(7), 0.08],
    [s(17), 0.42],
    [s(19.7), 0.68],
    [s(26.7), 0.8],
    [s(33.7), 0.96],
    [DURATION, 1.0],
  ];
  for (let i = 1; i < k.length; i++) if (f <= k[i][0]) return k[i - 1][1] + ((f - k[i - 1][0]) / (k[i][0] - k[i - 1][0])) * (k[i][1] - k[i - 1][1]);
  return 1;
};

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (f, a, b) => clamp((f - a) / (b - a));
export const ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t) => t * t * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const rnd = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** Keyframe helper: keys = [[frame, value], ...] with smooth easing. */
export function kf(f, keys, e = ease) {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i];
    const [f1, v1] = keys[i + 1];
    if (f <= f1) {
      const t = e(clamp((f - f0) / (f1 - f0)));
      if (Array.isArray(v0)) return v0.map((x, j) => lerp(x, v1[j], t));
      return lerp(v0, v1, t);
    }
  }
  return keys[keys.length - 1][1];
}
