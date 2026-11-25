# Subtle synthesized sound design (no music, no voice): whooshes, pops, clicks, blips and a "ka-ching".
import numpy as np, wave, sys
SR = 48000; DUR = 18.0
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
# logo
add(0.05, whoosh(0.9), 0.3); add(0.9, chime([660, 990], 0.08, 0.6), 0.15)
# phone
add(2.35, whoosh(0.8), 0.35)
for i in range(16): add(3.55 + i * 0.03, pop(700 + 40 * (i % 4)), 0.06, (i % 4 - 1.5) / 3)
add(4.4, click(), 0.55); add(4.75, whoosh(0.85), 0.4)
# products
add(5.3, whoosh(0.7), 0.3)
for i in range(4): add(6.6 + i * 0.22, click(), 0.3)
add(7.15, whoosh(0.4), 0.15)
# live view
add(8.6, whoosh(0.8), 0.3); add(10.1, tone(1320, 0.4, 0.002, 0.09), 0.18)
# text
add(12.0, whoosh(0.9), 0.25); add(13.5, whoosh(0.5), 0.15)
# order
add(14.65, whoosh(0.4), 0.25); add(14.95, chime([1046.5, 1318.5, 1568, 2093], 0.06, 0.45), 0.3); add(14.95, coins(), 0.35)
add(16.1, whoosh(0.5), 0.2); add(16.75, pop(330), 0.45); add(16.95, chime([784, 1175], 0.07, 0.6), 0.12)
# gentle room reverb
ir = rng.standard_normal(int(SR * 0.8)) * np.exp(-np.arange(int(SR * 0.8)) / (SR * 0.18)) * 0.02
for c in range(2): out[:, c] += np.convolve(out[:, c], ir)[: len(out)] * 0.6
out /= np.max(np.abs(out)) + 1e-9; out *= 0.7
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype('<i2').tobytes())
