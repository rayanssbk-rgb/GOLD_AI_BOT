// Single source of truth for timing — used by the animation AND the audio mix.
export const FPS = 30;
export const DURATION = 1845; // 61.5 s
export const WIDTH = 1080;
export const HEIGHT = 1920;

// Narration: start frame of each voice line (ids match public/voice/*.wav)
export const VOICE = {
  n1a: 69,   // 2.3 s  Il avait de grands rêves.
  n1b: 147,  // 4.9 s  Mais personne ne voyait son potentiel.
  n2a: 282,  // 9.4 s  On lui disait qu'il perdait son temps.
  n2b: 366,  // 12.2 s Alors il a arrêté d'en parler…
  n3a: 510,  // 17.0 s Il a échoué. Encore une fois…
  n3b: 660,  // 22.0 s Tellement de fois…
  n4a: 840,  // 28.0 s Mais pendant que les autres…
  n4b: 939,  // 31.3 s lui, construisait le sien.
  n5a: 1266, // 42.2 s Et un jour…
  n6a: 1452, // 48.4 s N'abandonne pas…
  n6b: 1578, // 52.6 s Même les plus grandes réussites…
  n6c: 1710, // 57.0 s Travaille en silence…
};

// Shots: [start, end] frames (overlaps = crossfades)
export const SHOTS = {
  room: [0, 142],
  feed: [134, 196],
  bank: [190, 236],
  bow: [228, 280],
  street: [270, 392],
  desk: [384, 505],
  fail: [497, 606],
  despair: [598, 795],
  montage: [787, 1152],
  result: [1150, 1290],
  window: [1280, 1450],
  city: [1440, 1600],
  moral: [1440, 1845],
};

// Failure beats in scene 3 (synced to the words "échoué", "Encore", "encore")
export const FAILS = [VOICE.n3a + 10, VOICE.n3a + 36, VOICE.n3a + 79];

// Montage cuts every 60 frames (4 beats at 120 BPM)
export const MONTAGE_CUTS = [787, 847, 907, 967, 1027, 1087, 1152];
export const BPM = 120;

export const RESULT_HIT = 1150; // first positive results (big musical hit)
export const BLACK = 1592; // fully black after the city pull-back
export const SILENCE = [1688, 1710]; // total silence before the last line
export const FINAL_BOOM = 1812;

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (f, a, b) => clamp((f - a) / (b - a));
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
