# Sound design for "Le sommet": concrete footsteps synced to the gait, room tone, heartbeat,
# transition swells, a slow original ambient pad that rises toward the light. usage: python sound.py out.wav
import sys, wave
import numpy as np

SR = 48000
DUR = 36.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(36)

def add(t, s, g=1.0, pan=0.0):
    i = int(t * SR)
    if i < 0 or i >= N: return
    s = s[: N - i] * g
    L[i:i + len(s)] += s * np.sqrt((1 - pan) / 2) * 1.414
    R[i:i + len(s)] += s * np.sqrt((1 + pan) / 2) * 1.414
def lp(x, k):
    y = np.empty_like(x); a = 0.0
    for i, v in enumerate(x): a += k * (v - a); y[i] = a
    return y
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

def step(hard=1.0):
    n = int(SR * 0.3); t = np.arange(n) / SR
    s = lp(rng.standard_normal(n), 0.25) * env(n, 0.001, 0.02) * 0.9 + np.sin(2 * np.pi * (95 + 30 * rng.random()) * t) * env(n, 0.001, 0.04) * 0.6 * hard
    return s
def heart():
    n = int(SR * 0.6); t = np.arange(n) / SR
    a = np.sin(2 * np.pi * 48 * t) * env(n, 0.004, 0.08)
    b = np.roll(np.sin(2 * np.pi * 44 * t) * env(n, 0.004, 0.07), int(0.18 * SR)) * 0.7
    return np.tanh(2 * (a + b))
def swell(dur, f=60):
    n = int(SR * dur); t = np.arange(n) / SR
    noise = lp(rng.standard_normal(n), 0.02) * 2.5
    tone = np.sin(2 * np.pi * f * t) * 0.5
    return (noise + tone) * np.sin(np.pi * t / dur) ** 2
def boom():
    n = int(SR * 3); t = np.arange(n) / SR
    return np.tanh(2 * np.sin(2 * np.pi * np.cumsum(36 + 40 * np.exp(-t / 0.2)) / SR) * env(n, 0.005, 1.0))

# ---- footsteps (mirrors the gait in Main.tsx)
def steps_every(t0, t1, dt, g=0.5, pan=0.0):
    t = t0
    while t < t1:
        add(t + rng.random() * 0.01, step(), g, pan); t += dt
steps_every(0.2 + 0.28, 6.4, 0.68 / 1.2, 0.5)          # corridor
steps_every(10.9, 11.8, 0.6 / (1.7 / 0.9) , 0.45)       # walk to the stairs
steps_every(11.8, 13.0, 1 / 1.6, 0.5)                   # climb
steps_every(13.0, 15.3, 1 / 1.45, 0.55)                 # tired climb
add(15.45, boom()[: int(SR * 0.6)], 0.35); add(15.5, step(2), 0.9); add(15.75, step(1.5), 0.7)  # the fall: knee + hand
t = 15.9
while t < 19.0:
    add(t, heart(), 0.45); t += 1.0 if t < 17.6 else 0.62
add(18.6, step(1.2), 0.5)
steps_every(19.1, 20.9, 1 / 1.5, 0.5)
steps_every(21.0, 25.0, 0.68 / 1.15, 0.45)              # bridge
steps_every(26.6, 31.0, 0.68 / 1.15, 0.45)
steps_every(32.6, 35.3, 0.68 / 0.95, 0.4)
# crowd: the ones who leave
for t0 in (8.5, 9.5, 10.4):
    steps_every(t0 + 0.5, t0 + 3.0, 0.68 / 1.15, 0.18, 0.5 if t0 != 9.5 else -0.5)

# ---- transitions & accents
add(6.0, swell(1.2, 55), 0.35)
add(12.7, swell(0.6, 70), 0.25)
add(20.5, swell(1.0, 80), 0.3)
add(31.0, boom(), 0.45)

# ---- room tone (concrete space) + slow ambient pad (original chords, A minor -> F -> C -> G)
t = np.arange(N) / SR
room = lp(rng.standard_normal(N), 0.004) * 0.6
def pad(freqs, t0, t1):
    n0, n1 = int(t0 * SR), int(t1 * SR)
    tt = np.arange(n1 - n0) / SR
    s = np.zeros(n1 - n0)
    for f in freqs:
        for d in (-0.6, 0, 0.6):
            s += np.sin(2 * np.pi * (f + d) * tt + rng.random() * 6)
    s /= len(freqs) * 3
    s *= np.minimum(1, tt / 2.5) * np.minimum(1, (tt[-1] - tt) / 2.5)
    return n0, s
chords = [([110, 164.8, 220, 261.6], 0, 10), ([87.3, 130.8, 174.6, 220], 8, 19), ([65.4, 130.8, 196, 261.6, 329.6], 17, 28), ([98, 146.8, 196, 246.9, 293.7, 392], 26, 36)]
padbus = np.zeros(N)
for fr, a, b in chords:
    n0, s = pad(fr, a, b)
    padbus[n0:n0 + len(s)] += s
rise = 0.06 + 0.16 * np.clip((t - 21) / 13, 0, 1) ** 2
padbus *= rise * np.where(t > 35.3, np.clip((36 - t) / 0.7, 0, 1), 1)
L += room * 0.05 + padbus; R += room * 0.05 + np.roll(padbus, int(0.011 * SR))

# ---- simple concrete reverb on everything
def reverb(x, sec=2.2, mix=0.3):
    n = int(SR * sec); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * sec / 6))
    ir = lp(ir, 0.3)
    wet = np.fft.irfft(np.fft.rfft(x, len(x) + n) * np.fft.rfft(ir, len(x) + n))[: len(x)]
    wet *= np.abs(x).max() / (np.abs(wet).max() + 1e-9)
    return x * (1 - mix) + wet * mix
L = reverb(L); R = reverb(R)
mix = np.stack([L, R], 1)
mix /= np.abs(mix).max() + 1e-9
fade = int(SR * 0.5); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 0.9 * 32767).astype('<i2').tobytes())
