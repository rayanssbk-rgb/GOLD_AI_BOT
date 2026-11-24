"""5 s of ambience for the yacht scene (no music): gentle sea, water lapping on the hull, warm breeze,
a faint far city, and a soft fizz from the glass as it is raised. Writes public/yacht_sfx.wav."""
import os, numpy as np, soundfile as sf
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000; N = 5 * SR; t = np.arange(N) / SR
rng = np.random.default_rng(3)
def band(x, lo=None, hi=None, o=2.0):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); k = np.ones_like(f)
    if lo: k *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (2 * o))
    if hi: k *= 1 / (1 + (f / hi) ** (2 * o))
    return np.fft.irfft(X * k, len(x))
out = np.zeros((N, 2))
for ch in range(2):
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 4.2 + ch * 0.6) ** 2
    sea = band(rng.standard_normal(N), 150, 2500) * 0.05 * swell
    breeze = band(rng.standard_normal(N), 200, 900) * 0.02 * (0.7 + 0.3 * np.sin(t * 0.9 + ch))
    city = band(rng.standard_normal(N), 80, 300) * 0.012
    lap = np.zeros(N)
    for k in range(9):  # water slapping the hull, following the boat's rocking (period ~5 s)
        t0 = 0.25 + k * 0.55 + rng.uniform(-0.1, 0.1)
        i = int(t0 * SR); n = int(0.35 * SR)
        if i + n > N: break
        e = np.sin(np.pi * np.arange(n) / n) ** 2
        lap[i:i + n] += band(rng.standard_normal(n), 250, 1400) * e * rng.uniform(0.05, 0.11)
    out[:, ch] = sea + breeze + city + lap
# fizz of the glass while it is held up (centre-right)
fz = np.zeros(N); k = rng.integers(int(1.2 * SR), N, 900)
fz[k] = rng.uniform(-1, 1, len(k))
fz = band(fz, 4000, 12000) * 0.12 * np.clip((t - 1.2) / 1.0, 0, 1)
out[:, 0] += fz * 0.6; out[:, 1] += fz
# a soft "ting" of light on the glass at the toast
n = int(1.2 * SR); tt = np.arange(n) / SR; i = int(2.85 * SR)
ting = sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / d) for f, a, d in ((2640, 1, 0.45), (3960, 0.4, 0.3), (5280, 0.2, 0.2))) * 0.05
out[i:i + n, 0] += ting[: N - i] * 0.7; out[i:i + n, 1] += ting[: N - i]
fade = np.clip(t / 0.45, 0, 1) * np.clip((5 - t) / 0.4, 0, 1)
out *= fade[:, None]
out *= 0.5 / np.abs(out).max()
sf.write(os.path.join(ROOT, 'public', 'yacht_sfx.wav'), out.astype(np.float32), SR, subtype='PCM_24')
print('ok')
