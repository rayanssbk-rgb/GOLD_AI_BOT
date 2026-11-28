"""Données de synchronisation labiale, par personnage, à 30 images/s.

Pour chaque personnage : courbe d'ouverture de bouche (énergie de sa piste isolée) + visème à chaque image,
déduit des lettres prononcées (timing caractère ElevenLabs). Visèmes : X repos, A (a), E (é/è/i), O (o/au),
U (ou/u), M (m/b/p lèvres fermées), F (f/v), C (autres consonnes).

Servent à deux choses :
  - moteur 3D local (Three.js / Blender) : piloter les blendshapes de bouche ;
  - service vidéo IA : contrôle qualité (la piste par_perso/<perso>.wav est ce qu'on lui envoie pour le lip-sync).
Usage : python scripts/lipsync.py ep01
"""
import os, sys, unicodedata
import numpy as np, soundfile as sf
from common import ROOT, jload, jsave

FPS = 30
VIS = [('ou', 'U'), ('au', 'O'), ('eau', 'O'), ('a', 'A'), ('à', 'A'), ('â', 'A'), ('é', 'E'), ('è', 'E'), ('ê', 'E'),
       ('e', 'E'), ('i', 'E'), ('y', 'E'), ('o', 'O'), ('ô', 'O'), ('u', 'U'), ('m', 'M'), ('b', 'M'), ('p', 'M'),
       ('f', 'F'), ('v', 'F')]


def visemes(ch, t0, t1, c0, c1):
    out, k, tag = [], c0, False
    while k < c1:
        c = ch[k].lower()
        if c == '[': tag = True
        if tag:
            tag = c != ']'; k += 1; continue
        if not c.isalpha(): k += 1; continue
        for seq, v in sorted(VIS, key=lambda s: -len(s[0])):
            if ''.join(x.lower() for x in ch[k:k + len(seq)]) == seq:
                out.append((t0[k], t1[k + len(seq) - 1], v)); k += len(seq); break
        else:
            out.append((t0[k], t1[k], 'C')); k += 1
    return out


def main(ep):
    d = os.path.join(ROOT, 'episodes', ep)
    tm = jload(os.path.join(d, 'audio', 'timing.json'))
    al = tm['alignment']
    n = int(np.ceil(tm['duree'] * FPS))
    out = os.path.join(d, 'lipsync'); os.makedirs(out, exist_ok=True)
    for p in sorted({s['perso'] for s in tm['segments']}):
        x, sr = sf.read(os.path.join(d, 'audio', 'par_perso', p + '.wav'), dtype='float32')
        hop = sr // FPS
        rms = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) if i * hop < len(x) else 0 for i in range(n)])
        ref = np.percentile(rms[rms > 1e-4], 95) if (rms > 1e-4).any() else 1
        ouv = np.clip(rms / ref, 0, 1) ** 0.6
        ouv = np.convolve(ouv, [0.25, 0.5, 0.25], 'same')
        vis = ['X'] * n
        for s in tm['segments']:
            if s['perso'] != p: continue
            for a, b, v in visemes(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds'], s['c0'], s['c1']):
                for f in range(int(a * FPS), min(n, int(np.ceil(b * FPS)))):
                    vis[f] = v
        for f in range(n):
            if ouv[f] < 0.08: vis[f] = 'X'
        jsave(os.path.join(out, p + '.json'), {'fps': FPS, 'ouverture': [round(float(v), 3) for v in ouv], 'viseme': ''.join(vis)})
    print('lip-sync ->', out)


if __name__ == '__main__':
    main(sys.argv[1])
