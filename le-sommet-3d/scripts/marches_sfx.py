# Sound design for "Les marches": footsteps per character, heartbeat, drips, drone, final swell. No music.
import sys, wave
import numpy as np
SR = 48000; HOOK = 2.6; DUR = 32.4 + HOOK; OFF = HOOK
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(11)
def add(t, s, g=1.0, pan=0.0):
    i = int((t + OFF) * SR)
    if i >= N or i < 0: return
    s = s[: N - i] * g
    L[i:i + len(s)] += s * np.sqrt((1 - pan) / 2) * 1.414
    R[i:i + len(s)] += s * np.sqrt((1 + pan) / 2) * 1.414
def lp(x, k):
    y = np.empty_like(x); a = 0.0
    for i, v in enumerate(x): a += k * (v - a); y[i] = a
    return y
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def step(kind):
    n = int(SR * 0.25); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    if kind == 'disc':   # crisp heel on stone
        return lp(noise, 0.35) * env(n, 0.001, 0.018) * 0.8 + np.sin(2 * np.pi * 180 * t) * env(n, 0.001, 0.03) * 0.5
    if kind == 'obs':    # heavier, dragging
        return lp(noise, 0.12) * env(n, 0.004, 0.05) * 1.0 + np.sin(2 * np.pi * 110 * t) * env(n, 0.002, 0.06) * 0.7
    return np.sin(2 * np.pi * 60 * t) * env(n, 0.003, 0.08) * 1.2 + lp(noise, 0.05) * env(n, 0.003, 0.06)  # shadow thud
def drip():
    n = int(SR * 0.12); t = np.arange(n) / SR
    f = 900 + 1400 * np.exp(-t / 0.01)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.0005, 0.02)
def heart():
    n = int(SR * 0.5); t = np.arange(n) / SR
    beat = lambda d: np.sin(2 * np.pi * 52 * (t - d)) * env(n, 0.004, 0.07) * (t >= d)
    s = np.sin(2 * np.pi * 50 * t) * env(n, 0.004, 0.08) + 0.7 * np.roll(np.sin(2 * np.pi * 46 * t) * env(n, 0.004, 0.07), int(0.17 * SR))
    return np.tanh(2 * s)

def track(keys, t):
    if t <= keys[0][0]: return keys[0][1]
    for (t0, s0), (t1, s1) in zip(keys, keys[1:]):
        if t <= t1: return s0 + (s1 - s0) * (t - t0) / (t1 - t0)
    return keys[-1][1]
DISC = [(2.6, 0), (27.2, 31.5), (31, 33.6)]
OBS = [(2.6, 0), (6, 5.5), (9.2, 10.2), (10.2, 11.0), (15.8, 11.0), (16.8, 11.8), (21, 19.5), (26.6, 31.5), (31, 33.8)]
SHAD = [(2.6, -5), (9.5, 3.5), (14.6, 9.3), (16.2, 9.6), (31, 9.6)]
def contacts(keys, t_end):
    out = []; prev = np.floor(track(keys, 0))
    for t in np.arange(0, t_end, 1 / 240):
        s = np.floor(track(keys, t))
        if s > prev: out.append(t); prev = s
    return out
for t in contacts(DISC, 29): add(t, step('disc'), 0.45, 0.25)
for t in contacts(OBS, 29): add(t, step('obs'), 0.5, -0.3); add(t + 0.12, drip(), 0.12, -0.3)
for t in contacts(SHAD, 16.5): add(t, step('shadow'), 0.55 * min(1, max(0, (16.5 - t))), -0.5)
# fall
n = int(SR * 0.4); add(10.25, np.tanh(3 * (lp(rng.standard_normal(n), 0.08) * env(n, 0.002, 0.08) + np.sin(2 * np.pi * 70 * np.arange(n) / SR) * env(n, 0.002, 0.12))), 0.8, -0.3)
# heartbeat while she kneels, faster when she decides to get up
t = 10.6
while t < 16.6:
    add(t, heart(), 0.55)
    t += 0.95 if t < 14.6 else 0.55
for k in range(14): add(10.7 + k * 0.38 + rng.random() * 0.1, drip(), 0.18, -0.3)
# shadow dissolving: low reversed rumble
n = int(SR * 2.4); tt = np.arange(n) / SR
add(17.0, lp(rng.standard_normal(n), 0.03) * np.sin(np.pi * tt / 2.4) * 3, 0.5, -0.5)
# drone bed + final swell into the light
tt = np.arange(N) / SR
drone = (np.sin(2 * np.pi * 55 * tt) + 0.5 * np.sin(2 * np.pi * 82.5 * tt + 0.3) + 0.25 * np.sin(2 * np.pi * 110.3 * tt)) * 0.06
swell = np.clip((tt - 20 - HOOK) / 7, 0, 1) ** 2 * (np.sin(2 * np.pi * 220 * tt) + np.sin(2 * np.pi * 330.4 * tt) + 0.6 * np.sin(2 * np.pi * 440.7 * tt)) * 0.05 * np.clip((30.5 + HOOK - tt) / 2, 0, 1)
L += drone + swell; R += drone + swell
n = int(SR * 3); add(27.4, np.sin(2 * np.pi * 41 * np.arange(n) / SR) * env(n, 0.01, 0.9), 0.7)
# ---- cold open (absolute time)
OFF = 0.0
n = int(SR * 1.6); tt2 = np.arange(n) / SR
add(0.2, np.tanh(2.5 * np.sin(2 * np.pi * np.cumsum(32 + 60 * np.exp(-tt2 / 0.15)) / SR) * env(n, 0.002, 0.6)), 1.0)  # eye opens: sub boom
n = int(SR * 0.3); add(0.22, lp(rng.standard_normal(n), 0.5) * env(n, 0.001, 0.05), 0.4)
for k, x in enumerate([0.3, 0.62, 0.92, 1.2, 1.45, 1.68, 1.9, 2.1, 2.3]): add(x, heart(), 0.5 + 0.04 * k)
def hit():
    n = int(SR * 1.0); t3 = np.arange(n) / SR
    return np.tanh(3 * (np.sin(2 * np.pi * np.cumsum(45 + 120 * np.exp(-t3 / 0.03)) / SR) * env(n, 0.001, 0.25) + lp(rng.standard_normal(n), 0.3) * env(n, 0.001, 0.08)))
add(0.55, hit(), 0.75); add(1.05, hit(), 0.9)
n = int(SR * 0.9); t4 = np.arange(n) / SR
add(0.75, lp(rng.standard_normal(n), 0.06) * np.sin(np.pi * t4 / 0.9) * 2.2, 0.6)  # zoom-out whoosh
n = int(SR * 1.2); t5 = np.arange(n) / SR
add(1.4, rng.standard_normal(n) * (t5 / 1.2) ** 3 * 0.25, 1.0)  # riser into the flash
add(2.58, hit(), 0.7)
mix = np.stack([L, R], 1)
mix /= np.abs(mix).max() + 1e-9
fade = int(SR * 0.8); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 0.85 * 32767).astype('<i2').tobytes())
