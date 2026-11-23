// Original cinematic score + realistic foley + narration mix, frame-locked to src/timeline.js.
// Pure Node, no dependencies. Writes public/soundtrack.wav (44.1 kHz, stereo, 16-bit).
import fs from 'node:fs';
import path from 'node:path';
import { FPS, DURATION, VOICE, SC, MONTAGE, BEAT, sec } from '../src/timeline.js';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const SR = 44100;
const LEN = Math.ceil((DURATION / FPS) * SR);
const bus = () => [new Float32Array(LEN), new Float32Array(LEN)];
const music = bus();
const fx = bus();
const voice = bus();

let seed = 11;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const noise = () => rand() * 2 - 1;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const sm = (t) => t * t * (3 - 2 * t);
const env = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
function put(b, i, v, pan = 0) {
  if (i < 0 || i >= LEN) return;
  b[0][i] += v * Math.cos(((pan + 1) * Math.PI) / 4);
  b[1][i] += v * Math.sin(((pan + 1) * Math.PI) / 4);
}
// simple biquad band-pass factory (RBJ)
function bandpass(f0, q) {
  const w = (2 * Math.PI * f0) / SR;
  const al = Math.sin(w) / (2 * q);
  const b0 = al, b2 = -al, a0 = 1 + al, a1 = -2 * Math.cos(w), a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = (b0 * x + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

// ================================================================== instruments
function piano(b, t0, n, amp, pan = 0, dur = 4) {
  const f = midi(n);
  const s0 = Math.floor(t0 * SR);
  for (let j = 0; j < SR * dur; j++) {
    const t = j / SR;
    const e = Math.min(1, t * 280) * (Math.exp(-t * 1.3) * 0.7 + Math.exp(-t * 5) * 0.3);
    const v = Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.001 * t) * Math.exp(-t * 2.2) + 0.18 * Math.sin(2 * Math.PI * f * 3.003 * t) * Math.exp(-t * 3.5) + 0.07 * Math.sin(2 * Math.PI * f * 4.006 * t) * Math.exp(-t * 5);
    put(b, s0 + j, v * e * amp, pan);
  }
}
/** String ensemble: 3 detuned band-limited saws, vibrato, slow attack. bright 0..1 */
function strings(b, t0, t1, n, amp, pan = 0, att = 1.2, rel = 1.6, bright = 0.4) {
  const f0 = midi(n);
  const voices = [-0.07, 0, 0.07];
  const s0 = Math.floor(Math.max(0, t0) * SR);
  const s1 = Math.min(LEN, Math.floor((t1 + rel) * SR));
  const H = 9;
  voices.forEach((d, vi) => {
    const f = f0 * Math.pow(2, d / 12);
    let ph = rand() * 6.28;
    for (let i = s0; i < s1; i++) {
      const t = i / SR;
      const a = sm(env(t, t0, t0 + att)) * (1 - sm(env(t, t1, t1 + rel)));
      const vib = 1 + 0.0035 * Math.sin(2 * Math.PI * 5.2 * t + vi);
      ph += (2 * Math.PI * f * vib) / SR;
      let v = 0;
      for (let h = 1; h <= H; h++) v += (Math.sin(h * ph) / h) * Math.exp(-(h - 1) * (1.1 - bright * 0.8));
      put(b, i, v * a * amp * 0.5, pan + (vi - 1) * 0.25);
    }
  });
}
function kick(b, t0, amp, pitch = 48, decay = 6) {
  const s0 = Math.floor(t0 * SR);
  for (let j = 0; j < SR * 0.8; j++) {
    const t = j / SR;
    const f = pitch + 100 * Math.exp(-t * 26);
    put(b, s0 + j, Math.sin(2 * Math.PI * f * t) * Math.exp(-t * decay) * amp, 0);
  }
}
// voice windows (seconds) so percussion never masks the words
const VOICE_WIN = Object.entries(VOICE).map(([id, fr]) => {
  const st = fs.statSync(path.join(ROOT, 'public', 'voice', `${id}.wav`));
  return [sec(fr) - 0.05, sec(fr) + (st.size - 44) / 2 / SR + 0.05];
});
const inVoice = (t) => VOICE_WIN.some(([a, z]) => t >= a && t <= z);
function taiko(b, t0, amp, pitch = 70, pan = 0) {
  if (inVoice(t0) || inVoice(t0 + 0.15)) amp *= 0.3;
  const s0 = Math.floor(t0 * SR);
  let lp = 0;
  for (let j = 0; j < SR * 1.2; j++) {
    const t = j / SR;
    lp += 0.05 * (noise() - lp);
    const f = pitch * (1 + 0.6 * Math.exp(-t * 14));
    put(b, s0 + j, (Math.sin(2 * Math.PI * f * t) + lp * 2.5 * Math.exp(-t * 20)) * Math.exp(-t * 4.5) * amp, pan);
  }
}
function cymbal(b, t0, amp, dur = 2.5, swell = false) {
  const s0 = Math.floor((t0 - (swell ? dur : 0)) * SR);
  let prev = 0;
  for (let j = 0; j < SR * dur; j++) {
    const t = j / SR;
    const n = noise();
    const hp = n - prev * 0.6;
    prev = n;
    const e = swell ? Math.pow(t / dur, 3) : Math.exp(-t * 2.2);
    put(b, s0 + j, hp * e * amp, (rand() - 0.5) * 0.6);
  }
}
function boom(b, t0, amp) {
  kick(b, t0, amp, 32, 1.7);
  taiko(b, t0, amp * 0.6, 45);
}

// ================================================================== SCORE
// D minor: Dm - Bb - F - C   (then Bb - C - Dm - F for the build, F major arrival)
const T_M = sec(MONTAGE[0]);
const T_HIT = sec(BEAT.resultHit);
const T_SIL0 = sec(BEAT.silence[0]);
const T_SIL1 = sec(BEAT.silence[1]);

// Part A — lonely piano (0 → 30 s), strings join in the rain
{
  const beat = 60 / 64;
  const prog = [
    [38, [62, 65, 69]],
    [34, [62, 65, 70]],
    [41, [60, 65, 69]],
    [36, [60, 64, 67]],
  ];
  const mel = [74, 72, 69, 72, 77, 76, 74, 72, 69, 67, 69, 72, 74, 76, 74, 69];
  let bar = 0;
  for (let t = 0.6; t < 30.2; t += beat * 4, bar++) {
    const [bass, ch] = prog[bar % 4];
    piano(music, t, bass - 12, 0.1, -0.2, 5);
    piano(music, t + 0.02, bass, 0.06, -0.2, 5);
    [0, 1, 2, 1].forEach((k, i) => piano(music, t + i * beat, ch[k] + (i === 3 ? 12 : 0), 0.035, 0.25 * (i % 2 ? 1 : -1), 3));
    if (bar >= 1) {
      piano(music, t + beat * 0.02, mel[(bar * 2) % 16], 0.055, 0.1, 4);
      piano(music, t + beat * 2.5, mel[(bar * 2 + 1) % 16], 0.045, 0.1, 4);
    }
    if (t > 15.5) {
      strings(music, t, t + beat * 4, bass, 0.03, -0.3, 1.5, 1.4, 0.25);
      strings(music, t, t + beat * 4, ch[1] + 12, 0.014, 0.3, 1.5, 1.4, 0.3);
    }
  }
}
// Part B — the night of the click (30 → 45.5 s)
{
  const a = 30.2;
  strings(music, a, sec(VOICE.v3b) - 0.3, 38, 0.03, -0.2, 2, 1.2, 0.2);
  strings(music, a, sec(VOICE.v3b) - 0.3, 57, 0.012, 0.2, 2, 1.2, 0.2);
  piano(music, 31.0, 62, 0.05, 0, 5);
  piano(music, 33.0, 65, 0.05, 0.1, 5);
  piano(music, 35.0, 69, 0.045, -0.1, 5);
  // drop to near silence on "Personne ne viendra te sauver", then a swell
  const sw = sec(VOICE.v3b) + 2.6;
  strings(music, sw, T_M, 34, 0.035, -0.3, 3.5, 0.6, 0.35);
  strings(music, sw, T_M, 46, 0.03, 0.0, 3.5, 0.6, 0.4);
  strings(music, sw + 1.5, T_M, 62, 0.018, 0.3, 3.0, 0.6, 0.45);
  strings(music, sw + 2.5, T_M, 65, 0.016, -0.3, 2.5, 0.6, 0.5);
  [74, 77, 81, 79, 77].forEach((n, i) => piano(music, sw + i * 0.9, n, 0.05, i % 2 ? 0.2 : -0.2, 4));
  cymbal(music, T_M, 0.05, 2.2, true);
}
// Part C — transformation montage: driving orchestral build (45.5 → 61 s)
{
  const beat = (MONTAGE[1] - MONTAGE[0]) / FPS / 4; // 4 beats per cut
  const chords = [
    [34, [58, 62, 65]],
    [36, [60, 64, 67]],
    [38, [62, 65, 69]],
    [41, [60, 65, 69]],
  ];
  for (let bar = 0; bar < 9; bar++) {
    const tb = sec(MONTAGE[bar]);
    const te = sec(MONTAGE[bar + 1]);
    const [bass, ch] = chords[bar % 4];
    const inten = bar / 8;
    strings(music, tb, te, bass - 12, 0.035 + 0.02 * inten, -0.2, 0.08, 0.25, 0.5 + 0.3 * inten);
    strings(music, tb, te, bass, 0.028 + 0.02 * inten, 0.0, 0.08, 0.25, 0.5 + 0.3 * inten);
    ch.forEach((n, i) => strings(music, tb, te, n + 12, 0.012 + 0.012 * inten, (i - 1) * 0.5, 0.15, 0.25, 0.55 + 0.3 * inten));
    // ostinato eighths
    for (let s = 0; s < 8; s++) piano(music, tb + s * beat * 0.5, [ch[0], ch[2], ch[1], ch[2]][s % 4] + 12, 0.03 + 0.02 * inten, s % 2 ? 0.35 : -0.35, 0.8);
    taiko(music, tb, 0.45 + 0.3 * inten, 62);
    taiko(music, tb + 2 * beat, 0.3 + 0.25 * inten, 70, 0.2);
    if (bar >= 2) taiko(music, tb + 3 * beat, 0.25 + 0.2 * inten, 85, -0.3);
    if (bar >= 4) taiko(music, tb + 3.5 * beat, 0.25 + 0.2 * inten, 95, 0.3);
    if (bar >= 5) kick(music, tb + beat, 0.3, 50);
  }
  for (let i = 0; i < 10; i++) taiko(music, T_HIT - 1.2 + i * 0.12, 0.2 + i * 0.05, 80 + i * 4, i % 2 ? 0.4 : -0.4);
  cymbal(music, T_HIT, 0.12, 3, true);
}
// Part D — arrival at sunrise: epic, emotional (61 → 73 s)
{
  boom(music, T_HIT, 1.0);
  cymbal(music, T_HIT, 0.14, 4);
  const end = sec(BEAT.black) + 0.4;
  const chords = [
    [41, [65, 69, 72, 77]], // F
    [36, [64, 67, 72, 76]], // C
    [38, [62, 65, 69, 74]], // Dm
    [34, [62, 65, 70, 74]], // Bb
  ];
  const len = 3.0;
  for (let i = 0, t = T_HIT; t < end - 0.5; i++, t += len) {
    const [bass, ch] = chords[i % 4];
    const fade = 1 - sm(env(t, end - 4, end));
    strings(music, t, Math.min(t + len, end), bass - 12, 0.05 * fade, -0.2, 0.3, 1.5, 0.6);
    strings(music, t, Math.min(t + len, end), bass, 0.04 * fade, 0.1, 0.3, 1.5, 0.65);
    ch.forEach((n, k) => strings(music, t, Math.min(t + len, end), n, 0.018 * fade, (k - 1.5) * 0.4, 0.4, 1.5, 0.7));
    piano(music, t, ch[3] + 12, 0.07 * fade, 0.2, 4);
    piano(music, t + len / 2, ch[2] + 12, 0.055 * fade, -0.2, 4);
    taiko(music, t, 0.35 * fade, 55);
  }
}
// Part E — the last words
{
  const a = sec(VOICE.v6a) - 0.4;
  strings(music, a, T_SIL0 - 0.8, 38, 0.03, 0, 0.8, 0.7, 0.2);
  strings(music, a, T_SIL0 - 0.8, 57, 0.012, 0.2, 0.8, 0.7, 0.2);
  piano(music, sec(VOICE.v6a), 69, 0.06, 0, 3);
  piano(music, sec(VOICE.v6b), 74, 0.05, 0.1, 3);
  // signature: deep boom + warm major chord
  const s = sec(VOICE.v6c) - 0.05;
  boom(music, s, 0.75);
  [53, 57, 60, 65].forEach((n, i) => strings(music, s, sec(BEAT.end) - 1.6, n, 0.016, (i - 1.5) * 0.4, 0.6, 1.4, 0.4));
  piano(music, s, 77, 0.06, 0, 4);
}

// ================================================================== FOLEY
function rain(a, z, amp, indoor = false) {
  const bp = bandpass(indoor ? 900 : 3500, 0.5);
  let lp = 0;
  for (let i = Math.floor(a * SR); i < Math.floor(z * SR); i++) {
    const t = i / SR;
    const k = sm(env(t, a, a + 0.6)) * (1 - sm(env(t, z - 0.6, z)));
    const n = noise();
    lp += (indoor ? 0.08 : 0.4) * (n - lp);
    const drop = rand() < (indoor ? 0.0008 : 0.004) ? noise() * 0.8 : 0;
    put(fx, i, (bp(n) * 0.6 + lp * 0.25 + drop) * k * amp, Math.sin(t * 0.37) * 0.5);
  }
}
function step(t0, amp, pan = 0, wet = false, indoor = false) {
  const s0 = Math.floor(t0 * SR);
  let lp = 0;
  for (let j = 0; j < SR * 0.22; j++) {
    const t = j / SR;
    lp += (indoor ? 0.15 : 0.1) * (noise() - lp);
    const heel = Math.sin(2 * Math.PI * (indoor ? 95 : 70) * t) * Math.exp(-t * 40) * 0.6;
    const splash = wet ? noise() * 0.35 * Math.exp(-t * 18) * (t > 0.02 ? 1 : 0.3) : 0;
    put(fx, s0 + j, (lp * 2.4 * Math.exp(-t * 30) + heel + splash) * amp, pan);
  }
}
function breath(t0, amp, dur = 1.1, inhale = false, pan = 0) {
  const bp = bandpass(inhale ? 1400 : 900, 0.8);
  const s0 = Math.floor(t0 * SR);
  for (let j = 0; j < SR * dur; j++) {
    const t = j / SR;
    const e = inhale ? Math.sin(Math.PI * Math.pow(t / dur, 0.7)) : Math.sin(Math.PI * Math.pow(t / dur, 1.6));
    put(fx, s0 + j, bp(noise()) * e * e * amp, pan);
  }
}
function tick(t0, amp, freq = 2200, decay = 90, pan = 0) {
  const s0 = Math.floor(t0 * SR);
  for (let j = 0; j < SR * 0.06; j++) {
    const t = j / SR;
    put(fx, s0 + j, (Math.sin(2 * Math.PI * freq * t) * 0.6 + noise() * 0.4) * Math.exp(-t * decay) * amp, pan);
  }
}
function typing(a, z, amp, rate = 9, pan = 0.05) {
  for (let t = a; t < z; t += (1 / rate) * (0.55 + rand() * 0.9)) tick(t, amp * (0.6 + rand() * 0.5), 1500 + rand() * 1800, 140, pan + (rand() - 0.5) * 0.2);
}
function scratch(a, z, amp, pan = 0.2) {
  const bp = bandpass(4200, 1.2);
  for (let i = Math.floor(a * SR); i < Math.floor(z * SR); i++) {
    const t = i / SR;
    const stroke = Math.pow(Math.max(0, Math.sin(t * 2 * Math.PI * 3.1) * Math.sin(t * 2 * Math.PI * 7.3 + 1)), 0.5);
    put(fx, i, bp(noise()) * stroke * amp * (1 - sm(env(t, z - 0.15, z))), pan);
  }
}
function creak(a, z, amp, pan = 0) {
  let ph = 0;
  const bp = bandpass(700, 3);
  for (let i = Math.floor(a * SR); i < Math.floor(z * SR); i++) {
    const t = i / SR;
    const k = Math.sin(Math.PI * env(t, a, z));
    const f = 160 + 140 * env(t, a, z) + 25 * Math.sin(t * 31);
    ph += (2 * Math.PI * f) / SR;
    const pulses = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 23);
    put(fx, i, bp(((ph / (2 * Math.PI)) % 1) * 2 - 1) * pulses * k * amp, pan);
  }
}
function jingle(t0, amp, pan = 0.2) {
  for (let k = 0; k < 9; k++) {
    const tt = t0 + k * 0.025 + rand() * 0.03;
    const fq = 3000 + rand() * 4500;
    const s0 = Math.floor(tt * SR);
    for (let j = 0; j < SR * 0.4; j++) {
      const t = j / SR;
      put(fx, s0 + j, Math.sin(2 * Math.PI * fq * t) * Math.exp(-t * (12 + rand() * 0.01)) * amp * (1 - k * 0.08), pan);
    }
  }
}
function rustle(a, z, amp, pan = 0) {
  const bp = bandpass(2200, 0.7);
  for (let i = Math.floor(a * SR); i < Math.floor(z * SR); i++) {
    const t = i / SR;
    const g = Math.pow(Math.max(0, Math.sin(t * 2 * Math.PI * 1.7) * Math.sin(t * 2 * Math.PI * 4.3)), 1.5);
    put(fx, i, bp(noise()) * g * amp * Math.sin(Math.PI * env(t, a, z)), pan);
  }
}
function whoosh(t0, amp, dur = 2.4, pan0 = -0.8, pan1 = 0.8, tone = 0) {
  const s0 = Math.floor((t0 - dur / 2) * SR);
  let lp = 0;
  for (let j = 0; j < SR * dur; j++) {
    const t = j / SR;
    const k = Math.pow(Math.sin(Math.PI * (t / dur)), 3);
    lp += (0.03 + 0.12 * k) * (noise() - lp);
    const hum = tone ? Math.sin(2 * Math.PI * tone * (1.06 - 0.12 * (t / dur)) * t) * 0.3 : 0;
    put(fx, s0 + j, (lp * 1.6 + hum) * k * amp, pan0 + (pan1 - pan0) * (t / dur));
  }
}
function cityHum(a, z, amp) {
  let lp = 0;
  for (let i = Math.floor(a * SR); i < Math.floor(z * SR); i++) {
    const t = i / SR;
    lp += 0.004 * (noise() - lp);
    const k = sm(env(t, a, a + 1)) * (1 - sm(env(t, z - 1, z)));
    put(fx, i, (lp * 6 + Math.sin(2 * Math.PI * 58 * t) * 0.02) * k * amp, 0);
  }
}
function alarm(a, z, amp) {
  for (let t = a; t < z; t += 0.5) for (let k = 0; k < 3; k++) {
    const s0 = Math.floor((t + k * 0.1) * SR);
    for (let j = 0; j < SR * 0.07; j++) put(fx, s0 + j, Math.sin(2 * Math.PI * 1975 * (j / SR)) * Math.min(1, (0.07 - j / SR) * 60) * amp, 0.3);
  }
}
function buzz(t0, amp) {
  for (let j = 0; j < SR * 0.45; j++) {
    const t = j / SR;
    put(fx, Math.floor(t0 * SR) + j, Math.tanh(Math.sin(2 * Math.PI * 140 * t) * 4) * 0.4 * Math.min(1, (0.45 - t) * 20) * amp, 0);
  }
}
function chirp(t0, amp, pan) {
  let ph = 0;
  for (let j = 0; j < SR * 0.12; j++) {
    const t = j / SR;
    const f = 3500 + 1800 * Math.sin(t * 60);
    ph += (2 * Math.PI * f) / SR;
    put(fx, Math.floor(t0 * SR) + j, Math.sin(ph) * Math.sin(Math.PI * t / 0.12) * amp, pan);
  }
}

// S1 apartment
cityHum(0, 16.5, 0.05);
rain(0, 16.4, 0.12, true);
creak(sec(BEAT.doorOpen), sec(BEAT.doorOpen) + 1.3, 0.18, 0);
for (const t of [1.5, 2.15, 2.8, 3.45]) step(t, 0.28, 0, false, true);
jingle(sec(BEAT.keys), 0.07, 0.15);
tick(sec(BEAT.keys) + 0.02, 0.25, 800, 50, 0.15);
rustle(5.5, 7.6, 0.25, 0.2);
step(sec(BEAT.jacketToss) + 0.25, 0.12, 0.4, false, true);
for (let i = 0; i < 4; i++) tick(sec(272 + i * 24), 0.05, 3200, 120, 0.1);
breath(11.9, 0.09, 1.4, false);
for (const t of [13.2, 13.75, 14.3, 14.85, 15.4]) step(t, 0.22, 0, false, true);
// S2 street
rain(16.0, 30.6, 0.45);
cityHum(16.0, 30.6, 0.12);
for (let t = 16.15; t < sec(SC.street[1]); t += 0.555) step(t, 0.33, -0.1 + 0.2 * ((Math.round(t / 0.555)) % 2), true);
whoosh(17.6, 0.5, 2.4, 0.9, -0.6, 110);
whoosh(20.2, 0.45, 2.2, -0.9, 0.5, 95);
whoosh(22.6, 0.5, 2.4, 0.8, -0.8, 120);
breath(19.0, 0.12, 1.2, false);
breath(21.6, 0.1, 1.0, true);
// immobile: the city rushes by (sped-up whooshes, low heartbeat)
for (let i = 0; i < 9; i++) whoosh(23.6 + i * 0.75, 0.3, 1.0, i % 2 ? 0.9 : -0.9, i % 2 ? -0.9 : 0.9, 140);
for (let t = 24.0; t < 30.0; t += 1.1) {
  kick(fx, t, 0.22, 42, 12);
  kick(fx, t + 0.24, 0.14, 42, 12);
}
breath(27.2, 0.12, 1.6, false);
// S3 desk
rain(30.0, 45.6, 0.1, true);
for (let t = 30.0; t < 41.5; t += 1) tick(t, t < 33.5 ? 0.22 : 0.09, 3800, 160, -0.2);
tick(33.0, 0.32, 1200, 60, -0.2); // 02:00
tick(34.55, 0.2, 900, 50, 0); // lid
breath(sec(BEAT.fist) + 1.4, 0.1, 1.3, true);
breath(sec(BEAT.fist) + 2.8, 0.12, 1.6, false);
scratch(sec(BEAT.write) + 0.1, sec(BEAT.type) - 0.1, 0.09);
typing(sec(BEAT.type) + 0.2, sec(SC.desk[1]), 0.09);
tick(sec(BEAT.type) + 1.05, 0.3, 600, 40, -0.4); // lamp switch
// S4 montage
alarm(sec(MONTAGE[0]), sec(MONTAGE[0]) + 1.3, 0.06);
tick(sec(MONTAGE[0]) + 1.3, 0.12, 1500, 80, 0.3);
typing(sec(MONTAGE[1]), sec(MONTAGE[2]), 0.1, 12);
rustle(sec(MONTAGE[2]) + 0.25, sec(MONTAGE[2]) + 1.05, 0.25, 0.1);
for (let t = sec(MONTAGE[3]); t < sec(MONTAGE[4]); t += 0.32) step(t, 0.25, 0, true);
breath(sec(MONTAGE[3]) + 0.2, 0.12, 0.6, false);
breath(sec(MONTAGE[3]) + 0.85, 0.1, 0.6, true);
buzz(sec(MONTAGE[4]) + 0.08, 0.12);
kick(fx, sec(MONTAGE[4] + 26), 0.6, 60, 14);
tick(sec(MONTAGE[4] + 26), 0.3, 700, 40, 0);
scratch(sec(MONTAGE[5]) + 0.1, sec(MONTAGE[6]) - 0.1, 0.09);
rain(sec(MONTAGE[6]), sec(MONTAGE[7]), 0.12, true);
breath(sec(MONTAGE[6]) + 0.3, 0.12, 1.2, false);
for (let t = sec(MONTAGE[7]); t < sec(MONTAGE[8]); t += 0.09) tick(t, 0.05, 3800, 160, -0.2);
for (let t = sec(MONTAGE[8]); t < sec(MONTAGE[9]); t += 0.32) step(t, 0.25, 0, false);
breath(sec(MONTAGE[8]) + 0.5, 0.11, 0.6, false);
// S5 sunrise: wind + birds
{
  let lp = 0;
  const a = sec(SC.sunrise[0]);
  const z = sec(BEAT.black) + 0.5;
  for (let i = Math.floor(a * SR); i < Math.floor(z * SR); i++) {
    const t = i / SR;
    lp += 0.008 * (noise() - lp);
    put(fx, i, lp * 3.5 * sm(env(t, a, a + 1.5)) * (1 - sm(env(t, z - 2, z))), Math.sin(t * 0.4) * 0.5);
  }
  for (let k = 0; k < 10; k++) chirp(a + 1.5 + k * 0.9 + rand() * 0.4, 0.03, (rand() - 0.5) * 1.2);
}

// ================================================================== NARRATION
function readWav(file) {
  const b = fs.readFileSync(file);
  let off = 12, fmt = null;
  while (off < b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(off + 10), sr: b.readUInt32LE(off + 12) };
    if (id === 'data') {
      const n = size / 2 / fmt.ch;
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = b.readInt16LE(off + 8 + i * 2 * fmt.ch) / 32768;
      if (fmt.sr !== SR) throw new Error(file + ': sample rate ' + fmt.sr);
      return out;
    }
    off += 8 + size;
  }
  throw new Error('bad wav ' + file);
}
const vOn = new Float32Array(LEN);
for (const [id, frame] of Object.entries(VOICE)) {
  const x = readWav(path.join(ROOT, 'public', 'voice', `${id}.wav`));
  let pk = 0;
  for (const v of x) pk = Math.max(pk, Math.abs(v));
  const s0 = Math.floor(sec(frame) * SR);
  for (let i = 0; i < x.length; i++) {
    put(voice, s0 + i, (x[i] / pk) * 0.7, 0);
    if (s0 + i < LEN) vOn[s0 + i] = 1;
  }
}

// ================================================================== reverb + mix
function reverb([inL, inR], wet, size, damp = 0.3, fb = 0.84) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((n) => Math.floor(n * size));
  const out = [new Float32Array(LEN), new Float32Array(LEN)];
  [[inL, out[0], 0], [inR, out[1], 23]].forEach(([inp, o, spread]) => {
    const acc = new Float32Array(LEN);
    for (const c of combs) {
      const d = c + spread;
      const buf = new Float32Array(d);
      let idx = 0, filt = 0;
      for (let i = 0; i < LEN; i++) {
        const y = buf[idx];
        filt = y * (1 - damp) + filt * damp;
        buf[idx] = inp[i] + filt * fb;
        acc[i] += y;
        idx = (idx + 1) % d;
      }
    }
    for (const a of [225, 556, 441]) {
      const d = a + spread;
      const buf = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < LEN; i++) {
        const bb = buf[idx];
        const x = acc[i];
        buf[idx] = x + bb * 0.5;
        acc[i] = bb - x;
        idx = (idx + 1) % d;
      }
    }
    for (let i = 0; i < LEN; i++) o[i] = inp[i] * (1 - wet * 0.25) + acc[i] * wet * 0.11;
  });
  return out;
}
const mR = reverb(music, 0.6, 1.25);
const fR = reverb(fx, 0.22, 0.7);
const vR = reverb(voice, 0.05, 0.5, 0.5, 0.6);

const duck = new Float32Array(LEN);
{
  let e = 0;
  for (let i = 0; i < LEN; i++) {
    e += (vOn[i] - e) * (vOn[i] > e ? 1 / (0.05 * SR) : 1 / (0.45 * SR));
    duck[i] = e;
  }
}
const MUSIC = process.env.NO_MUSIC ? 0 : 1; // NO_MUSIC=1: voice + sound effects only
const L = new Float32Array(LEN);
const R = new Float32Array(LEN);
for (let i = 0; i < LEN; i++) {
  const t = i / SR;
  const g = 1 - 0.68 * duck[i];
  // the orchestra grows through the transformation and the sunrise
  const lift = 1 + 0.45 * sm(env(t, T_M - 1, T_M + 6)) * (1 - sm(env(t, sec(BEAT.black) - 1, sec(BEAT.black) + 1))) + 0.25 * sm(env(t, T_HIT - 0.2, T_HIT + 0.5)) * (1 - sm(env(t, T_HIT + 6, T_HIT + 11)));
  // two seconds of true silence before "Commence aujourd'hui"
  const pre = 1 - sm(env(t, T_SIL0 - 0.9, T_SIL0));
  const gate = t < T_SIL0 ? pre : t < T_SIL1 + 0.05 ? 0 : 1;
  L[i] = (MUSIC * mR[0][i] * g * lift + fR[0][i] * 0.9 * g) * gate + vR[0][i] * 1.5 * (t < T_SIL0 || t >= T_SIL1 ? 1 : 0);
  R[i] = (MUSIC * mR[1][i] * g * lift + fR[1][i] * 0.9 * g) * gate + vR[1][i] * 1.5 * (t < T_SIL0 || t >= T_SIL1 ? 1 : 0);
}
let hl = 0, hr = 0, pl = 0, pr = 0;
for (let i = 0; i < LEN; i++) {
  hl = 0.996 * (hl + L[i] - pl); pl = L[i]; L[i] = hl;
  hr = 0.996 * (hr + R[i] - pr); pr = R[i]; R[i] = hr;
}
let peak = 0;
for (let i = 0; i < LEN; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const DRIVE = Number(process.env.DRIVE ?? 2.6);
for (let i = 0; i < LEN; i++) {
  const end = 1 - sm(env(i / SR, sec(BEAT.end) - 0.8, sec(BEAT.end)));
  L[i] = (Math.tanh((L[i] / peak) * DRIVE) / Math.tanh(DRIVE)) * 0.96 * end;
  R[i] = (Math.tanh((R[i] / peak) * DRIVE) / Math.tanh(DRIVE)) * 0.96 * end;
}
const buf = Buffer.alloc(44 + LEN * 4);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + LEN * 4, 4);
buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(LEN * 4, 40);
for (let i = 0; i < LEN; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
}
fs.writeFileSync(path.join(ROOT, 'public', process.env.OUT_WAV ?? 'soundtrack.wav'), buf);
console.log('soundtrack.wav', (LEN / SR).toFixed(2), 's');
