"""5 s of sound for the POV phone scene (no music): sea + breeze, phone haptic, counter ticks while the balance
counts up (1.0 -> 2.6 s, ease-out), a soft notification chime when it lands, a scroll swish. Writes public/pov_sfx.wav."""
import os, numpy as np, soundfile as sf
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000; N = 5 * SR; t = np.arange(N) / SR
rng = np.random.default_rng(9)
def band(x, lo=None, hi=None, o=2.0):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); k = np.ones_like(f)
    if lo: k *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (2 * o))
    if hi: k *= 1 / (1 + (f / hi) ** (2 * o))
    return np.fft.irfft(X * k, len(x))
out = np.zeros((N, 2))
for ch in range(2):
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 4.2 + ch * 0.6) ** 2
    out[:, ch] = band(rng.standard_normal(N), 150, 2500) * 0.04 * swell + band(rng.standard_normal(N), 200, 900) * 0.015
def put(sig, t0, g=1.0, pan=0.0):
    i = int(t0 * SR); sig = sig[: N - i]
    out[i:i + len(sig), 0] += sig * g * (1 - pan) ; out[i:i + len(sig), 1] += sig * g * (1 + pan)
# haptic buzz when the screen wakes
n = int(0.09 * SR); tt = np.arange(n) / SR
put(np.sin(2 * np.pi * 170 * tt) * np.sin(np.pi * tt / tt[-1]) * 0.35, 0.5)
# counter ticks: dense at first, slowing down with the ease-out
k = np.linspace(0, 1, 400)
times = 1.0 + 1.6 * (1 - (1 - k) ** (1 / 3))  # inverse of the ease-out: equal value steps
last = -1
for tk in times:
    if tk - last < 0.035: continue
    last = tk
    n = int(0.02 * SR); tt = np.arange(n) / SR
    put(np.sin(2 * np.pi * 3100 * tt) * np.exp(-tt / 0.004) * 0.12, tk, pan=0.1)
# notification chime when the amount lands
n = int(1.4 * SR); tt = np.arange(n) / SR
chime = sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / d) for f, a, d in ((1318.5, 1, 0.5), (1975.5, 0.6, 0.4), (2637, 0.25, 0.3)))
chime2 = np.zeros(n); j = int(0.11 * SR)
chime2[j:] = sum(a * np.sin(2 * np.pi * f * tt[: n - j]) * np.exp(-tt[: n - j] / d) for f, a, d in ((1760, 1, 0.55), (2637, 0.5, 0.4)))
put((chime + chime2) * 0.07, 2.6, pan=0.05)
# scroll swish
n = int(0.5 * SR)
put(band(rng.standard_normal(n), 2000, 7000) * np.sin(np.pi * np.arange(n) / n) ** 2 * 0.05, 3.5, pan=0.1)
# message notification: haptic + a soft two-note alert, then his quick laugh
n = int(0.09 * SR); tt = np.arange(n) / SR
put(np.sin(2 * np.pi * 170 * tt) * np.sin(np.pi * tt / tt[-1]) * 0.35, 3.12)
n = int(0.6 * SR); tt = np.arange(n) / SR
put(np.sin(2 * np.pi * 1568 * tt) * np.exp(-tt / 0.12) * 0.08, 3.12)
put(np.sin(2 * np.pi * 2093 * tt) * np.exp(-tt / 0.14) * 0.08, 3.22)
lg, lsr = sf.read(os.path.join(ROOT, 'public', 'laugh.wav'))
assert lsr == SR
lg = lg / np.abs(lg).max() * 0.42
put(lg, 3.45)
# glass fizz on the left
fz = np.zeros(N); kk = rng.integers(0, N, 700); fz[kk] = rng.uniform(-1, 1, len(kk))
fz = band(fz, 4000, 12000) * 0.08
out[:, 0] += fz; out[:, 1] += fz * 0.4
out *= (np.clip(t / 0.35, 0, 1) * np.clip((5 - t) / 0.4, 0, 1))[:, None]
out *= 0.5 / np.abs(out).max()
sf.write(os.path.join(ROOT, 'public', 'pov_sfx.wav'), out.astype(np.float32), SR, subtype='PCM_24')
print('ok')
