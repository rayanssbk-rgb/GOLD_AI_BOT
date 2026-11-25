# Subtle synthesized sound design (no music, no voice): whooshes, pops, clicks, blips and a "ka-ching".
import numpy as np, wave, sys
SR = 48000; DUR = 26.55
out = np.zeros((int(SR * DUR), 2))
rng = np.random.default_rng(7)
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def add(t, sig, gain=1.0, pan=0.0):
    i = int(t * SR); sig = sig[: len(out) - i]
    out[i:i + len(sig), 0] += sig * gain * (1 - pan) ** 0.5; out[i:i + len(sig), 1] += sig * gain * (1 + pan) ** 0.5
def lp(x, k):
    y = np.zeros_like(x); acc = 0.0
    for j, v in enumerate(x): acc += k * (v - acc); y[j] = acc
    return y
def whoosh(dur=0.6):
    n = int(SR * dur); t = np.arange(n) / SR; noise = rng.standard_normal(n)
    sweep = lp(noise, 0.04) * 0.6 + lp(noise, 0.15) * 0.25
    shape = np.sin(np.pi * t / dur) ** 2
    return sweep * shape
def tone(f, dur, a=0.003, d=0.08, f2=None):
    n = int(SR * dur); t = np.arange(n) / SR; fr = f if f2 is None else np.linspace(f, f2, n)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, a, d)
def click(): return tone(2200, 0.04, 0.0005, 0.008) * 0.6 + rng.standard_normal(int(SR * 0.04)) * env(int(SR * 0.04), 0.0003, 0.004) * 0.3
def pop(f=520): return tone(f, 0.18, 0.002, 0.05, f * 1.8)
def chime(fs, gap=0.07, d=0.5):
    n = int(SR * (gap * len(fs) + d * 3)); s = np.zeros(n)
    for k, f in enumerate(fs):
        x = tone(f, d * 3, 0.002, d) + 0.3 * tone(f * 2, d * 3, 0.002, d * 0.5); i = int(k * gap * SR); s[i:i + len(x)] += x[: n - i]
    return s
def coins():
    s = np.zeros(int(SR * 0.6))
    for k in range(7):
        x = tone(3000 + rng.random() * 2500, 0.15, 0.0005, 0.03) * 0.5; i = int((0.02 + k * 0.045 + rng.random() * 0.02) * SR); s[i:i + len(x)] += x
    return s
import math
def clack(depth):
    n = int(SR * 0.25); b = rng.standard_normal(n) * env(n, 0.0005, 0.012)
    return lp(b, 0.5) * 0.8 + tone(260 - 25 * depth, 0.25, 0.001, 0.05 + 0.01 * depth) * (0.6 + 0.1 * depth)
def rumble(dur):
    n = int(SR * dur); return lp(rng.standard_normal(n), 0.01) * 3 * np.sin(np.pi * np.arange(n) / n)
# prompt
for k in range(30): add(0.55 + k * 0.05 + rng.random() * 0.012, click(), 0.12, 0.3)
add(2.1, pop(900), 0.12); add(2.65, click(), 0.6); add(2.8, whoosh(0.5), 0.25); add(3.15, chime([1318.5], 0, 0.4), 0.12)
O = 3.6
SEGS = [(0, 2.25), (2.8, 5.1), (5.75, 8.5), (9.05, 11.9), (12.45, 14.5), (15.0, 19.4), (19.75, 21.6)]
TR = 0.75
AT = []; m = O
for (a_, b_) in SEGS: AT.append(m); m += b_ - a_ + TR
def M(o):
    for k, (a_, b_) in enumerate(SEGS):
        if a_ - 1e-6 <= o <= b_ + 1e-6: return AT[k] + o - a_
    return None
def at(o, sig, g=1.0, pan=0.0):
    x = M(o)
    if x is not None: add(x, sig, g, pan)
def buzz():
    n = int(SR * 0.26); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * 165 * tt) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 28 * tt))) * env(n, 0.005, 0.12)
add(O + 0.05, whoosh(0.9), 0.3); at(0.9, chime([660, 990], 0.08, 0.6), 0.15)
for i in range(16): at(3.55 + i * 0.03, pop(700 + 40 * (i % 4)), 0.06, (i % 4 - 1.5) / 3)
at(4.4, click(), 0.55); at(4.75, whoosh(0.85), 0.3)
for i in range(4): at(6.6 + i * 0.22, click(), 0.3)
at(10.1, tone(1320, 0.4, 0.002, 0.09), 0.18); at(13.5, whoosh(0.5), 0.15)
NOTIF = [15.35, 16.45, 17.25, 17.85, 18.3, 18.65, 18.95, 19.2]
for k, x in enumerate(NOTIF):
    at(x, chime([1568, 2093] if k % 2 == 0 else [1760, 2349], 0.07, 0.3), 0.22 - 0.012 * k, (k % 3 - 1) * 0.3)
    at(x, buzz(), 0.35)
    if k == 0: at(x + 0.05, coins(), 0.3)
at(19.8, pop(330), 0.45); at(20.0, chime([784, 1175], 0.07, 0.6), 0.14)
# window switches: shrink swoosh, mouse click on the tab, slide whoosh, settle
for k in range(len(SEGS) - 1):
    t0 = AT[k] + SEGS[k][1] - SEGS[k][0]
    add(t0, whoosh(0.3), 0.12); add(t0 + 0.32 * TR, click(), 0.5)
    add(t0 + 0.3 * TR, whoosh(0.45), 0.32, 0.4); add(t0 + 0.68 * TR, whoosh(0.3), 0.12, -0.3)
# gentle room reverb
ir = rng.standard_normal(int(SR * 0.8)) * np.exp(-np.arange(int(SR * 0.8)) / (SR * 0.18)) * 0.02
for c in range(2): out[:, c] += np.convolve(out[:, c], ir)[: len(out)] * 0.6
out /= np.max(np.abs(out)) + 1e-9; out *= 0.7
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype('<i2').tobytes())
