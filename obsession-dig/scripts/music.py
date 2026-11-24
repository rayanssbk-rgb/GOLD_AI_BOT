"""Original cinematic score for 'Ascent' (32 s, 120 BPM, D minor -> D major). Pure numpy synthesis, no samples.
Sections follow the picture (src/timeline.js): departure 0-6, work 6-14, progression 14-20, obsession 20-26, result 26-32.
Writes public/music.wav (48 kHz stereo)."""
import os
import numpy as np, soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
DUR = 32.0
N = int(DUR * SR)
BEAT = 0.5
rng = np.random.default_rng(11)
L = np.zeros(N); R = np.zeros(N)
REV_L = np.zeros(N); REV_R = np.zeros(N)  # reverb send

def hz(m): return 440 * 2 ** ((m - 69) / 12)
NOTE = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'A': 9, 'Bb': 10, 'B': 11}
def m(name, octv): return 12 * (octv + 1) + NOTE[name]

def band(x, lo=None, hi=None, order=2.0):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); k = np.ones_like(f)
    if lo: k *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    if hi: k *= 1 / (1 + (f / hi) ** (2 * order))
    return np.fft.irfft(X * k, len(x))
def saw(freq, n, ph=0.0):
    t = np.arange(n) / SR
    p = (freq * t + ph) % 1.0
    return 2 * p - 1
def env_adsr(n, a, d, s, r):
    e = np.ones(n) * s; ai = int(a * SR); di = int(d * SR); ri = int(r * SR)
    e[:ai] = np.linspace(0, 1, max(ai, 1))[:ai]
    e[ai:ai + di] = np.linspace(1, s, max(di, 1))[: len(e[ai:ai + di])]
    if ri: e[-ri:] *= np.linspace(1, 0, ri)
    return e
def put(sig, t0, g=1.0, pan=0.0, rev=0.25):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4) * 1.414; r = np.sin((pan + 1) * np.pi / 4) * 1.414
    L[i:i + len(sig)] += sig * g * l; R[i:i + len(sig)] += sig * g * r
    REV_L[i:i + len(sig)] += sig * g * l * rev; REV_R[i:i + len(sig)] += sig * g * r * rev

# ---------------------------------------------------------------- instruments
def pad(notes, dur, bright=1200, att=0.8, rel=1.0, voices=5):
    n = int(dur * SR); out = np.zeros(n)
    for mm in notes:
        for v in range(voices):
            det = (v - (voices - 1) / 2) * 0.09  # semitone cents spread
            out += saw(hz(mm + det), n, rng.random())
    out = band(out, 60, bright) / (len(notes) * voices) * 2.2
    return out * env_adsr(n, att, 0.5, 0.85, rel)
def pluck(mm, dur=0.22, bright=1800):
    n = int(dur * SR)
    s = saw(hz(mm), n) + 0.5 * saw(hz(mm) * 1.004, n)
    return band(s, 50, bright) * np.exp(-np.arange(n) / SR / 0.09) * 0.6
def taiko(g=1.0, f0=130, f1=48, dec=0.55):
    n = int(1.2 * SR); t = np.arange(n) / SR
    fr = f1 + (f0 - f1) * np.exp(-t * 18)
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / dec)
    skin = band(rng.standard_normal(n), 80, 900) * np.exp(-t / 0.05) * 0.5
    return (body + skin) * g
def snare(g=1.0):
    n = int(0.5 * SR); t = np.arange(n) / SR
    s = band(rng.standard_normal(n), 900, 9000) * np.exp(-t / 0.11) * 0.55 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.06) * 0.6
    return s * g
def hat(g=1.0):
    n = int(0.08 * SR)
    return band(rng.standard_normal(n), 7000, None) * np.exp(-np.arange(n) / SR / 0.018) * g * 0.35
def bell(mm, g=1.0):
    n = int(2.6 * SR); t = np.arange(n) / SR; f = hz(mm)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) for r, a, d in ((1, 1, 1.6), (2.76, 0.4, 0.6), (5.4, 0.2, 0.25), (2.0, 0.25, 1.0)))
    return s * g * 0.35
def heartbeat(g=1.0):
    n = int(0.6 * SR); t = np.arange(n) / SR
    one = np.sin(2 * np.pi * (55 + 30 * np.exp(-t * 30)) * t) * np.exp(-t / 0.12)
    two = np.roll(one, int(0.28 * SR)) * 0.6; two[: int(0.28 * SR)] = 0
    return (one + two) * g
def swell(dur, g=1.0, lo=500, hi=9000):
    """reverse-cymbal style swell ending at dur"""
    n = int(dur * SR); t = np.arange(n) / SR
    return band(rng.standard_normal(n), lo, hi) * (t / dur) ** 3 * g * 0.5
def impact(g=1.0):
    n = int(3.0 * SR); t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-t * 6)) / SR) * np.exp(-t / 0.9)
    crack = band(rng.standard_normal(n), 200, 6000) * np.exp(-t / 0.08) * 0.6
    tk = np.zeros(n); tko = taiko(1.0, 110, 40, 0.8); tk[: len(tko)] = tko[:n]
    return (sub + crack + tk * 0.8) * g
def braam(notes, dur=3.2, g=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for mm in notes:
        for v in range(4):
            out += saw(hz(mm + (v - 1.5) * 0.12), n, rng.random())
    out = np.tanh(out / len(notes) * 1.6)
    # filter opening then closing: crude by mixing a dark and a bright version
    dark = band(out, 30, 350); bright = band(out, 30, 2600)
    k = np.clip(t / 0.35, 0, 1) * np.exp(-t / 1.4)
    return (dark * (1 - k) + bright * k) * np.exp(-t / 2.2) * env_adsr(n, 0.02, 0.1, 1, 0.6) * g
def crash(g=1.0, dec=1.6):
    n = int(3.5 * SR); t = np.arange(n) / SR
    return band(rng.standard_normal(n), 3000, 14000) * np.exp(-t / dec) * g * 0.4

# ---------------------------------------------------------------- the score
D2, A2, D3, F3, A3 = m('D', 2), m('A', 2), m('D', 3), m('F', 3), m('A', 3)
CH = {'Dm': [m('D', 3), m('F', 3), m('A', 3), m('D', 4)], 'Bb': [m('Bb', 2), m('D', 3), m('F', 3), m('Bb', 3)],
      'Gm': [m('G', 2), m('Bb', 2), m('D', 3), m('G', 3)], 'A': [m('A', 2), m('C#', 3), m('E', 3), m('A', 3)],
      'F': [m('F', 2), m('A', 2), m('C', 3), m('F', 3)], 'C': [m('C', 3), m('E', 3), m('G', 3), m('C', 4)],
      'D': [m('D', 3), m('F#', 3), m('A', 3), m('D', 4)]}

# drone: sub D + fifth, through the whole piece, swelling
n = N; t = np.arange(n) / SR
drone = (np.sin(2 * np.pi * hz(m('D', 1)) * t) * 0.5 + np.sin(2 * np.pi * hz(m('D', 2)) * t) * 0.25 + np.sin(2 * np.pi * hz(m('A', 2)) * t) * 0.1)
drone *= (0.35 + 0.25 * np.clip(t / 6, 0, 1)) * (1 + 0.15 * np.sin(2 * np.pi * 0.25 * t)) * (1 - np.clip((t - 25.9) / 0.1, 0, 1) * 0.6)
L += drone * 0.5; R += drone * 0.5

# 1. departure: dark pad, heartbeat, air
put(pad(CH['Dm'], 6.2, bright=500, att=2.5, rel=0.8), 0.0, 0.55, rev=0.5)
for bt in (2.0, 3.0, 4.0, 5.0): put(heartbeat(0.6 + 0.1 * (bt - 2)), bt, rev=0.15)
put(swell(1.0, 0.35, 1500, 9000), 5.0)  # into the first hit at 6.0
put(bell(m('D', 5), 0.6), 5.0, pan=0.2, rev=0.6)  # he looks up

# harmony per bar from 6 s
prog_bars = [(6, 'Dm'), (8, 'Bb'), (10, 'Gm'), (12, 'A'), (14, 'Dm'), (16, 'Bb'), (18, 'C'), (20, 'Dm'), (22, 'Bb'), (24, 'A')]
for t0, ch in prog_bars:
    br = 900 + 120 * (t0 - 6)
    put(pad(CH[ch], 2.15, bright=br, att=0.25, rel=0.4), t0, 0.42 + 0.02 * (t0 - 6), rev=0.4)

# ostinato (16ths): root / octave / fifth pattern following the bass of each bar
bass = {6: 'D', 8: 'Bb', 10: 'G', 12: 'A', 14: 'D', 16: 'Bb', 18: 'C', 20: 'D', 22: 'Bb', 24: 'A'}
pat = [0, 12, 7, 12, 0, 12, 7, 15]
for bar_t, root in bass.items():
    r0 = m(root, 2) if root not in ('Bb', 'A', 'C') else m(root, 1) + 12 * (root == 'C')
    step = 0.25 if bar_t < 14 else 0.125
    for k in range(int(2.0 / step)):
        tt = bar_t + k * step
        g = 0.22 if bar_t < 14 else 0.26 if bar_t < 20 else 0.32
        put(pluck(r0 + pat[k % len(pat)], 0.2, 1400 + 300 * (bar_t >= 20)), tt, g, pan=0.25 * (1 if k % 2 else -1), rev=0.2)

# drums
for k in range(16):  # work: taiko on 1 and 3 (+ pickups)
    tt = 6 + k * BEAT
    if k % 4 in (0, 2): put(taiko(0.9), tt, rev=0.3)
    if k % 8 == 7: put(taiko(0.45, 170, 70, 0.3), tt + 0.25, pan=0.3)
for tt in (7.0, 10.75, 12.5): put(taiko(0.6, 200, 80, 0.25), tt, pan=-0.2)  # the grabs
put(swell(0.5, 0.6), 8.0); put(impact(1.1), 8.5, rev=0.5)  # the fall
put(pad([m('D', 2), m('A', 2)], 1.0, bright=300, att=0.05, rel=0.6), 8.5, 0.3)
put(swell(0.5, 0.3), 13.5)
for k in range(12):  # progression: taiko 1, 2.5, 3 + hats on 8ths
    tt = 14 + k * BEAT
    if k % 4 == 0 or k % 4 == 2: put(taiko(0.85), tt, rev=0.3)
    if k % 4 == 1: put(taiko(0.4, 160, 70, 0.3), tt + 0.25)
for k in range(24): put(hat(0.6 + 0.2 * (k % 2 == 0)), 14 + k * 0.25, pan=0.35)
# a bell for every pillar that lights up (one pair per beat from 14.0), climbing the D minor pentatonic
penta = [m('D', 5), m('F', 5), m('G', 5), m('A', 5), m('C', 6), m('D', 6), m('F', 6), m('G', 6), m('A', 6), m('C', 7), m('D', 7), m('F', 7)]
for k, mm in enumerate(penta): put(bell(mm, 0.55), 14 + k * BEAT, pan=(-0.5 if k % 2 else 0.5), rev=0.6)
# obsession: full kit, 16th hats, snare backbeat, rolls into the drop
put(crash(0.5), 20.0); put(taiko(1.2, 120, 40, 0.7), 20.0, rev=0.4)
for k in range(12):
    tt = 20 + k * BEAT
    put(taiko(1.0), tt, rev=0.25)
    if k % 2 == 1: put(snare(0.8), tt, rev=0.3)
    put(taiko(0.45, 180, 75, 0.25), tt + 0.25, pan=0.25 * (1 if k % 2 else -1))
for k in range(48): put(hat(0.7 if k % 4 == 0 else 0.4), 20 + k * 0.125, pan=0.4)
# riser 24 -> 26 + accelerating snare roll
n = int(2.0 * SR); t = np.arange(n) / SR
riser = band(rng.standard_normal(n), 400, 9000) * (t / 2.0) ** 2 * 0.35
ph = 2 * np.pi * np.cumsum(hz(m('A', 3)) * 2 ** (t * 1.0)) / SR
riser += np.sign(np.sin(ph)) * 0.05 * (t / 2.0) ** 2
put(band(riser, 200, 10000), 24.0, rev=0.3)
tt, gap = 24.0, 0.25
while tt < 25.95:
    put(snare(0.35 + 0.5 * (tt - 24) / 2), tt, pan=0.1); tt += gap; gap = max(0.045, gap * 0.86)
# 5. result: the drop at 26.0
put(braam([m('D', 1), m('D', 2), m('A', 2), m('D', 3), m('F', 3)], 3.4, 1.0), 26.0, rev=0.45)
put(impact(1.3), 26.0, rev=0.5); put(crash(0.9, 2.2), 26.0, rev=0.4)
put(pad(CH['Bb'] + [m('F', 4)], 2.2, bright=2400, att=0.3, rel=0.6), 28.0, 0.55, rev=0.5)
for k in range(4): put(taiko(0.8), 26 + k * BEAT * 2, rev=0.4)
put(taiko(0.9), 28.0, rev=0.4); put(taiko(0.6, 170, 70, 0.3), 29.5)
put(swell(0.5, 0.5), 29.5)
# final hit + D major resolution
put(braam([m('D', 1), m('D', 2), m('A', 2), m('D', 3), m('F#', 3), m('A', 3)], 2.6, 1.0), 30.0, rev=0.5)
put(impact(1.0), 30.0); put(crash(0.8, 1.8), 30.0)
put(pad(CH['D'] + [m('F#', 4), m('A', 4)], 2.0, bright=2800, att=0.15, rel=0.9), 30.0, 0.6, rev=0.6)
put(bell(m('D', 6), 0.6), 30.0, rev=0.7); put(bell(m('A', 6), 0.4), 30.25, rev=0.7)

# ---------------------------------------------------------------- reverb (synthetic hall IR, FFT convolution)
irn = int(2.6 * SR); ti = np.arange(irn) / SR
def ir(seed):
    r = np.random.default_rng(seed).standard_normal(irn) * np.exp(-ti / 0.75)
    return band(r, 120, 7000)
for src, dst, sd in ((REV_L, L, 1), (REV_R, R, 2)):
    h = ir(sd); M = 1 << int(np.ceil(np.log2(N + irn)))
    wet = np.fft.irfft(np.fft.rfft(src, M) * np.fft.rfft(h, M), M)[:N]
    dst += wet / np.abs(h).sum() * 18
mix = np.stack([L, R], 1)
mix = np.tanh(mix / np.abs(mix).max() * 1.6) / np.tanh(1.6)  # soft limiter
fade = np.clip((DUR - np.arange(N) / SR) / 0.8, 0, 1) ** 1.5
mix *= fade[:, None] * 0.9
sf.write(os.path.join(ROOT, 'public', 'music.wav'), mix.astype(np.float32), SR, subtype='PCM_24')
print('music ok', mix.shape)
