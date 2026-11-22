// Original procedural score + foley + narration mix, frame-locked to src/timeline.js.
// Pure Node (no dependencies). Writes public/soundtrack.wav (44.1 kHz stereo 16-bit).
import fs from 'node:fs';
import path from 'node:path';
import { FPS, DURATION, VOICE, SHOTS, FAILS, MONTAGE_CUTS, RESULT_HIT, SILENCE, FINAL_BOOM } from '../src/timeline.js';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const SR = 44100;
const LEN = Math.ceil((DURATION / FPS) * SR);
const sec = (f) => f / FPS;
const bus = () => [new Float32Array(LEN), new Float32Array(LEN)];
const music = bus();
const sfx = bus();
const voice = bus();

let seed = 7;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const noise = () => rand() * 2 - 1;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const smooth = (t) => t * t * (3 - 2 * t);
const env = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
function put(b, i, v, pan = 0) {
  if (i < 0 || i >= LEN) return;
  b[0][i] += v * Math.cos(((pan + 1) * Math.PI) / 4);
  b[1][i] += v * Math.sin(((pan + 1) * Math.PI) / 4);
}

// ---------------------------------------------------------------- instruments
function piano(b, t0, n, amp, pan = 0, dur = 3) {
  const f = midi(n);
  const s0 = Math.floor(t0 * SR);
  const inh = 1.0007;
  for (let j = 0; j < SR * dur; j++) {
    const t = j / SR;
    const e = Math.min(1, t * 300) * (Math.exp(-t * 1.6) * 0.75 + Math.exp(-t * 6) * 0.25);
    const v =
      Math.sin(2 * Math.PI * f * t) +
      0.42 * Math.sin(2 * Math.PI * f * 2 * inh * t) * Math.exp(-t * 2.5) +
      0.2 * Math.sin(2 * Math.PI * f * 3 * inh * t) * Math.exp(-t * 4) +
      0.08 * Math.sin(2 * Math.PI * f * 4 * inh * t) * Math.exp(-t * 6);
    put(b, s0 + j, v * e * amp, pan);
  }
}
function pad(b, t0, t1, notes, amp, att = 1.2, rel = 1.5, bright = 0.3) {
  for (const n of notes) {
    for (const det of [-0.08, 0.08]) {
      const f = midi(n) * Math.pow(2, det / 12);
      let ph = rand() * 6.28;
      const pan = det * 6 * (n % 2 ? 1 : -1);
      const s0 = Math.floor(Math.max(0, t0 - 0.05) * SR);
      const s1 = Math.min(LEN, Math.floor((t1 + rel) * SR));
      for (let i = s0; i < s1; i++) {
        const t = i / SR;
        const a = smooth(env(t, t0, t0 + att)) * (1 - smooth(env(t, t1, t1 + rel)));
        ph += (2 * Math.PI * f) / SR;
        const v = Math.sin(ph) + bright * (0.5 * Math.sin(2 * ph) + 0.25 * Math.sin(3 * ph) + 0.12 * Math.sin(4 * ph));
        put(b, i, v * a * amp * (n < 48 ? 1.2 : 0.6), pan);
      }
    }
  }
}
function kick(b, t0, amp, pitch = 50, decay = 7) {
  const s0 = Math.floor(t0 * SR);
  for (let j = 0; j < SR * 0.7; j++) {
    const t = j / SR;
    const f = pitch + 110 * Math.exp(-t * 28);
    put(b, s0 + j, Math.sin(2 * Math.PI * f * t) * Math.exp(-t * decay) * amp, 0);
  }
}
function tom(b, t0, amp, pitch = 90, pan = 0) {
  const s0 = Math.floor(t0 * SR);
  let lp = 0;
  for (let j = 0; j < SR * 0.6; j++) {
    const t = j / SR;
    lp += 0.08 * (noise() - lp);
    const f = pitch * (1 + 0.5 * Math.exp(-t * 18));
    put(b, s0 + j, (Math.sin(2 * Math.PI * f * t) * 0.9 + lp * 1.5) * Math.exp(-t * 7) * amp, pan);
  }
}
function clap(b, t0, amp, pan = 0) {
  const s0 = Math.floor(t0 * SR);
  let hp = 0, prev = 0;
  for (let j = 0; j < SR * 0.25; j++) {
    const t = j / SR;
    const n = noise();
    hp = 0.85 * (hp + n - prev);
    prev = n;
    const bursts = t < 0.03 ? 0.6 + 0.4 * Math.sin(t * 2 * Math.PI * 90) : 1;
    put(b, s0 + j, hp * Math.exp(-t * 18) * bursts * amp, pan);
  }
}
function hat(b, t0, amp, pan = 0.2) {
  const s0 = Math.floor(t0 * SR);
  let prev = 0;
  for (let j = 0; j < SR * 0.06; j++) {
    const t = j / SR;
    const n = noise();
    const hp = n - prev;
    prev = n;
    put(b, s0 + j, hp * Math.exp(-t * 70) * amp, pan);
  }
}
function boom(b, t0, amp, tail = 2.5) {
  kick(b, t0, amp, 34, 1.8);
  const s0 = Math.floor(t0 * SR);
  let lp = 0;
  for (let j = 0; j < SR * tail; j++) {
    const t = j / SR;
    lp += 0.02 * (noise() - lp);
    put(b, s0 + j, lp * 2.2 * Math.exp(-t * 2.2) * amp, 0);
  }
}
function riser(b, a, z, amp) {
  let lp = 0;
  for (let i = Math.floor(a * SR); i < Math.floor(z * SR); i++) {
    const t = i / SR;
    const k = env(t, a, z);
    lp += (0.01 + 0.3 * k * k) * (noise() - lp);
    const tone = Math.sin(2 * Math.PI * (200 + 500 * k * k) * t) * 0.05;
    put(b, i, (lp * 0.5 + tone) * k * k * amp, Math.sin(t * 4) * 0.4);
  }
}
function whoosh(b, t0, amp, dur = 0.35) {
  let lp = 0;
  const s0 = Math.floor((t0 - dur * 0.7) * SR);
  for (let j = 0; j < SR * dur; j++) {
    const t = j / SR;
    const k = Math.sin(Math.PI * (t / dur));
    lp += (0.05 + 0.2 * k) * (noise() - lp);
    put(b, s0 + j, lp * k * k * amp, (t / dur - 0.5) * 1.2);
  }
}

// ---------------------------------------------------------------- SCORE
const T_MONT = sec(MONTAGE_CUTS[0]);
const T_HIT = sec(RESULT_HIT);
const T_SIL = sec(SILENCE[0]);
const T_LAST = sec(SILENCE[1]);

// Hook: deep impact + shimmer on the title
boom(music, 0.02, 0.55, 3);
[76, 83, 88].forEach((n, i) => piano(music, 0.05 + i * 0.03, n, 0.05, 0, 4));

// Part 1 — melancholic piano (72 BPM), A minor
{
  const beat = 60 / 72;
  const prog = [
    [45, [57, 60, 64]], // Am
    [41, [57, 60, 65]], // F
    [48, [55, 60, 64]], // C
    [43, [55, 59, 62]], // G
  ];
  const mel = [76, 74, 72, 71, 72, 69, 67, 69, 76, 77, 76, 74, 72, 74, 71, 69];
  let bar = 0;
  for (let t = 1.2; t < T_MONT - 0.3; t += beat * 4, bar++) {
    const [bass, ch] = prog[bar % 4];
    const despair = t > 19.5 && t < 24;
    const g = despair ? 0.55 : 1;
    piano(music, t, bass - 12, 0.11 * g, -0.2, 4);
    piano(music, t, bass, 0.07 * g, -0.2, 4);
    // gentle arpeggio
    const arp = [ch[0], ch[1], ch[2], ch[1], ch[2] + 12, ch[1], ch[2], ch[1]];
    arp.forEach((n, i) => {
      if (despair && i % 2) return;
      piano(music, t + i * beat * 0.5, n, 0.038 * g, 0.2 * (i % 2 ? 1 : -1), 2.5);
    });
    // sparse melody
    if (bar >= 1 && !despair) {
      piano(music, t + beat * 0.02, mel[(bar * 2) % mel.length], 0.06, 0.1, 3);
      piano(music, t + beat * 2, mel[(bar * 2 + 1) % mel.length], 0.05, 0.1, 3);
    }
    pad(music, t, t + beat * 4, [bass, ...ch], 0.012 * (0.6 + 0.4 * env(t, 0, 16)), 1.5, 1.5, 0.15);
  }
  // hopeful lift when he looks at the photo
  pad(music, 23.8, T_MONT, [41, 53, 57, 60, 64, 69], 0.02, 1.5, 1.0, 0.3);
  piano(music, 24.0, 81, 0.06, 0.2, 4);
  piano(music, 24.9, 84, 0.06, -0.2, 4);
  riser(music, 24.6, T_MONT, 0.5);
}

// Part 2 — discipline montage (120 BPM): drums + string ostinato
{
  const beat = 0.5;
  const chords = [
    [45, [57, 60, 64]],
    [41, [57, 60, 65]],
    [48, [55, 60, 64]],
    [43, [55, 59, 62]],
  ];
  const t0 = T_MONT;
  for (let bar = 0; bar < 6; bar++) {
    const tb = t0 + bar * 4 * beat;
    const [bass, ch] = chords[bar % 4];
    const inten = bar / 5;
    pad(music, tb, tb + 2, [bass - 12, bass, ...ch.map((n) => n + 12)], 0.016 + 0.01 * inten, 0.15, 0.3, 0.45);
    for (let s = 0; s < 8; s++) {
      const ts = tb + s * beat * 0.5;
      // string ostinato (short plucked saws)
      const n = [ch[0], ch[2], ch[1], ch[2]][s % 4] + 12;
      piano(music, ts, n, 0.03 + 0.02 * inten, s % 2 ? 0.3 : -0.3, 0.6);
      if (bar >= 2) hat(music, ts + 0.25 * beat, 0.08 + 0.05 * inten, 0.3);
    }
    kick(music, tb, 0.7);
    kick(music, tb + 2 * beat, 0.6);
    if (bar >= 1) kick(music, tb + 3.5 * beat, 0.4);
    tom(music, tb + 1 * beat, 0.25 + 0.2 * inten, 85, -0.3);
    if (bar >= 1) clap(music, tb + 1 * beat, 0.25 + 0.15 * inten, 0.1);
    if (bar >= 1) clap(music, tb + 3 * beat, 0.25 + 0.15 * inten, -0.1);
    if (bar >= 3) tom(music, tb + 3.5 * beat, 0.3, 70, 0.3);
    piano(music, tb, bass - 12, 0.12, 0, 2);
  }
  // fill + riser into the result
  for (let i = 0; i < 8; i++) tom(music, T_HIT - 1 + i * 0.125, 0.18 + i * 0.04, 110 - i * 7, (i % 2 ? 0.4 : -0.4));
  riser(music, T_HIT - 2.6, T_HIT, 0.9);
}

// Part 3 — epic, emotional arrival (C major)
{
  boom(music, T_HIT, 1.0, 3.5);
  const beat = 0.5;
  const chords = [
    [36, [60, 64, 67, 72]], // C
    [43, [62, 67, 71, 74]], // G
    [45, [60, 64, 69, 72]], // Am
    [41, [60, 65, 69, 72]], // F
  ];
  const end = sec(VOICE.n6a) + 0.5;
  let bar = 0;
  const melody = [79, 76, 79, 81, 79, 76, 74, 76, 72, 74, 76, 79];
  for (let tb = T_HIT; tb < end; tb += 4 * beat * 1.0, bar++) {
    const [bass, ch] = chords[bar % 4];
    pad(music, tb, tb + 2, [bass - 12, bass, ...ch], 0.022, 0.25, 0.6, 0.5);
    piano(music, tb, bass - 12, 0.16, 0, 3);
    piano(music, tb, ch[3] + 12, 0.07, 0.25, 3);
    piano(music, tb + beat * 2, melody[bar % melody.length], 0.08, -0.15, 3);
    piano(music, tb + beat * 2, melody[bar % melody.length] - 12, 0.05, 0.15, 3);
    kick(music, tb, 0.55, 45, 5);
    tom(music, tb + beat * 2, 0.3, 75, 0);
    for (let s = 0; s < 4; s++) piano(music, tb + s * beat, ch[s % 4] + 12, 0.025, s % 2 ? 0.4 : -0.4, 0.8);
  }
}

// Part 4 — the moral: sparse, intimate, then decays to silence
{
  const a = sec(VOICE.n6a);
  pad(music, a - 0.4, T_SIL - 1.6, [33, 45, 52, 57, 60, 64], 0.02, 1.0, 1.4, 0.15);
  piano(music, a + 0.2, 69, 0.06, 0, 4);
  piano(music, a + 2.4, 72, 0.05, 0.2, 4);
  piano(music, sec(VOICE.n6b) + 0.1, 76, 0.05, -0.2, 4);
  piano(music, sec(VOICE.n6b) + 2.0, 74, 0.04, 0.2, 4);
}
// Final: last line in silence, then one deep boom on "bruit"
boom(music, sec(FINAL_BOOM), 0.85, 3);
piano(music, sec(FINAL_BOOM), 45, 0.12, 0, 3);
piano(music, sec(FINAL_BOOM), 57, 0.07, 0, 3);

// ---------------------------------------------------------------- FOLEY
function rain(a, z, amp) {
  let lp = 0, lp2 = 0, prev = 0;
  for (let i = Math.floor(a * SR); i < Math.floor(z * SR); i++) {
    const t = i / SR;
    const k = smooth(env(t, a, a + 0.8)) * (1 - smooth(env(t, z - 0.8, z)));
    const n = noise();
    lp += 0.25 * (n - lp);
    lp2 += 0.03 * (n - lp2);
    const hp = lp - prev;
    prev = lp;
    const drop = rand() < 0.0015 ? noise() * 0.6 : 0;
    put(sfx, i, (hp * 0.35 + lp2 * 0.5 + drop) * k * amp, Math.sin(t * 0.3) * 0.4);
  }
}
function tick(t0, amp, freq = 2400, pan = 0, decay = 90) {
  const s0 = Math.floor(t0 * SR);
  for (let j = 0; j < SR * 0.05; j++) {
    const t = j / SR;
    put(sfx, s0 + j, (Math.sin(2 * Math.PI * freq * t) * 0.6 + noise() * 0.4) * Math.exp(-t * decay) * amp, pan);
  }
}
function step(t0, amp, pan = 0, wet = true) {
  const s0 = Math.floor(t0 * SR);
  let lp = 0;
  for (let j = 0; j < SR * 0.18; j++) {
    const t = j / SR;
    lp += 0.12 * (noise() - lp);
    const splash = wet ? noise() * 0.25 * Math.exp(-t * 30) : 0;
    put(sfx, s0 + j, (lp * 2.5 + splash + Math.sin(2 * Math.PI * 70 * t) * 0.4) * Math.exp(-t * 28) * amp, pan);
  }
}
function typingBurst(a, z, amp, pan = 0.1, rate = 11) {
  for (let t = a; t < z; t += (1 / rate) * (0.6 + rand() * 0.8)) tick(t, amp * (0.6 + rand() * 0.5), 1800 + rand() * 1600, pan + (rand() - 0.5) * 0.2, 120);
}
function beep(t0, amp, freq, dur = 0.12, pan = 0, square = false) {
  const s0 = Math.floor(t0 * SR);
  for (let j = 0; j < SR * dur; j++) {
    const t = j / SR;
    const e = Math.min(1, t * 200) * Math.min(1, (dur - t) * 60);
    const s = Math.sin(2 * Math.PI * freq * t);
    put(sfx, s0 + j, (square ? Math.tanh(s * 3) * 0.6 : s) * e * amp, pan);
  }
}
function ding(t0, amp, pan = 0.2) {
  [1318.5, 1975.5, 2637].forEach((fq, i) => {
    const s0 = Math.floor((t0 + i * 0.07) * SR);
    for (let j = 0; j < SR * 1.2; j++) {
      const t = j / SR;
      put(sfx, s0 + j, Math.sin(2 * Math.PI * fq * t) * Math.exp(-t * 4) * Math.min(1, t * 500) * amp * (1 - i * 0.2), pan);
    }
  });
}
function thud(t0, amp) {
  kick(sfx, t0, amp, 60, 14);
  tick(t0, amp * 0.4, 900, 0, 60);
}

// room + rain
rain(0, sec(SHOTS.bow[1]) + 0.3, 0.35);
rain(sec(SHOTS.street[0]) - 0.2, sec(SHOTS.street[1]), 0.55);
rain(sec(SHOTS.desk[0]), sec(SHOTS.montage[0]) + 0.3, 0.3);
// phone swipes + bank
for (let i = 0; i < 4; i++) whoosh(sfx, sec(SHOTS.feed[0] + 12 + i * 16), 0.18, 0.18);
for (let i = 0; i < 4; i++) tick(sec(SHOTS.feed[0] + 8 + i * 16), 0.08, 3000, 0.2);
whoosh(sfx, sec(SHOTS.bank[0] + 6), 0.3, 0.3);
beep(sec(SHOTS.bank[0] + 30), 0.12, 196, 0.5, 0);
beep(sec(SHOTS.bank[0] + 30), 0.08, 185, 0.5, 0);
// street footsteps (hero) — one per half walk cycle
{
  const a = SHOTS.street[0];
  for (let k = 1; k < 30; k++) {
    const f = a + (k * Math.PI) / 0.33;
    if (f > SHOTS.street[1]) break;
    step(sec(f), 0.35, -0.3 + 0.6 * ((f - a) / (SHOTS.street[1] - a)));
  }
}
// desk: laptop opens, typing
tick(sec(SHOTS.desk[0] + 24), 0.25, 700, 0.1, 40);
typingBurst(sec(SHOTS.desk[0] + 56), sec(SHOTS.desk[1]), 0.12);
typingBurst(sec(SHOTS.fail[0]), sec(FAILS[0]) - 0.05, 0.13, 0.1, 13);
typingBurst(sec(FAILS[0]) + 0.5, sec(FAILS[1]) - 0.05, 0.13, 0.1, 13);
typingBurst(sec(FAILS[1]) + 0.4, sec(FAILS[2]) - 0.05, 0.14, 0.1, 15);
FAILS.forEach((f) => {
  beep(sec(f), 0.2, 220, 0.16, 0, true);
  beep(sec(f) + 0.17, 0.2, 165, 0.26, 0, true);
});
// despair: frustrated typing, lid closes, heartbeat, photo shimmer, reopen
const D = SHOTS.despair[0];
typingBurst(sec(D), sec(D + 22), 0.16, 0.1, 16);
thud(sec(D + 40), 0.7);
for (let t = sec(D + 46); t < sec(D + 110); t += 1.05) {
  kick(sfx, t, 0.25, 45, 12);
  kick(sfx, t + 0.22, 0.15, 45, 12);
}
tick(sec(D + 168), 0.22, 700, 0.1, 40);
typingBurst(sec(D + 182), sec(D + 197), 0.12);
// montage foley
const M = MONTAGE_CUTS;
for (let i = 1; i < 6; i++) whoosh(sfx, sec(M[i]), 0.35, 0.3);
for (let t = sec(M[0]) + 0.05; t < sec(M[0] + 44); t += 0.267) {
  if (Math.floor((t - sec(M[0])) / 0.267) % 4 !== 3) beep(t, 0.08, 1760, 0.08, -0.4);
}
for (let i = 0; i < 5; i++) tick(sec(M[2] + 6 + i * 14), 0.06, 1200, 0, 50); // page turns
typingBurst(sec(M[3]), sec(M[4]) - 0.1, 0.07, 0.1, 18);
beep(sec(M[4] + 4), 0.14, 220, 0.14, 0, true);
typingBurst(sec(M[4] + 48), sec(M[5]), 0.1, 0.1, 20);
for (let i = 0; i < 9; i++) whoosh(sfx, sec(M[5] + 6 + i * 6), 0.08, 0.12);
// result notifications
ding(sec(RESULT_HIT + 8), 0.16);
ding(sec(RESULT_HIT + 22), 0.13, -0.2);
ding(sec(RESULT_HIT + 34), 0.15, 0.3);
// window: soft steps
for (let k = 1; k < 10; k++) {
  const f = SHOTS.window[0] + 48 + (k * Math.PI) / 0.26;
  if (f > SHOTS.window[0] + 112) break;
  step(sec(f), 0.16, 0.1, false);
}
// city wind
{
  let lp = 0;
  const a = sec(SHOTS.city[0]);
  const z = sec(SILENCE[0]) - 0.5;
  for (let i = Math.floor(a * SR); i < Math.floor(z * SR); i++) {
    const t = i / SR;
    lp += 0.006 * (noise() - lp);
    put(sfx, i, lp * 3 * smooth(env(t, a, a + 1)) * (1 - smooth(env(t, z - 2, z))), Math.sin(t * 0.5) * 0.5);
  }
}

// ---------------------------------------------------------------- NARRATION
function readWav(file) {
  const b = fs.readFileSync(file);
  let off = 12;
  let fmt = null;
  while (off < b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(off + 10), sr: b.readUInt32LE(off + 12), bits: b.readUInt16LE(off + 22) };
    if (id === 'data') {
      const n = size / 2 / fmt.ch;
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = b.readInt16LE(off + 8 + i * 2 * fmt.ch) / 32768;
      if (fmt.sr !== SR) throw new Error(`${file}: expected ${SR} Hz`);
      return out;
    }
    off += 8 + size;
  }
  throw new Error('bad wav ' + file);
}
const voiceEnv = new Float32Array(LEN);
for (const [id, frame] of Object.entries(VOICE)) {
  const x = readWav(path.join(ROOT, 'public', 'voice', `${id}.wav`));
  let pk = 0;
  for (const v of x) pk = Math.max(pk, Math.abs(v));
  const g = 0.9 / pk;
  const s0 = Math.floor(sec(frame) * SR);
  for (let i = 0; i < x.length; i++) {
    put(voice, s0 + i, x[i] * g * 0.75, 0);
    if (s0 + i < LEN) voiceEnv[s0 + i] = 1;
  }
}

// ---------------------------------------------------------------- reverb
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
const mR = reverb(music, 0.55, 1.2);
const sR = reverb(sfx, 0.25, 0.8);
const vR = reverb(voice, 0.12, 0.55, 0.5, 0.7);

// ---------------------------------------------------------------- mix + master
// smooth voice envelope for ducking (attack 60 ms, release 400 ms)
const duck = new Float32Array(LEN);
{
  let e = 0;
  for (let i = 0; i < LEN; i++) {
    const tgt = voiceEnv[i];
    e += (tgt - e) * (tgt > e ? 1 / (0.06 * SR) : 1 / (0.4 * SR));
    duck[i] = e;
  }
}
const L = new Float32Array(LEN);
const R = new Float32Array(LEN);
for (let i = 0; i < LEN; i++) {
  const t = i / SR;
  const mg = 1 - 0.55 * duck[i]; // ~ -7 dB under the voice
  // hard silence window before the last line
  const silence = t >= T_SIL && t < T_LAST - 0.02 ? 0 : 1;
  const preSil = 1 - smooth(env(t, T_SIL - 1.2, T_SIL));
  const musicGate = t < T_SIL ? preSil : t >= sec(FINAL_BOOM) - 0.05 ? 1 : 0; // no music during the last line until the boom
  L[i] = (mR[0][i] * 0.95 * mg * musicGate + sR[0][i] * 0.8 * mg * (t < T_SIL ? 1 : 0) + vR[0][i] * 1.15) * silence;
  R[i] = (mR[1][i] * 0.95 * mg * musicGate + sR[1][i] * 0.8 * mg * (t < T_SIL ? 1 : 0) + vR[1][i] * 1.15) * silence;
}
// high-pass + soft limiter
let hl = 0, hr = 0, pl = 0, pr = 0;
for (let i = 0; i < LEN; i++) {
  hl = 0.996 * (hl + L[i] - pl); pl = L[i]; L[i] = hl;
  hr = 0.996 * (hr + R[i] - pr); pr = R[i]; R[i] = hr;
}
let peak = 0;
for (let i = 0; i < LEN; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const DRIVE = Number(process.env.DRIVE ?? 2.0);
const g = 1 / peak;
for (let i = 0; i < LEN; i++) {
  const fadeEnd = 1 - smooth(env(i / SR, DURATION / FPS - 0.6, DURATION / FPS));
  L[i] = (Math.tanh(L[i] * g * DRIVE) / Math.tanh(DRIVE)) * 0.96 * fadeEnd;
  R[i] = (Math.tanh(R[i] * g * DRIVE) / Math.tanh(DRIVE)) * 0.96 * fadeEnd;
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
fs.writeFileSync(path.join(ROOT, 'public', 'soundtrack.wav'), buf);
console.log('soundtrack.wav', (LEN / SR).toFixed(2), 's');
