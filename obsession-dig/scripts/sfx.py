"""Sound design only (no music): pickaxe strikes of the three diggers, efforts, the collapse, the quitters dropping
their tools, the breakthrough into the gold cavern, ambience. Synced to the same schedules as the picture.
Writes public/sfx.wav (48 kHz stereo)."""
import json, os
import numpy as np, soundfile as sf
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EV = json.load(open(os.path.join(ROOT, 'scripts', 'events.json')))
SR = 48000; DUR = 32.0; N = int(DUR * SR)
B = EV['B']
rng = np.random.default_rng(5)
L = np.zeros(N); R = np.zeros(N); RV = np.zeros(N)
t_all = np.arange(N) / SR

def band(x, lo=None, hi=None, order=2.0):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); k = np.ones_like(f)
    if lo: k *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    if hi: k *= 1 / (1 + (f / hi) ** (2 * order))
    return np.fft.irfft(X * k, len(x))
def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
def put(sig, t0, g=1.0, pan=0.0, rev=0.3):
    i = int(t0 * SR)
    if i >= N or i < 0: return
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4) * 1.414; r = np.sin((pan + 1) * np.pi / 4) * 1.414
    L[i:i + len(sig)] += sig * g * l; R[i:i + len(sig)] += sig * g * r; RV[i:i + len(sig)] += sig * g * rev

def strike(seed, hard=1.0):
    """pickaxe on rock: metallic tink + dull thud + crumble"""
    r = np.random.default_rng(seed); n = int(0.7 * SR); t = np.arange(n) / SR
    f0 = 2300 + r.uniform(-250, 250)
    tink = sum(a * np.sin(2 * np.pi * f0 * m * t + r.uniform(0, 6)) * np.exp(-t / d) for m, a, d in ((1, 1, 0.07), (1.47, 0.6, 0.05), (2.09, 0.35, 0.035), (2.83, 0.2, 0.025)))
    thud = band(r.standard_normal(n), 60, 260) * env(n, 0.002, 0.06) * 1.6
    crack = band(r.standard_normal(n), 1500, 7000) * env(n, 0.0005, 0.012) * 0.9
    crumble = np.zeros(n); k = r.integers(int(0.02 * SR), int(0.45 * SR), 26)
    crumble[k] = r.uniform(-1, 1, len(k)) * np.exp(-k / SR / 0.15)
    crumble = band(crumble, 1200, 6000) * 1.3
    return (tink * 0.32 + thud + crack + crumble) * hard
def breath(dur=0.35, g=1.0, seed=0):
    r = np.random.default_rng(seed); n = int(dur * SR)
    e = np.sin(np.pi * np.arange(n) / n) ** 2
    return (band(r.standard_normal(n), 400, 2200) * 0.5 + band(r.standard_normal(n), 1000, 1500, 4) * 0.5) * e * 0.12 * g
def thump(g=1.0, lo=40, hi=200, dec=0.12):
    n = int(0.6 * SR)
    return band(rng.standard_normal(n), lo, hi) * env(n, 0.003, dec) * g
def rubble(dur, rate, g=1.0, lo=800, hi=5000, dec=0.6):
    n = int(dur * SR); s = np.zeros(n); k = rng.integers(0, n, int(dur * rate))
    s[k] = rng.uniform(-1, 1, len(k)) * np.exp(-k / SR / dec)
    return band(s, lo, hi) * g
def clatter(g=1.0):
    """a dropped pickaxe hitting the rock floor"""
    n = int(0.8 * SR); t = np.arange(n) / SR; o = np.zeros(n)
    for j, (dt, a) in enumerate(((0, 1), (0.11, 0.55), (0.19, 0.3))):
        i = int(dt * SR); m = n - i
        tt = t[:m]
        ring = sum(b * np.sin(2 * np.pi * f * tt) * np.exp(-tt / d) for f, b, d in ((1700 + 60 * j, 1, 0.09), (2650, 0.5, 0.06), (4100, 0.25, 0.04)))
        o[i:] += (ring * 0.4 + band(rng.standard_normal(m), 80, 300) * np.exp(-tt / 0.04)) * a
    return o * g
def sigh(g=1.0):
    n = int(1.1 * SR); t = np.arange(n) / SR
    e = np.minimum(1, t / 0.15) * np.exp(-t / 0.45)
    return (band(rng.standard_normal(n), 300, 1600) * 0.6 + band(rng.standard_normal(n), 600, 900, 4) * 0.5) * e * 0.2 * g

# ambience: night wind at the surface, then the low hum of the underground (louder in the cavern)
wind = band(np.cumsum(rng.standard_normal(N)), 80, 600); wind /= np.abs(wind).max()
gust = 0.6 + 0.4 * np.interp(t_all, np.arange(0, 33, 1.5), rng.uniform(0, 1, 22))
under = band(rng.standard_normal(N), 40, 180); under /= np.abs(under).max()
surf = 1 - np.clip((t_all - 5) / 3, 0, 1)
cave = np.clip((t_all - B['breakthrough']) / 1.0, 0, 1)
L += wind * gust * 0.08 * surf + under * (0.05 + 0.08 * cave)
R += wind[::-1] * gust * 0.08 * surf + under * (0.05 + 0.08 * cave)
# the three sit on the surface, then stand and pick up their tools
for pan, dt in ((-0.5, 0.0), (0.0, 0.06), (0.5, 0.12)):
    put(rubble(0.4, 40, 0.25, 300, 2500), B['stand'] + dt, pan=pan)
    put(clatter(0.35)[: int(0.25 * SR)], B['grab'] + dt, pan=pan)

def sched(a, b, step, dd):
    o = []; t = a
    while t < b - 1e-6: o.append(round(t, 3)); t += step
    return o
AMB = sched(6, 9, 0.25, 0.12) + sched(9, 11.01, 0.5, 0.1); AMB_Q = 11.5
PRE = sched(6, 19.01, 0.5, 0.14); PRE_Q = 19.5
OBS = [s[0] for s in EV['STRIKES']]
# AMBITION (left): eager, then weaker
for i, t in enumerate(AMB):
    put(strike(100 + i, 0.75 - 0.25 * (t > 9)), t, g=0.55 if t < 14 else 0.3, pan=-0.55)
    if i % 2 == 1: put(breath(0.3, 0.7, 300 + i), t + 0.05, pan=-0.55)
# PRÉCISION (centre): steady
for i, t in enumerate(PRE):
    put(strike(400 + i, 0.85), t, g=0.6 if t < 20 else 0.35, pan=0.0)
# OBSESSION (right): louder, harder, effort on every strike from the frenzy
for i, t in enumerate(OBS):
    hard = 1.0 if t < 14 else 1.15 if t < 20 else 1.3
    put(strike(700 + i, hard), t, g=0.8 if t < 20 else 1.0, pan=0.5 if t < 20 else 0.15)
    if t >= 14 and i % (1 if t >= 20 else 2) == 0: put(breath(0.22 if t >= 20 else 0.3, 0.9 + 0.5 * (t >= 20), 900 + i), t - 0.12, pan=0.2)
# the collapse under OBSESSION (8.25) and the fall on his back (8.5), then getting up
put(rubble(1.2, 90, 0.8, 300, 5000, 0.5), B['collapse'], pan=0.5)
put(thump(1.0, 40, 220, 0.25), B['collapse'], pan=0.5)
put(breath(0.25, 2.0, 7), B['collapse'] + 0.05, pan=0.5)
put(thump(1.6, 40, 180, 0.16) + np.pad(clatter(0.4), (0, int(0.6 * SR) - int(0.8 * SR)) if False else (0, 0))[: int(0.6 * SR)], B['impact'], pan=0.5)
put(clatter(0.5), B['impact'] + 0.1, pan=0.6)
put(breath(0.6, 1.4, 8), B['impact'] + 0.3, pan=0.5)
put(rubble(0.5, 30, 0.3, 300, 2500), B['up'] + 0.3, pan=0.5)
put(rubble(0.4, 30, 0.3, 300, 2500), 9.8, pan=0.5)
put(clatter(0.3)[: int(0.2 * SR)], 10.15, pan=0.5)  # picks his pickaxe up again
# the quitters drop their tools and sit down
for q, pan in ((AMB_Q, -0.55), (PRE_Q, 0.0)):
    put(clatter(0.8), q + 0.72, pan=pan)
    put(sigh(1.0), q + 0.3, pan=pan)
    put(rubble(0.5, 30, 0.25, 300, 2000), q + 1.0, pan=pan)
# crystals catching the light: a tiny glassy tick each
for i, t in enumerate(EV['CRYSTALS']):
    n = int(0.5 * SR); tt = np.arange(n) / SR; f = 3200 + 180 * i
    put(np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.12) * 0.05, t, pan=0.5 if i % 2 else 0.2, rev=0.6)
# breakthrough: the floor shatters, rubble falls into the cavern, he lands on the ledge
t0 = B['breakthrough']
put(strike(999, 1.6), t0, g=1.0, pan=0.15)
put(thump(2.0, 30, 160, 0.6), t0, pan=0.1)
put(rubble(3.0, 120, 1.0, 200, 5000, 1.0), t0 + 0.02, pan=0.2, rev=0.6)
for k in range(10): put(rubble(0.5, 25, 0.4 * 0.8 ** k, 600, 4000), t0 + 0.6 + k * 0.28, pan=0.3, rev=0.7)
put(breath(0.3, 1.8, 11), t0 + 0.05, pan=0.15)
put(thump(1.2, 40, 200, 0.12), B['land'], pan=0.15)
put(breath(0.8, 1.2, 12), B['land'] + 0.3, pan=0.15)
put(rubble(0.5, 30, 0.35, 300, 2500), B['rise'], pan=0.15)
put(breath(1.0, 1.0, 13), B['raise'] + 0.2, pan=0.15)
put(clatter(0.25)[: int(0.25 * SR)], B['raise'] + 1.1, pan=0.15)
# shaft / cavern echo (short, then long in the cavern)
irn = int(2.4 * SR); ti = np.arange(irn) / SR
for src, dst, sd in ((RV, L, 1), (RV, R, 2)):
    h = band(np.random.default_rng(sd).standard_normal(irn) * np.exp(-ti / 0.35), 150, 6000)
    M = 1 << int(np.ceil(np.log2(N + irn)))
    wet = np.fft.irfft(np.fft.rfft(src, M) * np.fft.rfft(h, M), M)[:N]
    dst += wet / np.abs(h).sum() * 10 * (1 + 1.5 * cave)
mix = np.stack([L, R], 1)
mix = np.tanh(mix / np.abs(mix).max() * 1.4) / np.tanh(1.4)
mix *= (np.clip((DUR - t_all) / 0.8, 0, 1) ** 1.5)[:, None] * 0.9
sf.write(os.path.join(ROOT, 'public', 'sfx.wav'), mix.astype(np.float32), SR, subtype='PCM_24')
print('sfx ok')
