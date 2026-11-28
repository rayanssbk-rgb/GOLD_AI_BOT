"""Resserre le rythme : tout silence de plus de 0,30 s dans le dialogue est ramené à 0,20 s (fondu court).
Met à jour dialogue.wav, les pistes par personnage et TOUS les minutages (segments + caractères),
donc sous-titres et lip-sync restent synchronisés. À lancer juste après generate_dialogue.py.
Usage : python scripts/tighten.py ep01 [--max 0.30] [--garde 0.20]
"""
import os, sys
import numpy as np, soundfile as sf
from common import ROOT, jload, jsave


def main(ep, mx, keep):
    d = os.path.join(ROOT, 'episodes', ep, 'audio')
    x, sr = sf.read(os.path.join(d, 'dialogue.wav'), dtype='float32')
    h = sr // 100
    q = np.array([np.sqrt(np.mean(x[i:i + h] ** 2)) < 0.01 for i in range(0, len(x) - h, h)] + [False])
    cuts, s = [], None  # (début_coupe, fin_coupe) en échantillons
    for i, v in enumerate(q):
        if v and s is None: s = i
        if not v and s is not None:
            if (i - s) / 100 > mx:
                mid = (s + i) / 2 / 100
                cuts.append((int((mid - (i - s) / 200 + keep / 2) * sr), int((mid + (i - s) / 200 - keep / 2) * sr)))
            s = None
    def tmap(t):
        n = int(t * sr)
        return (n - sum(min(max(n - a, 0), b - a) for a, b in cuts)) / sr
    fade = int(0.01 * sr)
    def cut(y):
        out, prev = [], 0
        for a, b in cuts:
            seg = y[prev:a].copy(); seg[-fade:] *= np.linspace(1, 0, fade); out.append(seg)
            prev = b
        seg = y[prev:].copy(); seg[:fade] *= np.linspace(0, 1, fade) if prev else 1; out.append(seg)
        return np.concatenate(out)
    sf.write(os.path.join(d, 'dialogue.wav'), cut(x), sr)
    for f in os.listdir(os.path.join(d, 'par_perso')):
        p = os.path.join(d, 'par_perso', f); y, _ = sf.read(p, dtype='float32'); sf.write(p, cut(y), sr)
    tm = jload(os.path.join(d, 'timing.json'))
    for s in tm['segments']:
        s['debut'], s['fin'] = tmap(s['debut']), tmap(s['fin'])
    for k in ('alignment', 'normalized_alignment'):
        a = tm.get(k)
        if a:
            a['character_start_times_seconds'] = [tmap(t) for t in a['character_start_times_seconds']]
            a['character_end_times_seconds'] = [tmap(t) for t in a['character_end_times_seconds']]
    old = tm['duree']; tm['duree'] = len(cut(x)) / sr; tm['resserre'] = {'max': mx, 'garde': keep}
    jsave(os.path.join(d, 'timing.json'), tm)
    print(f'{len(cuts)} silences resserrés : {old:.1f}s -> {tm["duree"]:.1f}s')


if __name__ == '__main__':
    a = sys.argv
    opt = lambda k, v: float(a[a.index(k) + 1]) if k in a else v
    main(a[1], opt('--max', 0.30), opt('--garde', 0.20))
