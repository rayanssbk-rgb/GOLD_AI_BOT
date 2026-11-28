"""Recale les plans du découpage sur le minutage réel du dialogue (après chaque génération de voix).
Chaque plan porte 'ligne' = index de la réplique qu'il couvre ; le dernier plan garde 'queue_s' de fin.
Usage : python scripts/sync_decoupage.py ep01
"""
import os, sys
from common import ROOT, jload, jsave


def main(ep):
    d = os.path.join(ROOT, 'episodes', ep)
    p = os.path.join(d, 'decoupage.json')
    dec, tm = jload(p), jload(os.path.join(d, 'audio', 'timing.json'))
    seg = {s['ligne']: s for s in tm['segments']}
    for i, pl in enumerate(dec['plans']):
        pl.setdefault('ligne', i)
        pl['debut'] = round(seg[pl['ligne']]['debut'], 3)
    for a, b in zip(dec['plans'], dec['plans'][1:]):
        a['fin'] = b['debut']
    dec['plans'][-1]['fin'] = round(tm['duree'] + dec.get('queue_s', 1.0), 3)
    jsave(p, dec)
    print('découpage recalé, fin', dec['plans'][-1]['fin'])


if __name__ == '__main__':
    main(sys.argv[1])
