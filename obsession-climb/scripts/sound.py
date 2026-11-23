"""Sound design for the climb — NO music: only the narration and synthesised environmental effects
(rain, wind, thunder, rock, grips, footsteps, breaths, cloth, dawn air). Timing comes from scripts/events.json
(exported from src/timeline.js) so every sound lands on its picture event.
Writes public/soundtrack.wav (48 kHz stereo)."""
import json, os
import numpy as np, soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EV = json.load(open(os.path.join(ROOT, 'scripts', 'events.json')))
SR = 48000
DUR = EV['DUR']
N = int(DUR * SR)
B = EV['B']
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR

def sstep(t, a, b):
    x = np.clip((t - a) / (b - a), 0, 1)
    return x * x * (3 - 2 * x)

def band(x, lo, hi, order=2.0):
    """smooth FFT band-pass (lo/hi in Hz; None = open)"""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    if hi: m *= 1 / (1 + (f / hi) ** (2 * order))
    return np.fft.irfft(X * m, len(x))

def noise(n, kind='white'):
    w = rng.standard_normal(n)
    if kind == 'brown':
        w = np.cumsum(w); w -= np.convolve(w, np.ones(4801) / 4801, 'same'); w /= np.abs(w).max() + 1e-9
    elif kind == 'pink':
        X = np.fft.rfft(w); f = np.fft.rfftfreq(n, 1 / SR); X /= np.sqrt(np.maximum(f, 20)); w = np.fft.irfft(X, n)
    return w / (np.std(w) + 1e-9)

L = np.zeros(N); R = np.zeros(N)
def put(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * gain * l * 1.414; R[i:i + len(sig)] += sig * gain * r * 1.414

def env(n, att, dec, shape=1.0):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(att, 1e-4)) * np.exp(-np.maximum(0, t - att) / dec) ** shape

def storm(t): return 1 - sstep(t, 30.8, 34.6)
def dawn(t): return sstep(t, 33.0, 38.0)

# ---------------------------------------------------------------- rain bed (stereo, decorrelated)
st = storm(t_all)
shots_close = sstep(t_all, 13.3, 13.5) * (1 - sstep(t_all, 16.9, 17.1)) + sstep(t_all, 26.9, 27.1) * (1 - sstep(t_all, 29.9, 30.1))
for ch, out in ((0, L), (1, R)):
    hiss = band(noise(N, 'pink'), 500, 9000) * 0.05
    body = band(noise(N, 'pink'), 150, 1200) * 0.03
    # individual drops: sparse clicks, ringing a little
    drops = np.zeros(N)
    idx = rng.integers(0, N, int(DUR * 900))
    drops[idx] = rng.uniform(-1, 1, len(idx)) * rng.uniform(0.2, 1, len(idx)) ** 2
    drops = band(drops, 1800, 7000) * 0.5
    near = np.zeros(N)
    idx = rng.integers(0, N, int(DUR * 60))
    near[idx] = rng.uniform(-1, 1, len(idx))
    near = band(near, 600, 4000) * 0.9
    out += (hiss + body + drops) * st + near * st * (0.3 + 0.9 * shots_close)

# ---------------------------------------------------------------- wind (gusts; howls over the abyss)
gust = 0.6 + 0.4 * np.interp(t_all, np.arange(0, DUR + 1, 1.3), rng.uniform(0, 1, len(np.arange(0, DUR + 1, 1.3))))
gust = np.convolve(gust, np.ones(4800) / 4800, 'same')
abyss = sstep(t_all, 9.8, 10.4) * (1 - sstep(t_all, 13.2, 13.6))
for ch, out in ((0, L), (1, R)):
    w = noise(N, 'brown')
    low = band(w, 120, 700) * 0.22
    whistle = band(noise(N), 600, 900, 4) * 0.05 * (0.4 + abyss)
    air = band(noise(N, 'pink'), 2000, 9000) * 0.012
    out += (low * gust * (0.8 + 0.6 * abyss) + whistle * gust) * np.maximum(st, 0.0) + (air + band(w, 200, 600) * 0.06) * dawn(t_all)

# ---------------------------------------------------------------- thunder
for bt, s, bx, seed, delay in EV['BOLTS']:
    t0 = bt + delay
    n = int(6.0 * SR)
    r = np.random.default_rng(int(seed))
    rumble = np.zeros(n)
    for k in range(7):
        a = r.uniform(0, 1.6); d = r.uniform(0.6, 2.2)
        rumble += env(n, 0.05 + r.uniform(0, 0.25), d) * np.roll(np.ones(n), int(a * SR)) * (np.arange(n) > a * SR) * r.uniform(0.4, 1)
    sig = band(noise(n, 'brown'), 25, 220) * rumble * 0.55 + band(noise(n), 200, 1200) * rumble * 0.08
    if s >= 0.7 and delay < 0.7:
        crack = band(noise(int(0.5 * SR)), 300, 9000) * env(int(0.5 * SR), 0.002, 0.07) * 0.9
        crack += band(noise(int(0.5 * SR)), 60, 400) * env(int(0.5 * SR), 0.004, 0.18) * 0.8
        sig[: len(crack)] += crack
    put(sig, t0, gain=0.25 + 0.65 * s, pan=(bx - 0.5) * 1.2)

# ---------------------------------------------------------------- body / rock foley
def grip(g=1.0, pan=0.15):
    n = int(0.25 * SR)
    s = band(noise(n), 1500, 6000) * env(n, 0.003, 0.03) * 0.35 + band(noise(n), 60, 350) * env(n, 0.002, 0.04) * 0.6
    s += band(noise(n), 700, 2500) * env(n, 0.02, 0.06) * 0.12  # wet slide of fingers
    return s * g
def scuff(g=1.0):
    n = int(0.3 * SR)
    return (band(noise(n), 400, 2500) * env(n, 0.01, 0.06) * 0.3 + band(noise(n), 50, 250) * env(n, 0.003, 0.05) * 0.5) * g
def breath(dur=0.5, g=1.0, out=True):
    n = int(dur * SR)
    e = np.sin(np.pi * np.clip(np.arange(n) / n, 0, 1)) ** (1.5 if out else 2.5)
    s = band(noise(n), 350, 2200) * 0.5 + band(noise(n), 1000, 1500, 4) * 0.6
    return s * e * 0.1 * g
def cloth(dur=0.4, g=1.0):
    n = int(dur * SR)
    e = np.sin(np.pi * np.arange(n) / n) ** 2
    mod = 0.5 + 0.5 * np.abs(band(noise(n), 3, 30))
    return band(noise(n), 300, 4000) * e * mod * 0.12 * g
def thud(g=1.0, f=180):
    n = int(0.4 * SR)
    return band(noise(n), 40, f) * env(n, 0.003, 0.07) * 0.9 * g
def pebbles(dur, rate, g=1.0, lo=1500, hi=6000, fade=True):
    n = int(dur * SR)
    s = np.zeros(n)
    k = int(dur * rate)
    idx = np.sort(rng.integers(0, n, k))
    s[idx] = rng.uniform(-1, 1, k)
    s = band(s, lo, hi) * 1.2
    if fade: s *= np.exp(-np.arange(n) / n * 3)
    return s * g

def mx(*sigs):
    n = max(len(x) for x in sigs); o = np.zeros(n)
    for x in sigs: o[: len(x)] += x
    return o

# climbing contacts
cl = sstep(t_all, 0, 1)
for seg, g in (('climb', 1.0), ('haul', 1.0), ('lip', 0.8), ('reach', 0.8)):
    for i, (t, kind) in enumerate(EV['steps'][seg]):
        put(grip(0.9 * g) if kind == 'hand' else scuff(0.8 * g), t, pan=0.1 * (1 if i % 2 else -1))
# breathing while climbing (exhausted, gets heavier)
for t in np.arange(3.8, 8.9, 1.15): put(breath(0.55, 0.8, True), t, pan=0.05)
for t in np.arange(18.5, 20.3, 0.85): put(breath(0.5, 1.0), t)
for t in np.arange(20.4, 26.5, 1.0): put(breath(0.6, 0.9 + 0.2 * np.sin(t)), t)

# the slip
put(band(noise(int(0.3 * SR)), 1500, 8000) * env(int(0.3 * SR), 0.001, 0.025) * 1.0 + thud(0.9, 300)[: int(0.3 * SR)], B['slip'], pan=0.1)  # hold cracks
put(pebbles(1.3, 70, 0.9), B['slip'] + 0.02, pan=0.2)
n = int(0.48 * SR)
put(band(noise(n), 500, 4000) * np.sin(np.pi * np.arange(n) / n) * 0.35, B['slip'] + 0.02)  # slide down the rock
put(breath(0.25, 2.2), B['slip'] + 0.05)  # gasp
put(mx(thud(1.4, 220), grip(1.3)), B['catch'], pan=0.05)  # catches the ledge
put(cloth(0.35, 1.5), B['catch'] - 0.05)
put(breath(0.5, 1.8), B['catch'] + 0.12)
# rocks falling away into the abyss
for k in range(9):
    put(pebbles(0.6, 25, 0.35 * (0.8 ** k), 900 - k * 60, 4000 - k * 300), B['slip'] + 0.7 + k * 0.4 + rng.uniform(0, 0.2), pan=0.3)
# hanging: struggling breaths, scrape of shoes against the wall
for t in (10.2, 11.3, 12.4, 13.5, 14.5, 15.5, 16.3, 17.1, 17.8):
    put(breath(0.55, 1.2), t)
for t in (10.0, 10.7, 11.6, 12.9): put(scuff(0.45), t, pan=0.1)
put(cloth(0.6, 0.8), 12.2)  # failed reach
for t in (B['slide1'], B['slide2']):
    n = int(0.14 * SR)
    put(band(noise(n), 1800, 5000) * env(n, 0.005, 0.05) * 0.5 + pebbles(0.4, 30, 0.4)[:n], t)
put(band(noise(int(0.2 * SR)), 900, 5000) * env(int(0.2 * SR), 0.001, 0.03) * 1.1 + thud(0.8, 250)[: int(0.2 * SR)], B['slap'])  # second hand
put(breath(0.4, 1.6), B['slap'] + 0.1)
# pull-up strain
n = int(2.4 * SR)
put(band(noise(n), 300, 2500) * np.sin(np.pi * np.arange(n) / n) * 0.06, B['pullStart'] + 0.1)
for t in (17.3, 17.95): put(scuff(1.0), t)
put(breath(0.7, 1.7), 18.35)

# the man in the coat: cloth flapping in the wind while he is there
m_on = sstep(t_all, 22.6, 22.7) * (1 - sstep(t_all, 33.6, 34.0))
flap = band(noise(N), 150, 2500) * (0.5 + 0.5 * np.sin(2 * np.pi * 7.3 * t_all) ** 2) * 0.05
L += flap * m_on * gust * (0.6 + 0.4 * st); R += flap * m_on * gust * (0.6 + 0.4 * st) * 0.8
put(cloth(0.9, 1.2), B['kneel'])
put(thud(0.6, 200), B['kneel'] + 0.8)  # knee down on the rock
put(cloth(0.8, 0.9), 25.0)  # the arm reaches down
# the clasp
put(thud(1.3, 160) + band(noise(int(0.4 * SR)), 300, 1500) * env(int(0.4 * SR), 0.01, 0.08) * 0.25, B['clasp'])
put(breath(0.6, 1.5), B['clasp'] + 0.2)
# pulled over the lip
n = int(1.4 * SR)
put(band(noise(n), 400, 3000) * np.sin(np.pi * np.arange(n) / n) * 0.18, 30.2)  # body scrapes over the edge
put(pebbles(0.8, 30, 0.5), B['over'])
put(thud(1.0, 200), B['knee'])
for t in (30.9, 31.75, 32.55): put(mx(scuff(0.9), thud(0.4)), t, pan=-0.2)  # his boots stepping back
put(cloth(0.8, 1.0), 31.2)
for t in (32.4, 33.2, 34.0, 34.8): put(breath(0.7, 1.4 - 0.2 * (t - 32.4)), t)  # catching his breath
# dawn: standing up, the calm
put(cloth(1.0, 0.9), B['stand'])
for t in (B['stand'] + 0.7, B['stand'] + 1.3): put(scuff(0.6), t)
put(breath(1.1, 0.8), 36.4)
for k, t in enumerate((36.2, 37.9, 38.3, 40.4, 41.1)):  # a few distant birds far below
    n = int(0.18 * SR); tt = np.arange(n) / SR
    f0 = 2600 + 700 * np.sin(k * 1.7)
    ph = 2 * np.pi * np.cumsum(f0 + 900 * np.sin(2 * np.pi * 14 * tt)) / SR
    put(np.sin(ph) * np.sin(np.pi * tt / tt[-1]) ** 2 * 0.006, t, pan=0.5 - 0.25 * k)

if os.environ.get('SFX_ONLY'):
    # effects bed only (no voice, no ducking) for re-voicing / re-cutting
    sf.write(os.path.join(ROOT, 'public', 'sfx.wav'), np.stack([L, R], 1).astype(np.float32), SR, subtype='FLOAT')
    print('sfx written'); raise SystemExit
# ---------------------------------------------------------------- narration + ducking
voice = np.zeros(N)
for pid, t0 in EV['VO'].items():
    v, sr = sf.read(os.path.join(ROOT, 'public', 'voice', f'{pid}.wav'), dtype='float64')
    if v.ndim > 1: v = v.mean(1)
    assert sr == SR, sr
    i = int(t0 * SR); voice[i:i + len(v)] += v[: N - i]
voice *= 0.5 / (np.abs(voice).max() + 1e-9) * 1.25
vact = np.convolve(np.abs(voice) > 0.01, np.ones(int(0.35 * SR)) / int(0.35 * SR), 'same')
duck = 1 - 0.45 * np.clip(vact * 3, 0, 1)
L *= duck; R *= duck
mix = np.stack([L * 0.55 + voice, R * 0.55 + voice], 1)
mix *= 0.89 / np.abs(mix).max()
# fade out with the picture
mix *= (1 - sstep(t_all, 42.0, 43.0))[:, None]
sf.write(os.path.join(ROOT, 'public', 'soundtrack.wav'), mix.astype(np.float32), SR, subtype='PCM_24')
print('ok', mix.shape, 'peak', np.abs(mix).max())
