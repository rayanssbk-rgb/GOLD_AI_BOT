// Single source of truth for timing: animation, subtitles and audio mix.
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION = 2490; // 83 s

const s = (x) => Math.round(x * FPS);
export const sec = (f) => f / FPS;

// Narration start frames (ids = public/voice/*.wav)
export const VOICE = {
  v1: s(8.2),
  v2: s(18.0),
  v3a: s(33.0),
  v3b: s(37.4),
  v4a: s(46.5),
  v4b: s(51.0),
  v4c: s(53.5),
  v5a: s(62.5),
  v5b: s(66.2),
  v6a: s(73.6),
  v6b: s(75.4),
  v6c: s(79.6),
};

// Scenes / shots: [start, end)
export const SC = {
  apartment: [0, s(16.4)], // S1 POV: door, keys, jacket, phone, window
  street: [s(16.0), s(23.6)], // S2a POV walking in the rain
  still: [s(23.2), s(30.4)], // S2b third person, immobile in the crowd
  clock: [s(30.0), s(33.2)], // S3 close-up clock 02:00
  desk: [s(33.0), s(45.6)], // S3 POV desk: laptop, fist, notebook, typing
  montage: [s(45.5), s(61.2)], // S4 montage
  sunrise: [s(61.0), s(73.2)], // S5 city at sunrise, orbit behind him
};

export const MONTAGE = [45.5, 47.2, 48.9, 50.6, 52.3, 54.0, 55.7, 57.4, 59.1, 61.0].map(s);

// Key beats
export const BEAT = {
  doorOpen: s(0.4),
  keys: s(5.0),
  jacketOff: s(6.2),
  jacketToss: s(7.6),
  phoneUp: s(8.0),
  phoneDown: s(12.6),
  fist: s(37.4),
  write: s(40.6),
  type: s(43.4),
  resultHit: s(61.0),
  black: s(73.0),
  silence: [s(77.4), s(79.4)],
  end: 2490,
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
