// Procedural cinematic soundtrack + foley, frame-locked to src/timeline.js.
// Pure Node, no dependencies. Writes public/soundtrack.wav (44.1 kHz, 16-bit stereo).
import fs from 'node:fs';
import path from 'node:path';
import {
  FPS,
  DURATION,
  T,
  fig1Climb,
  fig2Climb,
  FIG1_WINDOW,
  FIG2_WINDOW,
} from '../src/timeline.js';

const SR = 44100;
const LEN = Math.ceil((DURATION / FPS) * SR);
const L = new Float32Array(LEN);
const R = new Float32Array(LEN);
// separate buses so music and foley get different reverb amounts
const mL = new Float32Array(LEN), mR = new Float32Array(LEN);
const sL = new Float32Array(LEN), sR = new Float32Array(LEN);

const fs2s = (f) => f / FPS;
let seed = 12345;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const noise = () => rand() * 2 - 1;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const smooth = (t) => t * t * (3 - 2 * t);
const env = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));

function add(busL, busR, i, v, pan = 0) {
  if (i < 0 || i >= LEN) return;
  const gl = Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((pan + 1) * Math.PI) / 4);
  busL[i] += v * gl;
  busR[i] += v * gr;
}

// ------------------------------------------------------------------ MUSIC
// Progression: Am | F | Dm | E | F -> C (arrival) — scene-locked.
const chords = [
  { t0: 0.0, t1: 4.0, notes: [45, 52, 57, 60, 64] }, // Am
  { t0: 4.0, t1: 9.0, notes: [41, 48, 53, 57, 64] }, // F(add9-ish)
  { t0: 9.0, t1: 11.3, notes: [38, 50, 53, 57, 62] }, // Dm
  { t0: 11.3, t1: 13.4, notes: [40, 52, 56, 59, 64] }, // E
  { t0: 13.4, t1: fs2s(T.fig2OnTop), notes: [41, 53, 57, 60, 65] }, // F
  { t0: fs2s(T.fig2OnTop), t1: fs2s(T.black) + 0.2, notes: [36, 48, 55, 60, 64, 67] }, // C
];
const musicEnd = fs2s(T.black) + 0.2;

function musicGain(t) {
  // overall build: quiet start, progressive rise, peak at arrival, cut at black
  const intro = smooth(env(t, 0, 2.5));
  const build = 0.45 + 0.55 * smooth(env(t, 3, fs2s(T.fig2OnTop)));
  const out = 1 - smooth(env(t, fs2s(T.fadeOutStart), musicEnd));
  return intro * build * out;
}

for (const ch of chords) {
  const att = 0.6;
  const rel = 0.9;
  ch.notes.forEach((n, k) => {
    const f0 = midi(n);
    for (const det of [-0.11, 0.11]) {
      const fr = f0 * Math.pow(2, det / 12);
      const s0 = Math.floor(Math.max(0, ch.t0 - 0.15) * SR);
      const s1 = Math.min(LEN, Math.floor((ch.t1 + rel) * SR));
      let ph = rand() * 6.28;
      const pan = (k / (ch.notes.length - 1) - 0.5) * 0.9 * (det > 0 ? 1 : -1);
      for (let i = s0; i < s1; i++) {
        const t = i / SR;
        const a = smooth(env(t, ch.t0 - 0.15, ch.t0 + att)) * (1 - smooth(env(t, ch.t1 - 0.1, ch.t1 + rel)));
        if (a <= 0) continue;
        ph += (2 * Math.PI * fr) / SR;
        // soft string-pad timbre: a few odd/even harmonics, slow tremolo
        const brightness = 0.25 + 0.5 * musicGain(t);
        const v =
          Math.sin(ph) +
          0.35 * brightness * Math.sin(2 * ph) +
          0.18 * brightness * Math.sin(3 * ph) +
          0.08 * brightness * Math.sin(4 * ph);
        const trem = 0.85 + 0.15 * Math.sin(t * 2 * Math.PI * 0.23 + k);
        const lowBoost = n < 48 ? 1.3 : 0.55;
        add(mL, mR, i, v * a * trem * lowBoost * 0.045 * musicGain(t), pan);
      }
    }
  });
}

// sub drone (A1 -> follows roots) with slow pulse
for (let i = 0; i < Math.floor((musicEnd + 0.6) * SR); i++) {
  const t = i / SR;
  const ch = chords.find((c) => t >= c.t0 && t < c.t1) ?? chords[chords.length - 1];
  const root = midi(ch.notes[0] - 12);
  const g = musicGain(t) * (1 - smooth(env(t, musicEnd, musicEnd + 0.6)));
  const v = Math.sin(2 * Math.PI * root * t) * 0.16 * g * (0.8 + 0.2 * Math.sin(t * 1.3));
  add(mL, mR, i, v, 0);
}

// heartbeat-like low pulse: starts at scene 2, speeds up with the tension
function kick(t0, amp, pitch = 55) {
  const s0 = Math.floor(t0 * SR);
  for (let j = 0; j < SR * 0.6; j++) {
    const t = j / SR;
    const f = pitch + 90 * Math.exp(-t * 30);
    const v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 6) * amp;
    add(mL, mR, s0 + j, v, 0);
  }
}
{
  let t = 4.0;
  while (t < fs2s(T.fig2OnTop) - 0.05) {
    const tension = smooth(env(t, 4, fs2s(T.fig2OnTop)));
    kick(t, 0.25 + 0.35 * tension);
    kick(t + 0.22, (0.12 + 0.2 * tension)); // double "heartbeat"
    t += 1.15 - 0.55 * tension;
  }
}

// riser into the arrival (filtered noise sweep + rising tone)
{
  const a = 12.0;
  const b = fs2s(T.fig2OnTop);
  let lp = 0;
  for (let i = Math.floor(a * SR); i < Math.floor(b * SR); i++) {
    const t = i / SR;
    const k = env(t, a, b);
    const cutoff = 0.01 + 0.25 * k * k;
    lp += cutoff * (noise() - lp);
    const tone = Math.sin(2 * Math.PI * (220 + 440 * k * k) * t) * 0.03 * k * k;
    add(mL, mR, i, (lp * 0.35 + tone) * k * k, Math.sin(t * 3) * 0.3);
  }
}

// arrival hit: deep boom + shimmer
{
  const t0 = fs2s(T.fig2OnTop);
  kick(t0, 0.95, 42);
  const s0 = Math.floor(t0 * SR);
  for (let j = 0; j < SR * 1.6; j++) {
    const t = j / SR;
    const e = Math.exp(-t * 2.2);
    const v = (Math.sin(2 * Math.PI * midi(72) * t) * 0.05 + Math.sin(2 * Math.PI * midi(79) * t) * 0.035 + Math.sin(2 * Math.PI * midi(84) * t) * 0.02) * e;
    add(mL, mR, s0 + j, v, 0);
  }
}

// sparse piano-like motif in the first scenes (A minor, contemplative)
function pianoNote(t0, n, amp, pan = 0) {
  const s0 = Math.floor(t0 * SR);
  const f = midi(n);
  for (let j = 0; j < SR * 2.5; j++) {
    const t = j / SR;
    const e = Math.exp(-t * 2.4) * Math.min(1, t * 400);
    const v = (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 4) + 0.12 * Math.sin(6 * Math.PI * f * t) * Math.exp(-t * 6)) * e * amp;
    add(mL, mR, s0 + j, v, pan);
  }
}
[
  [0.9, 69], [1.7, 72], [2.5, 76], [3.4, 74],
  [4.4, 72], [5.3, 69], [6.2, 72], [7.2, 77],
  [9.1, 74], [9.9, 77], [10.8, 81],
  [11.6, 80], [12.4, 83], [13.1, 80],
  [13.9, 84], [14.3, 81],
].forEach(([t, n], i) => pianoNote(t, n, 0.075, i % 2 ? 0.25 : -0.25));

// ------------------------------------------------------------------ FOLEY
function click(t0, amp, freq, pan, decay = 55) {
  // rung contact: metallic/wooden tock
  const s0 = Math.floor(t0 * SR);
  let lp = 0;
  for (let j = 0; j < SR * 0.12; j++) {
    const t = j / SR;
    lp += 0.35 * (noise() - lp);
    const v = (Math.sin(2 * Math.PI * freq * t) * 0.6 + Math.sin(2 * Math.PI * freq * 2.7 * t) * 0.25) * Math.exp(-t * decay) + lp * Math.exp(-t * 180) * 0.8;
    add(sL, sR, s0 + j, v * amp, pan);
  }
}
function thump(t0, amp, pan, low = 80) {
  const s0 = Math.floor(t0 * SR);
  let lp = 0;
  for (let j = 0; j < SR * 0.25; j++) {
    const t = j / SR;
    lp += 0.06 * (noise() - lp);
    const v = Math.sin(2 * Math.PI * (low + 40 * Math.exp(-t * 40)) * t) * Math.exp(-t * 25) * 0.7 + lp * 3 * Math.exp(-t * 30);
    add(sL, sR, s0 + j, v * amp, pan);
  }
}
function scrape(ta, tb, amp, pan, center = 0.12) {
  let lp = 0, hp = 0;
  for (let i = Math.floor(ta * SR); i < Math.floor(tb * SR); i++) {
    const t = i / SR;
    const k = env(t, ta, ta + 0.08) * (1 - env(t, tb - 0.15, tb));
    lp += center * (noise() - lp);
    hp = lp - hp * 0.6;
    const grit = 0.6 + 0.4 * Math.sin(t * 2 * Math.PI * 17) * Math.sin(t * 2 * Math.PI * 5.3);
    add(sL, sR, i, hp * k * amp * grit, pan);
  }
}
function creak(ta, tb, amp, pan, base = 180) {
  let ph = 0;
  for (let i = Math.floor(ta * SR); i < Math.floor(tb * SR); i++) {
    const t = i / SR;
    const k = Math.sin(Math.PI * env(t, ta, tb));
    const f = base + 60 * Math.sin(t * 7.3) + 30 * Math.sin(t * 23);
    ph += (2 * Math.PI * f) / SR;
    // saw-ish, pulsed
    const saw = ((ph / (2 * Math.PI)) % 1) * 2 - 1;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 11);
    add(sL, sR, i, saw * k * pulse * amp, pan);
  }
}

// climber 1: running steps then frantic rung contacts (left side of frame)
for (let f = T.fig1RunStart + 2; f < T.fig1ClimbStart; f += Math.PI / 0.85) thump(fs2s(f), 0.32, -0.45, 95);
function rungEvents(climbFn, window, f0, f1) {
  const ev = [];
  const step = 0.05;
  let prev = null;
  for (let f = f0; f < f1; f += step) {
    const c = climbFn(f);
    for (const o of [0, 1]) {
      const u = (c + o) / 2;
      const fr = u - Math.floor(u);
      if (prev) {
        const pu = (prev + o) / 2;
        const pfr = pu - Math.floor(pu);
        if (Math.floor(pu) === Math.floor(u) && pfr < window && fr >= window) ev.push(f);
      }
    }
    prev = c;
  }
  return ev;
}
rungEvents(fig1Climb, FIG1_WINDOW, T.fig1ClimbStart, T.slipStart).forEach((f, i) =>
  click(fs2s(f), 0.22 + 0.06 * rand(), 900 + 250 * rand(), -0.4, 60),
);
// hesitation near the top: nervous small taps
for (let f = T.fig1Reach - 20; f < T.slipStart; f += 9 + 6 * rand()) click(fs2s(f), 0.1, 1100, -0.35, 80);

// the slip
creak(fs2s(T.slipStart - 6), fs2s(T.slipSlide + 8), 0.06, -0.35, 170);
scrape(fs2s(T.slipStart), fs2s(T.fig1Land), 0.9, -0.4, 0.09);
for (let f = T.slipSlide; f < T.fig1Land; f += 3 + 2 * rand()) click(fs2s(f), 0.12, 700 + 300 * rand(), -0.4, 90);
thump(fs2s(T.fig1Land), 0.7, -0.35, 70);
// ladder falls and crashes
scrape(fs2s(T.fig1Land + 4), fs2s(T.ladderThud), 0.5, -0.6, 0.05);
thump(fs2s(T.ladderThud), 1.0, -0.6, 48);
for (let k = 0; k < 7; k++) click(fs2s(T.ladderThud) + 0.01 + k * 0.035 + rand() * 0.03, 0.35 * Math.exp(-k * 0.35), 500 + 900 * rand(), -0.6, 40);
kick(fs2s(T.ladderThud), 0.55, 38);

// climber 2: calm steps, careful handling (right side)
for (let f = T.fig2WalkStart + 3; f < T.fig2WalkEnd; f += Math.PI / 0.45) thump(fs2s(f), 0.18, 0.35, 110);
thump(fs2s(T.fig2Grab + 10), 0.12, 0.45, 120);
creak(fs2s(T.liftStart), fs2s(T.liftEnd), 0.02, 0.45, 140);
scrape(fs2s(T.liftStart), fs2s(T.liftStart + 20), 0.25, 0.6, 0.06);
thump(fs2s(T.liftEnd), 0.3, 0.35, 90);
scrape(fs2s(T.liftEnd + 4), fs2s(T.adjustEnd), 0.35, 0.35, 0.08);
click(fs2s(T.adjustEnd - 2), 0.15, 600, 0.35, 70);
for (let f = T.inspectEnd + 2; f < T.shakeEnd; f += 3.1) click(fs2s(f), 0.07 + 0.04 * rand(), 650 + 200 * rand(), 0.35, 90);
click(fs2s(T.shakeEnd + 10), 0.18, 520, 0.3, 50);
rungEvents(fig2Climb, FIG2_WINDOW, T.fig2ClimbStart, T.fig2ClimbEnd).forEach((f) =>
  click(fs2s(f), 0.11 + 0.02 * rand(), 520 + 60 * rand(), 0.3, 45),
);
thump(fs2s(T.fig2ClimbEnd + 10), 0.15, 0.3, 120);
thump(fs2s(T.fig2OnTop - 4), 0.22, 0.25, 100);

// night wind ambience (whole scene, gone at black)
{
  let lp = 0, lp2 = 0;
  for (let i = 0; i < Math.floor((fs2s(T.black) + 0.3) * SR); i++) {
    const t = i / SR;
    lp += 0.004 * (noise() - lp);
    lp2 += 0.02 * (noise() - lp2);
    const g = smooth(env(t, 0, 1.5)) * (1 - smooth(env(t, fs2s(T.fadeOutStart), fs2s(T.black) + 0.3)));
    const gust = 0.6 + 0.4 * Math.sin(t * 0.7) * Math.sin(t * 0.31 + 1);
    add(sL, sR, i, (lp * 4 + lp2 * 0.25) * g * gust * 0.6, Math.sin(t * 0.4) * 0.5);
  }
}

// ------------------------------------------------------------------ REVERB
function reverb(inL, inR, wet, size = 1) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((n) => Math.floor(n * size));
  const allp = [225, 556, 441];
  const outL = new Float32Array(LEN), outR = new Float32Array(LEN);
  for (const [inp, out, spread] of [[inL, outL, 0], [inR, outR, 23]]) {
    const acc = new Float32Array(LEN);
    for (const c of combs) {
      const d = c + spread;
      const buf = new Float32Array(d);
      let idx = 0, filt = 0;
      for (let i = 0; i < LEN; i++) {
        const y = buf[idx];
        filt = y * 0.7 + filt * 0.3;
        buf[idx] = inp[i] + filt * 0.86;
        acc[i] += y;
        idx = (idx + 1) % d;
      }
    }
    for (const a of allp) {
      const d = a + spread;
      const buf = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < LEN; i++) {
        const b = buf[idx];
        const x = acc[i];
        buf[idx] = x + b * 0.5;
        acc[i] = b - x;
        idx = (idx + 1) % d;
      }
    }
    for (let i = 0; i < LEN; i++) out[i] = inp[i] * (1 - wet * 0.3) + acc[i] * wet * 0.12;
  }
  return [outL, outR];
}
const [rmL, rmR] = reverb(mL, mR, 0.55, 1.15);
const [rsL, rsR] = reverb(sL, sR, 0.3, 0.8);
for (let i = 0; i < LEN; i++) {
  L[i] = rmL[i] + rsL[i];
  R[i] = rmR[i] + rsR[i];
}

// ------------------------------------------------------------------ MASTER
// gentle low-cut, soft clip, normalise, silent ending for the message
let hpL = 0, hpR = 0, pxL = 0, pxR = 0;
for (let i = 0; i < LEN; i++) {
  const a = 0.995;
  hpL = a * (hpL + L[i] - pxL); pxL = L[i]; L[i] = hpL;
  hpR = a * (hpR + R[i] - pxR); pxR = R[i]; R[i] = hpR;
}
let peak = 0;
for (let i = 0; i < LEN; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 1 / peak;
const DRIVE = 2.3; // soft limiter drive: brings loudness near social-media targets
const silenceAt = fs2s(T.text1) + 1.2; // reverb tail dies, then pure silence
for (let i = 0; i < LEN; i++) {
  const t = i / SR;
  const tail = 1 - smooth(env(t, fs2s(T.black), silenceAt));
  L[i] = (Math.tanh(L[i] * g * DRIVE) / Math.tanh(DRIVE)) * 0.97 * tail;
  R[i] = (Math.tanh(R[i] * g * DRIVE) / Math.tanh(DRIVE)) * 0.97 * tail;
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
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'soundtrack.wav');
fs.writeFileSync(out, buf);
console.log('wrote', out, (LEN / SR).toFixed(2), 's');
