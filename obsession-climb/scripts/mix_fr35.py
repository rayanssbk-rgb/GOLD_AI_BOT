"""French 35 s soundtrack: the same effects bed as the English film, cut exactly like out/obsession_35s.mp4
(scripts/cut35.py segments), with the French narration placed where the English sentences were."""
import json, os, numpy as np, soundfile as sf
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEG = [(0, 6.6), (8.6, 12.8), (13.4, 16.4), (17.0, 23.4), (24.0, 26.4), (27.0, 29.3), (30.0, 32.3), (33.9, 42.2)]
XF, D = 0.5, 0.04
total = sum(b - a for a, b in SEG) - XF
x, sr = sf.read(os.path.join(ROOT, 'public', 'sfx.wav'))
out = np.zeros((int(round(total * sr)) + sr, 2)); pos = 0.0
for i, (a, b) in enumerate(SEG):
    last = i == len(SEG) - 1
    d = XF if last else (D if i > 0 else 0)
    pre = 0 if last else d / 2
    post = 0 if last or i == len(SEG) - 2 else D / 2
    seg = x[int(round((a - pre) * sr)): int(round((b + post) * sr))].copy()
    i0 = int(round((pos - (XF if last else pre)) * sr)); k = int(round(d * sr))
    if k:
        r = np.linspace(0, 1, k)[:, None]; seg[:k] *= r; out[i0:i0 + k] *= (1 - r); out[i0 + k:] = 0
    out[i0:i0 + len(seg)] += seg
    pos += (b - a) - (XF if last else 0)
bed = out[: int(round(total * sr))]
N = len(bed)
# French narration
P = json.load(open(os.path.join(ROOT, 'scripts', 'narration_fr.json')))
voice = np.zeros(N); prev = 0; placed = []
for p in P:
    v, vsr = sf.read(os.path.join(ROOT, 'public', 'voice_fr', f"{p['id']}.wav"), dtype='float64')
    assert vsr == sr
    t0 = max(p['en'], prev + 0.35)
    i = int(t0 * sr); voice[i:i + len(v)] += v[: N - i]
    prev = t0 + len(v) / sr; placed.append((p['id'], round(t0, 2), round(prev, 2)))
voice *= 0.5 / (np.abs(voice).max() + 1e-9) * 1.25
vact = np.convolve(np.abs(voice) > 0.01, np.ones(int(0.35 * sr)) / int(0.35 * sr), 'same')
duck = (1 - 0.45 * np.clip(vact * 3, 0, 1))[:, None]
mix = bed * duck * 0.55 + voice[:, None]
mix *= 0.89 / np.abs(mix).max()
mix *= np.clip((total - np.arange(N) / sr) / 0.8, 0, 1)[:, None]
sf.write(os.path.join(ROOT, 'public', 'soundtrack_fr35.wav'), mix.astype(np.float32), sr, subtype='PCM_24')
json.dump(placed, open(os.path.join(ROOT, 'scripts', 'placed_fr.json'), 'w'))
for r in placed: print(r)
print('total', total)
